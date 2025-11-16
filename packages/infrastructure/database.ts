/**
 * Database Connection
 * Drizzle ORM setup with Neon PostgreSQL
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../../shared/schema';

// Get database URL from environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create Neon HTTP client
const sql = neon(DATABASE_URL);

// Initialize Drizzle with schema
export const db = drizzle(sql, { schema });

export type Database = typeof db;
