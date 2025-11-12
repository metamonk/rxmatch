/**
 * Test script for Manual Review Queue workflow
 * This file demonstrates the complete review queue workflow
 */

import { getDb } from '$lib/server/db';
import { users, calculationAudits, manualReviewQueue } from '$lib/server/db/schema';
import {
  createReviewQueueItem,
  getReviewQueueItemWithDetails,
  assignReviewQueueItem,
  updateReviewQueueItemStatus,
  listPendingReviewQueueItems,
  getNextReviewItem,
} from '$lib/server/db/services/manualReviewQueue';
import {
  createCalculationAudit,
  updateCalculationAuditStatus,
} from '$lib/server/db/services/calculationAudits';
import { getAuditService } from '$lib/services/audit';
import type { NewManualReviewQueue, NewCalculationAudit } from '$lib/server/db/schema';

/**
 * Test Scenario 1: Create a low-confidence prescription for review
 */
export async function testCreateReviewItem() {
  console.log('\n=== Test 1: Create Review Item ===');

  try {
    // Step 1: Create a calculation audit entry (simulating low-confidence parsing)
    const auditData: NewCalculationAudit = {
      userId: null, // Anonymous submission
      prescriptionText: 'Metformin 500mg tabs #90',
      parsedResult: {
        drugName: 'Metformin',
        strength: '500mg',
        form: 'tablet',
        quantity: 90,
        confidence: 0.65, // Low confidence
        sig: 'Take 1 tablet twice daily',
      },
      confidenceScore: 0.65,
      rxcui: '860975',
      ndcCodes: ['00093-7214-01'],
      status: 'pending',
      processingTime: 1234,
    };

    const audit = await createCalculationAudit(auditData);
    console.log('Created calculation audit:', audit.id);

    // Step 2: Create review queue item (Task 5 would do this automatically)
    const reviewItemData: NewManualReviewQueue = {
      calculationId: audit.id,
      priority: 'medium',
      status: 'pending',
      assignedTo: null,
    };

    const reviewItem = await createReviewQueueItem(reviewItemData);
    console.log('Created review queue item:', reviewItem.id);

    // Step 3: Log the queue item creation
    const auditService = getAuditService();
    await auditService.logEvent(
      {
        eventType: 'review_item_created' as any,
        metadata: {
          reviewQueueId: reviewItem.id,
          calculationId: audit.id,
          priority: reviewItem.priority,
          confidenceScore: auditData.confidenceScore,
        },
      },
      {}
    );

    console.log('✓ Test 1 passed: Review item created successfully');
    return reviewItem.id;
  } catch (error) {
    console.error('✗ Test 1 failed:', error);
    throw error;
  }
}

/**
 * Test Scenario 2: Pharmacist retrieves and assigns item to self
 */
export async function testAssignReviewItem(reviewItemId: string, userId: string) {
  console.log('\n=== Test 2: Assign Review Item ===');

  try {
    // Step 1: Get next available item
    const nextItem = await getNextReviewItem();
    console.log('Next available item:', nextItem?.id);

    // Step 2: Assign to pharmacist
    const assignedItem = await assignReviewQueueItem(reviewItemId, userId);
    console.log('Assigned item to user:', assignedItem?.assignedTo);

    // Step 3: Verify assignment
    const itemWithDetails = await getReviewQueueItemWithDetails(reviewItemId);
    console.log('Item assigned to:', itemWithDetails?.assignedUser?.email);

    // Step 4: Log the assignment
    const auditService = getAuditService();
    await auditService.logEvent(
      {
        eventType: 'review_item_assigned' as any,
        metadata: {
          reviewQueueId: reviewItemId,
          userId,
          timestamp: new Date().toISOString(),
        },
      },
      { userId }
    );

    console.log('✓ Test 2 passed: Item assigned successfully');
    return itemWithDetails;
  } catch (error) {
    console.error('✗ Test 2 failed:', error);
    throw error;
  }
}

/**
 * Test Scenario 3: Pharmacist approves the calculation
 */
export async function testApproveReview(reviewItemId: string, userId: string) {
  console.log('\n=== Test 3: Approve Review ===');

  try {
    // Step 1: Get the review item
    const item = await getReviewQueueItemWithDetails(reviewItemId);
    if (!item) {
      throw new Error('Review item not found');
    }

    // Step 2: Update calculation audit status to approved
    await updateCalculationAuditStatus(item.reviewQueueItem.calculationId, 'approved');
    console.log('Updated calculation status to approved');

    // Step 3: Update review queue item status to completed
    await updateReviewQueueItemStatus(
      reviewItemId,
      'completed',
      '[APPROVED] Verified medication details and dosage'
    );
    console.log('Updated review queue status to completed');

    // Step 4: Log the approval
    const auditService = getAuditService();
    await auditService.logEvent(
      {
        eventType: 'review_approved' as any,
        metadata: {
          reviewQueueId: reviewItemId,
          calculationId: item.reviewQueueItem.calculationId,
          userId,
          timestamp: new Date().toISOString(),
        },
      },
      { userId }
    );

    console.log('✓ Test 3 passed: Review approved successfully');
  } catch (error) {
    console.error('✗ Test 3 failed:', error);
    throw error;
  }
}

/**
 * Test Scenario 4: Pharmacist rejects a calculation
 */
export async function testRejectReview(reviewItemId: string, userId: string) {
  console.log('\n=== Test 4: Reject Review ===');

  try {
    // Step 1: Get the review item
    const item = await getReviewQueueItemWithDetails(reviewItemId);
    if (!item) {
      throw new Error('Review item not found');
    }

    // Step 2: Update calculation audit status to rejected
    await updateCalculationAuditStatus(item.reviewQueueItem.calculationId, 'rejected');
    console.log('Updated calculation status to rejected');

    // Step 3: Update review queue item with rejection reason
    const rejectionReason = 'Incorrect dosage form - should be extended release';
    await updateReviewQueueItemStatus(
      reviewItemId,
      'completed',
      `[REJECTED] Reason: ${rejectionReason}`
    );
    console.log('Updated review queue with rejection reason');

    // Step 4: Log the rejection
    const auditService = getAuditService();
    await auditService.logEvent(
      {
        eventType: 'review_rejected' as any,
        metadata: {
          reviewQueueId: reviewItemId,
          calculationId: item.reviewQueueItem.calculationId,
          userId,
          reason: rejectionReason,
          timestamp: new Date().toISOString(),
        },
      },
      { userId }
    );

    console.log('✓ Test 4 passed: Review rejected successfully');
  } catch (error) {
    console.error('✗ Test 4 failed:', error);
    throw error;
  }
}

/**
 * Test Scenario 5: List and filter review queue items
 */
export async function testListReviewItems() {
  console.log('\n=== Test 5: List Review Items ===');

  try {
    // Step 1: Get all pending items
    const pendingItems = await listPendingReviewQueueItems();
    console.log(`Found ${pendingItems.length} pending items`);

    // Step 2: Get next available item
    const nextItem = await getNextReviewItem();
    console.log('Next available item:', nextItem?.id || 'None');

    console.log('✓ Test 5 passed: Successfully listed review items');
  } catch (error) {
    console.error('✗ Test 5 failed:', error);
    throw error;
  }
}

/**
 * Run all tests
 */
export async function runAllTests() {
  console.log('\n========================================');
  console.log('Manual Review Queue Workflow Tests');
  console.log('========================================');

  try {
    // Test user (mock pharmacist)
    const testUserId = 'test-pharmacist-123';

    // Test 1: Create review item
    const reviewItemId = await testCreateReviewItem();

    // Test 2: Assign to pharmacist
    await testAssignReviewItem(reviewItemId, testUserId);

    // Test 3: Approve the review
    await testApproveReview(reviewItemId, testUserId);

    // Test 4: Create another item and reject it
    const reviewItemId2 = await testCreateReviewItem();
    await testAssignReviewItem(reviewItemId2, testUserId);
    await testRejectReview(reviewItemId2, testUserId);

    // Test 5: List items
    await testListReviewItems();

    console.log('\n========================================');
    console.log('✓ All tests passed successfully!');
    console.log('========================================\n');
  } catch (error) {
    console.log('\n========================================');
    console.log('✗ Test suite failed');
    console.log('========================================\n');
    throw error;
  }
}
