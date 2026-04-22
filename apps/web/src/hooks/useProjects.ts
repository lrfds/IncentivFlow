import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      return apiClient.projects.list();
    },
  });
}
