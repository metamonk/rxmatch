/**
 * API endpoint for listing review queue items
 * GET /api/review-queue - List queue items with filters
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  listPendingReviewQueueItems,
  listReviewQueueItemsByStatus,
  listReviewQueueItemsByPriority,
  listReviewQueueItemsByAssignee,
  listUnassignedReviewQueueItems,
} from '$lib/server/db/services/manualReviewQueue';
import { getDb } from '$lib/server/db';
import { manualReviewQueue, calculationAudits, users } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const status = url.searchParams.get('status') as 'pending' | 'in_review' | 'completed' | null;
    const priority = url.searchParams.get('priority') as 'low' | 'medium' | 'high' | null;
    const assignedTo = url.searchParams.get('assignedTo');
    const unassignedOnly = url.searchParams.get('unassignedOnly') === 'true';

    const db = getDb();

    // Build query with filters and joins
    let query = db
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
      .leftJoin(users, eq(manualReviewQueue.assignedTo, users.id));

    // Apply filters
    const conditions = [];

    if (status) {
      conditions.push(eq(manualReviewQueue.status, status));
    }

    if (priority) {
      conditions.push(eq(manualReviewQueue.priority, priority));
    }

    if (assignedTo) {
      conditions.push(eq(manualReviewQueue.assignedTo, assignedTo));
    }

    if (unassignedOnly) {
      conditions.push(eq(manualReviewQueue.assignedTo, null as any));
    }

    // Apply conditions if any
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    // Order by priority (desc) and created date (desc)
    const items = await query.orderBy(
      desc(manualReviewQueue.priority),
      desc(manualReviewQueue.createdAt)
    );

    return json({
      success: true,
      data: items,
      count: items.length,
    });
  } catch (error) {
    console.error('Error fetching review queue items:', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch review queue items',
      },
      { status: 500 }
    );
  }
};
