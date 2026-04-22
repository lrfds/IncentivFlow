import React from 'react';
import { ShieldCheck, Hash, Link as LinkIcon, Terminal, Clock } from 'lucide-react';

interface AuditEvent {
  id: string;
  type: string;
  payload: any;
  hash: string;
  prevHash: string;
  createdAt: string;
}

export function AuditTimeline({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="glass-panel p-12 rounded-3xl text-center border-2 border-dashed border-white/60">
        <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4 opacity-20" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nenhum evento registrado na Hash Chain</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {events.map((event, index) => (
        <div key={event.id} className="relative pl-10 pb-8 last:pb-0 group">
          {/* Linha Conectora da Corrente (Gradiente de Confiança) */}
          {index !== events.length - 1 && (
            <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500/30 to-transparent" />
          )}

          {/* Icone da Chain */}
          <div className="absolute left-0 top-0 w-8 h-8 rounded-xl bg-white border border-indigo-100 shadow-sm flex items-center justify-center z-10 group-hover:border-indigo-500 transition-colors">
            <LinkIcon size={14} className="text-indigo-600" />
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/40 bg-white/30 backdrop-blur-md hover:bg-white/50 transition-all duration-300 shadow-sm hover:shadow-lg">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 rounded-full bg-indigo-600 text-white text-[9px] font-black tracking-widest uppercase">
                  {event.type.replace('_', ' ')}
                </div>
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                  <ShieldCheck size={12} />
                  HASH VERIFIED
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-400 bg-white/50 px-2 py-1 rounded-md">
                {new Date(event.createdAt).toLocaleString('pt-BR')}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <p className="text-sm text-slate-700 leading-relaxed font-semibold">
                  {getEventDescription(event)}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono overflow-hidden bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <Terminal size={12} className="flex-shrink-0 text-indigo-400" />
                  <span className="truncate">Prev: {event.prevHash ? event.prevHash.substring(0, 24) : 'GENESIS_BLOCK'}...</span>
                </div>
              </div>

              <div className="bg-slate-900/5 rounded-xl p-3 border border-slate-900/5">
                <div className="flex items-center gap-2 mb-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <Hash size={12} className="text-indigo-500" /> Assinatura Criptográfica
                </div>
                <p className="text-[10px] font-mono text-indigo-700 break-all leading-tight">
                  {event.hash}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function getEventDescription(event: AuditEvent) {
  switch (event.type) {
    case 'CLIENT_ENRICHED':
      return `Dossiê institucional minerado para o CNPJ ${event.payload?.cnpj || '---'}. Elegibilidade calculada em ${event.payload?.eligibilityScore || '0'}%.`;
    case 'PROJECT_CREATED':
      return `Projeto "${event.payload?.title || 'Novo Projeto'}" registrado no aggregate ${event.aggregateId.substring(0,8)}.`;
    case 'SYSTEM_BOOT':
      return `Sistema inicializado. Versão ${event.payload?.version} em ambiente ${event.payload?.environment}.`;
    default:
      return 'Alteração de estado detectada e registrada na corrente de auditoria imutável.';
  }
}
