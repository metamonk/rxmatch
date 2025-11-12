/**
 * API endpoint for rejecting calculations
 * POST /api/review-queue/[id]/reject - Reject a calculation
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  getReviewQueueItemById,
  updateReviewQueueItemStatus,
} from '$lib/server/db/services/manualReviewQueue';
import { updateCalculationAuditStatus } from '$lib/server/db/services/calculationAudits';
import { getAuditService } from '$lib/services/audit';

export const POST: RequestHandler = async ({ params, request }) => {
  try {
    const { id } = params;
    const body = await request.json();
    const { userId, reason, notes } = body;

    if (!id) {
      return json(
        {
          success: false,
          error: 'Item ID is required',
        },
        { status: 400 }
      );
    }

    if (!reason || !reason.trim()) {
      return json(
        {
          success: false,
          error: 'Rejection reason is required',
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

    // Update the calculation audit status to rejected
    await updateCalculationAuditStatus(item.calculationId, 'rejected');

    // Update the review queue item status to completed with rejection reason
    const rejectionNote = `[REJECTED] Reason: ${reason}${notes ? '\n' + notes : ''}`;
    const updatedNotes = item.notes
      ? `${item.notes}\n\n${rejectionNote}`
      : rejectionNote;

    await updateReviewQueueItemStatus(id, 'completed', updatedNotes);

    // Log the rejection action
    const auditService = getAuditService();
    await auditService.logEvent(
      {
        eventType: 'review_rejected' as any,
        metadata: {
          reviewQueueId: id,
          calculationId: item.calculationId,
          userId,
          reason,
          notes,
          timestamp: new Date().toISOString(),
        },
      },
      { userId: userId || undefined }
    );

    return json({
      success: true,
      message: 'Calculation rejected successfully',
    });
  } catch (error) {
    console.error('Error rejecting calculation:', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reject calculation',
      },
      { status: 500 }
    );
  }
};
