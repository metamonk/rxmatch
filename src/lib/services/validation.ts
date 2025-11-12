/**
 * Response validation service for prescription parsing
 * Implements business rules and accuracy checks (subtask 2.3)
 */

import {
  type PrescriptionParse,
  type ValidationResult,
  VALID_DOSAGE_FORMS,
  isValidDosageForm
} from '$lib/types/prescription';

export class ValidationService {
  private readonly MIN_CONFIDENCE_THRESHOLD = 0.8;
  private readonly WARN_CONFIDENCE_THRESHOLD = 0.9;

  /**
   * Validate parsed prescription against business rules
   * Returns validation result with errors and warnings
   */
  validatePrescription(parsed: PrescriptionParse): ValidationResult {
    const errors: Array<{ field: string; message: string; code?: string }> = [];
    const warnings: Array<{ field: string; message: string }> = [];

    // 1. Validate confidence score
    if (parsed.confidence < this.MIN_CONFIDENCE_THRESHOLD) {
      errors.push({
        field: 'confidence',
        message: `Confidence score ${parsed.confidence} is below minimum threshold ${this.MIN_CONFIDENCE_THRESHOLD}`,
        code: 'LOW_CONFIDENCE'
      });
    } else if (parsed.confidence < this.WARN_CONFIDENCE_THRESHOLD) {
      warnings.push({
        field: 'confidence',
        message: `Confidence score ${parsed.confidence} is below recommended threshold ${this.WARN_CONFIDENCE_THRESHOLD}`
      });
    }

    // 2. Validate drug name
    if (!this.isValidDrugName(parsed.drugName)) {
      errors.push({
        field: 'drugName',
        message: 'Drug name appears invalid or too short',
        code: 'INVALID_DRUG_NAME'
      });
    }

    // 3. Validate strength format
    if (!this.isValidStrength(parsed.strength)) {
      errors.push({
        field: 'strength',
        message: 'Strength must include units (e.g., "10mg", "5ml")',
        code: 'INVALID_STRENGTH_FORMAT'
      });
    }

    // 4. Validate dosage form
    if (!isValidDosageForm(parsed.form)) {
      warnings.push({
        field: 'form',
        message: `Dosage form "${parsed.form}" is not in the standard list. Valid forms: ${VALID_DOSAGE_FORMS.join(', ')}`
      });
    }

    // 5. Validate quantity
    if (parsed.quantity <= 0) {
      errors.push({
        field: 'quantity',
        message: 'Quantity must be positive',
        code: 'INVALID_QUANTITY'
      });
    }

    if (parsed.quantity > 10000) {
      warnings.push({
        field: 'quantity',
        message: `Unusually high quantity: ${parsed.quantity}. Please verify this is correct.`
      });
    }

    // 6. Validate days supply if present
    if (parsed.daysSupply !== undefined) {
      if (parsed.daysSupply <= 0) {
        errors.push({
          field: 'daysSupply',
          message: 'Days supply must be positive',
          code: 'INVALID_DAYS_SUPPLY'
        });
      }

      if (parsed.daysSupply > 365) {
        warnings.push({
          field: 'daysSupply',
          message: `Days supply exceeds 365 days: ${parsed.daysSupply}`
        });
      }
    }

    // 7. Validate SIG if present
    if (parsed.sig && parsed.sig.length < 5) {
      warnings.push({
        field: 'sig',
        message: 'SIG appears unusually short. Verify directions are complete.'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Validate drug name format
   */
  private isValidDrugName(drugName: string): boolean {
    // Drug name should be at least 2 characters and not contain invalid characters
    if (drugName.length < 2) return false;

    // Should only contain letters, numbers, spaces, hyphens, and parentheses
    const validPattern = /^[a-zA-Z0-9\s\-()]+$/;
    return validPattern.test(drugName);
  }

  /**
   * Validate strength format (must include units)
   */
  private isValidStrength(strength: string): boolean {
    // Strength should contain both a number and a unit
    // Valid examples: "10mg", "5ml", "2.5mg", "100mcg", "1g"
    const strengthPattern = /^\d+(\.\d+)?\s*(mg|mcg|g|ml|l|iu|units?|%)/i;
    return strengthPattern.test(strength);
  }

  /**
   * Check if validation warnings should block processing
   */
  shouldBlockProcessing(validation: ValidationResult): boolean {
    // Block if there are any errors
    return !validation.isValid;
  }

  /**
   * Format validation result for logging/display
   */
  formatValidationResult(validation: ValidationResult): string {
    const parts: string[] = [];

    if (validation.isValid) {
      parts.push('✓ Validation passed');
    } else {
      parts.push('✗ Validation failed');
    }

    if (validation.errors.length > 0) {
      parts.push('\nErrors:');
      validation.errors.forEach(error => {
        parts.push(`  - ${error.field}: ${error.message}`);
      });
    }

    if (validation.warnings && validation.warnings.length > 0) {
      parts.push('\nWarnings:');
      validation.warnings.forEach(warning => {
        parts.push(`  - ${warning.field}: ${warning.message}`);
      });
    }

    return parts.join('\n');
  }

  /**
   * Validate multiple prescriptions in batch
   */
  validateBatch(prescriptions: PrescriptionParse[]): {
    results: ValidationResult[];
    summary: {
      total: number;
      valid: number;
      invalid: number;
      withWarnings: number;
    };
  } {
    const results = prescriptions.map(p => this.validatePrescription(p));

    const summary = {
      total: results.length,
      valid: results.filter(r => r.isValid).length,
      invalid: results.filter(r => !r.isValid).length,
      withWarnings: results.filter(r => r.warnings && r.warnings.length > 0).length
    };

    return { results, summary };
  }
}

/**
 * Singleton instance
 */
let validationService: ValidationService | null = null;

export function getValidationService(): ValidationService {
  if (!validationService) {
    validationService = new ValidationService();
  }
  return validationService;
}
