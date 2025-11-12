/**
 * Package Selection Algorithm Tests
 * Task 6: Package Selection Algorithm Development
 *
 * Comprehensive test suite for package selection algorithm
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PackageSelectionService } from '../packageSelection';
import type { NDCPackage } from '$lib/types/medication';

describe('PackageSelectionService', () => {
  let service: PackageSelectionService;

  beforeEach(() => {
    service = new PackageSelectionService();
  });

  // Helper function to create mock packages
  function createMockPackage(
    ndc: string,
    quantity: number,
    unit: string = 'TABLET',
    isActive: boolean = true
  ): NDCPackage {
    return {
      ndc,
      productNdc: ndc.split('-').slice(0, 2).join('-'),
      genericName: 'Test Drug',
      labelerName: 'Test Pharmacy',
      brandName: 'TestBrand',
      dosageForm: 'TABLET',
      route: ['ORAL'],
      strength: '10mg',
      packageDescription: `${quantity} ${unit} in 1 BOTTLE`,
      packageQuantity: quantity,
      packageUnit: unit,
      isActive,
      expirationDate: undefined
    };
  }

  describe('Exact Match Scenarios', () => {
    it('should select exact match when available (90 tablets)', () => {
      const packages = [
        createMockPackage('0001-0001-01', 30),
        createMockPackage('0001-0001-02', 60),
        createMockPackage('0001-0001-03', 90),
        createMockPackage('0001-0001-04', 100)
      ];

      const result = service.selectOptimalPackages(90, packages);

      expect(result.totalUnits).toBe(90);
      expect(result.overfill).toBe(0);
      expect(result.overfillPercentage).toBe(0);
      expect(result.efficiency).toBe(100);
      expect(result.costEfficiency).toBe('optimal');
      expect(result.selectedPackages).toHaveLength(1);
      expect(result.selectedPackages[0].package.packageQuantity).toBe(90);
      expect(result.selectedPackages[0].quantity).toBe(1);
    });

    it('should handle exact match with multiple of same package (180 tablets, 90-packs available)', () => {
      const packages = [
        createMockPackage('0001-0001-01', 30),
        createMockPackage('0001-0001-02', 60),
        createMockPackage('0001-0001-03', 90)
      ];

      const result = service.selectOptimalPackages(180, packages);

      expect(result.totalUnits).toBe(180);
      expect(result.overfill).toBe(0);
      expect(result.overfillPercentage).toBe(0);
      expect(result.efficiency).toBe(100);
    });
  });

  describe('Single Package Overfill Scenarios', () => {
    it('should select smallest package >= quantity (90 tablets, 100-pack available)', () => {
      const packages = [
        createMockPackage('0001-0001-01', 30),
        createMockPackage('0001-0001-02', 60),
        createMockPackage('0001-0001-03', 100)
      ];

      const result = service.selectOptimalPackages(90, packages);

      expect(result.totalUnits).toBe(100);
      expect(result.overfill).toBe(10);
      expect(result.overfillPercentage).toBeCloseTo(11.11, 1);
      expect(result.efficiency).toBeCloseTo(90, 0);
      expect(result.costEfficiency).toBe('acceptable');
      expect(result.selectedPackages).toHaveLength(1);
      expect(result.selectedPackages[0].package.packageQuantity).toBe(100);
    });

    it('should handle high overfill scenario (5 tablets needed, 30-pack available)', () => {
      const packages = [
        createMockPackage('0001-0001-01', 30),
        createMockPackage('0001-0001-02', 60),
        createMockPackage('0001-0001-03', 90)
      ];

      const result = service.selectOptimalPackages(5, packages);

      expect(result.totalUnits).toBe(30);
      expect(result.overfill).toBe(25);
      expect(result.overfillPercentage).toBe(500);
      expect(result.efficiency).toBeCloseTo(16.67, 1);
      expect(result.costEfficiency).toBe('wasteful');
    });
  });

  describe('Multi-Package Combination Scenarios', () => {
    it('should prefer multi-pack combination over single overfill (90 tablets, 30+60 available)', () => {
      const packages = [
        createMockPackage('0001-0001-01', 30),
        createMockPackage('0001-0001-02', 60),
        createMockPackage('0001-0001-03', 100)
      ];

      const result = service.selectOptimalPackages(90, packages);

      // Should prefer 30+60 (exact match) over 100 (10% overfill)
      expect(result.totalUnits).toBe(90);
      expect(result.overfill).toBe(0);
      expect(result.overfillPercentage).toBe(0);
      expect(result.efficiency).toBe(100);
      expect(result.costEfficiency).toBe('optimal');

      // Verify it's using 30+60 combination
      const totalPackageCount = result.selectedPackages.reduce(
        (sum, sp) => sum + sp.quantity,
        0
      );
      expect(totalPackageCount).toBe(2);
    });

    it('should handle 3-package combination (150 tablets with 30+60+60)', () => {
      const packages = [
        createMockPackage('0001-0001-01', 30),
        createMockPackage('0001-0001-02', 60),
        createMockPackage('0001-0001-03', 100)
      ];

      const result = service.selectOptimalPackages(150, packages);

      expect(result.totalUnits).toBe(150);
      expect(result.overfill).toBe(0);
      expect(result.efficiency).toBe(100);
    });

    it('should handle odd quantity with multi-pack (37 tablets)', () => {
      const packages = [
        createMockPackage('0001-0001-01', 30),
        createMockPackage('0001-0001-02', 60),
        createMockPackage('0001-0001-03', 90)
      ];

      const result = service.selectOptimalPackages(37, packages);

      // Should use 60 (single pack with 23 overfill) or 30+30 (23 overfill)
      // Algorithm should pick best option
      expect(result.totalUnits).toBeGreaterThanOrEqual(37);
      expect(result.overfillPercentage).toBeLessThan(100);
    });
  });

  describe('Large Quantity Scenarios', () => {
    it('should handle large quantities efficiently (270 tablets)', () => {
      const packages = [
        createMockPackage('0001-0001-01', 30),
        createMockPackage('0001-0001-02', 60),
        createMockPackage('0001-0001-03', 90),
        createMockPackage('0001-0001-04', 100)
      ];

      const result = service.selectOptimalPackages(270, packages);

      // 3x90 = 270 (exact match)
      expect(result.totalUnits).toBe(270);
      expect(result.overfill).toBe(0);
      expect(result.efficiency).toBe(100);
    });

    it('should handle very large quantities (1000 tablets)', () => {
      const packages = [
        createMockPackage('0001-0001-01', 100),
        createMockPackage('0001-0001-02', 500),
        createMockPackage('0001-0001-03', 1000)
      ];

      const result = service.selectOptimalPackages(1000, packages);

      expect(result.totalUnits).toBe(1000);
      expect(result.overfill).toBe(0);
      expect(result.efficiency).toBe(100);
    });
  });

  describe('Liquid Volume Scenarios', () => {
    it('should handle liquid volumes (150ml)', () => {
      const packages = [
        createMockPackage('0001-0001-01', 100, 'ML'),
        createMockPackage('0001-0001-02', 200, 'ML'),
        createMockPackage('0001-0001-03', 500, 'ML')
      ];

      const result = service.selectOptimalPackages(150, packages);

      expect(result.totalUnits).toBeGreaterThanOrEqual(150);
      expect(result.efficiency).toBeGreaterThan(0);
    });

    it('should handle mixed unit scenarios (filter by most common unit)', () => {
      const packages = [
        createMockPackage('0001-0001-01', 30, 'TABLET'),
        createMockPackage('0001-0001-02', 60, 'TABLET'),
        createMockPackage('0001-0001-03', 90, 'TABLET'),
        createMockPackage('0001-0001-04', 100, 'ML') // Different unit - should be filtered
      ];

      const result = service.selectOptimalPackages(90, packages);

      // Should only use tablets (most common unit)
      expect(result.selectedPackages.every(sp => sp.package.packageUnit === 'TABLET')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle quantity of 1', () => {
      const packages = [
        createMockPackage('0001-0001-01', 30),
        createMockPackage('0001-0001-02', 60)
      ];

      const result = service.selectOptimalPackages(1, packages);

      expect(result.totalUnits).toBe(30);
      expect(result.overfill).toBe(29);
    });

    it('should throw error for quantity of 0', () => {
      const packages = [createMockPackage('0001-0001-01', 30)];

      expect(() => service.selectOptimalPackages(0, packages)).toThrow('Quantity must be positive');
    });

    it('should throw error for negative quantity', () => {
      const packages = [createMockPackage('0001-0001-01', 30)];

      expect(() => service.selectOptimalPackages(-10, packages)).toThrow(
        'Quantity must be positive'
      );
    });

    it('should throw error for empty package list', () => {
      expect(() => service.selectOptimalPackages(90, [])).toThrow(
        'No packages available for selection'
      );
    });

    it('should handle all packages smaller than needed (150 tablets, max 60)', () => {
      const packages = [
        createMockPackage('0001-0001-01', 30),
        createMockPackage('0001-0001-02', 60)
      ];

      const result = service.selectOptimalPackages(150, packages);

      // Should use multiple of largest package
      expect(result.totalUnits).toBeGreaterThanOrEqual(150);
    });

    it('should handle inactive packages when no active available', () => {
      const packages = [
        createMockPackage('0001-0001-01', 30, 'TABLET', false),
        createMockPackage('0001-0001-02', 60, 'TABLET', false),
        createMockPackage('0001-0001-03', 90, 'TABLET', false)
      ];

      const result = service.selectOptimalPackages(90, packages);

      // Should still work with inactive packages
      expect(result.totalUnits).toBe(90);
      expect(result.overfill).toBe(0);
    });

    it('should prefer active packages over inactive when both available', () => {
      const packages = [
        createMockPackage('0001-0001-01', 90, 'TABLET', true), // Active
        createMockPackage('0001-0001-02', 90, 'TABLET', false) // Inactive
      ];

      const result = service.selectOptimalPackages(90, packages);

      expect(result.selectedPackages[0].package.isActive).toBe(true);
    });
  });

  describe('Efficiency Calculations', () => {
    it('should calculate efficiency correctly', () => {
      expect(service.calculateEfficiency(90, 90)).toBe(100);
      expect(service.calculateEfficiency(90, 100)).toBe(90);
      expect(service.calculateEfficiency(90, 120)).toBe(75);
      expect(service.calculateEfficiency(45, 90)).toBe(50);
    });

    it('should calculate overfill correctly', () => {
      const result1 = service.calculateOverfill(90, 100);
      expect(result1.amount).toBe(10);
      expect(result1.percentage).toBeCloseTo(11.11, 1);

      const result2 = service.calculateOverfill(90, 90);
      expect(result2.amount).toBe(0);
      expect(result2.percentage).toBe(0);

      const result3 = service.calculateOverfill(90, 120);
      expect(result3.amount).toBe(30);
      expect(result3.percentage).toBeCloseTo(33.33, 1);
    });
  });

  describe('Cost Efficiency Classification', () => {
    it('should classify as optimal (≥95% efficiency)', () => {
      const packages = [createMockPackage('0001-0001-01', 90)];
      const result = service.selectOptimalPackages(90, packages);
      expect(result.costEfficiency).toBe('optimal');
    });

    it('should classify as acceptable (80-94% efficiency)', () => {
      const packages = [createMockPackage('0001-0001-01', 100)];
      const result = service.selectOptimalPackages(90, packages);
      expect(result.costEfficiency).toBe('acceptable');
    });

    it('should classify as wasteful (<80% efficiency)', () => {
      const packages = [createMockPackage('0001-0001-01', 150)];
      const result = service.selectOptimalPackages(90, packages);
      expect(result.costEfficiency).toBe('wasteful');
    });
  });

  describe('Recommendation Generation', () => {
    it('should generate correct recommendation format', () => {
      const packages = [
        createMockPackage('0001-0001-01', 30),
        createMockPackage('0001-0001-02', 60)
      ];

      const selection = service.selectOptimalPackages(90, packages);
      const recommendations = service.generateRecommendations(selection, 90);

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);

      recommendations.forEach(rec => {
        expect(rec).toHaveProperty('ndc');
        expect(rec).toHaveProperty('packageDescription');
        expect(rec).toHaveProperty('quantityNeeded');
        expect(rec).toHaveProperty('packagesRequired');
        expect(rec).toHaveProperty('totalUnits');
        expect(rec).toHaveProperty('overage');
        expect(rec).toHaveProperty('costEfficiency');
        expect(rec).toHaveProperty('labelerName');
      });
    });
  });

  describe('Algorithm Options', () => {
    it('should respect maxPackages option (1 package max)', () => {
      const packages = [
        createMockPackage('0001-0001-01', 30),
        createMockPackage('0001-0001-02', 60),
        createMockPackage('0001-0001-03', 100)
      ];

      const result = service.selectOptimalPackages(90, packages, { maxPackages: 1 });

      // Should use single 100-pack instead of 30+60
      expect(result.selectedPackages).toHaveLength(1);
      expect(result.selectedPackages[0].package.packageQuantity).toBe(100);
    });

    it('should respect preferFewerPackages option', () => {
      const packages = [
        createMockPackage('0001-0001-01', 30),
        createMockPackage('0001-0001-02', 60),
        createMockPackage('0001-0001-03', 95)
      ];

      const result = service.selectOptimalPackages(90, packages, {
        preferFewerPackages: true
      });

      // With preferFewerPackages, should choose single 95-pack over 30+60
      // if scores are close
      expect(result.totalUnits).toBeGreaterThanOrEqual(90);
    });

    it('should respect maxOverfillPercentage option', () => {
      const packages = [createMockPackage('0001-0001-01', 150)];

      // 150 for 90 = 66.7% overfill - should fail with 50% limit
      expect(() =>
        service.selectOptimalPackages(90, packages, { maxOverfillPercentage: 50 })
      ).toThrow();
    });
  });

  describe('Performance', () => {
    it('should complete selection in reasonable time (<50ms for typical scenario)', () => {
      const packages = [
        createMockPackage('0001-0001-01', 30),
        createMockPackage('0001-0001-02', 60),
        createMockPackage('0001-0001-03', 90),
        createMockPackage('0001-0001-04', 100),
        createMockPackage('0001-0001-05', 120),
        createMockPackage('0001-0001-06', 180)
      ];

      const startTime = Date.now();
      service.selectOptimalPackages(90, packages);
      const endTime = Date.now();

      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(50);
    });

    it('should handle large package lists efficiently (<100ms for 100 packages)', () => {
      const packages: NDCPackage[] = [];
      for (let i = 1; i <= 100; i++) {
        packages.push(createMockPackage(`0001-0001-${String(i).padStart(2, '0')}`, i * 10));
      }

      const startTime = Date.now();
      service.selectOptimalPackages(450, packages);
      const endTime = Date.now();

      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(100);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle common prescription: 30-day supply of daily medication', () => {
      const packages = [
        createMockPackage('0001-0001-01', 30),
        createMockPackage('0001-0001-02', 60),
        createMockPackage('0001-0001-03', 90)
      ];

      const result = service.selectOptimalPackages(30, packages);

      expect(result.totalUnits).toBe(30);
      expect(result.overfill).toBe(0);
      expect(result.efficiency).toBe(100);
    });

    it('should handle 90-day supply (common for mail-order pharmacy)', () => {
      const packages = [
        createMockPackage('0001-0001-01', 30),
        createMockPackage('0001-0001-02', 90),
        createMockPackage('0001-0001-03', 100)
      ];

      const result = service.selectOptimalPackages(90, packages);

      expect(result.totalUnits).toBe(90);
      expect(result.efficiency).toBe(100);
    });

    it('should handle twice-daily medication (180 tablets for 90 days)', () => {
      const packages = [
        createMockPackage('0001-0001-01', 60),
        createMockPackage('0001-0001-02', 90),
        createMockPackage('0001-0001-03', 100),
        createMockPackage('0001-0001-04', 180)
      ];

      const result = service.selectOptimalPackages(180, packages);

      expect(result.totalUnits).toBe(180);
      expect(result.efficiency).toBe(100);
    });
  });
});
