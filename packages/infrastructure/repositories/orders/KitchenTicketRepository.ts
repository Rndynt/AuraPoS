/**
 * Kitchen Ticket Repository
 * Handles kitchen ticket CRUD operations with tenant isolation
 */

import { Database } from '../../database';
import { BaseRepository, RepositoryError } from '../BaseRepository';
import {
  kitchenTickets,
  type KitchenTicket,
  type InsertKitchenTicket,
} from '../../../../shared/schema';
import { eq, and } from 'drizzle-orm';

export interface IKitchenTicketRepository {
  findByTenant(tenantId: string, status?: string): Promise<KitchenTicket[]>;
  findById(id: string, tenantId: string): Promise<KitchenTicket | null>;
  create(ticket: InsertKitchenTicket, tenantId: string): Promise<KitchenTicket>;
  updateStatus(id: string, status: string, tenantId: string): Promise<KitchenTicket>;
}

export class KitchenTicketRepository
  extends BaseRepository<KitchenTicket, InsertKitchenTicket>
  implements IKitchenTicketRepository
{
  protected table = kitchenTickets;
  protected entityName = 'KitchenTicket';

  constructor(db: Database) {
    super(db);
  }

  /**
   * Find tickets by tenant with optional status filter
   */
  async findByTenant(
    tenantId: string,
    status?: string
  ): Promise<KitchenTicket[]> {
    try {
      const conditions = [eq(kitchenTickets.tenantId, tenantId)];

      if (status) {
        conditions.push(eq(kitchenTickets.status, status as any));
      }

      return await this.db
        .select()
        .from(kitchenTickets)
        .where(and(...conditions))
        .orderBy(kitchenTickets.createdAt);
    } catch (error) {
      this.handleError('find kitchen tickets by tenant', error);
    }
  }

  /**
   * Find kitchen ticket by ID
   */
  async findById(id: string, tenantId: string): Promise<KitchenTicket | null> {
    try {
      const result = await this.db
        .select()
        .from(kitchenTickets)
        .where(
          and(
            eq(kitchenTickets.id, id),
            eq(kitchenTickets.tenantId, tenantId)
          )
        )
        .limit(1);

      return result[0] || null;
    } catch (error) {
      this.handleError('find kitchen ticket by id', error);
    }
  }

  /**
   * Create a new kitchen ticket
   */
  async create(
    ticket: InsertKitchenTicket,
    tenantId: string
  ): Promise<KitchenTicket> {
    try {
      const data = this.injectTenantId(ticket, tenantId);
      const result = await this.db
        .insert(kitchenTickets)
        .values(data)
        .returning();
      return result[0];
    } catch (error) {
      this.handleError('create kitchen ticket', error);
    }
  }

  /**
   * Update kitchen ticket status
   */
  async updateStatus(
    id: string,
    status: string,
    tenantId: string
  ): Promise<KitchenTicket> {
    try {
      await this.ensureTenantAccess(id, tenantId);

      const updateData: any = {
        status: status as any,
        updatedAt: new Date(),
      };

      // Set completedAt timestamp when status is ready or delivered
      if (status === 'ready' || status === 'delivered') {
        updateData.completedAt = new Date();
      }

      const result = await this.db
        .update(kitchenTickets)
        .set(updateData)
        .where(
          and(
            eq(kitchenTickets.id, id),
            eq(kitchenTickets.tenantId, tenantId)
          )
        )
        .returning();

      if (!result || result.length === 0) {
        throw new RepositoryError('Kitchen ticket not found', 'NOT_FOUND', null);
      }

      return result[0];
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      this.handleError('update kitchen ticket status', error);
    }
  }

  /**
   * Generate unique ticket number for a tenant
   */
  async generateTicketNumber(tenantId: string): Promise<string> {
    try {
      const today = new Date();
      const datePrefix = today.toISOString().split('T')[0].replace(/-/g, '');
      
      const todayTickets = await this.db
        .select()
        .from(kitchenTickets)
        .where(
          and(
            eq(kitchenTickets.tenantId, tenantId),
            eq(kitchenTickets.createdAt, today)
          )
        );

      const sequenceNumber = (todayTickets.length + 1).toString().padStart(4, '0');
      return `KT-${datePrefix}-${sequenceNumber}`;
    } catch (error) {
      this.handleError('generate ticket number', error);
    }
  }
}
