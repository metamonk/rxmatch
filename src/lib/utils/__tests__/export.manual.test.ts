/**
 * Manual test for export functionality
 * Run with: pnpm tsx src/lib/utils/__tests__/export.manual.test.ts
 */

import {
  escapeCSVField,
  convertToCSV,
  flattenExportData,
  createExportData,
  generateFilename,
  type ExportData,
  type FlattenedExportRow
} from '../export';
import type { PrescriptionParse } from '$lib/types/prescription';
import type { CalculationResult, NDCPackage, PackageRecommendation } from '$lib/types/medication';

// Color helpers for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function logSuccess(message: string) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function logError(message: string) {
  console.log(`${colors.red}✗${colors.reset} ${message}`);
}

function logInfo(message: string) {
  console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
}

function logSection(title: string) {
  console.log(`\n${colors.yellow}=== ${title} ===${colors.reset}`);
}

async function runTests() {
  console.log('\n🧪 Testing Export Functionality\n');
  console.log('='.repeat(60));

  let passed = 0;
  let failed = 0;

  // Test 1: escapeCSVField
  logSection('Test 1: CSV Field Escaping');
  try {
    const tests = [
      { input: null, expected: '', name: 'null value' },
      { input: undefined, expected: '', name: 'undefined value' },
      { input: 'simple', expected: 'simple', name: 'simple string' },
      { input: 'Hello, World', expected: '"Hello, World"', name: 'comma in string' },
      { input: 'Say "Hello"', expected: '"Say ""Hello"""', name: 'quotes in string' },
      { input: 'Line 1\nLine 2', expected: '"Line 1\nLine 2"', name: 'newline in string' },
      { input: 123, expected: '123', name: 'number' },
      { input: true, expected: 'true', name: 'boolean' }
    ];

    for (const test of tests) {
      const result = escapeCSVField(test.input);
      if (result === test.expected) {
        logSuccess(`escapeCSVField(${test.name}): "${result}"`);
        passed++;
      } else {
        logError(`escapeCSVField(${test.name}): Expected "${test.expected}", got "${result}"`);
        failed++;
      }
    }
  } catch (error) {
    logError(`escapeCSVField tests failed: ${error}`);
    failed++;
  }

  // Test 2: generateFilename
  logSection('Test 2: Filename Generation');
  try {
    const filename = generateFilename('test', 'json');
    const pattern = /^test_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.json$/;
    if (pattern.test(filename)) {
      logSuccess(`generateFilename: ${filename}`);
      passed++;
    } else {
      logError(`generateFilename: Invalid format: ${filename}`);
      failed++;
    }
  } catch (error) {
    logError(`generateFilename test failed: ${error}`);
    failed++;
  }

  // Test 3: createExportData (prescription only)
  logSection('Test 3: Create Export Data (Prescription Only)');
  try {
    const mockPrescription: PrescriptionParse = {
      drugName: 'Lisinopril',
      strength: '10mg',
      form: 'tablet',
      quantity: 30,
      sig: 'Take 1 tablet daily',
      daysSupply: 30,
      confidence: 0.95
    };

    const exportData = createExportData(mockPrescription);

    if (exportData.prescriptionDetails.drugName === 'Lisinopril') {
      logSuccess('Prescription details correctly included');
      passed++;
    } else {
      logError('Prescription details missing or incorrect');
      failed++;
    }

    if (exportData.metadata.version && exportData.metadata.exportedAt) {
      logSuccess('Metadata correctly included');
      passed++;
    } else {
      logError('Metadata missing or incorrect');
      failed++;
    }
  } catch (error) {
    logError(`createExportData test failed: ${error}`);
    failed++;
  }

  // Test 4: createExportData with calculation result
  logSection('Test 4: Create Export Data (With Packages)');
  try {
    const mockPrescription: PrescriptionParse = {
      drugName: 'Lisinopril',
      strength: '10mg',
      form: 'tablet',
      quantity: 30,
      confidence: 0.95
    };

    const mockPackage: NDCPackage = {
      ndc: '12345-678-90',
      productNdc: '12345-678',
      genericName: 'Lisinopril',
      labelerName: 'Test Pharma',
      dosageForm: 'TABLET',
      route: ['ORAL'],
      strength: '10mg',
      packageDescription: '30 tablets',
      packageQuantity: 30,
      packageUnit: 'tablet',
      isActive: true
    };

    const mockRecommendation: PackageRecommendation = {
      ndc: '12345-678-90',
      packageDescription: '30 tablets',
      quantityNeeded: 30,
      packagesRequired: 1,
      totalUnits: 30,
      overage: 0,
      costEfficiency: 'optimal',
      labelerName: 'Test Pharma'
    };

    const mockCalculationResult: CalculationResult = {
      input: {
        drugName: 'Lisinopril',
        strength: '10mg',
        form: 'tablet',
        quantity: 30
      },
      normalized: {
        drugName: 'Lisinopril',
        strength: '10mg',
        form: 'tablet',
        quantity: 30
      },
      rxcui: 'RXCUI123',
      ndcPackages: [mockPackage],
      recommendations: [mockRecommendation],
      warnings: ['Test warning']
    };

    const exportData = createExportData(mockPrescription, mockCalculationResult);

    if (exportData.rxcui === 'RXCUI123') {
      logSuccess('RxCUI correctly included');
      passed++;
    } else {
      logError('RxCUI missing or incorrect');
      failed++;
    }

    if (exportData.ndcPackages && exportData.ndcPackages.length === 1) {
      logSuccess('NDC packages correctly included');
      passed++;
    } else {
      logError('NDC packages missing or incorrect');
      failed++;
    }

    if (exportData.recommendations && exportData.recommendations.length === 1) {
      logSuccess('Recommendations correctly included');
      passed++;
    } else {
      logError('Recommendations missing or incorrect');
      failed++;
    }
  } catch (error) {
    logError(`createExportData with packages test failed: ${error}`);
    failed++;
  }

  // Test 5: flattenExportData
  logSection('Test 5: Flatten Export Data');
  try {
    const exportData: ExportData = {
      prescriptionDetails: {
        drugName: 'Lisinopril',
        strength: '10mg',
        form: 'tablet',
        quantity: 30,
        confidence: 0.95
      },
      ndcPackages: [
        {
          ndc: '12345-678-90',
          productNdc: '12345-678',
          genericName: 'Lisinopril',
          labelerName: 'Test Pharma',
          dosageForm: 'TABLET',
          route: ['ORAL'],
          strength: '10mg',
          packageDescription: '30 tablets',
          packageQuantity: 30,
          packageUnit: 'tablet',
          isActive: true
        }
      ],
      recommendations: [
        {
          ndc: '12345-678-90',
          packageDescription: '30 tablets',
          quantityNeeded: 30,
          packagesRequired: 1,
          totalUnits: 30,
          overage: 0,
          costEfficiency: 'optimal',
          labelerName: 'Test Pharma'
        }
      ],
      metadata: {
        exportedAt: '2025-01-15T10:00:00Z',
        version: '1.0.0'
      }
    };

    const flattened = flattenExportData(exportData);

    if (flattened.length === 1) {
      logSuccess('Flattened to correct number of rows');
      passed++;
    } else {
      logError(`Expected 1 row, got ${flattened.length}`);
      failed++;
    }

    if (flattened[0].drugName === 'Lisinopril' && flattened[0].ndc === '12345-678-90') {
      logSuccess('Flattened data contains prescription and package info');
      passed++;
    } else {
      logError('Flattened data missing expected fields');
      failed++;
    }

    if (flattened[0].packagesRequired === 1 && flattened[0].costEfficiency === 'optimal') {
      logSuccess('Flattened data contains recommendation info');
      passed++;
    } else {
      logError('Flattened data missing recommendation fields');
      failed++;
    }
  } catch (error) {
    logError(`flattenExportData test failed: ${error}`);
    failed++;
  }

  // Test 6: convertToCSV
  logSection('Test 6: Convert to CSV');
  try {
    const rows: FlattenedExportRow[] = [
      {
        drugName: 'Lisinopril',
        strength: '10mg',
        form: 'tablet',
        quantity: 30,
        confidence: 0.95,
        ndc: '12345-678-90',
        exportedAt: '2025-01-15T10:00:00Z'
      }
    ];

    const csv = convertToCSV(rows);
    const lines = csv.split('\n');

    if (lines.length === 2) {
      logSuccess('CSV has correct number of lines (header + 1 row)');
      passed++;
    } else {
      logError(`Expected 2 lines, got ${lines.length}`);
      failed++;
    }

    if (lines[0].includes('Drug Name') && lines[0].includes('Strength')) {
      logSuccess('CSV header contains expected column names');
      passed++;
    } else {
      logError('CSV header missing expected columns');
      failed++;
    }

    if (lines[1].includes('Lisinopril') && lines[1].includes('10mg')) {
      logSuccess('CSV row contains expected data');
      passed++;
    } else {
      logError('CSV row missing expected data');
      failed++;
    }
  } catch (error) {
    logError(`convertToCSV test failed: ${error}`);
    failed++;
  }

  // Test 7: CSV special character handling
  logSection('Test 7: CSV Special Character Handling');
  try {
    const rows: FlattenedExportRow[] = [
      {
        drugName: 'Test, Drug',
        strength: '10mg',
        form: 'tablet',
        quantity: 30,
        sig: 'Take "one" tablet\ndaily',
        confidence: 0.95,
        exportedAt: '2025-01-15T10:00:00Z'
      }
    ];

    const csv = convertToCSV(rows);

    if (csv.includes('"Test, Drug"')) {
      logSuccess('CSV correctly escapes commas');
      passed++;
    } else {
      logError('CSV failed to escape commas');
      failed++;
    }

    if (csv.includes('"Take ""one"" tablet\ndaily"')) {
      logSuccess('CSV correctly escapes quotes and newlines');
      passed++;
    } else {
      logError('CSV failed to escape quotes and newlines');
      failed++;
    }
  } catch (error) {
    logError(`CSV special character test failed: ${error}`);
    failed++;
  }

  // Summary
  logSection('Test Summary');
  console.log(`Total tests: ${passed + failed}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);

  if (failed === 0) {
    console.log(`\n${colors.green}✓ All tests passed!${colors.reset}\n`);
  } else {
    console.log(`\n${colors.red}✗ Some tests failed${colors.reset}\n`);
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
