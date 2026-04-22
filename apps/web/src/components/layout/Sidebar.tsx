import React from 'react';
import { 
  LayoutDashboard, FolderKanban, Users2, 
  Calendar as CalendarIcon, Activity,
  Send
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const { canAccess } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
    { id: 'projects', label: 'Projetos', icon: FolderKanban },
    { id: 'clients', label: 'Clientes', icon: Users2, className: 'sidebar-clients' },
    { id: 'tracker', label: 'Tracker de Envios', icon: Send },
    { id: 'calendar', label: 'Agenda', icon: CalendarIcon },
    { id: 'audit', label: 'Auditoria Imutável', icon: Activity },
  ];

  const filteredItems = menuItems.filter(item => canAccess(item.id));

  return (
    <aside className="fixed left-0 top-0 h-full w-64 glass-panel border-r border-white/20 z-50 flex flex-col p-6">
      <div className="flex items-center gap-3 px-2 mb-10">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
          <Activity className="text-white w-6 h-6" />
        </div>
        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
          IncentivFlow
        </span>
      </div>

      <nav className="flex-1 space-y-1">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 ${item.className || ''} ${
              activeTab === item.id 
                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-[1.02]' 
                : 'text-slate-500 hover:bg-white/60 hover:text-slate-900'
            }`}
          >
            <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-white' : 'text-slate-400'}`} />
            <span className="font-semibold text-sm">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="pt-6 border-t border-white/10">
        <div className="px-4 py-3 rounded-2xl bg-indigo-50/50 mb-4">
          <p className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Status do Worker</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-slate-600">Outbox Conectado</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
