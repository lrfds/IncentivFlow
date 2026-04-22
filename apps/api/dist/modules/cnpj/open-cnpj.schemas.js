import { z } from 'zod';
const OpenCnpjPhoneSchema = z.object({
    ddd: z.string().optional().nullable().default(''),
    numero: z.string().optional().nullable().default(''),
    is_fax: z.boolean().optional().nullable(),
});
const OpenCnpjPartnerSchema = z.object({
    nome_socio: z.string().optional().nullable().default(''),
    cnpj_cpf_socio: z.string().optional().nullable().default(''),
    qualificacao_socio: z.string().optional().nullable().default(''),
    data_entrada_sociedade: z.string().optional().nullable().default(''),
    identificador_socio: z.string().optional().nullable().default(''),
    faixa_etaria: z.string().optional().nullable().default(''),
    nome_rep_legal: z.string().optional().nullable().default(''),
    qual_rep_legal: z.string().optional().nullable().default(''),
    pais_origem: z.string().optional().nullable().default(''),
});
const OpenCnpjSecondaryActivitySchema = z.union([
    z.string(),
    z.object({
        codigo: z.union([z.string(), z.number()]).optional().nullable(),
        descricao: z.string().optional().nullable().default(''),
    }),
]);
export const OpenCnpjResponseSchema = z
    .object({
    cnpj: z.string().optional().nullable().default(''),
    razao_social: z.string().optional().nullable().default(''),
    nome_fantasia: z.string().optional().nullable().default(''),
    situacao_cadastral: z.union([z.string(), z.number()]).optional().nullable().default(''),
    data_situacao_cadastral: z.string().optional().nullable().default(''),
    motivo_situacao_cadastral: z.union([z.string(), z.number()]).optional().nullable().default(''),
    matriz_filial: z.string().optional().nullable().default(''),
    data_inicio_atividade: z.string().optional().nullable().default(''),
    cnae_principal: z.union([z.string(), z.number()]).optional().nullable().default(''),
    cnae_principal_descricao: z.string().optional().nullable().default(''),
    atividades_secundarias: z.array(OpenCnpjSecondaryActivitySchema).optional().nullable().default([]),
    cnaes_secundarios: z.array(OpenCnpjSecondaryActivitySchema).optional().nullable().default([]),
    natureza_juridica: z.string().optional().nullable().default(''),
    codigo_natureza_juridica: z.union([z.string(), z.number()]).optional().nullable().default(''),
    logradouro: z.string().optional().nullable().default(''),
    numero: z.string().optional().nullable().default(''),
    complemento: z.string().optional().nullable().default(''),
    bairro: z.string().optional().nullable().default(''),
    cep: z.string().optional().nullable().default(''),
    uf: z.string().optional().nullable().default(''),
    municipio: z.string().optional().nullable().default(''),
    email: z.string().optional().nullable().default(''),
    telefone: z.string().optional().nullable().default(''),
    telefones: z.array(OpenCnpjPhoneSchema).optional().nullable().default([]),
    capital_social: z.union([z.string(), z.number()]).optional().nullable().default('0'),
    porte_empresa: z.string().optional().nullable().default(''),
    porte: z.union([z.string(), z.number()]).optional().nullable().default(''),
    situacao_especial: z.string().optional().nullable().default(''),
    data_situacao_especial: z.string().optional().nullable().default(''),
    QSA: z.array(OpenCnpjPartnerSchema).optional().nullable().default([]),
    qsa: z.array(OpenCnpjPartnerSchema).optional().nullable().default([]),
})
    .passthrough();
