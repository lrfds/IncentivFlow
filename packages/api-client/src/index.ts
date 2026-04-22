import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosError } from 'axios';
import type {
  LoginDTO,
  CreateProjectDTO,
  ChangePhaseDTO,
  ApproveValueDTO,
  GetProjectsQuery,
  CreateClientDTO,
  OpenCnpjResponse
} from '@incentivflow/shared';

export interface IncentivFlowClientConfig {
  baseURL: string;
  token?: string;
}

export class IncentivFlowClient {
  private api: AxiosInstance;
  private token: string | null = null;

  constructor(config: IncentivFlowClientConfig) {
    this.token = config.token || null;
    
    this.api = axios.create({
      baseURL: config.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Injetar Bearer token e X-Tenant-ID automaticamente
    this.api.interceptors.request.use((req) => {
      let currentToken = this.token;
      let currentTenantId = null;

      if (typeof window !== 'undefined') {
        currentToken = currentToken || localStorage.getItem('incentivflow_token') || null;
        currentTenantId = localStorage.getItem('incentivflow_tenant_id');
      }
      
      if (currentToken) {
        req.headers.Authorization = `Bearer ${currentToken}`;
      }

      if (currentTenantId) {
        req.headers['X-Tenant-ID'] = currentTenantId;
      }

      return req;
    });

    // Captura e formatação de erros Elite + Retry System
    this.api.interceptors.response.use(
      (res) => res,
      async (error: AxiosError) => {
        const config = error.config as any;

        // Se for erro de rede (sem response) ou Internal Server Error (5xx)
        if (config && (!error.response || error.response.status >= 500)) {
          config._retryCount = config._retryCount || 0;
          const maxRetries = 3;

          if (config._retryCount < maxRetries) {
            config._retryCount += 1;
            
            // Backoff exponencial: 500ms, 1000ms, 2000ms...
            const delay = Math.pow(2, config._retryCount - 1) * 500;
            await new Promise((resolve) => setTimeout(resolve, delay));
            
            // Refaz a requisição silenciosamente
            return this.api.request(config);
          }
        }

        if (error.response?.data) {
          // Extrai erros de validação do Fastify/Zod ou as nossas mensagens customizadas
          const payload = error.response.data as any;
          if (payload.message) {
            throw new Error(`API Error [${error.response.status}]: ${payload.message}`);
          }
        }
        throw error;
      }
    );
  }

  public setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('incentivflow_token', token);
    }
  }

  public clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('incentivflow_token');
    }
  }

  // ==========================================
  // AUTHENTICATION
  // ==========================================
  public auth = {
    login: async (data: LoginDTO): Promise<{ token: string }> => {
      const response = await this.api.post<{ token: string }>('/api/auth/login', data);
      this.setToken(response.data.token);
      return response.data;
    },
  };

  // ==========================================
  // PROJECTS
  // ==========================================
  public projects = {
    list: async (query?: GetProjectsQuery) => {
      const response = await this.api.get('/api/projects', { params: query });
      return response.data;
    },
    create: async (data: CreateProjectDTO) => {
      const response = await this.api.post('/api/projects', data);
      return response.data;
    },
    getById: async (id: string) => {
      const response = await this.api.get(`/api/projects/${id}`);
      return response.data;
    },
    changePhase: async (id: string, data: ChangePhaseDTO) => {
      const response = await this.api.post(`/api/projects/${id}/phase`, data);
      return response.data;
    },
    approveValue: async (id: string, data: ApproveValueDTO) => {
      const response = await this.api.post(`/api/projects/${id}/approve-value`, data);
      return response.data;
    },
  };

  // ==========================================
  // CLIENTS
  // ==========================================
  public clients = {
    list: async () => {
      const response = await this.api.get('/api/clients');
      return response.data;
    },
    create: async (data: CreateClientDTO) => {
      const response = await this.api.post('/api/clients', data);
      return response.data;
    },
  };

  // ==========================================
  // CNPJ
  // ==========================================
  public cnpj = {
    consultar: async (cnpj: string): Promise<OpenCnpjResponse> => {
      const response = await this.api.get<OpenCnpjResponse>(`/api/cnpj/${cnpj}/open-cnpj`);
      return response.data;
    },
  };

  // ==========================================
  // AUDIT
  // ==========================================
  public audit = {
    list: async () => {
      const response = await this.api.get('/api/audit');
      return response.data;
    },
  };
}

export * from './hooks.js';
