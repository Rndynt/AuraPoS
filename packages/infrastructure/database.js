/**
 * Database Connection
 * Drizzle ORM setup with PostgreSQL
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../../shared/schema';
// Get database URL from environment
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}
// Create postgres client for proper .returning() support
const sql = postgres(DATABASE_URL);
// Initialize Drizzle with schema
export const db = drizzle(sql, { schema });
