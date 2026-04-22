import { createHash } from 'node:crypto';
import { OpenCnpjService } from '../cnpj/open-cnpj.service.js';
function onlyDigits(value) {
    return (value || '').replace(/\D/g, '');
}
function formatStoredCnpj(value) {
    const digits = onlyDigits(value);
    if (digits.length !== 14)
        return value || '';
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}
function parseDate(value) {
    if (!value)
        return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}
function toNumber(value) {
    if (value === null || value === undefined)
        return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}
function hashPayload(payload) {
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}
function buildLookupPayload(input) {
    return {
        dadosCnpj: {
            cnpj: onlyDigits(input.cnpj),
            razaoSocial: input.razaoSocial || input.name,
            nomeFantasia: input.nomeFantasia || '',
            dataAbertura: input.dataAbertura || '',
            situacaoCadastral: input.situacaoCadastral || { codigo: '', descricao: '' },
            naturezaJuridica: input.naturezaJuridica || { codigo: '', descricao: '' },
            capitalSocial: toNumber(input.capitalSocial) || 0,
            porte: input.porte || '',
            enteFederativoResponsavel: input.enteFederativoResponsavel || '',
            situacaoEspecial: input.situacaoEspecial || '',
            cnaePrincipal: input.cnaePrincipal || null,
            cnaesSecundarios: input.cnaesSecundarios || [],
            quadroSocios: input.quadroSocios || [],
            endereco: input.address || {},
            email: input.contactEmail || '',
            telefones: input.contactPhones || [],
        },
        analiseIncentivos: input.cnpjAnalysis || undefined,
        consultadoEm: input.lastCnpjLookupAt || new Date().toISOString(),
        cache: {
            hit: false,
            source: input.source === 'SERPRO_DEMO' || input.source === 'OPENCNPJ_DEMO' ? 'demo' : 'api',
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
    };
}
function mapClientRecord(client) {
    const cnaePrincipal = client.cnaes.find((item) => item.isPrimary) || null;
    const cnaesSecundarios = client.cnaes.filter((item) => !item.isPrimary);
    const latestLookup = client.cnpjLookups?.[0] || null;
    return {
        id: client.id,
        name: client.name,
        sector: client.sector,
        contactEmail: client.contactEmail,
        contactPhone: client.contactPhone || '',
        since: client.createdAt?.toISOString?.().split('T')[0] || new Date().toISOString().split('T')[0],
        organizationId: client.organizationId,
        cnpj: client.cnpj,
        razaoSocial: client.razaoSocial || undefined,
        nomeFantasia: client.nomeFantasia || undefined,
        apiValidated: Boolean(client.verifiedAt),
        source: client.source || 'MANUAL',
        verifiedAt: client.verifiedAt?.toISOString?.(),
        dataAbertura: client.dataAbertura?.toISOString?.(),
        situacaoCadastral: client.situacaoCadastralCodigo
            ? {
                codigo: client.situacaoCadastralCodigo,
                descricao: client.situacaoCadastralDescricao || undefined,
                data: client.situacaoCadastralData?.toISOString?.(),
                motivo: client.situacaoCadastralMotivo || undefined,
            }
            : undefined,
        naturezaJuridica: client.naturezaJuridicaCodigo
            ? {
                codigo: client.naturezaJuridicaCodigo,
                descricao: client.naturezaJuridicaDescricao || undefined,
            }
            : undefined,
        capitalSocial: client.capitalSocial ? Number(client.capitalSocial) : undefined,
        porte: client.porte || undefined,
        enteFederativoResponsavel: client.enteFederativoResponsavel || undefined,
        situacaoEspecial: client.situacaoEspecial || undefined,
        cnaePrincipal: cnaePrincipal ? { codigo: cnaePrincipal.codigo, descricao: cnaePrincipal.descricao } : null,
        cnaesSecundarios: cnaesSecundarios.map((item) => ({ codigo: item.codigo, descricao: item.descricao })),
        quadroSocios: client.sociosQsa.map((item) => ({
            nome: item.nome,
            qualificacao: item.qualificacao || undefined,
            paisOrigem: item.paisOrigem || undefined,
            nomeRepresentante: item.nomeRepresentante || undefined,
            qualificacaoRepresentante: item.qualificacaoRepresentante || undefined,
            faixaEtaria: item.faixaEtaria || undefined,
            dataEntrada: item.dataEntrada?.toISOString?.(),
        })),
        address: client.address || undefined,
        contactPhones: Array.isArray(client.metadata?.contactPhones) ? client.metadata.contactPhones : [],
        lastCnpjLookupAt: latestLookup?.queriedAt?.toISOString?.(),
        cnpjAnalysis: latestLookup?.analysis || client.metadata?.cnpjAnalysis || undefined,
    };
}
async function createLookupAudit(tx, params) {
    return tx.cnpjLookup.create({
        data: {
            organizationId: params.organizationId,
            clientId: params.clientId,
            cnpj: formatStoredCnpj(params.cnpj),
            queriedByUserId: params.userId,
            source: params.source,
            cacheHit: params.cacheHit,
            resultHash: hashPayload(params.rawResponse),
            rawResponse: params.rawResponse,
            analysis: params.analysis,
            queriedAt: parseDate(params.queriedAt) || new Date(),
            expiresAt: parseDate(params.expiresAt),
        },
    });
}
export class ClientService {
    static async create(db, input) {
        const normalizedCnpj = formatStoredCnpj(input.cnpj);
        if (normalizedCnpj) {
            const existing = await db.client.findFirst({
                where: {
                    organizationId: input.organizationId,
                    cnpj: normalizedCnpj,
                    deletedAt: null,
                },
                select: { id: true },
            });
            if (existing) {
                throw new Error('Já existe um cliente cadastrado com este CNPJ.');
            }
        }
        const payload = buildLookupPayload(input);
        const client = await db.$transaction(async (tx) => {
            const createdClient = await tx.client.create({
                data: {
                    organizationId: input.organizationId,
                    name: input.name,
                    cnpj: normalizedCnpj || '',
                    sector: input.sector,
                    contactName: input.name,
                    contactEmail: input.contactEmail,
                    contactPhone: input.contactPhone || null,
                    razaoSocial: input.razaoSocial || input.name,
                    nomeFantasia: input.nomeFantasia || null,
                    source: input.source || 'MANUAL',
                    verifiedAt: input.apiValidated ? (parseDate(input.lastCnpjLookupAt) || new Date()) : null,
                    dataAbertura: parseDate(input.dataAbertura),
                    situacaoCadastralCodigo: input.situacaoCadastral?.codigo || null,
                    situacaoCadastralDescricao: input.situacaoCadastral?.descricao || null,
                    situacaoCadastralData: parseDate(input.situacaoCadastral?.data),
                    situacaoCadastralMotivo: input.situacaoCadastral?.motivo || null,
                    naturezaJuridicaCodigo: input.naturezaJuridica?.codigo || null,
                    naturezaJuridicaDescricao: input.naturezaJuridica?.descricao || null,
                    capitalSocial: toNumber(input.capitalSocial),
                    porte: input.porte || null,
                    enteFederativoResponsavel: input.enteFederativoResponsavel || null,
                    situacaoEspecial: input.situacaoEspecial || null,
                    readinessScore: input.cnpjAnalysis?.readinessScore ?? null,
                    readinessLabel: input.cnpjAnalysis?.readinessLabel || null,
                    incentiveBadges: input.cnpjAnalysis?.badges || [],
                    address: input.address || undefined,
                    metadata: {
                        contactPhones: input.contactPhones || [],
                        cnpjAnalysis: input.cnpjAnalysis || null,
                        apiValidated: Boolean(input.apiValidated),
                    },
                },
            });
            const cnaes = [
                ...(input.cnaePrincipal ? [{ ...input.cnaePrincipal, isPrimary: true, displayOrder: 0 }] : []),
                ...((input.cnaesSecundarios || []).map((item, index) => ({
                    ...item,
                    isPrimary: false,
                    displayOrder: index + 1,
                }))),
            ];
            if (cnaes.length > 0) {
                await tx.cnae.createMany({
                    data: cnaes.map((item) => ({
                        clientId: createdClient.id,
                        codigo: item.codigo,
                        descricao: item.descricao,
                        isPrimary: item.isPrimary,
                        displayOrder: item.displayOrder,
                    })),
                });
            }
            if ((input.quadroSocios || []).length > 0) {
                await tx.socioQSA.createMany({
                    data: (input.quadroSocios || []).map((partner) => ({
                        clientId: createdClient.id,
                        nome: partner.nome,
                        qualificacao: partner.qualificacao || null,
                        paisOrigem: partner.paisOrigem || null,
                        nomeRepresentante: partner.nomeRepresentante || null,
                        qualificacaoRepresentante: partner.qualificacaoRepresentante || null,
                        faixaEtaria: partner.faixaEtaria || null,
                        dataEntrada: parseDate(partner.dataEntrada),
                    })),
                });
            }
            if (normalizedCnpj && input.apiValidated) {
                await createLookupAudit(tx, {
                    organizationId: input.organizationId,
                    clientId: createdClient.id,
                    cnpj: normalizedCnpj,
                    userId: input.userId,
                    source: input.source === 'SERPRO_DEMO' || input.source === 'OPENCNPJ_DEMO'
                        ? 'OPENCNPJ_DEMO'
                        : input.source === 'MANUAL'
                            ? 'MANUAL'
                            : 'OPENCNPJ',
                    cacheHit: false,
                    rawResponse: payload,
                    analysis: input.cnpjAnalysis,
                    queriedAt: input.lastCnpjLookupAt,
                    expiresAt: payload.cache?.expiresAt,
                });
            }
            return tx.client.findUniqueOrThrow({
                where: { id: createdClient.id },
                include: {
                    cnaes: { orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }] },
                    sociosQsa: { orderBy: { createdAt: 'asc' } },
                    cnpjLookups: { orderBy: { queriedAt: 'desc' }, take: 1 },
                },
            });
        });
        return mapClientRecord(client);
    }
    static async listByOrganization(db, organizationId) {
        const clients = await db.client.findMany({
            where: { organizationId, deletedAt: null },
            include: {
                cnaes: { orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }] },
                sociosQsa: { orderBy: { createdAt: 'asc' } },
                cnpjLookups: { orderBy: { queriedAt: 'desc' }, take: 1 },
            },
            orderBy: { updatedAt: 'desc' },
        });
        return clients.map(mapClientRecord);
    }
    static async getDossier(db, clientId, organizationId) {
        const client = await db.client.findFirst({
            where: {
                id: clientId,
                organizationId,
                deletedAt: null,
            },
            include: {
                cnaes: { orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }] },
                sociosQsa: { orderBy: { createdAt: 'asc' } },
                cnpjLookups: { orderBy: { queriedAt: 'desc' }, take: 10 },
            },
        });
        if (!client) {
            throw new Error('Cliente não encontrado.');
        }
        return {
            client: mapClientRecord(client),
            lookups: client.cnpjLookups.map((lookup) => ({
                id: lookup.id,
                source: lookup.source,
                cacheHit: lookup.cacheHit,
                queriedAt: lookup.queriedAt.toISOString(),
                expiresAt: lookup.expiresAt?.toISOString() || null,
                resultHash: lookup.resultHash,
            })),
        };
    }
    static async lookupDossier(db, cnpjInput, options) {
        const normalized = onlyDigits(cnpjInput);
        if (normalized.length !== 14) {
            throw new Error('INVALID_CNPJ');
        }
        if (!options.organizationId) {
            return OpenCnpjService.lookup(normalized);
        }
        const formattedCnpj = formatStoredCnpj(normalized);
        const now = new Date();
        const latestCached = await db.cnpjLookup.findFirst({
            where: {
                organizationId: options.organizationId,
                cnpj: formattedCnpj,
            },
            orderBy: { queriedAt: 'desc' },
        });
        const cached = latestCached && latestCached.expiresAt && latestCached.expiresAt > now
            ? latestCached
            : null;
        if (cached) {
            const cachedPayload = cached.rawResponse;
            await db.cnpjLookup.create({
                data: {
                    organizationId: options.organizationId,
                    clientId: cached.clientId,
                    cnpj: formattedCnpj,
                    queriedByUserId: options.userId,
                    source: 'DB_CACHE',
                    cacheHit: true,
                    resultHash: cached.resultHash,
                    rawResponse: cached.rawResponse,
                    analysis: cached.analysis,
                    expiresAt: cached.expiresAt,
                },
            });
            return {
                ...cachedPayload,
                consultadoEm: new Date().toISOString(),
                cache: {
                    hit: true,
                    source: 'local-cache',
                    expiresAt: cached.expiresAt?.toISOString(),
                },
            };
        }
        try {
            const payload = await OpenCnpjService.lookup(formattedCnpj, {
                organizationId: options.organizationId,
            });
            const client = await db.client.findFirst({
                where: {
                    organizationId: options.organizationId,
                    cnpj: formattedCnpj,
                    deletedAt: null,
                },
                select: { id: true },
            });
            await db.cnpjLookup.create({
                data: {
                    organizationId: options.organizationId,
                    clientId: client?.id,
                    cnpj: formattedCnpj,
                    queriedByUserId: options.userId,
                    source: payload.cache?.source === 'demo' ? 'OPENCNPJ_DEMO' : 'OPENCNPJ',
                    cacheHit: Boolean(payload.cache?.hit),
                    resultHash: hashPayload(payload),
                    rawResponse: payload,
                    analysis: payload.analiseIncentivos || {},
                    queriedAt: new Date(),
                    expiresAt: parseDate(payload.cache?.expiresAt) || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                },
            });
            return payload;
        }
        catch (error) {
            if (latestCached) {
                const stalePayload = latestCached.rawResponse;
                await db.cnpjLookup.create({
                    data: {
                        organizationId: options.organizationId,
                        clientId: latestCached.clientId,
                        cnpj: formattedCnpj,
                        queriedByUserId: options.userId,
                        source: 'DB_CACHE',
                        cacheHit: true,
                        resultHash: latestCached.resultHash,
                        rawResponse: latestCached.rawResponse,
                        analysis: latestCached.analysis,
                        queriedAt: new Date(),
                        expiresAt: latestCached.expiresAt,
                    },
                });
                return {
                    ...stalePayload,
                    consultadoEm: new Date().toISOString(),
                    cache: {
                        hit: true,
                        source: 'local-cache',
                        expiresAt: latestCached.expiresAt?.toISOString(),
                        stale: true,
                        staleReason: 'Dados exibidos a partir da última consulta persistida, pois a sincronização oficial falhou nesta tentativa.',
                    },
                    warnings: [
                        ...(Array.isArray(stalePayload?.warnings) ? stalePayload.warnings : []),
                        'Exibindo a última versão salva no banco. Uma nova sincronização oficial não pôde ser concluída agora.',
                    ],
                };
            }
            throw error;
        }
    }
}
