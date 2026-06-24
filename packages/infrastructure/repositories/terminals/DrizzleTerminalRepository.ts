import { and, eq } from 'drizzle-orm';
import type { RegisterTerminalData, TerminalRepositoryPort, TerminalScope } from '@pos/application/terminals/ports';
import { terminals } from '@pos/infrastructure/db/schema';
import type { DbClient } from '@pos/infrastructure/database';

export class DrizzleTerminalRepository implements TerminalRepositoryPort {
  constructor(private readonly db: DbClient) {}

  async register(input: RegisterTerminalData) {
    const [terminal] = await this.db
      .insert(terminals)
      .values({
        tenantId: input.tenantId,
        outletId: input.outletId ?? null,
        terminalCode: input.terminalCode,
        name: input.name,
        deviceFingerprint: input.deviceFingerprint ?? null,
        lastSeenAt: input.seenAt,
      })
      .onConflictDoUpdate({
        target: [terminals.tenantId, terminals.terminalCode],
        set: {
          name: input.name,
          deviceFingerprint: input.deviceFingerprint ?? undefined,
          outletId: input.outletId ?? null,
          lastSeenAt: input.seenAt,
          updatedAt: input.seenAt,
        },
      })
      .returning();

    return terminal ?? null;
  }

  async updateHeartbeat(input: TerminalScope & { id: string; seenAt: Date }) {
    const [terminal] = await this.db
      .update(terminals)
      .set({ lastSeenAt: input.seenAt, updatedAt: input.seenAt })
      .where(and(...this.scopedTerminalConditions(input), eq(terminals.isActive, true)))
      .returning({
        id: terminals.id,
        terminalCode: terminals.terminalCode,
        name: terminals.name,
        lastSeenAt: terminals.lastSeenAt,
      });

    return terminal ?? null;
  }

  async list(scope: TerminalScope) {
    return this.db
      .select()
      .from(terminals)
      .where(and(eq(terminals.tenantId, scope.tenantId), ...(scope.outletId ? [eq(terminals.outletId, scope.outletId)] : [])));
  }

  async deactivate(input: TerminalScope & { id: string; updatedAt: Date }) {
    const [terminal] = await this.db
      .update(terminals)
      .set({ isActive: false, updatedAt: input.updatedAt })
      .where(and(...this.scopedTerminalConditions(input)))
      .returning({
        id: terminals.id,
        terminalCode: terminals.terminalCode,
        name: terminals.name,
        isActive: terminals.isActive,
      });

    return terminal ?? null;
  }

  private scopedTerminalConditions(scope: TerminalScope & { id: string }) {
    return [
      eq(terminals.id, scope.id),
      eq(terminals.tenantId, scope.tenantId),
      ...(scope.outletId ? [eq(terminals.outletId, scope.outletId)] : []),
    ];
  }
}
