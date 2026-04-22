import React, { useMemo } from 'react';
import { Plus, Clock } from 'lucide-react';
import type { Project, Phase } from '../../types';
import { daysUntil, formatCurrency } from '../../types';
import { Card } from '../../components/ui/Card';
import { t } from '../../i18n';

interface ProjectsViewProps {
  projects: Project[];
  search: string;
  onNewProject: () => void;
  onSelectProject: (project: Project) => void;
}

export function ProjectsView({ projects, search, onNewProject, onSelectProject }: ProjectsViewProps) {
  const filteredProjects = useMemo(() => {
    if (!search) return projects;
    const s = search.toLowerCase();
    return projects.filter(p => 
      p.name.toLowerCase().includes(s) || 
      p.clientName.toLowerCase().includes(s)
    );
  }, [projects, search]);

  const phaseColors: Record<Phase, string> = {
    ELABORACAO: 'bg-sky-100 text-sky-700 border-sky-200',
    APROVACAO_CLIENTE: 'bg-amber-100 text-amber-700 border-amber-200',
    SUBMISSAO: 'bg-violet-100 text-violet-700 border-violet-200',
    ACOMPANHAMENTO: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    POS_APROVACAO: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    CONCLUIDO: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Projetos</h2>
        <button onClick={onNewProject} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Novo Projeto
        </button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Projeto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Fase</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Prazo</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProjects.map(p => {
                const days = daysUntil(p.deadline);
                return (
                  <tr key={p.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => onSelectProject(p)}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.law}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{p.clientName}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium border ${phaseColors[p.phase]}`}>
                        {t(`phase.${p.phase}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Clock className={`w-3.5 h-3.5 ${days < 0 ? 'text-red-500' : days <= 7 ? 'text-amber-500' : 'text-slate-400'}`} />
                        <span className={`text-xs ${days < 0 ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
                          {days < 0 ? `${Math.abs(days)}d atraso` : days === 0 ? 'Hoje' : `${days}d`}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-sm font-mono">{formatCurrency(p.financial.approved || p.financial.requested)}</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
