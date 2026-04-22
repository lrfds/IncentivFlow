import React from 'react';
import { Check } from 'lucide-react';
import { Card } from '../../components/ui/Card';

export function ComplianceView() {
  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold">Compliance Institucional</h2>
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { title: 'Documentação Jurídica', score: 85, items: ['Estatuto', 'Ata', 'CNPJ'] },
          { title: 'Certidões', score: 60, items: ['Federal', 'FGTS', 'Trabalhista'] },
          { title: 'Transparência', score: 90, items: ['Site', 'Portal', 'Prestação'] },
        ].map((cat, i) => (
          <Card key={i} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-sm">{cat.title}</h3>
              <span className={`text-lg font-bold ${cat.score >= 80 ? 'text-emerald-600' : cat.score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                {cat.score}%
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mb-3">
              <div className={`h-1.5 rounded-full ${cat.score >= 80 ? 'bg-emerald-500' : cat.score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${cat.score}%` }} />
            </div>
            <div className="space-y-1">
              {cat.items.map(item => (
                <div key={item} className="flex items-center gap-2 text-xs">
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-slate-600">{item}</span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
