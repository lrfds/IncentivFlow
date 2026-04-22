import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, Bell, Plus, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

export function CalendarView() {
  const [appointments] = useState([
    {
      id: '1',
      title: 'Diligência Técnica - Projeto Solar',
      time: '14:00',
      date: '2024-04-25',
      type: 'DEADLINE',
      client: 'TecnoGlobal S.A.'
    },
    {
      id: '2',
      title: 'Assinatura de Contrato',
      time: '10:30',
      date: '2024-04-26',
      type: 'MEETING',
      client: 'Instituto Arte Viva'
    }
  ]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Agenda Inteligente</h2>
          <p className="text-slate-500 text-sm mt-1">Sincronizada com o Outbox para notificações automáticas.</p>
        </div>
        <button className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95">
          <Plus size={20} /> Novo Compromisso
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Visual Calendar Placeholder (Diamond Style) */}
        <div className="lg:col-span-1 glass-panel p-6 rounded-[32px] border border-white/40 bg-white/40">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800">Abril 2024</h3>
            <div className="flex gap-2">
              <button className="p-2 hover:bg-white rounded-xl transition-colors"><ChevronLeft size={16} /></button>
              <button className="p-2 hover:bg-white rounded-xl transition-colors"><ChevronRight size={16} /></button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-black text-slate-400 uppercase mb-4">
            <span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sab</span>
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className={`aspect-square flex items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                i + 1 === 22 ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-white/60 text-slate-600'
              }`}>
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Próximos Eventos & Notificações */}
        <div className="lg:col-span-2 space-y-6">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Bell size={14} className="text-indigo-500" /> Próximas Notificações Automáticas
          </h4>
          
          <div className="space-y-4">
            {appointments.map((app) => (
              <div key={app.id} className="glass-panel p-5 rounded-3xl border border-white/40 bg-white/30 flex items-center justify-between group hover:bg-white/50 transition-all">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    app.type === 'DEADLINE' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'
                  }`}>
                    {app.type === 'DEADLINE' ? <AlertCircle size={24} /> : <CalendarIcon size={24} />}
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-800">{app.title}</h5>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock size={12} /> {app.date} às {app.time} • <span className="font-bold">{app.client}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                    <Bell size={10} /> OUTBOX READY
                  </div>
                  <button className="text-[10px] font-bold text-indigo-600 hover:underline">Ver Detalhes</button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 rounded-[32px] bg-indigo-600 text-white shadow-2xl shadow-indigo-100 relative overflow-hidden group">
             <div className="relative z-10">
                <h4 className="text-lg font-bold mb-1">Dica de Produtividade</h4>
                <p className="text-xs text-indigo-100 opacity-80 leading-relaxed">
                  Compromissos do tipo <strong>DEADLINE</strong> disparam e-mails para o consultor e para o cliente com 48h de antecedência automaticamente.
                </p>
             </div>
             <CalendarIcon size={80} className="absolute -right-4 -bottom-4 text-white/10 group-hover:scale-110 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
}
