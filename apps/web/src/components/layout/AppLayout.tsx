import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { Header } from './Header';
import { Sidebar, ViewId } from './Sidebar';
import type { Project } from '../../types';

export interface AppLayoutProps {
  children: React.ReactNode;
  view: ViewId;
  onViewChange: (v: ViewId) => void;
  search: string;
  onSearchChange: (s: string) => void;
  notifications: { id: string; title: string; projectId: string }[];
  showNotifications: boolean;
  onToggleNotifications: () => void;
  onNotificationClick: (id: string) => void;
  onNewClient: () => void;
  projects: Project[];
}

export function AppLayout({
  children,
  view,
  onViewChange,
  search,
  onSearchChange,
  notifications,
  showNotifications,
  onToggleNotifications,
  onNotificationClick,
  onNewClient,
  projects
}: AppLayoutProps) {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <>
      <style>{`
        /* Liquid Glass System - visionOS */
        .liquid-bg {
          background: 
            radial-gradient(at 0% 0%, hsla(212, 100%, 92%, 1) 0px, transparent 50%),
            radial-gradient(at 18% 25%, hsla(220, 100%, 88%, 1) 0px, transparent 50%),
            radial-gradient(at 50% 0%, hsla(225, 100%, 85%, 0.8) 0px, transparent 50%),
            radial-gradient(at 80% 15%, hsla(240, 100%, 90%, 1) 0px, transparent 50%),
            radial-gradient(at 100% 0%, hsla(200, 100%, 88%, 0.9) 0px, transparent 50%),
            radial-gradient(at 0% 100%, hsla(195, 100%, 92%, 1) 0px, transparent 50%),
            radial-gradient(at 50% 100%, hsla(210, 100%, 90%, 1) 0px, transparent 50%),
            radial-gradient(at 100% 100%, hsla(230, 100%, 87%, 0.8) 0px, transparent 50%),
            linear-gradient(180deg, #f8faff 0%, #f0f5ff 100%);
          background-attachment: fixed;
          animation: meshMove 20s ease-in-out infinite alternate;
        }
        
        @keyframes meshMove {
          0% { filter: hue-rotate(0deg) brightness(1); }
          100% { filter: hue-rotate(10deg) brightness(1.02); }
        }
        
        .glass-panel {
          background: rgba(255, 255, 255, 0.45) !important;
          backdrop-filter: blur(25px) saturate(180%) !important;
          -webkit-backdrop-filter: blur(25px) saturate(180%) !important;
          border: 1px solid rgba(255, 255, 255, 0.35) !important;
          box-shadow: 
            0 8px 32px 0 rgba(31, 38, 135, 0.07),
            0 1px 2px 0 rgba(255, 255, 255, 0.8) inset,
            0 0 0 1px rgba(255, 255, 255, 0.1) inset !important;
          position: relative;
        }
        
        .glass-panel::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.1) 100%);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
        
        .glass-hover:hover {
          background: rgba(255, 255, 255, 0.55) !important;
          backdrop-filter: blur(20px) saturate(200%) !important;
          -webkit-backdrop-filter: blur(20px) saturate(200%) !important;
          box-shadow: 
            0 12px 40px 0 rgba(31, 38, 135, 0.12),
            0 2px 3px 0 rgba(255, 255, 255, 0.9) inset !important;
          transform: translateY(-1px);
        }
        
        .glass-sidebar {
          background: rgba(255, 255, 255, 0.38) !important;
          backdrop-filter: blur(30px) saturate(200%) !important;
          -webkit-backdrop-filter: blur(30px) saturate(200%) !important;
          border: 1px solid rgba(255, 255, 255, 0.4) !important;
          box-shadow: 
            0 20px 50px rgba(0, 0, 0, 0.05),
            0 1px 2px rgba(255, 255, 255, 0.8) inset !important;
        }
        
        .glass-header {
          background: rgba(255, 255, 255, 0.65) !important;
          backdrop-filter: blur(20px) saturate(160%) !important;
          -webkit-backdrop-filter: blur(20px) saturate(160%) !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.3) !important;
        }
        
        .glass-active {
          background: rgba(79, 70, 229, 0.12) !important;
          backdrop-filter: blur(20px) saturate(180%) !important;
          -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
          border: 1px solid rgba(79, 70, 229, 0.2) !important;
          box-shadow: 
            0 4px 16px rgba(79, 70, 229, 0.1),
            0 1px 2px rgba(255, 255, 255, 0.8) inset !important;
        }
        
        .liquid-text {
          background: linear-gradient(180deg, #1e3a8a 0%, #3b82f6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
      `}</style>

      <div className="min-h-screen liquid-bg">
        {!isOnline && (
          <div className="bg-rose-500/90 backdrop-blur text-white text-xs py-2 px-4 text-center font-medium flex items-center justify-center gap-2 shadow-md relative z-50 animate-in slide-in-from-top-2">
            <WifiOff className="w-4 h-4" />
            Você está offline. Suas alterações serão sincronizadas assim que a conexão voltar.
          </div>
        )}
        <Header 
          search={search} onSearchChange={onSearchChange}
          notifications={notifications} showNotifications={showNotifications}
          onToggleNotifications={onToggleNotifications}
          onNotificationClick={onNotificationClick}
          projects={projects}
        />
        
        <div className="flex gap-3 p-3">
          <Sidebar 
            currentView={view} onViewChange={onViewChange}
            onNewClient={onNewClient}
          />

          <main className="flex-1 p-6 max-w-[1400px]">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
