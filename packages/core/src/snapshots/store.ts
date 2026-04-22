import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

/**
 * @fileoverview Snapshot Store for aggregate state persistence.
 */
export class SnapshotStore {
  constructor(private prisma: PrismaClient) {}

  /**
   * Saves a snapshot of the current state for an aggregate.
   */
  async save(aggregateId: string, version: number, state: any) {
    const stateString = JSON.stringify(state);
    const checksum = crypto.createHash('sha256').update(stateString).digest('hex');

    return await this.prisma.snapshot.create({
      data: {
        aggregateId,
        version,
        state: state as any,
        checksum,
        aggregateType: 'Project',
      },
    });
  }

  /**
   * Retrieves the latest snapshot for an aggregate.
   */
  async getLatest(aggregateId: string) {
    return await this.prisma.snapshot.findFirst({
      where: { aggregateId },
      orderBy: { version: 'desc' },
    });
  }
}
