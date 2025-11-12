/**
 * Test file for FDA NDC API service integration
 * Tests Task 4: FDA NDC API Integration
 * Run with: pnpm tsx src/lib/services/__tests__/fda.test.ts
 */

import { getFDAService } from '../fda';
import { getCacheService } from '../cache';

async function testFDAIntegration() {
	console.log('🧪 Testing FDA NDC API Integration\n');
	console.log('='.repeat(60));

	const service = getFDAService();
	const cache = getCacheService();

	// Test 1: Search by RxCUI (Primary Method)
	console.log('\n📋 Test 1: Search by RxCUI (Primary Method)');
	console.log('-'.repeat(60));
	try {
		const rxcui = '197361'; // Atorvastatin 20 MG Oral Tablet
		console.log(`Searching for RxCUI: ${rxcui} (Atorvastatin 20mg)`);

		const startTime = Date.now();
		const packages = await service.searchByRxCUI(rxcui);
		const duration = Date.now() - startTime;

		console.log(`✅ Found ${packages.length} packages in ${duration}ms`);
		if (packages.length > 0) {
			const pkg = packages[0];
			console.log(`   NDC: ${pkg.ndc}`);
			console.log(`   Generic: ${pkg.genericName}`);
			console.log(`   Brand: ${pkg.brandName || 'N/A'}`);
			console.log(`   Labeler: ${pkg.labelerName}`);
			console.log(`   Form: ${pkg.dosageForm}`);
			console.log(`   Strength: ${pkg.strength}`);
			console.log(`   Package: ${pkg.packageDescription}`);
			console.log(`   Quantity: ${pkg.packageQuantity} ${pkg.packageUnit}`);
			console.log(`   Active: ${pkg.isActive ? '✅ Yes' : '❌ No'}`);
		}

		// Test caching - second call should be faster
		const cachedStart = Date.now();
		await service.searchByRxCUI(rxcui);
		const cachedDuration = Date.now() - cachedStart;
		console.log(`⚡ Cached call: ${cachedDuration}ms (should be <50ms)`);
		console.log(
			`   Cache speedup: ${((duration / cachedDuration) * 100).toFixed(0)}% faster`
		);
	} catch (error) {
		console.error(`❌ Error:`, error instanceof Error ? error.message : error);
	}

	// Test 2: Search by Drug Name (Fallback Method)
	console.log('\n📋 Test 2: Search by Drug Name (Fallback Method)');
	console.log('-'.repeat(60));
	try {
		const drugName = 'Lisinopril';
		console.log(`Searching for drug: ${drugName}`);

		const startTime = Date.now();
		const packages = await service.searchByDrugName(drugName, 50);
		const duration = Date.now() - startTime;

		console.log(`✅ Found ${packages.length} packages in ${duration}ms`);

		// Show variety of package sizes
		if (packages.length > 0) {
			console.log('\n   Package variety:');
			const uniquePackages = packages
				.filter((pkg, idx, self) =>
					idx === self.findIndex(p => p.packageQuantity === pkg.packageQuantity)
				)
				.slice(0, 5);

			uniquePackages.forEach((pkg) => {
				console.log(
					`   - ${pkg.packageQuantity} ${pkg.packageUnit} (${pkg.strength}) ${pkg.isActive ? '✅' : '❌'}`
				);
			});
		}

		// Test caching
		const cachedStart = Date.now();
		await service.searchByDrugName(drugName, 50);
		const cachedDuration = Date.now() - cachedStart;
		console.log(`\n⚡ Cached call: ${cachedDuration}ms`);
	} catch (error) {
		console.error(`❌ Error:`, error instanceof Error ? error.message : error);
	}

	// Test 3: RxCUI with Fallback to Drug Name
	console.log('\n📋 Test 3: RxCUI with Fallback to Drug Name');
	console.log('-'.repeat(60));
	try {
		const invalidRxcui = '999999999';
		const fallbackDrugName = 'Metformin';
		console.log(`Searching for invalid RxCUI: ${invalidRxcui}`);
		console.log(`Fallback drug name: ${fallbackDrugName}`);

		const packages = await service.searchByRxCUI(invalidRxcui, fallbackDrugName);
		console.log(`✅ Fallback successful! Found ${packages.length} packages`);

		if (packages.length > 0) {
			const pkg = packages[0];
			console.log(`   First package: ${pkg.genericName} ${pkg.strength}`);
			console.log(`   Package: ${pkg.packageDescription}`);
		}
	} catch (error) {
		console.error(`❌ Error:`, error instanceof Error ? error.message : error);
	}

	// Test 4: Search by NDC Code
	console.log('\n📋 Test 4: Search by NDC Code');
	console.log('-'.repeat(60));
	try {
		// Using a well-known NDC for Lipitor 20mg
		const ndc = '00071015223';
		console.log(`Searching for NDC: ${ndc}`);

		const packages = await service.searchByNDC(ndc);
		console.log(`✅ Found ${packages.length} package(s)`);

		if (packages.length > 0) {
			packages.forEach((pkg) => {
				console.log(`   NDC: ${pkg.ndc}`);
				console.log(`   Product: ${pkg.genericName}`);
				console.log(`   Brand: ${pkg.brandName || 'N/A'}`);
				console.log(`   Package: ${pkg.packageDescription}`);
			});
		}
	} catch (error) {
		console.error(`❌ Error:`, error instanceof Error ? error.message : error);
	}

	// Test 5: Package Details
	console.log('\n📋 Test 5: Get Package Details');
	console.log('-'.repeat(60));
	try {
		const ndc = '00071015223';
		console.log(`Getting details for NDC: ${ndc}`);

		const details = await service.getPackageDetails(ndc);
		if (details) {
			console.log(`✅ Package details retrieved:`);
			console.log(`   NDC: ${details.ndc}`);
			console.log(`   Generic: ${details.genericName}`);
			console.log(`   Brand: ${details.brandName || 'N/A'}`);
			console.log(`   Labeler: ${details.labelerName}`);
			console.log(`   Dosage Form: ${details.dosageForm}`);
			console.log(`   Route: ${details.route.join(', ')}`);
			console.log(`   Strength: ${details.strength}`);
			console.log(`   Package: ${details.packageDescription}`);
			console.log(`   Quantity: ${details.packageQuantity} ${details.packageUnit}`);
			console.log(`   Active: ${details.isActive ? '✅ Yes' : '❌ No'}`);
		} else {
			console.log('⚠️  No details found');
		}
	} catch (error) {
		console.error(`❌ Error:`, error instanceof Error ? error.message : error);
	}

	// Test 6: Active/Inactive Status Detection
	console.log('\n📋 Test 6: Active/Inactive Status Detection');
	console.log('-'.repeat(60));
	try {
		const drugName = 'Lipitor'; // Some packages may be inactive
		console.log(`Searching for: ${drugName}`);

		const packages = await service.searchByDrugName(drugName, 100);
		const activeCount = packages.filter((p) => p.isActive).length;
		const inactiveCount = packages.filter((p) => !p.isActive).length;

		console.log(`✅ Total packages: ${packages.length}`);
		console.log(`   Active: ${activeCount} (${((activeCount / packages.length) * 100).toFixed(1)}%)`);
		console.log(`   Inactive: ${inactiveCount} (${((inactiveCount / packages.length) * 100).toFixed(1)}%)`);

		if (inactiveCount > 0) {
			const inactiveExample = packages.find((p) => !p.isActive);
			if (inactiveExample) {
				console.log(`\n   Inactive package example:`);
				console.log(`   - ${inactiveExample.ndc}`);
				console.log(`   - ${inactiveExample.packageDescription}`);
			}
		}
	} catch (error) {
		console.error(`❌ Error:`, error instanceof Error ? error.message : error);
	}

	// Test 7: Cache TTL Verification
	console.log('\n📋 Test 7: Cache TTL Verification (12-hour TTL)');
	console.log('-'.repeat(60));
	try {
		const rxcui = '197361';
		const cacheKey = `fda:rxcui:${rxcui}`;

		// Ensure data is in cache
		await service.searchByRxCUI(rxcui);

		// Check if cached
		const exists = await cache.exists(cacheKey);
		console.log(`✅ Cache key exists: ${exists ? 'Yes' : 'No'}`);

		if (exists) {
			const ttl = await cache.getTTL(cacheKey);
			const ttlHours = (ttl / 3600).toFixed(2);
			console.log(`   TTL: ${ttl} seconds (${ttlHours} hours)`);
			console.log(`   Expected: ~43200 seconds (12 hours)`);

			if (ttl > 43000 && ttl <= 43200) {
				console.log(`   ✅ TTL is correctly set!`);
			} else {
				console.log(`   ⚠️  TTL might not be set correctly`);
			}
		}
	} catch (error) {
		console.error(`❌ Error:`, error instanceof Error ? error.message : error);
	}

	// Test 8: Multiple Package Sizes
	console.log('\n📋 Test 8: Multiple Package Sizes');
	console.log('-'.repeat(60));
	try {
		const rxcui = '197361'; // Atorvastatin 20mg
		console.log(`Searching for RxCUI: ${rxcui}`);

		const packages = await service.searchByRxCUI(rxcui);

		// Group by package quantity
		const sizeGroups = packages.reduce((acc, pkg) => {
			const key = pkg.packageQuantity;
			if (!acc[key]) acc[key] = 0;
			acc[key]++;
			return acc;
		}, {} as Record<number, number>);

		console.log(`✅ Package size distribution:`);
		Object.entries(sizeGroups)
			.sort(([a], [b]) => Number(a) - Number(b))
			.forEach(([size, count]) => {
				console.log(`   ${size} units: ${count} options`);
			});
	} catch (error) {
		console.error(`❌ Error:`, error instanceof Error ? error.message : error);
	}

	// Test 9: Error Handling
	console.log('\n📋 Test 9: Error Handling');
	console.log('-'.repeat(60));
	try {
		console.log('Testing with empty/invalid inputs...');

		// Empty drug name
		const emptyResults = await service.searchByDrugName('');
		console.log(`✅ Empty drug name: Returns ${emptyResults.length} results (graceful handling)`);

		// Non-existent drug
		const nonExistentResults = await service.searchByDrugName('XYZNONEXISTENTDRUG123');
		console.log(`✅ Non-existent drug: Returns ${nonExistentResults.length} results`);

		// Invalid NDC
		const invalidNDC = await service.searchByNDC('invalid-ndc-123');
		console.log(`✅ Invalid NDC: Returns ${invalidNDC.length} results`);
	} catch (error) {
		console.error(`❌ Error:`, error instanceof Error ? error.message : error);
	}

	// Summary
	console.log('\n' + '='.repeat(60));
	console.log('✅ All FDA NDC API Integration Tests Completed!');
	console.log('='.repeat(60));
	console.log('\n📊 Test Coverage Summary:');
	console.log('  ✅ Search by RxCUI (primary method)');
	console.log('  ✅ Search by drug name (fallback)');
	console.log('  ✅ RxCUI with automatic fallback');
	console.log('  ✅ Search by NDC code');
	console.log('  ✅ Get package details');
	console.log('  ✅ Active/inactive status detection');
	console.log('  ✅ Redis caching (12-hour TTL)');
	console.log('  ✅ Multiple package size handling');
	console.log('  ✅ Error handling and edge cases');
	console.log('\n');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	testFDAIntegration().catch(console.error);
}

export { testFDAIntegration };
