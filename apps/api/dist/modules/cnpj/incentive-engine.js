const DEFAULT_RULES = [
    {
        id: 'rouanet',
        lei: 'Lei Rouanet',
        tag: 'Cultura',
        requiresActiveStatus: true,
        requiresNonProfit: false,
        primaryCnaePrefixes: ['9001', '9002', '9003', '9102', '8592'],
        secondaryCnaePrefixes: ['9001', '9002', '9003', '9102', '5911', '5912'],
        docsNecessarios: ['Estatuto Social', 'Certidões Negativas', 'Plano de Trabalho Cultural'],
    },
    {
        id: 'audiovisual',
        lei: 'Lei do Audiovisual',
        tag: 'Audiovisual',
        requiresActiveStatus: true,
        requiresNonProfit: false,
        primaryCnaePrefixes: ['5911', '5912', '5913'],
        secondaryCnaePrefixes: ['5911', '5912', '5913', '9001'],
        docsNecessarios: ['Contrato Social', 'Registro Ancine', 'Plano de Produção'],
    },
    {
        id: 'esporte',
        lei: 'Lei do Esporte',
        tag: 'Esporte',
        requiresActiveStatus: true,
        requiresNonProfit: true,
        primaryCnaePrefixes: ['9311', '9312', '9313', '9319', '8591'],
        secondaryCnaePrefixes: ['9311', '9312', '9313', '9319'],
        docsNecessarios: ['Estatuto Compatível', 'Certidões Negativas', 'Comprovação de Atuação Esportiva'],
    },
    {
        id: 'pronon',
        lei: 'PRONON',
        tag: 'Saúde',
        requiresActiveStatus: true,
        requiresNonProfit: true,
        primaryCnaePrefixes: ['8610', '8640', '8650', '8660', '9499'],
        secondaryCnaePrefixes: ['8610', '8640', '8650', '8660'],
        docsNecessarios: ['Cebas ou ato equivalente', 'Certidões', 'Plano Assistencial'],
    },
    {
        id: 'pronas',
        lei: 'PRONAS/PCD',
        tag: 'Social',
        requiresActiveStatus: true,
        requiresNonProfit: true,
        primaryCnaePrefixes: ['8720', '8730', '8810', '9499', '8599'],
        secondaryCnaePrefixes: ['8720', '8730', '8810', '8599'],
        docsNecessarios: ['Plano de Atendimento', 'Certidões', 'Documentação de Governança'],
    },
];
function sanitize(value) {
    return (value || '').replace(/\D/g, '');
}
function isActiveStatus(codigo, descricao) {
    const code = sanitize(codigo);
    const label = (descricao || '').toUpperCase();
    return code === '2' || label.includes('ATIV');
}
function isNonProfitNature(codigo) {
    const normalized = sanitize(codigo);
    return normalized === '3999' || normalized === '3069';
}
function matchesPrefix(code, prefixes) {
    return prefixes.some((prefix) => code.startsWith(sanitize(prefix)));
}
function getRules() {
    const raw = process.env.SERPRO_INCENTIVE_RULES_JSON;
    if (!raw)
        return DEFAULT_RULES;
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_RULES;
    }
    catch {
        return DEFAULT_RULES;
    }
}
function readinessLabel(score) {
    if (score >= 85)
        return 'Prontidão alta';
    if (score >= 70)
        return 'Prontidão moderada';
    if (score >= 50)
        return 'Prontidão condicionada';
    return 'Prontidão baixa';
}
export class IncentiveEngine {
    static analyze(dossier) {
        const rules = getRules();
        const principal = dossier.cnaePrincipal ? sanitize(dossier.cnaePrincipal.codigo) : '';
        const secundarios = dossier.cnaesSecundarios.map((item) => ({ ...item, codigo: sanitize(item.codigo) }));
        const active = isActiveStatus(dossier.situacaoCadastral.codigo, dossier.situacaoCadastral.descricao);
        const nonProfit = isNonProfitNature(dossier.naturezaJuridica.codigo);
        const leisHabilitadas = rules.map((rule) => {
            const principalMatch = principal ? matchesPrefix(principal, rule.primaryCnaePrefixes) : false;
            const secondaryMatch = secundarios.find((item) => matchesPrefix(item.codigo, rule.secondaryCnaePrefixes));
            const hasAnyMatch = principalMatch || Boolean(secondaryMatch);
            const elegivel = hasAnyMatch && active && (!rule.requiresNonProfit || nonProfit);
            let motivo = 'Sem aderência imediata aos critérios parametrizados.';
            let confianca = 'BAIXA';
            let matchedOn = 'NAO_APLICA';
            let matchedCnae = undefined;
            if (!active) {
                motivo = `Situação cadastral ${dossier.situacaoCadastral.descricao || dossier.situacaoCadastral.codigo}. Regularize antes de protocolar.`;
                confianca = 'IMPEDITIVA';
            }
            else if (principalMatch && dossier.cnaePrincipal) {
                motivo = `Possui CNAE principal ${dossier.cnaePrincipal.codigo} compatível com ${rule.lei}.`;
                confianca = rule.requiresNonProfit && !nonProfit ? 'MEDIA' : 'ALTA';
                matchedOn = 'PRINCIPAL';
                matchedCnae = dossier.cnaePrincipal;
            }
            else if (secondaryMatch) {
                motivo = `CNAE secundário ${secondaryMatch.codigo} indica aderência, mas exige comprovação material da atividade.`;
                confianca = rule.requiresNonProfit && !nonProfit ? 'BAIXA' : 'MEDIA';
                matchedOn = 'SECUNDARIO';
                matchedCnae = secondaryMatch;
            }
            else if (rule.notes) {
                motivo = rule.notes;
            }
            if (hasAnyMatch && rule.requiresNonProfit && !nonProfit) {
                motivo = `${motivo} Natureza jurídica atual (${dossier.naturezaJuridica.codigo}) requer validação para confirmar enquadramento sem fins lucrativos.`;
                confianca = 'BAIXA';
            }
            return {
                lei: rule.lei,
                tag: rule.tag,
                elegivel,
                confianca,
                motivo,
                docsNecessarios: rule.docsNecessarios,
                matchedOn,
                matchedCnae,
                exigeSemFinsLucrativos: rule.requiresNonProfit,
            };
        });
        const alertas = [];
        if (!active) {
            alertas.push({
                lei: 'Cadastro Federal',
                status: 'IMPEDITIVO',
                mensagem: 'CNPJ não está ativo. A captação pública deve ser bloqueada até a regularização cadastral.',
            });
        }
        if (!nonProfit) {
            alertas.push({
                lei: 'Natureza Jurídica',
                status: 'ATENCAO',
                mensagem: 'Valide se a natureza jurídica permite enquadramento em leis restritas a entidades sem fins lucrativos.',
            });
        }
        if (dossier.quadroSocios.length === 0) {
            alertas.push({
                lei: 'Governança',
                status: 'ATENCAO',
                mensagem: 'Quadro de sócios/administradores ausente. Revise a governança antes de submeter editais sensíveis.',
            });
        }
        const eligibleCount = leisHabilitadas.filter((item) => item.elegivel).length;
        const secondaryCount = leisHabilitadas.filter((item) => item.matchedOn === 'SECUNDARIO').length;
        let readinessScore = 0;
        if (active)
            readinessScore += 35;
        if (nonProfit)
            readinessScore += 20;
        if (dossier.email)
            readinessScore += 10;
        if (dossier.telefones.length > 0)
            readinessScore += 10;
        if (dossier.quadroSocios.length > 0)
            readinessScore += 10;
        readinessScore += Math.min(15, eligibleCount * 8);
        if (secondaryCount > 0)
            readinessScore -= Math.min(10, secondaryCount * 3);
        readinessScore = Math.max(0, Math.min(100, readinessScore));
        const badges = leisHabilitadas.filter((item) => item.elegivel).map((item) => item.tag);
        const resumo = eligibleCount > 0
            ? `${eligibleCount} lei(s) com aderência imediata com base nos CNAEs e na natureza jurídica retornados pela API SERPRO.`
            : 'Nenhuma lei foi pré-habilitada automaticamente. Revise CNAEs, natureza jurídica e documentação institucional.';
        return {
            readinessScore,
            readinessLabel: readinessLabel(readinessScore),
            badges,
            resumo,
            leisHabilitadas,
            alertas,
        };
    }
}
