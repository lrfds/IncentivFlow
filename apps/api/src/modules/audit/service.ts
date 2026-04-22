import { createHash } from 'crypto';
import { DbClient } from '../../core/prisma.js';

export class AuditService {
  static async verifyChain(db: DbClient, organizationId: string): Promise<{
    valid: boolean;
    brokenAt?: string;
    totalLogs: number;
  }> {
    const logs = await db.event.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, hash: true, prevHash: true, createdAt: true, type: true, aggregateType: true, aggregateId: true, payload: true, metadata: true },
    });

    let prevHash: string | null = null;
    let brokenAt: string | undefined;

    for (const log of logs) {
      const logData = JSON.stringify({
        type: log.type,
        model: log.aggregateType,
        entityId: log.aggregateId,
        payload: log.payload,
        timestamp: log.createdAt.toISOString(),
      });

      let expectedHash: string = createHash('sha256')
        .update((prevHash || '') + logData)
        .digest('hex');

      if (log.prevHash !== prevHash || log.hash !== expectedHash) {
        brokenAt = log.id;
        break;
      }
      prevHash = log.hash;
    }

    return { valid: !brokenAt, brokenAt, totalLogs: logs.length };
  }

  static async getLogs(
    db: DbClient,
    organizationId: string,
    filters: {
      projectId?: string;
      userId?: string;
      action?: string;
      entityType?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    const where: any = {
      organizationId,
      ...(filters.projectId && { aggregateId: filters.projectId }),
      ...(filters.action && { type: filters.action }),
      ...(filters.entityType && { aggregateType: filters.entityType }),
      ...(filters.startDate || filters.endDate ? {
        createdAt: {
          ...(filters.startDate && { gte: filters.startDate }),
          ...(filters.endDate && { lte: filters.endDate }),
        },
      } : {}),
    };

    const [logs, total] = await Promise.all([
      db.event.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 100,
        skip: filters.offset || 0,
      }),
      db.event.count({ where }),
    ]);

    return { logs, total };
  }

  static async getProjectTimeline(db: DbClient, organizationId: string, projectId: string) {
    const [events, documents, funding] = await Promise.all([
      db.event.findMany({
        where: { aggregateId: projectId, organizationId },
        orderBy: { createdAt: 'asc' },
      }),
      db.document.findMany({
        where: { projectId },
        select: { id: true, name: true, createdAt: true, uploadedBy: true },
        orderBy: { createdAt: 'asc' },
      }),
      db.fundingRecord.findMany({
        where: { projectId },
        orderBy: { recordDate: 'asc' },
      }),
    ]);

    const timeline: Array<{
      date: Date;
      type: 'phase' | 'audit' | 'document' | 'funding';
      title: string;
      description: string;
      user?: string;
      metadata?: any;
    }> = [];

    events.forEach(e => {
      const isPhase = e.type === 'PHASE_CHANGED';
      timeline.push({
        date: e.createdAt,
        type: isPhase ? 'phase' : 'audit',
        title: isPhase ? `Fase Alterada` : `${e.type} - ${e.aggregateType}`,
        description: `Evento registrado via Sistema`,
        user: (e.metadata as any)?.userId || 'Sistema',
        metadata: e.payload,
      });
    });

    documents.forEach(d => {
      timeline.push({
        date: d.createdAt,
        type: 'document',
        title: 'Documento enviado',
        description: d.name,
      });
    });

    funding.forEach(f => {
      timeline.push({
        date: f.recordDate,
        type: 'funding',
        title: `Financeiro: ${f.type}`,
        description: `R$ ${Number(f.amount).toLocaleString('pt-BR')} - ${f.reference || ''}`,
        metadata: f,
      });
    });

    return timeline.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  static async exportLogs(
    db: DbClient,
    organizationId: string,
    format: 'json' | 'csv',
    filters?: any
  ): Promise<string> {
    const { logs } = await this.getLogs(db, organizationId, { ...filters, limit: 10000 });

    if (format === 'json') return JSON.stringify(logs, null, 2);

    const headers = ['Data', 'Usuário', 'Tipo', 'Entidade', 'AggregateId'];
    const rows = logs.map(l => [
      l.createdAt.toISOString(),
      (l.metadata as any)?.userId || '',
      l.type,
      l.aggregateType,
      l.aggregateId,
    ]);

    return [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  }
}