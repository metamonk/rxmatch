/**
 * Response validation service for prescription parsing
 * Implements business rules and accuracy checks (subtask 2.3)
 * Task 5: Validation and Safety Layer Implementation
 */

import {
  type PrescriptionParse,
  type ValidationResult,
  VALID_DOSAGE_FORMS,
  isValidDosageForm
} from '$lib/types/prescription';
import type { NormalizedMedication } from '$lib/types/medication';
import { createReviewQueueItem } from '$lib/server/db/services/manualReviewQueue';
import { getAuditService } from './audit';

/**
 * Confidence levels for validation
 */
export type ConfidenceLevel = 'high' | 'good' | 'medium' | 'low';

/**
 * Confidence threshold configuration
 */
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.95,      // ≥95% - auto-approve
  GOOD: 0.85,      // 85-94% - auto-approve with warning
  MEDIUM: 0.75,    // 75-84% - manual review recommended
  LOW: 0.75        // <75% - require manual review
} as const;

/**
 * Severity levels for validation warnings
 */
export type ValidationSeverity = 'info' | 'warning' | 'critical';

/**
 * Extended validation result with confidence level and reasonableness checks
 */
export interface ExtendedValidationResult extends ValidationResult {
  confidenceLevel: ConfidenceLevel;
  requiresManualReview: boolean;
  reasonablenessChecks: ReasonablenessCheckResult[];
  shouldAutoApprove: boolean;
  reasoning: string;
}

/**
 * Reasonableness check result
 */
export interface ReasonablenessCheckResult {
  checkName: string;
  passed: boolean;
  severity: ValidationSeverity;
  message: string;
  value?: any;
  threshold?: any;
}

/**
 * Medical reasonableness check configuration
 */
const REASONABLENESS_LIMITS = {
  MAX_DAYS_SUPPLY: 90,           // Typical maximum days supply
  MAX_QUANTITY_TABLETS: 1000,    // Unusually high quantity for tablets/capsules
  MAX_QUANTITY_ML: 5000,         // Unusually high quantity for liquids (5L)
  MIN_DAYS_SUPPLY: 1,            // Minimum reasonable days supply
  WARN_HIGH_QUANTITY: 500,       // Warning threshold for high quantities
  WARN_LONG_DAYS_SUPPLY: 60      // Warning threshold for long days supply
} as const;

export class ValidationService {
  private readonly MIN_CONFIDENCE_THRESHOLD = 0.8;
  private readonly WARN_CONFIDENCE_THRESHOLD = 0.9;
  private audit = getAuditService();

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

  // ========================================================================
  // Task 5: Validation and Safety Layer Implementation
  // ========================================================================

  /**
   * Task 5.1: Validate confidence score and return classification
   * @param score - Confidence score from 0-1
   * @returns Extended validation result with confidence level and review requirements
   */
  validateConfidenceScore(score: number): {
    confidenceLevel: ConfidenceLevel;
    requiresManualReview: boolean;
    shouldAutoApprove: boolean;
    reasoning: string;
  } {
    const level = this.getConfidenceLevel(score);
    const requiresReview = this.shouldRequireManualReview(score);
    const shouldAutoApprove = score >= CONFIDENCE_THRESHOLDS.GOOD;

    let reasoning = '';
    if (score >= CONFIDENCE_THRESHOLDS.HIGH) {
      reasoning = `High confidence score (${(score * 100).toFixed(1)}%) - auto-approved`;
    } else if (score >= CONFIDENCE_THRESHOLDS.GOOD) {
      reasoning = `Good confidence score (${(score * 100).toFixed(1)}%) - auto-approved with warning`;
    } else if (score >= CONFIDENCE_THRESHOLDS.MEDIUM) {
      reasoning = `Medium confidence score (${(score * 100).toFixed(1)}%) - manual review recommended`;
    } else {
      reasoning = `Low confidence score (${(score * 100).toFixed(1)}%) - manual review required`;
    }

    return {
      confidenceLevel: level,
      requiresManualReview: requiresReview,
      shouldAutoApprove,
      reasoning
    };
  }

  /**
   * Task 5.1: Get confidence level classification
   * @param score - Confidence score from 0-1
   * @returns Confidence level: 'high', 'good', 'medium', or 'low'
   */
  getConfidenceLevel(score: number): ConfidenceLevel {
    if (score >= CONFIDENCE_THRESHOLDS.HIGH) return 'high';
    if (score >= CONFIDENCE_THRESHOLDS.GOOD) return 'good';
    if (score >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'medium';
    return 'low';
  }

  /**
   * Task 5.1: Determine if manual review is required based on confidence score
   * @param score - Confidence score from 0-1
   * @returns true if manual review is required
   */
  shouldRequireManualReview(score: number): boolean {
    return score < CONFIDENCE_THRESHOLDS.LOW;
  }

  /**
   * Task 5.2: Perform medical reasonableness checks
   * @param parsed - Parsed prescription data
   * @returns Array of reasonableness check results
   */
  performReasonablenessChecks(parsed: PrescriptionParse): ReasonablenessCheckResult[] {
    const checks: ReasonablenessCheckResult[] = [];

    // 1. Check days supply
    if (parsed.daysSupply !== undefined) {
      checks.push(this.checkDaysSupply(parsed.daysSupply));
    }

    // 2. Check quantity
    checks.push(this.checkQuantity(parsed.quantity, parsed.form));

    // 3. Check strength
    checks.push(this.checkStrength(parsed.strength));

    // 4. Check route/form compatibility
    checks.push(this.checkRouteFormCompatibility(parsed.form, parsed.sig));

    return checks;
  }

  /**
   * Task 5.2: Check if days supply is reasonable
   */
  private checkDaysSupply(daysSupply: number): ReasonablenessCheckResult {
    if (daysSupply < REASONABLENESS_LIMITS.MIN_DAYS_SUPPLY) {
      return {
        checkName: 'days_supply',
        passed: false,
        severity: 'critical',
        message: `Days supply (${daysSupply}) is below minimum threshold`,
        value: daysSupply,
        threshold: REASONABLENESS_LIMITS.MIN_DAYS_SUPPLY
      };
    }

    if (daysSupply > REASONABLENESS_LIMITS.MAX_DAYS_SUPPLY) {
      return {
        checkName: 'days_supply',
        passed: false,
        severity: 'critical',
        message: `Days supply (${daysSupply}) exceeds typical maximum of ${REASONABLENESS_LIMITS.MAX_DAYS_SUPPLY} days`,
        value: daysSupply,
        threshold: REASONABLENESS_LIMITS.MAX_DAYS_SUPPLY
      };
    }

    if (daysSupply > REASONABLENESS_LIMITS.WARN_LONG_DAYS_SUPPLY) {
      return {
        checkName: 'days_supply',
        passed: true,
        severity: 'warning',
        message: `Days supply (${daysSupply}) is longer than typical. Verify this is correct.`,
        value: daysSupply,
        threshold: REASONABLENESS_LIMITS.WARN_LONG_DAYS_SUPPLY
      };
    }

    return {
      checkName: 'days_supply',
      passed: true,
      severity: 'info',
      message: `Days supply (${daysSupply}) is within normal range`,
      value: daysSupply
    };
  }

  /**
   * Task 5.2: Check if quantity is reasonable for the given form
   */
  private checkQuantity(quantity: number, form: string): ReasonablenessCheckResult {
    const isLiquid = this.isLiquidForm(form);
    const maxQuantity = isLiquid ? REASONABLENESS_LIMITS.MAX_QUANTITY_ML : REASONABLENESS_LIMITS.MAX_QUANTITY_TABLETS;
    const warnThreshold = REASONABLENESS_LIMITS.WARN_HIGH_QUANTITY;

    if (quantity > maxQuantity) {
      return {
        checkName: 'quantity',
        passed: false,
        severity: 'critical',
        message: `Quantity (${quantity} ${form}) is abnormally high. Maximum expected: ${maxQuantity}`,
        value: quantity,
        threshold: maxQuantity
      };
    }

    if (quantity > warnThreshold) {
      return {
        checkName: 'quantity',
        passed: true,
        severity: 'warning',
        message: `Quantity (${quantity} ${form}) is high. Please verify this is correct.`,
        value: quantity,
        threshold: warnThreshold
      };
    }

    return {
      checkName: 'quantity',
      passed: true,
      severity: 'info',
      message: `Quantity (${quantity} ${form}) is within normal range`,
      value: quantity
    };
  }

  /**
   * Task 5.2: Check if strength seems reasonable
   */
  private checkStrength(strength: string): ReasonablenessCheckResult {
    // Extract numeric value from strength
    const numericMatch = strength.match(/^(\d+(?:\.\d+)?)/);
    if (!numericMatch) {
      return {
        checkName: 'strength',
        passed: true,
        severity: 'warning',
        message: `Unable to validate strength format: ${strength}`,
        value: strength
      };
    }

    const value = parseFloat(numericMatch[1]);
    const strengthLower = strength.toLowerCase();

    // Check for extremely high or low strengths based on common units
    if (strengthLower.includes('mg')) {
      if (value > 5000) {
        return {
          checkName: 'strength',
          passed: false,
          severity: 'warning',
          message: `Strength (${strength}) is unusually high. Verify this is correct.`,
          value: strength,
          threshold: '5000mg'
        };
      }
      if (value < 0.1) {
        return {
          checkName: 'strength',
          passed: false,
          severity: 'warning',
          message: `Strength (${strength}) is unusually low. Consider if mcg unit is more appropriate.`,
          value: strength,
          threshold: '0.1mg'
        };
      }
    } else if (strengthLower.includes('mcg')) {
      if (value > 10000) {
        return {
          checkName: 'strength',
          passed: false,
          severity: 'warning',
          message: `Strength (${strength}) is unusually high. Verify this is correct.`,
          value: strength,
          threshold: '10000mcg'
        };
      }
    } else if (strengthLower.includes('g') && !strengthLower.includes('mg') && !strengthLower.includes('mcg')) {
      if (value > 50) {
        return {
          checkName: 'strength',
          passed: false,
          severity: 'warning',
          message: `Strength (${strength}) is unusually high. Verify this is correct.`,
          value: strength,
          threshold: '50g'
        };
      }
    }

    return {
      checkName: 'strength',
      passed: true,
      severity: 'info',
      message: `Strength (${strength}) appears reasonable`,
      value: strength
    };
  }

  /**
   * Task 5.2: Check route/form compatibility
   */
  private checkRouteFormCompatibility(form: string, sig?: string): ReasonablenessCheckResult {
    if (!sig) {
      return {
        checkName: 'route_form',
        passed: true,
        severity: 'info',
        message: 'No SIG provided - cannot validate route/form compatibility',
        value: form
      };
    }

    const formLower = form.toLowerCase();
    const sigLower = sig.toLowerCase();

    // Check for obvious mismatches
    const oralForms = ['tablet', 'capsule', 'syrup', 'solution', 'suspension'];
    const topicalForms = ['cream', 'ointment', 'gel', 'patch'];
    const inhalationForms = ['inhaler', 'spray'];

    if (oralForms.some(f => formLower.includes(f))) {
      if (sigLower.includes('apply topically') || sigLower.includes('apply to skin')) {
        return {
          checkName: 'route_form',
          passed: false,
          severity: 'critical',
          message: `Route mismatch: ${form} is an oral form but SIG indicates topical use`,
          value: { form, sig }
        };
      }
    }

    if (topicalForms.some(f => formLower.includes(f))) {
      if (sigLower.includes('by mouth') || sigLower.includes('orally')) {
        return {
          checkName: 'route_form',
          passed: false,
          severity: 'critical',
          message: `Route mismatch: ${form} is a topical form but SIG indicates oral use`,
          value: { form, sig }
        };
      }
    }

    if (inhalationForms.some(f => formLower.includes(f))) {
      if (sigLower.includes('by mouth') || sigLower.includes('apply')) {
        return {
          checkName: 'route_form',
          passed: false,
          severity: 'warning',
          message: `Route mismatch: ${form} is an inhalation form but SIG may indicate different route`,
          value: { form, sig }
        };
      }
    }

    return {
      checkName: 'route_form',
      passed: true,
      severity: 'info',
      message: `Route and form appear compatible`,
      value: { form, sig }
    };
  }

  /**
   * Helper: Check if form is a liquid
   */
  private isLiquidForm(form: string): boolean {
    const liquidForms = ['solution', 'suspension', 'syrup', 'drops'];
    return liquidForms.some(liquid => form.toLowerCase().includes(liquid));
  }

  /**
   * Task 5: Comprehensive validation combining confidence and reasonableness checks
   * @param parsed - Parsed prescription data
   * @returns Extended validation result
   */
  validatePrescriptionExtended(parsed: PrescriptionParse): ExtendedValidationResult {
    // Run basic validation first
    const basicValidation = this.validatePrescription(parsed);

    // Validate confidence score
    const confidenceValidation = this.validateConfidenceScore(parsed.confidence);

    // Perform reasonableness checks
    const reasonablenessChecks = this.performReasonablenessChecks(parsed);

    // Check if any critical reasonableness checks failed
    const hasCriticalFailures = reasonablenessChecks.some(
      check => !check.passed && check.severity === 'critical'
    );

    // Determine if manual review is required
    const requiresManualReview =
      confidenceValidation.requiresManualReview ||
      hasCriticalFailures;

    // Determine if auto-approve is possible
    const shouldAutoApprove =
      confidenceValidation.shouldAutoApprove &&
      !hasCriticalFailures &&
      basicValidation.isValid;

    // Build reasoning
    let reasoning = confidenceValidation.reasoning;
    if (hasCriticalFailures) {
      const criticalChecks = reasonablenessChecks
        .filter(c => !c.passed && c.severity === 'critical')
        .map(c => c.checkName);
      reasoning += `. Critical issues found: ${criticalChecks.join(', ')}`;
    }

    return {
      ...basicValidation,
      confidenceLevel: confidenceValidation.confidenceLevel,
      requiresManualReview,
      reasonablenessChecks,
      shouldAutoApprove,
      reasoning
    };
  }

  /**
   * Task 5.3: Add prescription to manual review queue
   * @param calculationId - ID of the calculation audit record
   * @param validationResult - Extended validation result
   * @param prescriptionText - Original prescription text
   * @param userId - User ID (optional)
   * @returns ID of created review queue item
   */
  async addToReviewQueue(
    calculationId: string,
    validationResult: ExtendedValidationResult,
    prescriptionText: string,
    userId?: string
  ): Promise<string> {
    // Determine priority based on severity
    let priority: 'low' | 'medium' | 'high' = 'medium';

    const hasCritical = validationResult.reasonablenessChecks.some(
      c => !c.passed && c.severity === 'critical'
    );
    const hasWarnings = validationResult.reasonablenessChecks.some(
      c => !c.passed && c.severity === 'warning'
    );

    if (hasCritical) {
      priority = 'high';
    } else if (validationResult.confidenceLevel === 'low') {
      priority = 'high';
    } else if (validationResult.confidenceLevel === 'medium' || hasWarnings) {
      priority = 'medium';
    } else {
      priority = 'low';
    }

    // Build notes with validation details
    const notes = this.buildReviewNotes(validationResult);

    // Create review queue item
    const reviewItem = await createReviewQueueItem({
      calculationId,
      priority,
      notes,
      status: 'pending'
    });

    // Log to audit
    await this.audit.logValidationWarning(
      prescriptionText,
      `Added to manual review queue (priority: ${priority})`,
      { userId }
    );

    console.log(`[Validation] Added to review queue: ${reviewItem.id} (priority: ${priority})`);

    return reviewItem.id;
  }

  /**
   * Build detailed notes for manual review queue
   */
  private buildReviewNotes(validation: ExtendedValidationResult): string {
    const notes: string[] = [];

    notes.push(`Confidence Level: ${validation.confidenceLevel} (${validation.reasoning})`);
    notes.push('');

    if (validation.errors.length > 0) {
      notes.push('Validation Errors:');
      validation.errors.forEach(error => {
        notes.push(`  - ${error.field}: ${error.message}`);
      });
      notes.push('');
    }

    const failedChecks = validation.reasonablenessChecks.filter(c => !c.passed);
    if (failedChecks.length > 0) {
      notes.push('Failed Reasonableness Checks:');
      failedChecks.forEach(check => {
        notes.push(`  - ${check.checkName} (${check.severity}): ${check.message}`);
      });
      notes.push('');
    }

    const warningChecks = validation.reasonablenessChecks.filter(
      c => c.passed && c.severity === 'warning'
    );
    if (warningChecks.length > 0) {
      notes.push('Warnings:');
      warningChecks.forEach(check => {
        notes.push(`  - ${check.checkName}: ${check.message}`);
      });
    }

    return notes.join('\n');
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
