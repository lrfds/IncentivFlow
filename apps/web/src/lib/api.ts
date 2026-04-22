import { IncentivFlowClient } from '@incentivflow/api-client';

export const apiClient = new IncentivFlowClient({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
});