import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import type { CreateProjectDTO, ChangePhaseDTO } from '@incentivflow/shared';

export function useProjectMutations() {
  const queryClient = useQueryClient();

  const createProject = useMutation({
    mutationFn: (data: CreateProjectDTO) => apiClient.projects.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const advancePhase = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ChangePhaseDTO }) =>
      apiClient.projects.changePhase(id, data),
    onMutate: async ({ id, data }) => {
      // 1. Cancelar requisições pendentes da query 'projects'
      await queryClient.cancelQueries({ queryKey: ['projects'] });

      // 2. Snapshot do estado anterior (para rollback)
      const previousProjects = queryClient.getQueryData(['projects']);

      // 3. Atualizar o cache otimisticamente
      queryClient.setQueryData(['projects'], (old: any) => {
        if (!old) return old;
        const isWrapper = !!old.data;
        const projectsList = isWrapper ? old.data : old;
        
        const updatedList = projectsList.map((project: any) => 
          project.id === id ? { ...project, phase: data.targetPhase } : project
        );
        
        return isWrapper ? { ...old, data: updatedList } : updatedList;
      });

      // Return context containing previous state for potential rollback
      return { previousProjects };
    },
    onError: (_err, _variables, context) => {
      // Rollback se falhar
      if (context?.previousProjects) {
        queryClient.setQueryData(['projects'], context.previousProjects);
      }
    },
    onSettled: () => {
      // Sempre refaz a query no fim para garantir integridade server-side
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  return { createProject, advancePhase };
}
