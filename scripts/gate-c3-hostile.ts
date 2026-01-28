/**
 * Gate C3: Hostile Inputs
 * Never crashes on hostile inputs
 */

import { Sentinel } from '../src/sentinel/sentinel.js';
import { SentinelError } from '../src/sentinel/types.js';
import { CanonicalizeError } from '../src/shared/canonical.js';
import { createTestClock } from '../src/shared/clock.js';
import { SentinelContext } from '../src/sentinel/types.js';
import { mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const ctx: SentinelContext = {
  phase: 'CD',
  actor_id: 'hostile',
  reason: 'hostile test reason',
  source: 'c3',
  timestamp_mono_ns: 0n,
};

const HOSTILE = [
  // Emoji stress
  '\uD83D\uDD25'.repeat(1000),
  // Control chars
  '\u0000\u0001\u0002',
  // Deep nesting
  (() => {
    let o: Record<string, unknown> = { v: 1 };
    for (let i = 0; i < 100; i++) o = { n: o };
    return o;
  })(),
  // Large string
  'x'.repeat(100000),
  // Null
  null,
  // Undefined
  undefined,
  // Empty object
  {},
  // Empty array
  [],
];

async function run() {
  const testDir = join(tmpdir(), `omega-gate-c3-${Date.now()}`);
  await mkdir(testDir, { recursive: true });
  const tracePath = join(testDir, 'trace.ndjson');

  const s = new Sentinel({ clock: createTestClock(), tracePath });
  await s.initialize();

  const results: string[] = [];
  let pass = true;

  for (let i = 0; i < HOSTILE.length; i++) {
    try {
      const r = await s.authorize('FINAL', 'APPEND_FACT', HOSTILE[i], ctx);
      results.push(`OK ${i}: ${r.decision.verdict}`);
    } catch (e) {
      if (e instanceof SentinelError || e instanceof CanonicalizeError) {
        results.push(`OK ${i}: Expected error (${(e as Error).message.slice(0, 30)})`);
      } else {
        results.push(`FAIL ${i}: Unexpected: ${e}`);
        pass = false;
      }
    }
  }

  // Cleanup
  try {
    await unlink(tracePath);
  } catch {}
  try {
    await unlink(tracePath + '.lock');
  } catch {}

  console.log('Gate C3 - Hostile:', pass ? 'PASS' : 'FAIL');
  results.forEach((r) => console.log(r));
  process.exit(pass ? 0 : 1);
}

run().catch((e) => {
  console.error('Gate C3 error:', e);
  process.exit(2);
});
