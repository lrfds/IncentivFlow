import { IncentivFlowClient } from '@incentivflow/api-client';

export const apiClient = new IncentivFlowClient({
  baseURL: (typeof window !== 'undefined' ? (window as any)._env_?.VITE_API_URL : null) || 'http://localhost:3000',
});