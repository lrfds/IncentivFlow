import { Worker } from 'bullmq';
import { rlsClient } from '../core/prisma.js';
const prisma = rlsClient('SYSTEM', 'SYSTEM');
import { EventStore } from '../modules/events/event.store.js';
/**
 * CQRS Projection Worker
 * Listens to events and updates read models
 */
export class ProjectionWorker {
    worker;
    constructor() {
        this.worker = new Worker('projections', async (job) => {
            const { aggregateId, eventType } = job.data;
            console.log(`[PROJECTION] Processing ${eventType} for ${aggregateId}`);
            try {
                await this.projectEvent(aggregateId, eventType);
            }
            catch (error) {
                console.error(`[PROJECTION] Failed:`, error);
                throw error; // Will retry
            }
        }, {
            connection: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
            },
            concurrency: 5,
        });
        this.worker.on('completed', (job) => {
            console.log(`[PROJECTION] Completed ${job.id}`);
        });
        this.worker.on('failed', (job, err) => {
            console.error(`[PROJECTION] Failed ${job?.id}:`, err);
        });
    }
    async projectEvent(aggregateId, eventType) {
        // Get event to check idempotency
        const jobData = await prisma.event.findFirst({
            where: { aggregateId },
            orderBy: { version: 'desc' },
            select: { id: true, version: true }
        });
        if (!jobData)
            return;
        // Rebuild projection from events
        const { state } = await EventStore.rebuildProjection(aggregateId, prisma);
        // IDEMPOTENT UPDATE - only update if not already processed
        const result = await prisma.project.updateMany({
            where: {
                id: aggregateId,
                version: { lt: state.version } // Prevent double-processing
            },
            data: {
                currentPhase: state.currentPhase,
                status: state.status,
                valueApproved: state.valueApproved,
                valueCaptured: state.valueCaptured,
                submittedAt: state.submittedAt,
                approvedAt: state.approvedAt,
                completedAt: state.completedAt,
                protocolNumber: state.protocolNumber,
                governmentBody: state.governmentBody,
                version: state.version,
                lastEventAt: state.lastEventAt,
            },
        });
        // If no rows updated, already processed (idempotent)
        if (result.count === 0) {
            console.log(`[PROJECTION] Skipped - already at version ${state.version}`);
            return;
        }
        // Update read model for queries
        await this.updateReadModel(aggregateId, state);
        // Update search index, cache, etc.
        if (eventType === 'PHASE_CHANGED') {
            await this.handlePhaseChange(aggregateId, state);
        }
    }
    async updateReadModel(aggregateId, state) {
        const project = await prisma.project.findUnique({
            where: { id: aggregateId },
            include: { client: true },
        });
        const documentsCount = await prisma.document.count({ where: { projectId: aggregateId } });
        if (!project)
            return;
        const captured = Number(project.valueCaptured ?? 0);
        const approved = Number(project.valueApproved ?? 0);
        await prisma.projectReadModel.upsert({
            where: { id: aggregateId },
            create: {
                id: aggregateId,
                organizationId: project.organizationId,
                clientId: project.clientId,
                clientName: project.client?.name,
                code: project.code,
                title: project.title,
                phase: project.currentPhase,
                status: project.status,
                approvedValue: project.valueApproved,
                capturedValue: project.valueCaptured,
                capturePercent: approved > 0 ? (captured / approved) * 100 : null,
                documentsCount: documentsCount,
                phasesCount: state.version,
                submissionDeadline: project.submissionDeadline,
                daysToDeadline: project.submissionDeadline
                    ? Math.ceil((project.submissionDeadline.getTime() - Date.now()) / 86400000)
                    : null,
                updatedAt: new Date(),
            },
            update: {
                phase: project.currentPhase,
                status: project.status,
                approvedValue: project.valueApproved,
                capturedValue: project.valueCaptured,
                capturePercent: approved > 0 ? (captured / approved) * 100 : null,
                documentsCount: documentsCount,
                updatedAt: new Date(),
            },
        });
    }
    async handlePhaseChange(aggregateId, state) {
        // Trigger side effects
        if (state.currentPhase === 'ACOMPANHAMENTO') {
            // Schedule follow-ups
            console.log(`[PROJECTION] Project ${aggregateId} submitted - scheduling alerts`);
        }
        if (state.currentPhase === 'POS_APROVACAO') {
            // Notify client
            console.log(`[PROJECTION] Project ${aggregateId} approved - notifying stakeholders`);
        }
    }
    async close() {
        await this.worker.close();
    }
}
// Auto-start in production
if (process.env.NODE_ENV === 'production' || process.env.START_WORKERS === 'true') {
    new ProjectionWorker();
    console.log('[WORKER] Projection worker started');
}
