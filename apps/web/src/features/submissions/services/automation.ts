import { api } from '../../../lib/api';

export const triggerPostSubmissionFlow = async (submission: any) => {
  console.log(`🤖 Iniciando fluxo de automação para: ${submission.projectName}`);

  // 1. Registro do Evento na Hash Chain (Prova de que a automação rodou)
  try {
    await api.post('/api/audit/events', {
      type: 'AUTOMATION_TRIGGERED',
      aggregateId: submission.id,
      payload: { 
        action: 'POST_SUBMISSION_WORKFLOW', 
        triggeredAt: new Date().toISOString(),
        tasks: ['D+15: Conferência DOU', 'D+30: Follow-up Client']
      }
    });
  } catch (e) {
    console.error('Falha ao registrar auditoria da automação', e);
  }

  // 2. Agendamento D+15 (Conferência de Protocolo/DOU)
  const dateD15 = new Date();
  dateD15.setDate(dateD15.getDate() + 15);

  // 3. Agendamento D+30 (Follow-up de Diligência)
  const dateD30 = new Date();
  dateD30.setDate(dateD30.getDate() + 30);

  const tasks = [
    {
      title: `🔍 Conferir DOU: ${submission.clientName}`,
      start: dateD15.toISOString(),
      category: 'DEADLINE',
      description: `Verificar publicação do projeto ${submission.projectName} no Diário Oficial.`
    },
    {
      title: `📞 Follow-up: ${submission.clientName}`,
      start: dateD30.toISOString(),
      category: 'MEETING',
      description: `Alinhamento de status sobre a submissão do projeto ${submission.projectName}.`
    }
  ];

  // Inserção em massa na Agenda
  for (const task of tasks) {
    try {
      await api.post('/api/calendar/events', task);
    } catch (e) {
      console.error('Falha ao agendar tarefa na agenda inteligente', e);
    }
  }

  // 4. Fluxo White Glove: Convite de Concierge
  const conciergeLink = `${window.location.origin}/guest/${submission.id}-secure-token`;
  console.log(`🧤 [WHITE GLOVE] Convite enviado para o cliente: ${conciergeLink}`);

  try {
    await api.post('/api/outbox', {
      type: 'CONCIERGE_INVITE',
      payload: {
        to: submission.clientEmail || 'diretoria@cliente.com',
        subject: `💎 Protocolo de Prestígio: ${submission.projectName}`,
        template: 'EXECUTIVE_CONCIERGE',
        link: conciergeLink,
        auditHash: submission.auditHash
      }
    });
  } catch (e) {
    console.error('Falha ao registrar convite de concierge no outbox', e);
  }

  return { success: true, tasksCount: tasks.length, conciergeLink };
};

/**
 * Monitor de Prazos Diamond: Notifica vencimentos em 60 dias
 */
export const checkUpcomingDeadlines = async (clients: any[], submissions: any[]) => {
  console.log("🛡️ Iniciando monitoramento de prazos críticos (60 dias)...");
  
  const today = new Date();
  const alertThreshold = 60; // dias

  // 1. Verificar Certidões de Clientes
  for (const client of clients) {
    if (client.certificates) {
      for (const cert of client.certificates) {
        const expiryDate = new Date(cert.expiryDate);
        const diffDays = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === alertThreshold) {
          await triggerDeadlineAlert(client, `Vencimento de Certidão: ${cert.name}`, expiryDate);
        }
      }
    }
  }

  // 2. Verificar Prazos de Captação Autorizados
  for (const sub of submissions) {
    if (sub.fundraisingDeadline) {
      const expiryDate = new Date(sub.fundraisingDeadline);
      const diffDays = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === alertThreshold) {
        await triggerDeadlineAlert(sub, `Fim do Prazo de Captação: ${sub.projectName}`, expiryDate);
      }
    }
  }
};

const triggerDeadlineAlert = async (target: any, title: string, expiryDate: Date) => {
  console.log(`🚨 Alerta de 60 dias disparado: ${title}`);

  // Registro na Audit Chain
  await api.post('/api/audit/events', {
    type: 'DEADLINE_ALERT_60D',
    aggregateId: target.id,
    payload: { title, expiryDate: expiryDate.toISOString(), status: 'CRITICAL' }
  });

  // Agendamento na Agenda Inteligente
  await api.post('/api/calendar/events', {
    title: `⚠️ CRÍTICO: ${title}`,
    start: expiryDate.toISOString(),
    category: 'DEADLINE',
    description: `Aviso automático de 60 dias para vencimento. Ação imediata requerida.`
  });

  // Notificação via Outbox (Concierge Email)
  await api.post('/api/outbox', {
    type: 'DEADLINE_ALERT',
    payload: {
      to: 'consultor@incentivflow.com',
      subject: `🚨 AVISO CRÍTICO: 60 Dias para Vencimento - ${target.name || target.clientName}`,
      template: 'CRITICAL_DEADLINE',
      targetName: target.name || target.clientName,
      deadlineTitle: title,
      expiryDate: expiryDate.toLocaleDateString('pt-BR')
    }
  });
};
