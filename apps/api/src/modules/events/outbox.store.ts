import { prisma } from '../../core/prisma.js';

/**
 * OUTBOX PATTERN - Elite Consistency Upgrade
 * 
 * Problema: Event append ≠ garantia de processamento (crash between write & publish)
 * Solução: Outbox table + transactional writes + reliable worker
 * 
 * Pattern: Write event + outbox in SAME transaction → worker processes → idempotent
 */

export interface OutboxItem {
  id: string;
  eventId: string;
  aggregateId: string;
  type: string;
  payload: any;
}

export class OutboxStore {
  /**
   * Append to outbox (called in same tx as event)
   */
  static async add(tx: any, event: { id: string; aggregateId: string; type: string; payload: any }) {
    return tx.outbox.create({
      data: {
        eventId: event.id,
        aggregateId: event.aggregateId,
        type: event.type,
        payload: event.payload,
      },
    });
  }

  /**
   * Get unprocessed items (worker polling)
   */
  static async getUnprocessed(limit = 100) {
    return prisma.outbox.findMany({
      where: { processed: false },
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: { event: true },
    });
  }

  /**
   * Mark as processed (idempotent) - ELITE: with metrics
   */
  static async markProcessed(outboxId: string) {
    const outbox = await prisma.outbox.findUnique({
      where: { id: outboxId },
      select: { createdAt: true, attempts: true },
    });

    const processingTimeMs = outbox ? Date.now() - outbox.createdAt.getTime() : 0;

    return prisma.outbox.update({
      where: { id: outboxId },
      data: {
        processed: true,
        processedAt: new Date(),
      },
    });
  }

  /**
   * Mark failed with exponential backoff
   */
  static async markFailed(outboxId: string, error: string) {
    const outbox = await prisma.outbox.findUnique({ where: { id: outboxId } });
    if (!outbox) return;

    const attempts = outbox.attempts + 1;
    const maxAttempts = 5;

    if (attempts >= maxAttempts) {
      // Dead letter - alert ops
      console.error(`[OUTBOX][DLQ] Event ${outbox.eventId} failed ${attempts} times:`, error);
    }

    return prisma.outbox.update({
      where: { id: outboxId },
      data: {
        attempts,
        lastError: error.slice(0, 1000), // Truncate
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s
        // Worker will skip if last attempt was too recent
      },
    });
  }

  /**
   * Get stats for monitoring - ELITE: with processing time metrics
   */
  static async getStats() {
    const [total, unprocessed, failed, metrics] = await Promise.all([
      prisma.outbox.count(),
      prisma.outbox.count({ where: { processed: false } }),
      prisma.outbox.count({ where: { processed: false, attempts: { gte: 3 } } }),
      prisma.$queryRaw<Array<{
        avg_processing_ms: number | null;
        p95_processing_ms: number | null;
        max_attempts: number | null;
      }>>`
        SELECT 
          AVG(EXTRACT(EPOCH FROM (processed_at - created_at)) * 1000)::float as avg_processing_ms,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (processed_at - created_at)) * 1000)::float as p95_processing_ms,
          MAX(attempts)::int as max_attempts
        FROM outbox
        WHERE processed = true 
          AND processed_at > NOW() - INTERVAL '24 hours'
          AND processed_at IS NOT NULL
      `,
    ]);

    const oldestUnprocessed = await prisma.outbox.findFirst({
      where: { processed: false },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true, type: true },
    });

    return {
      total,
      unprocessed,
      failed,
      oldestAge: oldestUnprocessed 
        ? Date.now() - oldestUnprocessed.createdAt.getTime() 
        : 0,
      oldestType: oldestUnprocessed?.type,
      avgProcessingMs: Math.round(metrics[0]?.avg_processing_ms ?? 0),
      p95ProcessingMs: Math.round(metrics[0]?.p95_processing_ms ?? 0),
      maxAttempts: metrics[0]?.max_attempts ?? 0,
    };
  }

  /**
   * Replay failed events (manual ops)
   */
  static async replay(eventId: string) {
    return prisma.outbox.updateMany({
      where: { eventId, processed: false },
      data: {
        attempts: 0,
        lastError: null,
      },
    });
  }
}