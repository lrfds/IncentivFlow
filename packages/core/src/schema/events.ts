import { z } from 'zod';

/**
 * @fileoverview Centralized Type-Safe Event Definitions for IncentivFlow.
 * All domain events must be defined here to ensure consistency across the monorepo.
 */

export const ProjectCreatedSchema = z.object({
  title: z.string(),
  code: z.string(),
  description: z.string().optional(),
});

export const PhaseChangedSchema = z.object({
  fromPhase: z.string(),
  toPhase: z.string(),
  reason: z.string().optional(),
});

export const ValueApprovedSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default('BRL'),
});

export const UpgradeSolicitedSchema = z.object({
  planType: z.enum(['PRO', 'ELITE', 'ENTERPRISE']),
  requestedBy: z.string(),
});

export const UpgradeApprovedSchema = z.object({
  planType: z.enum(['PRO', 'ELITE', 'ENTERPRISE']),
  approvedAt: z.string().datetime(),
});

/**
 * Registry of all supported event types and their payloads.
 */
export const EventRegistry = {
  PROJECT_CREATED: ProjectCreatedSchema,
  PHASE_CHANGED: PhaseChangedSchema,
  VALUE_APPROVED: ValueApprovedSchema,
  UPGRADE_SOLICITED: UpgradeSolicitedSchema,
  UPGRADE_APPROVED: UpgradeApprovedSchema,
} as const;

export type EventType = keyof typeof EventRegistry;

export type EventPayload<T extends EventType> = z.infer<typeof EventRegistry[T]>;

export interface DomainEvent<T extends EventType = EventType> {
  type: T;
  payload: EventPayload<T>;
  aggregateId: string;
  organizationId: string;
  userId: string;
}
