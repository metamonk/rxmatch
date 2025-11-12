/**
 * Usage examples for Task 5: Validation and Safety Layer
 * Demonstrates how to use the validation service in the prescription processing pipeline
 */

import { getValidationService } from '../validation';
import { getAuditService } from '../audit';
import type { PrescriptionParse } from '$lib/types/prescription';
import { createCalculationAudit } from '$lib/server/db/services/calculationAudits';

/**
 * Example 1: Basic confidence score validation
 */
export async function example1_BasicConfidenceValidation() {
  const validation = getValidationService();

  // Parse result from OpenAI
  const parsed: PrescriptionParse = {
    drugName: 'Lisinopril',
    strength: '10mg',
    form: 'tablet',
    quantity: 30,
    daysSupply: 30,
    sig: 'Take one tablet by mouth daily',
    confidence: 0.87
  };

  // Validate confidence score
  const result = validation.validateConfidenceScore(parsed.confidence);

  console.log('Confidence Level:', result.confidenceLevel); // 'good'
  console.log('Should Auto-Approve:', result.shouldAutoApprove); // true
  console.log('Requires Manual Review:', result.requiresManualReview); // false
  console.log('Reasoning:', result.reasoning);

  return result;
}

/**
 * Example 2: Medical reasonableness checks
 */
export async function example2_ReasonablenessChecks() {
  const validation = getValidationService();

  const parsed: PrescriptionParse = {
    drugName: 'Lisinopril',
    strength: '10mg',
    form: 'tablet',
    quantity: 600, // High quantity - should trigger warning
    daysSupply: 30,
    confidence: 0.95
  };

  // Perform reasonableness checks
  const checks = validation.performReasonablenessChecks(parsed);

  checks.forEach(check => {
    console.log(`Check: ${check.checkName}`);
    console.log(`  Passed: ${check.passed}`);
    console.log(`  Severity: ${check.severity}`);
    console.log(`  Message: ${check.message}`);
  });

  return checks;
}

/**
 * Example 3: Comprehensive validation with extended result
 */
export async function example3_ComprehensiveValidation() {
  const validation = getValidationService();

  const parsed: PrescriptionParse = {
    drugName: 'Lisinopril',
    strength: '10mg',
    form: 'tablet',
    quantity: 30,
    daysSupply: 30,
    sig: 'Take one tablet by mouth daily',
    confidence: 0.96
  };

  // Run comprehensive validation
  const result = validation.validatePrescriptionExtended(parsed);

  console.log('Validation Result:', {
    isValid: result.isValid,
    confidenceLevel: result.confidenceLevel,
    shouldAutoApprove: result.shouldAutoApprove,
    requiresManualReview: result.requiresManualReview,
    reasoning: result.reasoning,
    reasonablenessChecks: result.reasonablenessChecks.length
  });

  return result;
}

/**
 * Example 4: Full prescription processing pipeline with validation
 */
export async function example4_FullPipeline(
  prescriptionText: string,
  parsedResult: PrescriptionParse,
  userId?: string
) {
  const validation = getValidationService();
  const audit = getAuditService();

  try {
    // Step 1: Run comprehensive validation
    const validationResult = validation.validatePrescriptionExtended(parsedResult);

    console.log('[Pipeline] Validation complete:', validationResult.reasoning);

    // Step 2: Create calculation audit record
    const calculationAudit = await createCalculationAudit({
      userId: userId || null,
      prescriptionText,
      parsedResult: parsedResult as any,
      confidenceScore: parsedResult.confidence,
      status: validationResult.shouldAutoApprove ? 'approved' : 'pending'
    });

    console.log('[Pipeline] Calculation audit created:', calculationAudit.id);

    // Step 3: Add to manual review queue if needed
    if (validationResult.requiresManualReview || !validationResult.shouldAutoApprove) {
      const reviewId = await validation.addToReviewQueue(
        calculationAudit.id,
        validationResult,
        prescriptionText,
        userId
      );

      console.log('[Pipeline] Added to review queue:', reviewId);

      return {
        status: 'pending_review',
        calculationId: calculationAudit.id,
        reviewId,
        validationResult
      };
    }

    // Step 4: Auto-approved - continue with normal processing
    console.log('[Pipeline] Auto-approved - continuing to NDC lookup');

    return {
      status: 'approved',
      calculationId: calculationAudit.id,
      validationResult
    };
  } catch (error) {
    console.error('[Pipeline] Error in validation pipeline:', error);

    // Log error to audit
    await audit.logParsingError(
      prescriptionText,
      error instanceof Error ? error : new Error('Unknown error'),
      { userId }
    );

    throw error;
  }
}

/**
 * Example 5: Handling low confidence prescriptions
 */
export async function example5_LowConfidenceHandling(
  prescriptionText: string,
  userId?: string
) {
  const validation = getValidationService();

  // Simulated low-confidence parse
  const parsed: PrescriptionParse = {
    drugName: 'Unclear medication name',
    strength: '10mg',
    form: 'tablet',
    quantity: 30,
    confidence: 0.65 // Low confidence
  };

  // Run validation
  const result = validation.validatePrescriptionExtended(parsed);

  if (result.requiresManualReview) {
    console.log('[Low Confidence] Prescription requires manual review');
    console.log('Confidence:', parsed.confidence);
    console.log('Level:', result.confidenceLevel);

    // Create audit record
    const calculationAudit = await createCalculationAudit({
      userId: userId || null,
      prescriptionText,
      parsedResult: parsed as any,
      confidenceScore: parsed.confidence,
      status: 'pending'
    });

    // Add to review queue
    const reviewId = await validation.addToReviewQueue(
      calculationAudit.id,
      result,
      prescriptionText,
      userId
    );

    return {
      action: 'manual_review_required',
      reviewId,
      reason: result.reasoning
    };
  }

  return { action: 'continue_processing' };
}

/**
 * Example 6: Handling medical reasonableness failures
 */
export async function example6_ReasonablenessFailure(
  prescriptionText: string,
  userId?: string
) {
  const validation = getValidationService();

  // High confidence but unreasonable quantity
  const parsed: PrescriptionParse = {
    drugName: 'Lisinopril',
    strength: '10mg',
    form: 'tablet',
    quantity: 1500, // Critical: way too high
    daysSupply: 30,
    confidence: 0.96 // High confidence
  };

  // Run validation
  const result = validation.validatePrescriptionExtended(parsed);

  console.log('[Reasonableness] Validation result:', {
    confidenceLevel: result.confidenceLevel,
    shouldAutoApprove: result.shouldAutoApprove,
    requiresManualReview: result.requiresManualReview
  });

  // Even with high confidence, critical reasonableness failures prevent auto-approval
  const criticalFailures = result.reasonablenessChecks.filter(
    c => !c.passed && c.severity === 'critical'
  );

  if (criticalFailures.length > 0) {
    console.log('[Reasonableness] Critical failures detected:');
    criticalFailures.forEach(failure => {
      console.log(`  - ${failure.checkName}: ${failure.message}`);
    });

    // Create audit and add to review queue
    const calculationAudit = await createCalculationAudit({
      userId: userId || null,
      prescriptionText,
      parsedResult: parsed as any,
      confidenceScore: parsed.confidence,
      status: 'pending'
    });

    const reviewId = await validation.addToReviewQueue(
      calculationAudit.id,
      result,
      prescriptionText,
      userId
    );

    return {
      action: 'critical_issues',
      reviewId,
      issues: criticalFailures.map(f => f.message)
    };
  }

  return { action: 'continue_processing' };
}

/**
 * Example 7: Batch validation
 */
export async function example7_BatchValidation() {
  const validation = getValidationService();

  const prescriptions: PrescriptionParse[] = [
    {
      drugName: 'Lisinopril',
      strength: '10mg',
      form: 'tablet',
      quantity: 30,
      confidence: 0.96
    },
    {
      drugName: 'Metformin',
      strength: '500mg',
      form: 'tablet',
      quantity: 180,
      confidence: 0.92
    },
    {
      drugName: 'Atorvastatin',
      strength: '20mg',
      form: 'tablet',
      quantity: 90,
      confidence: 0.88
    }
  ];

  // Validate all prescriptions
  const results = prescriptions.map(p => validation.validatePrescriptionExtended(p));

  // Analyze results
  const autoApproved = results.filter(r => r.shouldAutoApprove).length;
  const needsReview = results.filter(r => r.requiresManualReview).length;

  console.log('[Batch] Results:', {
    total: results.length,
    autoApproved,
    needsReview,
    percentAutoApproved: ((autoApproved / results.length) * 100).toFixed(1) + '%'
  });

  return {
    results,
    summary: {
      total: results.length,
      autoApproved,
      needsReview
    }
  };
}

/**
 * Example 8: Custom confidence thresholds (informational - thresholds are constants)
 */
export function example8_ConfidenceThresholds() {
  // Import the thresholds to show what they are
  const { CONFIDENCE_THRESHOLDS } = require('../validation');

  console.log('[Thresholds] Current confidence thresholds:');
  console.log(`  High (auto-approve): ≥${CONFIDENCE_THRESHOLDS.HIGH * 100}%`);
  console.log(`  Good (auto-approve with warning): ≥${CONFIDENCE_THRESHOLDS.GOOD * 100}%`);
  console.log(`  Medium (review recommended): ≥${CONFIDENCE_THRESHOLDS.MEDIUM * 100}%`);
  console.log(`  Low (review required): <${CONFIDENCE_THRESHOLDS.LOW * 100}%`);

  return CONFIDENCE_THRESHOLDS;
}
