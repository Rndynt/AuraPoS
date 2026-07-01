/**
 * Soft stock-shortfall confirmation, run right before submitting a payment.
 *
 * This is deliberately advisory, never a hard block: basic stock tracking
 * must keep working with zero blocking regardless of plan/entitlement (see
 * DrizzleSubmitPOSPaymentRepository's allow-negative deduction). This helper
 * only gives the cashier a one-tap chance to catch an oversell before it
 * happens — they can always choose to proceed anyway.
 */
export type StockShortfall = { productId: string; productName: string; available: number; requested: number };

export function buildStockShortfallMessage(shortfalls: StockShortfall[]): string {
  const lines = shortfalls.map((s) =>
    s.available <= 0
      ? `• ${s.productName}: stok habis (diminta ${s.requested})`
      : `• ${s.productName}: stok tersisa ${s.available}, diminta ${s.requested}`,
  );
  return `Stok berikut tidak mencukupi:\n\n${lines.join("\n")}\n\nTetap lanjutkan pembayaran?`;
}

/**
 * Returns true if the cashier should proceed. Shows a native confirm when
 * there are shortfalls; returns true immediately (no dialog) when there are
 * none, so callers can await this unconditionally before submitting payment.
 */
export function confirmStockShortfalls(shortfalls: StockShortfall[]): boolean {
  if (shortfalls.length === 0) return true;
  return window.confirm(buildStockShortfallMessage(shortfalls));
}
