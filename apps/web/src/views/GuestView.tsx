import React from 'react';
import { ShieldCheck, Clock, FileCheck, Hash, ExternalLink, Activity } from 'lucide-react';
import { formatCurrency } from '../types';

export function GuestView() {
  // Dados simulados baseados no token seguro (vindo da URL)
  const project = {
    name: "Expansão Tecnológica 2026",
    clientName: "Inova Corp S.A.",
    status: "SUBMITTED",
    value: 4500000,
    protocol: "INC-2026-9842",
    auditHash: "sha256:d82e1c94f1...842a1b",
    lastUpdate: "2026-04-22T15:30:00Z"
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-2xl w-full space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        
        {/* Header de Prestígio */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-4">
            <ShieldCheck size={12} /> Secure Partner Portal
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Status do Projeto</h1>
          <p className="text-slate-500 font-medium">Protocolo de Incentivo Fiscal Diamond</p>
        </div>

        {/* Card Principal de Luxo */}
        <div className="glass-panel p-10 rounded-[40px] border border-white bg-white/40 shadow-2xl shadow-indigo-100/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-5">
             <Activity size={120} className="text-slate-900" />
          </div>
          
          <div className="relative z-10 space-y-8">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Proponente</p>
                <h2 className="text-2xl font-black text-slate-800">{project.clientName}</h2>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Atual</p>
                <span className="px-4 py-2 bg-emerald-500 text-white text-[10px] font-black rounded-xl shadow-lg shadow-emerald-100 uppercase tracking-widest">
                  {project.status}
                </span>
              </div>
            </div>

            {/* Timeline de Progresso White Glove */}
            <div className="py-8">
              <div className="relative flex justify-between">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2" />
                <div className="absolute top-1/2 left-0 w-[66%] h-0.5 bg-indigo-600 -translate-y-1/2 transition-all duration-1000" />
                
                {[
                  { label: 'Análise', active: true },
                  { label: 'Dossiê', active: true },
                  { label: 'Protocolado', active: true },
                  { label: 'Aprovado', active: false }
                ].map((step, i) => (
                  <div key={i} className="relative z-10 flex flex-col items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      step.active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-white border border-slate-200 text-slate-300'
                    }`}>
                      {step.active ? <FileCheck size={18} /> : <Clock size={18} />}
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${step.active ? 'text-slate-800' : 'text-slate-300'}`}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-100">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Investimento Projetado</p>
                <p className="text-xl font-black text-slate-800">{formatCurrency(project.value)}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Código de Protocolo</p>
                <p className="text-xl font-black text-slate-800">{project.protocol}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer de Integridade */}
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-3 text-slate-400 bg-white/50 px-6 py-3 rounded-2xl border border-white shadow-sm">
            <Hash size={14} className="text-indigo-400" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-tight">Audit Signature: {project.auditHash}</span>
          </div>
          
          <button className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors text-xs font-bold group">
            Baixar Dossiê Certificado <ExternalLink size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </button>
        </div>

        <div className="text-center pt-8">
           <p className="text-[9px] text-slate-300 font-medium uppercase tracking-[0.3em]">Powered by IncentivFlow Diamond Compliance</p>
        </div>
      </div>
    </div>
  );
}
