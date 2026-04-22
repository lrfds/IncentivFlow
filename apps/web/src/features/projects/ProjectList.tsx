import { useQuery, useMutation } from '@tanstack/react-query';
import { api, queryClient } from '../../lib/api';
import { Search, ChevronRight, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

const PHASE_META = {
  ELABORACAO: { label: 'Elaboração', color: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
  APROVACAO_CLIENTE: { label: 'Aprovação Cliente', color: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-50' },
  SUBMISSAO: { label: 'Submissão', color: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
  ACOMPANHAMENTO: { label: 'Acompanhamento', color: 'bg-cyan-500', text: 'text-cyan-700', bg: 'bg-cyan-50' },
  POS_APROVACAO: { label: 'Pós-Aprovação', color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  CONCLUIDO: { label: 'Concluído', color: 'bg-slate-500', text: 'text-slate-700', bg: 'bg-slate-50' },
};

export function ProjectList({ onSelect }: { onSelect: (id: string) => void }) {
  const [search, setSearch] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<string>('');

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', { search, phase: phaseFilter }],
    queryFn: () => api.getProjects({ 
      ...(search && { search }), 
      ...(phaseFilter && { phase: phaseFilter }) 
    }),
  });

  const transitionMutation = useMutation({
    mutationFn: ({ id, toPhase }: { id: string; toPhase: string }) =>
      api.transitionProject(id, toPhase),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
    },
  });

  const getNextPhase = (current: string) => {
    const order = ['ELABORACAO', 'APROVACAO_CLIENTE', 'SUBMISSAO', 'ACOMPANHAMENTO', 'POS_APROVACAO', 'CONCLUIDO'];
    const idx = order.indexOf(current);
    return idx < order.length - 1 ? order[idx + 1] : null;
  };

  const getDeadlineStatus = (deadline?: string) => {
    if (!deadline) return null;
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return { label: 'Atrasado', color: 'text-red-600', icon: AlertTriangle };
    if (days <= 7) return { label: `${days}d`, color: 'text-amber-600', icon: Clock };
    if (days <= 30) return { label: `${days}d`, color: 'text-amber-500', icon: Clock };
    return { label: `${days}d`, color: 'text-slate-500', icon: Clock };
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, código ou cliente..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
        <select
          value={phaseFilter}
          onChange={(e) => setPhaseFilter(e.target.value)}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="">Todas as fases</option>
          {Object.entries(PHASE_META).map(([key, meta]) => (
            <option key={key} value={key}>{meta.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-3">Projeto</th>
                <th className="px-6 py-3">Cliente</th>
                <th className="px-6 py-3">Fase Atual</th>
                <th className="px-6 py-3">Valor Aprovado</th>
                <th className="px-6 py-3">Prazo</th>
                <th className="px-6 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">Carregando...</td></tr>
              ) : projects.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">Nenhum projeto encontrado</td></tr>
              ) : (
                projects.map((project: any) => {
                  const meta = PHASE_META[project.currentPhase as keyof typeof PHASE_META];
                  const deadline = getDeadlineStatus(project.submissionDeadline);
                  const nextPhase = getNextPhase(project.currentPhase);
                  
                  return (
                    <tr key={project.id} className="hover:bg-slate-50 cursor-pointer group" onClick={() => onSelect(project.id)}>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-slate-900 group-hover:text-indigo-600">{project.title}</div>
                          <div className="text-xs text-slate-500 mt-0.5 font-mono">{project.code}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-700">{project.clientName}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${meta.bg} ${meta.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${meta.color}`} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {project.valueApproved ? (
                          <div className="text-sm font-medium text-emerald-700">
                            R$ {(Number(project.valueApproved) / 1000000).toFixed(2)}M
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {deadline ? (
                          <div className={`flex items-center gap-1.5 text-xs ${deadline.color}`}>
                            <deadline.icon className="w-3.5 h-3.5" />
                            {deadline.label}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {nextPhase && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                transitionMutation.mutate({ id: project.id, toPhase: nextPhase });
                              }}
                              disabled={transitionMutation.isPending}
                              className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-600 transition-all"
                              title={`Avançar para ${PHASE_META[nextPhase as keyof typeof PHASE_META].label}`}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600" />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}