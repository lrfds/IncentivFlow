import React from 'react';
import { TrendingUp, DollarSign, Target, PieChart, ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '../../types';

export function FinancialHealthDashboard({ clients = [] }: { clients: any[] }) {
  // Inteligência de Projeção Diamond
  const highPotentialClients = clients.filter(c => (c.metadata?.eligibilityScore || 0) >= 80);
  
  const totalPipeline = highPotentialClients.reduce((acc, curr) => acc + (curr.capitalSocial * 0.2), 0); // Estimativa de 20% do cap. social p/ incentivos
  const estimatedRevenue = totalPipeline * 0.15; // 15% de success fee

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-1000">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card: Pipeline de Oportunidades */}
        <div className="glass-panel p-8 rounded-[32px] bg-gradient-to-br from-indigo-600 to-indigo-800 text-white border-0 shadow-2xl shadow-indigo-200 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform">
            <TrendingUp size={120} />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-8 bg-white/10 w-fit px-3 py-1 rounded-full border border-white/20">
               <Target size={14} className="text-indigo-200" />
               <span className="text-[10px] font-black uppercase tracking-widest text-indigo-100">Market Potential</span>
            </div>
            <p className="text-indigo-100 text-sm font-medium mb-1 uppercase tracking-tighter">Pipeline de Incentivos</p>
            <h3 className="text-4xl font-black mb-6">{formatCurrency(totalPipeline)}</h3>
            
            <div className="flex items-center gap-2 text-indigo-200 text-xs font-bold bg-white/5 p-3 rounded-2xl border border-white/5">
              <ArrowUpRight size={14} />
              <span>Baseado em {highPotentialClients.length} empresas de alto potencial</span>
            </div>
          </div>
        </div>

        {/* Card: Projeção de Faturamento */}
        <div className="glass-panel p-8 rounded-[32px] border border-white/60 bg-white/60 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-4 bg-emerald-50 w-fit px-3 py-1 rounded-full border border-emerald-100">
                 <DollarSign size={14} className="text-emerald-600" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Revenue Forecast</span>
              </div>
              <p className="text-slate-400 text-sm font-bold uppercase tracking-tighter mb-1">Faturamento Estimado (Fees)</p>
              <h3 className="text-4xl font-black text-slate-800">{formatCurrency(estimatedRevenue)}</h3>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-100">
              <PieChart size={28} />
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4">
             <div className="p-4 bg-white/80 rounded-2xl border border-white">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Conversão Alvo</p>
                <p className="text-lg font-black text-emerald-600">15%</p>
             </div>
             <div className="p-4 bg-white/80 rounded-2xl border border-white">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Ticket Médio</p>
                <p className="text-lg font-black text-slate-800">R$ 45k</p>
             </div>
          </div>
        </div>
      </div>

      {/* Mini Gráfico / Listagem de Leads Quentes */}
      <div className="glass-panel p-6 rounded-[32px] border border-white/40">
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
           <TrendingUp size={14} className="text-indigo-500" /> Top Leads de Captação
        </h4>
        <div className="space-y-3">
          {highPotentialClients.slice(0, 3).map((client, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/40 transition-colors">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-[10px]">
                    {client.name.substring(0, 2)}
                  </div>
                  <span className="text-sm font-bold text-slate-700">{client.name}</span>
               </div>
               <span className="text-xs font-black text-emerald-600">{client.metadata?.eligibilityScore}% Fit</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
