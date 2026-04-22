import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { ProjectionManager } from './manager.js';

/**
 * @fileoverview Resilient Projection Worker for IncentivFlow.
 * Responsible for processing the Outbox and updating Read Models.
 */

interface ProjectionJobPayload {
  eventId: string;
  aggregateId: string;
  version: number;
  type: string;
  payload: any;
  organizationId: string;
}

export function createProjectionWorker(prisma: PrismaClient, redisConnection: any) {
  const manager = new ProjectionManager(prisma);

  const worker = new Worker(
    'projections',
    async (job: Job<ProjectionJobPayload>) => {
      const { eventId, aggregateId, type, payload, version, organizationId } = job.data;

      console.log(`[Worker] Processing event ${eventId} (v${version}) of type ${type} for aggregate ${aggregateId}`);

      try {
        // Delegate processing to the Manager which handles Idempotency and Tenant Isolation
        await manager.processEvent({
          type,
          aggregateId,
          version,
          payload,
          organizationId,
        });

        // Mark Outbox item as processed after successful projection
        await prisma.outbox.update({
          where: { eventId },
          data: {
            processed: true,
            processedAt: new Date(),
          },
        });
      } catch (error) {
        console.error(`[Worker] Failed to process event ${eventId}:`, error);
        throw error; // Trigger BullMQ retry policy
      }
    },
    {
      connection: redisConnection,
    }
  );

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed after all retries:`, err);
    // Here you would move to a DLQ or notify Sentry/Ops
  });

  return worker;
}
