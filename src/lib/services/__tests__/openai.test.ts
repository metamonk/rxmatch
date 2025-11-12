/**
 * Test file for OpenAI service integration
 * Run with: pnpm test or node --loader tsx src/lib/services/__tests__/openai.test.ts
 */

import { OpenAIService } from '../openai';
import { getValidationService } from '../validation';
import type { MedicationInput } from '$lib/types';

async function testOpenAIIntegration() {
  console.log('🧪 Testing OpenAI Integration\n');

  const service = new OpenAIService();
  const validator = getValidationService();

  // Test cases
  const testCases: Array<{ name: string; input: MedicationInput }> = [
    {
      name: 'Test 1: Simple prescription',
      input: {
        drugName: 'Lisinopril',
        strength: '10mg',
        form: 'tablet',
        quantity: 30,
        sig: 'Take 1 tablet by mouth daily'
      }
    },
    {
      name: 'Test 2: Spelling error',
      input: {
        drugName: 'Lipiter', // Should correct to Lipitor
        strength: '20mg',
        form: 'tablet',
        quantity: 90
      }
    },
    {
      name: 'Test 3: Complex SIG',
      input: {
        drugName: 'Metformin',
        strength: '500mg',
        form: 'tablet',
        sig: 'Take 2 tablets twice daily with meals',
        daysSupply: 30
      }
    }
  ];

  for (const testCase of testCases) {
    try {
      console.log(`\n📋 ${testCase.name}`);
      console.log(`Input: ${testCase.input.drugName} ${testCase.input.strength || ''}`);

      const startTime = Date.now();
      const result = await service.normalizeMedication(testCase.input);
      const duration = Date.now() - startTime;

      console.log(`✅ Normalized in ${duration}ms:`);
      console.log(`   Drug: ${result.drugName}`);
      console.log(`   Strength: ${result.strength}`);
      console.log(`   Form: ${result.form}`);
      console.log(`   Quantity: ${result.quantity}`);
      if (result.sig) console.log(`   SIG: ${result.sig}`);

      // Test caching - second call should be faster
      const cachedStart = Date.now();
      await service.normalizeMedication(testCase.input);
      const cachedDuration = Date.now() - cachedStart;
      console.log(`⚡ Cached call: ${cachedDuration}ms`);

    } catch (error) {
      console.error(`❌ Error:`, error instanceof Error ? error.message : error);
    }
  }

  console.log('\n\n🧪 Testing Free-text Prescription Parsing\n');

  const freeTextTests = [
    'Atorvastatin 20mg tablets, take one daily for 90 days',
    'Amoxicillin 500 mg capsules, 1 capsule three times daily, #21',
    'Metoprolol 25mg tab, take 1 tablet BID'
  ];

  for (const text of freeTextTests) {
    try {
      console.log(`\n📋 Input: "${text}"`);

      const parsed = await service.parsePrescription(text);
      const validation = validator.validatePrescription(parsed);

      console.log(`✅ Parsed successfully:`);
      console.log(`   Drug: ${parsed.drugName}`);
      console.log(`   Strength: ${parsed.strength}`);
      console.log(`   Form: ${parsed.form}`);
      console.log(`   Quantity: ${parsed.quantity}`);
      console.log(`   Confidence: ${(parsed.confidence * 100).toFixed(1)}%`);

      console.log(`\n🔍 Validation: ${validation.isValid ? '✅ PASS' : '❌ FAIL'}`);
      if (validation.errors.length > 0) {
        console.log('   Errors:', validation.errors);
      }
      if (validation.warnings && validation.warnings.length > 0) {
        console.log('   Warnings:', validation.warnings);
      }
    } catch (error) {
      console.error(`❌ Error:`, error instanceof Error ? error.message : error);
    }
  }

  console.log('\n\n✅ All tests completed!\n');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testOpenAIIntegration().catch(console.error);
}

export { testOpenAIIntegration };
