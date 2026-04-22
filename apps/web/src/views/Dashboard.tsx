import React from 'react';
import { CaptationThermometer } from '../features/captation/CaptationThermometer';
import { FinancialHealthDashboard } from '../features/captation/FinancialHealthDashboard';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function DashboardView() {
  // Conectando com dados reais para alimentar as projeções
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.fetchClients()
  });

  // KPIs de Captação (Vindo dos Projetos - Implementação em breve)
  const kpis = { approved: 1500000, captured: 450000 };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* 1. Visão de Performance Atual */}
      <section className="dashboard-thermometer">
        <CaptationThermometer 
          approved={kpis.approved} 
          captured={kpis.captured} 
        />
      </section>
      
      {/* 2. Visão de Saúde Financeira e Projeções */}
      <section>
        <div className="flex items-center gap-3 mb-6">
           <div className="h-px flex-1 bg-slate-200" />
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Inteligência Preditiva</span>
           <div className="h-px flex-1 bg-slate-200" />
        </div>
        <FinancialHealthDashboard clients={clients} />
      </section>

      {/* 3. Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-[28px] border border-white/40">
           <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Pipeline de Leads</p>
           <p className="text-3xl font-black text-slate-800">{clients.length}</p>
        </div>

        <div className="glass-panel p-6 rounded-[28px] border border-white/40">
           <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Próximos Prazos</p>
           <p className="text-3xl font-black text-slate-800">04</p>
        </div>

        <div className="glass-panel p-6 rounded-[28px] border border-white/40">
           <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Eficiência de Busca</p>
           <p className="text-3xl font-black text-emerald-600">92%</p>
        </div>
      </div>
    </div>
  );
}
