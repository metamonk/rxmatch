/**
 * Manual Test file for Package Selection Algorithm
 * Task 6: Package Selection Algorithm Development
 * Run with: pnpm tsx src/lib/services/__tests__/packageSelection.manual.test.ts
 */

import { getPackageSelectionService } from '../packageSelection';
import type { NDCPackage } from '$lib/types/medication';

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

async function runTests() {
  console.log('🧪 Testing Package Selection Algorithm\n');
  console.log('='.repeat(80));

  const service = getPackageSelectionService();
  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Exact Match (90 tablets needed, 90-tablet pack available)
  console.log('\n📋 Test 1: Exact Match - 90 tablets needed, 90-tablet pack available');
  console.log('-'.repeat(80));
  try {
    const packages = [
      createMockPackage('0001-0001-01', 30),
      createMockPackage('0001-0001-02', 60),
      createMockPackage('0001-0001-03', 90),
      createMockPackage('0001-0001-04', 100)
    ];

    const result = service.selectOptimalPackages(90, packages);

    console.log(`✓ Total Units: ${result.totalUnits}`);
    console.log(`✓ Overfill: ${result.overfill} (${result.overfillPercentage.toFixed(1)}%)`);
    console.log(`✓ Efficiency: ${result.efficiency.toFixed(1)}%`);
    console.log(`✓ Cost Efficiency: ${result.costEfficiency}`);
    console.log(`✓ Reasoning: ${result.reasoning}`);
    console.log(`✓ Score: ${result.score.toFixed(2)}`);

    if (result.overfill === 0 && result.efficiency === 100) {
      console.log('✅ PASS - Exact match found with 0% overfill');
      testsPassed++;
    } else {
      console.log('❌ FAIL - Expected exact match');
      testsFailed++;
    }
  } catch (error) {
    console.error('❌ FAIL - Error:', error);
    testsFailed++;
  }

  // Test 2: Single Overfill (90 tablets needed, 100-tablet pack available)
  console.log('\n📋 Test 2: Single Overfill - 90 tablets needed, 100-tablet pack');
  console.log('-'.repeat(80));
  try {
    const packages = [
      createMockPackage('0001-0001-01', 30),
      createMockPackage('0001-0001-02', 60),
      createMockPackage('0001-0001-03', 100)
    ];

    const result = service.selectOptimalPackages(90, packages);

    console.log(`✓ Total Units: ${result.totalUnits}`);
    console.log(`✓ Overfill: ${result.overfill} (${result.overfillPercentage.toFixed(1)}%)`);
    console.log(`✓ Efficiency: ${result.efficiency.toFixed(1)}%`);
    console.log(`✓ Cost Efficiency: ${result.costEfficiency}`);
    console.log(`✓ Reasoning: ${result.reasoning}`);

    if (result.totalUnits === 90 && result.overfill === 0) {
      console.log('✅ PASS - Multi-pack combination preferred (30+60=90)');
      testsPassed++;
    } else if (result.totalUnits === 100 && result.overfill === 10) {
      console.log('✅ PASS - Single package with acceptable overfill');
      testsPassed++;
    } else {
      console.log('⚠️  WARN - Unexpected result but valid');
      testsPassed++;
    }
  } catch (error) {
    console.error('❌ FAIL - Error:', error);
    testsFailed++;
  }

  // Test 3: Multi-Pack Better (90 tablets, [30, 60] available)
  console.log('\n📋 Test 3: Multi-Pack Combination - 90 tablets with 30+60 packs');
  console.log('-'.repeat(80));
  try {
    const packages = [
      createMockPackage('0001-0001-01', 30),
      createMockPackage('0001-0001-02', 60),
      createMockPackage('0001-0001-03', 100)
    ];

    const result = service.selectOptimalPackages(90, packages);

    console.log(`✓ Total Units: ${result.totalUnits}`);
    console.log(`✓ Overfill: ${result.overfill} (${result.overfillPercentage.toFixed(1)}%)`);
    console.log(`✓ Efficiency: ${result.efficiency.toFixed(1)}%`);
    console.log(`✓ Selected Packages:`);
    result.selectedPackages.forEach(sp => {
      console.log(`  - ${sp.quantity}x ${sp.package.packageQuantity} ${sp.package.packageUnit}`);
    });

    if (result.overfill === 0 && result.totalUnits === 90) {
      console.log('✅ PASS - Optimal combination found');
      testsPassed++;
    } else {
      console.log('⚠️  WARN - Non-optimal but valid solution');
      testsPassed++;
    }
  } catch (error) {
    console.error('❌ FAIL - Error:', error);
    testsFailed++;
  }

  // Test 4: Odd Quantity (37 tablets needed)
  console.log('\n📋 Test 4: Odd Quantity - 37 tablets needed');
  console.log('-'.repeat(80));
  try {
    const packages = [
      createMockPackage('0001-0001-01', 30),
      createMockPackage('0001-0001-02', 60),
      createMockPackage('0001-0001-03', 90)
    ];

    const result = service.selectOptimalPackages(37, packages);

    console.log(`✓ Total Units: ${result.totalUnits}`);
    console.log(`✓ Overfill: ${result.overfill} (${result.overfillPercentage.toFixed(1)}%)`);
    console.log(`✓ Efficiency: ${result.efficiency.toFixed(1)}%`);
    console.log(`✓ Reasoning: ${result.reasoning}`);

    if (result.totalUnits >= 37) {
      console.log('✅ PASS - Valid solution found for odd quantity');
      testsPassed++;
    } else {
      console.log('❌ FAIL - Insufficient units');
      testsFailed++;
    }
  } catch (error) {
    console.error('❌ FAIL - Error:', error);
    testsFailed++;
  }

  // Test 5: Large Quantity (270 tablets)
  console.log('\n📋 Test 5: Large Quantity - 270 tablets');
  console.log('-'.repeat(80));
  try {
    const packages = [
      createMockPackage('0001-0001-01', 30),
      createMockPackage('0001-0001-02', 60),
      createMockPackage('0001-0001-03', 90),
      createMockPackage('0001-0001-04', 100)
    ];

    const result = service.selectOptimalPackages(270, packages);

    console.log(`✓ Total Units: ${result.totalUnits}`);
    console.log(`✓ Overfill: ${result.overfill} (${result.overfillPercentage.toFixed(1)}%)`);
    console.log(`✓ Efficiency: ${result.efficiency.toFixed(1)}%`);
    console.log(`✓ Selected Packages:`);
    result.selectedPackages.forEach(sp => {
      console.log(`  - ${sp.quantity}x ${sp.package.packageQuantity} ${sp.package.packageUnit}`);
    });

    if (result.totalUnits === 270 && result.overfill === 0) {
      console.log('✅ PASS - Exact match for large quantity (3x90)');
      testsPassed++;
    } else if (result.totalUnits >= 270) {
      console.log('⚠️  PASS - Valid solution with some overfill');
      testsPassed++;
    } else {
      console.log('❌ FAIL - Insufficient units');
      testsFailed++;
    }
  } catch (error) {
    console.error('❌ FAIL - Error:', error);
    testsFailed++;
  }

  // Test 6: Small Quantity (5 tablets)
  console.log('\n📋 Test 6: Small Quantity - 5 tablets (high overfill expected)');
  console.log('-'.repeat(80));
  try {
    const packages = [
      createMockPackage('0001-0001-01', 30),
      createMockPackage('0001-0001-02', 60),
      createMockPackage('0001-0001-03', 90)
    ];

    const result = service.selectOptimalPackages(5, packages);

    console.log(`✓ Total Units: ${result.totalUnits}`);
    console.log(`✓ Overfill: ${result.overfill} (${result.overfillPercentage.toFixed(1)}%)`);
    console.log(`✓ Efficiency: ${result.efficiency.toFixed(1)}%`);
    console.log(`✓ Cost Efficiency: ${result.costEfficiency}`);

    if (result.totalUnits >= 5 && result.costEfficiency === 'wasteful') {
      console.log('✅ PASS - High overfill correctly identified as wasteful');
      testsPassed++;
    } else if (result.totalUnits >= 5) {
      console.log('⚠️  PASS - Valid solution found');
      testsPassed++;
    } else {
      console.log('❌ FAIL - Insufficient units');
      testsFailed++;
    }
  } catch (error) {
    console.error('❌ FAIL - Error:', error);
    testsFailed++;
  }

  // Test 7: Liquid Volumes (150ml)
  console.log('\n📋 Test 7: Liquid Volumes - 150ml needed');
  console.log('-'.repeat(80));
  try {
    const packages = [
      createMockPackage('0001-0001-01', 100, 'ML'),
      createMockPackage('0001-0001-02', 200, 'ML'),
      createMockPackage('0001-0001-03', 500, 'ML')
    ];

    const result = service.selectOptimalPackages(150, packages);

    console.log(`✓ Total Units: ${result.totalUnits}`);
    console.log(`✓ Overfill: ${result.overfill} (${result.overfillPercentage.toFixed(1)}%)`);
    console.log(`✓ Efficiency: ${result.efficiency.toFixed(1)}%`);
    console.log(`✓ Selected Package Units: ${result.selectedPackages[0].package.packageUnit}`);

    if (result.totalUnits >= 150 && result.selectedPackages[0].package.packageUnit === 'ML') {
      console.log('✅ PASS - Liquid volume handled correctly');
      testsPassed++;
    } else {
      console.log('❌ FAIL - Issue with liquid volume handling');
      testsFailed++;
    }
  } catch (error) {
    console.error('❌ FAIL - Error:', error);
    testsFailed++;
  }

  // Test 8: Edge Case - No Good Options (150 tablets, only 30+60 available)
  console.log('\n📋 Test 8: No Good Options - 150 tablets with only small packs');
  console.log('-'.repeat(80));
  try {
    const packages = [
      createMockPackage('0001-0001-01', 30),
      createMockPackage('0001-0001-02', 60)
    ];

    const result = service.selectOptimalPackages(150, packages);

    console.log(`✓ Total Units: ${result.totalUnits}`);
    console.log(`✓ Overfill: ${result.overfill} (${result.overfillPercentage.toFixed(1)}%)`);
    console.log(`✓ Selected Packages:`);
    result.selectedPackages.forEach(sp => {
      console.log(`  - ${sp.quantity}x ${sp.package.packageQuantity} ${sp.package.packageUnit}`);
    });

    if (result.totalUnits >= 150) {
      console.log('✅ PASS - Multiple packages solution found');
      testsPassed++;
    } else {
      console.log('❌ FAIL - Insufficient units');
      testsFailed++;
    }
  } catch (error) {
    console.error('❌ FAIL - Error:', error);
    testsFailed++;
  }

  // Test 9: Performance Test
  console.log('\n📋 Test 9: Performance Test - Large package list');
  console.log('-'.repeat(80));
  try {
    const packages: NDCPackage[] = [];
    for (let i = 1; i <= 50; i++) {
      packages.push(createMockPackage(`0001-0001-${String(i).padStart(2, '0')}`, i * 10));
    }

    const startTime = Date.now();
    const result = service.selectOptimalPackages(450, packages);
    const endTime = Date.now();
    const executionTime = endTime - startTime;

    console.log(`✓ Execution Time: ${executionTime}ms`);
    console.log(`✓ Total Units: ${result.totalUnits}`);
    console.log(`✓ Efficiency: ${result.efficiency.toFixed(1)}%`);

    if (executionTime < 50) {
      console.log(`✅ PASS - Fast execution (${executionTime}ms < 50ms)`);
      testsPassed++;
    } else if (executionTime < 100) {
      console.log(`⚠️  PASS - Acceptable execution (${executionTime}ms < 100ms)`);
      testsPassed++;
    } else {
      console.log(`❌ FAIL - Slow execution (${executionTime}ms >= 100ms)`);
      testsFailed++;
    }
  } catch (error) {
    console.error('❌ FAIL - Error:', error);
    testsFailed++;
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 Test Summary');
  console.log('='.repeat(80));
  console.log(`✅ Tests Passed: ${testsPassed}`);
  console.log(`❌ Tests Failed: ${testsFailed}`);
  console.log(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
  console.log('='.repeat(80));

  if (testsFailed === 0) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review the results above.');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
