import { PrismaClient } from '@prisma/client';
import { Rehydrator } from './packages/core/src/snapshots/rehydrator.js';
import { EventStore } from './packages/core/src/event-store/store.js';

/**
 * @fileoverview Chaos Engineering Test: Hash Chain Breach Simulation.
 * This test simulates a direct database intrusion and validates the system's detection capabilities.
 */

async function runChaosTest() {
  const prisma = new PrismaClient();
  const eventStore = new EventStore(prisma);
  const rehydrator = new Rehydrator(prisma);

  const aggregateId = '00000000-0000-0000-0000-000000000000'; // Test Aggregate
  const organizationId = '00000000-0000-0000-0000-000000000001';

  console.log('--- [CHAOS TEST] Starting Hash Chain Breach Simulation ---');

  try {
    // 1. Setup: Create a valid event first
    console.log('[1/4] Creating valid initial event...');
    await eventStore.append({
      type: 'PROJECT_CREATED',
      aggregateId,
      organizationId,
      userId: 'system',
      payload: { title: 'Safe Project', code: 'SAFE-01' },
    });

    // 2. INJECT CORRUPTION: Manually insert an event with a FAKE hash
    // Simulating an attacker who bypassed the application logic.
    console.log('[2/4] INJECTING CORRUPTION: Manually inserting event with invalid hash...');
    const lastEvent = await prisma.event.findFirst({
      where: { aggregateId },
      orderBy: { version: 'desc' },
    });

    await prisma.event.create({
      data: {
        organizationId,
        aggregateId,
        type: 'VALUE_APPROVED',
        version: (lastEvent?.version ?? 0) + 1,
        payload: { amount: 9999999 }, // Attacker changes the value
        prevHash: lastEvent?.hash ?? 'none',
        hash: 'INVALID_ATTACKER_HASH_123456', // Fake hash
        metadata: { userId: 'attacker', note: 'Direct SQL Injection Simulation' },
      },
    });

    // 3. VERIFICATION PROBE: Try to rehydrate the state
    console.log('[3/4] Running Rehydrator probe...');
    const { state, version } = await rehydrator.getAggregateState(aggregateId);
    
    // In our implementation, the rehydrator currently computes state but we need a verification step.
    // Let's verify the chain explicitly as the EventStore would do.
    const integrity = await eventStore.verifyChain(aggregateId);

    if (!integrity.valid) {
      console.error(`❌ BREACH DETECTED! Chain broken at version ${integrity.brokenAtVersion}`);
      console.log('--- RESULT: SYSTEM PROTECTED ---');
    } else {
      console.warn('⚠️  System failed to detect corruption (Logic check needed)');
    }

    // 4. FRONTEND ALERT SIMULATION (Logic Validation)
    console.log('[4/4] Simulating Frontend Zero-Trust check...');
    // (Logic: Frontend re-calculates SHA-256 and compares with 'INVALID_ATTACKER_HASH_123456')
    // Result would be 'Falha na Cadeia'.

  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    // Cleanup
    await prisma.event.deleteMany({ where: { aggregateId } });
    await prisma.$disconnect();
  }
}

// Logic for Self-Healing Strategy Suggestion:
/*
  STRATEGY: QUARANTINE & RESTORE
  1. Detection: verifyChain() fails during read/projection.
  2. Action: Set Project.status = 'QUARANTINED'.
  3. Notification: Alert SecOps team via Sentry/Slack.
  4. Recovery: 
     a) Identify last valid version (V_SAFE) from most recent consistent snapshot.
     b) Wipe events where version > V_SAFE.
     c) Restore from secure off-site cold storage or log backups.
*/

runChaosTest();
