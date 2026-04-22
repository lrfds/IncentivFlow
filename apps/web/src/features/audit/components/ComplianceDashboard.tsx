import React from 'react';
import { ShieldAlert, TrendingDown, Clock, ArrowRight } from 'lucide-react';

export function ComplianceDashboard({ upcomingDeadlines = [] }: { upcomingDeadlines: any[] }) {
  const totalAtRisk = upcomingDeadlines.reduce((acc: number, d: any) => acc + (d.estimatedValue || 0), 0);

  return (
    <div className="glass-panel p-8 rounded-[2.5rem] bg-gradient-to-br from-slate-950 to-red-950/30 border border-red-500/30 shadow-2xl animate-in slide-in-from-bottom-6 duration-1000">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <ShieldAlert className="text-red-500 w-6 h-6 animate-pulse" />
            <h3 className="text-red-500 font-black tracking-tighter text-3xl uppercase">The Red Zone</h3>
          </div>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em]">Monitoramento de Capital em Risco Crítico</p>
        </div>
        
        <div className="glass-panel px-8 py-4 bg-white/5 border-white/10 rounded-3xl text-right">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Honorários em Exposição</p>
          <div className="flex items-baseline gap-2 justify-end">
            <span className="text-slate-400 text-sm font-mono">R$</span>
            <p className="text-3xl font-black text-white tracking-tighter">
              {totalAtRisk.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="flex items-center gap-1 justify-end mt-1 text-red-400 text-[9px] font-bold uppercase">
             <TrendingDown size={10} /> Alerta de Conformidade Ativo
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {upcomingDeadlines.length === 0 ? (
          <div className="lg:col-span-3 py-10 text-center border-2 border-dashed border-slate-800 rounded-3xl">
             <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Nenhum risco crítico detectado no momento.</p>
          </div>
        ) : (
          upcomingDeadlines.map((deadline: any) => (
            <div key={deadline.id} className="p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-red-500/50 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Clock size={40} className="text-red-500" />
              </div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-4">
                  <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-500 text-[9px] font-black uppercase tracking-widest">
                    -{deadline.daysRemaining} DIAS
                  </span>
                  <div className="h-2 w-2 rounded-full bg-red-500 animate-ping shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                </div>
                
                <h4 className="text-white font-black text-base truncate mb-1 group-hover:text-red-400 transition-colors">
                  {deadline.clientName}
                </h4>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-4">
                  {deadline.documentType}
                </p>
                
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                   <p className="text-slate-500 text-[9px] font-black uppercase">Faturamento Estimado</p>
                   <p className="text-white font-mono text-xs font-bold">R$ {deadline.estimatedValue?.toLocaleString()}</p>
                </div>

                <button className="w-full mt-6 py-3 text-[10px] font-black uppercase tracking-widest bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all rounded-2xl flex items-center justify-center gap-2">
                  Iniciar Renovação <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
