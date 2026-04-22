import { Worker, Queue } from 'bullmq';
import { rlsClient } from '../core/prisma.js';
const prisma = rlsClient('SYSTEM', 'SYSTEM');
import { OutboxStore } from '../modules/events/outbox.store.js';
import { SnapshotStore } from '../modules/events/snapshot.store.js';
import { EventStore } from '../modules/events/event.store.js';
/**
 * OUTBOX WORKER - Elite Consistency
 *
 * Processes outbox items with guarantee of delivery
 * - Polls unprocessed events
 * - Updates projections idempotently
 * - Creates snapshots
 * - Dead letter queue for failures
 */
const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
};
export const outboxWorker = new Worker('outbox', async (job) => {
    const { outboxId } = job.data;
    const outbox = await prisma.outbox.findUnique({
        where: { id: outboxId },
        include: { event: true },
    });
    if (!outbox || outbox.processed) {
        return { skipped: true, reason: 'Already processed or not found' };
    }
    try {
        const event = outbox.event;
        // Process based on event type
        switch (event.type) {
            case 'PROJECT_CREATED':
            case 'PHASE_CHANGED':
            case 'VALUE_APPROVED':
            case 'VALUE_CAPTURED':
            case 'PROJECT_UPDATED':
                await processProjectProjection(event);
                break;
            case 'DOCUMENT_ADDED':
                await processDocumentProjection(event);
                break;
            default:
                console.warn(`[OUTBOX] Unknown event type: ${event.type}`);
        }
        // Mark as processed
        await OutboxStore.markProcessed(outboxId);
        return {
            success: true,
            eventId: event.id,
            type: event.type,
            aggregateId: event.aggregateId,
        };
    }
    catch (error) {
        console.error(`[OUTBOX] Failed to process ${outboxId}:`, error);
        await OutboxStore.markFailed(outboxId, error.message);
        throw error; // Retry via BullMQ
    }
}, {
    connection,
    concurrency: 10,
    limiter: { max: 100, duration: 1000 }, // 100/sec
});
/**
 * Process project projection with idempotency + snapshots
 */
async function processProjectProjection(event) {
    const { aggregateId } = event;
    // 1. Rebuild state from events (with snapshot optimization)
    const { state, fromSnapshot, eventsReplayed } = await SnapshotStore.rebuildFromSnapshot(aggregateId);
    // Apply current event
    const newState = EventStore['applyEvent'](state, event);
    newState.version = event.version;
    newState.lastEventAt = event.createdAt;
    // 2. ELITE: Idempotent update - only if version is newer
    const result = await prisma.project.updateMany({
        where: {
            id: aggregateId,
            version: { lt: newState.version }, // ← IDEMPOTENCY GUARD
        },
        data: {
            currentPhase: newState.currentPhase,
            status: newState.status,
            valueRequested: newState.valueRequested,
            valueApproved: newState.valueApproved,
            valueCaptured: newState.valueCaptured,
            submittedAt: newState.submittedAt,
            approvedAt: newState.approvedAt,
            completedAt: newState.completedAt,
            protocolNumber: newState.protocolNumber,
            governmentBody: newState.governmentBody,
            version: newState.version,
            lastEventAt: newState.lastEventAt,
        },
    });
    if (result.count === 0) {
        // Already processed (idempotent)
        return { skipped: true, reason: 'Version already applied' };
    }
    // 3. Update read model
    await updateReadModel(aggregateId, newState);
    // 4. ELITE: Create snapshot if needed
    const snapshotCreated = await SnapshotStore.maybeCreateSnapshot(aggregateId, newState);
    return {
        updated: true,
        version: newState.version,
        fromSnapshot,
        eventsReplayed,
        snapshotCreated,
    };
}
/**
 * Process document projection
 */
async function processDocumentProjection(event) {
    // Increment document count in read model
    const projectId = event.aggregateId;
    await prisma.projectReadModel.updateMany({
        where: { id: projectId },
        data: {
            documentsCount: { increment: 1 },
            updatedAt: new Date(),
        },
    });
    return { updated: true };
}
/**
 * Update materialized read model
 */
async function updateReadModel(projectId, state) {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { client: true },
    });
    if (!project)
        return;
    const captured = Number(state.valueCaptured ?? 0);
    const approved = Number(state.valueApproved ?? 0);
    const capturePercent = approved > 0 ? (captured / approved) * 100 : null;
    const daysToDeadline = project.submissionDeadline
        ? Math.ceil((project.submissionDeadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;
    await prisma.projectReadModel.upsert({
        where: { id: projectId },
        create: {
            id: projectId,
            organizationId: project.organizationId,
            clientId: project.clientId,
            clientName: project.client?.name,
            code: project.code,
            title: project.title,
            phase: state.currentPhase || project.currentPhase,
            status: state.status || project.status,
            approvedValue: state.valueApproved,
            capturedValue: state.valueCaptured,
            capturePercent,
            documentsCount: state.documentsCount || 0,
            phasesCount: state.phasesCount || 0,
            submissionDeadline: project.submissionDeadline,
            daysToDeadline,
            updatedAt: new Date(),
        },
        update: {
            phase: state.currentPhase || project.currentPhase,
            status: state.status || project.status,
            approvedValue: state.valueApproved,
            capturedValue: state.valueCaptured,
            capturePercent,
            daysToDeadline,
            updatedAt: new Date(),
        },
    });
}
/**
 * Poller - enqueues unprocessed outbox items
 */
const outboxQueue = new Queue('outbox', { connection });
export async function startOutboxPoller() {
    setInterval(async () => {
        try {
            const items = await OutboxStore.getUnprocessed(50);
            for (const item of items) {
                // Skip if recently failed (exponential backoff)
                const minutesSinceAttempt = item.attempts > 0
                    ? (Date.now() - item.createdAt.getTime()) / 60000
                    : 999;
                const backoffMinutes = Math.pow(2, item.attempts); // 1, 2, 4, 8, 16
                if (minutesSinceAttempt < backoffMinutes) {
                    continue; // Wait for backoff
                }
                await outboxQueue.add('process', { outboxId: item.id }, {
                    jobId: `outbox-${item.id}`, // Dedupe
                    attempts: 5,
                    backoff: { type: 'exponential', delay: 1000 },
                });
            }
        }
        catch (error) {
            console.error('[OUTBOX POLLER] Error:', error);
        }
    }, 2000); // Poll every 2s
}
outboxWorker.on('completed', (job) => {
    if (!job.returnvalue?.skipped) {
        console.log(`[OUTBOX] Processed ${job.data.outboxId}`);
    }
});
outboxWorker.on('failed', (job, err) => {
    console.error(`[OUTBOX] Failed ${job?.data.outboxId}:`, err.message);
});
