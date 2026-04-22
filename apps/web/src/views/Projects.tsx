import React from 'react';
import { SubmissionTracker } from '../features/submissions/components/SubmissionTracker';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Plus } from 'lucide-react';

export function ProjectsView() {
  // Integrando com o backend real (Projetos em Elaboração)
  const { data: submissions = [] } = useQuery({
    queryKey: ['submissions'],
    queryFn: () => api.get('/api/projects').then(res => res.data),
    initialData: []
  });

  return (
    <div className="space-y-10">
      {/* Operação Ativa */}
      <SubmissionTracker submissions={submissions} />

      {/* Seção de Novos Projetos */}
      <div className="glass-panel p-10 rounded-[40px] text-center border-2 border-dashed border-white/60 bg-white/10">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
           <Plus size={32} className="text-slate-300" />
        </div>
        <h3 className="text-xl font-bold text-slate-400">Novo Projeto em Elaboração</h3>
        <p className="text-slate-400 text-sm mt-2 max-w-sm mx-auto">
          Inicie a estrutura documental para enquadramento em leis de incentivo federal.
        </p>
        <button className="mt-8 px-8 py-3 bg-white border border-slate-200 rounded-2xl text-slate-600 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm">
          Começar Elaboração
        </button>
      </div>
    </div>
  );
}
