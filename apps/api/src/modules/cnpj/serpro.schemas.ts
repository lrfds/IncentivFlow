import { z } from 'zod';

const StringLikeSchema = z.union([z.string(), z.number(), z.null(), z.undefined()]);

const CodeDescriptionSchema = z
  .object({
    codigo: StringLikeSchema.optional(),
    descricao: StringLikeSchema.optional(),
  })
  .passthrough();

const PhoneSchema = z
  .object({
    ddd: StringLikeSchema.optional(),
    numero: StringLikeSchema.optional(),
  })
  .passthrough();

const AddressSchema = z
  .object({
    logradouro: StringLikeSchema.optional(),
    numero: StringLikeSchema.optional(),
    complemento: StringLikeSchema.optional(),
    bairro: StringLikeSchema.optional(),
    municipio: StringLikeSchema.optional(),
    uf: StringLikeSchema.optional(),
    cep: StringLikeSchema.optional(),
  })
  .passthrough();

const SituacaoSchema = z
  .object({
    codigo: StringLikeSchema.optional(),
    descricao: StringLikeSchema.optional(),
    data: StringLikeSchema.optional(),
    motivo: StringLikeSchema.optional(),
  })
  .passthrough();

export const SerproBasicaResponseSchema = z
  .object({
    ni: StringLikeSchema.optional(),
    nome_empresarial: StringLikeSchema.optional(),
    nome_fantasia: StringLikeSchema.optional(),
    data_abertura: StringLikeSchema.optional(),
    capital_social: StringLikeSchema.optional(),
    porte: StringLikeSchema.optional(),
    ente_federativo: StringLikeSchema.optional(),
    situacao_especial: StringLikeSchema.optional(),
    correio_eletronico: StringLikeSchema.optional(),
    cnae_principal: CodeDescriptionSchema.nullish(),
    natureza_juridica: CodeDescriptionSchema.nullish(),
    situacao_cadastral: SituacaoSchema.nullish(),
    endereco: AddressSchema.nullish(),
    logradouro: StringLikeSchema.optional(),
    numero: StringLikeSchema.optional(),
    complemento: StringLikeSchema.optional(),
    bairro: StringLikeSchema.optional(),
    municipio: StringLikeSchema.optional(),
    uf: StringLikeSchema.optional(),
    cep: StringLikeSchema.optional(),
    telefones: z.array(PhoneSchema).optional().default([]),
  })
  .passthrough();

export const SerproEmpresaCnaeSchema = z
  .object({
    codigo: StringLikeSchema.optional(),
    descricao: StringLikeSchema.optional(),
    codigoCnae: StringLikeSchema.optional(),
    descricaoCnae: StringLikeSchema.optional(),
    codigo_cnae: StringLikeSchema.optional(),
    descricao_cnae: StringLikeSchema.optional(),
  })
  .passthrough();

export const SerproEmpresaResponseSchema = z
  .object({
    capital_social: StringLikeSchema.optional(),
    capitalSocial: StringLikeSchema.optional(),
    porte: StringLikeSchema.optional(),
    porteEmpresa: StringLikeSchema.optional(),
    ente_federativo_responsavel: StringLikeSchema.optional(),
    enteFederativoResponsavel: StringLikeSchema.optional(),
    situacao_especial: StringLikeSchema.optional(),
    situacaoEspecial: StringLikeSchema.optional(),
    codigoNaturezaJuridica: StringLikeSchema.optional(),
    codigo_natureza_juridica: StringLikeSchema.optional(),
    naturezaJuridica: StringLikeSchema.optional(),
    natureza_juridica_descricao: StringLikeSchema.optional(),
    situacaoCadastral: StringLikeSchema.optional(),
    situacao_cadastral: StringLikeSchema.optional(),
    codigoSituacaoCadastral: StringLikeSchema.optional(),
    descricaoSituacaoCadastral: StringLikeSchema.optional(),
    situacao_cadastral_descricao: StringLikeSchema.optional(),
    dataSituacaoCadastral: StringLikeSchema.optional(),
    motivoSituacaoCadastral: StringLikeSchema.optional(),
    cnaeFiscalPrincipal: SerproEmpresaCnaeSchema.nullish(),
    cnae_fiscal_principal: SerproEmpresaCnaeSchema.nullish(),
    codigoCnaeFiscalPrincipal: StringLikeSchema.optional(),
    descricaoCnaeFiscalPrincipal: StringLikeSchema.optional(),
    cnae_fiscal_principal_codigo: StringLikeSchema.optional(),
    cnae_fiscal_principal_descricao: StringLikeSchema.optional(),
    cnaesSecundarios: z.array(SerproEmpresaCnaeSchema).optional().default([]),
    cnaes_secundarios: z.array(SerproEmpresaCnaeSchema).optional().default([]),
    cnaes_secundarios_lista: z.array(SerproEmpresaCnaeSchema).optional().default([]),
  })
  .passthrough();

export const SerproQsaRecordSchema = z
  .object({
    nome_socio: StringLikeSchema.optional(),
    nome: StringLikeSchema.optional(),
    nomeSocio: StringLikeSchema.optional(),
    qualificacao_socio: StringLikeSchema.optional(),
    qualificacao: StringLikeSchema.optional(),
    qualificacaoSocio: StringLikeSchema.optional(),
    pais: StringLikeSchema.optional(),
    pais_origem: StringLikeSchema.optional(),
    codigo_pais: StringLikeSchema.optional(),
    paisOrigem: StringLikeSchema.optional(),
    nome_representante_legal: StringLikeSchema.optional(),
    nomeRepresentanteLegal: StringLikeSchema.optional(),
    qualificacao_representante_legal: StringLikeSchema.optional(),
    qualificacaoRepresentanteLegal: StringLikeSchema.optional(),
    faixa_etaria: StringLikeSchema.optional(),
    faixaEtaria: StringLikeSchema.optional(),
    data_entrada_sociedade: StringLikeSchema.optional(),
    dataEntradaSociedade: StringLikeSchema.optional(),
    data_entrada: StringLikeSchema.optional(),
  })
  .passthrough();

export const SerproQsaResponseSchema = z.union([
  z.array(SerproQsaRecordSchema),
  z
    .object({
      qsa: z.array(SerproQsaRecordSchema).optional().default([]),
    })
    .passthrough(),
]);

export type SerproBasicaResponse = z.infer<typeof SerproBasicaResponseSchema>;
export type SerproEmpresaResponse = z.infer<typeof SerproEmpresaResponseSchema>;
export type SerproQsaRecord = z.infer<typeof SerproQsaRecordSchema>;
export type SerproQsaResponse = z.infer<typeof SerproQsaResponseSchema>;
