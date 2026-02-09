/**
 * OMEGA Governance — Gate G4: Benchmark
 * Phase F — Benchmark candidate against thresholds
 *
 * INV-F-05: Thresholds come from config, not hardcoded.
 */

import type { GateResult, GateContext } from './types.js';
import type { CIConfig } from '../config.js';
import { readProofPack } from '../../core/reader.js';

export function executeG4(ctx: GateContext, config: CIConfig): GateResult {
  const startTime = Date.now();
  const checks: { id: string; status: 'PASS' | 'FAIL'; message: string }[] = [];
  const details: string[] = [];

  const candidate = readProofPack(ctx.candidateDir);

  // Check forge score exists
  if (!candidate.forgeReport) {
    checks.push({ id: 'G4-FORGE-EXISTS', status: 'FAIL', message: 'No forge report in candidate' });
    return { gate: 'G4', name: 'Benchmark', verdict: 'FAIL', duration_ms: Date.now() - startTime, details, checks };
  }
  checks.push({ id: 'G4-FORGE-EXISTS', status: 'PASS', message: 'Forge report present' });

  const metrics = candidate.forgeReport.metrics;

  // Check composite score variance (compare with baseline)
  const baseline = readProofPack(ctx.baselineDir);
  if (baseline.forgeReport) {
    const baseScore = baseline.forgeReport.metrics.composite_score;
    const candScore = metrics.composite_score;
    const variancePercent = baseScore !== 0 ? Math.abs((candScore - baseScore) / baseScore) * 100 : (candScore === 0 ? 0 : 100);

    if (variancePercent <= config.MAX_VARIANCE_PERCENT) {
      checks.push({ id: 'G4-VARIANCE', status: 'PASS', message: `Score variance ${variancePercent.toFixed(2)}% <= ${config.MAX_VARIANCE_PERCENT}%` });
    } else {
      checks.push({ id: 'G4-VARIANCE', status: 'FAIL', message: `Score variance ${variancePercent.toFixed(2)}% > ${config.MAX_VARIANCE_PERCENT}%` });
    }

    details.push(`Baseline score: ${baseScore.toFixed(4)}, Candidate score: ${candScore.toFixed(4)}`);
  } else {
    checks.push({ id: 'G4-VARIANCE', status: 'PASS', message: 'No baseline forge report for comparison' });
  }

  // Check quality score
  if (metrics.quality_score >= 0) {
    checks.push({ id: 'G4-QUALITY', status: 'PASS', message: `Quality score: ${metrics.quality_score.toFixed(4)}` });
  } else {
    checks.push({ id: 'G4-QUALITY', status: 'FAIL', message: `Negative quality score: ${metrics.quality_score}` });
  }

  // Check emotion score
  if (metrics.emotion_score >= 0) {
    checks.push({ id: 'G4-EMOTION', status: 'PASS', message: `Emotion score: ${metrics.emotion_score.toFixed(4)}` });
  } else {
    checks.push({ id: 'G4-EMOTION', status: 'FAIL', message: `Negative emotion score: ${metrics.emotion_score}` });
  }

  details.push(`Composite: ${metrics.composite_score.toFixed(4)}, Quality: ${metrics.quality_score.toFixed(4)}, Emotion: ${metrics.emotion_score.toFixed(4)}`);

  const allPassed = checks.every((c) => c.status === 'PASS');
  return { gate: 'G4', name: 'Benchmark', verdict: allPassed ? 'PASS' : 'FAIL', duration_ms: Date.now() - startTime, details, checks };
}
