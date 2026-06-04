import { Request, Response, NextFunction } from 'express';
import { db } from '@pos/infrastructure/database';
import { tenants } from '@shared/schema';
import { eq, or } from 'drizzle-orm';
import { cacheKeys, getCacheJson, setCacheJson } from '../../services/distributedCache';
import { invalidateTenantResolutionCache } from '../../services/cacheInvalidation';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      tenantSlug?: string;
      authTenantUser?: {
        id: string;
        tenantId: string | null;
        role: string | null;
      };
    }
  }
}

const BASE_DOMAIN = process.env.BASE_DOMAIN || 'aurapos.my.id';
const TENANT_HEADER_SERVICE_TOKEN_HEADER = 'x-tenant-service-token';

const RESERVED_SLUGS = new Set([
  'www','api','app','admin','mail','ftp','ssh','dev','staging','test','demo',
  'cdn','media','assets','static','dashboard','manage','account','auth',
  'login','register','signup','help','support','status','blog','docs',
]);

function extractSlugFromHost(hostname: string): string | null {
  const host = (hostname || '').split(':')[0];
  if (!host.endsWith(`.${BASE_DOMAIN}`)) return null;
  const slug = host.slice(0, -(BASE_DOMAIN.length + 1));
  if (!slug || RESERVED_SLUGS.has(slug)) return null;
  return slug;
}

// ── Shared tenant resolution cache (TTL: 60s) ───────────────────────────────
// Reduces DB queries on every request. Entries are invalidated on tenant update
// through the instance-safe cache invalidation channel.
interface TenantCacheEntry {
  id: string;
  slug: string;
  isActive: boolean;
}

const TENANT_CACHE_TTL_SECONDS = 60;

async function getCachedTenant(key: string): Promise<TenantCacheEntry | null> {
  return getCacheJson<TenantCacheEntry>(cacheKeys.tenant(key));
}

async function setCachedTenant(key: string, entry: TenantCacheEntry): Promise<void> {
  await setCacheJson(cacheKeys.tenant(key), entry, TENANT_CACHE_TTL_SECONDS);
}

function getFirstHeaderValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// UUID v4 regex — used to distinguish a UUID lookup from a slug lookup.
// If the caller provides a value that looks like a UUID attempt (has hyphens)
// but does not match the full pattern, we return 400 rather than letting
// PostgreSQL throw "invalid input syntax for type uuid".
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

// A value is a "UUID attempt" if it has 2+ hyphen-separated segments but
// fails the full UUID pattern check.
// A UUID has exactly 4 hyphens; slugs typically have at most 1 hyphen.
// We use >= 2 hyphens as the threshold so common slugs like "demo-tenant"
// (1 hyphen) pass through safely to a slug-only DB query, while values like
// "not-a-uuid" (2 hyphens) or truncated UUIDs (3-4 hyphens) are rejected
// early with 400 instead of causing a PostgreSQL "invalid input syntax for
// type uuid" error.
function looksLikeUuidAttempt(value: string): boolean {
  const hyphenCount = (value.match(/-/g) ?? []).length;
  return hyphenCount >= 2 && !isValidUuid(value);
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function isTenantHeaderFallbackAllowed(req: Request): boolean {
  if (!isProduction()) return process.env.ALLOW_TENANT_HEADER !== 'false';

  const serviceToken = process.env.TENANT_HEADER_SERVICE_TOKEN?.trim();
  if (!serviceToken) return false;

  const providedToken = getFirstHeaderValue(req.headers[TENANT_HEADER_SERVICE_TOKEN_HEADER])?.trim();
  return providedToken === serviceToken;
}

function tenantHeaderDisabledMessage(): string {
  return 'x-tenant-id/tenant_id fallback is disabled in production; use tenant subdomain or a configured tenant service token';
}

interface AuthSessionLike {
  user?: {
    id?: string;
  } | null;
}

interface TenantAuthUser {
  id: string;
  tenantId: string | null;
  role: string | null;
}

interface TenantAuthGuardDeps {
  getSession?: (req: Request) => Promise<AuthSessionLike | null>;
  getUserById?: (userId: string) => Promise<TenantAuthUser | null>;
}

async function defaultGetSession(req: Request): Promise<AuthSessionLike | null> {
  const { fromNodeHeaders } = await import('better-auth/node');
  const { auth } = await import('../../lib/auth');

  return auth.api.getSession({ headers: fromNodeHeaders(req.headers) }) as Promise<AuthSessionLike | null>;
}

async function defaultGetUserById(userId: string): Promise<TenantAuthUser | null> {
  const { sql } = await import('drizzle-orm');
  const { authDb } = await import('../../lib/auth');

  const rows = await authDb.execute(
    sql`SELECT id, tenant_id, role FROM "user" WHERE id = ${userId} LIMIT 1`,
  );
  const row = (rows as any[])[0];
  if (!row) return null;
  return {
    id: String(row.id),
    tenantId: row.tenant_id ?? null,
    role: row.role ?? null,
  };
}

function isPlatformAdmin(role: string | null | undefined): boolean {
  return role === 'platform-admin';
}

async function resolveTenantFromAuthenticatedSession(req: Request): Promise<TenantAuthUser | null> {
  const session = await defaultGetSession(req);
  const userId = session?.user?.id;
  if (!userId) return null;

  const user = await defaultGetUserById(userId);
  if (!user?.tenantId) return null;
  return user;
}

export function createTenantAuthGuard(deps: TenantAuthGuardDeps = {}) {
  const getSession = deps.getSession ?? defaultGetSession;
  const getUserById = deps.getUserById ?? defaultGetUserById;

  return async function tenantAuthGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = await getSession(req);
      const userId = session?.user?.id;

      // Only authenticated requests are tenant-compared. Existing public/device
      // tenant-scoped routes can continue to use their own auth mechanisms.
      if (!userId) {
        next();
        return;
      }

      const user = await getUserById(userId);
      if (!user) {
        res.status(401).json({
          error: 'Unauthenticated',
          message: 'Authenticated session user was not found',
          code: 'AUTH_USER_NOT_FOUND',
        });
        return;
      }

      req.authTenantUser = user;

      if (isPlatformAdmin(user.role)) {
        next();
        return;
      }

      if (!user.tenantId) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Authenticated user is not linked to a tenant',
          code: 'AUTH_USER_TENANT_MISSING',
        });
        return;
      }

      if (req.tenantId !== user.tenantId) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Authenticated user cannot access a different tenant',
          code: 'TENANT_MISMATCH',
        });
        return;
      }

      next();
    } catch (err) {
      console.error('Tenant auth guard error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

export const tenantAuthGuard = createTenantAuthGuard();

/** Call this after updating a tenant to invalidate cache */
export function invalidateTenantCache(slugOrId: string): void {
  void invalidateTenantResolutionCache(slugOrId, [slugOrId]);
}

export async function tenantMiddleware(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const hostname =
      (req.headers['x-forwarded-host'] as string)?.split(',')[0]?.trim() ||
      req.hostname ||
      (req.headers.host as string) || '';

    const slug = extractSlugFromHost(hostname);

    // ── 1. Subdomain: {slug}.aurapos.my.id ───────────────────────────────────
    if (slug) {
      const cached = await getCachedTenant(slug);
      if (cached) {
        if (!cached.isActive) { res.status(403).json({ error: 'Tenant inactive' }); return; }
        req.tenantId = cached.id;
        req.tenantSlug = slug;
        return next();
      }

      const rows = await db.select({ id: tenants.id, slug: tenants.slug, isActive: tenants.isActive }).from(tenants).where(eq(tenants.slug, slug)).limit(1);
      if (!rows.length) { res.status(404).json({ error: 'Tenant not found', slug }); return; }
      if (!rows[0].isActive) { res.status(403).json({ error: 'Tenant inactive' }); return; }

      await setCachedTenant(slug, { id: rows[0].id, slug: rows[0].slug, isActive: rows[0].isActive });
      await setCachedTenant(rows[0].id, { id: rows[0].id, slug: rows[0].slug, isActive: rows[0].isActive });

      req.tenantId = rows[0].id;
      req.tenantSlug = slug;
      return next();
    }

    // ── 2. Authenticated session: server-owned tenant authority ───────────────
    const sessionUser = await resolveTenantFromAuthenticatedSession(req);
    if (sessionUser?.tenantId) {
      req.tenantId = sessionUser.tenantId;
      req.authTenantUser = sessionUser;

      const cached = await getCachedTenant(sessionUser.tenantId);
      if (cached) {
        if (!cached.isActive) { res.status(403).json({ error: 'Tenant inactive' }); return; }
        req.tenantSlug = cached.slug;
        return next();
      }

      const rows = await db.select({ id: tenants.id, slug: tenants.slug, isActive: tenants.isActive }).from(tenants)
        .where(eq(tenants.id, sessionUser.tenantId)).limit(1);

      if (!rows.length) { res.status(404).json({ error: 'Tenant not found' }); return; }
      if (!rows[0].isActive) { res.status(403).json({ error: 'Tenant inactive' }); return; }

      await setCachedTenant(rows[0].id, { id: rows[0].id, slug: rows[0].slug, isActive: rows[0].isActive });
      await setCachedTenant(rows[0].slug, { id: rows[0].id, slug: rows[0].slug, isActive: rows[0].isActive });

      req.tenantId = rows[0].id;
      req.tenantSlug = rows[0].slug;
      return next();
    }

    // ── 3. Header / query fallback (dev, service/device client) ─────────────
    const headerTenantId = getFirstHeaderValue(req.headers['x-tenant-id'])?.trim();
    const queryTenantId = typeof req.query.tenant_id === 'string' ? req.query.tenant_id.trim() : undefined;
    const requestedFallbackTenantId = headerTenantId || queryTenantId;
    const allowTenantHeader = isTenantHeaderFallbackAllowed(req);

    if (requestedFallbackTenantId && !allowTenantHeader) {
      res.status(403).json({
        error: 'Tenant header disabled',
        message: tenantHeaderDisabledMessage(),
        code: 'TENANT_HEADER_DISABLED',
      });
      return;
    }

    const tenantId = allowTenantHeader ? requestedFallbackTenantId : undefined;

    if (!tenantId) {
      res.status(400).json({ error: 'Missing tenant', message: 'Use tenant subdomain, authenticated session, or an approved tenant context token' });
      return;
    }

    // Guard: if the caller provided something that looks like a malformed UUID
    // (has hyphens but doesn't match the UUID pattern) we must reject it
    // BEFORE querying. Letting PostgreSQL try to cast an invalid UUID string
    // to the uuid column type produces an unhandled 500 ("invalid input syntax
    // for type uuid"). Return 400 with a clear message instead.
    if (looksLikeUuidAttempt(tenantId)) {
      res.status(400).json({
        error: 'Invalid tenant identifier',
        message: 'The provided tenant identifier is not a valid UUID or slug.',
        code: 'INVALID_TENANT_ID',
      });
      return;
    }

    const cached = await getCachedTenant(tenantId);
    if (cached) {
      if (!cached.isActive) { res.status(403).json({ error: 'Tenant inactive' }); return; }
      req.tenantId = cached.id;
      req.tenantSlug = cached.slug;
      return next();
    }

    // Use UUID-aware query to avoid PostgreSQL type-cast errors:
    // only include the id equality when the value is a valid UUID.
    const whereCondition = isValidUuid(tenantId)
      ? or(eq(tenants.id, tenantId), eq(tenants.slug, tenantId))
      : eq(tenants.slug, tenantId);

    const rows = await db.select({ id: tenants.id, slug: tenants.slug, isActive: tenants.isActive }).from(tenants)
      .where(whereCondition).limit(1);

    if (!rows.length) { res.status(404).json({ error: 'Tenant not found' }); return; }
    if (!rows[0].isActive) { res.status(403).json({ error: 'Tenant inactive' }); return; }

    await setCachedTenant(tenantId, { id: rows[0].id, slug: rows[0].slug, isActive: rows[0].isActive });
    await setCachedTenant(rows[0].id, { id: rows[0].id, slug: rows[0].slug, isActive: rows[0].isActive });
    await setCachedTenant(rows[0].slug, { id: rows[0].id, slug: rows[0].slug, isActive: rows[0].isActive });

    req.tenantId = rows[0].id;
    req.tenantSlug = rows[0].slug;
    next();
  } catch (err) {
    console.error('Tenant middleware error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
