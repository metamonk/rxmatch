/**
 * API endpoint for approving calculations
 * POST /api/review-queue/[id]/approve - Approve a calculation
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  getReviewQueueItemById,
  updateReviewQueueItemStatus,
  updateReviewQueueItemNotes,
} from '$lib/server/db/services/manualReviewQueue';
import { updateCalculationAuditStatus } from '$lib/server/db/services/calculationAudits';
import { getAuditService } from '$lib/services/audit';

export const POST: RequestHandler = async ({ params, request }) => {
  try {
    const { id } = params;
    const body = await request.json();
    const { userId, notes } = body;

    if (!id) {
      return json(
        {
          success: false,
          error: 'Item ID is required',
        },
        { status: 400 }
      );
    }

    // Get the review queue item
    const item = await getReviewQueueItemById(id);
    if (!item) {
      return json(
        {
          success: false,
          error: 'Review queue item not found',
        },
        { status: 404 }
      );
    }

    // Update the calculation audit status to approved
    await updateCalculationAuditStatus(item.calculationId, 'approved');

    // Update the review queue item status to completed
    const updatedNotes = notes
      ? `${item.notes ? item.notes + '\n\n' : ''}[APPROVED] ${notes}`
      : item.notes;

    await updateReviewQueueItemStatus(id, 'completed', updatedNotes || undefined);

    // Log the approval action
    const auditService = getAuditService();
    await auditService.logEvent(
      {
        eventType: 'review_approved' as any,
        metadata: {
          reviewQueueId: id,
          calculationId: item.calculationId,
          userId,
          notes,
          timestamp: new Date().toISOString(),
        },
      },
      { userId: userId || undefined }
    );

    return json({
      success: true,
      message: 'Calculation approved successfully',
    });
  } catch (error) {
    console.error('Error approving calculation:', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to approve calculation',
      },
      { status: 500 }
    );
  }
};
