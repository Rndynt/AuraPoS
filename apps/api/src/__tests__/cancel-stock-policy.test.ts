import '../../register-paths';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const { shouldRestoreStockOnCancel } = await import('@pos/application/orders/services/CancelOrderWorkflow');

describe('cancel stock restoration policy', () => {
  it('does not restore stock for unpaid confirmed orders because stock was never deducted', () => {
    assert.equal(
      shouldRestoreStockOnCancel({ status: 'confirmed', payment_status: 'unpaid' }),
      false,
    );
  });

  it('restores stock for partially paid orders in deducted lifecycle states', () => {
    assert.equal(
      shouldRestoreStockOnCancel({ status: 'confirmed', payment_status: 'partial' }),
      true,
    );
  });

  it('restores stock for paid orders in deducted lifecycle states', () => {
    assert.equal(
      shouldRestoreStockOnCancel({ status: 'served', paymentStatus: 'paid' }),
      true,
    );
  });
});
