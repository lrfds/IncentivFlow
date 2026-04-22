import axios from 'axios';
export class IncentivFlowClient {
    api;
    token = null;
    constructor(config) {
        this.token = config.token || null;
        this.api = axios.create({
            baseURL: config.baseURL,
            headers: {
                'Content-Type': 'application/json',
            },
        });
        // Injetar Bearer token automaticamente
        this.api.interceptors.request.use((req) => {
            if (this.token) {
                req.headers.Authorization = `Bearer ${this.token}`;
            }
            return req;
        });
        // Captura e formatação de erros Elite
        this.api.interceptors.response.use((res) => res, (error) => {
            if (error.response?.data) {
                // Extrai erros de validação do Fastify/Zod ou as nossas mensagens customizadas
                const payload = error.response.data;
                if (payload.message) {
                    throw new Error(`API Error [${error.response.status}]: ${payload.message}`);
                }
            }
            throw error;
        });
    }
    setToken(token) {
        this.token = token;
    }
    clearToken() {
        this.token = null;
    }
    // ==========================================
    // AUTHENTICATION
    // ==========================================
    auth = {
        login: async (data) => {
            const response = await this.api.post('/api/auth/login', data);
            this.setToken(response.data.token);
            return response.data;
        },
    };
    // ==========================================
    // PROJECTS
    // ==========================================
    projects = {
        list: async (query) => {
            const response = await this.api.get('/api/projects', { params: query });
            return response.data;
        },
        create: async (data) => {
            const response = await this.api.post('/api/projects', data);
            return response.data;
        },
        getById: async (id) => {
            const response = await this.api.get(`/api/projects/${id}`);
            return response.data;
        },
        changePhase: async (id, data) => {
            const response = await this.api.post(`/api/projects/${id}/phase`, data);
            return response.data;
        },
        approveValue: async (id, data) => {
            const response = await this.api.post(`/api/projects/${id}/approve-value`, data);
            return response.data;
        },
    };
    // ==========================================
    // CLIENTS
    // ==========================================
    clients = {
        list: async () => {
            const response = await this.api.get('/api/clients');
            return response.data;
        },
        create: async (data) => {
            const response = await this.api.post('/api/clients', data);
            return response.data;
        },
    };
    // ==========================================
    // CNPJ
    // ==========================================
    cnpj = {
        consultar: async (cnpj) => {
            const response = await this.api.get(`/api/cnpj/${cnpj}/open-cnpj`);
            return response.data;
        },
    };
}
//# sourceMappingURL=index.js.map