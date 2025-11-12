/**
 * Drizzle database client
 * Serverless-optimized connection for Neon PostgreSQL
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { getConfig } from '$lib/utils/config';
import * as schema from './schema';

// Create a singleton connection
let db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!db) {
    const config = getConfig();

    // Create postgres connection
    // For serverless: use pooled connection with lower limits
    const client = postgres(config.database.url, {
      max: config.database.poolMax || 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });

    db = drizzle(client, { schema });
  }

  return db;
}

export { schema };
export type * from './schema';
