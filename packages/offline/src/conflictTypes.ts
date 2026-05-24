/**
 * Conflict Types — Offline POS (Sprint 5)
 *
 * Shared enum for the frontend (IndexedDB) and backend (serverSyncConflicts).
 * Frontend uses this to render severity badges, resolution UI, and retry policy.
 */

// ── Conflict type enum ────────────────────────────────────────────────────────

export const ConflictType = {
  PRODUCT_INACTIVE:          'PRODUCT_INACTIVE',
  PRODUCT_NOT_FOUND:         'PRODUCT_NOT_FOUND',
  PRICE_CHANGED:             'PRICE_CHANGED',
  STOCK_INSUFFICIENT:        'STOCK_INSUFFICIENT',
  ORDER_DUPLICATE:           'ORDER_DUPLICATE',
  PAYMENT_DUPLICATE:         'PAYMENT_DUPLICATE',
  TENANT_FEATURE_DISABLED:   'TENANT_FEATURE_DISABLED',
  ORDER_TYPE_DISABLED:       'ORDER_TYPE_DISABLED',
  TABLE_UNAVAILABLE:         'TABLE_UNAVAILABLE',
  TERMINAL_INACTIVE:         'TERMINAL_INACTIVE',
  SYNC_CONFLICT:             'SYNC_CONFLICT',          // generic fallback
} as const;

export type ConflictType = typeof ConflictType[keyof typeof ConflictType];

// ── Severity ──────────────────────────────────────────────────────────────────

export type ConflictSeverity = 'warning' | 'needs_review' | 'blocking';

export const CONFLICT_SEVERITY: Record<ConflictType, ConflictSeverity> = {
  PRODUCT_INACTIVE:        'blocking',
  PRODUCT_NOT_FOUND:       'blocking',
  PRICE_CHANGED:           'warning',
  STOCK_INSUFFICIENT:      'warning',
  ORDER_DUPLICATE:         'needs_review',
  PAYMENT_DUPLICATE:       'needs_review',
  TENANT_FEATURE_DISABLED: 'blocking',
  ORDER_TYPE_DISABLED:     'blocking',
  TABLE_UNAVAILABLE:       'warning',
  TERMINAL_INACTIVE:       'blocking',
  SYNC_CONFLICT:           'needs_review',
};

// ── Resolution policy ─────────────────────────────────────────────────────────

export type ResolverPolicy =
  | 'auto_accept'       // accepted silently, no action needed
  | 'audit_note'        // accepted but flagged for review (price drift, stock warn)
  | 'manual_review'     // owner/manager must explicitly resolve
  | 'retry'             // should be retried (transient error)
  | 'discard';          // cannot be replayed

export const CONFLICT_RESOLVER_POLICY: Record<ConflictType, ResolverPolicy> = {
  PRODUCT_INACTIVE:        'discard',
  PRODUCT_NOT_FOUND:       'discard',
  PRICE_CHANGED:           'audit_note',
  STOCK_INSUFFICIENT:      'audit_note',
  ORDER_DUPLICATE:         'auto_accept',
  PAYMENT_DUPLICATE:       'auto_accept',
  TENANT_FEATURE_DISABLED: 'discard',
  ORDER_TYPE_DISABLED:     'discard',
  TABLE_UNAVAILABLE:       'audit_note',
  TERMINAL_INACTIVE:       'discard',
  SYNC_CONFLICT:           'manual_review',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getSeverity(type: string): ConflictSeverity {
  return CONFLICT_SEVERITY[type as ConflictType] ?? 'needs_review';
}

export function getPolicy(type: string): ResolverPolicy {
  return CONFLICT_RESOLVER_POLICY[type as ConflictType] ?? 'manual_review';
}

export function isAutoResolvable(type: string): boolean {
  const policy = getPolicy(type);
  return policy === 'auto_accept' || policy === 'audit_note';
}

export function conflictLabel(type: string): string {
  const labels: Record<string, string> = {
    PRODUCT_INACTIVE:        'Produk Tidak Aktif',
    PRODUCT_NOT_FOUND:       'Produk Tidak Ditemukan',
    PRICE_CHANGED:           'Harga Berubah',
    STOCK_INSUFFICIENT:      'Stok Tidak Cukup',
    ORDER_DUPLICATE:         'Order Duplikat',
    PAYMENT_DUPLICATE:       'Pembayaran Duplikat',
    TENANT_FEATURE_DISABLED: 'Fitur Dinonaktifkan',
    ORDER_TYPE_DISABLED:     'Tipe Order Dinonaktifkan',
    TABLE_UNAVAILABLE:       'Meja Tidak Tersedia',
    TERMINAL_INACTIVE:       'Terminal Dinonaktifkan',
    SYNC_CONFLICT:           'Konflik Sinkronisasi',
  };
  return labels[type] ?? type;
}
