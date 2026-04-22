import { z } from 'zod';
export declare enum PhaseType {
    ELABORACAO = "ELABORACAO",
    APROVACAO_CLIENTE = "APROVACAO_CLIENTE",
    SUBMISSAO = "SUBMISSAO",
    ACOMPANHAMENTO = "ACOMPANHAMENTO",
    POS_APROVACAO = "POS_APROVACAO",
    CONCLUIDO = "CONCLUIDO"
}
export declare const LoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export type LoginDTO = z.infer<typeof LoginSchema>;
export declare const GetProjectsQuerySchema: z.ZodObject<{
    phase: z.ZodOptional<z.ZodNativeEnum<typeof PhaseType>>;
    status: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status?: string | undefined;
    phase?: PhaseType | undefined;
    search?: string | undefined;
}, {
    status?: string | undefined;
    phase?: PhaseType | undefined;
    search?: string | undefined;
}>;
export type GetProjectsQuery = z.infer<typeof GetProjectsQuerySchema>;
export declare const CreateProjectSchema: z.ZodObject<{
    clientId: z.ZodString;
    code: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    valueRequested: z.ZodOptional<z.ZodNumber>;
    submissionDeadline: z.ZodOptional<z.ZodDate>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    code: string;
    clientId: string;
    title: string;
    description: string;
    valueRequested?: number | undefined;
    submissionDeadline?: Date | undefined;
    tags?: string[] | undefined;
}, {
    code: string;
    clientId: string;
    title: string;
    description: string;
    valueRequested?: number | undefined;
    submissionDeadline?: Date | undefined;
    tags?: string[] | undefined;
}>;
export type CreateProjectDTO = z.infer<typeof CreateProjectSchema>;
export declare const ProjectParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export type ProjectParams = z.infer<typeof ProjectParamsSchema>;
export declare const ChangePhaseSchema: z.ZodObject<{
    targetPhase: z.ZodNativeEnum<typeof PhaseType>;
    notes: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    targetPhase: PhaseType;
    notes?: string | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    targetPhase: PhaseType;
    notes?: string | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export type ChangePhaseDTO = z.infer<typeof ChangePhaseSchema>;
export declare const ApproveValueSchema: z.ZodObject<{
    amount: z.ZodNumber;
    reference: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    amount: number;
    reference?: string | undefined;
}, {
    amount: number;
    reference?: string | undefined;
}>;
export type ApproveValueDTO = z.infer<typeof ApproveValueSchema>;
export declare const CreateClientSchema: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodString;
    sector: z.ZodString;
    contactEmail: z.ZodOptional<z.ZodString>;
    contactPhone: z.ZodOptional<z.ZodString>;
    cnpj: z.ZodOptional<z.ZodString>;
    document: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: string;
    name: string;
    sector: string;
    document: string;
    contactEmail?: string | undefined;
    contactPhone?: string | undefined;
    cnpj?: string | undefined;
}, {
    type: string;
    name: string;
    sector: string;
    document: string;
    contactEmail?: string | undefined;
    contactPhone?: string | undefined;
    cnpj?: string | undefined;
}>;
export type CreateClientDTO = z.infer<typeof CreateClientSchema>;
export declare const OpenCnpjPhoneSchema: z.ZodObject<{
    ddd: z.ZodString;
    numero: z.ZodString;
}, "strip", z.ZodTypeAny, {
    ddd: string;
    numero: string;
}, {
    ddd: string;
    numero: string;
}>;
export type OpenCnpjPhone = z.infer<typeof OpenCnpjPhoneSchema>;
export declare const OpenCnpjPartnerSchema: z.ZodObject<{
    nome: z.ZodString;
    qualificacao: z.ZodOptional<z.ZodString>;
    faixa_etaria: z.ZodOptional<z.ZodString>;
    pais: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    nome: string;
    qualificacao?: string | undefined;
    faixa_etaria?: string | undefined;
    pais?: string | undefined;
}, {
    nome: string;
    qualificacao?: string | undefined;
    faixa_etaria?: string | undefined;
    pais?: string | undefined;
}>;
export type OpenCnpjPartner = z.infer<typeof OpenCnpjPartnerSchema>;
export declare const OpenCnpjResponseSchema: z.ZodObject<{
    cnpj: z.ZodString;
    razao_social: z.ZodString;
    nome_fantasia: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    natureza_juridica: z.ZodOptional<z.ZodString>;
    situacao_cadastral: z.ZodObject<{
        codigo: z.ZodNumber;
        data: z.ZodOptional<z.ZodString>;
        motivo: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        codigo: number;
        data?: string | undefined;
        motivo?: string | undefined;
    }, {
        codigo: number;
        data?: string | undefined;
        motivo?: string | undefined;
    }>;
    cnae_principal: z.ZodOptional<z.ZodObject<{
        codigo: z.ZodString;
        descricao: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        codigo: string;
        descricao: string;
    }, {
        codigo: string;
        descricao: string;
    }>>;
    cnaes_secundarios: z.ZodOptional<z.ZodArray<z.ZodObject<{
        codigo: z.ZodString;
        descricao: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        codigo: string;
        descricao: string;
    }, {
        codigo: string;
        descricao: string;
    }>, "many">>;
    capital_social: z.ZodOptional<z.ZodNumber>;
    porte: z.ZodOptional<z.ZodString>;
    socios: z.ZodOptional<z.ZodArray<z.ZodObject<{
        nome: z.ZodString;
        qualificacao: z.ZodOptional<z.ZodString>;
        faixa_etaria: z.ZodOptional<z.ZodString>;
        pais: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        nome: string;
        qualificacao?: string | undefined;
        faixa_etaria?: string | undefined;
        pais?: string | undefined;
    }, {
        nome: string;
        qualificacao?: string | undefined;
        faixa_etaria?: string | undefined;
        pais?: string | undefined;
    }>, "many">>;
    estabelecimento: z.ZodObject<{
        tipo: z.ZodOptional<z.ZodString>;
        logradouro: z.ZodString;
        numero: z.ZodString;
        complemento: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        bairro: z.ZodString;
        cep: z.ZodString;
        cidade: z.ZodObject<{
            nome: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            nome: string;
        }, {
            nome: string;
        }>;
        estado: z.ZodObject<{
            sigla: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            sigla: string;
        }, {
            sigla: string;
        }>;
        telefones: z.ZodOptional<z.ZodArray<z.ZodObject<{
            ddd: z.ZodString;
            numero: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            ddd: string;
            numero: string;
        }, {
            ddd: string;
            numero: string;
        }>, "many">>;
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        numero: string;
        logradouro: string;
        bairro: string;
        cep: string;
        cidade: {
            nome: string;
        };
        estado: {
            sigla: string;
        };
        email?: string | null | undefined;
        tipo?: string | undefined;
        complemento?: string | null | undefined;
        telefones?: {
            ddd: string;
            numero: string;
        }[] | undefined;
    }, {
        numero: string;
        logradouro: string;
        bairro: string;
        cep: string;
        cidade: {
            nome: string;
        };
        estado: {
            sigla: string;
        };
        email?: string | null | undefined;
        tipo?: string | undefined;
        complemento?: string | null | undefined;
        telefones?: {
            ddd: string;
            numero: string;
        }[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    cnpj: string;
    razao_social: string;
    situacao_cadastral: {
        codigo: number;
        data?: string | undefined;
        motivo?: string | undefined;
    };
    estabelecimento: {
        numero: string;
        logradouro: string;
        bairro: string;
        cep: string;
        cidade: {
            nome: string;
        };
        estado: {
            sigla: string;
        };
        email?: string | null | undefined;
        tipo?: string | undefined;
        complemento?: string | null | undefined;
        telefones?: {
            ddd: string;
            numero: string;
        }[] | undefined;
    };
    nome_fantasia?: string | null | undefined;
    natureza_juridica?: string | undefined;
    cnae_principal?: {
        codigo: string;
        descricao: string;
    } | undefined;
    cnaes_secundarios?: {
        codigo: string;
        descricao: string;
    }[] | undefined;
    capital_social?: number | undefined;
    porte?: string | undefined;
    socios?: {
        nome: string;
        qualificacao?: string | undefined;
        faixa_etaria?: string | undefined;
        pais?: string | undefined;
    }[] | undefined;
}, {
    cnpj: string;
    razao_social: string;
    situacao_cadastral: {
        codigo: number;
        data?: string | undefined;
        motivo?: string | undefined;
    };
    estabelecimento: {
        numero: string;
        logradouro: string;
        bairro: string;
        cep: string;
        cidade: {
            nome: string;
        };
        estado: {
            sigla: string;
        };
        email?: string | null | undefined;
        tipo?: string | undefined;
        complemento?: string | null | undefined;
        telefones?: {
            ddd: string;
            numero: string;
        }[] | undefined;
    };
    nome_fantasia?: string | null | undefined;
    natureza_juridica?: string | undefined;
    cnae_principal?: {
        codigo: string;
        descricao: string;
    } | undefined;
    cnaes_secundarios?: {
        codigo: string;
        descricao: string;
    }[] | undefined;
    capital_social?: number | undefined;
    porte?: string | undefined;
    socios?: {
        nome: string;
        qualificacao?: string | undefined;
        faixa_etaria?: string | undefined;
        pais?: string | undefined;
    }[] | undefined;
}>;
export type OpenCnpjResponse = z.infer<typeof OpenCnpjResponseSchema>;
//# sourceMappingURL=index.d.ts.map