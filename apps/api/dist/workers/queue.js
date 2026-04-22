// Workers - Queue for Background Jobs
import { prisma } from '../core/prisma.js';
class InMemoryQueue {
    jobs = [];
    processing = false;
    async add(type, payload, delayMs = 0) {
        const job = {
            id: Math.random().toString(36).slice(2),
            type,
            payload,
            scheduledAt: new Date(Date.now() + delayMs),
            attempts: 0,
            maxAttempts: 3,
        };
        this.jobs.push(job);
        this.process();
        return job.id;
    }
    async process() {
        if (this.processing)
            return;
        this.processing = true;
        while (this.jobs.length > 0) {
            const now = new Date();
            const job = this.jobs.find(j => j.scheduledAt <= now);
            if (!job) {
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }
            this.jobs = this.jobs.filter(j => j.id !== job.id);
            try {
                await this.execute(job);
            }
            catch (error) {
                console.error(`Job ${job.id} failed:`, error);
                job.attempts++;
                if (job.attempts < job.maxAttempts) {
                    job.scheduledAt = new Date(Date.now() + 60000 * job.attempts); // backoff
                    this.jobs.push(job);
                }
            }
        }
        this.processing = false;
    }
    async execute(job) {
        switch (job.type) {
            case 'deadline_alert':
                await this.handleDeadlineAlert(job.payload);
                break;
            case 'daily_report':
                await this.handleDailyReport(job.payload);
                break;
            case 'audit_verification':
                await this.handleAuditVerification(job.payload);
                break;
            case 'document_processing':
                await this.handleDocumentProcessing(job.payload);
                break;
        }
    }
    async handleDeadlineAlert({ projectId }) {
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { client: true },
        });
        if (!project || !project.submissionDeadline)
            return;
        const daysUntil = Math.ceil((project.submissionDeadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        // Em produção: enviar email, Slack, etc
        console.log(`[ALERTA] Projeto ${project.code} - ${daysUntil} dias para deadline`);
        const prevEvents = await prisma.event.findMany({
            where: { aggregateId: project.id },
            orderBy: { version: 'desc' },
            take: 1
        });
        const version = prevEvents.length > 0 ? prevEvents[0].version + 1 : 1;
        const prevHash = prevEvents.length > 0 ? prevEvents[0].hash : null;
        // Registrar no audit via Event Sourcing
        await prisma.event.create({
            data: {
                organizationId: project.organizationId,
                aggregateId: project.id,
                aggregateType: 'Project',
                type: 'DEADLINE_ALERT',
                version,
                payload: { alert: 'deadline_approach', daysUntil },
                metadata: { source: 'scheduler' },
                hash: 'system_generated_hash', // In production, calculate proper chain
                prevHash,
            },
        });
    }
    async handleDailyReport({ organizationId }) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const stats = await prisma.project.groupBy({
            by: ['currentPhase'],
            where: { organizationId, updatedAt: { gte: today } },
            _count: true,
        });
        console.log(`[RELATÓRIO DIÁRIO] Org ${organizationId}:`, stats);
        // Em produção: enviar email para admins
    }
    async handleAuditVerification({ organizationId }) {
        const { AuditService } = await import('../modules/audit/service.js');
        const result = await AuditService.verifyChain(prisma, organizationId);
        if (!result.valid) {
            console.error(`[CRÍTICO] Cadeia de auditoria quebrada na org ${organizationId} em ${result.brokenAt}`);
            // Em produção: alertar security team
        }
    }
    async handleDocumentProcessing({ documentId }) {
        // Em produção: OCR, extração de metadados, virus scan
        console.log(`[PROCESSANDO] Documento ${documentId}`);
    }
}
export const queue = new InMemoryQueue();
// Scheduler - roda a cada hora
export const startScheduler = () => {
    console.log('📅 Scheduler iniciado');
    // Verificar deadlines diariamente às 9h
    setInterval(async () => {
        const now = new Date();
        if (now.getHours() !== 9)
            return;
        const upcoming = await prisma.project.findMany({
            where: {
                deletedAt: null,
                submissionDeadline: {
                    gte: new Date(),
                    lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // próximos 7 dias
                },
                currentPhase: { in: ['ELABORACAO', 'APROVACAO_CLIENTE', 'SUBMISSAO'] },
            },
            select: { id: true, organizationId: true },
        });
        for (const project of upcoming) {
            await queue.add('deadline_alert', { projectId: project.id });
        }
    }, 60 * 60 * 1000); // checa a cada hora
    // Verificação de auditoria semanal
    setInterval(async () => {
        const orgs = await prisma.organization.findMany({ select: { id: true } });
        for (const org of orgs) {
            await queue.add('audit_verification', { organizationId: org.id });
        }
    }, 24 * 60 * 60 * 1000); // diário
};
