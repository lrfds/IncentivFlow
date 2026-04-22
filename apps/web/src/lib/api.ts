import { IncentivFlowClient } from '@incentivflow/api-client';
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const api = new IncentivFlowClient({
  baseURL: (typeof window !== 'undefined' ? (window as any)._env_?.VITE_API_URL : null) || 
           (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') 
             ? window.location.origin 
             : 'http://localhost:3000'),
});

// Alias for compatibility
export const apiClient = api;