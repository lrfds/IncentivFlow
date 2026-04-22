import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Hash, Server, Activity, ChevronUp, ChevronDown } from 'lucide-react';
import { apiClient } from '../lib/api';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { formatDateTime } from '../types';

export function EventExplorer() {
  const [isOpen, setIsOpen] = useState(false);

  // Consulta real a nossa tabela de Event Sourcing do Supabase
  const { data, isLoading, error } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => apiClient.audit.list(),
    // Re-fetch regular para simular tempo real caso mude aba, ou depende de invalidação
    refetchInterval: 10000 
  });

  if (error) return null;

  const logs = data?.logs || [];
  const total = data?.total || 0;

  if (!isOpen) {
    return (
      <div 
        className="fixed bottom-4 right-4 z-50 bg-slate-900 text-white rounded-full px-4 py-2 flex items-center gap-3 cursor-pointer shadow-lg hover:bg-slate-800 transition border border-indigo-500/50"
        onClick={() => setIsOpen(true)}
      >
        <Activity className="w-4 h-4 text-indigo-400 animate-pulse" />
        <span className="text-xs font-semibold">Auditoria Live ({total})</span>
        <ChevronUp className="w-4 h-4 text-slate-400" />
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 flex flex-col justify-end">
      <Card className="shadow-2xl border-indigo-500/30 overflow-hidden flex flex-col" style={{ maxHeight: '500px' }}>
        {/* Header */}
        <div 
          className="bg-slate-900 text-white p-3 flex justify-between items-center cursor-pointer hover:bg-slate-800 transition"
          onClick={() => setIsOpen(false)}
        >
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-indigo-400" />
            <h3 className="font-semibold text-sm">Event Sourcing Trail</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="success" className="bg-emerald-500/20 text-emerald-300">Live</Badge>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>
        </div>
        
        {/* Status bar */}
        <div className="p-2 bg-slate-100 border-b border-slate-200 flex justify-between items-center text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
          <span>{total} Logs Imutáveis</span>
          {isLoading && <span className="animate-pulse text-indigo-500">Syncing...</span>}
        </div>
        
        {/* Log List */}
        <div className="p-3 overflow-y-auto space-y-3 bg-white flex-1" style={{ maxHeight: '400px' }}>
          {logs.map((event: any) => (
            <div key={event.id} className="flex gap-3 text-sm border-b border-slate-50 pb-3 last:border-0 last:pb-0">
              <div className="mt-1 flex-shrink-0">
                <Hash className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-slate-800 text-[11px] uppercase tracking-wide">
                    {event.type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[9px] text-slate-400">{formatDateTime(event.createdAt)}</span>
                </div>
                <div className="text-[11px] text-slate-600 truncate" title={event.aggregateType}>
                  <span className="font-medium">{event.aggregateType}</span> 
                  {event.aggregateId && <span className="text-slate-400 ml-1">#{event.aggregateId.slice(0, 8)}</span>}
                </div>
                <div className="mt-1.5 text-[9px] font-mono bg-slate-50 text-slate-500 p-1.5 rounded border border-slate-200 break-all" title={event.hash}>
                  {event.hash}
                </div>
              </div>
            </div>
          ))}
          {logs.length === 0 && !isLoading && (
            <div className="text-center text-slate-400 py-8 text-xs flex flex-col items-center gap-2">
              <Activity className="w-6 h-6 opacity-20" />
              Nenhum evento registrado ainda.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
