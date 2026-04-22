import { PrismaClient } from '@prisma/client';
import { SnapshotStore } from './store.js';
import { EventType, EventPayload } from '../schema/events.js';

/**
 * @fileoverview Aggregate Rehydrator: Reconstructs state from last snapshot + events.
 */
export class Rehydrator {
  private snapshotStore: SnapshotStore;

  constructor(private prisma: PrismaClient) {
    this.snapshotStore = new SnapshotStore(prisma);
  }

  /**
   * Rehydrates the aggregate state by finding the latest snapshot and applying subsequent events.
   * Optimized for sub-millisecond state reconstruction.
   */
  async getAggregateState(aggregateId: string) {
    // 1. Get latest snapshot
    const snapshot = await this.snapshotStore.getLatest(aggregateId);
    let state = snapshot ? (snapshot.state as any) : this.getInitialState();
    const version = snapshot?.version ?? 0;

    // 2. Fetch events occurred AFTER the snapshot version
    const events = await this.prisma.event.findMany({
      where: {
        aggregateId,
        version: { gt: version },
      },
      orderBy: { version: 'asc' },
    });

    // 3. Reduce events to compute current state
    for (const event of events) {
      state = this.applyEvent(state, event.type as EventType, event.payload as any);
    }

    return {
      state,
      version: events.length > 0 ? events[events.length - 1].version : version,
    };
  }

  private getInitialState() {
    return {
      id: '',
      title: '',
      code: '',
      description: '',
      status: 'EM_ANDAMENTO',
      currentPhase: 'ELABORACAO',
      tags: [],
      valueRequested: 0,
      valueApproved: 0,
      valueCaptured: 0,
    };
  }

  /**
   * Reducer function: Applies a domain event to a state object.
   */
  private applyEvent(state: any, type: EventType, payload: any): any {
    switch (type) {
      case 'PROJECT_CREATED':
        return { ...state, ...payload };
      case 'PHASE_CHANGED':
        return { ...state, currentPhase: payload.toPhase };
      case 'VALUE_APPROVED':
        return { ...state, valueApproved: payload.amount };
      case 'UPGRADE_SOLICITED':
        return {
          ...state,
          tags: [...state.tags, `UPGRADE_PENDING:${payload.planType}`],
        };
      case 'UPGRADE_APPROVED':
        return {
          ...state,
          tags: state.tags.filter((t: string) => !t.startsWith('UPGRADE_PENDING')),
          status: 'UPGRADED', // Example status change
        };
      default:
        return state;
    }
  }
}
