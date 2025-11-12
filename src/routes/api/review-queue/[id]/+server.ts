/**
 * API endpoint for getting a specific review queue item
 * GET /api/review-queue/[id] - Get item with full details
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getReviewQueueItemWithDetails } from '$lib/server/db/services/manualReviewQueue';

export const GET: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;

    if (!id) {
      return json(
        {
          success: false,
          error: 'Item ID is required',
        },
        { status: 400 }
      );
    }

    const item = await getReviewQueueItemWithDetails(id);

    if (!item) {
      return json(
        {
          success: false,
          error: 'Review queue item not found',
        },
        { status: 404 }
      );
    }

    return json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error('Error fetching review queue item:', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch review queue item',
      },
      { status: 500 }
    );
  }
};
