import React from 'react';
import { ArrowRight, Check, FileText, Upload } from 'lucide-react';
import type { Project } from '../../types';
import { PHASES, PHASE_INDEX, getNextPhase, formatCurrency, formatDate } from '../../types';
import { Modal } from '../../components/ui/Modal';
import { t } from '../../i18n';

interface ProjectDetailModalProps {
  project: Project | null;
  onClose: () => void;
  onAdvancePhase: (id: string) => void;
  onAddDocument: (id: string, name: string, type: string) => void;
  onAddFunding: (id: string, amount: number, sponsor: string) => void;
}

export function ProjectDetailModal({ project, onClose, onAdvancePhase, onAddDocument, onAddFunding }: ProjectDetailModalProps) {
  return (
    <Modal open={!!project} onClose={onClose} title={project?.name || ''}>
      {project && (
        <div className="p-6 space-y-5">
          {/* Phase Stepper */}
          <div>
            <div className="flex items-center justify-between mb-3">
              {PHASES.map((phase, idx) => {
                const current = PHASE_INDEX[project.phase];
                const isDone = idx < current;
                const isCurrent = idx === current;
                
                return (
                  <div key={phase} className="flex items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                      isDone ? 'bg-emerald-500 border-emerald-500 text-white' :
                      isCurrent ? 'bg-indigo-600 border-indigo-600 text-white' :
                      'bg-white border-slate-300 text-slate-400'
                    }`}>
                      {isDone ? <Check className="w-4 h-4" /> : idx + 1}
                    </div>
                    {idx < PHASES.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-2 ${isDone ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between">
              {PHASES.map(p => (
                <span key={p} className="text-[10px] text-slate-500 w-16 text-center">{t(`phase.${p}`).split(' ')[0]}</span>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl">
            <div>
              <p className="text-xs text-slate-500">Cliente</p>
              <p className="text-sm font-medium">{project.clientName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Lei</p>
              <p className="text-sm font-medium">{project.law}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Prazo</p>
              <p className="text-sm font-medium">{formatDate(project.deadline)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Valor</p>
              <p className="text-sm font-medium font-mono">{formatCurrency(project.financial.approved || project.financial.requested)}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {getNextPhase(project.phase) && (
              <button
                onClick={() => onAdvancePhase(project.id)}
                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 flex items-center justify-center gap-2"
              >
                Avançar para {t(`phase.${getNextPhase(project.phase)!}`)}
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Documents */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold">Documentos ({project.documents.length})</h4>
              <button
                onClick={() => {
                  const name = prompt('Nome do arquivo:');
                  if (name) onAddDocument(project.id, name, 'PROPOSTA');
                }}
                className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
              >
                <Upload className="w-3 h-3" /> Adicionar
              </button>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {project.documents.map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span className="text-xs">{doc.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">{doc.size}</span>
                </div>
              ))}
              {project.documents.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-4">Nenhum documento</p>
              )}
            </div>
          </div>

          {/* Funding */}
          {project.phase === 'POS_APROVACAO' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold">Captação</h4>
                <button
                  onClick={() => {
                    const val = prompt('Valor captado (R$):');
                    const sponsor = prompt('Patrocinador:');
                    if (val && sponsor) onAddFunding(project.id, parseFloat(val), sponsor);
                  }}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  + Registrar
                </button>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl">
                <div className="flex justify-between text-xs mb-1">
                  <span>Captado</span>
                  <span className="font-mono font-medium">{formatCurrency(project.financial.captured)} / {formatCurrency(project.financial.approved)}</span>
                </div>
                <div className="w-full bg-white rounded-full h-2">
                  <div 
                    className="bg-emerald-500 h-2 rounded-full transition-all"
                    style={{ width: `${project.financial.approved > 0 ? Math.min(100, (project.financial.captured / project.financial.approved) * 100) : 0}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
