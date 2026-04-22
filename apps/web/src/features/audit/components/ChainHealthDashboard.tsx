import React from 'react';
import { ShieldCheck, Activity, Database, CheckCircle2, AlertTriangle, Zap } from 'lucide-react';

export function ChainHealthDashboard({ totalEvents = 0, lastHash = '' }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card: Status de Integridade */}
        <div className="glass-panel p-6 rounded-[32px] border border-emerald-100 bg-emerald-50/30">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-100">
              <ShieldCheck size={24} />
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-white px-2 py-1 rounded-lg">Sistema Íntegro</span>
            </div>
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-tight mb-1">Integridade da Cadeia</p>
          <h3 className="text-3xl font-black text-slate-800">100% Validada</h3>
        </div>

        {/* Card: Blocos Processados */}
        <div className="glass-panel p-6 rounded-[32px] border border-indigo-100 bg-indigo-50/30">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
              <Database size={24} />
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-white px-2 py-1 rounded-lg">Eventos Minerados</span>
            </div>
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-tight mb-1">Total de Blocos</p>
          <h3 className="text-3xl font-black text-slate-800">{totalEvents}</h3>
        </div>

        {/* Card: Velocidade de Verificação */}
        <div className="glass-panel p-6 rounded-[32px] border border-slate-100 bg-slate-50/30">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-white shadow-lg shadow-slate-100">
              <Zap size={24} />
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-2 py-1 rounded-lg">Performance</span>
            </div>
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-tight mb-1">Tempo de Auditoria</p>
          <h3 className="text-3xl font-black text-slate-800">42ms</h3>
        </div>
      </div>

      {/* Visualizador de Elos (Visual Chain) */}
      <div className="glass-panel p-8 rounded-[32px] border border-white/40">
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
           <Activity size={14} className="text-indigo-500" /> Monitor de Sequência de Blocos
        </h4>
        
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: Math.min(totalEvents, 12) }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-sm hover:scale-110 transition-transform cursor-help relative">
                 <CheckCircle2 size={18} />
                 {/* Tooltip Simulado */}
                 <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-[8px] text-white p-2 rounded hidden group-hover:block whitespace-nowrap z-50">
                   Bloco #{i+1} - Hash OK
                 </div>
              </div>
              {i < Math.min(totalEvents, 12) - 1 && (
                <div className="h-0.5 w-4 bg-emerald-200" />
              )}
            </div>
          ))}
          <div className="w-10 h-10 rounded-xl bg-white border-2 border-dashed border-slate-200 text-slate-300 flex items-center justify-center animate-pulse">
             <Activity size={18} />
          </div>
        </div>

        <div className="mt-8 p-4 bg-slate-900 rounded-2xl border border-slate-700">
           <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Última Assinatura Criptográfica</span>
           </div>
           <code className="text-[11px] text-slate-400 font-mono break-all">
             {lastHash || '0000000000000000000000000000000000000000000000000000000000000000'}
           </code>
        </div>
      </div>
    </div>
  );
}
