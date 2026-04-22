import { useState } from 'react';
import { fetchCnpjData } from '../features/clients/services/cnpjService';
import { type Client } from '../types';

export function useEnrichedCnpj() {
  const [loading, setLoading] = useState(false);

  const enrich = async (cnpj: string): Promise<Partial<Client> | null> => {
    setLoading(true);
    try {
      const data = await fetchCnpjData(cnpj);

      // Inteligência de Negócio Diamond: Cálculo de Elegibilidade
      const aberturaDate = data.dataAbertura ? new Date(data.dataAbertura) : new Date();
      const anosAbertura = (new Date().getTime() - aberturaDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
      
      const isEligibleForLeiDoBem = data.capitalSocial > 500000 && anosAbertura > 1.5; 

      return {
        ...data,
        name: data.razaoSocial,
        metadata: {
          eligibilityScore: isEligibleForLeiDoBem ? 100 : 45,
          enrichedAt: new Date().toISOString(),
          anosAbertura: Math.floor(anosAbertura),
          taxRegime: 'LUCRO_REAL', // Padrão para empresas com esse capital
          source: 'BRASIL_API_RESILIENT'
        }
      };
    } catch (error) {
      console.error("Erro no Enriquecimento 360:", error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { enrich, loading };
}
