import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IncentivFlowClient } from './index.js';

/**
 * @fileoverview React Query Hooks for IncentivFlow.
 * Provides typed data fetching and mutation with automatic cache invalidation.
 */

// Singleton instance (configured externally)
let clientInstance: IncentivFlowClient | null = null;

export function setApiClient(client: IncentivFlowClient) {
  clientInstance = client;
}

function getClient() {
  if (!clientInstance) {
    throw new Error('API Client not initialized. Call setApiClient() first.');
  }
  return clientInstance;
}

/**
 * Hook to list projects with typed read models.
 */
export function useProjects(query?: any) {
  return useQuery({
    queryKey: ['projects', query],
    queryFn: () => getClient().projects.list(query),
  });
}

/**
 * Hook to get a specific project's current state (Projector View).
 */
export function useProject(id: string) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: () => getClient().projects.getById(id),
    enabled: !!id,
  });
}

/**
 * Mutation hook for elite upgrades.
 */
export function useRequestUpgrade() {
  const queryClient = useQueryClient();
  const client = getClient();

  return useMutation({
    mutationFn: async ({ id, planType }: { id: string; planType: string }) => {
      // In a real system, this would call a specific endpoint that appends the event
      const response = await client.projects.changePhase(id, { 
        targetPhase: 'UPGRADE_REQUESTED',
        reason: `Upgrade requested for ${planType}`
      } as any);
      return response;
    },
    onSuccess: (_, variables) => {
      // Invalidate the specific project to trigger a re-fetch of the new projection
      queryClient.invalidateQueries({ queryKey: ['projects', variables.id] });
    },
  });
}

/**
 * Hook for Audit Trail.
 */
export function useAuditTrail() {
  return useQuery({
    queryKey: ['audit'],
    queryFn: () => getClient().audit.list(),
  });
}
