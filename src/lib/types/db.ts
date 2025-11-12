/**
 * Pure TypeScript types for database entities
 * These types match the database schema but don't import from drizzle-orm
 * Safe to use in client-side code
 */

// Enum types
export type UserRole = 'pharmacist' | 'admin' | 'user';
export type CalculationStatus = 'pending' | 'approved' | 'rejected';
export type ReviewStatus = 'pending' | 'in_review' | 'completed';
export type Priority = 'low' | 'medium' | 'high';

// User
export interface User {
  id: string;
  email: string;
  role: UserRole;
  firebaseUid: string | null;
  displayName: string | null;
  photoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  isActive: boolean;
}

// Calculation Audit
export interface CalculationAudit {
  id: string;
  userId: string | null;
  prescriptionText: string;
  parsedResult: unknown;
  confidenceScore: number | null;
  selectedPackages: unknown;
  status: CalculationStatus;
  createdAt: Date;
  rxcui: string | null;
  ndcCodes: unknown;
  processingTime: number | null;
}

// Manual Review Queue
export interface ManualReviewQueue {
  id: string;
  calculationId: string;
  assignedTo: string | null;
  priority: Priority;
  status: ReviewStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Audit Log
export interface AuditLog {
  id: string;
  eventType: string;
  userId: string | null;
  metadata: unknown;
  createdAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  calculationId: string | null;
  duration: number | null;
}

// Review Queue
export interface ReviewQueue {
  id: string;
  calculationId: string;
  assignedTo: string | null;
  priority: Priority;
  status: ReviewStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  resolution: string | null;
}

// Cache Invalidation
export interface CacheInvalidation {
  id: string;
  cacheKey: string;
  reason: string | null;
  invalidatedAt: Date;
  invalidatedBy: string | null;
}

// RxCUI Mapping
export interface RxcuiMapping {
  id: string;
  drugName: string;
  strength: string | null;
  form: string | null;
  rxcui: string;
  source: string;
  confidence: number | null;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

// NDC Package
export interface NdcPackage {
  id: string;
  ndcCode: string;
  productNdc: string | null;
  proprietaryName: string;
  nonproprietaryName: string;
  genericName: string | null;
  dosageForm: string | null;
  routeName: string | null;
  strength: string | null;
  packageDescription: string | null;
  labelerName: string | null;
  substanceName: string | null;
  activeIngredient: string | null;
  finishedProductIndicator: boolean | null;
  marketingCategoryName: string | null;
  applicationNumber: string | null;
  startMarketingDate: Date | null;
  endMarketingDate: Date | null;
  deaSchedule: string | null;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  lastVerified: Date | null;
  rxcui: string | null;
}
