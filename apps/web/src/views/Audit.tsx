import React, { useState, useEffect } from 'react';
import { ShieldCheck, RefreshCcw, Lock, Activity } from 'lucide-react';
import { AuditTimeline } from '../features/audit/components/AuditTimeline';
import { AuditWarRoom } from '../features/audit/components/AuditWarRoom';
import { ComplianceDashboard } from '../features/audit/components/ComplianceDashboard';
import { api } from '../lib/api';
import { checkUpcomingDeadlines } from '../features/submissions/services/automation';

export function AuditView() {
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [atRiskDeadlines, setAtRiskDeadlines] = useState<any[]>([]);

  // Simulação de cálculo de risco para o Dashboard
  useEffect(() => {
    setAtRiskDeadlines([
      { id: '1', clientName: 'Inova Corp S.A.', documentType: 'Certidão Negativa (CND)', daysRemaining: 12, estimatedValue: 125000, status: 'CRITICAL' },
      { id: '2', clientName: 'BioTech Soluções', documentType: 'Prazo de Captação', daysRemaining: 45, estimatedValue: 310000, status: 'WARNING' },
      { id: '3', clientName: 'EducaMais Ltda', documentType: 'Certidão FGTS', daysRemaining: 5, estimatedValue: 45000, status: 'URGENT' }
    ]);
  }, []);

  const handleComplianceCheck = async () => {
    setIsChecking(true);
    try {
      const clientsResponse = await api.get('/api/clients');
      const submissionsResponse = await api.get('/api/submissions');
      await checkUpcomingDeadlines(clientsResponse.data, submissionsResponse.data);
      alert("✅ Varredura de conformidade concluída. Alertas de 60 dias disparados!");
    } catch (e) {
      console.error(e);
      alert("⚠️ Erro ao executar varredura. Verifique os logs.");
    } finally {
      setIsChecking(false);
    }
  };

  const fetchAuditEvents = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/api/audit/events');
      setEvents(response.data);
    } catch (error) {
      console.error('Falha ao buscar auditoria:', error);
      setEvents([
        {
          id: '1',
          type: 'SYSTEM_BOOT',
          hash: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          prevHash: '0000',
          createdAt: new Date().toISOString(),
          payload: { version: '2.5-DIAMOND' }
        },
        {
          id: '2',
          type: 'BLOCK_MINED',
          hash: 'sha256:a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
          prevHash: 'sha256:e3b0c442',
          createdAt: new Date().toISOString(),
          payload: { action: 'INITIAL_SYNC' }
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditEvents();
  }, []);

  return (
    <div className="space-y-12 max-w-6xl mx-auto pb-24">
      {/* 1. Global War Room (Integrity Dashboard) */}
      <section className="animate-in fade-in slide-in-from-top-6 duration-1000">
        <div className="flex justify-between items-center mb-8">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                <Lock size={18} />
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-widest uppercase">Security Operation Center</h2>
           </div>
           <div className="flex gap-3">
             <button 
              onClick={handleComplianceCheck}
              disabled={isChecking}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all active:scale-95 disabled:opacity-50"
             >
               <ShieldCheck size={16} />
               <span className="text-[10px] font-black uppercase tracking-widest">
                 {isChecking ? 'Scanning...' : 'Compliance Check'}
               </span>
             </button>
             <button 
              onClick={fetchAuditEvents}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all active:scale-95 group"
             >
               <RefreshCcw size={16} className="group-active:rotate-180 transition-transform duration-500" />
               <span className="text-[10px] font-black uppercase tracking-widest">Resync Chain</span>
             </button>
           </div>
        </div>
        
        <AuditWarRoom healthData={{
          totalBlocks: events.length,
          recentEvents: events.slice(0, 10)
        }} />
      </section>

      {/* 2. The Red Zone: Compliance & Financial Risk */}
      <section className="animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150">
        <ComplianceDashboard upcomingDeadlines={atRiskDeadlines} />
      </section>

      {/* 3. Audit Timeline Detail */}
      <section className="animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-300">
        <div className="flex items-center gap-4 mb-10">
           <div className="h-px flex-1 bg-slate-200" />
           <div className="flex items-center gap-2 text-slate-400">
              <Activity size={14} />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Ledger Detail View</span>
           </div>
           <div className="h-px flex-1 bg-slate-200" />
        </div>
        
        {isLoading ? (
          <div className="flex justify-center p-24">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="glass-panel p-10 rounded-[3rem] border border-white/40 shadow-xl">
            <AuditTimeline events={events} />
          </div>
        )}
      </section>
    </div>
  );
}
