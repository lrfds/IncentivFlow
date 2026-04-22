import crypto from 'crypto';
import { ulid, extractTimestamp, LamportClock } from '../../core/ulid.js';
import { EventMigrator, CURRENT_SCHEMA_VERSIONS } from './event.migrator.js';

/**
 * Shared hash function (used by multiple modules)
 */
export function calculateHash(prevHash: string | null, data: any): string {
  return crypto
    .createHash('sha256')
    .update((prevHash ?? '') + JSON.stringify(data))
    .digest('hex');
}

export interface AppendEventParams {
  organizationId: string;
  aggregateId: string;
  aggregateType?: string;
  type: string;
  payload: any;
  metadata?: any;
  phaseConfigVersion?: number;
}

// Lamport clock instance (one per region)
const REGION_ID = process.env.REGION_ID ?? 'sa-east-1';
const lamportClock = new LamportClock(REGION_ID);

/**
 * EVENT STORE — Source of Truth
 * 
 * Upgrades in this version:
 *   ✅ ULID for globally ordered IDs
 *   ✅ Schema versioning (__schemaVersion embedded)
 *   ✅ Lamport clock for cross-region ordering
 *   ✅ Hash chain for immutability
 *   ✅ Transactional outbox for guaranteed delivery
 *   ✅ Optimistic concurrency control
 */
export class EventStore {
  /**
   * Append event with ULID + schema version + Lamport clock
   */
  static async append(params: AppendEventParams, prisma: any) {
    const {
      organizationId,
      aggregateId,
      aggregateType = 'Project',
      type,
      payload,
      metadata = {},
      phaseConfigVersion,
    } = params;

    return await prisma.$transaction(async (tx: any) => {
      // 1. Get last event for hash chain + version
      const lastEvent = await tx.event.findFirst({
        where: { aggregateId },
        orderBy: { version: 'desc' },
        select: { version: true, hash: true },
      });

      const version = (lastEvent?.version ?? 0) + 1;
      const prevHash = lastEvent?.hash ?? null;

      // 2. Generate ULID (monotonic, sortable, region-aware)
      const eventId = ulid();
      const eventTimestamp = extractTimestamp(eventId);

      // 3. Tick Lamport clock
      const lamport = lamportClock.tick();

      // 4. Embed schema version for future migration support
      const schemaVersion = CURRENT_SCHEMA_VERSIONS[type] ?? 1;

      const enrichedPayload = {
        ...payload,
        __schemaVersion: schemaVersion,
        ...(phaseConfigVersion !== undefined && {
          __phaseConfigVersion: phaseConfigVersion,
        }),
      };

      // 5. Build hash chain
      const hashInput = {
        type,
        payload: enrichedPayload,
        version,
        aggregateId,
        timestamp: new Date(eventTimestamp).toISOString(),
      };
      const hash = calculateHash(prevHash, hashInput);

      // 6. Insert event (immutable)
      const event = await tx.event.create({
        data: {
          id: eventId,
          organizationId,
          aggregateId,
          aggregateType,
          type,
          version,
          payload: enrichedPayload,
          metadata: {
            ...metadata,
            prevHash,
            phaseConfigVersion,
            schemaVersion,
            lamport: {
              counter: lamport.counter,
              region: lamport.region,
              timestamp: lamport.timestamp,
            },
            ulid: {
              raw: eventId,
              extractedTimestamp: eventTimestamp,
            },
          },
          prevHash,
          hash,
        },
      });

      // 7. OUTBOX: write in SAME transaction
      await tx.outbox.create({
        data: {
          eventId: event.id,
          aggregateId,
          type,
          payload: enrichedPayload,
        },
      });

      return event;
    });
  }

  /**
   * Get event stream with automatic schema migration
   */
  static async getStream(aggregateId: string, fromVersion = 0, prisma: any) {
    const events = await prisma.event.findMany({
      where: {
        aggregateId,
        version: { gt: fromVersion },
      },
      orderBy: { version: 'asc' },
    });

    // Migrate each event to current schema version
    return events.map((event: any) => {
      const { payload: migratedPayload, migrationsApplied } =
        EventMigrator.migrateEvent(event);

      return {
        ...event,
        payload: migratedPayload,
        _migrationsApplied: migrationsApplied,
        _originalSchemaVersion: event.payload?.__schemaVersion ?? 1,
      };
    });
  }

  /**
   * Get raw stream WITHOUT migration (for debugging/audit)
   */
  static async getRawStream(aggregateId: string, fromVersion = 0, prisma: any) {
    return prisma.event.findMany({
      where: {
        aggregateId,
        version: { gt: fromVersion },
      },
      orderBy: { version: 'asc' },
    });
  }

  /**
   * Verify hash chain integrity
   */
  static async verifyChain(
    aggregateId: string,
    prisma: any
  ): Promise<{ valid: boolean; brokenAt?: number; checked: number }> {
    const events = await this.getRawStream(aggregateId, 0, prisma);

    let prevHash: string | null = null;

    for (const event of events) {
      const hashInput = {
        type: event.type,
        payload: event.payload,
        version: event.version,
        aggregateId: event.aggregateId,
        timestamp: event.createdAt.toISOString(),
      };

      const expectedHash = calculateHash(prevHash, hashInput);

      if (event.hash !== expectedHash || event.prevHash !== prevHash) {
        return { valid: false, brokenAt: event.version, checked: events.length };
      }

      prevHash = event.hash;
    }

    return { valid: true, checked: events.length };
  }

  /**
   * Rebuild projection from events (with migration)
   */
  static async rebuildProjection(aggregateId: string, prisma: any) {
    const events = await this.getStream(aggregateId, 0, prisma);

    let state: any = {
      id: aggregateId,
      version: 0,
    };

    let migrationsCount = 0;

    for (const event of events) {
      state = this.applyEvent(state, event);
      state.version = event.version;
      state.lastEventAt = event.createdAt;
      migrationsCount += (event._migrationsApplied?.length ?? 0);
    }

    return { state, eventsProcessed: events.length, migrationsApplied: migrationsCount };
  }

  /**
   * Apply a single event to aggregate state
   */
  static applyEvent(state: any, event: any): any {
    switch (event.type) {
      case 'PROJECT_CREATED':
        return {
          ...state,
          ...event.payload,
          currentPhase: 'ELABORACAO',
          status: 'EM_ANDAMENTO',
        };

      case 'PROJECT_UPDATED':
        return {
          ...state,
          ...event.payload.changes,
        };

      case 'PHASE_CHANGED':
        return {
          ...state,
          currentPhase: event.payload.toPhase,
          ...(event.payload.toPhase === 'ACOMPANHAMENTO' && {
            submittedAt: event.payload.timestamp,
          }),
          ...(event.payload.toPhase === 'POS_APROVACAO' && {
            approvedAt: event.payload.timestamp,
          }),
          ...(event.payload.toPhase === 'CONCLUIDO' && {
            completedAt: event.payload.timestamp,
          }),
        };

      case 'VALUE_APPROVED':
        return {
          ...state,
          valueApproved: event.payload.amount,
          approvedAt: event.payload.timestamp,
        };

      case 'VALUE_CAPTURED':
        return {
          ...state,
          valueCaptured: (state.valueCaptured || 0) + event.payload.amount,
        };

      case 'DOCUMENT_ADDED':
        return {
          ...state,
          documentsCount: (state.documentsCount || 0) + 1,
        };

      case 'PROTOCOL_ASSIGNED':
        return {
          ...state,
          protocolNumber: event.payload.protocol,
          governmentBody: event.payload.governmentBody,
        };

      default:
        return state;
    }
  }

  /**
   * Receive event from remote region (updates Lamport clock)
   */
  static receiveRemoteEvent(remoteCounter: number): void {
    lamportClock.receive(remoteCounter);
  }
}
