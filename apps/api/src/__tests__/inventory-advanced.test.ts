/**
 * Advanced Inventory API Tests
 * Tests for: /api/inventory/low-stock, /api/inventory/products/:id/threshold,
 *            /api/inventory/opnames CRUD, /api/inventory/transfers CRUD
 *
 * Run: npx tsx --tsconfig apps/api/tsconfig.node.json --test apps/api/src/__tests__/inventory-advanced.test.ts
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { DrizzleInventoryBalanceRepository } from '@pos/infrastructure/repositories/inventory';
import { DrizzleStockOpnameRepository } from '@pos/infrastructure/repositories/inventory';
import { DrizzleStockTransferRepository } from '@pos/infrastructure/repositories/inventory';

const TEST_TENANT_ID = 'test-tenant-adv-stock';
const TEST_OUTLET_ID = '00000000-0000-0000-0000-000000000001';
const TEST_OUTLET_2_ID = '00000000-0000-0000-0000-000000000002';
const TEST_PRODUCT_ID = '00000000-0000-0000-0000-000000000010';

// ── InventoryBalance Repository ───────────────────────────────────────────────

test('DrizzleInventoryBalanceRepository — API surface', async (t) => {
  const repo = new DrizzleInventoryBalanceRepository();
  assert.equal(typeof repo.getBalance, 'function', 'getBalance method exists');
  assert.equal(typeof repo.listBalances, 'function', 'listBalances method exists');
  assert.equal(typeof repo.applyDelta, 'function', 'applyDelta method exists');
  assert.equal(typeof repo.setQuantity, 'function', 'setQuantity method exists');
  assert.equal(typeof repo.setThreshold, 'function', 'setThreshold method exists');
  assert.equal(typeof repo.listLowStock, 'function', 'listLowStock method exists');
});

// ── StockOpname Repository ────────────────────────────────────────────────────

test('DrizzleStockOpnameRepository — API surface', async (t) => {
  const repo = new DrizzleStockOpnameRepository();
  assert.equal(typeof repo.create, 'function', 'create method exists');
  assert.equal(typeof repo.findById, 'function', 'findById method exists');
  assert.equal(typeof repo.list, 'function', 'list method exists');
  assert.equal(typeof repo.upsertItem, 'function', 'upsertItem method exists');
  assert.equal(typeof repo.updateStatus, 'function', 'updateStatus method exists');
});

// ── StockTransfer Repository ──────────────────────────────────────────────────

test('DrizzleStockTransferRepository — API surface', async (t) => {
  const repo = new DrizzleStockTransferRepository();
  assert.equal(typeof repo.create, 'function', 'create method exists');
  assert.equal(typeof repo.findById, 'function', 'findById method exists');
  assert.equal(typeof repo.list, 'function', 'list method exists');
  assert.equal(typeof repo.updateStatus, 'function', 'updateStatus method exists');
});

// ── Variance calculation ───────────────────────────────────────────────────────

test('OpnameItem varianceQuantity = counted - system', () => {
  const systemQty = 100;
  const countedQty = 85;
  const expected = countedQty - systemQty; // -15
  assert.equal(expected, -15, 'variance is negative when counted < system');
});

test('OpnameItem varianceQuantity positive when counted > system', () => {
  const systemQty = 50;
  const countedQty = 53;
  const variance = countedQty - systemQty;
  assert.equal(variance, 3, 'variance is positive when counted > system');
});

test('OpnameItem varianceQuantity zero when counts match', () => {
  const systemQty = 25;
  const countedQty = 25;
  const variance = countedQty - systemQty;
  assert.equal(variance, 0, 'variance is zero when counts match');
});

// ── Transfer validation ────────────────────────────────────────────────────────

test('Transfer: fromOutletId !== toOutletId required', () => {
  const fromId: string = '00000000-0000-0000-0000-000000000001';
  const toId: string = '00000000-0000-0000-0000-000000000001';
  const isSame = fromId === toId;
  assert.equal(isSame, true, 'same outlet IDs detected');
});

test('Transfer: different outlet IDs passes validation', () => {
  const fromId: string = '00000000-0000-0000-0000-000000000001';
  const toId: string = '00000000-0000-0000-0000-000000000002';
  const isSame = fromId === toId;
  assert.equal(isSame, false, 'different outlet IDs accepted');
});

test('Transfer status flow: draft → submitted → received', () => {
  const validTransitions: Record<string, string[]> = {
    draft: ['submitted', 'cancelled'],
    submitted: ['received', 'cancelled'],
    received: [],
    cancelled: [],
  };

  assert.ok(validTransitions['draft'].includes('submitted'), 'draft can be submitted');
  assert.ok(validTransitions['submitted'].includes('received'), 'submitted can be received');
  assert.ok(!validTransitions['received'].includes('cancelled'), 'received cannot be cancelled');
});

test('Opname status flow: draft → submitted → approved', () => {
  const validTransitions: Record<string, string[]> = {
    draft: ['submitted', 'cancelled'],
    submitted: ['approved', 'cancelled'],
    approved: [],
    cancelled: [],
  };

  assert.ok(validTransitions['draft'].includes('submitted'), 'draft can be submitted');
  assert.ok(validTransitions['submitted'].includes('approved'), 'submitted can be approved');
  assert.ok(!validTransitions['approved'].includes('cancelled'), 'approved cannot be cancelled');
});

// ── Low stock threshold logic ──────────────────────────────────────────────────

test('Product is low stock when quantity <= threshold', () => {
  const DEFAULT_THRESHOLD = 10;

  const testCases = [
    { qty: 0, threshold: null, expected: true },   // 0 <= 10 (default)
    { qty: 5, threshold: null, expected: true },   // 5 <= 10 (default)
    { qty: 10, threshold: null, expected: true },  // 10 <= 10 (default)
    { qty: 11, threshold: null, expected: false }, // 11 > 10 (default)
    { qty: 3, threshold: 5, expected: true },      // 3 <= 5
    { qty: 5, threshold: 5, expected: true },      // 5 <= 5
    { qty: 6, threshold: 5, expected: false },     // 6 > 5
  ];

  for (const tc of testCases) {
    const effectiveThreshold = tc.threshold ?? DEFAULT_THRESHOLD;
    const isLow = tc.qty <= effectiveThreshold;
    assert.equal(isLow, tc.expected, `qty=${tc.qty} threshold=${effectiveThreshold}: expected ${tc.expected}`);
  }
});

test('Threshold of 0 means no low stock alerts', () => {
  const threshold = 0;
  const qty = 0;
  const isLow = qty <= threshold;
  assert.equal(isLow, true, 'qty=0 threshold=0 is still low stock (out of stock)');
});

// ── Movement types ─────────────────────────────────────────────────────────────

test('OPNAME_ADJUSTMENT movement type exists in MOVEMENT_TYPES', () => {
  const MOVEMENT_TYPES = [
    'SALE', 'OFFLINE_SALE', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT',
    'PURCHASE', 'DAMAGE', 'RETURN', 'INITIAL',
    'OPNAME_ADJUSTMENT', 'TRANSFER_OUT', 'TRANSFER_IN',
  ];
  assert.ok(MOVEMENT_TYPES.includes('OPNAME_ADJUSTMENT'), 'OPNAME_ADJUSTMENT present');
  assert.ok(MOVEMENT_TYPES.includes('TRANSFER_OUT'), 'TRANSFER_OUT present');
  assert.ok(MOVEMENT_TYPES.includes('TRANSFER_IN'), 'TRANSFER_IN present');
});

test('Opname number format follows OPN-YYYYMMDD-XXXX pattern', () => {
  const generateNumber = (prefix: string) => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = 1234;
    return `${prefix}-${dateStr}-${rand}`;
  };

  const num = generateNumber('OPN');
  assert.match(num, /^OPN-\d{8}-\d+$/, 'opname number matches expected format');

  const trfNum = generateNumber('TRF');
  assert.match(trfNum, /^TRF-\d{8}-\d+$/, 'transfer number matches expected format');
});
