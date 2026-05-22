/**
 * Subdomain utility
 * Deteksi slug tenant dari hostname browser.
 */

const BASE_DOMAIN = import.meta.env.VITE_BASE_DOMAIN || 'aurapos.my.id';

const RESERVED = new Set([
  'www','api','app','admin','mail','dev','staging','test','demo',
  'cdn','static','dashboard','account','auth','login','register',
]);

/**
 * Kembalikan slug tenant dari subdomain saat ini.
 * Contoh: "thamada.aurapos.my.id" → "thamada"
 * Kembalikan null jika bukan subdomain tenant (localhost, root domain, dev).
 */
export function getSubdomainSlug(): string | null {
  if (typeof window === 'undefined') return null;
  const hostname = window.location.hostname;

  if (hostname.endsWith(`.${BASE_DOMAIN}`)) {
    const slug = hostname.slice(0, -(BASE_DOMAIN.length + 1));
    if (slug && !RESERVED.has(slug)) return slug;
  }
  return null;
}

/**
 * Apakah saat ini sedang berjalan di subdomain tenant?
 */
export function isOnTenantSubdomain(): boolean {
  return getSubdomainSlug() !== null;
}

/**
 * Resolve tenantId dari slug via API.
 */
export async function resolveTenantBySlug(slug: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/tenants/by-slug/${slug}`);
    if (!res.ok) return null;
    const body = await res.json();
    return body?.data?.id ?? null;
  } catch {
    return null;
  }
}
