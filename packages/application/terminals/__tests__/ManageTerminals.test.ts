import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ManageTerminals, TerminalNotFoundError } from '../ManageTerminals';
import type { TerminalRepositoryPort, RegisterTerminalData, TerminalScope } from '../ports/TerminalRepositoryPort';

function createRepo(overrides: Partial<TerminalRepositoryPort> = {}) {
  const calls: { register?: RegisterTerminalData; heartbeat?: TerminalScope & { id: string; seenAt: Date }; list?: TerminalScope; deactivate?: TerminalScope & { id: string; updatedAt: Date } } = {};
  const repo: TerminalRepositoryPort = {
    async register(input) {
      calls.register = input;
      return {
        id: 'terminal-1',
        tenantId: input.tenantId,
        terminalCode: input.terminalCode,
        name: input.name,
        deviceFingerprint: input.deviceFingerprint ?? null,
        outletId: input.outletId ?? null,
        isActive: true,
        lastSeenAt: input.seenAt,
      };
    },
    async updateHeartbeat(input) {
      calls.heartbeat = input;
      return { id: input.id, terminalCode: 'T-1', name: 'Cashier', lastSeenAt: input.seenAt };
    },
    async list(input) {
      calls.list = input;
      return [];
    },
    async deactivate(input) {
      calls.deactivate = input;
      return { id: input.id, terminalCode: 'T-1', name: 'Cashier', isActive: false };
    },
    ...overrides,
  };
  return { repo, calls };
}

test('register scopes terminal mutation to tenant and outlet context', async () => {
  const { repo, calls } = createRepo();
  const useCase = new ManageTerminals(repo);

  await useCase.register({
    tenantId: 'tenant-a',
    outletId: 'outlet-a',
    terminalCode: '  POS-1 ',
    name: ' Front Cashier ',
    deviceFingerprint: 'fingerprint-1',
  });

  assert.equal(calls.register?.tenantId, 'tenant-a');
  assert.equal(calls.register?.outletId, 'outlet-a');
  assert.equal(calls.register?.terminalCode, 'POS-1');
  assert.equal(calls.register?.name, 'Front Cashier');
});

test('heartbeat does not fall back across tenant or outlet when repository returns no scoped record', async () => {
  const { repo, calls } = createRepo({ updateHeartbeat: async (input) => { calls.heartbeat = input; return null; } });
  const useCase = new ManageTerminals(repo);

  await assert.rejects(
    () => useCase.heartbeat({ tenantId: 'tenant-a', outletId: 'outlet-a', id: 'terminal-from-other-tenant' }),
    TerminalNotFoundError,
  );

  assert.equal(calls.heartbeat?.tenantId, 'tenant-a');
  assert.equal(calls.heartbeat?.outletId, 'outlet-a');
  assert.equal(calls.heartbeat?.id, 'terminal-from-other-tenant');
});

test('list propagates outlet scope so terminals from other outlets are excluded by adapter', async () => {
  const { repo, calls } = createRepo();
  const useCase = new ManageTerminals(repo);

  await useCase.list({ tenantId: 'tenant-a', outletId: 'outlet-b' });

  assert.deepEqual(calls.list, { tenantId: 'tenant-a', outletId: 'outlet-b' });
});

test('deactivate is mutation-sensitive and requires scoped terminal ownership', async () => {
  const { repo, calls } = createRepo({ deactivate: async (input) => { calls.deactivate = input; return null; } });
  const useCase = new ManageTerminals(repo);

  await assert.rejects(
    () => useCase.deactivate({ tenantId: 'tenant-a', outletId: 'outlet-a', id: 'terminal-from-other-outlet' }),
    TerminalNotFoundError,
  );

  assert.equal(calls.deactivate?.tenantId, 'tenant-a');
  assert.equal(calls.deactivate?.outletId, 'outlet-a');
  assert.equal(calls.deactivate?.id, 'terminal-from-other-outlet');
});
