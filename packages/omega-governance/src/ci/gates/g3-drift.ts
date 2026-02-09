/**
 * OMEGA Governance — Gate G3: Drift Detection
 * Phase F — Detect and classify drift
 *
 * INV-F-05: Drift thresholds come from config, not hardcoded.
 */

import type { GateResult, GateContext } from './types.js';
import type { CIConfig } from '../config.js';
import { detectDrift } from '../../drift/detector.js';
import { readProofPack } from '../../core/reader.js';
import { DEFAULT_GOV_CONFIG } from '../../core/config.js';

export function executeG3(ctx: GateContext, config: CIConfig): GateResult {
  const startTime = Date.now();
  const checks: { id: string; status: 'PASS' | 'FAIL'; message: string }[] = [];
  const details: string[] = [];

  const baseline = readProofPack(ctx.baselineDir);
  const candidate = readProofPack(ctx.candidateDir);

  const driftReport = detectDrift(baseline, candidate, DEFAULT_GOV_CONFIG);

  // Check drift level is acceptable
  const acceptable = config.ACCEPTABLE_DRIFT_LEVELS as readonly string[];
  const driftLevel = driftReport.level;

  if (acceptable.includes(driftLevel)) {
    checks.push({ id: 'G3-DRIFT-LEVEL', status: 'PASS', message: `Drift level ${driftLevel} is acceptable` });
  } else {
    checks.push({ id: 'G3-DRIFT-LEVEL', status: 'FAIL', message: `Drift level ${driftLevel} exceeds acceptable: [${acceptable.join(', ')}]` });
  }

  // Report drift types
  if (driftReport.types.length > 0) {
    details.push(`Drift types: ${driftReport.types.join(', ')}`);
  }

  // Report drift details count
  checks.push({
    id: 'G3-DRIFT-COUNT',
    status: driftReport.details.length === 0 ? 'PASS' : (acceptable.includes(driftLevel) ? 'PASS' : 'FAIL'),
    message: `${driftReport.details.length} drift details detected`,
  });

  details.push(`Drift: level=${driftLevel}, types=${driftReport.types.length}, details=${driftReport.details.length}`);
  details.push(`Verdict: ${driftReport.verdict}`);

  const verdict = acceptable.includes(driftLevel) ? 'PASS' : 'FAIL';
  return { gate: 'G3', name: 'Drift Detection', verdict, duration_ms: Date.now() - startTime, details, checks };
}
