/**
 * Gate C4: Trace Integrity
 * Hash-chain is valid
 */

import { Sentinel } from '../src/sentinel/sentinel.js';
import { createTestClock } from '../src/shared/clock.js';
import { SentinelContext } from '../src/sentinel/types.js';
import { mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const ctx: SentinelContext = {
  phase: 'C',
  actor_id: 'trace',
  reason: 'trace test',
  source: 'c4',
  timestamp_mono_ns: 0n,
};

async function run() {
  const testDir = join(tmpdir(), `omega-gate-c4-${Date.now()}`);
  await mkdir(testDir, { recursive: true });
  const tracePath = join(testDir, 'trace.ndjson');

  const s = new Sentinel({ clock: createTestClock(), tracePath });
  await s.initialize();

  for (let i = 0; i < 10; i++) {
    await s.authorize('FINAL', 'APPEND_FACT', { id: i }, ctx);
  }

  const v = await s.verifyTraceChain();

  // Cleanup
  try {
    await unlink(tracePath);
  } catch {}
  try {
    await unlink(tracePath + '.lock');
  } catch {}

  console.log(`Gate C4 - Trace: ${v.valid ? 'PASS' : 'FAIL'}`);
  console.log(`Entries: ${v.entries}`);
  if (v.error) console.log(`Error: ${v.error}`);
  process.exit(v.valid ? 0 : 1);
}

run().catch((e) => {
  console.error('Gate C4 error:', e);
  process.exit(2);
});
