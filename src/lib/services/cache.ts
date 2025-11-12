/**
 * Redis cache service with 7-day TTL for OpenAI responses
 * Implements subtask 2.4 - Set Up Redis Caching
 * Uses Upstash Redis (REST-based, serverless-friendly)
 */

import { Redis } from '@upstash/redis';
import { getConfig } from '$lib/utils/config';
import type { PrescriptionParse } from '$lib/types/prescription';
import { LRUCache } from '$lib/utils/lru-cache';
import { getPerformanceMonitor } from '$lib/utils/performance';

export class CacheService {
  private client: Redis | null = null;
  private config;
  private isConnected = false;
  private l1Cache: LRUCache<any>;
  private monitor;

  constructor() {
    this.config = getConfig().redis;
    // L1 cache: 500 items, 5 minutes TTL for hot data
    this.l1Cache = new LRUCache<any>(500, 300000);
    this.monitor = getPerformanceMonitor();
  }

  /**
   * Initialize Upstash Redis client
   * Called lazily on first use
   */
  private async connect(): Promise<void> {
    if (this.isConnected && this.client) {
      return;
    }

    try {
      // Upstash Redis uses REST API - no traditional connection needed
      this.client = new Redis({
        url: this.config.url,
        token: this.config.token,
      });

      // Test connection with ping
      await this.client.ping();
      this.isConnected = true;
      console.log('[Redis] Upstash Redis connected successfully');
    } catch (error) {
      console.error('[Redis] Failed to connect:', error);
      this.client = null;
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Get value from cache (L1 -> L2 Redis)
   */
  async get<T>(key: string): Promise<T | null> {
    if (!getConfig().features.cacheEnabled) {
      return null;
    }

    const startTime = Date.now();

    try {
      // Try L1 cache first (in-memory)
      const l1Value = this.l1Cache.get(key);
      if (l1Value !== null) {
        const duration = Date.now() - startTime;
        console.log(`[Cache] L1 hit for ${key} (${duration}ms)`);
        return l1Value as T;
      }

      // Try L2 cache (Redis)
      await this.connect();
      if (!this.client) return null;

      const value = await this.client.get(key);
      if (!value) {
        const duration = Date.now() - startTime;
        console.log(`[Cache] MISS for ${key} (${duration}ms)`);
        return null;
      }

      // Upstash returns the value, parse if it's a string
      const parsed = typeof value === 'string' ? JSON.parse(value) as T : value as T;

      // Promote to L1 cache
      this.l1Cache.set(key, parsed);

      const duration = Date.now() - startTime;
      console.log(`[Cache] L2 hit for ${key} (${duration}ms)`);

      return parsed;
    } catch (error) {
      console.error(`[Redis] Error getting key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache with optional TTL (L1 + L2)
   */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (!getConfig().features.cacheEnabled) {
      return;
    }

    try {
      // Set in L1 cache (in-memory)
      this.l1Cache.set(key, value);

      // Set in L2 cache (Redis)
      await this.connect();
      if (!this.client) return;

      const serialized = JSON.stringify(value);
      const ttl = ttlSeconds || this.config.ttl.cache;

      await this.client.setex(key, ttl, serialized);
    } catch (error) {
      console.error(`[Redis] Error setting key ${key}:`, error);
    }
  }

  /**
   * Delete key from cache
   */
  async delete(key: string): Promise<void> {
    try {
      await this.connect();
      if (!this.client) return;

      await this.client.del(key);
    } catch (error) {
      console.error(`[Redis] Error deleting key ${key}:`, error);
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      await this.connect();
      if (!this.client) return false;

      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`[Redis] Error checking existence of key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get TTL for a key
   */
  async getTTL(key: string): Promise<number> {
    try {
      await this.connect();
      if (!this.client) return -1;

      return await this.client.ttl(key);
    } catch (error) {
      console.error(`[Redis] Error getting TTL for key ${key}:`, error);
      return -1;
    }
  }

  /**
   * Cache key generators
   */

  getOpenAIKey(prescriptionText: string): string {
    // Create hash of prescription text for consistent caching
    const hash = this.hashString(prescriptionText);
    return `openai:parse:${hash}`;
  }

  getRxCUIKey(drugName: string, strength?: string, form?: string): string {
    const parts = [drugName, strength || '', form || ''];
    return 'rxcui:' + parts.join(':').toLowerCase().replace(/\s+/g, '_');
  }

  getNDCKey(ndc: string): string {
    return 'ndc:' + ndc.replace(/-/g, '');
  }

  /**
   * Specialized cache methods for prescription parsing
   */

  async cacheOpenAIResponse(prescriptionText: string, parsed: PrescriptionParse): Promise<void> {
    const key = this.getOpenAIKey(prescriptionText);
    // Use 7-day TTL for OpenAI responses (per PRD requirement)
    await this.set(key, parsed, this.config.ttl.cache); // 604800 seconds = 7 days
  }

  async getCachedOpenAIResponse(prescriptionText: string): Promise<PrescriptionParse | null> {
    const key = this.getOpenAIKey(prescriptionText);
    return this.get<PrescriptionParse>(key);
  }

  /**
   * Cache RxCUI with 30-day TTL (per PRD)
   */
  async cacheRxCUI(drugName: string, rxcui: string, strength?: string, form?: string): Promise<void> {
    const key = this.getRxCUIKey(drugName, strength, form);
    await this.set(key, rxcui, this.config.ttl.rxcui); // 2592000 seconds = 30 days
  }

  async getCachedRxCUI(drugName: string, strength?: string, form?: string): Promise<string | null> {
    const key = this.getRxCUIKey(drugName, strength, form);
    return this.get<string>(key);
  }

  /**
   * Simple string hash function for cache keys
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Close Redis connection
   * Note: Upstash Redis uses REST API, no connection to close
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      // Upstash REST client doesn't need explicit disconnect
      this.client = null;
      this.isConnected = false;
      console.log('[Redis] Disconnected');
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.connect();
      if (!this.client) return false;

      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('[Redis] Health check failed:', error);
      return false;
    }
  }

  /**
   * Get L1 cache statistics
   */
  getL1CacheStats() {
    return this.l1Cache.stats();
  }

  /**
   * Clear L1 cache
   */
  clearL1Cache(): void {
    this.l1Cache.clear();
    console.log('[Cache] L1 cache cleared');
  }

  /**
   * Cleanup expired L1 cache entries
   */
  cleanupL1Cache(): number {
    const removed = this.l1Cache.cleanup();
    console.log(`[Cache] Cleaned up ${removed} expired L1 entries`);
    return removed;
  }
}

/**
 * Singleton instance
 */
let cacheService: CacheService | null = null;

export function getCacheService(): CacheService {
  if (!cacheService) {
    cacheService = new CacheService();
  }
  return cacheService;
}
