export const PHASE_RULES = [
    {
        from: null,
        to: 'ELABORACAO',
        requiredRole: ['ADMIN', 'CONSULTOR'],
    },
    {
        from: 'ELABORACAO',
        to: 'APROVACAO_CLIENTE',
        requiredRole: ['ADMIN', 'CONSULTOR'],
        requiredFields: ['title', 'description', 'valueRequested'],
        customValidation: (p) => ({
            valid: p.documentsCount >= 1,
            error: p.documentsCount < 1 ? 'Necessário pelo menos 1 documento' : undefined,
        }),
    },
    {
        from: 'APROVACAO_CLIENTE',
        to: 'SUBMISSAO',
        requiredRole: ['ADMIN', 'CONSULTOR', 'CLIENTE'],
    },
    {
        from: 'SUBMISSAO',
        to: 'ACOMPANHAMENTO',
        requiredRole: ['ADMIN', 'CONSULTOR'],
        requiredFields: ['submissionDeadline', 'protocolNumber'],
        customValidation: (p) => ({
            valid: !!p.submittedAt || !!p.protocolNumber,
            error: 'Protocolo de submissão obrigatório',
        }),
    },
    {
        from: 'ACOMPANHAMENTO',
        to: 'POS_APROVACAO',
        requiredRole: ['ADMIN', 'CONSULTOR'],
        requiredFields: ['valueApproved'],
    },
    {
        from: 'POS_APROVACAO',
        to: 'CONCLUIDO',
        requiredRole: ['ADMIN', 'CONSULTOR'],
        customValidation: (p) => ({
            valid: Number(p.valueCaptured || 0) >= Number(p.valueApproved || 0) * 0.9,
            error: 'Captação deve atingir pelo menos 90% do aprovado',
        }),
    },
    {
        from: 'APROVACAO_CLIENTE',
        to: 'ELABORACAO',
        requiredRole: ['ADMIN', 'CONSULTOR'],
    },
    {
        from: 'SUBMISSAO',
        to: 'APROVACAO_CLIENTE',
        requiredRole: ['ADMIN', 'CONSULTOR'],
    },
];
export class PhaseService {
    static validateTransition(project, fromPhase, toPhase, userRole) {
        const rule = PHASE_RULES.find(r => r.from === fromPhase && r.to === toPhase);
        if (!rule) {
            const phaseOrder = ['ELABORACAO', 'APROVACAO_CLIENTE', 'SUBMISSAO', 'ACOMPANHAMENTO', 'POS_APROVACAO', 'CONCLUIDO'];
            const fromIdx = phaseOrder.indexOf(fromPhase);
            const toIdx = phaseOrder.indexOf(toPhase);
            if (toIdx !== fromIdx + 1 && toIdx !== fromIdx - 1) {
                return {
                    valid: false,
                    errors: [`Transição direta de ${fromPhase} para ${toPhase} não permitida`],
                };
            }
        }
        const errors = [];
        if (rule && !rule.requiredRole.includes(userRole)) {
            errors.push(`Role ${userRole} não pode fazer esta transição`);
        }
        if (rule?.requiredFields) {
            const missing = rule.requiredFields.filter(field => !project[field]);
            if (missing.length > 0) {
                errors.push(`Campos obrigatórios: ${missing.join(', ')}`);
            }
        }
        if (rule?.customValidation) {
            const result = rule.customValidation(project);
            if (!result.valid && result.error) {
                errors.push(result.error);
            }
        }
        return {
            valid: errors.length === 0,
            errors,
            requiredFields: rule?.requiredFields,
        };
    }
    static async getHistory(db, organizationId, projectId) {
        const events = await db.event.findMany({
            where: { aggregateId: projectId, type: 'PHASE_CHANGED', organizationId },
            orderBy: { createdAt: 'asc' },
        });
        return events.map(e => ({
            id: e.id,
            fromPhase: e.payload?.fromPhase,
            toPhase: e.payload?.toPhase,
            notes: e.payload?.notes,
            transitionedAt: e.createdAt,
            userId: e.metadata?.userId,
        }));
    }
    static async getPhaseMetrics(db, organizationId) {
        const events = await db.event.findMany({
            where: { organizationId, type: 'PHASE_CHANGED' },
            orderBy: { createdAt: 'asc' },
            select: { aggregateId: true, createdAt: true, payload: true }
        });
        const phaseTimes = {};
        const projHistory = {};
        events.forEach(e => {
            if (!projHistory[e.aggregateId])
                projHistory[e.aggregateId] = [];
            projHistory[e.aggregateId].push({ time: e.createdAt.getTime(), toPhase: e.payload?.toPhase });
        });
        Object.values(projHistory).forEach(history => {
            history.forEach((h, idx) => {
                const next = history[idx + 1];
                if (next) {
                    const duration = next.time - h.time;
                    if (!phaseTimes[h.toPhase])
                        phaseTimes[h.toPhase] = [];
                    phaseTimes[h.toPhase].push(duration);
                }
            });
        });
        return Object.entries(phaseTimes).map(([phase, times]) => ({
            phase,
            avgDays: Math.round(times.reduce((a, b) => a + b, 0) / times.length / (1000 * 60 * 60 * 24)),
            count: times.length,
        }));
    }
}
