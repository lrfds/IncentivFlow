import React from 'react';

export const CaptationThermometer = ({ approved, captured }: { approved: number, captured: number }) => {
  const percent = approved > 0 ? (captured / approved) * 100 : 0;

  return (
    <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
      <div className="flex justify-between items-end mb-4">
        <div>
          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Performance de Captação</p>
          <h3 className="text-3xl font-bold text-slate-800">R$ {captured.toLocaleString('pt-BR')}</h3>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Meta Aprovada</p>
          <span className="text-sm font-mono font-bold text-slate-600">R$ {approved.toLocaleString('pt-BR')}</span>
        </div>
      </div>
      
      <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden border border-white/20 p-[2px] shadow-inner">
        <div 
          className="h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 shadow-lg"
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      
      <div className="mt-4 flex justify-between items-center">
        <div className="flex gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-indigo-500" /> Elaborado
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" /> Captado
          </div>
        </div>
        <div className="glass-panel px-3 py-1 rounded-lg">
          <span className="text-xs font-bold text-indigo-600">{percent.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
};
