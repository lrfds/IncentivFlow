import type { NormalizedCnpjDossier } from './incentive-engine.js';
import type {
  SerproBasicaResponse,
  SerproEmpresaResponse,
  SerproQsaRecord,
  SerproQsaResponse,
} from './serpro.schemas.js';

export interface SerproFullDossier extends NormalizedCnpjDossier {
  capitalSocial: number;
  porte: string;
  enteFederativoResponsavel: string;
  situacaoEspecial: string;
  dataAbertura: string;
  situacaoCadastral: {
    codigo: string;
    descricao?: string;
    data?: string;
    motivo?: string;
  };
  naturezaJuridica: {
    codigo: string;
    descricao?: string;
  };
  cnaePrincipal: { codigo: string; descricao: string } | null;
  cnaesSecundarios: Array<{ codigo: string; descricao: string }>;
}

function normalizeWhitespace(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sanitizeText(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  return normalizeWhitespace(String(value));
}

export function sanitizeDigits(value: unknown): string {
  return sanitizeText(value).replace(/\D/g, '');
}

export function sanitizeDate(value: unknown): string {
  const raw = sanitizeText(value);
  if (!raw) return '';
  return raw;
}

export function normalizeCapitalSocial(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const raw = sanitizeText(value);
  if (!raw) return 0;

  const cleaned = raw.replace(/[^\d,.-]/g, '');
  if (!cleaned) return 0;

  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  let normalized = cleaned;

  if (hasComma && hasDot) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = cleaned.replace(/,/g, '');
    }
  } else if (hasComma) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizePrimaryCnae(
  basica: SerproBasicaResponse,
  empresa: SerproEmpresaResponse,
): { codigo: string; descricao: string } | null {
  const candidate = basica.cnae_principal
    || empresa.cnaeFiscalPrincipal
    || empresa.cnae_fiscal_principal
    || (empresa.codigoCnaeFiscalPrincipal || empresa.cnae_fiscal_principal_codigo
      ? {
          codigo: empresa.codigoCnaeFiscalPrincipal || empresa.cnae_fiscal_principal_codigo,
          descricao: empresa.descricaoCnaeFiscalPrincipal || empresa.cnae_fiscal_principal_descricao || '',
        }
      : null);

  const codigo = sanitizeText(candidate?.codigo);
  if (!codigo) return null;

  return {
    codigo,
    descricao: sanitizeText(candidate?.descricao),
  };
}

function normalizeSecondaryCnaes(empresa: SerproEmpresaResponse): Array<{ codigo: string; descricao: string }> {
  const rawList = empresa.cnaes_secundarios?.length
    ? empresa.cnaes_secundarios
    : empresa.cnaesSecundarios?.length
      ? empresa.cnaesSecundarios
      : empresa.cnaes_secundarios_lista || [];

  return rawList
    .map((item) => ({
      codigo: sanitizeText(item.codigo || item.codigoCnae || item.codigo_cnae),
      descricao: sanitizeText(item.descricao || item.descricaoCnae || item.descricao_cnae),
    }))
    .filter((item) => item.codigo);
}

function normalizeQsaRows(qsa: SerproQsaResponse): SerproQsaRecord[] {
  if (Array.isArray(qsa)) {
    return qsa;
  }

  return Array.isArray(qsa.qsa) ? qsa.qsa : [];
}

function normalizeQsa(qsa: SerproQsaResponse): Array<{
  nome: string;
  qualificacao?: string;
  paisOrigem?: string;
  nomeRepresentante?: string;
  qualificacaoRepresentante?: string;
  faixaEtaria?: string;
  dataEntrada?: string;
}> {
  return normalizeQsaRows(qsa)
    .map((item) => ({
      nome: sanitizeText(item.nome_socio || item.nome || item.nomeSocio),
      qualificacao: sanitizeText(item.qualificacao_socio || item.qualificacao || item.qualificacaoSocio) || undefined,
      paisOrigem: sanitizeText(item.pais || item.pais_origem || item.codigo_pais || item.paisOrigem) || undefined,
      nomeRepresentante: sanitizeText(item.nome_representante_legal || item.nomeRepresentanteLegal) || undefined,
      qualificacaoRepresentante: sanitizeText(item.qualificacao_representante_legal || item.qualificacaoRepresentanteLegal) || undefined,
      faixaEtaria: sanitizeText(item.faixa_etaria || item.faixaEtaria) || undefined,
      dataEntrada: sanitizeDate(item.data_entrada_sociedade || item.dataEntradaSociedade || item.data_entrada) || undefined,
    }))
    .filter((item) => item.nome);
}

export function buildNormalizedDossier(params: {
  cnpj: string;
  basica: SerproBasicaResponse;
  empresa: SerproEmpresaResponse;
  qsa: SerproQsaResponse;
}): SerproFullDossier {
  const { cnpj, basica, empresa, qsa } = params;

  const situacaoCodigo = sanitizeText(
    basica.situacao_cadastral?.codigo
      || empresa.situacaoCadastral
      || empresa.situacao_cadastral
      || empresa.codigoSituacaoCadastral,
  );

  const situacaoDescricao = sanitizeText(
    basica.situacao_cadastral?.descricao
      || empresa.descricaoSituacaoCadastral
      || empresa.situacao_cadastral_descricao,
  );

  const naturezaCodigo = sanitizeText(
    basica.natureza_juridica?.codigo
      || empresa.codigoNaturezaJuridica
      || empresa.codigo_natureza_juridica,
  );

  const naturezaDescricao = sanitizeText(
    basica.natureza_juridica?.descricao
      || empresa.naturezaJuridica
      || empresa.natureza_juridica_descricao,
  );

  return {
    cnpj: sanitizeDigits(cnpj).slice(0, 14),
    razaoSocial: sanitizeText(basica.nome_empresarial),
    nomeFantasia: sanitizeText(basica.nome_fantasia),
    dataAbertura: sanitizeDate(basica.data_abertura),
    situacaoCadastral: {
      codigo: situacaoCodigo,
      descricao: situacaoDescricao,
      data: sanitizeDate(basica.situacao_cadastral?.data || empresa.dataSituacaoCadastral),
      motivo: sanitizeText(basica.situacao_cadastral?.motivo || empresa.motivoSituacaoCadastral),
    },
    naturezaJuridica: {
      codigo: naturezaCodigo,
      descricao: naturezaDescricao,
    },
    capitalSocial: normalizeCapitalSocial(empresa.capital_social || empresa.capitalSocial || basica.capital_social),
    porte: sanitizeText(empresa.porte || empresa.porteEmpresa || basica.porte),
    enteFederativoResponsavel: sanitizeText(
      empresa.ente_federativo_responsavel || empresa.enteFederativoResponsavel || basica.ente_federativo,
    ),
    situacaoEspecial: sanitizeText(empresa.situacao_especial || empresa.situacaoEspecial || basica.situacao_especial),
    cnaePrincipal: normalizePrimaryCnae(basica, empresa),
    cnaesSecundarios: normalizeSecondaryCnaes(empresa),
    quadroSocios: normalizeQsa(qsa),
    endereco: {
      logradouro: sanitizeText(basica.endereco?.logradouro || basica.logradouro),
      numero: sanitizeText(basica.endereco?.numero || basica.numero),
      complemento: sanitizeText(basica.endereco?.complemento || basica.complemento),
      bairro: sanitizeText(basica.endereco?.bairro || basica.bairro),
      municipio: sanitizeText(basica.endereco?.municipio || basica.municipio),
      uf: sanitizeText(basica.endereco?.uf || basica.uf),
      cep: sanitizeText(basica.endereco?.cep || basica.cep),
    },
    email: sanitizeText(basica.correio_eletronico),
    telefones: (basica.telefones || [])
      .map((item) => ({
        ddd: sanitizeText(item.ddd),
        numero: sanitizeText(item.numero),
      }))
      .filter((item) => item.numero),
  };
}
