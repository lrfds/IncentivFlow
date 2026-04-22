import { useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';

export function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  
  const colors = {
    success: 'bg-emerald-600',
    error: 'bg-red-600',
    info: 'bg-slate-800',
  }[type];
  
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-2">
      <div className={`${colors} text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 min-w-[300px]`}>
        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm font-medium flex-1">{message}</span>
        <button onClick={onClose} className="hover:opacity-70"><X className="w-4 h-4" /></button>
      </div>
    </div>
  );
}
