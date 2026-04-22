import { useState } from 'react';
import { 
  Building2, Search, Loader2, CheckCircle2, ShieldCheck, 
  Sparkles, Landmark, Users2 
} from 'lucide-react';
import { useEnrichedCnpj } from '../../../hooks/useEnrichedCnpj';
import { type Client } from '../../../types';

export function ClientRegistrationModal({ open, onClose }: { open: boolean, onClose: () => void }) {
  const { enrich, loading } = useEnrichedCnpj();
  const [cnpjInput, setCnpjInput] = useState('');
  const [formData, setFormData] = useState<Partial<Client>>({});
  const [scanComplete, setScanComplete] = useState(false);

  const handleCnpjSearch = async () => {
    if (cnpjInput.length < 14) return;
    
    const enrichedData = await enrich(cnpjInput);
    if (enrichedData) {
      setFormData(enrichedData);
      setScanComplete(true);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="glass-panel w-full max-w-2xl rounded-3xl border border-white/40 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header com Efeito Scanner */}
        <div className="relative p-8 bg-gradient-to-br from-indigo-600/10 to-purple-600/10 border-b border-white/20">
          {loading && (
            <div className="absolute inset-0 overflow-hidden">
              <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12 animate-scanner" />
            </div>
          )}
          
          <div className="flex items-center justify-between relative z-10">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="text-indigo-600 w-6 h-6" />
                Cadastro 360º
              </h2>
              <p className="text-slate-500 text-sm mt-1">Mineração de dados institucionais via CNPJ</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-full transition-colors">
              <Search className="rotate-45 text-slate-400" />
            </button>
          </div>

          <div className="mt-6 flex gap-2">
            <div className="relative flex-1">
              <input 
                value={cnpjInput}
                onChange={(e) => setCnpjInput(e.target.value)}
                placeholder="00.000.000/0000-00"
                className="w-full bg-white/60 border border-white/40 rounded-2xl px-5 py-4 text-lg font-mono focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
              />
              {scanComplete && <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 w-6 h-6" />}
            </div>
            <button 
              onClick={handleCnpjSearch}
              disabled={loading}
              className="bg-indigo-600 text-white px-8 rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Scannear"}
            </button>
          </div>
        </div>

        {/* Corpo do Dossiê */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {scanComplete ? (
            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
              {/* Score de Elegibilidade Diamond */}
              <div className="glass-panel bg-emerald-50/50 border-emerald-100 p-4 rounded-2xl mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                    <ShieldCheck />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-700 uppercase tracking-tighter">Score de Elegibilidade</p>
                    <p className="text-[11px] text-emerald-600 font-medium">Apta para Leis de Incentivo (Lucro Real)</p>
                  </div>
                </div>
                <span className="text-2xl font-black text-emerald-600">{(formData.metadata as any)?.eligibilityScore}%</span>
              </div>

              {/* Grid de Dados Minerados */}
              <div className="grid grid-cols-2 gap-4">
                <DataField label="Razão Social" value={formData.razaoSocial} icon={Building2} />
                <DataField label="Capital Social" value={`R$ ${formData.capitalSocial?.toLocaleString('pt-BR')}`} icon={Landmark} />
                <DataField label="Data Abertura" value={formData.dataAbertura} icon={Search} />
                <DataField label="Setor" value={formData.sector} icon={Sparkles} />
              </div>

              <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-3 flex items-center gap-2 tracking-widest">
                  <Users2 size={12} /> Quadro Societário (QSA)
                </h4>
                <div className="space-y-2">
                   <div className="flex justify-between text-sm py-2 border-b border-slate-100">
                     <span className="font-medium text-slate-700 italic">Sócio Administrador</span>
                     <span className="text-slate-400 font-mono text-xs">***.452.188-**</span>
                   </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-white/60 rounded-3xl">
              <Building2 size={48} className="mb-4 opacity-10" />
              <p className="text-xs font-bold uppercase tracking-widest text-slate-300">Aguardando CNPJ para mineração</p>
            </div>
          )}
        </div>

        {/* Footer Ações */}
        <div className="p-6 border-t border-white/20 bg-white/20 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-3 rounded-xl font-semibold text-slate-600 hover:bg-white/40 transition-all">
            Cancelar
          </button>
          <button 
            disabled={!scanComplete}
            className="bg-slate-900 text-white px-10 py-3 rounded-xl font-bold shadow-xl shadow-slate-200 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30"
          >
            Salvar Dossiê
          </button>
        </div>
      </div>
    </div>
  );
}

function DataField({ label, value, icon: Icon }: any) {
  return (
    <div className="p-4 rounded-2xl bg-white/40 border border-white/60">
      <div className="flex items-center gap-2 mb-1 text-slate-400">
        <Icon size={12} />
        <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-sm font-bold text-slate-800 truncate">{value || '---'}</p>
    </div>
  );
}
