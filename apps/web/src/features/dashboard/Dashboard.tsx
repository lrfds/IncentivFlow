import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { TrendingUp, Clock, CheckCircle2, AlertTriangle, FileText, Users } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const PHASE_COLORS: Record<string, string> = {
  ELABORACAO: '#3b82f6',
  APROVACAO_CLIENTE: '#8b5cf6',
  SUBMISSAO: '#f59e0b',
  ACOMPANHAMENTO: '#06b6d4',
  POS_APROVACAO: '#10b981',
  CONCLUIDO: '#64748b',
};

const PHASE_LABELS: Record<string, string> = {
  ELABORACAO: 'Elaboração',
  APROVACAO_CLIENTE: 'Aprovação',
  SUBMISSAO: 'Submissão',
  ACOMPANHAMENTO: 'Acompanhamento',
  POS_APROVACAO: 'Pós-Aprovação',
  CONCLUIDO: 'Concluído',
};

export function Dashboard() {
  const { data: kpis, isLoading } = useQuery({
    queryKey: ['kpis'],
    queryFn: api.getKPIs,
    refetchInterval: 30000,
  });

  if (isLoading || !kpis) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-500">Carregando indicadores...</div>
      </div>
    );
  }

  const pieData = kpis.distribuicaoFases.map((d: any) => ({
    name: PHASE_LABELS[d.fase] || d.fase,
    value: d.total,
    color: PHASE_COLORS[d.fase],
  }));

  const kpiCards = [
    {
      label: 'Projetos Ativos',
      value: kpis.emAndamento,
      total: kpis.totalProjetos,
      icon: FileText,
      color: 'indigo',
      trend: '+12%',
    },
    {
      label: 'Valor Aprovado',
      value: `R$ ${(kpis.valorTotalAprovado / 1000000).toFixed(1)}M`,
      icon: TrendingUp,
      color: 'emerald',
      trend: '+8.3%',
    },
    {
      label: 'Prazos Críticos',
      value: kpis.prazosCriticos,
      icon: Clock,
      color: kpis.prazosCriticos > 0 ? 'amber' : 'slate',
      trend: kpis.prazosCriticos > 3 ? 'Atenção' : 'OK',
    },
    {
      label: 'Taxa de Aprovação',
      value: `${kpis.totalProjetos > 0 ? Math.round((kpis.aprovados / kpis.totalProjetos) * 100) : 0}%`,
      icon: CheckCircle2,
      color: 'cyan',
      trend: '+5%',
    },
  ];

  return (
    <div className="space-y-8">
      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">{kpi.label}</p>
                  <p className="text-3xl font-semibold text-slate-900 tracking-tight">
                    {kpi.value}
                    {kpi.total && <span className="text-lg text-slate-400 ml-2">/ {kpi.total}</span>}
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-xl bg-${kpi.color}-50 flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 text-${kpi.color}-600`} />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-1 rounded-md ${
                  kpi.trend.includes('+') || kpi.trend === 'OK' 
                    ? 'bg-emerald-50 text-emerald-700' 
                    : 'bg-amber-50 text-amber-700'
                }`}>
                  {kpi.trend}
                </span>
                <span className="text-xs text-slate-500">vs mês anterior</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-6">Distribuição por Fase</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600">{item.name}</span>
                </div>
                <span className="font-medium text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-slate-900">Evolução Mensal</h3>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-600">Aprovados</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                <span className="text-slate-600">Submetidos</span>
              </div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { mes: 'Mar', aprovados: 2, submetidos: 5 },
                { mes: 'Abr', aprovados: 3, submetidos: 4 },
                { mes: 'Mai', aprovados: 5, submetidos: 6 },
                { mes: 'Jun', aprovados: 4, submetidos: 7 },
                { mes: 'Jul', aprovados: 6, submetidos: 5 },
                { mes: 'Ago', aprovados: 8, submetidos: 3 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="aprovados" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="submetidos" fill="#94a3b8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {kpis.prazosCriticos > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-amber-900 mb-1">
              {kpis.prazosCriticos} {kpis.prazosCriticos === 1 ? 'projeto com prazo crítico' : 'projetos com prazos críticos'}
            </h4>
            <p className="text-sm text-amber-700">
              Projetos com submissão prevista nos próximos 30 dias. Revise a documentação e confirme com os clientes.
            </p>
          </div>
          <button className="text-sm font-medium text-amber-700 hover:text-amber-900 whitespace-nowrap">
            Ver detalhes →
          </button>
        </div>
      )}
    </div>
  );
}