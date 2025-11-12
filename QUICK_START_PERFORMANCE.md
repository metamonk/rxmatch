# Quick Start: Performance Testing

Quick reference for running performance tests and analysis on RxMatch.

## Prerequisites

```bash
# Install dependencies
npm install

# Verify environment
cp .env.example .env
# Edit .env with your API keys
```

## Run Performance Analysis

```bash
tsx scripts/analyze-performance.ts
```

**What it checks:**
- Redis connection health
- L1 cache status and utilization
- Database connection pooling
- Service implementation patterns
- Generates prioritized recommendations

**Expected output:**
```
=== RxMatch Performance Analysis ===
✓ Caching setup analyzed
✓ Database configuration analyzed
✓ Services implementation analyzed

CACHING:
  Redis Configured: ✓
  L1 Cache Enabled: ✓
  L1 Cache Utilization: 15.2%

=== Summary ===
Ready for load testing and production deployment.
```

## Run Load Tests

```bash
tsx scripts/load-test.ts
```

**What it tests:**
- Light Load: 10 concurrent × 2 iterations (20 requests)
- Medium Load: 50 concurrent × 2 iterations (100 requests)
- Heavy Load: 100 concurrent × 1 iteration (100 requests)

**Expected output:**
```
=== Load Test Results ===

OpenAI Service:
  p50: 85ms
  p95: 2500ms
  avg: 650ms
  Cache Hit Rate: 65.0% ✓

RxNorm Service:
  p50: 45ms
  p95: 850ms
  avg: 320ms
  Cache Hit Rate: 85.0% ✓

FDA Service:
  p50: 95ms
  p95: 1800ms
  avg: 580ms
  Cache Hit Rate: 75.0% ✓
```

**Results saved to:**
```
load-test-results-10x2-{timestamp}.json
load-test-results-50x2-{timestamp}.json
load-test-results-100x1-{timestamp}.json
```

## Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| OpenAI Parse (cached) | < 100ms | ✓ |
| RxNorm Lookup (cached) | < 50ms | ✓ |
| FDA Search (cached) | < 100ms | ✓ |
| Overall Workflow (cached) | < 500ms | ✓ |
| OpenAI Cache Hit Rate | > 60% | ✓ |
| RxNorm Cache Hit Rate | > 80% | ✓ |
| FDA Cache Hit Rate | > 70% | ✓ |

## Interpreting Results

### ✅ Good Results
- Cache hit rates above targets
- p95 response times < 5s
- No errors
- Requests/sec improving on warm cache

### ⚠️ Needs Investigation
- Cache hit rates below 50%
- p95 response times > 5s
- Error rate > 1%
- L1 cache utilization > 90%

### ❌ Critical Issues
- Redis connection failures
- Cache hit rates < 30%
- p95 response times > 10s
- Error rate > 5%

## Troubleshooting

**Low cache hit rates?**
```typescript
// Check if cache is enabled
FEATURE_CACHE_ENABLED=true

// Verify Redis connection
tsx scripts/analyze-performance.ts

// Increase cache sizes
// Edit src/lib/services/cache.ts:
this.l1Cache = new LRUCache<any>(1000, 600000); // 1000 items, 10min TTL
```

**High response times?**
- Check API rate limits
- Verify network connectivity
- Review error logs
- Increase connection pool sizes

**Tests failing?**
- Verify all environment variables set
- Check API keys are valid
- Ensure Redis is accessible
- Review error messages in output

## Quick Commands

```bash
# Full analysis + testing
tsx scripts/analyze-performance.ts && tsx scripts/load-test.ts

# Check cache status
tsx -e "import {getCacheService} from './src/lib/services/cache'; const c = getCacheService(); console.log(await c.healthCheck())"

# View test results
cat load-test-results-*.json | jq '.openai.cacheHitRate'
```

## Documentation

- **Full optimization guide:** `docs/PERFORMANCE_OPTIMIZATION.md`
- **Testing guide:** `docs/PERFORMANCE_TESTING.md`
- **Task summary:** `TASK_14_SUMMARY.md`

## Support

Questions? Check the FAQ in `docs/PERFORMANCE_TESTING.md` or review the architecture in `docs/PERFORMANCE_OPTIMIZATION.md`.
