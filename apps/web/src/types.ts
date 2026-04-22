// ================================================================
// types.ts — Domain types
// REGRA CRÍTICA: Phase keys são SEMPRE uppercase enum values
// Tradução acontece SOMENTE na camada de apresentação via t()
// ================================================================

export const PHASES = [
  'ELABORACAO',
  'APROVACAO_CLIENTE',
  'SUBMISSAO',
  'ACOMPANHAMENTO',
  'POS_APROVACAO',
  'CONCLUIDO',
] as const;

export type Phase = (typeof PHASES)[number];
export type Role = 'ADMIN' | 'CONSULTOR' | 'CLIENTE' | 'AUDITOR';
export type Sector = 'CULTURA' | 'ESPORTE' | 'AUDIOVISUAL' | 'TECNOLOGIA' | 'SAUDE' | 'EDUCACAO';
export type LawType = 'ROUANET' | 'AUDIOVISUAL' | 'ESPORTE' | 'PRONON' | 'PRONAS';
export type DocumentType = 'PROPOSTA' | 'ORCAMENTO' | 'PARECER' | 'OFICIO' | 'COMPROVANTE' | 'RELATORIO' | 'CONTRATO';

export interface CnaeInfo {
  codigo: string;
  descricao: string;
}

export interface Partner {
  nome: string;
  qualificacao?: string;
  paisOrigem?: string;
  nomeRepresentante?: string;
  qualificacaoRepresentante?: string;
  faixaEtaria?: string;
  dataEntrada?: string;
}

export interface AddressInfo {
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
}

export interface PhoneInfo {
  ddd?: string;
  numero?: string;
}

export interface SituacaoCadastralInfo {
  codigo: string;
  descricao?: string;
  data?: string;
  motivo?: string;
}

export interface NaturezaJuridicaInfo {
  codigo: string;
  descricao?: string;
}

export interface IncentiveOpportunity {
  lei: string;
  tag: string;
  elegivel: boolean;
  confianca: 'ALTA' | 'MEDIA' | 'BAIXA' | 'IMPEDITIVA';
  motivo: string;
  docsNecessarios: string[];
  matchedOn: 'PRINCIPAL' | 'SECUNDARIO' | 'NAO_APLICA';
  matchedCnae?: CnaeInfo;
  exigeSemFinsLucrativos?: boolean;
}

export interface IncentiveAlert {
  lei: string;
  status: 'INFO' | 'ATENCAO' | 'IMPEDITIVO';
  mensagem: string;
}

export interface IncentiveAnalysis {
  readinessScore: number;
  readinessLabel: string;
  leisHabilitadas: IncentiveOpportunity[];
  alertas: IncentiveAlert[];
  badges: string[];
  resumo: string;
}

export interface Client {
  id: string;
  name: string;
  sector: Sector;
  contactEmail: string;
  contactPhone: string;
  since: string;
  organizationId: string;
  cnpj?: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  apiValidated?: boolean;
  source?: 'MANUAL' | 'OPENCNPJ' | 'OPENCNPJ_DEMO' | 'DB_CACHE' | 'OPENCNPJ_CACHE' | 'SERPRO' | 'SERPRO_DEMO' | 'SERPRO_CACHE';
  manualModeEnabled?: boolean;
  manualModeReason?: string;
  verifiedAt?: string;
  dataAbertura?: string;
  situacaoCadastral?: SituacaoCadastralInfo;
  naturezaJuridica?: NaturezaJuridicaInfo;
  capitalSocial?: number;
  porte?: string;
  enteFederativoResponsavel?: string;
  situacaoEspecial?: string;
  cnaePrincipal?: CnaeInfo | null;
  cnaesSecundarios?: CnaeInfo[];
  quadroSocios?: Partner[];
  address?: AddressInfo;
  contactPhones?: PhoneInfo[];
  lastCnpjLookupAt?: string;
  cnpjAnalysis?: IncentiveAnalysis;
}

export type ClientDraftInput = Omit<Client, 'id' | 'since' | 'organizationId'>;

export interface ProjectDocument {
  id: string;
  name: string;
  type: DocumentType;
  uploadedAt: string;
  uploadedBy: string;
  size: string;
}

export interface FinancialRecord {
  requested: number;
  approved: number;
  captured: number;
  currency: string;
}

export interface PhaseHistoryEntry {
  from: Phase | null;
  to: Phase;
  at: string;
  by: string;
  note?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  phase: Phase;
  clientId: string;
  clientName: string;
  law: LawType;
  sector: Sector;
  deadline: string;
  submissionProtocol?: string;
  financial: FinancialRecord;
  documents: ProjectDocument[];
  phaseHistory: PhaseHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  version: number;
  organizationId: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  entity: string;
  entityId: string;
  detail: string;
  hash: string;
  prevHash: string;
  version: number;
  schemaVersion: number;
}

// === UTILITIES ===

export const PHASE_INDEX: Record<Phase, number> = {
  ELABORACAO: 0,
  APROVACAO_CLIENTE: 1,
  SUBMISSAO: 2,
  ACOMPANHAMENTO: 3,
  POS_APROVACAO: 4,
  CONCLUIDO: 5,
};

export function getNextPhase(current: Phase): Phase | null {
  const idx = PHASE_INDEX[current];
  return PHASES[idx + 1] ?? null;
}

export function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1).replace('.', ',')}M`;
  }
  if (value >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(0)}mil`;
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatCurrencyFull(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCnpj(value?: string): string {
  const digits = (value || '').replace(/\D/g, '').slice(0, 14);
  if (digits.length !== 14) return value || '—';
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function daysUntil(iso: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
