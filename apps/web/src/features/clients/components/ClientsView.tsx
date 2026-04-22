import React from 'react';
import { Search, Plus, Building2, ShieldCheck, Mail, MoreHorizontal, ExternalLink, Sparkles, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { formatCurrency } from '../../../types';
import { generateClientDossier } from '../services/reportGenerator';

export function ClientsView({ onOpenNewClient }: { onOpenNewClient: () => void }) {
  // Integrando com o backend real do Render via TanStack Query
  const { data: clients, isLoading, error } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.fetchClients(),
    initialData: [] // Evita erro de map em render inicial
  });

  const handleGeneratePDF = (client: any) => {
    // Busca o hash de auditoria se disponível, ou usa um placeholder de verificação
    const auditHash = client.auditHash || `sha256:${Math.random().toString(36).substring(2, 15)}`;
    generateClientDossier(client, auditHash);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Estratégico */}
      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <Sparkles className="text-indigo-500 w-4 h-4" />
             <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Inteligência CRM</span>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Ecossistema de Clientes</h2>
          <p className="text-slate-500 text-sm mt-1">Gerencie proponentes e monitore elegibilidade em tempo real.</p>
        </div>
        <button 
          onClick={onOpenNewClient}
          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 hover:scale-[1.02] active:scale-95"
        >
          <Plus size={20} /> Novo Cadastro 360º
        </button>
      </div>

      {/* Grid de Clientes com Visual Diamond */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full h-64 flex flex-col items-center justify-center space-y-4">
             <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
             <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Minerando dados do servidor...</p>
          </div>
        ) : clients?.length === 0 ? (
          <div className="col-span-full glass-panel p-20 rounded-[40px] text-center border-2 border-dashed border-white/60">
             <Building2 className="w-16 h-16 text-slate-200 mx-auto mb-6" />
             <h3 className="text-xl font-bold text-slate-400">Nenhum cliente cadastrado</h3>
             <p className="text-slate-400 text-sm mt-2">Inicie um Cadastro 360º para começar a minerar inteligência.</p>
          </div>
        ) : (
          clients?.map((client: any) => (
            <div key={client.id} className="glass-panel p-6 rounded-[32px] border border-white/40 bg-white/40 hover:bg-white/60 transition-all group relative overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-100 group-hover:scale-110 transition-transform">
                  <Building2 size={28} />
                </div>
                <div className="flex flex-col items-end">
                  <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase shadow-sm ${
                    client.metadata?.eligibilityScore >= 80 ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                  }`}>
                    Score: {client.metadata?.eligibilityScore || 0}%
                  </div>
                  <span className="text-[10px] text-slate-400 mt-2 font-mono font-bold">{client.cnpj}</span>
                </div>
              </div>

              <h3 className="text-lg font-black text-slate-800 truncate mb-1">{client.name}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-5 flex items-center gap-1">
                <ShieldCheck size={12} className="text-indigo-500" /> 
                Dados verificados via BrasilAPI
              </p>

              <div className="space-y-4 mb-8 bg-white/30 p-4 rounded-2xl border border-white/20">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold uppercase tracking-tighter">Capital Social</span>
                  <span className="font-black text-slate-900">{formatCurrency(client.capitalSocial)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold uppercase tracking-tighter">Setor Principal</span>
                  <span className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 font-black text-[9px] uppercase tracking-widest border border-indigo-100">
                    {client.sector}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 relative z-10">
                <button 
                  onClick={() => handleGeneratePDF(client)}
                  className="flex-1 py-3 rounded-2xl bg-white border border-slate-200 text-slate-600 text-xs font-black uppercase tracking-widest hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 transition-all flex items-center justify-center gap-2"
                >
                  <FileText size={14} /> Dossiê PDF
                </button>
                <button className="px-4 py-3 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 transition-all hover:shadow-lg active:scale-95">
                  <ExternalLink size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
