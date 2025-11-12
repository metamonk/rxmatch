/**
 * In-memory LRU (Least Recently Used) cache
 * Task 14: Performance Optimization - Multi-layer caching strategy
 *
 * Used for hot data like:
 * - Common drug names (RxCUI lookups)
 * - Popular NDC packages
 * - Frequently accessed prescriptions
 */

interface CacheNode<T> {
  key: string;
  value: T;
  timestamp: number;
}

export class LRUCache<T> {
  private maxSize: number;
  private cache: Map<string, CacheNode<T>>;
  private accessOrder: string[];
  private ttlMs: number;

  constructor(maxSize: number = 1000, ttlMs: number = 300000) {
    // Default: 1000 items, 5 minutes TTL
    this.maxSize = maxSize;
    this.cache = new Map();
    this.accessOrder = [];
    this.ttlMs = ttlMs;
  }

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const node = this.cache.get(key);

    if (!node) {
      return null;
    }

    // Check if expired
    if (Date.now() - node.timestamp > this.ttlMs) {
      this.delete(key);
      return null;
    }

    // Move to end (most recently used)
    this.moveToEnd(key);

    return node.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T): void {
    // If key exists, update it
    if (this.cache.has(key)) {
      this.cache.set(key, {
        key,
        value,
        timestamp: Date.now(),
      });
      this.moveToEnd(key);
      return;
    }

    // If at capacity, remove least recently used
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    // Add new entry
    this.cache.set(key, {
      key,
      value,
      timestamp: Date.now(),
    });
    this.accessOrder.push(key);
  }

  /**
   * Delete key from cache
   */
  delete(key: string): boolean {
    const existed = this.cache.delete(key);
    if (existed) {
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
    }
    return existed;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const node = this.cache.get(key);
    if (!node) {
      return false;
    }

    // Check if expired
    if (Date.now() - node.timestamp > this.ttlMs) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  stats(): {
    size: number;
    maxSize: number;
    utilizationPercent: number;
    oldestEntryAge: number | null;
  } {
    let oldestAge: number | null = null;

    if (this.accessOrder.length > 0) {
      const oldestKey = this.accessOrder[0];
      const oldestNode = this.cache.get(oldestKey);
      if (oldestNode) {
        oldestAge = Date.now() - oldestNode.timestamp;
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      utilizationPercent: (this.cache.size / this.maxSize) * 100,
      oldestEntryAge: oldestAge,
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, node] of this.cache.entries()) {
      if (now - node.timestamp > this.ttlMs) {
        this.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Move key to end of access order (most recently used)
   */
  private moveToEnd(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) {
      return;
    }

    const lruKey = this.accessOrder.shift();
    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }
}

/**
 * Multi-tier cache combining in-memory LRU and Redis
 */
export class MultiTierCache<T> {
  private l1Cache: LRUCache<T>;
  private l2Cache: {
    get: (key: string) => Promise<T | null>;
    set: (key: string, value: T, ttl?: number) => Promise<void>;
  };
  private l2Ttl?: number;

  constructor(
    l1MaxSize: number = 1000,
    l1TtlMs: number = 300000,
    l2Cache: {
      get: (key: string) => Promise<T | null>;
      set: (key: string, value: T, ttl?: number) => Promise<void>;
    },
    l2Ttl?: number
  ) {
    this.l1Cache = new LRUCache<T>(l1MaxSize, l1TtlMs);
    this.l2Cache = l2Cache;
    this.l2Ttl = l2Ttl;
  }

  /**
   * Get value from cache (L1 -> L2)
   */
  async get(key: string): Promise<{ value: T | null; tier: 'L1' | 'L2' | 'MISS' }> {
    // Try L1 first
    const l1Value = this.l1Cache.get(key);
    if (l1Value !== null) {
      return { value: l1Value, tier: 'L1' };
    }

    // Try L2
    const l2Value = await this.l2Cache.get(key);
    if (l2Value !== null) {
      // Promote to L1
      this.l1Cache.set(key, l2Value);
      return { value: l2Value, tier: 'L2' };
    }

    return { value: null, tier: 'MISS' };
  }

  /**
   * Set value in both cache tiers
   */
  async set(key: string, value: T): Promise<void> {
    // Set in L1
    this.l1Cache.set(key, value);

    // Set in L2
    await this.l2Cache.set(key, value, this.l2Ttl);
  }

  /**
   * Clear L1 cache
   */
  clearL1(): void {
    this.l1Cache.clear();
  }

  /**
   * Get L1 cache statistics
   */
  getL1Stats() {
    return this.l1Cache.stats();
  }
}
