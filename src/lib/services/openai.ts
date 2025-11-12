/**
 * OpenAI service for medication input normalization
 */

import type { MedicationInput, NormalizedMedication } from '$lib/types';
import { getConfig } from '$lib/utils/config';

export class OpenAIService {
  private config;

  constructor() {
    this.config = getConfig().openai;
  }

  /**
   * Normalize medication input using OpenAI
   */
  async normalizeMedication(input: MedicationInput): Promise<NormalizedMedication> {
    // TODO: Implement OpenAI API call
    // This will parse the input, correct spelling, interpret SIG, calculate quantities
    throw new Error('Not implemented');
  }

  /**
   * Parse SIG (prescription directions) into structured format
   */
  async parseSig(sig: string): Promise<{
    frequency: string;
    quantity: number;
    duration: number;
  }> {
    // TODO: Implement SIG parsing
    throw new Error('Not implemented');
  }
}
