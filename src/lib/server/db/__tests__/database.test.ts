/**
 * Database CRUD operations tests
 * Tests for users, calculation audits, and manual review queue
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createUser,
  getUserById,
  getUserByEmail,
  updateUser,
  listActiveUsers,
} from '../services/users';
import {
  createCalculationAudit,
  getCalculationAuditById,
  listCalculationAuditsByUser,
  updateCalculationAuditStatus,
} from '../services/calculationAudits';
import {
  createReviewQueueItem,
  getReviewQueueItemById,
  listPendingReviewQueueItems,
  assignReviewQueueItem,
  updateReviewQueueItemStatus,
} from '../services/manualReviewQueue';

// Test data cleanup
const testUserIds: string[] = [];
const testAuditIds: string[] = [];
const testReviewIds: string[] = [];

describe('Database CRUD Operations', () => {
  afterAll(async () => {
    // Note: In production, you'd clean up test data here
    // For now, we'll let the database handle it
  });

  describe('Users', () => {
    it('should create a new user', async () => {
      const user = await createUser({
        email: `test-${Date.now()}@example.com`,
        role: 'pharmacist',
        displayName: 'Test User',
      });

      expect(user).toBeDefined();
      expect(user.email).toContain('test-');
      expect(user.role).toBe('pharmacist');
      expect(user.isActive).toBe(true);
      testUserIds.push(user.id);
    });

    it('should get user by ID', async () => {
      const createdUser = await createUser({
        email: `test-get-${Date.now()}@example.com`,
        role: 'admin',
      });
      testUserIds.push(createdUser.id);

      const user = await getUserById(createdUser.id);
      expect(user).toBeDefined();
      expect(user?.id).toBe(createdUser.id);
      expect(user?.email).toBe(createdUser.email);
    });

    it('should get user by email', async () => {
      const email = `test-email-${Date.now()}@example.com`;
      const createdUser = await createUser({
        email,
        role: 'user',
      });
      testUserIds.push(createdUser.id);

      const user = await getUserByEmail(email);
      expect(user).toBeDefined();
      expect(user?.email).toBe(email);
    });

    it('should update user', async () => {
      const user = await createUser({
        email: `test-update-${Date.now()}@example.com`,
        role: 'user',
      });
      testUserIds.push(user.id);

      const updated = await updateUser(user.id, {
        displayName: 'Updated Name',
        role: 'pharmacist',
      });

      expect(updated).toBeDefined();
      expect(updated?.displayName).toBe('Updated Name');
      expect(updated?.role).toBe('pharmacist');
    });

    it('should list active users', async () => {
      const users = await listActiveUsers();
      expect(users).toBeDefined();
      expect(Array.isArray(users)).toBe(true);
    });
  });

  describe('Calculation Audits', () => {
    let testUserId: string;

    beforeAll(async () => {
      const user = await createUser({
        email: `test-audit-${Date.now()}@example.com`,
        role: 'pharmacist',
      });
      testUserId = user.id;
      testUserIds.push(testUserId);
    });

    it('should create a calculation audit', async () => {
      const audit = await createCalculationAudit({
        userId: testUserId,
        prescriptionText: 'Amoxicillin 500mg #30',
        parsedResult: { medication: 'Amoxicillin', strength: '500mg', quantity: 30 },
        confidenceScore: 0.95,
        selectedPackages: [{ ndc: '12345-678-90', quantity: 30 }],
        status: 'pending',
      });

      expect(audit).toBeDefined();
      expect(audit.prescriptionText).toBe('Amoxicillin 500mg #30');
      expect(audit.confidenceScore).toBe(0.95);
      expect(audit.status).toBe('pending');
      testAuditIds.push(audit.id);
    });

    it('should get calculation audit by ID', async () => {
      const created = await createCalculationAudit({
        userId: testUserId,
        prescriptionText: 'Lisinopril 10mg #90',
        confidenceScore: 0.88,
        status: 'pending',
      });
      testAuditIds.push(created.id);

      const audit = await getCalculationAuditById(created.id);
      expect(audit).toBeDefined();
      expect(audit?.id).toBe(created.id);
    });

    it('should list calculation audits by user', async () => {
      const audits = await listCalculationAuditsByUser(testUserId);
      expect(audits).toBeDefined();
      expect(Array.isArray(audits)).toBe(true);
      expect(audits.length).toBeGreaterThan(0);
    });

    it('should update calculation audit status', async () => {
      const audit = await createCalculationAudit({
        userId: testUserId,
        prescriptionText: 'Metformin 1000mg #180',
        confidenceScore: 0.92,
        status: 'pending',
      });
      testAuditIds.push(audit.id);

      const updated = await updateCalculationAuditStatus(audit.id, 'approved');
      expect(updated).toBeDefined();
      expect(updated?.status).toBe('approved');
    });
  });

  describe('Manual Review Queue', () => {
    let testUserId: string;
    let testAuditId: string;

    beforeAll(async () => {
      const user = await createUser({
        email: `test-review-${Date.now()}@example.com`,
        role: 'pharmacist',
      });
      testUserId = user.id;
      testUserIds.push(testUserId);

      const audit = await createCalculationAudit({
        userId: testUserId,
        prescriptionText: 'Complex prescription requiring review',
        confidenceScore: 0.45,
        status: 'pending',
      });
      testAuditId = audit.id;
      testAuditIds.push(testAuditId);
    });

    it('should create a review queue item', async () => {
      const item = await createReviewQueueItem({
        calculationId: testAuditId,
        priority: 'high',
        status: 'pending',
      });

      expect(item).toBeDefined();
      expect(item.calculationId).toBe(testAuditId);
      expect(item.priority).toBe('high');
      expect(item.status).toBe('pending');
      testReviewIds.push(item.id);
    });

    it('should get review queue item by ID', async () => {
      const created = await createReviewQueueItem({
        calculationId: testAuditId,
        priority: 'medium',
        status: 'pending',
      });
      testReviewIds.push(created.id);

      const item = await getReviewQueueItemById(created.id);
      expect(item).toBeDefined();
      expect(item?.id).toBe(created.id);
    });

    it('should list pending review queue items', async () => {
      const items = await listPendingReviewQueueItems();
      expect(items).toBeDefined();
      expect(Array.isArray(items)).toBe(true);
    });

    it('should assign review queue item to user', async () => {
      const item = await createReviewQueueItem({
        calculationId: testAuditId,
        priority: 'low',
        status: 'pending',
      });
      testReviewIds.push(item.id);

      const assigned = await assignReviewQueueItem(item.id, testUserId);
      expect(assigned).toBeDefined();
      expect(assigned?.assignedTo).toBe(testUserId);
      expect(assigned?.status).toBe('in_review');
    });

    it('should update review queue item status', async () => {
      const item = await createReviewQueueItem({
        calculationId: testAuditId,
        priority: 'medium',
        status: 'pending',
      });
      testReviewIds.push(item.id);

      const updated = await updateReviewQueueItemStatus(item.id, 'completed', 'Review completed successfully');
      expect(updated).toBeDefined();
      expect(updated?.status).toBe('completed');
      expect(updated?.notes).toBe('Review completed successfully');
    });
  });
});
