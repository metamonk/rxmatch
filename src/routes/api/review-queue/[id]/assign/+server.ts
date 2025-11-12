/**
 * API endpoint for assigning review queue items
 * POST /api/review-queue/[id]/assign - Assign item to a user
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { assignReviewQueueItem, getReviewQueueItemById } from '$lib/server/db/services/manualReviewQueue';
import { getAuditService } from '$lib/services/audit';

export const POST: RequestHandler = async ({ params, request }) => {
  try {
    const { id } = params;
    const { userId } = await request.json();

    if (!id) {
      return json(
        {
          success: false,
          error: 'Item ID is required',
        },
        { status: 400 }
      );
    }

    if (!userId) {
      return json(
        {
          success: false,
          error: 'User ID is required',
        },
        { status: 400 }
      );
    }

    // Check if item exists
    const existingItem = await getReviewQueueItemById(id);
    if (!existingItem) {
      return json(
        {
          success: false,
          error: 'Review queue item not found',
        },
        { status: 404 }
      );
    }

    // Assign the item
    const updatedItem = await assignReviewQueueItem(id, userId);

    if (!updatedItem) {
      return json(
        {
          success: false,
          error: 'Failed to assign review queue item',
        },
        { status: 500 }
      );
    }

    // Log the assignment action
    const auditService = getAuditService();
    await auditService.logEvent(
      {
        eventType: 'review_item_assigned' as any,
        metadata: {
          reviewQueueId: id,
          userId,
          previousAssignee: existingItem.assignedTo,
          timestamp: new Date().toISOString(),
        },
      },
      { userId }
    );

    return json({
      success: true,
      data: updatedItem,
      message: 'Review item assigned successfully',
    });
  } catch (error) {
    console.error('Error assigning review queue item:', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to assign review queue item',
      },
      { status: 500 }
    );
  }
};
