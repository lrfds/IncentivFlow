import { normalizeCapitalSocial, sanitizeDate, sanitizeDigits, sanitizeText } from './serpro.mapper.js';
function mapSituacao(value) {
    const normalized = sanitizeText(value);
    const upper = normalized.toUpperCase();
    if (upper.includes('ATIV'))
        return { codigo: '2', descricao: normalized || 'Ativa' };
    if (upper.includes('BAIX'))
        return { codigo: '8', descricao: normalized || 'Baixada' };
    if (upper.includes('SUSP'))
        return { codigo: '3', descricao: normalized || 'Suspensa' };
    if (upper.includes('INAP'))
        return { codigo: '1', descricao: normalized || 'Inapta' };
    return { codigo: sanitizeDigits(value) || '0', descricao: normalized };
}
function extractPhoneList(payload) {
    if ((payload.telefones || []).length > 0) {
        return (payload.telefones || [])
            .map((item) => ({
            ddd: sanitizeDigits(item.ddd).slice(0, 3) || undefined,
            numero: sanitizeDigits(item.numero) || undefined,
        }))
            .filter((item) => item.numero);
    }
    const raw = sanitizeText(payload.telefone);
    if (!raw)
        return [];
    const digits = sanitizeDigits(raw);
    if (!digits)
        return [];
    return [{
            ddd: digits.length >= 10 ? digits.slice(0, 2) : undefined,
            numero: digits.length >= 10 ? digits.slice(2) : digits,
        }];
}
function normalizeSecondaryActivity(item) {
    if (typeof item === 'string') {
        const codigo = sanitizeDigits(item);
        return codigo ? { codigo, descricao: `CNAE ${codigo}` } : null;
    }
    const codigo = sanitizeDigits(item.codigo);
    if (!codigo)
        return null;
    return {
        codigo,
        descricao: sanitizeText(item.descricao) || `CNAE ${codigo}`,
    };
}
function mapNaturezaJuridica(payload) {
    const descricao = sanitizeText(payload.natureza_juridica);
    const rawCodigo = sanitizeDigits(payload.codigo_natureza_juridica);
    if (rawCodigo) {
        return { codigo: rawCodigo, descricao };
    }
    const upper = descricao.toUpperCase();
    if (upper.includes('ASSOCIACAO')) {
        return { codigo: '3999', descricao };
    }
    if (upper.includes('FUNDACAO')) {
        return { codigo: '3069', descricao };
    }
    return {
        codigo: descricao ? 'NAO_INFORMADO' : 'SEM_DADOS',
        descricao: descricao || 'Natureza jurídica não informada',
    };
}
function normalizeQsaItem(item) {
    const nome = sanitizeText(item.nome_socio);
    if (!nome)
        return null;
    return {
        nome,
        qualificacao: sanitizeText(item.qualificacao_socio) || undefined,
        paisOrigem: sanitizeText(item.pais_origem) || undefined,
        nomeRepresentante: sanitizeText(item.nome_rep_legal) || undefined,
        qualificacaoRepresentante: sanitizeText(item.qual_rep_legal) || undefined,
        faixaEtaria: sanitizeText(item.faixa_etaria) || undefined,
        dataEntrada: sanitizeDate(item.data_entrada_sociedade) || undefined,
    };
}
export function buildOpenCnpjDossier(payload) {
    const situacao = mapSituacao(sanitizeText(payload.situacao_cadastral));
    const natureza = mapNaturezaJuridica(payload);
    const cnaePrincipalCodigo = sanitizeDigits(payload.cnae_principal);
    const cnaesSecundariosRaw = payload.atividades_secundarias?.length
        ? payload.atividades_secundarias
        : payload.cnaes_secundarios || [];
    const cnpj = sanitizeDigits(payload.cnpj).slice(0, 14);
    return {
        cnpj,
        razaoSocial: sanitizeText(payload.razao_social) || `CNPJ ${cnpj}`,
        nomeFantasia: sanitizeText(payload.nome_fantasia),
        dataAbertura: sanitizeDate(payload.data_inicio_atividade),
        situacaoCadastral: {
            codigo: situacao.codigo || '0',
            descricao: situacao.descricao || 'Não informado',
            data: sanitizeDate(payload.data_situacao_cadastral),
            motivo: sanitizeText(payload.motivo_situacao_cadastral),
        },
        naturezaJuridica: natureza,
        capitalSocial: normalizeCapitalSocial(payload.capital_social),
        porte: sanitizeText(payload.porte_empresa || payload.porte),
        enteFederativoResponsavel: '',
        situacaoEspecial: sanitizeText(payload.situacao_especial),
        cnaePrincipal: cnaePrincipalCodigo
            ? {
                codigo: cnaePrincipalCodigo,
                descricao: sanitizeText(payload.cnae_principal_descricao) || `CNAE ${cnaePrincipalCodigo}`,
            }
            : null,
        cnaesSecundarios: cnaesSecundariosRaw
            .map(normalizeSecondaryActivity)
            .filter((item) => Boolean(item)),
        quadroSocios: (payload.QSA?.length ? payload.QSA : payload.qsa || [])
            .map(normalizeQsaItem)
            .filter((item) => Boolean(item)),
        endereco: {
            logradouro: sanitizeText(payload.logradouro),
            numero: sanitizeText(payload.numero),
            complemento: sanitizeText(payload.complemento),
            bairro: sanitizeText(payload.bairro),
            municipio: sanitizeText(payload.municipio),
            uf: sanitizeText(payload.uf),
            cep: sanitizeText(payload.cep),
        },
        email: sanitizeText(payload.email),
        telefones: extractPhoneList(payload),
    };
}
