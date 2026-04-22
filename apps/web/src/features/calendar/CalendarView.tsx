import React from 'react';
import type { Project } from '../../types';
import { daysUntil, formatDate } from '../../types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

interface CalendarViewProps {
  projects: Project[];
}

export function CalendarView({ projects }: CalendarViewProps) {
  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold">Calendário de Prazos</h2>
      <div className="grid gap-4">
        {projects
          .filter(p => p.phase !== 'CONCLUIDO')
          .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
          .map(p => {
            const days = daysUntil(p.deadline);
            const urgent = days <= 7 && days >= 0;
            const overdue = days < 0;
            
            return (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{p.name}</h3>
                      {urgent && <Badge variant="warning">Urgente</Badge>}
                      {overdue && <Badge variant="error">Atrasado</Badge>}
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{p.clientName} • {p.law}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${overdue ? 'text-red-600' : urgent ? 'text-amber-600' : 'text-slate-900'}`}>
                      {formatDate(p.deadline)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {overdue ? `${Math.abs(days)} dias atraso` : days === 0 ? 'Hoje' : `${days} dias`}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
      </div>
    </div>
  );
}
