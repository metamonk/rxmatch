/**
 * Redis cache service with 7-day TTL for OpenAI responses
 * Implements subtask 2.4 - Set Up Redis Caching
 */

import Redis from 'ioredis';
import { getConfig } from '$lib/utils/config';
import type { PrescriptionParse } from '$lib/types/prescription';

export class CacheService {
  private client: Redis | null = null;
  private config;
  private isConnected = false;

  constructor() {
    this.config = getConfig().redis;
  }

  /**
   * Initialize Redis connection
   * Called lazily on first use
   */
  private async connect(): Promise<void> {
    if (this.isConnected && this.client) {
      return;
    }

    try {
      this.client = new Redis({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        db: this.config.db,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false,
      });

      this.client.on('error', (err) => {
        console.error('[Redis] Connection error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('[Redis] Connected successfully');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        console.log('[Redis] Ready to accept commands');
        this.isConnected = true;
      });

      // Wait for connection
      await this.client.ping();
      this.isConnected = true;
    } catch (error) {
      console.error('[Redis] Failed to connect:', error);
      this.client = null;
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!getConfig().features.cacheEnabled) {
      return null;
    }

    try {
      await this.connect();
      if (!this.client) return null;

      const value = await this.client.get(key);
      if (!value) return null;

      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`[Redis] Error getting key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache with optional TTL
   */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (!getConfig().features.cacheEnabled) {
      return;
    }

    try {
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
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
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
