/**
 * Drizzle database schema for RxMatch
 * Tasks: 10 (Database Schema), 11 (Audit Logging), 12 (Manual Review Queue)
 */

import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  real,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

// Enums
export const reviewStatusEnum = pgEnum('review_status', [
  'PENDING',
  'IN_REVIEW',
  'APPROVED',
  'REJECTED',
  'NEEDS_INFO',
]);

export const priorityEnum = pgEnum('priority', ['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

// Audit log for all prescription lookups (Task 11)
export const auditLog = pgTable(
  'audit_log',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    timestamp: timestamp('timestamp').defaultNow().notNull(),
    userId: text('user_id'),
    sessionId: text('session_id'),
    inputData: jsonb('input_data').notNull(), // Original prescription input
    normalizedData: jsonb('normalized_data'), // OpenAI normalized output
    rxcui: text('rxcui'),
    ndcCodes: jsonb('ndc_codes'), // Array of NDC codes returned
    success: boolean('success').default(true).notNull(),
    errorMessage: text('error_message'),
    processingTime: integer('processing_time'), // milliseconds
    confidenceScore: real('confidence_score'),
  },
  (table) => ({
    timestampIdx: index('audit_log_timestamp_idx').on(table.timestamp),
    userIdIdx: index('audit_log_user_id_idx').on(table.userId),
    rxcuiIdx: index('audit_log_rxcui_idx').on(table.rxcui),
  })
);

// Manual review queue for low-confidence prescriptions (Task 12)
export const reviewQueue = pgTable(
  'review_queue',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    status: reviewStatusEnum('status').default('PENDING').notNull(),
    priority: priorityEnum('priority').default('MEDIUM').notNull(),

    // Original data
    prescriptionInput: jsonb('prescription_input').notNull(),
    normalizedOutput: jsonb('normalized_output'),
    confidenceScore: real('confidence_score').notNull(),

    // Review data
    reviewerId: text('reviewer_id'),
    reviewedAt: timestamp('reviewed_at'),
    reviewNotes: text('review_notes'),
    correctedOutput: jsonb('corrected_output'),

    // Link to audit log
    auditLogId: text('audit_log_id'),
  },
  (table) => ({
    statusIdx: index('review_queue_status_idx').on(table.status),
    priorityIdx: index('review_queue_priority_idx').on(table.priority),
    createdAtIdx: index('review_queue_created_at_idx').on(table.createdAt),
  })
);

// Cache invalidation tracking
export const cacheInvalidation = pgTable(
  'cache_invalidation',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    timestamp: timestamp('timestamp').defaultNow().notNull(),
    cacheKey: text('cache_key').notNull(),
    reason: text('reason').notNull(),
    invalidatedBy: text('invalidated_by'),
  },
  (table) => ({
    timestampIdx: index('cache_invalidation_timestamp_idx').on(table.timestamp),
  })
);

// RxCUI mappings for offline fallback
export const rxcuiMapping = pgTable(
  'rxcui_mapping',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    drugName: text('drug_name').notNull(),
    strength: text('strength'),
    form: text('form'),
    rxcui: text('rxcui').notNull(),
    lastUpdated: timestamp('last_updated').defaultNow().notNull(),
    hitCount: integer('hit_count').default(0).notNull(),
  },
  (table) => ({
    rxcuiIdx: index('rxcui_mapping_rxcui_idx').on(table.rxcui),
    drugNameUnique: uniqueIndex('rxcui_mapping_drug_name_unique').on(
      table.drugName,
      table.strength,
      table.form
    ),
  })
);

// NDC package data for offline fallback
export const ndcPackage = pgTable(
  'ndc_package',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    ndc: text('ndc').notNull().unique(),
    productNdc: text('product_ndc').notNull(),
    genericName: text('generic_name').notNull(),
    labelerName: text('labeler_name').notNull(),
    brandName: text('brand_name'),
    dosageForm: text('dosage_form').notNull(),
    route: jsonb('route').notNull(), // Array of routes
    strength: text('strength').notNull(),
    packageDescription: text('package_description').notNull(),
    packageQuantity: integer('package_quantity').notNull(),
    packageUnit: text('package_unit').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    lastUpdated: timestamp('last_updated').defaultNow().notNull(),
  },
  (table) => ({
    productNdcIdx: index('ndc_package_product_ndc_idx').on(table.productNdc),
    genericNameIdx: index('ndc_package_generic_name_idx').on(table.genericName),
    isActiveIdx: index('ndc_package_is_active_idx').on(table.isActive),
  })
);

// Type exports
export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;

export type ReviewQueue = typeof reviewQueue.$inferSelect;
export type NewReviewQueue = typeof reviewQueue.$inferInsert;

export type CacheInvalidation = typeof cacheInvalidation.$inferSelect;
export type NewCacheInvalidation = typeof cacheInvalidation.$inferInsert;

export type RxcuiMapping = typeof rxcuiMapping.$inferSelect;
export type NewRxcuiMapping = typeof rxcuiMapping.$inferInsert;

export type NdcPackage = typeof ndcPackage.$inferSelect;
export type NewNdcPackage = typeof ndcPackage.$inferInsert;
