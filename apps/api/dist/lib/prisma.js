import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';
const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});
// Middleware para Audit Log imutável
prisma.$use(async (params, next) => {
    const result = await next(params);
    // Apenas para models que devem ser auditados
    const auditableModels = ['Project', 'Client', 'Document', 'FundingRecord'];
    if (auditableModels.includes(params.model || '') &&
        ['create', 'update', 'delete'].includes(params.action)) {
        try {
            const ctx = globalThis.__auditContext;
            if (!ctx?.userId || !ctx?.organizationId)
                return result;
            const entityId = result?.id || params.args?.where?.id;
            if (!entityId)
                return result;
            // Buscar hash anterior para chain
            const lastLog = await prisma.auditLog.findFirst({
                where: { organizationId: ctx.organizationId },
                orderBy: { createdAt: 'desc' },
                select: { hash: true },
            });
            const changes = {
                before: params.action === 'update' ? params.args?.data : null,
                after: params.action !== 'delete' ? result : null,
            };
            const payload = JSON.stringify({
                action: params.action,
                entityType: params.model,
                entityId,
                changes,
                timestamp: new Date().toISOString(),
            });
            const prevHash = lastLog?.hash ?? 'GENESIS';
            const hash = crypto
                .createHash('sha256')
                .update(prevHash + payload)
                .digest('hex');
            await prisma.auditLog.create({
                data: {
                    organizationId: ctx.organizationId,
                    projectId: params.model === 'Project' ? entityId : params.args?.data?.projectId,
                    userId: ctx.userId,
                    action: params.action.toUpperCase(),
                    entityType: params.model,
                    entityId,
                    changes,
                    ipAddress: ctx.ip,
                    userAgent: ctx.userAgent,
                    prevHash,
                    hash,
                },
            });
        }
        catch (e) {
            console.error('Audit log failed:', e);
            // Não falha a operação principal
        }
    }
    return result;
});
export { prisma };
// Helper para configurar contexto de auditoria
export function setAuditContext(ctx) {
    globalThis.__auditContext = ctx;
}
export function clearAuditContext() {
    delete globalThis.__auditContext;
}
