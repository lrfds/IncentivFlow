import React from 'react';
import { Activity, Cpu, Globe, ShieldCheck, Zap } from 'lucide-react';

export function AuditWarRoom({ healthData }: { healthData: any }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in duration-700">
      {/* 1. Pulso de Sincronia Global */}
      <div className="lg:col-span-2 glass-panel p-8 rounded-[2.5rem] border border-white/10 bg-slate-950 text-white relative overflow-hidden shadow-2xl">
        {/* Background Orbit Effect */}
        <div className="absolute top-0 right-0 p-8 opacity-20">
          <Globe size={180} className="animate-spin-slow text-indigo-500" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="relative flex h-5 w-5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-5 w-5 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"></span>
            </div>
            <h3 className="text-xl font-light tracking-[0.3em] uppercase text-slate-300">Global Integrity Pulse</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <KPIItem label="Network Health" value="99.9%" sub="Verified Nodes" />
            <KPIItem label="Block Sync" value="REALTIME" sub="Atomic Commit" />
            <KPIItem label="Chain Length" value={healthData.totalBlocks} sub="Immutable Blocks" />
            <KPIItem label="Security Tier" value="DIAMOND" sub="SHA-256 Active" />
          </div>
        </div>
      </div>

      {/* 2. Log de Integridade Global (Live Feed) */}
      <div className="glass-panel p-6 rounded-[2.5rem] border border-slate-800 bg-slate-900/90 shadow-inner overflow-hidden flex flex-col h-full min-h-[280px]">
        <div className="flex items-center justify-between mb-4">
           <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
             <Cpu size={14} className="text-indigo-400" /> System Heartbeat
           </div>
           <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-500">
             <Zap size={10} /> LIVE
           </div>
        </div>

        <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar font-mono text-[10px]">
          {healthData.recentEvents?.map((event: any, index: number) => (
            <div key={event.id || index} className="flex flex-col gap-1 border-l-2 border-emerald-500/20 pl-3 py-1 group hover:border-emerald-500 transition-all">
              <div className="flex justify-between">
                <span className="text-emerald-500 font-black">[{new Date(event.createdAt).toLocaleTimeString()}]</span>
                <span className="text-slate-600 font-bold uppercase">{event.type}</span>
              </div>
              <span className="text-slate-400 truncate opacity-60 group-hover:opacity-100 transition-opacity">
                HASH: {event.hash?.substring(0, 16)}...
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KPIItem({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="group cursor-default">
      <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-2 group-hover:text-indigo-400 transition-colors">{label}</p>
      <p className="text-3xl font-black text-white leading-none tracking-tight">{value}</p>
      <div className="flex items-center gap-1 mt-2">
         <div className="w-1 h-1 bg-emerald-500 rounded-full" />
         <p className="text-[9px] text-emerald-400/80 font-mono font-bold uppercase">{sub}</p>
      </div>
    </div>
  );
}
