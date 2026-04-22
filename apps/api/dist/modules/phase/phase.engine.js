export class PhaseEngine {
    /**
     * Validate transition using config-driven rules from database
     */
    static async validate(db, projectId, targetPhase, organizationId, overrideVersion // Para replay determinístico
    ) {
        const project = await db.project.findUnique({
            where: { id: projectId }
        });
        if (!project) {
            throw new Error('Project not found');
        }
        const documentsCount = await db.document.count({ where: { projectId } });
        const projectData = { ...project, _count: { documents: documentsCount } };
        // Get phase config - CRITICAL: use specific version for replay
        const config = await db.phaseConfig.findFirst({
            where: {
                AND: [
                    {
                        OR: [
                            { organizationId, fromPhase: project.currentPhase, toPhase: targetPhase },
                            { organizationId: null, fromPhase: project.currentPhase, toPhase: targetPhase },
                        ],
                    },
                    // Use overrideVersion for deterministic replay, otherwise latest active
                    overrideVersion
                        ? { version: overrideVersion }
                        : { isActive: true }
                ],
            },
            orderBy: [{ organizationId: 'desc' }, { version: 'desc' }],
        });
        if (!config) {
            // Fallback to hardcoded rules if no config
            const result = await this.validateHardcoded(projectData, targetPhase);
            return { ...result, configVersion: 0 };
        }
        const rules = config.rules;
        const errors = [];
        for (const condition of rules.conditions) {
            const error = await this.evaluateCondition(db, condition, projectData);
            if (error)
                errors.push(error);
        }
        return {
            valid: errors.length === 0,
            errors,
            requiredFields: rules.requiredFields,
            configVersion: config.version, // CRITICAL FOR EVENT SOURCING
        };
    }
    static async evaluateCondition(db, condition, project) {
        switch (condition.type) {
            case 'min_documents':
                const docCount = project._count?.documents ?? 0;
                if (docCount < (condition.value ?? 0)) {
                    return condition.message || `Mínimo ${condition.value} documento(s) necessário(s)`;
                }
                break;
            case 'approved_value':
                if (!project.valueApproved || project.valueApproved <= 0) {
                    return condition.message || 'Valor aprovado deve ser maior que zero';
                }
                break;
            case 'captured_percentage':
                const captured = Number(project.valueCaptured ?? 0);
                const approved = Number(project.valueApproved ?? 0);
                const pct = approved > 0 ? captured / approved : 0;
                if (pct < (condition.value ?? 0)) {
                    return condition.message || `Captação insuficiente: ${(pct * 100).toFixed(1)}% (mínimo ${(condition.value * 100)}%)`;
                }
                break;
            case 'has_protocol':
                if (!project.protocolNumber) {
                    return condition.message || 'Número de protocolo obrigatório';
                }
                break;
            case 'has_client_approval':
                // Check if there's a phase history for client approval
                const hasApproval = await db.event.findFirst({
                    where: {
                        aggregateId: project.id,
                        type: 'CLIENT_APPROVED',
                    },
                });
                if (!hasApproval) {
                    return condition.message || 'Aprovação do cliente é obrigatória';
                }
                break;
            case 'custom':
                // For future custom validations
                if (condition.field && !project[condition.field]) {
                    return condition.message || `Campo ${condition.field} é obrigatório`;
                }
                break;
        }
        return null;
    }
    /**
     * Hardcoded fallback rules (for initial setup)
     */
    static async validateHardcoded(project, toPhase) {
        const errors = [];
        const docCount = project._count?.documents ?? 0;
        switch (toPhase) {
            case 'APROVACAO_CLIENTE':
                if (docCount < 1)
                    errors.push('Projeto deve ter ao menos 1 documento anexado');
                if (!project.valueRequested || Number(project.valueRequested) <= 0) {
                    errors.push('Valor solicitado deve ser informado');
                }
                break;
            case 'SUBMISSAO':
                if (docCount < 2)
                    errors.push('Mínimo 2 documentos para submissão');
                break;
            case 'ACOMPANHAMENTO':
                if (!project.protocolNumber)
                    errors.push('Número de protocolo obrigatório');
                break;
            case 'POS_APROVACAO':
                if (!project.valueApproved || Number(project.valueApproved) <= 0) {
                    errors.push('Valor aprovado deve ser maior que zero');
                }
                break;
            case 'CONCLUIDO':
                const captured = Number(project.valueCaptured ?? 0);
                const approved = Number(project.valueApproved ?? 0);
                if (approved > 0 && captured < approved * 0.8) {
                    errors.push(`Captação insuficiente: ${((captured / approved) * 100).toFixed(1)}% (mínimo 80%)`);
                }
                break;
        }
        return { valid: errors.length === 0, errors };
    }
    /**
     * Seed default phase configs
     */
    static async seedDefaults(db, organizationId) {
        const configs = [
            {
                fromPhase: 'ELABORACAO',
                toPhase: 'APROVACAO_CLIENTE',
                rules: {
                    conditions: [
                        { type: 'min_documents', value: 1, message: 'Adicione ao menos 1 documento (proposta)' },
                        { type: 'custom', field: 'valueRequested', message: 'Informe o valor solicitado' },
                    ],
                },
                version: 1,
            },
            {
                fromPhase: 'APROVACAO_CLIENTE',
                toPhase: 'SUBMISSAO',
                rules: {
                    conditions: [
                        { type: 'has_client_approval', message: 'Aguarde aprovação do cliente' },
                        { type: 'min_documents', value: 2, message: 'Anexe proposta assinada e documentos complementares' },
                    ],
                },
                version: 1,
            },
            {
                fromPhase: 'SUBMISSAO',
                toPhase: 'ACOMPANHAMENTO',
                rules: {
                    conditions: [
                        { type: 'has_protocol', message: 'Informe o número de protocolo da submissão' },
                    ],
                },
                version: 1,
            },
            {
                fromPhase: 'ACOMPANHAMENTO',
                toPhase: 'POS_APROVACAO',
                rules: {
                    conditions: [
                        { type: 'approved_value', message: 'Registre o valor aprovado pelo órgão' },
                    ],
                },
                version: 1,
            },
            {
                fromPhase: 'POS_APROVACAO',
                toPhase: 'CONCLUIDO',
                rules: {
                    conditions: [
                        { type: 'captured_percentage', value: 0.8, message: 'Captação deve atingir ao menos 80% do valor aprovado' },
                    ],
                },
                version: 1,
            },
        ];
        for (const config of configs) {
            await db.phaseConfig.upsert({
                where: {
                    organizationId_fromPhase_toPhase_version: {
                        organizationId: organizationId ?? '',
                        fromPhase: config.fromPhase,
                        toPhase: config.toPhase,
                        version: config.version,
                    },
                },
                create: {
                    ...config,
                    organizationId,
                },
                update: {},
            });
        }
    }
}
