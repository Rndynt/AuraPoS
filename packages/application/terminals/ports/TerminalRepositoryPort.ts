export interface TerminalRecord {
  id: string;
  tenantId: string;
  terminalCode: string;
  name: string;
  deviceFingerprint: string | null;
  outletId: string | null;
  isActive: boolean;
  lastSeenAt: Date | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface RegisterTerminalData {
  tenantId: string;
  outletId?: string | null;
  terminalCode: string;
  name: string;
  deviceFingerprint?: string | null;
  seenAt: Date;
}

export interface TerminalScope {
  tenantId: string;
  outletId?: string | null;
}

export interface TerminalRepositoryPort {
  register(input: RegisterTerminalData): Promise<TerminalRecord | null>;
  updateHeartbeat(scope: TerminalScope & { id: string; seenAt: Date }): Promise<Pick<TerminalRecord, 'id' | 'terminalCode' | 'name' | 'lastSeenAt'> | null>;
  list(scope: TerminalScope): Promise<TerminalRecord[]>;
  deactivate(scope: TerminalScope & { id: string; updatedAt: Date }): Promise<Pick<TerminalRecord, 'id' | 'terminalCode' | 'name' | 'isActive'> | null>;
}
