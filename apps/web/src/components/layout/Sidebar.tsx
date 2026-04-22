import {
  BarChart3, FolderOpen, Building2, Calendar, ShieldCheck, CheckCircle2, Plus
} from 'lucide-react';

export type ViewId = 'dashboard' | 'projects' | 'clients' | 'calendar' | 'audit' | 'compliance';

interface SidebarProps {
  currentView: ViewId;
  onViewChange: (view: ViewId) => void;
  onNewClient: () => void;
}

const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'projects', label: 'Projetos', icon: FolderOpen },
  { id: 'clients', label: 'Clientes', icon: Building2 },
  { id: 'calendar', label: 'Calendário', icon: Calendar },
  { id: 'audit', label: 'Auditoria', icon: ShieldCheck },
  { id: 'compliance', label: 'Compliance', icon: CheckCircle2 },
] as const;

export function Sidebar({ currentView, onViewChange, onNewClient }: SidebarProps) {
  return (
    <aside className="w-60 shrink-0 glass-sidebar rounded-[32px] p-3 sticky top-[76px] h-[calc(100vh-88px)] overflow-y-auto">
      <nav className="space-y-1">
        {MENU_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id as ViewId)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
              currentView === item.id ? 'glass-active text-indigo-700 font-medium' : 'text-slate-700 hover:bg-white/40'
            }`}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </button>
        ))}
      </nav>
      
      <div className="mt-6 pt-6 border-t border-slate-200">
        <button
          onClick={onNewClient}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          Novo Cliente
        </button>
      </div>
    </aside>
  );
}
