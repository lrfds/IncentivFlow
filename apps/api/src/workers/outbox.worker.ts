import { Resend } from 'resend';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

export async function processOutbox() {
  console.log('📨 Iniciando ciclo de processamento do Outbox...');

  // 1. Busca eventos pendentes
  const pendingTasks = await prisma.outbox.findMany({
    where: { processed: false },
    take: 10,
    orderBy: { createdAt: 'asc' }
  });

  if (pendingTasks.length === 0) {
    console.log('✅ Outbox vazio. Nenhuma tarefa pendente.');
    return;
  }

  for (const task of pendingTasks) {
    try {
      console.log(`🚀 Processando tarefa ${task.id} (${task.type})`);
      
      const payload = task.payload as any;

      if (task.type === 'SEND_WELCOME_EMAIL') {
        await resend.emails.send({
          from: 'IncentivFlow <confirmacao@incentivflow.com>',
          to: payload.to,
          subject: '🔒 Dossiê de Elegibilidade Gerado com Sucesso',
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #334155;">
              <h1 style="color: #4f46e5;">Olá, ${payload.clientName}!</h1>
              <p>Seu dossiê institucional foi minerado e assinado criptograficamente com sucesso.</p>
              <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #4f46e5;">
                <p style="margin: 0; font-size: 12px; color: #64748b;">HASH DE INTEGRIDADE (SHA-256):</p>
                <code style="font-weight: bold; color: #1e293b;">${payload.hash}</code>
              </div>
              <p style="margin-top: 20px;">Acesse sua conta no IncentivFlow para visualizar os próximos passos da sua captação.</p>
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
              <p style="font-size: 10px; color: #94a3b8;">v2.5 Diamond - Sistema de Auditoria Imutável</p>
            </div>
          `
        });
      }

      // 2. Marca como processado com sucesso
      await prisma.outbox.update({
        where: { id: task.id },
        data: { 
          processed: true, 
          processedAt: new Date() 
        }
      });
      
      console.log(`✅ Tarefa ${task.id} concluída com sucesso.`);
    } catch (error) {
      console.error(`❌ Erro ao processar tarefa ${task.id}:`, error);
      // Aqui poderíamos logar o erro em uma tabela de logs externa
    }
  }
}

// Loop de execução (background worker ESM-compatible)
const isMain = process.argv[1]?.includes('outbox.worker');
if (isMain) {
  console.log('🟢 Outbox Worker iniciado. Aguardando eventos...');
  setInterval(async () => {
    try {
      await processOutbox();
    } catch (e) {
      console.error('Falha crítica no worker:', e);
    }
  }, 15000); // Executa a cada 15 segundos
}