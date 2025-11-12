/**
 * User CRUD operations
 */

import { eq, and } from 'drizzle-orm';
import { getDb } from '../index';
import { users, type NewUser, type User } from '../schema';

// Create user
export async function createUser(data: NewUser): Promise<User> {
  const db = getDb();
  const [user] = await db.insert(users).values(data).returning();
  return user;
}

// Get user by ID
export async function getUserById(id: string): Promise<User | undefined> {
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user;
}

// Get user by email
export async function getUserByEmail(email: string): Promise<User | undefined> {
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user;
}

// Get user by Firebase UID
export async function getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid)).limit(1);
  return user;
}

// Update user
export async function updateUser(
  id: string,
  data: Partial<Omit<User, 'id' | 'createdAt'>>
): Promise<User | undefined> {
  const db = getDb();
  const [user] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return user;
}

// Delete user (soft delete by setting isActive to false)
export async function deactivateUser(id: string): Promise<User | undefined> {
  const db = getDb();
  const [user] = await db
    .update(users)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return user;
}

// Hard delete user
export async function deleteUser(id: string): Promise<void> {
  const db = getDb();
  await db.delete(users).where(eq(users.id, id));
}

// List all active users
export async function listActiveUsers(): Promise<User[]> {
  const db = getDb();
  return db.select().from(users).where(eq(users.isActive, true));
}

// Update last login timestamp
export async function updateLastLogin(id: string): Promise<User | undefined> {
  const db = getDb();
  const [user] = await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return user;
}
