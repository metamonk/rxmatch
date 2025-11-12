/**
 * Type definitions for manual review queue system
 */

import type { ManualReviewQueue, CalculationAudit, User } from './db';
import type { PrescriptionParse } from './prescription';
import type { NDCPackage } from './medication';

/**
 * Extended review queue item with related data
 */
export interface ReviewQueueItemWithDetails {
  reviewQueueItem: ManualReviewQueue;
  calculationAudit: CalculationAudit | null;
  assignedUser: User | null;
}

/**
 * Filter options for review queue list
 */
export interface ReviewQueueFilters {
  status?: 'pending' | 'in_review' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  assignedTo?: string | null;
  unassignedOnly?: boolean;
}

/**
 * Sort options for review queue
 */
export type ReviewQueueSortField = 'createdAt' | 'priority' | 'status';
export type ReviewQueueSortOrder = 'asc' | 'desc';

export interface ReviewQueueSort {
  field: ReviewQueueSortField;
  order: ReviewQueueSortOrder;
}

/**
 * Review action types
 */
export type ReviewAction = 'approve' | 'reject' | 'modify' | 'defer';

/**
 * Review decision data
 */
export interface ReviewDecision {
  action: ReviewAction;
  notes?: string;
  reason?: string; // Required for reject
  modifiedPrescription?: PrescriptionParse; // For modify action
}

/**
 * Audit event types for review actions
 */
export enum ReviewAuditEventType {
  QUEUE_ITEM_CREATED = 'queue_item_created',
  ITEM_ASSIGNED = 'item_assigned',
  ITEM_REASSIGNED = 'item_reassigned',
  REVIEW_STARTED = 'review_started',
  REVIEW_APPROVED = 'review_approved',
  REVIEW_REJECTED = 'review_rejected',
  REVIEW_DEFERRED = 'review_deferred',
  PRESCRIPTION_MODIFIED = 'prescription_modified',
  NOTES_ADDED = 'notes_added',
  STATUS_CHANGED = 'status_changed',
  PRIORITY_CHANGED = 'priority_changed',
}

/**
 * Review audit log entry
 */
export interface ReviewAuditLog {
  eventType: ReviewAuditEventType;
  reviewQueueId: string;
  userId?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  duration?: number; // Time spent in review (ms)
}
