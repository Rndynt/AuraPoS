/**
 * Base Repository
 * Abstract base class providing tenant isolation and common CRUD operations
 */

import { Database } from '../database';
import { SQL, and, eq } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';

/**
 * Repository error for consistent error handling
 */
export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}

/**
 * Base repository interface for all repositories
 */
export interface IBaseRepository<T> {
  findById(id: string, tenantId?: string): Promise<T | null>;
}

/**
 * Abstract base repository providing common functionality
 * @template T - The entity type
 * @template TInsert - The insert type
 */
export abstract class BaseRepository<T, TInsert = Partial<T>> {
  protected db: Database;
  protected abstract table: PgTable;
  protected abstract entityName: string;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Build tenant filter condition
   */
  protected tenantFilter(tenantId: string): SQL {
    return eq((this.table as any).tenantId, tenantId);
  }

  /**
   * Automatically inject tenant_id into create data
   */
  protected injectTenantId<D extends Record<string, any>>(
    data: D,
    tenantId: string
  ): D & { tenantId: string } {
    return {
      ...data,
      tenantId,
    };
  }

  /**
   * Handle repository errors with consistent formatting
   */
  protected handleError(operation: string, error: unknown): never {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new RepositoryError(
      `Failed to ${operation} ${this.entityName}: ${message}`,
      `${operation.toUpperCase()}_FAILED`,
      error
    );
  }

  /**
   * Ensure tenant isolation - validates tenant access
   */
  protected async ensureTenantAccess(
    id: string,
    tenantId: string
  ): Promise<void> {
    try {
      const result = await this.db
        .select()
        .from(this.table)
        .where(
          and(
            eq((this.table as any).id, id),
            eq((this.table as any).tenantId, tenantId)
          )
        )
        .limit(1);

      if (!result || result.length === 0) {
        throw new RepositoryError(
          `${this.entityName} not found or access denied`,
          'NOT_FOUND',
          null
        );
      }
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      this.handleError('validate access to', error);
    }
  }
}
