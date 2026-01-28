/**
 * Gate C1: Determinism
 * 2 identical runs -> identical results
 */

import { Sentinel } from '../src/sentinel/sentinel.js';
import { createTestClock } from '../src/shared/clock.js';
import { hashCanonical } from '../src/shared/canonical.js';
import { SentinelContext } from '../src/sentinel/types.js';
import { mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const ctx = (phase: string): SentinelContext => ({
  phase,
  actor_id: 'gate',
  reason: 'determinism test',
  source: 'c1',
  timestamp_mono_ns: 0n,
});

async function run(): Promise<string[]> {
  const results: string[] = [];
  const testDir = join(tmpdir(), `omega-gate-c1-${Date.now()}`);
  await mkdir(testDir, { recursive: true });

  for (let i = 0; i < 2; i++) {
    const tracePath = join(testDir, `trace-${i}.ndjson`);
    const clock = createTestClock(1000n);
    const s = new Sentinel({ clock, twoStepEnabled: false, tracePath });
    await s.initialize();

    const decisions: unknown[] = [];
    for (const tc of [
      { op: 'APPEND_FACT' as const, p: { id: 1 }, phase: 'C' },
      { op: 'APPEND_FACT' as const, p: { id: 2 }, phase: 'CD' },
      { op: 'APPEND_DECISION' as const, p: { d: true }, phase: 'C' },
    ]) {
      const r = await s.authorize('FINAL', tc.op, tc.p, ctx(tc.phase));
      decisions.push({ v: r.decision.verdict, r: r.decision.rule_id });
    }
    results.push(hashCanonical(decisions));

    // Cleanup
    try {
      await unlink(tracePath);
    } catch {}
    try {
      await unlink(tracePath + '.lock');
    } catch {}
  }
  return results;
}

run()
  .then((r) => {
    const pass = r[0] === r[1];
    console.log(`Gate C1 - Determinism: ${pass ? 'PASS' : 'FAIL'}`);
    console.log(`Run1: ${r[0].slice(0, 16)}...`);
    console.log(`Run2: ${r[1].slice(0, 16)}...`);
    process.exit(pass ? 0 : 1);
  })
  .catch((e) => {
    console.error('Gate C1 error:', e);
    process.exit(2);
  });
