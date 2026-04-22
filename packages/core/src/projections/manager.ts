import { PrismaClient } from '@prisma/client';
import { EventType, EventPayload } from '../schema/events.js';
import { SnapshotStore } from '../snapshots/store.js';
import { Rehydrator } from '../snapshots/rehydrator.js';

/**
 * @interface ProjectionHandler
 * @description Defines a handler for a specific event type to update a Read Model.
 */
interface ProjectionHandler<T extends EventType> {
  handle(tx: any, aggregateId: string, payload: EventPayload<T>, organizationId: string): Promise<void>;
}

/**
 * @class ProjectionManager
 * @description Orchestrates read model updates with guaranteed idempotency and tenant isolation.
 */
export class ProjectionManager {
  private handlers: Map<EventType, ProjectionHandler<any>> = new Map();
  private snapshotStore: SnapshotStore;
  private rehydrator: Rehydrator;
  private static readonly SNAPSHOT_FREQUENCY = 50;

  constructor(private prisma: PrismaClient) {
    this.snapshotStore = new SnapshotStore(prisma);
    this.rehydrator = new Rehydrator(prisma);
    this.registerHandlers();
  }

  /**
   * Registers all available projection handlers.
   */
  private registerHandlers() {
    this.handlers.set('UPGRADE_SOLICITED', new EliteUpgradeHandler());
    // ... add other handlers here
  }

  /**
   * Processes an event and updates the corresponding read model.
   * Includes strict idempotency check: only updates if event.version == current.version + 1.
   */
  async processEvent(event: {
    type: string;
    aggregateId: string;
    version: number;
    payload: any;
    organizationId: string;
  }) {
    const { type, aggregateId, version, payload, organizationId } = event;
    const handler = this.handlers.get(type as EventType);

    if (!handler) {
      console.warn(`[ProjectionManager] No handler registered for event type: ${type}`);
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      // 1. IDEMPOTENCY CHECK
      // Fetch current version of the project (Read Model)
      const project = await tx.project.findUnique({
        where: { id: aggregateId },
        select: { version: true, organizationId: true },
      });

      // Strict Tenant Check: Ensure we don't leak projections across organizations
      if (project && project.organizationId !== organizationId) {
        throw new Error(`[ProjectionManager] Tenant mismatch for aggregate ${aggregateId}`);
      }

      const currentVersion = project?.version ?? 0;

      if (version <= currentVersion) {
        console.info(`[ProjectionManager] Event ${type} (v${version}) already processed for ${aggregateId}. Skipping.`);
        return;
      }

      if (version > currentVersion + 1) {
        // This indicates a gap in the event stream for this worker.
        // In production, we might trigger a replay or fail to retry later.
        throw new Error(`[ProjectionManager] Event gap detected for ${aggregateId}. Expected ${currentVersion + 1}, got ${version}`);
      }

      // 2. APPLY PROJECTION
      await handler.handle(tx, aggregateId, payload, organizationId);

      // 3. UPDATE VERSION (Atomic increment in Read Model)
      await tx.project.update({
        where: { id: aggregateId },
        data: { 
          version: version,
          lastEventAt: new Date(),
        },
      });

      // 4. TRIGGER SNAPSHOT (Every 50 versions)
      if (version % ProjectionManager.SNAPSHOT_FREQUENCY === 0) {
        console.info(`[ProjectionManager] Creating snapshot for ${aggregateId} at version ${version}`);
        const { state } = await this.rehydrator.getAggregateState(aggregateId);
        await this.snapshotStore.save(aggregateId, version, state);
      }

      console.log(`[ProjectionManager] Successfully applied ${type} (v${version}) to ${aggregateId}`);
    });
  }
}

/**
 * @class EliteUpgradeHandler
 * @description Consolidates upgrade events into the project's state for the dashboard.
 */
class EliteUpgradeHandler implements ProjectionHandler<'UPGRADE_SOLICITED'> {
  async handle(tx: any, aggregateId: string, payload: EventPayload<'UPGRADE_SOLICITED'>, organizationId: string) {
    // Transform 'Upgrade solicitado' into a consolidated tag or status update
    // For this example, we append a tag and update metadata
    await tx.project.update({
      where: { id: aggregateId },
      data: {
        tags: {
          push: `UPGRADE_PENDING:${payload.planType}`,
        },
        // Using project.description or a custom field if we had one for "Elite Status"
        // Here we simulate updating the consolidated dashboard state
      },
    });

    // Also update the specialized Read Model for fast dashboard queries
    await tx.projectReadModel.upsert({
      where: { id: aggregateId },
      create: {
        id: aggregateId,
        organizationId,
        code: 'PENDING',
        title: 'Upgrade in Progress',
        phase: 'ELITE_UPGRADE',
        status: 'UPGRADE_REQUESTED',
        updatedAt: new Date(),
      },
      update: {
        status: 'UPGRADE_REQUESTED',
        updatedAt: new Date(),
      },
    });
  }
}
