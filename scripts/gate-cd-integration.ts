/**
 * Gate CD: Integration Gate
 * Verifies Sentinel + Adapter Write Runtime integration
 *
 * Tests:
 * - INV-CD-01: All writes pass through Sentinel
 * - INV-CD-02: No write without ALLOW verdict
 * - INV-RCP-01: Every successful write has exactly one receipt
 * - INV-RCP-02: Receipt chain independent from Sentinel trace chain
 * - INV-RCP-03: Receipt links to Sentinel trace_id
 */

import { WriteAdapter } from '../src/memory-write-runtime/write-adapter.js';
import { createTestClock } from '../src/shared/clock.js';
import { mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

interface TestResult {
  name: string;
  pass: boolean;
  detail?: string;
}

async function run() {
  const results: TestResult[] = [];
  const testDir = join(tmpdir(), `omega-gate-cd-${Date.now()}`);
  await mkdir(testDir, { recursive: true });

  const receiptPath = join(testDir, 'receipts.ndjson');
  const tracePath = join(testDir, 'trace.ndjson');

  const clock = createTestClock(1000n);
  const adapter = new WriteAdapter({
    clock,
    receiptPath,
    tracePath,
    twoStepEnabled: false,
  });

  await adapter.initialize();

  // Test 1: INV-CD-01 - All writes pass through Sentinel (valid write)
  try {
    const r1 = await adapter.write({
      operation: 'APPEND_FACT',
      entry_id: 'entry_1',
      payload: { data: 'test1' },
      actor_id: 'test_actor',
      reason: 'test write reason for validation',
      source: 'gate_cd',
    });

    if (r1.success && r1.receipt.verdict === 'ALLOW') {
      results.push({ name: 'INV-CD-01: Valid write allowed', pass: true });
    } else {
      results.push({
        name: 'INV-CD-01: Valid write allowed',
        pass: false,
        detail: `Expected ALLOW, got ${r1.receipt.verdict}`,
      });
    }
  } catch (e) {
    results.push({
      name: 'INV-CD-01: Valid write allowed',
      pass: false,
      detail: String(e),
    });
  }

  // Test 2: INV-CD-02 - No write without ALLOW (empty payload denied)
  try {
    const r2 = await adapter.write({
      operation: 'APPEND_FACT',
      entry_id: 'entry_2',
      payload: {},
      actor_id: 'test_actor',
      reason: 'test write reason for validation',
      source: 'gate_cd',
    });

    if (!r2.success && r2.receipt.verdict === 'DENY') {
      results.push({ name: 'INV-CD-02: Empty payload denied', pass: true });
    } else {
      results.push({
        name: 'INV-CD-02: Empty payload denied',
        pass: false,
        detail: `Expected DENY, got ${r2.receipt.verdict}`,
      });
    }
  } catch (e) {
    results.push({
      name: 'INV-CD-02: Empty payload denied',
      pass: false,
      detail: String(e),
    });
  }

  // Test 3: INV-RCP-01 - Every write has a receipt
  try {
    const r3 = await adapter.write({
      operation: 'APPEND_DECISION',
      entry_id: 'entry_3',
      payload: { decision: true },
      actor_id: 'test_actor',
      reason: 'decision write reason for validation',
      source: 'gate_cd',
    });

    if (r3.receipt && r3.receipt.receipt_id.startsWith('rcpt_')) {
      results.push({ name: 'INV-RCP-01: Receipt created', pass: true });
    } else {
      results.push({
        name: 'INV-RCP-01: Receipt created',
        pass: false,
        detail: 'No receipt or invalid ID',
      });
    }
  } catch (e) {
    results.push({
      name: 'INV-RCP-01: Receipt created',
      pass: false,
      detail: String(e),
    });
  }

  // Test 4: INV-RCP-03 - Receipt links to Sentinel trace
  try {
    const r4 = await adapter.write({
      operation: 'APPEND_NOTE',
      entry_id: 'entry_4',
      payload: { note: 'test note' },
      actor_id: 'test_actor',
      reason: 'note write reason for validation',
      source: 'gate_cd',
    });

    if (
      r4.receipt.sentinel_trace_id.startsWith('trace_') &&
      r4.receipt.sentinel_chain_hash.length === 64
    ) {
      results.push({ name: 'INV-RCP-03: Sentinel trace linked', pass: true });
    } else {
      results.push({
        name: 'INV-RCP-03: Sentinel trace linked',
        pass: false,
        detail: 'Missing or invalid trace link',
      });
    }
  } catch (e) {
    results.push({
      name: 'INV-RCP-03: Sentinel trace linked',
      pass: false,
      detail: String(e),
    });
  }

  // Test 5: INV-RCP-02 - Both chains valid and independent
  try {
    const verification = await adapter.verifyChains();

    if (
      verification.sentinelChain.valid &&
      verification.receiptChain.valid &&
      verification.sentinelChain.entries === 4 &&
      verification.receiptChain.receipts === 4
    ) {
      results.push({ name: 'INV-RCP-02: Both chains valid', pass: true });
    } else {
      results.push({
        name: 'INV-RCP-02: Both chains valid',
        pass: false,
        detail: JSON.stringify(verification),
      });
    }
  } catch (e) {
    results.push({
      name: 'INV-RCP-02: Both chains valid',
      pass: false,
      detail: String(e),
    });
  }

  // Test 6: Denied writes also get receipts
  try {
    const r6 = await adapter.write({
      operation: 'APPEND_FACT',
      entry_id: 'entry_6',
      payload: null,
      actor_id: 'test_actor',
      reason: 'null payload test reason',
      source: 'gate_cd',
    });

    if (!r6.success && r6.receipt && r6.receipt.verdict === 'DENY') {
      results.push({ name: 'Denied writes get receipts', pass: true });
    } else {
      results.push({
        name: 'Denied writes get receipts',
        pass: false,
        detail: `success=${r6.success}, hasReceipt=${!!r6.receipt}`,
      });
    }
  } catch (e) {
    results.push({
      name: 'Denied writes get receipts',
      pass: false,
      detail: String(e),
    });
  }

  // Cleanup
  try {
    await rm(testDir, { recursive: true });
  } catch {
    // Ignore cleanup errors
  }

  // Print results
  const allPass = results.every((r) => r.pass);
  console.log(`Gate CD - Integration: ${allPass ? 'PASS' : 'FAIL'}`);
  for (const r of results) {
    const status = r.pass ? 'OK' : 'FAIL';
    console.log(`${status} ${r.name}${r.detail ? `: ${r.detail}` : ''}`);
  }

  process.exit(allPass ? 0 : 1);
}

run().catch((e) => {
  console.error('Gate CD error:', e);
  process.exit(2);
});
