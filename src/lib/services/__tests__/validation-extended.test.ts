/**
 * Comprehensive tests for Task 5: Validation and Safety Layer
 * Tests confidence score validation, medical reasonableness checks, and queue integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ValidationService,
  CONFIDENCE_THRESHOLDS,
  type ExtendedValidationResult,
  type ReasonablenessCheckResult
} from '../validation';
import type { PrescriptionParse } from '$lib/types/prescription';

// Mock the database services
vi.mock('$lib/db/services/manualReviewQueue', () => ({
  createReviewQueueItem: vi.fn((data) => Promise.resolve({
    id: 'test-review-id',
    ...data,
    createdAt: new Date(),
    updatedAt: new Date()
  }))
}));

vi.mock('../audit', () => ({
  getAuditService: vi.fn(() => ({
    logValidationWarning: vi.fn(() => Promise.resolve({ success: true }))
  }))
}));

describe('Task 5.1: Confidence Score Validation', () => {
  let service: ValidationService;

  beforeEach(() => {
    service = new ValidationService();
  });

  describe('validateConfidenceScore', () => {
    it('should classify high confidence (≥95%)', () => {
      const result = service.validateConfidenceScore(0.95);
      expect(result.confidenceLevel).toBe('high');
      expect(result.shouldAutoApprove).toBe(true);
      expect(result.requiresManualReview).toBe(false);
      expect(result.reasoning).toContain('High confidence');
      expect(result.reasoning).toContain('95.0%');
    });

    it('should classify good confidence (85-94%)', () => {
      const result = service.validateConfidenceScore(0.87);
      expect(result.confidenceLevel).toBe('good');
      expect(result.shouldAutoApprove).toBe(true);
      expect(result.requiresManualReview).toBe(false);
      expect(result.reasoning).toContain('Good confidence');
      expect(result.reasoning).toContain('87.0%');
    });

    it('should classify medium confidence (75-84%)', () => {
      const result = service.validateConfidenceScore(0.80);
      expect(result.confidenceLevel).toBe('medium');
      expect(result.shouldAutoApprove).toBe(false);
      expect(result.requiresManualReview).toBe(false);
      expect(result.reasoning).toContain('Medium confidence');
      expect(result.reasoning).toContain('manual review recommended');
    });

    it('should classify low confidence (<75%)', () => {
      const result = service.validateConfidenceScore(0.70);
      expect(result.confidenceLevel).toBe('low');
      expect(result.shouldAutoApprove).toBe(false);
      expect(result.requiresManualReview).toBe(true);
      expect(result.reasoning).toContain('Low confidence');
      expect(result.reasoning).toContain('manual review required');
    });
  });

  describe('getConfidenceLevel', () => {
    it('should return correct levels for boundary values', () => {
      expect(service.getConfidenceLevel(0.95)).toBe('high');
      expect(service.getConfidenceLevel(0.949)).toBe('good');
      expect(service.getConfidenceLevel(0.85)).toBe('good');
      expect(service.getConfidenceLevel(0.849)).toBe('medium');
      expect(service.getConfidenceLevel(0.75)).toBe('medium');
      expect(service.getConfidenceLevel(0.749)).toBe('low');
      expect(service.getConfidenceLevel(0.50)).toBe('low');
    });
  });

  describe('shouldRequireManualReview', () => {
    it('should require review for scores below 75%', () => {
      expect(service.shouldRequireManualReview(0.74)).toBe(true);
      expect(service.shouldRequireManualReview(0.50)).toBe(true);
      expect(service.shouldRequireManualReview(0.10)).toBe(true);
    });

    it('should not require review for scores ≥75%', () => {
      expect(service.shouldRequireManualReview(0.75)).toBe(false);
      expect(service.shouldRequireManualReview(0.85)).toBe(false);
      expect(service.shouldRequireManualReview(0.95)).toBe(false);
    });
  });
});

describe('Task 5.2: Medical Reasonableness Checks', () => {
  let service: ValidationService;

  beforeEach(() => {
    service = new ValidationService();
  });

  describe('Days Supply Checks', () => {
    it('should flag days supply > 90 as critical', () => {
      const prescription: PrescriptionParse = {
        drugName: 'Lisinopril',
        strength: '10mg',
        form: 'tablet',
        quantity: 100,
        daysSupply: 120,
        confidence: 0.95
      };

      const checks = service.performReasonablenessChecks(prescription);
      const daysSupplyCheck = checks.find(c => c.checkName === 'days_supply');

      expect(daysSupplyCheck).toBeDefined();
      expect(daysSupplyCheck?.passed).toBe(false);
      expect(daysSupplyCheck?.severity).toBe('critical');
      expect(daysSupplyCheck?.message).toContain('exceeds typical maximum');
    });

    it('should warn for days supply 61-90', () => {
      const prescription: PrescriptionParse = {
        drugName: 'Lisinopril',
        strength: '10mg',
        form: 'tablet',
        quantity: 70,
        daysSupply: 70,
        confidence: 0.95
      };

      const checks = service.performReasonablenessChecks(prescription);
      const daysSupplyCheck = checks.find(c => c.checkName === 'days_supply');

      expect(daysSupplyCheck?.passed).toBe(true);
      expect(daysSupplyCheck?.severity).toBe('warning');
      expect(daysSupplyCheck?.message).toContain('longer than typical');
    });

    it('should pass for normal days supply (1-60)', () => {
      const prescription: PrescriptionParse = {
        drugName: 'Lisinopril',
        strength: '10mg',
        form: 'tablet',
        quantity: 30,
        daysSupply: 30,
        confidence: 0.95
      };

      const checks = service.performReasonablenessChecks(prescription);
      const daysSupplyCheck = checks.find(c => c.checkName === 'days_supply');

      expect(daysSupplyCheck?.passed).toBe(true);
      expect(daysSupplyCheck?.severity).toBe('info');
    });
  });

  describe('Quantity Checks', () => {
    it('should flag abnormally high tablet quantities', () => {
      const prescription: PrescriptionParse = {
        drugName: 'Lisinopril',
        strength: '10mg',
        form: 'tablet',
        quantity: 1500,
        confidence: 0.95
      };

      const checks = service.performReasonablenessChecks(prescription);
      const quantityCheck = checks.find(c => c.checkName === 'quantity');

      expect(quantityCheck?.passed).toBe(false);
      expect(quantityCheck?.severity).toBe('critical');
      expect(quantityCheck?.message).toContain('abnormally high');
    });

    it('should warn for high but reasonable tablet quantities', () => {
      const prescription: PrescriptionParse = {
        drugName: 'Lisinopril',
        strength: '10mg',
        form: 'tablet',
        quantity: 600,
        confidence: 0.95
      };

      const checks = service.performReasonablenessChecks(prescription);
      const quantityCheck = checks.find(c => c.checkName === 'quantity');

      expect(quantityCheck?.passed).toBe(true);
      expect(quantityCheck?.severity).toBe('warning');
      expect(quantityCheck?.message).toContain('high');
    });

    it('should pass for normal quantities', () => {
      const prescription: PrescriptionParse = {
        drugName: 'Lisinopril',
        strength: '10mg',
        form: 'tablet',
        quantity: 90,
        confidence: 0.95
      };

      const checks = service.performReasonablenessChecks(prescription);
      const quantityCheck = checks.find(c => c.checkName === 'quantity');

      expect(quantityCheck?.passed).toBe(true);
      expect(quantityCheck?.severity).toBe('info');
    });

    it('should use different limits for liquid forms', () => {
      const prescription: PrescriptionParse = {
        drugName: 'Amoxicillin',
        strength: '250mg/5ml',
        form: 'suspension',
        quantity: 200,
        confidence: 0.95
      };

      const checks = service.performReasonablenessChecks(prescription);
      const quantityCheck = checks.find(c => c.checkName === 'quantity');

      // 200ml suspension should be fine (liquid limit is 5000ml)
      expect(quantityCheck?.passed).toBe(true);
    });
  });

  describe('Strength Checks', () => {
    it('should warn for unusually high mg strengths', () => {
      const prescription: PrescriptionParse = {
        drugName: 'Test Drug',
        strength: '6000mg',
        form: 'tablet',
        quantity: 30,
        confidence: 0.95
      };

      const checks = service.performReasonablenessChecks(prescription);
      const strengthCheck = checks.find(c => c.checkName === 'strength');

      expect(strengthCheck?.passed).toBe(false);
      expect(strengthCheck?.severity).toBe('warning');
      expect(strengthCheck?.message).toContain('unusually high');
    });

    it('should warn for unusually low mg strengths', () => {
      const prescription: PrescriptionParse = {
        drugName: 'Test Drug',
        strength: '0.05mg',
        form: 'tablet',
        quantity: 30,
        confidence: 0.95
      };

      const checks = service.performReasonablenessChecks(prescription);
      const strengthCheck = checks.find(c => c.checkName === 'strength');

      expect(strengthCheck?.passed).toBe(false);
      expect(strengthCheck?.severity).toBe('warning');
      expect(strengthCheck?.message).toContain('unusually low');
    });

    it('should pass for normal strengths', () => {
      const prescription: PrescriptionParse = {
        drugName: 'Lisinopril',
        strength: '10mg',
        form: 'tablet',
        quantity: 30,
        confidence: 0.95
      };

      const checks = service.performReasonablenessChecks(prescription);
      const strengthCheck = checks.find(c => c.checkName === 'strength');

      expect(strengthCheck?.passed).toBe(true);
      expect(strengthCheck?.severity).toBe('info');
    });
  });

  describe('Route/Form Compatibility Checks', () => {
    it('should flag oral form with topical directions', () => {
      const prescription: PrescriptionParse = {
        drugName: 'Test Drug',
        strength: '10mg',
        form: 'tablet',
        quantity: 30,
        sig: 'Apply topically to affected area twice daily',
        confidence: 0.95
      };

      const checks = service.performReasonablenessChecks(prescription);
      const routeCheck = checks.find(c => c.checkName === 'route_form');

      expect(routeCheck?.passed).toBe(false);
      expect(routeCheck?.severity).toBe('critical');
      expect(routeCheck?.message).toContain('Route mismatch');
    });

    it('should flag topical form with oral directions', () => {
      const prescription: PrescriptionParse = {
        drugName: 'Test Cream',
        strength: '1%',
        form: 'cream',
        quantity: 30,
        sig: 'Take one by mouth twice daily',
        confidence: 0.95
      };

      const checks = service.performReasonablenessChecks(prescription);
      const routeCheck = checks.find(c => c.checkName === 'route_form');

      expect(routeCheck?.passed).toBe(false);
      expect(routeCheck?.severity).toBe('critical');
      expect(routeCheck?.message).toContain('Route mismatch');
    });

    it('should pass for compatible route/form', () => {
      const prescription: PrescriptionParse = {
        drugName: 'Lisinopril',
        strength: '10mg',
        form: 'tablet',
        quantity: 30,
        sig: 'Take one tablet by mouth daily',
        confidence: 0.95
      };

      const checks = service.performReasonablenessChecks(prescription);
      const routeCheck = checks.find(c => c.checkName === 'route_form');

      expect(routeCheck?.passed).toBe(true);
      expect(routeCheck?.severity).toBe('info');
    });
  });
});

describe('Task 5: Extended Validation Integration', () => {
  let service: ValidationService;

  beforeEach(() => {
    service = new ValidationService();
  });

  describe('validatePrescriptionExtended', () => {
    it('should auto-approve high confidence with no issues', () => {
      const prescription: PrescriptionParse = {
        drugName: 'Lisinopril',
        strength: '10mg',
        form: 'tablet',
        quantity: 30,
        daysSupply: 30,
        sig: 'Take one tablet by mouth daily',
        confidence: 0.96
      };

      const result = service.validatePrescriptionExtended(prescription);

      expect(result.confidenceLevel).toBe('high');
      expect(result.shouldAutoApprove).toBe(true);
      expect(result.requiresManualReview).toBe(false);
      expect(result.isValid).toBe(true);
    });

    it('should not auto-approve if critical reasonableness checks fail', () => {
      const prescription: PrescriptionParse = {
        drugName: 'Lisinopril',
        strength: '10mg',
        form: 'tablet',
        quantity: 30,
        daysSupply: 150, // Critical: exceeds 90 days
        sig: 'Take one tablet by mouth daily',
        confidence: 0.96
      };

      const result = service.validatePrescriptionExtended(prescription);

      expect(result.confidenceLevel).toBe('high');
      expect(result.shouldAutoApprove).toBe(false);
      expect(result.requiresManualReview).toBe(true);
      expect(result.reasoning).toContain('Critical issues found');
    });

    it('should require review for low confidence', () => {
      const prescription: PrescriptionParse = {
        drugName: 'Lisinopril',
        strength: '10mg',
        form: 'tablet',
        quantity: 30,
        confidence: 0.70
      };

      const result = service.validatePrescriptionExtended(prescription);

      expect(result.confidenceLevel).toBe('low');
      expect(result.requiresManualReview).toBe(true);
      expect(result.shouldAutoApprove).toBe(false);
    });

    it('should include all reasonableness checks in result', () => {
      const prescription: PrescriptionParse = {
        drugName: 'Lisinopril',
        strength: '10mg',
        form: 'tablet',
        quantity: 30,
        daysSupply: 30,
        sig: 'Take one tablet by mouth daily',
        confidence: 0.90
      };

      const result = service.validatePrescriptionExtended(prescription);

      expect(result.reasonablenessChecks).toHaveLength(4);
      expect(result.reasonablenessChecks.map(c => c.checkName)).toContain('days_supply');
      expect(result.reasonablenessChecks.map(c => c.checkName)).toContain('quantity');
      expect(result.reasonablenessChecks.map(c => c.checkName)).toContain('strength');
      expect(result.reasonablenessChecks.map(c => c.checkName)).toContain('route_form');
    });
  });
});

describe('Task 5.3: Manual Review Queue Integration', () => {
  let service: ValidationService;

  beforeEach(() => {
    service = new ValidationService();
    vi.clearAllMocks();
  });

  describe('addToReviewQueue', () => {
    it('should add low confidence prescription with high priority', async () => {
      const { createReviewQueueItem } = await import('$lib/db/services/manualReviewQueue');

      const prescription: PrescriptionParse = {
        drugName: 'Lisinopril',
        strength: '10mg',
        form: 'tablet',
        quantity: 30,
        confidence: 0.70
      };

      const validation = service.validatePrescriptionExtended(prescription);
      const reviewId = await service.addToReviewQueue(
        'calc-123',
        validation,
        'Lisinopril 10mg #30',
        'user-123'
      );

      expect(reviewId).toBe('test-review-id');
      expect(createReviewQueueItem).toHaveBeenCalledWith(
        expect.objectContaining({
          calculationId: 'calc-123',
          priority: 'high',
          status: 'pending'
        })
      );
    });

    it('should add prescription with critical issues with high priority', async () => {
      const { createReviewQueueItem } = await import('$lib/db/services/manualReviewQueue');

      const prescription: PrescriptionParse = {
        drugName: 'Lisinopril',
        strength: '10mg',
        form: 'tablet',
        quantity: 2000, // Critical: too high
        confidence: 0.95
      };

      const validation = service.validatePrescriptionExtended(prescription);
      const reviewId = await service.addToReviewQueue(
        'calc-456',
        validation,
        'Lisinopril 10mg #2000',
        'user-123'
      );

      expect(createReviewQueueItem).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'high'
        })
      );
    });

    it('should add medium confidence prescription with medium priority', async () => {
      const { createReviewQueueItem } = await import('$lib/db/services/manualReviewQueue');

      const prescription: PrescriptionParse = {
        drugName: 'Lisinopril',
        strength: '10mg',
        form: 'tablet',
        quantity: 30,
        confidence: 0.80
      };

      const validation = service.validatePrescriptionExtended(prescription);
      await service.addToReviewQueue(
        'calc-789',
        validation,
        'Lisinopril 10mg #30',
        'user-123'
      );

      expect(createReviewQueueItem).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'medium'
        })
      );
    });

    it('should include detailed notes in queue item', async () => {
      const { createReviewQueueItem } = await import('$lib/db/services/manualReviewQueue');

      const prescription: PrescriptionParse = {
        drugName: 'Lisinopril',
        strength: '10mg',
        form: 'tablet',
        quantity: 30,
        daysSupply: 120,
        confidence: 0.70
      };

      const validation = service.validatePrescriptionExtended(prescription);
      await service.addToReviewQueue(
        'calc-999',
        validation,
        'Lisinopril 10mg #30',
        'user-123'
      );

      const callArgs = (createReviewQueueItem as any).mock.calls[0][0];
      expect(callArgs.notes).toContain('Confidence Level: low');
      expect(callArgs.notes).toContain('Failed Reasonableness Checks');
    });
  });
});

describe('Edge Cases and Boundary Testing', () => {
  let service: ValidationService;

  beforeEach(() => {
    service = new ValidationService();
  });

  it('should handle missing optional fields gracefully', () => {
    const prescription: PrescriptionParse = {
      drugName: 'Lisinopril',
      strength: '10mg',
      form: 'tablet',
      quantity: 30,
      confidence: 0.95
      // No daysSupply, no sig
    };

    const result = service.validatePrescriptionExtended(prescription);
    expect(result.isValid).toBe(true);
    expect(result.reasonablenessChecks).toBeDefined();
  });

  it('should handle boundary confidence values correctly', () => {
    const testValues = [0.749, 0.75, 0.849, 0.85, 0.949, 0.95];
    const expectedLevels: Array<'low' | 'medium' | 'good' | 'high'> = ['low', 'medium', 'medium', 'good', 'good', 'high'];

    testValues.forEach((value, index) => {
      const result = service.validateConfidenceScore(value);
      expect(result.confidenceLevel).toBe(expectedLevels[index]);
    });
  });

  it('should handle unusual strength formats', () => {
    const prescription: PrescriptionParse = {
      drugName: 'Test Drug',
      strength: 'unknown format',
      form: 'tablet',
      quantity: 30,
      confidence: 0.95
    };

    const checks = service.performReasonablenessChecks(prescription);
    const strengthCheck = checks.find(c => c.checkName === 'strength');

    expect(strengthCheck?.severity).toBe('warning');
    expect(strengthCheck?.message).toContain('Unable to validate');
  });
});
