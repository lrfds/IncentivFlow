import { Prisma } from '@prisma/client';

/**
 * @fileoverview Prisma Extension for Multi-tenant Isolation.
 * Automatically injects organizationId filters and ensures RLS compliance.
 */

export function tenantIsolationExtension(organizationId: string) {
  return Prisma.defineExtension({
    name: 'tenant-isolation',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // List of models that ARE NOT tenant-scoped (e.g., global configs)
          const globalModels = ['Organization'];
          
          if (globalModels.includes(model)) {
            return query(args);
          }

          // Inject organizationId filter into every query
          if (
            operation === 'findFirst' ||
            operation === 'findMany' ||
            operation === 'findUnique' ||
            operation === 'count' ||
            operation === 'update' ||
            operation === 'updateMany' ||
            operation === 'delete' ||
            operation === 'deleteMany'
          ) {
            (args.where as any) = {
              ...args.where,
              organizationId,
            };
          }

          // Inject organizationId into creations
          if (operation === 'create') {
            (args.data as any) = {
              ...args.data,
              organizationId,
            };
          }

          if (operation === 'createMany') {
            if (Array.isArray(args.data)) {
              args.data = args.data.map((item: any) => ({
                ...item,
                organizationId,
              }));
            }
          }

          return query(args);
        },
      },
    },
  });
}

/**
 * Example usage:
 * const tenantPrisma = prisma.$extends(tenantIsolationExtension(currentOrgId));
 */
