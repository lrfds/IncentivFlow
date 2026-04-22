import { api } from '../../lib/api';
import { type Client } from '../../types';

export const saveEnrichedClient = async (clientData: Partial<Client>) => {
  // Chamada atômica para o backend
  // O backend deve: 
  // 1. Criar o Cliente
  // 2. EventStore.append('CLIENT_ENRICHED', ...)
  // 3. Outbox.add('SEND_WELCOME_EMAIL', ...)
  
  const response = await api.post('/api/clients', clientData);
  
  return {
    success: true,
    client: response.data,
    auditHash: response.data.auditHash // Retornado pelo middleware do Prisma/Hash Chain
  };
}

// Alias para manter compatibilidade com o plano de batalha
export const saveClientWithAudit = saveEnrichedClient;
