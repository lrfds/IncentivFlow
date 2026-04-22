import { FileText, Search, Bell } from 'lucide-react';
import type { Project } from '../../types';

interface HeaderProps {
  search: string;
  onSearchChange: (val: string) => void;
  notifications: any[];
  showNotifications: boolean;
  onToggleNotifications: () => void;
  onNotificationClick: (projectId: string) => void;
}

export function Header({
  search, onSearchChange, notifications, showNotifications, onToggleNotifications, onNotificationClick
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 glass-header">
      <div className="px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-none">IncentivFlow</h1>
            <p className="text-[10px] text-slate-500">v2.1 • Premium</p>
          </div>
        </div>
        
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="Buscar projetos..."
              className="w-full pl-9 pr-3 py-2 bg-white/60 backdrop-blur-md border border-white/30 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white/80 transition-all"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={onToggleNotifications}
            className="relative p-2 hover:bg-slate-100 rounded-xl"
          >
            <Bell className="w-4 h-4 text-slate-600" />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>
          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">LC</div>
        </div>
      </div>
      
      {/* Notifications Dropdown */}
      {showNotifications && (
        <div className="absolute right-6 top-14 w-80 glass-panel rounded-[20px] p-3 z-50">
          <p className="text-xs font-semibold px-2 pb-2">Notificações</p>
          {notifications.length === 0 ? (
            <p className="text-xs text-slate-500 px-2 py-3">Nenhuma notificação</p>
          ) : notifications.map(n => (
            <button
              key={n.id}
              onClick={() => onNotificationClick(n.projectId)}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xl"
            >
              <p className="text-xs font-medium">{n.title}</p>
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
