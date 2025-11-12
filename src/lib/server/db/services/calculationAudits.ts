/**
 * Calculation Audit CRUD operations
 */

import { eq, and, desc, gte, lte } from 'drizzle-orm';
import { getDb } from '../index';
import { calculationAudits, type NewCalculationAudit, type CalculationAudit } from '../schema';

// Create calculation audit
export async function createCalculationAudit(
  data: NewCalculationAudit
): Promise<CalculationAudit> {
  const db = getDb();
  const [audit] = await db.insert(calculationAudits).values(data).returning();
  return audit;
}

// Get calculation audit by ID
export async function getCalculationAuditById(
  id: string
): Promise<CalculationAudit | undefined> {
  const db = getDb();
  const [audit] = await db
    .select()
    .from(calculationAudits)
    .where(eq(calculationAudits.id, id))
    .limit(1);
  return audit;
}

// List calculation audits by user
export async function listCalculationAuditsByUser(userId: string): Promise<CalculationAudit[]> {
  const db = getDb();
  return db
    .select()
    .from(calculationAudits)
    .where(eq(calculationAudits.userId, userId))
    .orderBy(desc(calculationAudits.createdAt));
}

// List calculation audits by status
export async function listCalculationAuditsByStatus(
  status: 'pending' | 'approved' | 'rejected'
): Promise<CalculationAudit[]> {
  const db = getDb();
  return db
    .select()
    .from(calculationAudits)
    .where(eq(calculationAudits.status, status))
    .orderBy(desc(calculationAudits.createdAt));
}

// List recent calculation audits
export async function listRecentCalculationAudits(limit: number = 100): Promise<CalculationAudit[]> {
  const db = getDb();
  return db
    .select()
    .from(calculationAudits)
    .orderBy(desc(calculationAudits.createdAt))
    .limit(limit);
}

// List calculation audits by date range
export async function listCalculationAuditsByDateRange(
  startDate: Date,
  endDate: Date
): Promise<CalculationAudit[]> {
  const db = getDb();
  return db
    .select()
    .from(calculationAudits)
    .where(
      and(
        gte(calculationAudits.createdAt, startDate),
        lte(calculationAudits.createdAt, endDate)
      )
    )
    .orderBy(desc(calculationAudits.createdAt));
}

// Update calculation audit status
export async function updateCalculationAuditStatus(
  id: string,
  status: 'pending' | 'approved' | 'rejected'
): Promise<CalculationAudit | undefined> {
  const db = getDb();
  const [audit] = await db
    .update(calculationAudits)
    .set({ status })
    .where(eq(calculationAudits.id, id))
    .returning();
  return audit;
}

// Delete calculation audit
export async function deleteCalculationAudit(id: string): Promise<void> {
  const db = getDb();
  await db.delete(calculationAudits).where(eq(calculationAudits.id, id));
}

// Get calculation audits with low confidence
export async function getCalculationAuditsWithLowConfidence(
  threshold: number = 0.7
): Promise<CalculationAudit[]> {
  const db = getDb();
  return db
    .select()
    .from(calculationAudits)
    .where(lte(calculationAudits.confidenceScore, threshold))
    .orderBy(desc(calculationAudits.createdAt));
}
