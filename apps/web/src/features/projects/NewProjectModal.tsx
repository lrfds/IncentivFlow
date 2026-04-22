import React from 'react';
import { Modal } from '../../components/ui/Modal';
import type { Client, Project } from '../../types';

interface NewProjectModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Project>) => void;
  clients: Client[];
}

export function NewProjectModal({ open, onClose, onSave, clients }: NewProjectModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Novo Projeto">
      <form onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        onSave({
          name: fd.get('name') as string,
          description: fd.get('description') as string,
          clientId: fd.get('clientId') as string,
          law: fd.get('law') as any,
          sector: fd.get('sector') as any,
          deadline: fd.get('deadline') as string,
          financial: { requested: parseFloat(fd.get('value') as string) || 0, approved: 0, captured: 0, currency: 'BRL' },
        });
      }} className="p-6 space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Nome do Projeto</label>
          <input name="name" required className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Cliente</label>
            <select name="clientId" required className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Selecione...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Lei</label>
            <select name="law" className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="ROUANET">Lei Rouanet</option>
              <option value="AUDIOVISUAL">Audiovisual</option>
              <option value="ESPORTE">Lei de Incentivo ao Esporte</option>
              <option value="PRONON">PRONON</option>
              <option value="PRONAS">PRONAS</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Setor</label>
            <select name="sector" className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="CULTURA">Cultura</option>
              <option value="ESPORTE">Esporte</option>
              <option value="AUDIOVISUAL">Audiovisual</option>
              <option value="SAUDE">Saúde</option>
              <option value="EDUCACAO">Educação</option>
              <option value="TECNOLOGIA">Tecnologia</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Prazo</label>
            <input name="deadline" type="date" required className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Valor Solicitado (R$)</label>
          <input name="value" type="number" min="0" step="1000" className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Descrição</label>
          <textarea name="description" rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-medium hover:bg-slate-50">Cancelar</button>
          <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">Criar Projeto</button>
        </div>
      </form>
    </Modal>
  );
}
