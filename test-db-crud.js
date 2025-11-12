/**
 * Manual test script for database CRUD operations
 * Run with: node test-db-crud.js
 */

import { config } from 'dotenv';
config();

import {
  createUser,
  getUserById,
  getUserByEmail,
  updateUser,
  listActiveUsers,
} from './src/lib/db/services/users.ts';

import {
  createCalculationAudit,
  getCalculationAuditById,
  listCalculationAuditsByUser,
  updateCalculationAuditStatus,
  getCalculationAuditsWithLowConfidence,
} from './src/lib/db/services/calculationAudits.ts';

import {
  createReviewQueueItem,
  getReviewQueueItemById,
  getReviewQueueItemWithDetails,
  listPendingReviewQueueItems,
  assignReviewQueueItem,
  updateReviewQueueItemStatus,
  getNextReviewItem,
} from './src/lib/db/services/manualReviewQueue.ts';

async function runTests() {
  console.log('Starting database CRUD tests...\n');

  try {
    // Test 1: Create a user
    console.log('Test 1: Creating a user...');
    const testUser = await createUser({
      email: `test-${Date.now()}@example.com`,
      role: 'pharmacist',
      displayName: 'Test Pharmacist',
      firebaseUid: `firebase-${Date.now()}`,
    });
    console.log('✓ User created:', {
      id: testUser.id,
      email: testUser.email,
      role: testUser.role,
    });

    // Test 2: Get user by ID
    console.log('\nTest 2: Getting user by ID...');
    const fetchedUser = await getUserById(testUser.id);
    console.log('✓ User fetched:', {
      id: fetchedUser?.id,
      email: fetchedUser?.email,
    });

    // Test 3: Get user by email
    console.log('\nTest 3: Getting user by email...');
    const userByEmail = await getUserByEmail(testUser.email);
    console.log('✓ User found by email:', userByEmail?.displayName);

    // Test 4: Update user
    console.log('\nTest 4: Updating user...');
    const updatedUser = await updateUser(testUser.id, {
      displayName: 'Updated Pharmacist Name',
    });
    console.log('✓ User updated:', updatedUser?.displayName);

    // Test 5: Create a calculation audit
    console.log('\nTest 5: Creating calculation audit...');
    const audit = await createCalculationAudit({
      userId: testUser.id,
      prescriptionText: 'Amoxicillin 500mg capsules, take 1 capsule 3 times daily, #30',
      parsedResult: {
        medication: 'Amoxicillin',
        strength: '500mg',
        form: 'capsules',
        quantity: 30,
      },
      confidenceScore: 0.95,
      selectedPackages: [
        {
          ndc: '00093-4157-73',
          quantity: 30,
          labeler: 'Teva Pharmaceuticals',
        },
      ],
      status: 'pending',
      rxcui: '308192',
    });
    console.log('✓ Calculation audit created:', {
      id: audit.id,
      prescriptionText: audit.prescriptionText,
      confidenceScore: audit.confidenceScore,
    });

    // Test 6: Get calculation audit by ID
    console.log('\nTest 6: Getting calculation audit by ID...');
    const fetchedAudit = await getCalculationAuditById(audit.id);
    console.log('✓ Audit fetched:', {
      id: fetchedAudit?.id,
      status: fetchedAudit?.status,
    });

    // Test 7: List audits by user
    console.log('\nTest 7: Listing audits by user...');
    const userAudits = await listCalculationAuditsByUser(testUser.id);
    console.log('✓ Found', userAudits.length, 'audit(s) for user');

    // Test 8: Create a low-confidence audit
    console.log('\nTest 8: Creating low-confidence audit...');
    const lowConfidenceAudit = await createCalculationAudit({
      userId: testUser.id,
      prescriptionText: 'Complex prescription requiring manual review',
      confidenceScore: 0.45,
      status: 'pending',
    });
    console.log('✓ Low-confidence audit created:', {
      id: lowConfidenceAudit.id,
      confidenceScore: lowConfidenceAudit.confidenceScore,
    });

    // Test 9: Create review queue item
    console.log('\nTest 9: Creating review queue item...');
    const reviewItem = await createReviewQueueItem({
      calculationId: lowConfidenceAudit.id,
      priority: 'high',
      status: 'pending',
      notes: 'Requires pharmacist review due to low confidence',
    });
    console.log('✓ Review queue item created:', {
      id: reviewItem.id,
      priority: reviewItem.priority,
      status: reviewItem.status,
    });

    // Test 10: Get review queue item with details
    console.log('\nTest 10: Getting review queue item with details...');
    const reviewDetails = await getReviewQueueItemWithDetails(reviewItem.id);
    console.log('✓ Review item details fetched:', {
      reviewId: reviewDetails?.reviewQueueItem.id,
      auditId: reviewDetails?.calculationAudit?.id,
      assignedUser: reviewDetails?.assignedUser?.displayName || 'Unassigned',
    });

    // Test 11: List pending reviews
    console.log('\nTest 11: Listing pending reviews...');
    const pendingReviews = await listPendingReviewQueueItems();
    console.log('✓ Found', pendingReviews.length, 'pending review(s)');

    // Test 12: Assign review to user
    console.log('\nTest 12: Assigning review to user...');
    const assignedReview = await assignReviewQueueItem(reviewItem.id, testUser.id);
    console.log('✓ Review assigned:', {
      id: assignedReview?.id,
      assignedTo: assignedReview?.assignedTo,
      status: assignedReview?.status,
    });

    // Test 13: Update review status
    console.log('\nTest 13: Updating review status...');
    const completedReview = await updateReviewQueueItemStatus(
      reviewItem.id,
      'completed',
      'Review completed - prescription verified'
    );
    console.log('✓ Review status updated:', {
      id: completedReview?.id,
      status: completedReview?.status,
      notes: completedReview?.notes,
    });

    // Test 14: Update audit status
    console.log('\nTest 14: Updating audit status...');
    const approvedAudit = await updateCalculationAuditStatus(lowConfidenceAudit.id, 'approved');
    console.log('✓ Audit status updated:', {
      id: approvedAudit?.id,
      status: approvedAudit?.status,
    });

    // Test 15: Get low confidence audits
    console.log('\nTest 15: Getting low confidence audits...');
    const lowConfidenceAudits = await getCalculationAuditsWithLowConfidence(0.7);
    console.log('✓ Found', lowConfidenceAudits.length, 'low-confidence audit(s)');

    // Test 16: Get next review item
    console.log('\nTest 16: Getting next available review item...');
    const nextReview = await getNextReviewItem();
    console.log('✓ Next review item:', nextReview ? nextReview.id : 'None available');

    // Test 17: List active users
    console.log('\nTest 17: Listing active users...');
    const activeUsers = await listActiveUsers();
    console.log('✓ Found', activeUsers.length, 'active user(s)');

    console.log('\n✓ All tests completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Test failed:', error);
    process.exit(1);
  }
}

runTests();
