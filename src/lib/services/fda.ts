/**
 * FDA NDC Directory API service
 */

import type { NDCPackage } from '$lib/types';
import { getConfig } from '$lib/utils/config';

export class FDAService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = getConfig().apis.fda.baseUrl;
  }

  async searchByNDC(ndc: string): Promise<NDCPackage[]> {
    throw new Error('Not implemented');
  }

  async searchByDrugName(drugName: string, limit = 100): Promise<NDCPackage[]> {
    throw new Error('Not implemented');
  }

  async getPackageDetails(ndc: string): Promise<NDCPackage | null> {
    throw new Error('Not implemented');
  }
}
