import { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './views/Dashboard';
import { ProjectsView } from './views/Projects';
import { ClientsView } from './views/Clients';
import { AuditView } from './views/Audit';
import { CalendarView } from './views/Calendar';
import { OnboardingTour } from './features/onboarding/OnboardingTour';
import { GuestView } from './views/GuestView';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderView = () => {
    // Rota de Convidado (Simulada via URL)
    if (window.location.pathname.startsWith('/guest')) {
      return <GuestView />;
    }

    switch (activeTab) {
      case 'dashboard': return <DashboardView />;
      case 'projects': return <ProjectsView />;
      case 'clients': return <ClientsView />;
      case 'calendar': return <CalendarView />;
      case 'audit': return <AuditView />;
      default: return <DashboardView />;
    }
  };

  const isGuest = window.location.pathname.startsWith('/guest');

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {!isGuest && <OnboardingTour />}
      {!isGuest && <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />}

      <main className={`flex-1 ${!isGuest ? 'ml-64' : ''} p-8 transition-all duration-500`}>
        {!isGuest && (
          <header className="flex justify-between items-center mb-8 max-w-6xl mx-auto">
            <div>
              <h1 className="text-3xl font-black text-slate-900 capitalize tracking-tight">
                {activeTab.replace('-', ' ')}
              </h1>
              <p className="text-slate-500 text-sm mt-1">Gestão inteligente de incentivos fiscais</p>
            </div>

            <div className="flex items-center gap-4">
               <div className="glass-panel px-4 py-2 rounded-xl text-[10px] font-black text-indigo-600 border border-indigo-100 shadow-sm uppercase tracking-[0.2em]">
                 v2.5-DIAMOND
               </div>
               <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Staff" alt="Profile" />
               </div>
            </div>
          </header>
        )}

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          {renderView()}
        </div>
      </main>
    </div>
  );
}