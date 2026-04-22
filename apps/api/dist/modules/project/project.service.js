import { EventStore } from '../events/event.store.js';
import { PhaseEngine } from '../phase/phase.engine.js';
export class ProjectService {
    /**
     * ELITE: Retry wrapper for optimistic locking
     */
    static async withRetry(operation, maxRetries = 3) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await operation();
            }
            catch (e) {
                const err = e;
                const isConcurrentError = err.message?.includes('CONCURRENT_MODIFICATION') ||
                    err.message?.includes('OPTIMISTIC_LOCK_FAILED') ||
                    err.code === 'P2034'; // Prisma transaction conflict
                if (!isConcurrentError || i === maxRetries - 1) {
                    throw e;
                }
                // Exponential backoff: 50ms, 100ms, 200ms
                const delay = 50 * Math.pow(2, i);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
        throw new Error('FAILED_AFTER_RETRIES');
    }
    /**
     * Create project via event sourcing
     */
    static async create(db, input) {
        return await db.$transaction(async (tx) => {
            // 1. Append event
            const event = await EventStore.append({
                organizationId: input.organizationId,
                aggregateId: '', // will be created
                type: 'PROJECT_CREATED',
                payload: {
                    code: input.code,
                    title: input.title,
                    description: input.description,
                    clientId: input.clientId,
                    valueRequested: input.valueRequested,
                    submissionDeadline: input.submissionDeadline,
                    tags: input.tags ?? [],
                },
                metadata: { userId: input.userId },
            }, tx);
            // 2. Create projection
            const project = await tx.project.create({
                data: {
                    id: event.aggregateId, // Use same ID
                    organizationId: input.organizationId,
                    clientId: input.clientId,
                    code: input.code,
                    title: input.title,
                    description: input.description,
                    valueRequested: input.valueRequested,
                    submissionDeadline: input.submissionDeadline,
                    tags: input.tags ?? [],
                    version: 1,
                    lastEventAt: event.createdAt,
                },
                include: { client: true },
            });
            // Update event with correct aggregateId
            await tx.event.update({
                where: { id: event.id },
                data: { aggregateId: project.id },
            });
            return project;
        });
    }
    /**
     * Change phase with validation and event sourcing
     */
    static async changePhase(db, params) {
        const { projectId, targetPhase, organizationId, userId, notes, metadata } = params;
        return this.withRetry(async () => {
            // 1. Validate transition and CAPTURE config version
            const validation = await PhaseEngine.validate(db, projectId, targetPhase, organizationId);
            if (!validation.valid) {
                throw new Error(`Transição inválida: ${validation.errors.join(', ')}`);
            }
            return await db.$transaction(async (tx) => {
                // ELITE: OPTIMISTIC LOCKING - get current version
                const project = await tx.project.findUniqueOrThrow({
                    where: { id: projectId },
                    select: {
                        id: true,
                        currentPhase: true,
                        version: true,
                        submittedAt: true,
                        approvedAt: true,
                        completedAt: true,
                    },
                });
                const currentVersion = project.version;
                // 2. Append event WITH config version for deterministic replay
                const event = await EventStore.append({
                    organizationId,
                    aggregateId: projectId,
                    type: 'PHASE_CHANGED',
                    payload: {
                        fromPhase: project.currentPhase,
                        toPhase: targetPhase,
                        timestamp: new Date().toISOString(),
                        notes,
                        ...(typeof metadata === 'object' && metadata ? metadata : {}),
                    },
                    metadata: { userId },
                    phaseConfigVersion: validation.configVersion,
                }, tx);
                // 3. Update projection WITH OPTIMISTIC LOCKING
                const updates = {
                    currentPhase: targetPhase,
                    version: currentVersion + 1,
                    lastEventAt: event.createdAt,
                };
                // Auto-update dates based on phase
                if (targetPhase === 'ACOMPANHAMENTO' && !project.submittedAt) {
                    updates.submittedAt = new Date();
                }
                if (targetPhase === 'POS_APROVACAO' && !project.approvedAt) {
                    updates.approvedAt = new Date();
                    updates.status = 'APROVADO';
                }
                if (targetPhase === 'CONCLUIDO' && !project.completedAt) {
                    updates.completedAt = new Date();
                    updates.status = 'CONCLUIDO';
                }
                // ELITE: WHERE version = currentVersion (optimistic locking)
                const updateResult = await tx.project.updateMany({
                    where: {
                        id: projectId,
                        version: currentVersion, // ← CONCURRENCY CONTROL
                    },
                    data: updates,
                });
                if (updateResult.count === 0) {
                    throw new Error('CONCURRENT_MODIFICATION: Project was modified by another transaction. Please retry.');
                }
                const updated = await tx.project.findUniqueOrThrow({
                    where: { id: projectId },
                    include: { client: true },
                });
                // 4. Update read model
                await this.updateReadModel(db, projectId);
                return updated;
            });
        });
    }
    /**
     * Approve project value
     */
    static async approveValue(db, params) {
        const { projectId, amount, organizationId, userId, reference } = params;
        return await db.$transaction(async (tx) => {
            // Append event
            const event = await EventStore.append({
                organizationId,
                aggregateId: projectId,
                type: 'VALUE_APPROVED',
                payload: {
                    amount,
                    reference,
                    timestamp: new Date().toISOString(),
                },
                metadata: { userId },
            }, tx);
            // Update projection
            const updated = await tx.project.update({
                where: { id: projectId },
                data: {
                    valueApproved: amount,
                    approvedAt: new Date(),
                    version: { increment: 1 },
                    lastEventAt: event.createdAt,
                },
            });
            // Create funding record
            await tx.fundingRecord.create({
                data: {
                    projectId,
                    type: 'APROVADO',
                    amount,
                    reference,
                    recordDate: new Date(),
                    createdBy: userId,
                },
            });
            await this.updateReadModel(db, projectId);
            return updated;
        });
    }
    /**
     * Record captured value
     */
    static async recordCapture(db, params) {
        const { projectId, amount, organizationId, userId, reference } = params;
        return await db.$transaction(async (tx) => {
            const project = await tx.project.findUniqueOrThrow({ where: { id: projectId } });
            const newCaptured = Number(project.valueCaptured ?? 0) + amount;
            // Append event
            await EventStore.append({
                organizationId,
                aggregateId: projectId,
                type: 'VALUE_CAPTURED',
                payload: { amount, total: newCaptured, reference },
                metadata: { userId },
            }, tx);
            // Update projection
            await tx.project.update({
                where: { id: projectId },
                data: {
                    valueCaptured: newCaptured,
                    version: { increment: 1 },
                    lastEventAt: new Date(),
                },
            });
            // Create funding record
            await tx.fundingRecord.create({
                data: {
                    projectId,
                    type: 'CAPTADO',
                    amount,
                    reference,
                    recordDate: new Date(),
                    createdBy: userId,
                },
            });
            await this.updateReadModel(db, projectId);
        });
    }
    /**
     * Update materialized read model
     */
    static async updateReadModel(db, projectId) {
        const project = await db.project.findUnique({
            where: { id: projectId },
            include: { client: true },
        });
        if (!project)
            return;
        const captured = Number(project.valueCaptured ?? 0);
        const approved = Number(project.valueApproved ?? 0);
        const capturePercent = approved > 0 ? (captured / approved) * 100 : null;
        const daysToDeadline = project.submissionDeadline
            ? Math.ceil((project.submissionDeadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null;
        const documentsCount = await db.document.count({ where: { projectId } });
        await db.projectReadModel.upsert({
            where: { id: projectId },
            create: {
                id: projectId,
                organizationId: project.organizationId,
                clientId: project.clientId,
                clientName: project.client?.name,
                code: project.code,
                title: project.title,
                phase: project.currentPhase,
                status: project.status,
                approvedValue: project.valueApproved,
                capturedValue: project.valueCaptured,
                capturePercent,
                documentsCount: documentsCount,
                phasesCount: 0,
                submissionDeadline: project.submissionDeadline,
                daysToDeadline,
                updatedAt: new Date(),
            },
            update: {
                phase: project.currentPhase,
                status: project.status,
                approvedValue: project.valueApproved,
                capturedValue: project.valueCaptured,
                capturePercent,
                documentsCount: documentsCount,
                daysToDeadline,
                updatedAt: new Date(),
            },
        });
    }
    /**
     * Get project with full history (rebuilt from events)
     */
    static async getWithHistory(db, projectId) {
        const [project, documents, events, verification] = await Promise.all([
            db.project.findUnique({
                where: { id: projectId },
                include: { client: true },
            }),
            db.document.findMany({
                where: { projectId },
                orderBy: { createdAt: 'desc' },
            }),
            EventStore.getStream(projectId, 0, db),
            EventStore.verifyChain(projectId, db),
        ]);
        return {
            project: project ? { ...project, documents } : null,
            events,
            chainValid: verification.valid,
            chainBrokenAt: verification.brokenAt,
        };
    }
}
