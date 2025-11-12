/**
 * Medication and NDC-related type definitions
 */

export interface MedicationInput {
  drugName: string;
  strength?: string;
  form?: string;
  sig?: string;
  quantity?: number;
  daysSupply?: number;
}

export interface NormalizedMedication {
  drugName: string;
  strength: string;
  form: string;
  quantity: number;
  calculatedQuantity?: number;
  sig?: string;
}

export interface RxNormResult {
  rxcui: string;
  name: string;
  synonym?: string;
  tty?: string; // Term type (e.g., SCD, GPCK)
}

export interface NDCPackage {
  ndc: string;
  productNdc: string;
  genericName: string;
  labelerName: string;
  brandName?: string;
  dosageForm: string;
  route: string[];
  strength: string;
  packageDescription: string;
  packageQuantity: number;
  packageUnit: string;
}

export interface CalculationResult {
  input: MedicationInput;
  normalized: NormalizedMedication;
  rxcui?: string;
  ndcPackages: NDCPackage[];
  recommendations: PackageRecommendation[];
  warnings?: string[];
}

export interface PackageRecommendation {
  ndc: string;
  packageDescription: string;
  quantityNeeded: number;
  packagesRequired: number;
  totalUnits: number;
  overage: number;
  costEfficiency: 'optimal' | 'acceptable' | 'wasteful';
  labelerName: string;
  brandName?: string;
}
