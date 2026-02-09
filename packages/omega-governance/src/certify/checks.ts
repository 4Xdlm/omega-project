/**
 * OMEGA Governance — Certification Checks
 * Phase D.2 — All verification checks for certification
 *
 * INV-GOV-08: All values extracted from ProofPack, never computed locally.
 */

import type { ProofPackData } from '../core/types.js';
import type { GovConfig } from '../core/config.js';
import { validateProofPack } from '../core/validator.js';
import type { CertCheck } from './types.js';

/** Run all certification checks */
export function runCertChecks(data: ProofPackData, config: GovConfig): readonly CertCheck[] {
  const checks: CertCheck[] = [];

  checks.push(checkManifestIntegrity(data));
  checks.push(checkMerkleIntegrity(data));
  checks.push(checkStagesComplete(data));
  checks.push(checkForgePresent(data));
  checks.push(checkForgeScore(data, config));
  checks.push(checkEmotionScore(data, config));
  checks.push(checkQualityScore(data, config));
  checks.push(checkVerdict(data));
  checks.push(checkArtifactCount(data));
  checks.push(checkTrajectoryCompliance(data, config));

  return checks;
}

function checkManifestIntegrity(data: ProofPackData): CertCheck {
  const validation = validateProofPack(data);
  const manifestCheck = validation.checks.find((c) => c.check === 'MANIFEST_HASH');
  if (manifestCheck && manifestCheck.status === 'PASS') {
    return { id: 'CERT-CHK-01', name: 'Manifest Integrity', status: 'PASS' };
  }
  return { id: 'CERT-CHK-01', name: 'Manifest Integrity', status: 'FAIL', message: manifestCheck?.message };
}

function checkMerkleIntegrity(data: ProofPackData): CertCheck {
  const validation = validateProofPack(data);
  const merkleCheck = validation.checks.find((c) => c.check === 'MERKLE_ROOT');
  if (merkleCheck && merkleCheck.status === 'PASS') {
    return { id: 'CERT-CHK-02', name: 'Merkle Integrity', status: 'PASS' };
  }
  return { id: 'CERT-CHK-02', name: 'Merkle Integrity', status: 'FAIL', message: merkleCheck?.message };
}

function checkStagesComplete(data: ProofPackData): CertCheck {
  const expected = 6;
  const actual = data.manifest.stages_completed.length;
  if (actual === expected) {
    return { id: 'CERT-CHK-03', name: 'Stages Complete', status: 'PASS' };
  }
  if (actual >= 4) {
    return { id: 'CERT-CHK-03', name: 'Stages Complete', status: 'WARN', message: `${actual}/${expected} stages` };
  }
  return { id: 'CERT-CHK-03', name: 'Stages Complete', status: 'FAIL', message: `${actual}/${expected} stages` };
}

function checkForgePresent(data: ProofPackData): CertCheck {
  if (data.forgeReport) {
    return { id: 'CERT-CHK-04', name: 'Forge Report Present', status: 'PASS' };
  }
  return { id: 'CERT-CHK-04', name: 'Forge Report Present', status: 'FAIL', message: 'No forge report found' };
}

function checkForgeScore(data: ProofPackData, config: GovConfig): CertCheck {
  if (!data.forgeReport) {
    return { id: 'CERT-CHK-05', name: 'Forge Score', status: 'FAIL', message: 'No forge report' };
  }
  const score = data.forgeReport.metrics.composite_score;
  if (score >= config.CERT_MIN_SCORE) {
    return { id: 'CERT-CHK-05', name: 'Forge Score', status: 'PASS' };
  }
  if (score >= config.CERT_WARN_SCORE) {
    return { id: 'CERT-CHK-05', name: 'Forge Score', status: 'WARN', message: `Score ${score.toFixed(4)} < CERT_MIN_SCORE ${config.CERT_MIN_SCORE}` };
  }
  return { id: 'CERT-CHK-05', name: 'Forge Score', status: 'FAIL', message: `Score ${score.toFixed(4)} < CERT_WARN_SCORE ${config.CERT_WARN_SCORE}` };
}

function checkEmotionScore(data: ProofPackData, config: GovConfig): CertCheck {
  if (!data.forgeReport) {
    return { id: 'CERT-CHK-06', name: 'Emotion Score', status: 'FAIL', message: 'No forge report' };
  }
  const score = data.forgeReport.metrics.emotion_score;
  if (score >= config.CERT_MIN_SCORE) {
    return { id: 'CERT-CHK-06', name: 'Emotion Score', status: 'PASS' };
  }
  if (score >= config.CERT_WARN_SCORE) {
    return { id: 'CERT-CHK-06', name: 'Emotion Score', status: 'WARN', message: `Score ${score.toFixed(4)} < CERT_MIN_SCORE` };
  }
  return { id: 'CERT-CHK-06', name: 'Emotion Score', status: 'FAIL', message: `Score ${score.toFixed(4)} < CERT_WARN_SCORE` };
}

function checkQualityScore(data: ProofPackData, config: GovConfig): CertCheck {
  if (!data.forgeReport) {
    return { id: 'CERT-CHK-07', name: 'Quality Score', status: 'FAIL', message: 'No forge report' };
  }
  const score = data.forgeReport.metrics.quality_score;
  if (score >= config.CERT_MIN_SCORE) {
    return { id: 'CERT-CHK-07', name: 'Quality Score', status: 'PASS' };
  }
  if (score >= config.CERT_WARN_SCORE) {
    return { id: 'CERT-CHK-07', name: 'Quality Score', status: 'WARN', message: `Score ${score.toFixed(4)} < CERT_MIN_SCORE` };
  }
  return { id: 'CERT-CHK-07', name: 'Quality Score', status: 'FAIL', message: `Score ${score.toFixed(4)} < CERT_WARN_SCORE` };
}

function checkVerdict(data: ProofPackData): CertCheck {
  if (data.manifest.verdict === 'PASS') {
    return { id: 'CERT-CHK-08', name: 'Run Verdict', status: 'PASS' };
  }
  return { id: 'CERT-CHK-08', name: 'Run Verdict', status: 'FAIL', message: `Verdict: ${data.manifest.verdict}` };
}

function checkArtifactCount(data: ProofPackData): CertCheck {
  const count = data.manifest.artifacts.length;
  if (count >= 6) {
    return { id: 'CERT-CHK-09', name: 'Artifact Count', status: 'PASS' };
  }
  if (count >= 4) {
    return { id: 'CERT-CHK-09', name: 'Artifact Count', status: 'WARN', message: `${count} artifacts (expected >= 6)` };
  }
  return { id: 'CERT-CHK-09', name: 'Artifact Count', status: 'FAIL', message: `${count} artifacts (expected >= 6)` };
}

function checkTrajectoryCompliance(data: ProofPackData, config: GovConfig): CertCheck {
  if (!data.forgeReport) {
    return { id: 'CERT-CHK-10', name: 'Trajectory Compliance', status: 'FAIL', message: 'No forge report' };
  }
  const tc = data.forgeReport.metrics.trajectory_compliance;
  if (tc >= config.CERT_WARN_SCORE) {
    return { id: 'CERT-CHK-10', name: 'Trajectory Compliance', status: 'PASS' };
  }
  return { id: 'CERT-CHK-10', name: 'Trajectory Compliance', status: 'WARN', message: `Trajectory compliance ${tc.toFixed(4)}` };
}
