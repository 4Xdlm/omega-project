/**
 * OMEGA Governance — Gate G1: Replay
 * Phase F — Verify deterministic replay
 *
 * INV-F-02: Replay uses the SAME seed as the original run.
 * INV-F-03: Replay output byte-identical to stored baseline.
 */

import type { GateResult, GateContext } from './types.js';
import { replayCompare } from '../replay/engine.js';
import type { CIConfig } from '../config.js';

export function executeG1(ctx: GateContext, config: CIConfig): GateResult {
  const startTime = Date.now();
  const checks: { id: string; status: 'PASS' | 'FAIL'; message: string }[] = [];
  const details: string[] = [];

  const result = replayCompare(ctx.baselineDir, ctx.candidateDir, {
    seed: ctx.seed,
    timeout_ms: config.REPLAY_TIMEOUT_MS,
  });

  // Check manifest match
  if (result.manifest_match) {
    checks.push({ id: 'G1-MANIFEST', status: 'PASS', message: 'Manifest hashes match' });
  } else {
    checks.push({ id: 'G1-MANIFEST', status: 'FAIL', message: 'Manifest hashes differ' });
  }

  // Check merkle match
  if (result.merkle_match) {
    checks.push({ id: 'G1-MERKLE', status: 'PASS', message: 'Merkle roots match' });
  } else {
    checks.push({ id: 'G1-MERKLE', status: 'FAIL', message: 'Merkle roots differ' });
  }

  // Check identical
  if (result.identical) {
    checks.push({ id: 'G1-IDENTICAL', status: 'PASS', message: 'Runs are byte-identical' });
  } else {
    checks.push({ id: 'G1-IDENTICAL', status: 'FAIL', message: `${result.differences.length} differences found` });
    for (const diff of result.differences) {
      details.push(`  ${diff.type}: ${diff.path} — ${diff.message}`);
    }
  }

  details.push(`Replay: baseline=${result.baseline_run_id}, candidate=${result.replay_run_id}, duration=${result.duration_ms}ms`);

  const verdict = result.identical ? 'PASS' : 'FAIL';
  return { gate: 'G1', name: 'Replay', verdict, duration_ms: Date.now() - startTime, details, checks };
}
