import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
// Base Prisma Client
export const basePrisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});
/**
 * Creates an interactive transaction client extension per tenant.
 * Uses $allOperations to ensure the transaction sets the session state BEFORE executing.
 */
export const rlsClient = (organizationId, userId) => {
    return basePrisma.$extends({
        query: {
            $allModels: {
                async $allOperations({ args, query }) {
                    return basePrisma.$transaction(async (tx) => {
                        await tx.$executeRawUnsafe(`SELECT set_config('app.org_id', $1, true), set_config('app.user_id', $2, true)`, organizationId, userId);
                        return query(args);
                    });
                },
            },
        },
    });
};
// Expose base prisma for admin ops or unauthenticated flows
export const prisma = basePrisma;
// Helper para hash chain
export function calculateHash(prevHash, data) {
    const content = (prevHash || '') + JSON.stringify(data);
    return crypto.createHash('sha256').update(content).digest('hex');
}
// Graceful shutdown
process.on('beforeExit', async () => {
    await basePrisma.$disconnect();
});
