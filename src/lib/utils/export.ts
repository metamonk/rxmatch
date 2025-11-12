/**
 * Export utilities for prescription results
 * Supports JSON and CSV formats
 */

import type { PrescriptionParse } from '$lib/types/prescription';
import type { CalculationResult, NDCPackage, PackageRecommendation } from '$lib/types/medication';

/**
 * Complete export data structure including all relevant information
 */
export interface ExportData {
  prescriptionDetails: PrescriptionParse;
  rxcui?: string;
  ndcPackages?: NDCPackage[];
  recommendations?: PackageRecommendation[];
  warnings?: string[];
  selectedPackage?: {
    ndc: string;
    package: NDCPackage;
    recommendation?: PackageRecommendation;
  };
  metadata: {
    exportedAt: string;
    version: string;
  };
}

/**
 * Flattened structure for CSV export
 */
export interface FlattenedExportRow {
  // Prescription details
  drugName: string;
  strength: string;
  form: string;
  quantity: number;
  sig?: string;
  daysSupply?: number;
  confidence: number;
  originalDrugName?: string;
  spellingCorrections?: string;

  // Package details
  ndc?: string;
  productNdc?: string;
  genericName?: string;
  labelerName?: string;
  brandName?: string;
  dosageForm?: string;
  route?: string;
  packageStrength?: string;
  packageDescription?: string;
  packageQuantity?: number;
  packageUnit?: string;
  isActive?: boolean;

  // Recommendation details
  quantityNeeded?: number;
  packagesRequired?: number;
  totalUnits?: number;
  overage?: number;
  costEfficiency?: string;

  // Metadata
  rxcui?: string;
  warnings?: string;
  exportedAt: string;
}

/**
 * Download a file in the browser
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate a timestamp-based filename
 */
export function generateFilename(prefix: string, extension: string): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
  return `${prefix}_${timestamp}.${extension}`;
}

/**
 * Export prescription results as JSON
 */
export function exportToJSON(data: ExportData): void {
  const jsonContent = JSON.stringify(data, null, 2);
  const filename = generateFilename('rxmatch_results', 'json');
  downloadFile(jsonContent, filename, 'application/json');
}

/**
 * Escape CSV field value
 * Handles special characters: commas, quotes, newlines
 */
export function escapeCSVField(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // If the value contains special characters, wrap in quotes and escape existing quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Convert prescription data to CSV format
 */
export function convertToCSV(rows: FlattenedExportRow[]): string {
  if (rows.length === 0) {
    return '';
  }

  // Get headers from first row
  const headers = Object.keys(rows[0]);

  // Create CSV header row with descriptive names
  const headerMap: Record<string, string> = {
    drugName: 'Drug Name',
    strength: 'Strength',
    form: 'Form',
    quantity: 'Quantity',
    sig: 'Directions (Sig)',
    daysSupply: 'Days Supply',
    confidence: 'Confidence Score',
    originalDrugName: 'Original Drug Name',
    spellingCorrections: 'Spelling Corrections',
    ndc: 'NDC',
    productNdc: 'Product NDC',
    genericName: 'Generic Name',
    labelerName: 'Labeler Name',
    brandName: 'Brand Name',
    dosageForm: 'Dosage Form',
    route: 'Route',
    packageStrength: 'Package Strength',
    packageDescription: 'Package Description',
    packageQuantity: 'Package Quantity',
    packageUnit: 'Package Unit',
    isActive: 'Active Status',
    quantityNeeded: 'Quantity Needed',
    packagesRequired: 'Packages Required',
    totalUnits: 'Total Units',
    overage: 'Overage',
    costEfficiency: 'Cost Efficiency',
    rxcui: 'RxCUI',
    warnings: 'Warnings',
    exportedAt: 'Exported At'
  };

  const csvHeaders = headers.map(h => headerMap[h] || h).join(',');

  // Create CSV rows
  const csvRows = rows.map(row => {
    return headers.map(header => {
      const value = row[header as keyof FlattenedExportRow];
      return escapeCSVField(value);
    }).join(',');
  });

  return [csvHeaders, ...csvRows].join('\n');
}

/**
 * Flatten prescription and package data for CSV export
 */
export function flattenExportData(data: ExportData): FlattenedExportRow[] {
  const rows: FlattenedExportRow[] = [];
  const { prescriptionDetails, rxcui, ndcPackages, recommendations, warnings, metadata } = data;

  // If no packages, create a single row with prescription details only
  if (!ndcPackages || ndcPackages.length === 0) {
    rows.push({
      drugName: prescriptionDetails.drugName,
      strength: prescriptionDetails.strength,
      form: prescriptionDetails.form,
      quantity: prescriptionDetails.quantity,
      sig: prescriptionDetails.sig,
      daysSupply: prescriptionDetails.daysSupply,
      confidence: prescriptionDetails.confidence,
      originalDrugName: prescriptionDetails.normalizations?.originalDrugName,
      spellingCorrections: prescriptionDetails.normalizations?.spellingCorrections?.join('; '),
      rxcui,
      warnings: warnings?.join('; '),
      exportedAt: metadata.exportedAt
    });
    return rows;
  }

  // Create a row for each package
  for (const pkg of ndcPackages) {
    const recommendation = recommendations?.find(r => r.ndc === pkg.ndc);

    rows.push({
      // Prescription details
      drugName: prescriptionDetails.drugName,
      strength: prescriptionDetails.strength,
      form: prescriptionDetails.form,
      quantity: prescriptionDetails.quantity,
      sig: prescriptionDetails.sig,
      daysSupply: prescriptionDetails.daysSupply,
      confidence: prescriptionDetails.confidence,
      originalDrugName: prescriptionDetails.normalizations?.originalDrugName,
      spellingCorrections: prescriptionDetails.normalizations?.spellingCorrections?.join('; '),

      // Package details
      ndc: pkg.ndc,
      productNdc: pkg.productNdc,
      genericName: pkg.genericName,
      labelerName: pkg.labelerName,
      brandName: pkg.brandName,
      dosageForm: pkg.dosageForm,
      route: pkg.route.join('; '),
      packageStrength: pkg.strength,
      packageDescription: pkg.packageDescription,
      packageQuantity: pkg.packageQuantity,
      packageUnit: pkg.packageUnit,
      isActive: pkg.isActive,

      // Recommendation details
      quantityNeeded: recommendation?.quantityNeeded,
      packagesRequired: recommendation?.packagesRequired,
      totalUnits: recommendation?.totalUnits,
      overage: recommendation?.overage,
      costEfficiency: recommendation?.costEfficiency,

      // Metadata
      rxcui,
      warnings: warnings?.join('; '),
      exportedAt: metadata.exportedAt
    });
  }

  return rows;
}

/**
 * Export prescription results as CSV
 */
export function exportToCSV(data: ExportData): void {
  const flattenedData = flattenExportData(data);
  const csvContent = convertToCSV(flattenedData);
  const filename = generateFilename('rxmatch_results', 'csv');
  downloadFile(csvContent, filename, 'text/csv');
}

/**
 * Create export data from prescription parse and optional calculation result
 */
export function createExportData(
  prescriptionParse: PrescriptionParse,
  calculationResult?: CalculationResult,
  selectedNdc?: string
): ExportData {
  const exportData: ExportData = {
    prescriptionDetails: prescriptionParse,
    metadata: {
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    }
  };

  if (calculationResult) {
    exportData.rxcui = calculationResult.rxcui;
    exportData.ndcPackages = calculationResult.ndcPackages;
    exportData.recommendations = calculationResult.recommendations;
    exportData.warnings = calculationResult.warnings;

    // Include selected package if provided
    if (selectedNdc) {
      const selectedPackage = calculationResult.ndcPackages.find(pkg => pkg.ndc === selectedNdc);
      if (selectedPackage) {
        exportData.selectedPackage = {
          ndc: selectedNdc,
          package: selectedPackage,
          recommendation: calculationResult.recommendations.find(r => r.ndc === selectedNdc)
        };
      }
    }
  }

  return exportData;
}

/**
 * Helper function to export parsed prescription only (no packages)
 */
export function exportParsedPrescription(
  prescriptionParse: PrescriptionParse,
  format: 'json' | 'csv'
): void {
  const exportData = createExportData(prescriptionParse);

  if (format === 'json') {
    exportToJSON(exportData);
  } else {
    exportToCSV(exportData);
  }
}

/**
 * Helper function to export full results including packages
 */
export function exportFullResults(
  prescriptionParse: PrescriptionParse,
  calculationResult: CalculationResult,
  format: 'json' | 'csv',
  selectedNdc?: string
): void {
  const exportData = createExportData(prescriptionParse, calculationResult, selectedNdc);

  if (format === 'json') {
    exportToJSON(exportData);
  } else {
    exportToCSV(exportData);
  }
}
