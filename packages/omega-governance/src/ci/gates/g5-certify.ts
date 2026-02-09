/**
 * OMEGA Governance — Gate G5: Certify
 * Phase F — Certify the candidate run
 *
 * INV-F-06: Certificate hash includes ALL gate results.
 */

import type { GateResult, GateContext, GateCheck } from './types.js';
import type { CIConfig } from '../config.js';
import { certifyRun } from '../../certify/certifier.js';
import { readProofPack } from '../../core/reader.js';
import { DEFAULT_GOV_CONFIG } from '../../core/config.js';

export function executeG5(ctx: GateContext, config: CIConfig): GateResult {
  const startTime = Date.now();
  const checks: GateCheck[] = [];
  const details: string[] = [];

  const candidate = readProofPack(ctx.candidateDir);

  const certificate = certifyRun(candidate, DEFAULT_GOV_CONFIG);

  // Check verdict is acceptable
  const acceptableVerdicts = config.ACCEPTABLE_CERT_VERDICTS as readonly string[];
  const certVerdict = certificate.verdict;

  if (acceptableVerdicts.includes(certVerdict)) {
    checks.push({ id: 'G5-VERDICT', status: 'PASS', message: `Certificate verdict ${certVerdict} is acceptable` });
  } else {
    checks.push({ id: 'G5-VERDICT', status: 'FAIL', message: `Certificate verdict ${certVerdict} not in acceptable: [${acceptableVerdicts.join(', ')}]` });
  }

  // Check signature exists
  if (certificate.signature && certificate.signature.length === 64) {
    checks.push({ id: 'G5-SIGNATURE', status: 'PASS', message: 'Certificate signature is valid (64 hex chars)' });
  } else {
    checks.push({ id: 'G5-SIGNATURE', status: 'FAIL', message: 'Certificate signature invalid' });
  }

  // Report cert checks
  const failedChecks = certificate.checks.filter((c) => c.status === 'FAIL');
  if (failedChecks.length === 0) {
    checks.push({ id: 'G5-CHECKS', status: 'PASS', message: `All ${certificate.checks.length} cert checks passed` });
  } else {
    checks.push({ id: 'G5-CHECKS', status: 'FAIL', message: `${failedChecks.length}/${certificate.checks.length} cert checks failed` });
    for (const fc of failedChecks) {
      details.push(`  FAIL: ${fc.id} — ${fc.message ?? fc.name}`);
    }
  }

  details.push(`Certificate: verdict=${certVerdict}, signature=${certificate.signature.slice(0, 16)}...`);
  details.push(`Scores: forge=${certificate.scores.forge_score.toFixed(4)}, quality=${certificate.scores.quality_score.toFixed(4)}`);

  const verdict = acceptableVerdicts.includes(certVerdict) ? 'PASS' : 'FAIL';
  return { gate: 'G5', name: 'Certify', verdict, duration_ms: Date.now() - startTime, details, checks };
}
