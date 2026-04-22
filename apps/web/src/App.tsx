import { useState, useMemo } from 'react';
import { AuthProvider, useAuth } from './providers/AuthProvider';
import { LoginView } from './views/LoginView';
import type { Phase, Project, AuditEntry, Client, ClientDraftInput } from './types';
import { getNextPhase, formatCurrency } from './types';
import { ClientRegistrationModal } from './components/ClientRegistrationModal';
import { ClientFormSchema } from './features/cnpj/schemas';
import { t } from './i18n';

// Hooks
import { useProjects } from './hooks/useProjects';
import { useProjectMutations } from './hooks/useProjectMutations';

// UI
import { Toast } from './components/ui/Toast';

// Layout
import { AppLayout } from './components/layout/AppLayout';
import type { ViewId } from './components/layout/Sidebar';
import { EventExplorer } from './components/EventExplorer';

// Views & Modals
import { DashboardView } from './features/dashboard/DashboardView';
import { ProjectsView } from './features/projects/ProjectsView';
import { ClientsView } from './features/clients/ClientsView';
import { CalendarView } from './features/calendar/CalendarView';
import { AuditView } from './features/audit/AuditView';
import { ComplianceView } from './features/compliance/ComplianceView';
import { ProjectDetailModal } from './features/projects/ProjectDetailModal';
import { NewProjectModal } from './features/projects/NewProjectModal';

function AuthenticatedApp() {
  // Temporary empty states for compilation compatibility until their own hooks are created
  const clients: Client[] = [];
  const auditLog: AuditEntry[] = [];
  
  const { data: projectsRaw, isLoading } = useProjects();
  const { createProject, advancePhase } = useProjectMutations();
  
  const projects = projectsRaw?.data || projectsRaw || [];
  
  const [view, setView] = useState<ViewId>('dashboard');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [search, setSearch] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => setToast({ message, type });

  const handleAddClient = async (data: ClientDraftInput) => {
    const validation = ClientFormSchema.safeParse(data);
    if (!validation.success) {
      showToast(validation.error.issues[0]?.message || 'Dados inválidos', 'error');
      return;
    }
    showToast('A criação de clientes será conectada à API em breve.', 'info');
    setShowNewClient(false);
  };

  const handleAddProject = (data: Partial<Project>) => {
    createProject.mutate({
      name: data.name || '',
      description: data.description,
      clientId: data.clientId || '',
      law: (data.law as any) || 'ROUANET',
      sector: (data.sector as any) || 'CULTURA',
    }, {
      onSuccess: () => {
        showToast(`Projeto "${data.name}" criado com sucesso!`);
        setShowNewProject(false);
      },
      onError: (err: any) => {
        showToast(`Falha a criar projeto: ${err.message}`, 'error');
      }
    });
  };

  const handleAdvancePhase = (projectId: string) => {
    const project = projects.find((p: Project) => p.id === projectId);
    if (!project) return;
    const next = getNextPhase(project.phase);
    if (!next) return;

    if (next === 'APROVACAO_CLIENTE' && project.documents.length === 0) {
      showToast('Adicione pelo menos 1 documento antes de avançar', 'error');
      return;
    }
    
    advancePhase.mutate({ 
      id: projectId, 
      data: { phase: next, note: 'Avançado via Dashboard' } 
    }, {
      onSuccess: () => {
        showToast(`Fase avançada para ${t(`phase.${next}`)}`);
        // Atualiza a view selecionada para refletir melhor visualmente até o server request finalizar
        if (selectedProject?.id === projectId) {
          setSelectedProject({ ...project, phase: next });
        }
      },
      onError: (err: any) => showToast(`Erro ao avançar: ${err.message}`, 'error')
    });
  };

  const handleAddDocument = (projectId: string, name: string, type: string) => {
    showToast('Ação de upload migrando para a API.', 'info');
  };

  const handleAddFunding = (projectId: string, amount: number, sponsor: string) => {
    showToast('Ação de captação migrando para a API.', 'info');
  };

  const notifications = useMemo(() => {
    const items = [];
    const noDocs = projects.filter((p: Project) => p.phase === 'ELABORACAO' && p.documents?.length === 0);
    if (noDocs.length > 0) items.push({ id: '1', title: `${noDocs.length} projetos sem documentos`, projectId: noDocs[0].id });
    const urgent = projects.filter((p: Project) => {
      const days = (new Date(p.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return days >= 0 && days <= 7 && p.phase !== 'CONCLUIDO';
    });
    if (urgent.length > 0) items.push({ id: '2', title: `${urgent.length} prazos vencendo`, projectId: urgent[0].id });
    return items;
  }, [projects]);

  return (
    <AppLayout
      view={view}
      onViewChange={setView}
      search={search}
      onSearchChange={setSearch}
      notifications={notifications}
      showNotifications={showNotifications}
      onToggleNotifications={() => setShowNotifications(!showNotifications)}
      onNotificationClick={(id) => { setSelectedProject(projects.find((p: Project) => p.id === id) || null); setView('projects'); setShowNotifications(false); }}
      onNewClient={() => setShowNewClient(true)}
      projects={projects}
    >
      {view === 'dashboard' && <DashboardView projects={projects} onNewClient={() => setShowNewClient(true)} onNewProject={() => setShowNewProject(true)} onSelectProject={setSelectedProject} onViewChange={setView} />}
      {view === 'projects' && <ProjectsView projects={projects} search={search} onNewProject={() => setShowNewProject(true)} onSelectProject={setSelectedProject} />}
      {view === 'clients' && <ClientsView clients={clients} projects={projects} onNewClient={() => setShowNewClient(true)} />}
      {view === 'calendar' && <CalendarView projects={projects} />}
      {view === 'audit' && <AuditView auditLog={auditLog} />}
      {view === 'compliance' && <ComplianceView />}

      <ProjectDetailModal project={selectedProject} onClose={() => setSelectedProject(null)} onAdvancePhase={handleAdvancePhase} onAddDocument={handleAddDocument} onAddFunding={handleAddFunding} />
      <NewProjectModal open={showNewProject} onClose={() => setShowNewProject(false)} onSave={handleAddProject} clients={clients} />
      <ClientRegistrationModal open={showNewClient} onClose={() => setShowNewClient(false)} onSave={handleAddClient} onToast={showToast} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <EventExplorer />
    </AppLayout>
  );
}

function AppContent() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <LoginView />;
  return <AuthenticatedApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}