/**
 * Manual Review Queue CRUD operations
 */

import { eq, and, desc, isNull, or } from 'drizzle-orm';
import { getDb } from '../index';
import {
  manualReviewQueue,
  calculationAudits,
  users,
  type NewManualReviewQueue,
  type ManualReviewQueue,
} from '../schema';

// Create review queue item
export async function createReviewQueueItem(
  data: NewManualReviewQueue
): Promise<ManualReviewQueue> {
  const db = getDb();
  const [item] = await db.insert(manualReviewQueue).values(data).returning();
  return item;
}

// Get review queue item by ID
export async function getReviewQueueItemById(
  id: string
): Promise<ManualReviewQueue | undefined> {
  const db = getDb();
  const [item] = await db
    .select()
    .from(manualReviewQueue)
    .where(eq(manualReviewQueue.id, id))
    .limit(1);
  return item;
}

// Get review queue item with related data
export async function getReviewQueueItemWithDetails(id: string) {
  const db = getDb();
  const [item] = await db
    .select({
      reviewQueueItem: manualReviewQueue,
      calculationAudit: calculationAudits,
      assignedUser: users,
    })
    .from(manualReviewQueue)
    .leftJoin(
      calculationAudits,
      eq(manualReviewQueue.calculationId, calculationAudits.id)
    )
    .leftJoin(users, eq(manualReviewQueue.assignedTo, users.id))
    .where(eq(manualReviewQueue.id, id))
    .limit(1);
  return item;
}

// List pending review queue items
export async function listPendingReviewQueueItems(): Promise<ManualReviewQueue[]> {
  const db = getDb();
  return db
    .select()
    .from(manualReviewQueue)
    .where(eq(manualReviewQueue.status, 'pending'))
    .orderBy(desc(manualReviewQueue.priority), desc(manualReviewQueue.createdAt));
}

// List review queue items by status
export async function listReviewQueueItemsByStatus(
  status: 'pending' | 'in_review' | 'completed'
): Promise<ManualReviewQueue[]> {
  const db = getDb();
  return db
    .select()
    .from(manualReviewQueue)
    .where(eq(manualReviewQueue.status, status))
    .orderBy(desc(manualReviewQueue.priority), desc(manualReviewQueue.createdAt));
}

// List review queue items by priority
export async function listReviewQueueItemsByPriority(
  priority: 'low' | 'medium' | 'high'
): Promise<ManualReviewQueue[]> {
  const db = getDb();
  return db
    .select()
    .from(manualReviewQueue)
    .where(eq(manualReviewQueue.priority, priority))
    .orderBy(desc(manualReviewQueue.createdAt));
}

// List review queue items assigned to user
export async function listReviewQueueItemsByAssignee(
  userId: string
): Promise<ManualReviewQueue[]> {
  const db = getDb();
  return db
    .select()
    .from(manualReviewQueue)
    .where(eq(manualReviewQueue.assignedTo, userId))
    .orderBy(desc(manualReviewQueue.priority), desc(manualReviewQueue.createdAt));
}

// List unassigned review queue items
export async function listUnassignedReviewQueueItems(): Promise<ManualReviewQueue[]> {
  const db = getDb();
  return db
    .select()
    .from(manualReviewQueue)
    .where(isNull(manualReviewQueue.assignedTo))
    .orderBy(desc(manualReviewQueue.priority), desc(manualReviewQueue.createdAt));
}

// Assign review queue item to user
export async function assignReviewQueueItem(
  id: string,
  userId: string
): Promise<ManualReviewQueue | undefined> {
  const db = getDb();
  const [item] = await db
    .update(manualReviewQueue)
    .set({
      assignedTo: userId,
      status: 'in_review',
      updatedAt: new Date(),
    })
    .where(eq(manualReviewQueue.id, id))
    .returning();
  return item;
}

// Update review queue item status
export async function updateReviewQueueItemStatus(
  id: string,
  status: 'pending' | 'in_review' | 'completed',
  notes?: string
): Promise<ManualReviewQueue | undefined> {
  const db = getDb();
  const updateData: any = {
    status,
    updatedAt: new Date(),
  };
  if (notes !== undefined) {
    updateData.notes = notes;
  }
  const [item] = await db
    .update(manualReviewQueue)
    .set(updateData)
    .where(eq(manualReviewQueue.id, id))
    .returning();
  return item;
}

// Update review queue item priority
export async function updateReviewQueueItemPriority(
  id: string,
  priority: 'low' | 'medium' | 'high'
): Promise<ManualReviewQueue | undefined> {
  const db = getDb();
  const [item] = await db
    .update(manualReviewQueue)
    .set({
      priority,
      updatedAt: new Date(),
    })
    .where(eq(manualReviewQueue.id, id))
    .returning();
  return item;
}

// Add or update notes
export async function updateReviewQueueItemNotes(
  id: string,
  notes: string
): Promise<ManualReviewQueue | undefined> {
  const db = getDb();
  const [item] = await db
    .update(manualReviewQueue)
    .set({
      notes,
      updatedAt: new Date(),
    })
    .where(eq(manualReviewQueue.id, id))
    .returning();
  return item;
}

// Delete review queue item
export async function deleteReviewQueueItem(id: string): Promise<void> {
  const db = getDb();
  await db.delete(manualReviewQueue).where(eq(manualReviewQueue.id, id));
}

// Get next available review item for assignment
export async function getNextReviewItem(): Promise<ManualReviewQueue | undefined> {
  const db = getDb();
  const [item] = await db
    .select()
    .from(manualReviewQueue)
    .where(
      and(
        eq(manualReviewQueue.status, 'pending'),
        isNull(manualReviewQueue.assignedTo)
      )
    )
    .orderBy(desc(manualReviewQueue.priority), desc(manualReviewQueue.createdAt))
    .limit(1);
  return item;
}
