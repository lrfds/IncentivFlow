import React from 'react';
import { X } from 'lucide-react';

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-2xl" onClick={onClose} />
      <div className="relative glass-panel rounded-[28px] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/20">
          <h3 className="text-base font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-white/40 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
