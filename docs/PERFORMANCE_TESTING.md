# Performance Testing Guide
## RxMatch Load Testing and Performance Analysis

This guide explains how to run performance tests and analyze results for the RxMatch prescription matching system.

---

## Prerequisites

### 1. Environment Setup

Ensure your `.env` file is configured with all required API keys:

```bash
# OpenAI API
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.2

# Redis Cache (Upstash)
REDIS_HOST=your-redis-host.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0
REDIS_TTL_CACHE=604800      # 7 days for OpenAI
REDIS_TTL_RXCUI=2592000     # 30 days for RxCUI

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://...
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# API Endpoints (defaults provided)
RXNORM_API_BASE=https://rxnav.nlm.nih.gov/REST
FDA_NDC_API_BASE=https://api.fda.gov/drug/ndc.json

# Feature Flags
FEATURE_CACHE_ENABLED=true
FEATURE_RATE_LIMITING=true
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build the Project

```bash
npm run build
```

---

## Running Performance Analysis

The analysis script checks your current configuration and provides recommendations.

### Execute Analysis

```bash
tsx scripts/analyze-performance.ts
```

### Expected Output

```
=== RxMatch Performance Analysis ===

Analyzing caching setup...
✓ Caching setup analyzed
Analyzing database configuration...
✓ Database configuration analyzed
Analyzing services implementation...
✓ Services implementation analyzed

Generating recommendations...
  ✓ Redis connection healthy
  ✓ L1 cache utilization healthy (15.2%)

=== Performance Analysis Report ===

CACHING:
  Redis Configured: ✓
  L1 Cache Enabled: ✓
  L1 Cache Size: 76/500
  L1 Cache Utilization: 15.2%
  TTL Settings:
    OpenAI: 604800s (7 days)
    RxCUI: 2592000s (30 days)
    Default: 604800s (7 days)

DATABASE:
  Connection Pooling: ✓
  Pool Size: 2-10
  Indexes: 8 configured

SERVICES:
  OpenAI:
    Caching: ✓
    Error Handling: ✓
    Audit Logging: ✓
  RxNorm:
    Caching: ✓
    Result Filtering: ✓
    Error Handling: ✓
  FDA:
    Caching: ✓
    Fallback Pattern: ✓
    Error Handling: ✓

RECOMMENDATIONS:
  1. HIGH: Set up APM (Application Performance Monitoring) for production
  2. HIGH: Configure alerts for cache hit rate < 50%
  3. HIGH: Configure alerts for p95 response time > 5s
  4. MEDIUM: Run EXPLAIN ANALYZE on frequent queries
  5. LOW: Consider implementing request deduplication
  6. LOW: Consider cache warming for top 100 medications
  7. LOW: Consider adaptive TTLs based on access frequency
  8. LOW: Consider adding composite index on (rxcui, isActive)

=== Summary ===
Current implementation has strong foundation with:
  ✓ Multi-tier caching (L1 + L2)
  ✓ Connection pooling for database and Redis
  ✓ Comprehensive error handling
  ✓ Audit logging for troubleshooting
  ✓ Appropriate cache TTLs
  ✓ Database indexes on frequent queries

Ready for load testing and production deployment.
```

---

## Running Load Tests

### Test Configurations

The load test script runs three configurations:

1. **Light Load:** 10 concurrent requests × 2 iterations
   - Total: 20 requests
   - Includes warmup phase (5 rounds)
   - Simulates: Normal usage

2. **Medium Load:** 50 concurrent requests × 2 iterations
   - Total: 100 requests
   - No warmup
   - Simulates: Peak hours

3. **Heavy Load:** 100 concurrent requests × 1 iteration
   - Total: 100 requests
   - No warmup
   - Simulates: Stress testing

### Execute Load Tests

```bash
tsx scripts/load-test.ts
```

### Test Workflow

Each test request executes the full prescription workflow:

1. **OpenAI Parsing:** Normalize prescription text
2. **RxNorm Lookup:** Find RxCUI for drug
3. **FDA Search:** Get NDC packages

### Test Data

The script uses 8 test prescriptions (mix of common and uncommon medications):

**Common medications:**
- Lisinopril 10mg tablet
- Metformin 500mg tablet
- Atorvastatin 20mg tablet
- Amlodipine 5mg tablet
- Omeprazole 20mg capsule

**Less common medications:**
- Gabapentin 300mg capsule
- Levothyroxine 50mcg tablet
- Sertraline 50mg tablet

This mix tests cache effectiveness with both hot and cold data.

---

## Understanding Results

### Console Output

```
=== Starting Load Test ===
Concurrency: 10
Iterations: 2
Total requests: 20

Warming up cache with 5 rounds...
Warmup complete

Iteration 1/2
Iteration 2/2

=== Load Test Results ===

Timestamp: 2025-11-12T10:30:45.123Z
Configuration:
  Concurrency: 10
  Iterations: 2

Overall Performance:
  Total Requests: 20
  Successful: 20
  Failed: 0
  Total Duration: 12345ms
  Requests/sec: 1.62

OpenAI Service:
  p50: 85ms
  p95: 2500ms
  p99: 2800ms
  avg: 650ms
  Cache Hit Rate: 65.0%

RxNorm Service:
  p50: 45ms
  p95: 850ms
  p99: 950ms
  avg: 320ms
  Cache Hit Rate: 85.0%

FDA Service:
  p50: 95ms
  p95: 1800ms
  p99: 2000ms
  avg: 580ms
  Cache Hit Rate: 75.0%

=== Performance Targets ===
OpenAI Parse:
  Target: <3s (cached: <100ms) | Actual: 650ms ✓
RxNorm Lookup:
  Target: <1s (cached: <50ms) | Actual: 320ms ✓
FDA Search:
  Target: <2s (cached: <100ms) | Actual: 580ms ✓

Cache Hit Rate Targets:
  OpenAI: Target >60% | Actual: 65.0% ✓
  RxNorm: Target >80% | Actual: 85.0% ✓
  FDA: Target >70% | Actual: 75.0% ✓
```

### Result Files

Results are saved as JSON files in the project root:

```
load-test-results-10x2-1699876543123.json
load-test-results-50x2-1699876545678.json
load-test-results-100x1-1699876548901.json
```

### Result Structure

```json
{
  "config": {
    "concurrency": 10,
    "iterations": 2,
    "warmupRounds": 5
  },
  "timestamp": "2025-11-12T10:30:45.123Z",
  "totalRequests": 20,
  "successfulRequests": 20,
  "failedRequests": 0,
  "totalDuration": 12345,
  "requestsPerSecond": 1.62,
  "openai": {
    "p50": 85,
    "p95": 2500,
    "p99": 2800,
    "avg": 650,
    "cacheHitRate": 65.0
  },
  "rxnorm": {
    "p50": 45,
    "p95": 850,
    "p99": 950,
    "avg": 320,
    "cacheHitRate": 85.0
  },
  "fda": {
    "p50": 95,
    "p95": 1800,
    "p99": 2000,
    "avg": 580,
    "cacheHitRate": 75.0
  },
  "errors": []
}
```

---

## Interpreting Metrics

### Response Time Percentiles

- **p50 (median):** Half of requests complete faster than this
- **p95:** 95% of requests complete faster than this (important for SLA)
- **p99:** 99% of requests complete faster than this (tail latency)
- **avg:** Average response time across all requests

**What to look for:**
- Large gap between p50 and p95/p99 indicates inconsistent performance
- p99 much higher than p95 indicates occasional slow requests
- Low p50 with high p95 suggests caching is working well

### Cache Hit Rates

**Formula:** `(hits / total requests) × 100`

**Interpretation:**
- **> 80%:** Excellent - Most requests served from cache
- **60-80%:** Good - Significant cache benefit
- **40-60%:** Fair - Cache helping but could be improved
- **< 40%:** Poor - Review cache strategy and TTLs

**Factors affecting hit rate:**
- Warmup phase (first run has 0% hits)
- Test data variety (more unique data = lower hit rate)
- TTL expiration during test
- Cache eviction (L1 cache size)

### Requests Per Second

**Formula:** `total requests / (total duration / 1000)`

**Typical values:**
- **Cold cache:** 0.5-2 req/s (waiting for API calls)
- **Warm cache:** 5-20 req/s (mostly cached responses)
- **Hot cache:** 20-100 req/s (all cached, minimal latency)

---

## Performance Targets

### Response Time Goals

| Service | Uncached | Cached | Critical Threshold |
|---------|----------|--------|-------------------|
| OpenAI Parse | < 3s | < 100ms | > 5s is critical |
| RxNorm Lookup | < 1s | < 50ms | > 2s is critical |
| FDA Search | < 2s | < 100ms | > 3s is critical |
| **Overall** | **< 10s** | **< 500ms** | **> 15s is critical** |

### Cache Hit Rate Goals

| Service | Target | Minimum Acceptable |
|---------|--------|-------------------|
| OpenAI | > 60% | > 40% |
| RxNorm | > 80% | > 60% |
| FDA | > 70% | > 50% |

---

## Troubleshooting

### Low Cache Hit Rates

**Symptoms:**
- Cache hit rates below targets
- High p95/p99 latency
- Low requests per second

**Possible causes:**
1. **Cache TTL expired:** Check `REDIS_TTL_*` settings
2. **L1 cache too small:** Increase size in `cache.ts`
3. **Cache eviction:** L1 cache full, evicting entries
4. **Test data too varied:** Normal for first run

**Solutions:**
```typescript
// Increase L1 cache size
this.l1Cache = new LRUCache<any>(1000, 300000); // 1000 items

// Increase L1 TTL
this.l1Cache = new LRUCache<any>(500, 600000); // 10 minutes

// Increase Redis TTLs
REDIS_TTL_CACHE=1209600  # 14 days
REDIS_TTL_RXCUI=5184000  # 60 days
```

### High p99 Latency

**Symptoms:**
- p99 >> p95
- Inconsistent response times
- Occasional timeouts

**Possible causes:**
1. **API rate limiting:** OpenAI/FDA throttling requests
2. **Cold start:** First request to API is slow
3. **Network issues:** Intermittent connectivity
4. **Redis timeout:** Connection pool exhausted

**Solutions:**
```bash
# Add retry logic with backoff
# Check API rate limits
# Increase connection pool sizes
DATABASE_POOL_MAX=20
```

### Failed Requests

**Symptoms:**
- `failedRequests > 0` in results
- Errors array populated
- Some workflows incomplete

**Common errors:**
1. **"No RxCUI found":** Drug name not in RxNorm
2. **"No NDC packages found":** Drug not in FDA database
3. **"API error: 429":** Rate limit exceeded
4. **"API error: 503":** Service temporarily unavailable

**Solutions:**
- Review error types in `errors` array
- Check API status pages
- Reduce concurrency
- Add delays between iterations

### Memory Issues

**Symptoms:**
- Process crashes during test
- L1 cache utilization > 90%
- OOM (Out of Memory) errors

**Solutions:**
```typescript
// Reduce L1 cache size
this.l1Cache = new LRUCache<any>(250, 300000); // 250 items

// Add periodic cleanup
setInterval(() => {
  const removed = this.l1Cache.cleanup();
  console.log(`Cleaned up ${removed} entries`);
}, 60000); // Every minute
```

---

## Continuous Monitoring

### Production Metrics

Track these metrics in production:

1. **Cache Performance**
   ```typescript
   const stats = cacheService.getL1CacheStats();
   metrics.gauge('cache.l1.size', stats.size);
   metrics.gauge('cache.l1.utilization', stats.utilizationPercent);
   ```

2. **Response Times**
   ```typescript
   const report = monitor.getReport();
   metrics.histogram('openai.duration', report.operations['openai-parse'].avg);
   ```

3. **Cache Hit Rates**
   ```typescript
   const cacheStats = monitor.getCacheStats('openai-parse');
   metrics.gauge('openai.cache_hit_rate', cacheStats.hitRate);
   ```

### Alerting Rules

**Critical Alerts:**
- Cache hit rate < 30% for any service
- p95 response time > 10s
- Error rate > 5%
- Redis connection failures

**Warning Alerts:**
- Cache hit rate < 50% for any service
- p95 response time > 5s
- Error rate > 1%
- L1 cache utilization > 85%

---

## Best Practices

### Before Testing

1. **Clear caches** for accurate cold start metrics
   ```typescript
   cacheService.clearL1Cache();
   await redis.flushdb(); // Clear Redis (use with caution)
   ```

2. **Warm up caches** for realistic performance
   ```bash
   # Run with warmupRounds parameter
   tsx scripts/load-test.ts --warmup=10
   ```

3. **Check API quotas** to avoid rate limiting
   - OpenAI: Check usage dashboard
   - FDA: Generally unlimited for public endpoints
   - RxNorm: Generally unlimited for public endpoints

### During Testing

1. **Monitor resource usage**
   ```bash
   # CPU and memory
   top -pid $(pgrep -f node)

   # Network connections
   lsof -i -n -P | grep node
   ```

2. **Watch logs** for errors
   ```bash
   tail -f logs/app.log | grep ERROR
   ```

3. **Check Redis** for connection issues
   ```bash
   redis-cli -h your-redis-host.upstash.io -p 6379 -a your-password PING
   ```

### After Testing

1. **Compare results** across runs
   ```bash
   diff load-test-results-10x2-*.json
   ```

2. **Archive results** for historical analysis
   ```bash
   mkdir -p performance-tests/$(date +%Y-%m-%d)
   mv load-test-results-*.json performance-tests/$(date +%Y-%m-%d)/
   ```

3. **Update documentation** with findings
   - Document any performance regressions
   - Note optimization opportunities
   - Update targets if needed

---

## Advanced Testing

### Custom Test Scenarios

Create custom test scenarios by modifying `scripts/load-test.ts`:

```typescript
// Test specific medications
const customPrescriptions = [
  { drugName: 'Insulin', strength: '100 units/ml', form: 'injection' },
  // Add more...
];

// Test at different concurrency levels
const configs = [
  { concurrency: 5, iterations: 10 },
  { concurrency: 20, iterations: 5 },
  { concurrency: 200, iterations: 1 },
];

// Test with cold cache only
const config = { concurrency: 10, iterations: 1, warmupRounds: 0 };
```

### Stress Testing

Test system limits:

```typescript
const stressConfig = {
  concurrency: 500,
  iterations: 5,
  warmupRounds: 0
};

// Monitor for:
// - Connection pool exhaustion
// - Rate limiting
// - Memory leaks
// - CPU saturation
```

### Endurance Testing

Test sustained load:

```typescript
const enduranceConfig = {
  concurrency: 50,
  iterations: 100, // 5000 total requests
  warmupRounds: 10
};

// Monitor for:
// - Memory leaks
// - Cache effectiveness over time
// - Connection stability
```

---

## FAQ

**Q: Why are first-run cache hit rates 0%?**
A: Cache is empty. Run with `warmupRounds` parameter or run tests twice.

**Q: Why is p99 so much higher than p95?**
A: Normal for systems with caching. Uncached requests take much longer.

**Q: Should I test in production?**
A: No! Use staging environment with production-like data and configuration.

**Q: How often should I run load tests?**
A: Before major releases, after performance changes, and quarterly for baselines.

**Q: What if results don't meet targets?**
A: Review recommendations in performance analysis, optimize bottlenecks, increase cache sizes/TTLs.

**Q: Can I run tests in parallel?**
A: No, results will interfere with each other. Run sequentially with delays between tests.

---

## Support

For questions or issues:

1. Review `docs/PERFORMANCE_OPTIMIZATION.md` for optimization strategies
2. Check logs for errors: `logs/app.log`
3. Verify environment configuration: `.env`
4. Run performance analysis: `tsx scripts/analyze-performance.ts`
5. Contact development team with test results attached

---

**Last Updated:** 2025-11-12
**Version:** 1.0
