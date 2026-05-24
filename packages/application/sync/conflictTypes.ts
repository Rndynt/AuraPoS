/**
 * Conflict Types — Backend Mirror (Sprint 5)
 *
 * Re-exports from the offline package so backend use cases can reference
 * the same enum without a cross-package import from a frontend package.
 */

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
  SYNC_CONFLICT:             'SYNC_CONFLICT',
} as const;

export type ConflictType = typeof ConflictType[keyof typeof ConflictType];

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

export type ResolverPolicy =
  | 'auto_accept'
  | 'audit_note'
  | 'manual_review'
  | 'retry'
  | 'discard';

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
