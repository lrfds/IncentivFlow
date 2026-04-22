import React from 'react';
import { Hash } from 'lucide-react';
import type { AuditEntry } from '../../types';
import { formatDateTime } from '../../types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

interface AuditViewProps {
  auditLog: AuditEntry[];
}

export function AuditView({ auditLog }: AuditViewProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Auditoria</h2>
        <Badge variant="success">Chain íntegra</Badge>
      </div>
      <Card className="p-6">
        <div className="space-y-3">
          {auditLog.slice(0, 20).map(entry => (
            <div key={entry.id} className="flex gap-3 pb-3 border-b border-slate-100 last:border-0">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Hash className="w-3.5 h-3.5 text-slate-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-sm font-medium">{entry.action.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-slate-500">{entry.entity}</span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-500">{formatDateTime(entry.timestamp)}</span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">{entry.detail}</p>
                <p className="text-[10px] font-mono text-slate-400 mt-1">#{entry.hash.slice(0, 8)}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
