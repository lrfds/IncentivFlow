import React, { useMemo } from 'react';
import { Activity, DollarSign, TrendingUp, AlertTriangle, Users2, Plus, ChevronRight } from 'lucide-react';
import type { Project } from '../../types';
import { daysUntil, formatCurrency, formatDate } from '../../types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { t } from '../../i18n';
import type { ViewId } from '../../components/layout/Sidebar';

interface DashboardViewProps {
  projects: Project[];
  onNewClient: () => void;
  onNewProject: () => void;
  onSelectProject: (project: Project) => void;
  onViewChange: (v: ViewId) => void;
}

export function DashboardView({ projects, onNewClient, onNewProject, onSelectProject, onViewChange }: DashboardViewProps) {
  const stats = useMemo(() => {
    const active = projects.filter(p => p.phase !== 'CONCLUIDO');
    const approved = projects.reduce((sum, p) => sum + p.financial.approved, 0);
    const captured = projects.reduce((sum, p) => sum + p.financial.captured, 0);
    const atRisk = projects.filter(p => {
      const days = daysUntil(p.deadline);
      return days >= 0 && days <= 30 && p.phase !== 'CONCLUIDO';
    }).length;
    
    return { active: active.length, approved, captured, atRisk };
  }, [projects]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-sm text-slate-500 mt-0.5">Visão geral dos projetos de incentivo</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onNewClient} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 flex items-center gap-2">
            <Users2 className="w-4 h-4" />
            Novo Cliente
          </button>
          <button onClick={onNewProject} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Novo Projeto
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-600 font-medium">Projetos Ativos</p>
            <Activity className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-[28px] leading-none liquid-text">{stats.active}</p>
          <p className="text-xs text-slate-500 mt-1.5">Em andamento</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-600 font-medium">Valor Autorizado</p>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-[22px] leading-tight font-bold tracking-tight text-slate-800">{formatCurrency(stats.approved)}</p>
          <p className="text-xs text-slate-500 mt-1.5">Aprovado</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-600 font-medium">Valor Captado</p>
            <TrendingUp className="w-4 h-4 text-violet-600" />
          </div>
          <p className="text-[22px] leading-tight font-bold tracking-tight text-slate-800">{formatCurrency(stats.captured)}</p>
          <p className="text-xs text-slate-500 mt-1.5">{stats.approved > 0 ? Math.round((stats.captured / stats.approved) * 100) : 0}% do total</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-500">Em Risco</p>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold">{stats.atRisk}</p>
          <p className="text-xs text-slate-400 mt-1">Prazo &lt; 30 dias</p>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Projetos Recentes</h3>
          <button onClick={() => onViewChange('projects')} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
            Ver todos <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="space-y-2">
          {projects.slice(0, 5).map(p => (
            <button
              key={p.id}
              onClick={() => { onSelectProject(p); onViewChange('projects'); }}
              className="w-full flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl text-left"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.name}</p>
                <p className="text-xs text-slate-500">{p.clientName} • {formatDate(p.deadline)}</p>
              </div>
              <div className="flex items-center gap-2 ml-3">
                <Badge variant={p.phase === 'CONCLUIDO' ? 'success' : 'default'}>{t(`phase.${p.phase}`)}</Badge>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
