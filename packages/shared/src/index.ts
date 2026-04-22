import { z } from 'zod';

export enum PhaseType {
  ELABORACAO = 'ELABORACAO',
  APROVACAO_CLIENTE = 'APROVACAO_CLIENTE',
  SUBMISSAO = 'SUBMISSAO',
  ACOMPANHAMENTO = 'ACOMPANHAMENTO',
  POS_APROVACAO = 'POS_APROVACAO',
  CONCLUIDO = 'CONCLUIDO',
}

// ========================
// AUTH SCHEMAS
// ========================
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});
export type LoginDTO = z.infer<typeof LoginSchema>;

// ========================
// PROJECT SCHEMAS
// ========================
export const GetProjectsQuerySchema = z.object({
  phase: z.nativeEnum(PhaseType).optional(),
  status: z.string().optional(),
  search: z.string().optional(),
});
export type GetProjectsQuery = z.infer<typeof GetProjectsQuerySchema>;

export const CreateProjectSchema = z.object({
  clientId: z.string().uuid(),
  code: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  valueRequested: z.number().positive().optional(),
  submissionDeadline: z.coerce.date().optional(),
  tags: z.array(z.string()).optional(),
});
export type CreateProjectDTO = z.infer<typeof CreateProjectSchema>;

export const ProjectParamsSchema = z.object({
  id: z.string().uuid(),
});
export type ProjectParams = z.infer<typeof ProjectParamsSchema>;

export const ChangePhaseSchema = z.object({
  targetPhase: z.nativeEnum(PhaseType),
  notes: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});
export type ChangePhaseDTO = z.infer<typeof ChangePhaseSchema>;

export const ApproveValueSchema = z.object({
  amount: z.number().positive(),
  reference: z.string().optional(),
});
export type ApproveValueDTO = z.infer<typeof ApproveValueSchema>;

// ========================
// CLIENT SCHEMAS
// ========================
export const CreateClientSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  sector: z.string().min(1),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  cnpj: z.string().optional(),
  document: z.string().min(1)
});
export type CreateClientDTO = z.infer<typeof CreateClientSchema>;

// ========================
// CNPJ SCHEMAS
// ========================
export const OpenCnpjPhoneSchema = z.object({
  ddd: z.string(),
  numero: z.string(),
});
export type OpenCnpjPhone = z.infer<typeof OpenCnpjPhoneSchema>;

export const OpenCnpjPartnerSchema = z.object({
  nome: z.string(),
  qualificacao: z.string().optional(),
  faixa_etaria: z.string().optional(),
  pais: z.string().optional(),
});
export type OpenCnpjPartner = z.infer<typeof OpenCnpjPartnerSchema>;

export const OpenCnpjResponseSchema = z.object({
  cnpj: z.string(),
  razao_social: z.string(),
  nome_fantasia: z.string().nullable().optional(),
  natureza_juridica: z.string().optional(),
  situacao_cadastral: z.object({
    codigo: z.number(),
    data: z.string().optional(),
    motivo: z.string().optional(),
  }),
  cnae_principal: z.object({
    codigo: z.string(),
    descricao: z.string(),
  }).optional(),
  cnaes_secundarios: z.array(z.object({
    codigo: z.string(),
    descricao: z.string(),
  })).optional(),
  capital_social: z.number().optional(),
  porte: z.string().optional(),
  socios: z.array(OpenCnpjPartnerSchema).optional(),
  estabelecimento: z.object({
    tipo: z.string().optional(),
    logradouro: z.string(),
    numero: z.string(),
    complemento: z.string().nullable().optional(),
    bairro: z.string(),
    cep: z.string(),
    cidade: z.object({
      nome: z.string(),
    }),
    estado: z.object({
      sigla: z.string(),
    }),
    telefones: z.array(OpenCnpjPhoneSchema).optional(),
    email: z.string().nullable().optional(),
  }),
});
export type OpenCnpjResponse = z.infer<typeof OpenCnpjResponseSchema>;
