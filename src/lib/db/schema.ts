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
export const userRoleEnum = pgEnum('user_role', ['pharmacist', 'admin', 'user']);

export const calculationStatusEnum = pgEnum('calculation_status', ['pending', 'approved', 'rejected']);

export const reviewStatusEnum = pgEnum('review_status', [
  'pending',
  'in_review',
  'completed',
]);

export const priorityEnum = pgEnum('priority', ['low', 'medium', 'high']);

// Users table (Task 10)
export const users = pgTable(
  'users',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    email: text('email').notNull().unique(),
    role: userRoleEnum('role').default('user').notNull(),
    firebaseUid: text('firebase_uid').unique(),
    displayName: text('display_name'),
    photoUrl: text('photo_url'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    lastLoginAt: timestamp('last_login_at'),
    isActive: boolean('is_active').default(true).notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex('users_email_idx').on(table.email),
    firebaseUidIdx: uniqueIndex('users_firebase_uid_idx').on(table.firebaseUid),
    roleIdx: index('users_role_idx').on(table.role),
  })
);

// Calculation audits table (Task 10 & 11)
export const calculationAudits = pgTable(
  'calculation_audits',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    prescriptionText: text('prescription_text').notNull(),
    parsedResult: jsonb('parsed_result'),
    confidenceScore: real('confidence_score'),
    selectedPackages: jsonb('selected_packages'),
    status: calculationStatusEnum('status').default('pending').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    rxcui: text('rxcui'),
    ndcCodes: jsonb('ndc_codes'),
    processingTime: integer('processing_time'),
  },
  (table) => ({
    userIdIdx: index('calculation_audits_user_id_idx').on(table.userId),
    statusIdx: index('calculation_audits_status_idx').on(table.status),
    createdAtIdx: index('calculation_audits_created_at_idx').on(table.createdAt),
    rxcuiIdx: index('calculation_audits_rxcui_idx').on(table.rxcui),
  })
);

// Manual review queue table (Task 10 & 12)
export const manualReviewQueue = pgTable(
  'manual_review_queue',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    calculationId: text('calculation_id')
      .references(() => calculationAudits.id, { onDelete: 'cascade' })
      .notNull(),
    assignedTo: text('assigned_to').references(() => users.id, { onDelete: 'set null' }),
    priority: priorityEnum('priority').default('medium').notNull(),
    status: reviewStatusEnum('status').default('pending').notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    calculationIdIdx: index('manual_review_queue_calculation_id_idx').on(table.calculationId),
    assignedToIdx: index('manual_review_queue_assigned_to_idx').on(table.assignedTo),
    statusIdx: index('manual_review_queue_status_idx').on(table.status),
    priorityIdx: index('manual_review_queue_priority_idx').on(table.priority),
    createdAtIdx: index('manual_review_queue_created_at_idx').on(table.createdAt),
  })
);

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
    status: reviewStatusEnum('status').default('pending').notNull(),
    priority: priorityEnum('priority').default('medium').notNull(),

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
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type CalculationAudit = typeof calculationAudits.$inferSelect;
export type NewCalculationAudit = typeof calculationAudits.$inferInsert;

export type ManualReviewQueue = typeof manualReviewQueue.$inferSelect;
export type NewManualReviewQueue = typeof manualReviewQueue.$inferInsert;

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
