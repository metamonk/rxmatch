/**
 * Mock data for UI development
 * This allows frontend development without backend services
 */

import type { PrescriptionParse } from '$lib/types/prescription';
import type { NDCPackage, PackageRecommendation, CalculationResult } from '$lib/types/medication';
import { getPackageSelectionService } from '$lib/services/packageSelection';

export const mockPrescriptionParse: PrescriptionParse = {
  drugName: 'Lisinopril',
  strength: '10mg',
  form: 'tablet',
  quantity: 90,
  sig: 'Take 1 tablet by mouth daily',
  daysSupply: 90,
  confidence: 0.98,
  normalizations: {
    originalDrugName: 'Lisinopril',
    spellingCorrections: []
  }
};

export const mockPrescriptionParseWithCorrections: PrescriptionParse = {
  drugName: 'Metformin',
  strength: '500mg',
  form: 'tablet',
  quantity: 60,
  sig: 'Take 1 tablet twice daily with meals',
  daysSupply: 30,
  confidence: 0.95,
  normalizations: {
    originalDrugName: 'Metfromin',
    spellingCorrections: ['Metformin (corrected from Metfromin)']
  }
};

export const mockNDCPackages: NDCPackage[] = [
  {
    ndc: '0378-0335-93',
    productNdc: '0378-0335',
    genericName: 'Lisinopril',
    labelerName: 'Mylan Pharmaceuticals Inc.',
    dosageForm: 'TABLET',
    route: ['ORAL'],
    strength: '10mg',
    packageDescription: '90 TABLET in 1 BOTTLE',
    packageQuantity: 90,
    packageUnit: 'TABLET',
    isActive: true
  },
  {
    ndc: '0378-0335-01',
    productNdc: '0378-0335',
    genericName: 'Lisinopril',
    labelerName: 'Mylan Pharmaceuticals Inc.',
    dosageForm: 'TABLET',
    route: ['ORAL'],
    strength: '10mg',
    packageDescription: '100 TABLET in 1 BOTTLE',
    packageQuantity: 100,
    packageUnit: 'TABLET',
    isActive: true
  },
  {
    ndc: '0378-0335-05',
    productNdc: '0378-0335',
    genericName: 'Lisinopril',
    labelerName: 'Mylan Pharmaceuticals Inc.',
    dosageForm: 'TABLET',
    route: ['ORAL'],
    strength: '10mg',
    packageDescription: '500 TABLET in 1 BOTTLE',
    packageQuantity: 500,
    packageUnit: 'TABLET',
    isActive: true
  },
  {
    ndc: '68180-0514-01',
    productNdc: '68180-0514',
    genericName: 'Lisinopril',
    labelerName: 'Lupin Pharmaceuticals, Inc.',
    dosageForm: 'TABLET',
    route: ['ORAL'],
    strength: '10mg',
    packageDescription: '30 TABLET in 1 BOTTLE',
    packageQuantity: 30,
    packageUnit: 'TABLET',
    isActive: true
  },
  {
    ndc: '12345-6789-01',
    productNdc: '12345-6789',
    genericName: 'Lisinopril',
    labelerName: 'Example Pharma (Inactive)',
    dosageForm: 'TABLET',
    route: ['ORAL'],
    strength: '10mg',
    packageDescription: '90 TABLET in 1 BOTTLE',
    packageQuantity: 90,
    packageUnit: 'TABLET',
    isActive: false
  }
];

/**
 * Generate package recommendations using the package selection algorithm
 */
function generatePackageRecommendations(
  quantity: number,
  packages: NDCPackage[]
): PackageRecommendation[] {
  const service = getPackageSelectionService();

  try {
    const selection = service.selectOptimalPackages(quantity, packages);
    return service.generateRecommendations(selection, quantity);
  } catch (error) {
    console.warn('Failed to generate recommendations with algorithm:', error);
    // Fallback to simple recommendations
    return packages.map(pkg => ({
      ndc: pkg.ndc,
      packageDescription: pkg.packageDescription,
      quantityNeeded: quantity,
      packagesRequired: Math.ceil(quantity / pkg.packageQuantity),
      totalUnits: Math.ceil(quantity / pkg.packageQuantity) * pkg.packageQuantity,
      overage: (Math.ceil(quantity / pkg.packageQuantity) * pkg.packageQuantity) - quantity,
      costEfficiency: 'acceptable' as const,
      labelerName: pkg.labelerName,
      brandName: pkg.brandName
    }));
  }
}

export const mockPackageRecommendations: PackageRecommendation[] =
  generatePackageRecommendations(90, mockNDCPackages);

export const mockCalculationResult: CalculationResult = {
  input: {
    drugName: 'Lisinopril',
    strength: '10mg',
    form: 'tablet',
    quantity: 90,
    sig: 'Take 1 tablet by mouth daily',
    daysSupply: 90
  },
  normalized: {
    drugName: 'Lisinopril',
    strength: '10mg',
    form: 'tablet',
    quantity: 90
  },
  rxcui: '314076',
  ndcPackages: mockNDCPackages,
  recommendations: mockPackageRecommendations,
  warnings: [
    'Some NDC packages may be inactive. Please verify before dispensing.',
    'Package 0378-0335-05 (500 tablets) may result in significant overage.'
  ]
};

export const mockCalculationResultLowConfidence: CalculationResult = {
  input: {
    drugName: 'Amoxicilin', // Misspelled
    strength: '500mg',
    form: 'capsule',
    quantity: 30
  },
  normalized: {
    drugName: 'Amoxicillin',
    strength: '500mg',
    form: 'capsule',
    quantity: 30
  },
  rxcui: '308182',
  ndcPackages: [],
  recommendations: [],
  warnings: [
    'Low confidence score (0.75) - please verify prescription details.',
    'Spelling correction applied: Amoxicilin → Amoxicillin',
    'No NDC packages found. This may indicate an issue with the prescription or database availability.'
  ]
};
