/**
 * Load testing script for RxMatch
 * Task 14: Performance Optimization and Caching Strategy
 *
 * Tests concurrent prescription submissions and measures:
 * - Response times (p50, p95, p99)
 * - Cache hit rates
 * - API performance
 * - Error rates
 */

import { OpenAIService } from '../src/lib/services/openai';
import { RxNormService } from '../src/lib/services/rxnorm';
import { FDAService } from '../src/lib/services/fda';
import { getCacheService } from '../src/lib/services/cache';
import { getPerformanceMonitor } from '../src/lib/utils/performance';

// Test prescriptions (mix of common and uncommon drugs)
const testPrescriptions = [
  // Common prescriptions (should have high cache hit rate on repeat)
  {
    drugName: 'Lisinopril',
    strength: '10mg',
    form: 'tablet',
    quantity: 30,
    sig: 'Take 1 tablet daily',
  },
  {
    drugName: 'Metformin',
    strength: '500mg',
    form: 'tablet',
    quantity: 60,
    sig: 'Take 1 tablet twice daily',
  },
  {
    drugName: 'Atorvastatin',
    strength: '20mg',
    form: 'tablet',
    quantity: 30,
    sig: 'Take 1 tablet at bedtime',
  },
  {
    drugName: 'Amlodipine',
    strength: '5mg',
    form: 'tablet',
    quantity: 30,
    sig: 'Take 1 tablet daily',
  },
  {
    drugName: 'Omeprazole',
    strength: '20mg',
    form: 'capsule',
    quantity: 30,
    sig: 'Take 1 capsule daily before breakfast',
  },
  // Less common prescriptions
  {
    drugName: 'Gabapentin',
    strength: '300mg',
    form: 'capsule',
    quantity: 90,
    sig: 'Take 1 capsule three times daily',
  },
  {
    drugName: 'Levothyroxine',
    strength: '50mcg',
    form: 'tablet',
    quantity: 30,
    sig: 'Take 1 tablet daily on empty stomach',
  },
  {
    drugName: 'Sertraline',
    strength: '50mg',
    form: 'tablet',
    quantity: 30,
    sig: 'Take 1 tablet daily',
  },
];

interface LoadTestConfig {
  concurrency: number;
  iterations: number;
  warmupRounds?: number;
}

interface LoadTestResult {
  config: LoadTestConfig;
  timestamp: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalDuration: number;
  requestsPerSecond: number;
  openai: {
    p50: number;
    p95: number;
    p99: number;
    avg: number;
    cacheHitRate: number;
  };
  rxnorm: {
    p50: number;
    p95: number;
    p99: number;
    avg: number;
    cacheHitRate: number;
  };
  fda: {
    p50: number;
    p95: number;
    p99: number;
    avg: number;
    cacheHitRate: number;
  };
  errors: Array<{ operation: string; error: string }>;
}

class LoadTester {
  private openai: OpenAIService;
  private rxnorm: RxNormService;
  private fda: FDAService;
  private cache: ReturnType<typeof getCacheService>;
  private monitor: ReturnType<typeof getPerformanceMonitor>;

  constructor() {
    this.openai = new OpenAIService();
    this.rxnorm = new RxNormService();
    this.fda = new FDAService();
    this.cache = getCacheService();
    this.monitor = getPerformanceMonitor();
  }

  /**
   * Run a single prescription workflow
   */
  async runPrescriptionWorkflow(prescription: typeof testPrescriptions[0]): Promise<void> {
    try {
      // Step 1: Parse with OpenAI
      this.monitor.startOperation('openai-parse', 'openai-parse');
      const cacheKeyOpenAI = this.cache.getOpenAIKey(JSON.stringify(prescription));
      const cachedOpenAI = await this.cache.get(cacheKeyOpenAI);

      const normalized = await this.openai.normalizeMedication(prescription);
      this.monitor.endOperation('openai-parse', cachedOpenAI !== null);

      // Step 2: Get RxCUI from RxNorm
      this.monitor.startOperation('rxnorm-lookup', 'rxnorm-lookup');
      const cacheKeyRxCUI = this.cache.getRxCUIKey(
        normalized.drugName,
        normalized.strength,
        normalized.form
      );
      const cachedRxCUI = await this.cache.getCachedRxCUI(
        normalized.drugName,
        normalized.strength,
        normalized.form
      );

      const rxResults = await this.rxnorm.findRxCUI(
        normalized.drugName,
        normalized.strength,
        normalized.form
      );
      this.monitor.endOperation('rxnorm-lookup', cachedRxCUI !== null);

      if (rxResults.length === 0) {
        throw new Error('No RxCUI found');
      }

      // Step 3: Get NDC packages from FDA
      const rxcui = rxResults[0].rxcui;
      this.monitor.startOperation('fda-search', 'fda-search');
      const cacheKeyFDA = `fda:rxcui:${rxcui}`;
      const cachedFDA = await this.cache.get(cacheKeyFDA);

      const packages = await this.fda.searchByRxCUI(rxcui, normalized.drugName);
      this.monitor.endOperation('fda-search', cachedFDA !== null);

      if (packages.length === 0) {
        throw new Error('No NDC packages found');
      }
    } catch (error) {
      console.error('Workflow error:', error);
      throw error;
    }
  }

  /**
   * Run load test with specified configuration
   */
  async runLoadTest(config: LoadTestConfig): Promise<LoadTestResult> {
    console.log('\n=== Starting Load Test ===');
    console.log(`Concurrency: ${config.concurrency}`);
    console.log(`Iterations: ${config.iterations}`);
    console.log(`Total requests: ${config.concurrency * config.iterations}`);

    // Clear metrics
    this.monitor.clear();

    const errors: Array<{ operation: string; error: string }> = [];
    let successCount = 0;
    let failCount = 0;

    // Warmup rounds (if specified)
    if (config.warmupRounds && config.warmupRounds > 0) {
      console.log(`\nWarming up cache with ${config.warmupRounds} rounds...`);
      for (let i = 0; i < config.warmupRounds; i++) {
        const prescription = testPrescriptions[i % testPrescriptions.length];
        try {
          await this.runPrescriptionWorkflow(prescription);
        } catch (error) {
          // Ignore warmup errors
        }
      }
      this.monitor.clear(); // Clear warmup metrics
      console.log('Warmup complete');
    }

    const startTime = Date.now();

    // Run iterations
    for (let iteration = 0; iteration < config.iterations; iteration++) {
      console.log(`\nIteration ${iteration + 1}/${config.iterations}`);

      // Create concurrent requests
      const requests = Array.from({ length: config.concurrency }, (_, index) => {
        const prescription = testPrescriptions[index % testPrescriptions.length];
        return this.runPrescriptionWorkflow(prescription)
          .then(() => {
            successCount++;
          })
          .catch((error) => {
            failCount++;
            errors.push({
              operation: 'workflow',
              error: error.message,
            });
          });
      });

      // Wait for all concurrent requests to complete
      await Promise.all(requests);

      // Brief pause between iterations
      if (iteration < config.iterations - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    // Gather metrics
    const openaiMetrics = this.monitor.getPercentiles('openai-parse');
    const rxnormMetrics = this.monitor.getPercentiles('rxnorm-lookup');
    const fdaMetrics = this.monitor.getPercentiles('fda-search');

    const openaiCache = this.monitor.getCacheStats('openai-parse');
    const rxnormCache = this.monitor.getCacheStats('rxnorm-lookup');
    const fdaCache = this.monitor.getCacheStats('fda-search');

    const totalRequests = config.concurrency * config.iterations;

    const result: LoadTestResult = {
      config,
      timestamp: new Date().toISOString(),
      totalRequests,
      successfulRequests: successCount,
      failedRequests: failCount,
      totalDuration,
      requestsPerSecond: (totalRequests / totalDuration) * 1000,
      openai: {
        p50: openaiMetrics?.p50 || 0,
        p95: openaiMetrics?.p95 || 0,
        p99: openaiMetrics?.p99 || 0,
        avg: openaiMetrics?.avg || 0,
        cacheHitRate: openaiCache?.hitRate || 0,
      },
      rxnorm: {
        p50: rxnormMetrics?.p50 || 0,
        p95: rxnormMetrics?.p95 || 0,
        p99: rxnormMetrics?.p99 || 0,
        avg: rxnormMetrics?.avg || 0,
        cacheHitRate: rxnormCache?.hitRate || 0,
      },
      fda: {
        p50: fdaMetrics?.p50 || 0,
        p95: fdaMetrics?.p95 || 0,
        p99: fdaMetrics?.p99 || 0,
        avg: fdaMetrics?.avg || 0,
        cacheHitRate: fdaCache?.hitRate || 0,
      },
      errors,
    };

    return result;
  }

  /**
   * Print load test results
   */
  printResults(result: LoadTestResult): void {
    console.log('\n=== Load Test Results ===\n');
    console.log(`Timestamp: ${result.timestamp}`);
    console.log(`Configuration:`);
    console.log(`  Concurrency: ${result.config.concurrency}`);
    console.log(`  Iterations: ${result.config.iterations}`);
    console.log(`\nOverall Performance:`);
    console.log(`  Total Requests: ${result.totalRequests}`);
    console.log(`  Successful: ${result.successfulRequests}`);
    console.log(`  Failed: ${result.failedRequests}`);
    console.log(`  Total Duration: ${result.totalDuration}ms`);
    console.log(`  Requests/sec: ${result.requestsPerSecond.toFixed(2)}`);

    console.log(`\nOpenAI Service:`);
    console.log(`  p50: ${result.openai.p50.toFixed(0)}ms`);
    console.log(`  p95: ${result.openai.p95.toFixed(0)}ms`);
    console.log(`  p99: ${result.openai.p99.toFixed(0)}ms`);
    console.log(`  avg: ${result.openai.avg.toFixed(0)}ms`);
    console.log(`  Cache Hit Rate: ${result.openai.cacheHitRate.toFixed(1)}%`);

    console.log(`\nRxNorm Service:`);
    console.log(`  p50: ${result.rxnorm.p50.toFixed(0)}ms`);
    console.log(`  p95: ${result.rxnorm.p95.toFixed(0)}ms`);
    console.log(`  p99: ${result.rxnorm.p99.toFixed(0)}ms`);
    console.log(`  avg: ${result.rxnorm.avg.toFixed(0)}ms`);
    console.log(`  Cache Hit Rate: ${result.rxnorm.cacheHitRate.toFixed(1)}%`);

    console.log(`\nFDA Service:`);
    console.log(`  p50: ${result.fda.p50.toFixed(0)}ms`);
    console.log(`  p95: ${result.fda.p95.toFixed(0)}ms`);
    console.log(`  p99: ${result.fda.p99.toFixed(0)}ms`);
    console.log(`  avg: ${result.fda.avg.toFixed(0)}ms`);
    console.log(`  Cache Hit Rate: ${result.fda.cacheHitRate.toFixed(1)}%`);

    if (result.errors.length > 0) {
      console.log(`\nErrors (${result.errors.length}):`);
      const errorCounts = result.errors.reduce(
        (acc, err) => {
          acc[err.error] = (acc[err.error] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
      for (const [error, count] of Object.entries(errorCounts)) {
        console.log(`  ${error}: ${count}`);
      }
    }

    // Performance targets comparison
    console.log(`\n=== Performance Targets ===`);
    console.log(`OpenAI Parse:`);
    console.log(
      `  Target: <3s (cached: <100ms) | Actual: ${result.openai.avg.toFixed(0)}ms ${
        result.openai.avg < 100 ? '✓' : result.openai.avg < 3000 ? '~' : '✗'
      }`
    );
    console.log(`RxNorm Lookup:`);
    console.log(
      `  Target: <1s (cached: <50ms) | Actual: ${result.rxnorm.avg.toFixed(0)}ms ${
        result.rxnorm.avg < 50 ? '✓' : result.rxnorm.avg < 1000 ? '~' : '✗'
      }`
    );
    console.log(`FDA Search:`);
    console.log(
      `  Target: <2s (cached: <100ms) | Actual: ${result.fda.avg.toFixed(0)}ms ${
        result.fda.avg < 100 ? '✓' : result.fda.avg < 2000 ? '~' : '✗'
      }`
    );

    console.log(`\nCache Hit Rate Targets:`);
    console.log(
      `  OpenAI: Target >60% | Actual: ${result.openai.cacheHitRate.toFixed(1)}% ${
        result.openai.cacheHitRate >= 60 ? '✓' : '✗'
      }`
    );
    console.log(
      `  RxNorm: Target >80% | Actual: ${result.rxnorm.cacheHitRate.toFixed(1)}% ${
        result.rxnorm.cacheHitRate >= 80 ? '✓' : '✗'
      }`
    );
    console.log(
      `  FDA: Target >70% | Actual: ${result.fda.cacheHitRate.toFixed(1)}% ${
        result.fda.cacheHitRate >= 70 ? '✓' : '✗'
      }`
    );
  }

  /**
   * Save results to file
   */
  async saveResults(result: LoadTestResult, filename: string): Promise<void> {
    const fs = await import('fs/promises');
    await fs.writeFile(filename, JSON.stringify(result, null, 2));
    console.log(`\nResults saved to: ${filename}`);
  }
}

// Main execution
async function main() {
  const tester = new LoadTester();

  // Test configurations
  const configs: LoadTestConfig[] = [
    { concurrency: 10, iterations: 2, warmupRounds: 5 }, // Light load
    { concurrency: 50, iterations: 2, warmupRounds: 0 }, // Medium load
    { concurrency: 100, iterations: 1, warmupRounds: 0 }, // Heavy load
  ];

  for (const config of configs) {
    const result = await tester.runLoadTest(config);
    tester.printResults(result);

    // Save results
    const filename = `load-test-results-${config.concurrency}x${config.iterations}-${Date.now()}.json`;
    await tester.saveResults(result, filename);

    // Pause between tests
    if (configs.indexOf(config) < configs.length - 1) {
      console.log('\n--- Waiting 5 seconds before next test ---\n');
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  console.log('\n=== All Load Tests Complete ===\n');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { LoadTester, type LoadTestConfig, type LoadTestResult };
