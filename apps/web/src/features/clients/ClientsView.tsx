import React from 'react';
import { Plus } from 'lucide-react';
import type { Client, Project } from '../../types';
import { formatCnpj, formatCurrencyFull } from '../../types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { t } from '../../i18n';

interface ClientsViewProps {
  clients: Client[];
  projects: Project[];
  onNewClient: () => void;
}

export function ClientsView({ clients, projects, onNewClient }: ClientsViewProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Clientes</h2>
        <button onClick={onNewClient} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Novo Cliente
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map(client => {
          const clientProjects = projects.filter(p => p.clientId === client.id);
          const active = clientProjects.filter(p => p.phase !== 'CONCLUIDO').length;
          const total = clientProjects.reduce((s, p) => s + (p.financial.approved || p.financial.requested), 0);
          
          const eligibleLaws = client.cnpjAnalysis?.leisHabilitadas.filter(item => item.elegivel).slice(0, 3) || [];
          const readiness = client.cnpjAnalysis?.readinessScore || 0;

          return (
            <Card key={client.id} className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{client.name}</h3>
                    {client.apiValidated && <Badge variant="info">OpenCNPJ validado</Badge>}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{t(`sector.${client.sector}`)}</p>
                  {client.cnpj && <p className="text-[11px] text-slate-500 mt-1">CNPJ {formatCnpj(client.cnpj)}</p>}
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                  {client.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                </div>
              </div>

              {eligibleLaws.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {eligibleLaws.map(item => (
                    <span key={item.lei} className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200">
                      {item.tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Projetos</span>
                  <span className="font-medium">{clientProjects.length} ({active} ativos)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Pipeline</span>
                  <span className="font-mono font-medium">{formatCurrencyFull(total)}</span>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                    <span>Prontidão</span>
                    <span className="font-medium text-slate-700">{readiness}%</span>
                  </div>
                  <div className="w-full bg-white/70 rounded-full h-2 border border-white/40 overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${readiness >= 80 ? 'bg-emerald-500' : readiness >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}
                      style={{ width: `${readiness}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-1.5">
                <p className="text-xs text-slate-500">{client.contactEmail || 'E-mail não informado'}</p>
                {client.cnaePrincipal && <p className="text-[11px] text-slate-500">CNAE principal {client.cnaePrincipal.codigo}</p>}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
