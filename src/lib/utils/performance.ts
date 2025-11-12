/**
 * Performance monitoring utilities for RxMatch
 * Task 14: Performance Optimization and Caching Strategy
 */

export interface PerformanceMetric {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  cacheHit?: boolean;
  error?: boolean;
  metadata?: Record<string, any>;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
}

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private cacheStats: Map<string, CacheMetrics> = new Map();

  /**
   * Start tracking an operation
   */
  startOperation(operationId: string, operation: string, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      operation,
      startTime: Date.now(),
      metadata,
    };

    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }

    this.metrics.get(operation)!.push(metric);
  }

  /**
   * End tracking an operation
   */
  endOperation(
    operation: string,
    cacheHit?: boolean,
    error?: boolean,
    metadata?: Record<string, any>
  ): number {
    const operations = this.metrics.get(operation);
    if (!operations || operations.length === 0) {
      console.warn(`No operation found for: ${operation}`);
      return 0;
    }

    const metric = operations[operations.length - 1];
    metric.endTime = Date.now();
    metric.duration = metric.endTime - metric.startTime;
    metric.cacheHit = cacheHit;
    metric.error = error;

    if (metadata) {
      metric.metadata = { ...metric.metadata, ...metadata };
    }

    // Update cache stats
    if (cacheHit !== undefined) {
      this.updateCacheStats(operation, cacheHit);
    }

    return metric.duration;
  }

  /**
   * Update cache statistics
   */
  private updateCacheStats(operation: string, hit: boolean): void {
    if (!this.cacheStats.has(operation)) {
      this.cacheStats.set(operation, {
        hits: 0,
        misses: 0,
        hitRate: 0,
        totalRequests: 0,
      });
    }

    const stats = this.cacheStats.get(operation)!;
    stats.totalRequests++;

    if (hit) {
      stats.hits++;
    } else {
      stats.misses++;
    }

    stats.hitRate = stats.totalRequests > 0 ? (stats.hits / stats.totalRequests) * 100 : 0;
  }

  /**
   * Get cache statistics for an operation
   */
  getCacheStats(operation: string): CacheMetrics | null {
    return this.cacheStats.get(operation) || null;
  }

  /**
   * Get all cache statistics
   */
  getAllCacheStats(): Map<string, CacheMetrics> {
    return new Map(this.cacheStats);
  }

  /**
   * Calculate percentiles for an operation
   */
  getPercentiles(operation: string): {
    p50: number;
    p95: number;
    p99: number;
    avg: number;
    min: number;
    max: number;
    count: number;
  } | null {
    const operations = this.metrics.get(operation);
    if (!operations || operations.length === 0) {
      return null;
    }

    const durations = operations
      .filter((m) => m.duration !== undefined)
      .map((m) => m.duration!)
      .sort((a, b) => a - b);

    if (durations.length === 0) {
      return null;
    }

    const getPercentile = (arr: number[], percentile: number): number => {
      const index = Math.ceil((percentile / 100) * arr.length) - 1;
      return arr[Math.max(0, index)];
    };

    const sum = durations.reduce((acc, val) => acc + val, 0);

    return {
      p50: getPercentile(durations, 50),
      p95: getPercentile(durations, 95),
      p99: getPercentile(durations, 99),
      avg: sum / durations.length,
      min: durations[0],
      max: durations[durations.length - 1],
      count: durations.length,
    };
  }

  /**
   * Get summary report for all operations
   */
  getReport(): {
    operations: Record<string, any>;
    cacheStats: Record<string, CacheMetrics>;
  } {
    const operations: Record<string, any> = {};

    for (const [operation, _] of this.metrics) {
      const percentiles = this.getPercentiles(operation);
      const cacheStats = this.getCacheStats(operation);

      operations[operation] = {
        ...percentiles,
        cacheStats,
      };
    }

    const cacheStatsObj: Record<string, CacheMetrics> = {};
    for (const [key, value] of this.cacheStats) {
      cacheStatsObj[key] = value;
    }

    return {
      operations,
      cacheStats: cacheStatsObj,
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
    this.cacheStats.clear();
  }

  /**
   * Get raw metrics for an operation
   */
  getRawMetrics(operation: string): PerformanceMetric[] {
    return this.metrics.get(operation) || [];
  }
}

// Singleton instance
let performanceMonitor: PerformanceMonitor | null = null;

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!performanceMonitor) {
    performanceMonitor = new PerformanceMonitor();
  }
  return performanceMonitor;
}

/**
 * Simple timing decorator for async functions
 */
export function timed<T extends (...args: any[]) => Promise<any>>(
  operation: string,
  fn: T
): T {
  return (async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    const monitor = getPerformanceMonitor();
    monitor.startOperation(operation, operation);

    try {
      const result = await fn(...args);
      monitor.endOperation(operation, false, false);
      return result;
    } catch (error) {
      monitor.endOperation(operation, false, true);
      throw error;
    }
  }) as T;
}
