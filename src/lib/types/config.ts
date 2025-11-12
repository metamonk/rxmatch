/**
 * Application configuration type definitions
 */

export interface AppConfig {
  openai: OpenAIConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  apis: ExternalAPIsConfig;
  features: FeatureFlags;
  rateLimiting: RateLimitConfig;
}

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface DatabaseConfig {
  url: string;
  poolMin: number;
  poolMax: number;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  ttl: {
    cache: number; // 7 days for general cache
    rxcui: number; // 30 days for RxCUI mappings
  };
}

export interface ExternalAPIsConfig {
  rxnorm: {
    baseUrl: string;
  };
  fda: {
    baseUrl: string;
  };
}

export interface FeatureFlags {
  cacheEnabled: boolean;
  rateLimiting: boolean;
  analytics: boolean;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface SessionConfig {
  secret: string;
  maxAge: number;
}
