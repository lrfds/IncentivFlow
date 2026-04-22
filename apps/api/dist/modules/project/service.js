// Module: Project - Domain Service
import { prisma, withTransaction } from '../../core/prisma.js';
import { PhaseEngine } from '../../domain/phase-engine.js';
import { RLS } from '../../core/rls.js';
import { Decimal } from '@prisma/client/runtime/library';
export class ProjectService {
    static async list(ctx, filters = {}) {
        const where = {
            ...RLS.forProjectAccess(ctx),
            ...(filters.status && { status: filters.status }),
            ...(filters.phase && { currentPhase: filters.phase }),
            ...(filters.clientId && { clientId: filters.clientId }),
            ...(filters.search && {
                OR: [
                    { title: { contains: filters.search, mode: 'insensitive' } },
                    { code: { contains: filters.search, mode: 'insensitive' } },
                    { description: { contains: filters.search, mode: 'insensitive' } },
                ],
            }),
        };
        const [projects, total] = await Promise.all([
            prisma.project.findMany({
                where,
                include: {
                    client: { select: { id: true, name: true, sector: true } },
                    _count: { select: { documents: true, phaseHistory: true, funding: true } },
                },
                orderBy: { updatedAt: 'desc' },
                skip: ((filters.page || 1) - 1) * (filters.limit || 50),
                take: filters.limit || 50,
            }),
            prisma.project.count({ where }),
        ]);
        return {
            data: projects.map(p => ({
                ...p,
                valueRequested: p.valueRequested ? Number(p.valueRequested) : null,
                valueApproved: p.valueApproved ? Number(p.valueApproved) : null,
                valueCaptured: p.valueCaptured ? Number(p.valueCaptured) : null,
            })),
            total,
            page: filters.page || 1,
            limit: filters.limit || 50,
        };
    }
    static async getById(ctx, id) {
        const project = await prisma.project.findFirst({
            where: RLS.forProjectAccess(ctx, id),
            include: {
                client: true,
                phaseHistory: {
                    orderBy: { transitionedAt: 'asc' },
                    include: {},
                },
                documents: {
                    orderBy: { createdAt: 'desc' },
                },
                funding: {
                    orderBy: { recordDate: 'desc' },
                },
            },
        });
        if (!project)
            throw new Error('Projeto não encontrado');
        return {
            ...project,
            valueRequested: project.valueRequested ? Number(project.valueRequested) : null,
            valueApproved: project.valueApproved ? Number(project.valueApproved) : null,
            valueCaptured: project.valueCaptured ? Number(project.valueCaptured) : null,
            funding: project.funding.map(f => ({ ...f, amount: Number(f.amount) })),
        };
    }
    static async create(ctx, data) {
        // Validar client pertence à org
        const client = await prisma.client.findFirst({
            where: { id: data.clientId, organizationId: ctx.organizationId },
        });
        if (!client)
            throw new Error('Cliente não encontrado');
        // Validar código único
        const existing = await prisma.project.findFirst({
            where: { organizationId: ctx.organizationId, code: data.code },
        });
        if (existing)
            throw new Error('Código de projeto já existe');
        return withTransaction(async (tx) => {
            const project = await tx.project.create({
                data: {
                    organizationId: ctx.organizationId,
                    clientId: data.clientId,
                    code: data.code,
                    title: data.title,
                    description: data.description,
                    valueRequested: data.valueRequested ? new Decimal(data.valueRequested) : null,
                    submissionDeadline: data.submissionDeadline,
                    governmentBody: data.governmentBody,
                    tags: data.tags || [],
                    currentPhase: 'ELABORACAO',
                    status: 'EM_ANDAMENTO',
                },
                include: { client: true },
            });
            // Histórico inicial
            await tx.phaseHistory.create({
                data: {
                    projectId: project.id,
                    fromPhase: null,
                    toPhase: 'ELABORACAO',
                    transitionedBy: ctx.userId,
                    notes: 'Projeto criado',
                    metadata: { createdBy: ctx.userId },
                },
            });
            return project;
        });
    }
    static async update(ctx, id, data) {
        await this.assertAccess(ctx, id);
        return prisma.project.update({
            where: { id },
            data: {
                ...data,
                valueRequested: data.valueRequested ? new Decimal(data.valueRequested) : undefined,
                valueApproved: data.valueApproved ? new Decimal(data.valueApproved) : undefined,
                valueCaptured: data.valueCaptured ? new Decimal(data.valueCaptured) : undefined,
            },
        });
    }
    static async transitionPhase(ctx, id, toPhase, notes, metadata) {
        const project = await prisma.project.findFirst({
            where: RLS.forProjectAccess(ctx, id),
            include: { _count: { select: { documents: true } } },
        });
        if (!project)
            throw new Error('Projeto não encontrado');
        // Validar transição
        const validation = PhaseEngine.validateTransition({
            ...project,
            documentsCount: project._count.documents,
        }, toPhase);
        if (!validation.valid) {
            const error = new Error('Transição inválida');
            error.details = validation.errors;
            error.requiredFields = validation.requiredFields;
            throw error;
        }
        return withTransaction(async (tx) => {
            // Atualizar projeto
            const updateData = { currentPhase: toPhase };
            // Atualizar timestamps e status conforme fase
            if (toPhase === 'ACOMPANHAMENTO' && !project.submittedAt) {
                updateData.submittedAt = new Date();
            }
            if (toPhase === 'POS_APROVACAO' && !project.approvedAt) {
                updateData.approvedAt = new Date();
                updateData.status = 'APROVADO';
            }
            if (toPhase === 'CONCLUIDO') {
                updateData.completedAt = new Date();
                updateData.status = 'CONCLUIDO';
            }
            const updated = await tx.project.update({
                where: { id },
                data: updateData,
            });
            // Registrar histórico
            await tx.phaseHistory.create({
                data: {
                    projectId: id,
                    fromPhase: project.currentPhase,
                    toPhase: toPhase,
                    transitionedBy: ctx.userId,
                    notes,
                    metadata,
                },
            });
            // Se aprovou, criar registro de funding automaticamente
            if (toPhase === 'POS_APROVACAO' && metadata?.approvedValue) {
                await tx.fundingRecord.create({
                    data: {
                        projectId: id,
                        type: 'APROVADO',
                        amount: new Decimal(metadata.approvedValue),
                        recordDate: new Date(),
                        reference: metadata.portaria || null,
                        notes: 'Valor aprovado pelo órgão',
                        createdBy: ctx.userId,
                    },
                });
                await tx.project.update({
                    where: { id },
                    data: { valueApproved: new Decimal(metadata.approvedValue) },
                });
            }
            return updated;
        });
    }
    static async delete(ctx, id) {
        await this.assertAccess(ctx, id);
        // Soft delete
        return prisma.project.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }
    static async assertAccess(ctx, projectId) {
        const project = await prisma.project.findFirst({
            where: RLS.forProjectAccess(ctx, projectId),
            select: { id: true },
        });
        if (!project)
            throw new Error('Projeto não encontrado ou sem permissão');
    }
}
