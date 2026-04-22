import crypto from 'crypto';
import { prisma } from '../../core/prisma.js';

/**
 * SNAPSHOT STORE - Elite Performance Upgrade
 * 
 * Problema: Replay de 10k eventos = O(n) lento
 * Solução: Snapshots a cada N eventos = O(1) replay
 */

export interface SnapshotState {
  id: string;
  version: number;
  currentPhase?: string;
  status?: string;
  valueRequested?: number;
  valueApproved?: number;
  valueCaptured?: number;
  documentsCount?: number;
  protocolNumber?: string;
  [key: string]: any;
}

export class SnapshotStore {
  private static readonly SNAPSHOT_INTERVAL = 100; // A cada 100 eventos

  /**
   * Create snapshot (called after projection update)
   * ELITE: With transactional consistency and lastEventId
   */
  static async create(aggregateId: string, state: SnapshotState, version: number, lastEventId?: string) {
    const stateJson = JSON.stringify(state);
    const checksum = crypto.createHash('sha256').update(stateJson).digest('hex');

    return prisma.$transaction(async (tx) => {
      // Verify consistency: snapshot must match latest event
      if (lastEventId) {
        const lastEvent = await tx.event.findFirst({
          where: { aggregateId },
          orderBy: { version: 'desc' },
          select: { id: true, version: true },
        });

        if (lastEvent && (lastEvent.id !== lastEventId || lastEvent.version !== version)) {
          throw new Error(
            `Snapshot consistency check failed: expected event ${lastEventId}@v${version}, got ${lastEvent.id}@v${lastEvent.version}`
          );
        }
      }

      return tx.snapshot.create({
        data: {
          aggregateId,
          aggregateType: 'Project',
          version,
          state: state as any,
          checksum,
        },
      });
    });
  }

  /**
   * Get latest snapshot for aggregate
   */
  static async getLatest(aggregateId: string) {
    return prisma.snapshot.findFirst({
      where: { aggregateId },
      orderBy: { version: 'desc' },
    });
  }

  /**
   * Should we create snapshot? (every N events)
   */
  static shouldSnapshot(version: number): boolean {
    return version > 0 && version % this.SNAPSHOT_INTERVAL === 0;
  }

  /**
   * Rebuild with snapshot optimization - O(1) instead of O(n)
   */
  static async rebuildFromSnapshot(aggregateId: string) {
    // 1. Get latest snapshot
    const snapshot = await this.getLatest(aggregateId);

    const fromVersion = snapshot?.version ?? 0;
    let state: SnapshotState = (snapshot?.state as any) ?? { id: aggregateId, version: 0 };

    // 2. Verify snapshot integrity
    if (snapshot) {
      const checksum = crypto.createHash('sha256').update(JSON.stringify(snapshot.state)).digest('hex');
      if (checksum !== snapshot.checksum) {
        throw new Error(`Snapshot corruption detected at version ${snapshot.version}`);
      }
    }

    // 3. Get only events AFTER snapshot
    const events = await prisma.event.findMany({
      where: {
        aggregateId,
        version: { gt: fromVersion },
      },
      orderBy: { version: 'asc' },
    });

    // 4. Apply only delta (max 99 events)
    const { EventStore } = await import('./event.store.js');
    for (const event of events) {
      state = EventStore['applyEvent'](state, event);
      state.version = event.version;
    }

    return {
      state,
      fromSnapshot: !!snapshot,
      eventsReplayed: events.length,
      snapshotVersion: fromVersion,
    };
  }

  /**
   * Auto-snapshot if needed (called by projection worker)
   */
  static async maybeCreateSnapshot(aggregateId: string, state: SnapshotState) {
    if (this.shouldSnapshot(state.version)) {
      // Check if snapshot already exists for this version
      const exists = await prisma.snapshot.findUnique({
        where: {
          aggregateId_version: {
            aggregateId,
            version: state.version,
          },
        },
      });

      if (!exists) {
        await this.create(aggregateId, state, state.version);
        return true;
      }
    }
    return false;
  }

  /**
   * Cleanup old snapshots (keep every 500, delete intermediates)
   */
  static async cleanup(aggregateId: string, keepEvery = 500) {
    const snapshots = await prisma.snapshot.findMany({
      where: { aggregateId },
      orderBy: { version: 'asc' },
      select: { id: true, version: true },
    });

    const toDelete = snapshots.filter((s, idx) => {
      // Keep first, last, and every N
      if (idx === 0 || idx === snapshots.length - 1) return false;
      return s.version % keepEvery !== 0;
    });

    if (toDelete.length > 0) {
      await prisma.snapshot.deleteMany({
        where: { id: { in: toDelete.map(s => s.id) } },
      });
    }

    return { deleted: toDelete.length, kept: snapshots.length - toDelete.length };
  }
}