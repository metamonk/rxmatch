/**
 * RxNorm API service for drug standardization
 */

import type { RxNormResult } from '$lib/types';
import { getConfig } from '$lib/utils/config';

export class RxNormService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = getConfig().apis.rxnorm.baseUrl;
  }

  /**
   * Find RxCUI using approximate term matching
   */
  async findRxCUI(drugName: string, strength?: string, form?: string): Promise<RxNormResult[]> {
    // TODO: Implement RxNorm /approximateTerm API call
    // Combine drugName + strength + form into search term
    throw new Error('Not implemented');
  }

  /**
   * Get NDC codes for a given RxCUI
   */
  async getNDCsForRxCUI(rxcui: string): Promise<string[]> {
    // TODO: Implement RxNorm /rxcui/{id}/ndcs API call
    throw new Error('Not implemented');
  }

  /**
   * Get drug properties for a given RxCUI
   */
  async getDrugProperties(rxcui: string): Promise<{
    name: string;
    strength?: string;
    form?: string;
  }> {
    // TODO: Implement RxNorm /rxcui/{id}/properties API call
    throw new Error('Not implemented');
  }
}
