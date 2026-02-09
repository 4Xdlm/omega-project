/**
 * OMEGA Governance — Gate G2: Compare
 * Phase F — Compare baseline vs candidate runs
 */

import type { GateResult, GateContext } from './types.js';
import { compareRuns } from '../../compare/run-differ.js';
import { readProofPack } from '../../core/reader.js';

export function executeG2(ctx: GateContext): GateResult {
  const startTime = Date.now();
  const checks: { id: string; status: 'PASS' | 'FAIL'; message: string }[] = [];
  const details: string[] = [];

  const baseline = readProofPack(ctx.baselineDir);
  const candidate = readProofPack(ctx.candidateDir);

  const result = compareRuns(baseline, candidate);

  // Check identical
  if (result.identical) {
    checks.push({ id: 'G2-IDENTICAL', status: 'PASS', message: 'Runs are identical' });
  } else {
    checks.push({ id: 'G2-IDENTICAL', status: 'FAIL', message: `Runs differ: ${result.summary.different} artifacts changed` });
  }

  // Check no missing artifacts
  const missingLeft = result.summary.missing_in_first;
  const missingRight = result.summary.missing_in_second;

  if (missingLeft === 0 && missingRight === 0) {
    checks.push({ id: 'G2-COMPLETENESS', status: 'PASS', message: 'All artifacts present in both runs' });
  } else {
    checks.push({ id: 'G2-COMPLETENESS', status: 'FAIL', message: `Missing: left=${missingLeft}, right=${missingRight}` });
  }

  // Check score delta
  if (result.score_comparison) {
    const scoreDelta = Math.abs(result.score_comparison.forge_score_delta);
    if (scoreDelta === 0) {
      checks.push({ id: 'G2-SCORES', status: 'PASS', message: 'Forge scores identical' });
    } else {
      checks.push({ id: 'G2-SCORES', status: 'FAIL', message: `Forge score delta: ${scoreDelta.toFixed(4)}` });
    }
  } else {
    checks.push({ id: 'G2-SCORES', status: 'PASS', message: 'No score comparison (no forge reports)' });
  }

  details.push(`Compare: total=${result.summary.total_artifacts}, identical=${result.summary.identical}, different=${result.summary.different}`);

  const verdict = result.identical ? 'PASS' : 'FAIL';
  return { gate: 'G2', name: 'Compare', verdict, duration_ms: Date.now() - startTime, details, checks };
}
