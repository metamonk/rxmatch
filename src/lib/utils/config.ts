/**
 * Application configuration loader
 */

import type { AppConfig } from '$lib/types';

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  return value ? value === 'true' : defaultValue;
}

export function loadConfig(): AppConfig {
  return {
    openai: {
      apiKey: getEnvVar('OPENAI_API_KEY'),
      model: getEnvVar('OPENAI_MODEL', 'gpt-4o-mini'),
      maxTokens: getEnvNumber('OPENAI_MAX_TOKENS', 1000),
      temperature: parseFloat(getEnvVar('OPENAI_TEMPERATURE', '0.2'))
    },
    database: {
      url: getEnvVar('DATABASE_URL'),
      poolMin: getEnvNumber('DATABASE_POOL_MIN', 2),
      poolMax: getEnvNumber('DATABASE_POOL_MAX', 10)
    },
    redis: {
      url: getEnvVar('REDIS_URL'),
      token: getEnvVar('REDIS_TOKEN'),
      ttl: {
        cache: getEnvNumber('REDIS_TTL_CACHE', 604800), // 7 days
        rxcui: getEnvNumber('REDIS_TTL_RXCUI', 2592000) // 30 days
      }
    },
    apis: {
      rxnorm: {
        baseUrl: getEnvVar('RXNORM_API_BASE', 'https://rxnav.nlm.nih.gov/REST')
      },
      fda: {
        baseUrl: getEnvVar('FDA_NDC_API_BASE', 'https://api.fda.gov/drug/ndc.json')
      }
    },
    features: {
      cacheEnabled: getEnvBoolean('FEATURE_CACHE_ENABLED', true),
      rateLimiting: getEnvBoolean('FEATURE_RATE_LIMITING', true),
      analytics: getEnvBoolean('FEATURE_ANALYTICS', false)
    },
    rateLimiting: {
      windowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 60000),
      maxRequests: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 60)
    }
  };
}

// Singleton config instance
let config: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!config) {
    config = loadConfig();
  }
  return config;
}
