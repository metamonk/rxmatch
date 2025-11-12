/**
 * API endpoint for adding notes to review items
 * POST /api/review-queue/[id]/notes - Add notes to a review item
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  getReviewQueueItemById,
  updateReviewQueueItemNotes,
} from '$lib/server/db/services/manualReviewQueue';
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

    if (!notes || !notes.trim()) {
      return json(
        {
          success: false,
          error: 'Notes cannot be empty',
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

    // Append notes with timestamp
    const timestamp = new Date().toISOString();
    const newNote = `[${timestamp}] ${notes}`;
    const updatedNotes = item.notes
      ? `${item.notes}\n\n${newNote}`
      : newNote;

    const updatedItem = await updateReviewQueueItemNotes(id, updatedNotes);

    // Log the notes addition
    const auditService = getAuditService();
    await auditService.logEvent(
      {
        eventType: 'review_notes_added' as any,
        metadata: {
          reviewQueueId: id,
          calculationId: item.calculationId,
          userId,
          notesLength: notes.length,
          timestamp,
        },
      },
      { userId: userId || undefined }
    );

    return json({
      success: true,
      data: updatedItem,
      message: 'Notes added successfully',
    });
  } catch (error) {
    console.error('Error adding notes:', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add notes',
      },
      { status: 500 }
    );
  }
};
