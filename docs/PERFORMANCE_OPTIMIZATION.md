# Performance Optimization Report
## Task 14: Performance Optimization and Caching Strategy

**Date:** 2025-11-12
**Author:** Claude Code
**Project:** RxMatch

---

## Executive Summary

This document outlines the performance optimization and caching strategy implemented for the RxMatch prescription matching system. The system integrates OpenAI for prescription parsing, RxNorm for drug standardization, and FDA NDC Directory for package lookup.

### Key Achievements

1. **Multi-tier caching architecture** implemented with L1 (in-memory LRU) and L2 (Redis) layers
2. **Performance monitoring** instrumentation added across all services
3. **Load testing framework** created for measuring system performance under various loads
4. **Comprehensive metrics** tracking for cache hit rates and response times

---

## Current Architecture Analysis

### Existing Caching Implementation

#### ✅ Already Implemented (Tasks 2, 3, 4)

**Redis Cache Service** (`src/lib/services/cache.ts`)
- Upstash Redis for distributed caching
- Lazy connection initialization
- Automatic retry strategy
- Health checking

**Cache TTLs:**
- **OpenAI Parsing:** 7 days (604,800 seconds)
- **RxCUI Mappings:** 30 days (2,592,000 seconds)
- **FDA NDC Packages:** 12 hours (43,200 seconds)

**Cache Key Strategies:**
- OpenAI: `openai:parse:{hash}` - Hash-based to handle identical prescriptions
- RxNorm: `rxcui:{drugName}:{strength}:{form}` - Compound key for specificity
- FDA: `fda:ndc:{ndc}` or `fda:rxcui:{rxcui}` - Direct lookups

---

## Performance Optimizations Implemented

### 1. Multi-Tier Caching (Subtask 14.2)

#### L1 Cache (In-Memory LRU)
**Implementation:** `src/lib/utils/lru-cache.ts`

**Characteristics:**
- **Size:** 500 items default
- **TTL:** 5 minutes (300,000ms)
- **Algorithm:** Least Recently Used eviction
- **Use Cases:**
  - Hot RxCUI lookups (common medications)
  - Frequently accessed NDC packages
  - Recent prescription parses

**Benefits:**
- Sub-millisecond access times (<5ms typical)
- Reduces Redis network latency
- Lower API costs for repeated queries
- Automatic cleanup of expired entries

**Memory Considerations:**
- Average prescription parse: ~2KB
- Average RxCUI result: ~500 bytes
- Average NDC package: ~1KB
- **Total memory footprint:** ~750KB for full cache

#### L2 Cache (Redis)
**Existing Implementation:** Upstash Redis

**Characteristics:**
- **Provider:** Upstash (serverless Redis)
- **Connection:** Persistent with auto-reconnect
- **Retry Strategy:** Exponential backoff (50ms * attempts, max 2000ms)
- **Max Retries:** 3 per request

**Benefits:**
- Persistent across server restarts
- Shared across multiple instances
- Large capacity (Upstash plan dependent)
- Automatic TTL expiration

#### Cache Flow

```
Request → L1 Cache (in-memory)
           ├── HIT → Return (1-5ms)
           └── MISS → L2 Cache (Redis)
                       ├── HIT → Promote to L1 → Return (10-50ms)
                       └── MISS → API Call → Cache in L1+L2 → Return (500-3000ms)
```

### 2. Performance Monitoring (Subtask 14.1)

#### Implementation
**File:** `src/lib/utils/performance.ts`

**Features:**
- Operation timing with start/end tracking
- Cache hit/miss rate calculation
- Percentile analysis (p50, p95, p99)
- Error tracking
- Metadata support for detailed analysis

**Metrics Tracked:**
- Response time distributions
- Cache hit rates by service
- Error rates and types
- Throughput (requests/second)

#### Integration Points
- OpenAI Service: Parse operations
- RxNorm Service: RxCUI lookups
- FDA Service: NDC searches
- Cache Service: L1/L2 access patterns

### 3. Database Optimization Review

#### Existing Indexes (from schema.ts)
```typescript
// Users table
- users_email_idx (UNIQUE)
- users_firebase_uid_idx (UNIQUE)
- users_role_idx

// Calculation Audits
- calculation_audits_user_id_idx
- calculation_audits_status_idx
- calculation_audits_created_at_idx
- calculation_audits_rxcui_idx

// Manual Review Queue
- manual_review_queue_calculation_id_idx
- manual_review_queue_assigned_to_idx
- manual_review_queue_status_idx
- manual_review_queue_priority_idx
- manual_review_queue_created_at_idx

// Audit Log
- audit_log_timestamp_idx
- audit_log_user_id_idx
- audit_log_rxcui_idx

// RxCUI Mapping (offline fallback)
- rxcui_mapping_rxcui_idx
- rxcui_mapping_drug_name_unique (COMPOSITE)

// NDC Package (offline fallback)
- ndc_package_product_ndc_idx
- ndc_package_generic_name_idx
- ndc_package_is_active_idx
```

#### Recommendations
✅ **Well-optimized** - All frequently queried fields are indexed
- Composite index on (drugName, strength, form) for RxCUI lookups
- Temporal indexes for audit queries
- Status indexes for queue management

**Potential Enhancement:**
- Consider adding composite index on `(rxcui, isActive)` for NDC package queries if filtering by both is common

### 4. API Call Optimization

#### Current Patterns

**OpenAI Service:**
- Structured outputs with Zod validation
- Prompt engineering for accuracy
- 7-day caching reduces duplicate calls
- **No batching needed** - Each prescription is independent

**RxNorm Service:**
- Approximate term matching with filtering
- Property lookups for term type validation
- **Optimization:** Results filtered to prescribable types only
- 30-day caching for stable drug names

**FDA Service:**
- Flexible search (NDC, drug name, RxCUI)
- Fallback pattern (RxCUI → drug name)
- Package filtering (excludes samples)
- 12-hour caching for frequently changing data

#### Connection Pooling

**PostgreSQL (via Drizzle ORM):**
```typescript
database: {
  url: getEnvVar('DATABASE_URL'),
  poolMin: getEnvNumber('DATABASE_POOL_MIN', 2),
  poolMax: getEnvNumber('DATABASE_POOL_MAX', 10)
}
```
✅ **Already configured** with min/max pool sizes

**Redis (via ioredis):**
```typescript
retryStrategy: (times) => Math.min(times * 50, 2000),
maxRetriesPerRequest: 3,
enableReadyCheck: true
```
✅ **Already optimized** with retry logic and health checks

---

## Load Testing Framework

### Implementation
**File:** `scripts/load-test.ts`

### Test Configurations

1. **Light Load:** 10 concurrent × 2 iterations = 20 requests
   - Warmup: 5 rounds to populate cache
   - Use case: Normal usage patterns

2. **Medium Load:** 50 concurrent × 2 iterations = 100 requests
   - Use case: Peak hours

3. **Heavy Load:** 100 concurrent × 1 iteration = 100 requests
   - Use case: Stress testing

### Test Prescriptions

Mix of 8 common and uncommon medications:
- **Common:** Lisinopril, Metformin, Atorvastatin, Amlodipine, Omeprazole
- **Less common:** Gabapentin, Levothyroxine, Sertraline

This mix tests cache effectiveness with both hot and cold data.

### Metrics Measured

**Response Times:**
- p50 (median)
- p95 (95th percentile)
- p99 (99th percentile)
- Average
- Min/Max

**Cache Performance:**
- Hit rate percentage
- Hits vs misses
- Total requests

**System Performance:**
- Requests per second
- Success/failure rate
- Error types and counts

---

## Performance Targets

### Response Time Targets

| Service | Uncached Target | Cached Target | Status |
|---------|----------------|---------------|--------|
| OpenAI Parsing | < 3s | < 100ms | ✅ Achievable |
| RxNorm Lookup | < 1s | < 50ms | ✅ Achievable |
| FDA Search | < 2s | < 100ms | ✅ Achievable |
| **Overall Workflow** | **< 10s** | **< 500ms** | ✅ **Achievable** |

### Cache Hit Rate Targets

| Service | Target | Rationale |
|---------|--------|-----------|
| OpenAI | > 60% | Common prescriptions resubmitted |
| RxNorm | > 80% | Limited set of drug names |
| FDA | > 70% | Popular packages frequently requested |

### Rationale

**OpenAI (60% target):**
- Lower target due to prescription text variability
- Even minor wording changes create different cache keys
- Hash-based caching ensures identical prescriptions match

**RxNorm (80% target):**
- Standardized drug names with limited vocabulary
- Strength + form combinations are finite
- 30-day TTL keeps data fresh

**FDA (70% target):**
- Popular medications have high reuse
- 12-hour TTL balances freshness with performance
- Package data changes less frequently than pricing

---

## Optimization Strategies Implemented

### 1. Cache Key Optimization

#### OpenAI Cache Keys
```typescript
getOpenAIKey(prescriptionText: string): string {
  const hash = this.hashString(prescriptionText);
  return `openai:parse:${hash}`;
}
```
**Benefits:**
- Consistent keys for identical text
- No collision issues with hash function
- Compact key size

#### RxNorm Cache Keys
```typescript
getRxCUIKey(drugName: string, strength?: string, form?: string): string {
  const parts = [drugName, strength || '', form || ''];
  return 'rxcui:' + parts.join(':').toLowerCase().replace(/\s+/g, '_');
}
```
**Benefits:**
- Human-readable for debugging
- Includes all relevant parameters
- Normalized (lowercase, no spaces)

#### FDA Cache Keys
```typescript
// By NDC
`fda:ndc:${normalizedNDC}`

// By RxCUI
`fda:rxcui:${rxcui}`

// By drug name
`fda:drug:${drugName.toLowerCase()}`
```
**Benefits:**
- Multiple access patterns supported
- Clear namespace separation
- Efficient lookups

### 2. Graceful Degradation

#### Cache Failure Handling
```typescript
async get<T>(key: string): Promise<T | null> {
  try {
    // Try L1
    const l1Value = this.l1Cache.get(key);
    if (l1Value !== null) return l1Value;

    // Try L2
    const l2Value = await this.redis.get(key);
    if (l2Value !== null) {
      this.l1Cache.set(key, l2Value); // Promote
      return l2Value;
    }

    return null; // Fall through to API
  } catch (error) {
    console.error('Cache error:', error);
    return null; // Degrade gracefully
  }
}
```

#### API Fallback Pattern (FDA Service)
```typescript
try {
  return await this.searchByRxCUI(rxcui);
} catch (error) {
  // Fallback to drug name search
  if (drugNameFallback) {
    return this.searchByDrugName(drugNameFallback);
  }
  throw error;
}
```

### 3. Connection Management

#### Redis Connection Pooling
- Single shared connection per service instance
- Lazy initialization on first use
- Automatic reconnection on failure
- Ping health checks

#### Database Connection Pooling
- Min: 2 connections
- Max: 10 connections
- Prevents connection exhaustion
- Handles concurrent requests efficiently

---

## Running Load Tests

### Prerequisites

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Configure: OPENAI_API_KEY, REDIS_HOST, REDIS_PASSWORD, etc.
```

### Execute Tests

```bash
# Run all test configurations
npm run load-test

# Or run specific configuration
tsx scripts/load-test.ts
```

### Interpreting Results

Results are saved as JSON files:
```
load-test-results-{concurrency}x{iterations}-{timestamp}.json
```

**Key Metrics to Monitor:**

1. **Cache Hit Rates**
   - Should improve on subsequent runs
   - L1 hits faster than L2 hits
   - Compare against targets (60%, 80%, 70%)

2. **Response Times**
   - p95 and p99 show tail latency
   - Cached responses should be <100ms
   - Uncached within target limits

3. **Error Rates**
   - Should be 0% for stable system
   - Check error types for patterns
   - API rate limits may cause failures

---

## Recommendations

### Immediate Optimizations (High Priority)

✅ **Completed:**
1. Multi-tier caching implemented
2. Performance monitoring added
3. Load testing framework created
4. Cache statistics tracking

### Short-term Improvements (Medium Priority)

1. **Request Deduplication**
   - Implement request coalescing for identical in-flight requests
   - Prevents duplicate API calls during cache misses
   - Useful under high concurrency

2. **Cache Warming**
   - Pre-populate cache with top 100 medications on startup
   - Reduces initial latency
   - Can be done asynchronously

3. **Adaptive TTLs**
   - Increase TTL for frequently accessed items
   - Decrease TTL for rarely accessed items
   - Implement LFU (Least Frequently Used) tracking

### Long-term Enhancements (Low Priority)

1. **CDN Integration**
   - Cache static assets and API responses
   - Reduce geographic latency
   - Useful for multi-region deployment

2. **Database Query Optimization**
   - Add EXPLAIN ANALYZE for slow queries
   - Create materialized views for complex aggregations
   - Implement read replicas for scaling

3. **API Rate Limit Management**
   - Implement token bucket algorithm
   - Queue requests during rate limit periods
   - Prioritize interactive requests over batch operations

---

## Performance Monitoring in Production

### Metrics to Track

1. **Cache Performance**
   ```typescript
   const cacheStats = cacheService.getL1CacheStats();
   console.log('L1 Utilization:', cacheStats.utilizationPercent);
   ```

2. **Service Response Times**
   ```typescript
   const report = performanceMonitor.getReport();
   console.log('OpenAI p95:', report.operations['openai-parse'].p95);
   ```

3. **Error Rates**
   - Monitor audit logs for parsing errors
   - Track API failures
   - Alert on cache connection issues

### Recommended Tools

- **Application Performance Monitoring (APM):** Datadog, New Relic, or Sentry
- **Logging:** Structured logging with correlation IDs
- **Alerting:** Set up alerts for:
  - Cache hit rate drops below 50%
  - p95 response time exceeds 5s
  - Error rate exceeds 1%
  - Redis connection failures

---

## Maintenance Procedures

### Cache Management

#### Clear Caches
```typescript
// Clear L1 only (in-memory)
cacheService.clearL1Cache();

// Clear specific key from L2 (Redis)
await cacheService.delete('rxcui:metformin:500mg:tablet');
```

#### Cleanup Expired Entries
```typescript
// Manually cleanup L1
const removed = cacheService.cleanupL1Cache();
console.log(`Removed ${removed} expired entries`);
```

#### Monitor Cache Size
```typescript
const stats = cacheService.getL1CacheStats();
if (stats.utilizationPercent > 90) {
  console.warn('L1 cache near capacity');
}
```

### Performance Regression Testing

Run load tests regularly to detect regressions:
```bash
# Baseline (before changes)
npm run load-test > baseline-results.txt

# After changes
npm run load-test > new-results.txt

# Compare results
diff baseline-results.txt new-results.txt
```

---

## Conclusion

The RxMatch system now has a comprehensive performance optimization and caching strategy:

1. **Multi-tier caching** reduces latency from seconds to milliseconds for cached requests
2. **Performance monitoring** provides visibility into system behavior
3. **Load testing framework** enables regression detection and capacity planning
4. **Graceful degradation** ensures system stability during failures

### Expected Outcomes

With proper cache warming and realistic traffic patterns:
- **90%+ requests** served from cache in <100ms
- **Uncached requests** complete in <10s total workflow time
- **System throughput** supports 100+ concurrent users
- **Cost reduction** from reduced API calls

### Next Steps

1. Run baseline load tests to establish performance benchmarks
2. Deploy to production with monitoring
3. Analyze production cache hit rates
4. Tune cache sizes and TTLs based on real usage
5. Implement cache warming for top medications

---

**Document Version:** 1.0
**Last Updated:** 2025-11-12
**Status:** Implementation Complete, Testing Pending
