/**
 * OMEGA Governance — Certifier
 * Phase D.2 — Execute all checks and produce a certificate
 *
 * INV-GOV-06: certify(run) x2 produces identical certificates (deterministic).
 */

import { createHash } from 'node:crypto';
import type { ProofPackData } from '../core/types.js';
import type { GovConfig } from '../core/config.js';
import type { Certificate, CertVerdict, CertScores } from './types.js';
import { runCertChecks } from './checks.js';

/** Certify a ProofPack run */
export function certifyRun(data: ProofPackData, config: GovConfig): Certificate {
  const checks = runCertChecks(data, config);
  const scores = extractScores(data);
  const verdict = determineVerdict(checks);

  const signatureInput = JSON.stringify({
    run_id: data.runId,
    verdict,
    checks,
    scores,
  }, null, 0);

  const signature = createHash('sha256').update(signatureInput, 'utf-8').digest('hex');

  return {
    run_id: data.runId,
    verdict,
    checks,
    scores,
    config,
    signature,
  };
}

/** Determine overall verdict from checks */
function determineVerdict(checks: readonly { status: 'PASS' | 'WARN' | 'FAIL' }[]): CertVerdict {
  const hasFail = checks.some((c) => c.status === 'FAIL');
  const hasWarn = checks.some((c) => c.status === 'WARN');

  if (hasFail) return 'FAIL';
  if (hasWarn) return 'PASS_WITH_WARNINGS';
  return 'PASS';
}

/** Extract scores from ProofPack (INV-GOV-08: read from ProofPack, never compute) */
function extractScores(data: ProofPackData): CertScores {
  if (!data.forgeReport) {
    return {
      forge_score: 0,
      emotion_score: 0,
      quality_score: 0,
      trajectory_compliance: 0,
    };
  }

  return {
    forge_score: data.forgeReport.metrics.composite_score,
    emotion_score: data.forgeReport.metrics.emotion_score,
    quality_score: data.forgeReport.metrics.quality_score,
    trajectory_compliance: data.forgeReport.metrics.trajectory_compliance,
  };
}
