/**
 * Base Repository
 * Abstract base class providing tenant isolation and common CRUD operations
 */
import { and, eq } from 'drizzle-orm';
/**
 * Repository error for consistent error handling
 */
export class RepositoryError extends Error {
    constructor(message, code, cause) {
        super(message);
        this.code = code;
        this.cause = cause;
        this.name = 'RepositoryError';
    }
}
/**
 * Abstract base repository providing common functionality
 * @template T - The entity type
 * @template TInsert - The insert type
 */
export class BaseRepository {
    constructor(db) {
        this.db = db;
    }
    /**
     * Build tenant filter condition
     */
    tenantFilter(tenantId) {
        return eq(this.table.tenantId, tenantId);
    }
    /**
     * Automatically inject tenant_id into create data
     */
    injectTenantId(data, tenantId) {
        return {
            ...data,
            tenantId,
        };
    }
    /**
     * Handle repository errors with consistent formatting
     */
    handleError(operation, error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new RepositoryError(`Failed to ${operation} ${this.entityName}: ${message}`, `${operation.toUpperCase()}_FAILED`, error);
    }
    /**
     * Ensure tenant isolation - validates tenant access
     */
    async ensureTenantAccess(id, tenantId) {
        try {
            const result = await this.db
                .select()
                .from(this.table)
                .where(and(eq(this.table.id, id), eq(this.table.tenantId, tenantId)))
                .limit(1);
            if (!result || result.length === 0) {
                throw new RepositoryError(`${this.entityName} not found or access denied`, 'NOT_FOUND', null);
            }
        }
        catch (error) {
            if (error instanceof RepositoryError)
                throw error;
            this.handleError('validate access to', error);
        }
    }
}
