import { useState } from 'react';

interface PhaseRequirements {
  [key: string]: string[];
}

const LAW_REQUIREMENTS: PhaseRequirements = {
  'LEI ROUANET': ['Certidões Negativas', 'Ata de Constituição', 'Orçamento Detalhado', 'Currículo dos Artistas'],
  'LEI DO BEM': ['DRE do Exercício Anterior', 'Relatório de P&D', 'Certidões Federais'],
  'ESPORTE': ['Certidões Negativas', 'Estatuto Social', 'Plano de Trabalho'],
};

export function usePhaseEngine() {
  const [isValidating, setIsValidating] = useState(false);

  const validateSubmission = async (lawType: string, documents: string[]) => {
    setIsValidating(true);
    
    // Simula validação via Auditoria (Hash Check)
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    const requirements = LAW_REQUIREMENTS[lawType] || [];
    const missingDocs = requirements.filter(doc => !documents.includes(doc));

    setIsValidating(false);
    
    return {
      canSubmit: missingDocs.length === 0,
      missingDocs,
      verificationHash: `sha256:verified_${Math.random().toString(36).substring(7)}`
    };
  };

  return { validateSubmission, isValidating };
}
