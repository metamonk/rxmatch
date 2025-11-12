/**
 * Quick test script for RxNorm API integration
 * Run with: node --loader ts-node/esm test-rxnorm.ts
 */

import { getRxNormService } from './src/lib/services/rxnorm';

async function testRxNormIntegration() {
	console.log('🧪 Testing RxNorm API Integration\n');

	const rxnorm = getRxNormService();

	// Test cases with various drug names
	const testCases = [
		{ drugName: 'lisinopril', strength: '10mg', form: 'tablet' },
		{ drugName: 'metformin', strength: '500mg', form: 'tablet' },
		{ drugName: 'atorvastatin', strength: '20mg', form: 'tablet' },
		{ drugName: 'amoxicillin', strength: '500mg', form: 'capsule' },
		{ drugName: 'tylenol', strength: '500mg' } // Brand name test
	];

	for (const testCase of testCases) {
		const { drugName, strength, form } = testCase;
		console.log(`\n🔍 Testing: ${drugName} ${strength || ''} ${form || ''}`);

		try {
			const results = await rxnorm.findRxCUI(drugName, strength, form);

			if (results.length > 0) {
				console.log(`✅ Found ${results.length} prescribable match(es):`);
				results.forEach((result, index) => {
					console.log(
						`   ${index + 1}. RxCUI: ${result.rxcui} | Name: ${result.name} | Type: ${result.tty || 'N/A'}`
					);
				});

				// Test NDC lookup for first result
				const ndcs = await rxnorm.getNDCsForRxCUI(results[0].rxcui);
				console.log(`   📦 Found ${ndcs.length} NDC codes`);
				if (ndcs.length > 0) {
					console.log(`   Sample NDCs: ${ndcs.slice(0, 3).join(', ')}`);
				}
			} else {
				console.log(`❌ No prescribable matches found`);
			}

			// Small delay to be respectful of public API
			await new Promise((resolve) => setTimeout(resolve, 200));
		} catch (error) {
			console.error(`❌ Error: ${error}`);
		}
	}

	console.log('\n✨ RxNorm integration test complete!\n');
}

testRxNormIntegration().catch(console.error);
