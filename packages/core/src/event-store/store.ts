import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { DomainEvent, EventRegistry, EventType } from '../schema/events.js';

/**
 * @class EventStore
 * @description Core service for managing the immutable event stream with hash chaining.
 */
export class EventStore {
  constructor(private prisma: PrismaClient) {}

  /**
   * Appends a new event to the aggregate's stream with hash chaining.
   * Ensures data integrity by linking the current event to the previous one via SHA-256.
   */
  async append<T extends EventType>(event: DomainEvent<T>) {
    // Validate payload against registry
    const schema = EventRegistry[event.type];
    const validatedPayload = schema.parse(event.payload);

    return await this.prisma.$transaction(async (tx) => {
      // 1. Fetch the latest event for this aggregate to get the previous hash
      const lastEvent = await tx.event.findFirst({
        where: { aggregateId: event.aggregateId },
        orderBy: { version: 'desc' },
      });

      const nextVersion = (lastEvent?.version ?? 0) + 1;
      const prevHash = lastEvent?.hash ?? null;

      // 2. Calculate the cryptographic hash for the new event
      // hash = SHA256(prevHash + type + payload + version + aggregateId)
      const hashContent = JSON.stringify({
        prevHash,
        type: event.type,
        payload: validatedPayload,
        version: nextVersion,
        aggregateId: event.aggregateId,
      });

      const hash = crypto.createHash('sha256').update(hashContent).digest('hex');

      // 3. Persist the event
      const newEvent = await tx.event.create({
        data: {
          organizationId: event.organizationId,
          aggregateId: event.aggregateId,
          type: event.type,
          version: nextVersion,
          payload: validatedPayload as any,
          prevHash,
          hash,
          metadata: {
            userId: event.userId,
            timestamp: new Date().toISOString(),
          },
        },
      });

      // 4. Create an Outbox entry for async projections
      await tx.outbox.create({
        data: {
          eventId: newEvent.id,
          aggregateId: event.aggregateId,
          type: event.type,
          payload: validatedPayload as any,
        },
      });

      return newEvent;
    });
  }

  /**
   * Verifies the integrity of the hash chain for a specific aggregate.
   * @returns {Promise<{ valid: boolean; brokenAtVersion?: number }>}
   */
  async verifyChain(aggregateId: string) {
    const events = await this.prisma.event.findMany({
      where: { aggregateId },
      orderBy: { version: 'asc' },
    });

    let expectedPrevHash: string | null = null;

    for (const event of events) {
      if (event.prevHash !== expectedPrevHash) {
        return { valid: false, brokenAtVersion: event.version };
      }

      const hashContent = JSON.stringify({
        prevHash: event.prevHash,
        type: event.type,
        payload: event.payload,
        version: event.version,
        aggregateId: event.aggregateId,
      });

      const calculatedHash = crypto.createHash('sha256').update(hashContent).digest('hex');

      if (calculatedHash !== event.hash) {
        return { valid: false, brokenAtVersion: event.version };
      }

      expectedPrevHash = event.hash;
    }

    return { valid: true };
  }
}
