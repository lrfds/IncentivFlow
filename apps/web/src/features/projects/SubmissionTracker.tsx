import React, { useState } from 'react';
import { Send, CheckCircle2, Building2, Clock, Shield } from 'lucide-react';

interface Submission {
  id: string;
  projectName: string;
  companyName: string;
  date: string;
  status: 'SENT' | 'ACCEPTED' | 'REJECTED';
  hash: string;
}

export function SubmissionTracker() {
  const [submissions] = useState<Submission[]>([
    { 
      id: '1', 
      projectName: 'Projeto Solar 2024', 
      companyName: 'Vale S.A.', 
      date: '2024-04-22', 
      status: 'SENT',
      hash: 'sha256:7a8b9c...' 
    },
    { 
      id: '2', 
      projectName: 'Cultura Viva', 
      companyName: 'Petrobras', 
      date: '2024-04-20', 
      status: 'ACCEPTED',
      hash: 'sha256:1d2e3f...' 
    },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Tracker de Envios</h2>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
          <Send className="w-4 h-4" /> Novo Registro de Envio
        </button>
      </div>

      <div className="grid gap-4">
        {submissions.map((sub) => (
          <div key={sub.id} className="glass-panel p-5 border border-white/40 flex items-center justify-between hover:scale-[1.01] transition-transform duration-300">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${sub.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800">{sub.companyName}</h4>
                <p className="text-sm text-slate-500">{sub.projectName}</p>
              </div>
            </div>

            <div className="flex items-center gap-8">
              <div className="text-right">
                <div className="flex items-center gap-1 text-slate-400 text-xs mb-1">
                  <Clock className="w-3 h-3" />
                  <span>Enviado em {sub.date}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono text-indigo-400">
                  <Shield className="w-3 h-3" />
                  <span>{sub.hash}</span>
                </div>
              </div>

              <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                sub.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {sub.status === 'SENT' ? 'AGUARDANDO' : 'ACEITO'}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-indigo-500 mt-1" />
        <div>
          <h5 className="font-bold text-indigo-900 text-sm">Automação de Notificação Ativa</h5>
          <p className="text-xs text-indigo-700">Cada registro acima dispara automaticamente um e-mail de atualização para o cliente via Outbox Pattern.</p>
        </div>
      </div>
    </div>
  );
}
