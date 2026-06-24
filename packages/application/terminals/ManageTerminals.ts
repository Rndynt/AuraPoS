import type { TerminalRepositoryPort, TerminalRecord } from './ports/TerminalRepositoryPort';

export class TerminalNotFoundError extends Error {
  readonly code = 'TERMINAL_NOT_FOUND';

  constructor(message = 'Terminal not found') {
    super(message);
    this.name = 'TerminalNotFoundError';
  }
}

export interface TerminalContext {
  tenantId: string;
  outletId?: string | null;
}

export interface RegisterTerminalInput extends TerminalContext {
  terminalCode: string;
  name?: string;
  deviceFingerprint?: string | null;
}

export class ManageTerminals {
  constructor(private readonly terminalRepository: TerminalRepositoryPort) {}

  async register(input: RegisterTerminalInput): Promise<TerminalRecord> {
    const tenantId = this.requireTenant(input.tenantId);
    const terminalCode = input.terminalCode.trim();
    if (!terminalCode) throw new Error('Terminal code is required');

    const terminal = await this.terminalRepository.register({
      tenantId,
      outletId: input.outletId ?? null,
      terminalCode,
      name: input.name?.trim() || 'Cashier',
      deviceFingerprint: input.deviceFingerprint ?? null,
      seenAt: new Date(),
    });

    if (!terminal) throw new Error('Failed to register terminal');
    return terminal;
  }

  async heartbeat(input: TerminalContext & { id: string }) {
    const terminal = await this.terminalRepository.updateHeartbeat({
      tenantId: this.requireTenant(input.tenantId),
      outletId: input.outletId ?? null,
      id: this.requireId(input.id),
      seenAt: new Date(),
    });

    if (!terminal) throw new TerminalNotFoundError('Terminal not found or inactive');
    return terminal;
  }

  async list(input: TerminalContext): Promise<TerminalRecord[]> {
    return this.terminalRepository.list({
      tenantId: this.requireTenant(input.tenantId),
      outletId: input.outletId ?? null,
    });
  }

  async deactivate(input: TerminalContext & { id: string }) {
    const terminal = await this.terminalRepository.deactivate({
      tenantId: this.requireTenant(input.tenantId),
      outletId: input.outletId ?? null,
      id: this.requireId(input.id),
      updatedAt: new Date(),
    });

    if (!terminal) throw new TerminalNotFoundError();
    return terminal;
  }

  private requireTenant(tenantId: string): string {
    if (!tenantId?.trim()) throw new Error('Tenant context is required');
    return tenantId.trim();
  }

  private requireId(id: string): string {
    if (!id?.trim()) throw new Error('Terminal ID is required');
    return id.trim();
  }
}
