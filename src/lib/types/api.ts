/**
 * API request and response type definitions
 */

import type { MedicationInput, CalculationResult } from './medication';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: {
    timestamp: string;
    duration?: number;
    cached?: boolean;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface CalculateRequest {
  input: MedicationInput;
  options?: {
    includeAlternatives?: boolean;
    maxResults?: number;
    preferredManufacturers?: string[];
  };
}

export interface CalculateResponse extends ApiResponse<CalculationResult> {}

// OpenAI API types
export interface OpenAIRequest {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface OpenAIResponse {
  normalized: {
    drugName: string;
    strength: string;
    form: string;
    quantity: number;
    sig?: string;
  };
  confidence: number;
}

// RxNorm API types
export interface RxNormApproximateRequest {
  term: string;
  maxEntries?: number;
  option?: number; // 0=exact, 1=normalized
}

export interface RxNormApproximateResponse {
  approximateGroup: {
    candidate: Array<{
      rxcui: string;
      name: string;
      rank: string;
      score: string;
    }>;
  };
}

// FDA NDC API types
export interface FDANDCRequest {
  search: string;
  limit?: number;
  skip?: number;
}

export interface FDANDCResponse {
  meta: {
    disclaimer: string;
    terms: string;
    license: string;
    last_updated: string;
    results: {
      skip: number;
      limit: number;
      total: number;
    };
  };
  results: Array<{
    product_ndc: string;
    generic_name: string;
    labeler_name: string;
    brand_name?: string;
    product_type: string;
    route: string[];
    marketing_category: string;
    application_number?: string;
    brand_name_base?: string;
    pharm_class?: string[];
    packaging?: Array<{
      package_ndc: string;
      description: string;
      marketing_start_date: string;
      sample?: boolean;
    }>;
  }>;
}
