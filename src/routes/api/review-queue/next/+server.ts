/**
 * API endpoint for getting next available review item
 * GET /api/review-queue/next - Get next unassigned, pending item
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getNextReviewItem } from '$lib/server/db/services/manualReviewQueue';

export const GET: RequestHandler = async () => {
  try {
    const nextItem = await getNextReviewItem();

    if (!nextItem) {
      return json({
        success: true,
        data: null,
        message: 'No review items available',
      });
    }

    return json({
      success: true,
      data: nextItem,
    });
  } catch (error) {
    console.error('Error fetching next review item:', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch next review item',
      },
      { status: 500 }
    );
  }
};
