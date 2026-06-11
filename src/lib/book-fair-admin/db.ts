// Read-only Drizzle client for the IBF platform Postgres database (Neon).
// Uses the Neon HTTP driver: stateless per-query requests, no connection
// pooling concerns on serverless. Every interaction with this database
// must be a SELECT — see schema.ts.
import { neon } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';

const globalForDb = globalThis as unknown as {
  bookFairDb: NeonHttpDatabase | undefined;
};

export function getDb(): NeonHttpDatabase {
  if (globalForDb.bookFairDb) return globalForDb.bookFairDb;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const db = drizzle(neon(url));
  globalForDb.bookFairDb = db;
  return db;
}
