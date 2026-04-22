/**
 * EVENT MIGRATOR — Schema Evolution for Event Sourcing
 *
 * Problem:
 *   Event payloads evolve over time. If we change schema,
 *   old events become unreadable during replay.
 *
 * Solution:
 *   Every event has __schemaVersion. When replaying,
 *   migrate each event from its version to current version
 *   BEFORE applying it to the aggregate state.
 *
 * Guarantees:
 *   - Old events NEVER modified (immutable)
 *   - Migration happens IN-MEMORY during replay
 *   - Each migration is a pure function (deterministic)
 *   - Version chain must be contiguous (1→2→3, never 1→3)
 *
 * Example:
 *   v1: { amount: 1000 }
 *   v2: { amount: 1000, currency: 'BRL' }  // added field
 *   v3: { value: { amount: 1000, currency: 'BRL' } }  // restructured
 *
 *   migrate(v1_event, 1, 3) → applies v1→v2, then v2→v3
 */
// Current schema version for each event type
export const CURRENT_SCHEMA_VERSIONS = {
    PROJECT_CREATED: 3,
    PHASE_CHANGED: 2,
    VALUE_APPROVED: 2,
    VALUE_CAPTURED: 2,
    DOCUMENT_ADDED: 2,
    PROTOCOL_ASSIGNED: 1,
    PROJECT_UPDATED: 1,
};
/**
 * Migration Registry
 *
 * Each entry transforms payload from version N to N+1.
 * Migrations MUST be:
 *   - Pure functions (no side effects)
 *   - Deterministic (same input → same output)
 *   - Contiguous (no gaps in version chain)
 */
const migrations = [
    // ==================== PROJECT_CREATED ====================
    {
        eventType: 'PROJECT_CREATED',
        fromVersion: 1,
        toVersion: 2,
        description: 'Added tags array and sector classification',
        migrate: (payload) => ({
            ...payload,
            tags: payload.tags ?? [],
            sector: payload.sector ?? 'GERAL',
            // Normalize old field names
            title: payload.title ?? payload.name,
        }),
    },
    {
        eventType: 'PROJECT_CREATED',
        fromVersion: 2,
        toVersion: 3,
        description: 'Restructured value fields into nested object',
        migrate: (payload) => ({
            ...payload,
            financial: {
                requested: payload.valueRequested ?? payload.financial?.requested ?? null,
                currency: payload.currency ?? 'BRL',
            },
            // Remove old flat fields
            valueRequested: undefined,
            currency: undefined,
        }),
    },
    // ==================== PHASE_CHANGED ====================
    {
        eventType: 'PHASE_CHANGED',
        fromVersion: 1,
        toVersion: 2,
        description: 'Added validation metadata and actor information',
        migrate: (payload) => ({
            ...payload,
            validation: {
                rulesChecked: payload.rulesChecked ?? [],
                configVersion: payload.__phaseConfigVersion ?? 1,
                passedAll: true,
            },
            actor: {
                userId: payload.userId ?? 'system',
                role: payload.userRole ?? 'UNKNOWN',
            },
            // Keep backward compat
            __phaseConfigVersion: payload.__phaseConfigVersion ?? 1,
        }),
    },
    // ==================== VALUE_APPROVED ====================
    {
        eventType: 'VALUE_APPROVED',
        fromVersion: 1,
        toVersion: 2,
        description: 'Added currency, exchange rate, and approval metadata',
        migrate: (payload) => ({
            ...payload,
            currency: payload.currency ?? 'BRL',
            exchangeRate: payload.exchangeRate ?? 1.0,
            approval: {
                reference: payload.reference ?? null,
                governmentBody: payload.governmentBody ?? null,
                officialDocument: payload.officialDocument ?? null,
            },
        }),
    },
    // ==================== VALUE_CAPTURED ====================
    {
        eventType: 'VALUE_CAPTURED',
        fromVersion: 1,
        toVersion: 2,
        description: 'Added capture method and bank details',
        migrate: (payload) => ({
            ...payload,
            capture: {
                method: payload.method ?? 'DIRECT',
                bankReference: payload.bankReference ?? null,
                receiptId: payload.receiptId ?? null,
            },
            runningTotal: payload.total ?? payload.runningTotal ?? payload.amount,
        }),
    },
    // ==================== DOCUMENT_ADDED ====================
    {
        eventType: 'DOCUMENT_ADDED',
        fromVersion: 1,
        toVersion: 2,
        description: 'Added document classification and retention policy',
        migrate: (payload) => ({
            ...payload,
            classification: payload.classification ?? 'GENERAL',
            retention: {
                policy: 'STANDARD',
                expiresAt: null,
                legalHold: false,
            },
        }),
    },
];
/**
 * EventMigrator — Core migration engine
 */
export class EventMigrator {
    static migrationMap = new Map();
    static initialized = false;
    /**
     * Build migration index for O(1) lookup
     */
    static initialize() {
        if (this.initialized)
            return;
        for (const migration of migrations) {
            const key = `${migration.eventType}:${migration.fromVersion}`;
            const existing = this.migrationMap.get(key) ?? [];
            existing.push(migration);
            this.migrationMap.set(key, existing);
        }
        this.initialized = true;
        this.validateChains();
    }
    /**
     * Validate all migration chains are contiguous
     * Runs once at startup — catches config errors immediately
     */
    static validateChains() {
        const byType = new Map();
        for (const m of migrations) {
            const existing = byType.get(m.eventType) ?? [];
            existing.push(m);
            byType.set(m.eventType, existing);
        }
        for (const [eventType, typeMigrations] of byType) {
            const sorted = typeMigrations.sort((a, b) => a.fromVersion - b.fromVersion);
            for (let i = 0; i < sorted.length - 1; i++) {
                if (sorted[i].toVersion !== sorted[i + 1].fromVersion) {
                    throw new Error(`EVENT_MIGRATION_GAP: ${eventType} has gap between v${sorted[i].toVersion} and v${sorted[i + 1].fromVersion}`);
                }
            }
            const currentVersion = CURRENT_SCHEMA_VERSIONS[eventType];
            if (currentVersion !== undefined) {
                const lastMigration = sorted[sorted.length - 1];
                if (lastMigration && lastMigration.toVersion !== currentVersion) {
                    throw new Error(`EVENT_MIGRATION_INCOMPLETE: ${eventType} last migration goes to v${lastMigration.toVersion} but current is v${currentVersion}`);
                }
            }
        }
    }
    /**
     * Migrate a single event payload from its version to target version
     *
     * @param eventType - The event type (e.g., 'PROJECT_CREATED')
     * @param payload - The raw payload from the event store
     * @param fromVersion - The schema version the payload was written with
     * @param toVersion - The target schema version (default: current)
     * @returns Migrated payload
     */
    static migrate(eventType, payload, fromVersion, toVersion) {
        this.initialize();
        const targetVersion = toVersion ?? CURRENT_SCHEMA_VERSIONS[eventType] ?? fromVersion;
        if (fromVersion === targetVersion) {
            return { payload, migrationsApplied: [] };
        }
        if (fromVersion > targetVersion) {
            throw new Error(`EVENT_DOWNGRADE_NOT_SUPPORTED: Cannot migrate ${eventType} from v${fromVersion} to v${toVersion}`);
        }
        let currentPayload = structuredClone(payload);
        const applied = [];
        let currentVersion = fromVersion;
        while (currentVersion < targetVersion) {
            const key = `${eventType}:${currentVersion}`;
            const migration = this.migrationMap.get(key)?.[0];
            if (!migration) {
                throw new Error(`EVENT_MIGRATION_NOT_FOUND: No migration for ${eventType} from v${currentVersion}`);
            }
            currentPayload = migration.migrate(currentPayload);
            applied.push(`${eventType}:v${currentVersion}→v${migration.toVersion} (${migration.description})`);
            currentVersion = migration.toVersion;
        }
        return { payload: currentPayload, migrationsApplied: applied };
    }
    /**
     * Migrate event during replay (the main entry point for projection workers)
     */
    static migrateEvent(event) {
        const schemaVersion = event.payload?.__schemaVersion ?? event.metadata?.__schemaVersion ?? 1;
        return this.migrate(event.type, event.payload, schemaVersion);
    }
    /**
     * Dry run: check what migrations WOULD be applied
     * Useful for validation before actual replay
     */
    static dryRun(eventType, fromVersion, toVersion) {
        this.initialize();
        const targetVersion = toVersion ?? CURRENT_SCHEMA_VERSIONS[eventType] ?? fromVersion;
        const steps = [];
        let currentVersion = fromVersion;
        while (currentVersion < targetVersion) {
            const key = `${eventType}:${currentVersion}`;
            const migration = this.migrationMap.get(key)?.[0];
            if (!migration)
                break;
            steps.push({
                from: migration.fromVersion,
                to: migration.toVersion,
                description: migration.description,
            });
            currentVersion = migration.toVersion;
        }
        return { steps, targetVersion };
    }
    /**
     * Get statistics about registered migrations
     */
    static getStats() {
        this.initialize();
        const byType = {};
        const types = new Set(migrations.map(m => m.eventType));
        for (const type of types) {
            const typeMigrations = migrations.filter(m => m.eventType === type);
            byType[type] = {
                versions: typeMigrations.length + 1, // +1 for initial version
                current: CURRENT_SCHEMA_VERSIONS[type] ?? 1,
            };
        }
        return {
            totalMigrations: migrations.length,
            eventTypes: types.size,
            byType,
        };
    }
}
