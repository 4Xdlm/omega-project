/**
 * OMEGA Governance — Gate G0: Pre-check
 * Phase F — Verify baseline exists and is intact
 *
 * INV-F-01: Baseline immutable and verified before any gate.
 */

import type { GateResult, GateContext } from './types.js';
import { checkBaselineIntegrity } from '../baseline/checker.js';
import { readRegistry, findBaseline } from '../baseline/registry.js';

export function executeG0(ctx: GateContext): GateResult {
  const startTime = Date.now();
  const checks: { id: string; status: 'PASS' | 'FAIL'; message: string }[] = [];
  const details: string[] = [];

  // Check registry exists
  const registry = readRegistry(ctx.baselinesDir);
  const entry = findBaseline(registry, ctx.baselineVersion);

  if (!entry) {
    checks.push({ id: 'G0-REGISTRY', status: 'FAIL', message: `Baseline ${ctx.baselineVersion} not found in registry` });
    return { gate: 'G0', name: 'Pre-check', verdict: 'FAIL', duration_ms: Date.now() - startTime, details, checks };
  }
  checks.push({ id: 'G0-REGISTRY', status: 'PASS', message: `Baseline ${ctx.baselineVersion} found in registry` });

  // Check baseline integrity
  const integrityResult = checkBaselineIntegrity(ctx.baselinesDir, entry);
  for (const check of integrityResult.checks) {
    checks.push({
      id: `G0-${check.check}`,
      status: check.status,
      message: check.message,
    });
  }

  if (!integrityResult.valid) {
    details.push('Baseline integrity check failed');
    return { gate: 'G0', name: 'Pre-check', verdict: 'FAIL', duration_ms: Date.now() - startTime, details, checks };
  }

  // Check certified
  if (!entry.certified) {
    checks.push({ id: 'G0-CERTIFIED', status: 'FAIL', message: 'Baseline is not certified' });
    return { gate: 'G0', name: 'Pre-check', verdict: 'FAIL', duration_ms: Date.now() - startTime, details, checks };
  }
  checks.push({ id: 'G0-CERTIFIED', status: 'PASS', message: 'Baseline is certified' });

  details.push(`Baseline ${ctx.baselineVersion}: ${entry.intents.length} intents, certified=${entry.certified}`);

  return { gate: 'G0', name: 'Pre-check', verdict: 'PASS', duration_ms: Date.now() - startTime, details, checks };
}
