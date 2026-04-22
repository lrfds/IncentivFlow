import React, { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, Clock, ChevronDown, ChevronRight, Activity } from 'lucide-react';
import { verifyEventHash, getDiff } from './utils';

/**
 * @interface AuditEvent
 * Matches the structure returned by the API
 */
interface AuditEvent {
  id: string;
  type: string;
  version: number;
  payload: any;
  prevHash: string | null;
  hash: string;
  createdAt: string;
  aggregateId: string;
  metadata?: {
    userId: string;
  };
}

interface AuditTimelineProps {
  events: AuditEvent[];
  isLoading?: boolean;
}

/**
 * @component AuditTimeline
 * A verifiable chronological list of domain events with cryptographic validation.
 */
export const AuditTimeline: React.FC<AuditTimelineProps> = ({ events, isLoading }) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [verificationResults, setVerificationResults] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const verifyAll = async () => {
      const results: Record<string, boolean> = {};
      for (const event of events) {
        results[event.id] = await verifyEventHash(event);
      }
      setVerificationResults(results);
    };
    if (events.length > 0) verifyAll();
  }, [events]);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedItems(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Activity className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-slate-400 font-medium">Verificando integridade da cadeia...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 rounded-xl border border-slate-800 shadow-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
        <div className="flex items-center space-y-1">
          <ShieldCheck className="w-5 h-5 text-emerald-500 mr-2" />
          <h2 className="text-slate-100 font-bold tracking-tight">Trilha de Auditoria Imutável</h2>
        </div>
        <div className="text-xs font-mono text-slate-500 uppercase tracking-widest">
          {events.length} Eventos Detectados
        </div>
      </div>

      <div className="p-6 space-y-0 relative">
        {/* Timeline Vertical Line */}
        <div className="absolute left-9 top-10 bottom-10 w-px bg-gradient-to-b from-blue-500/50 via-slate-700 to-transparent" />

        {events.map((event, index) => {
          const isVerified = verificationResults[event.id];
          const isExpanded = expandedItems.has(event.id);
          const prevEvent = index < events.length - 1 ? events[index + 1] : null; // Descending order assumed
          const changedKeys = getDiff(prevEvent?.payload, event.payload);

          return (
            <div key={event.id} className="relative pl-10 pb-8 last:pb-0">
              {/* Timeline Dot */}
              <div className={`absolute left-[33px] top-1 w-3 h-3 rounded-full border-2 border-slate-950 z-10 ${
                isVerified ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
              }`} />

              <div className="group bg-slate-900/40 hover:bg-slate-900/60 border border-slate-800/50 rounded-lg transition-all duration-200">
                <div 
                  className="px-4 py-3 flex items-center justify-between cursor-pointer"
                  onClick={() => toggleExpand(event.id)}
                >
                  <div className="flex items-center space-x-4">
                    <span className="text-xs font-mono text-slate-500 w-8">v{event.version}</span>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-200 tracking-wide uppercase">{event.type.replace(/_/g, ' ')}</span>
                      <span className="text-[10px] text-slate-500 flex items-center mt-1">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(event.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {isVerified ? (
                      <div className="flex items-center px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">
                        <ShieldCheck className="w-3 h-3 mr-1" />
                        Integridade Verificada
                      </div>
                    ) : (
                      <div className="flex items-center px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded text-[10px] font-bold text-red-500 uppercase tracking-tighter">
                        <ShieldAlert className="w-3 h-3 mr-1" />
                        Falha na Cadeia
                      </div>
                    )}
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-slate-800/50 pt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">Payload Data</h4>
                        <div className="bg-slate-950/50 p-3 rounded border border-slate-800 font-mono text-xs text-slate-300">
                          {Object.entries(event.payload).map(([key, val]) => (
                            <div key={key} className={`flex justify-between py-1 ${changedKeys.includes(key) ? 'bg-blue-500/10 -mx-1 px-1 rounded' : ''}`}>
                              <span className="text-slate-500">{key}:</span>
                              <span className={changedKeys.includes(key) ? 'text-blue-400 font-bold' : ''}>{String(val)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">Criptografia</h4>
                        <div className="space-y-2">
                          <div className="flex flex-col">
                            <span className="text-[9px] text-slate-600 font-bold uppercase">Hash do Evento</span>
                            <span className="text-[10px] font-mono text-slate-400 break-all bg-slate-950/30 p-1 rounded border border-slate-800/50 mt-1">{event.hash}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[9px] text-slate-600 font-bold uppercase">Hash Anterior</span>
                            <span className="text-[10px] font-mono text-slate-400 break-all opacity-50">{event.prevHash || 'INÍCIO DA CADEIA'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
