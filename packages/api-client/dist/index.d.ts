import type { LoginDTO, CreateProjectDTO, ChangePhaseDTO, ApproveValueDTO, GetProjectsQuery, CreateClientDTO, OpenCnpjResponse } from '@incentivflow/shared';
export interface IncentivFlowClientConfig {
    baseURL: string;
    token?: string;
}
export declare class IncentivFlowClient {
    private api;
    private token;
    constructor(config: IncentivFlowClientConfig);
    setToken(token: string): void;
    clearToken(): void;
    auth: {
        login: (data: LoginDTO) => Promise<{
            token: string;
        }>;
    };
    projects: {
        list: (query?: GetProjectsQuery) => Promise<any>;
        create: (data: CreateProjectDTO) => Promise<any>;
        getById: (id: string) => Promise<any>;
        changePhase: (id: string, data: ChangePhaseDTO) => Promise<any>;
        approveValue: (id: string, data: ApproveValueDTO) => Promise<any>;
    };
    clients: {
        list: () => Promise<any>;
        create: (data: CreateClientDTO) => Promise<any>;
    };
    cnpj: {
        consultar: (cnpj: string) => Promise<OpenCnpjResponse>;
    };
}
//# sourceMappingURL=index.d.ts.map