/**
 * Redis cache service
 */

import { getConfig } from '$lib/utils/config';

export class CacheService {
  private config;

  constructor() {
    this.config = getConfig().redis;
  }

  async get<T>(key: string): Promise<T | null> {
    throw new Error('Not implemented');
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    throw new Error('Not implemented');
  }

  async delete(key: string): Promise<void> {
    throw new Error('Not implemented');
  }

  getRxCUIKey(drugName: string, strength?: string, form?: string): string {
    const parts = [drugName, strength || '', form || ''];
    return 'rxcui:' + parts.join(':').toLowerCase();
  }

  getNDCKey(ndc: string): string {
    return 'ndc:' + ndc;
  }
}
