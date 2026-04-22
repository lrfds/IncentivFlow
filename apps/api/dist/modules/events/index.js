// Module: Events - Domain Events (Outbox Pattern)
import { prisma } from '../../core/prisma.js';
// Simulação de outbox (em produção, seria tabela dedicada)
const outbox = [];
export class EventBus {
    static async publish(event) {
        const outboxEvent = {
            id: Math.random().toString(36).slice(2),
            aggregateType: 'Project',
            aggregateId: event.payload.projectId,
            eventType: event.type,
            payload: event.payload,
            occurredAt: new Date(),
        };
        outbox.push(outboxEvent);
        // Processar imediatamente (em prod seria worker separado)
        await this.processEvent(outboxEvent);
    }
    static async processEvent(event) {
        try {
            switch (event.eventType) {
                case 'ProjectCreated':
                    await this.onProjectCreated(event.payload);
                    break;
                case 'PhaseTransitioned':
                    await this.onPhaseTransitioned(event.payload);
                    break;
                case 'ProjectApproved':
                    await this.onProjectApproved(event.payload);
                    break;
                case 'DeadlineApproaching':
                    await this.onDeadlineApproaching(event.payload);
                    break;
                case 'DocumentUploaded':
                    await this.onDocumentUploaded(event.payload);
                    break;
            }
            event.processedAt = new Date();
        }
        catch (error) {
            console.error('Event processing failed:', error);
        }
    }
    static async onProjectCreated(payload) {
        console.log(`[EVENT] ProjectCreated: ${payload.projectId}`);
        // Trigger: criar tarefas iniciais, notificar time
    }
    static async onPhaseTransitioned(payload) {
        console.log(`[EVENT] PhaseTransitioned: ${payload.from} → ${payload.to}`);
        // Se foi para ACOMPANHAMENTO, agendar alertas
        if (payload.to === 'ACOMPANHAMENTO') {
            const { queue } = await import('../../workers/queue.js');
            // Agendar follow-up em 15 dias
            await queue.add('deadline_alert', { projectId: payload.projectId }, 15 * 24 * 60 * 60 * 1000);
        }
    }
    static async onProjectApproved(payload) {
        console.log(`[EVENT] ProjectApproved: R$ ${payload.valueApproved}`);
        // Trigger: atualizar KPIs, notificar cliente, criar tarefas de captação
        const project = await prisma.project.findUnique({
            where: { id: payload.projectId },
            include: { client: true },
        });
        if (project) {
            // Em produção: enviar email para cliente
            console.log(`Notificar ${project.client.contactEmail} sobre aprovação`);
        }
    }
    static async onDeadlineApproaching(payload) {
        console.log(`[EVENT] DeadlineApproaching: ${payload.daysUntil} dias`);
        // Em produção: enviar notificações push/email
    }
    static async onDocumentUploaded(payload) {
        console.log(`[EVENT] DocumentUploaded: ${payload.documentId}`);
        // Trigger: processar documento (OCR, validação)
        const { queue } = await import('../../workers/queue.js');
        await queue.add('document_processing', { documentId: payload.documentId });
    }
    // Para debugging
    static getOutbox() {
        return outbox;
    }
}
