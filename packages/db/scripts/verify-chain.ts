import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function verifyHashChain() {
  console.log('🛡️ Iniciando Verificação de Integridade da Hash Chain...');
  
  const events = await prisma.event.findMany({
    orderBy: { createdAt: 'asc' }
  });

  if (events.length === 0) {
    console.log('✅ Nenhum evento para verificar.');
    return;
  }

  let previousHash = '0'; // Gênese da corrente
  let compromisedEvents = [];

  for (const event of events) {
    // Recalcula o hash com base no payload e no hash do evento anterior
    const dataToHash = JSON.stringify(event.payload) + previousHash;
    const recalculatedHash = crypto.createHash('sha256').update(dataToHash).digest('hex');

    if (recalculatedHash !== event.hash) {
      console.error(`❌ ALERTA DE SEGURANÇA: Evento ${event.id} comprometido!`);
      compromisedEvents.push({
        id: event.id,
        storedHash: event.hash,
        expectedHash: recalculatedHash
      });
    }

    previousHash = event.hash; // Passa o hash verificado para o próximo elo
  }

  if (compromisedEvents.length === 0) {
    console.log(`✅ SUCESSO: Todos os ${events.length} eventos estão íntegros e verificados.`);
  } else {
    console.error(`🚨 CRÍTICO: Detectadas ${compromisedEvents.length} violações de integridade!`);
    process.exit(1);
  }
}

verifyHashChain()
  .catch((e) => {
    console.error('Erro na verificação:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
