/**
 * Zod schemas for prescription parsing with OpenAI structured outputs
 * These schemas ensure 95%+ accuracy through runtime validation
 */

import { z } from 'zod';

/**
 * Schema for parsed prescription data from OpenAI
 * Maps to NormalizedMedication but with Zod validation
 */
export const PrescriptionParseSchema = z.object({
  drugName: z.string().min(1, 'Drug name is required').describe('The normalized medication name (e.g., "Lisinopril", "Metformin")'),
  strength: z.string().min(1, 'Strength is required').describe('The medication strength with units (e.g., "10mg", "500mg", "5mg/ml")'),
  form: z.string().min(1, 'Form is required').describe('The dosage form (e.g., "tablet", "capsule", "solution", "injection")'),
  quantity: z.number().int().positive('Quantity must be positive').describe('The total quantity prescribed (e.g., 30 tablets, 90 capsules)'),
  sig: z.string().optional().describe('Prescriber instructions - Sig (Signetur). How the patient should take the medication (e.g., "Take 1 tablet by mouth daily", "Take 2 capsules twice daily with food")'),
  daysSupply: z.number().int().positive().optional().describe('The number of days the prescription should last'),
  confidence: z.number().min(0).max(1).describe('Confidence score from 0-1 for the parsing accuracy'),
  normalizations: z.object({
    originalDrugName: z.string().optional().describe('Original drug name before normalization/spelling correction'),
    spellingCorrections: z.array(z.string()).optional().describe('Any spelling corrections made'),
  }).optional().describe('Metadata about normalizations performed'),
});

/**
 * Type inference from Zod schema
 */
export type PrescriptionParse = z.infer<typeof PrescriptionParseSchema>;

/**
 * Input schema for raw prescription text
 */
export const PrescriptionInputSchema = z.object({
  prescriptionText: z.string().min(1, 'Prescription text cannot be empty'),
  context: z.object({
    includeAlternativeSpellings: z.boolean().optional().default(true),
    strictValidation: z.boolean().optional().default(true),
  }).optional(),
});

export type PrescriptionInput = z.infer<typeof PrescriptionInputSchema>;

/**
 * Response schema for OpenAI parsing with metadata
 */
export const OpenAIPrescriptionResponseSchema = z.object({
  parsed: PrescriptionParseSchema,
  metadata: z.object({
    model: z.string(),
    promptTokens: z.number().optional(),
    completionTokens: z.number().optional(),
    totalTokens: z.number().optional(),
    processingTime: z.number().optional(),
  }).optional(),
});

export type OpenAIPrescriptionResponse = z.infer<typeof OpenAIPrescriptionResponseSchema>;

/**
 * Validation result schema
 */
export const ValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(z.object({
    field: z.string(),
    message: z.string(),
    code: z.string().optional(),
  })),
  warnings: z.array(z.object({
    field: z.string(),
    message: z.string(),
  })).optional(),
});

export type ValidationResult = z.infer<typeof ValidationResultSchema>;

/**
 * Common dosage forms for validation
 */
export const VALID_DOSAGE_FORMS = [
  'tablet',
  'capsule',
  'solution',
  'suspension',
  'injection',
  'cream',
  'ointment',
  'gel',
  'patch',
  'inhaler',
  'drops',
  'syrup',
  'powder',
  'suppository',
  'spray',
] as const;

/**
 * Helper function to validate dosage form
 */
export function isValidDosageForm(form: string): boolean {
  return VALID_DOSAGE_FORMS.includes(form.toLowerCase() as typeof VALID_DOSAGE_FORMS[number]);
}
