import React, { useState } from 'react';
import { Send, Clock, CheckCircle2, FileSearch, Hash, Building2, Zap, Loader2 } from 'lucide-react';
import { formatCurrency } from '../../../types';
import { triggerPostSubmissionFlow } from '../services/automation';

export function SubmissionTracker({ submissions = [] }: { submissions: any[] }) {
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const handleProtocol = async (sub: any) => {
    setIsProcessing(sub.id);
    try {
      await triggerPostSubmissionFlow(sub);
      alert(`🚀 Projeto ${sub.clientName} protocolado e automações de agenda ativadas!`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(null);
    }
  };

  // Dados simulados caso a lista esteja vazia
  const displaySubmissions = submissions.length > 0 ? submissions : [
    {
      id: 'sub_1',
      clientName: 'TecnoGlobal S.A.',
      projectName: 'Fomentando a Inovação 2024',
      lawType: 'LEI DO BEM',
      status: 'SUBMITTED',
      value: 850000,
      protocol: 'MIN-99823/2024',
      auditHash: 'sha256:88a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p'
    },
    {
      id: 'sub_2',
      clientName: 'Instituto Arte Viva',
      projectName: 'Palco para Todos',
      lawType: 'LEI ROUANET',
      status: 'APPROVED',
      value: 320000,
      protocol: 'PRONAC-24102',
      auditHash: 'sha256:1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p'
    }
  ];

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Tracker de Submissões</h2>
          <p className="text-slate-500 text-sm mt-1">Monitore o status de protocolos e conformidade criptográfica.</p>
        </div>
        <div className="flex gap-2">
          <StatusBadge count={12} label="Elaboração" color="bg-blue-500" />
          <StatusBadge count={5} label="Enviados" color="bg-amber-500" />
          <StatusBadge count={8} label="Aprovados" color="bg-emerald-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {displaySubmissions.map((sub: any) => (
          <div key={sub.id} className="glass-panel p-5 rounded-3xl border border-white/40 bg-white/30 hover:bg-white/50 transition-all flex items-center gap-6 group">
            {/* Status Icon */}
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${getStatusColor(sub.status)}`}>
              {sub.status === 'APPROVED' ? <CheckCircle2 size={28} /> : <Clock size={28} />}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="font-black text-slate-800 truncate">{sub.clientName}</h3>
                <span className="text-[9px] px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-600 font-black uppercase tracking-widest border border-indigo-100">
                  {sub.lawType}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate font-medium">{sub.projectName}</p>
            </div>

            {/* Value & Audit */}
            <div className="text-right px-8 border-x border-slate-200/50">
              <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">Valor Aprovado</p>
              <p className="text-xl font-black text-slate-800">{formatCurrency(sub.value)}</p>
            </div>

            {/* Protocol & Chain */}
            <div className="min-w-[160px]">
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-indigo-400 mb-2 bg-indigo-50/50 px-2 py-1 rounded-lg">
                <Hash size={10} /> {sub.auditHash.substring(0, 14)}...
              </div>
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-700">
                <FileSearch size={14} className="text-slate-400" />
                <span className="tracking-tight">{sub.protocol || 'EM ANÁLISE...'}</span>
              </div>
            </div>

            <button 
              onClick={() => handleProtocol(sub)}
              disabled={isProcessing === sub.id}
              className={`w-12 h-12 border rounded-2xl flex items-center justify-center transition-all shadow-sm active:scale-90 automation-trigger ${
                sub.status === 'APPROVED' 
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100 cursor-default' 
                  : 'bg-white border-slate-100 hover:bg-indigo-600 hover:text-white'
              }`}
            >
              {isProcessing === sub.id ? (
                <Loader2 size={18} className="animate-spin" />
              ) : sub.status === 'APPROVED' ? (
                <CheckCircle2 size={18} />
              ) : (
                <Zap size={18} />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ count, label, color }: any) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/50 border border-white/60 shadow-sm">
      <div className={`w-2 h-2 rounded-full ${color} shadow-[0_0_8px_rgba(0,0,0,0.1)]`} />
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{count} {label}</span>
    </div>
  );
}

function getStatusColor(status: string) {
  if (status === 'APPROVED') return 'bg-emerald-500 text-white';
  if (status === 'SUBMITTED') return 'bg-amber-500 text-white';
  return 'bg-indigo-500 text-white';
}
