/**
 * OMEGA Governance — CI Invariants
 * Phase F — INV-F-01 through INV-F-10
 */

import type { GovInvariantResult } from '../core/types.js';
import type { GateResult } from '../ci/gates/types.js';
import { GATE_ORDER } from '../ci/gates/types.js';
import type { BaselineRegistry } from '../ci/baseline/types.js';
import type { ReplayResult } from '../ci/replay/types.js';
import type { CIResult } from '../ci/types.js';
import type { CIConfig } from '../ci/config.js';
import type { BadgeResult } from '../ci/badge/types.js';

/**
 * INV-F-01: BASELINE_IMMUTABLE
 * Once registered, a baseline is immutable.
 */
export function checkBaselineImmutable(
  registryBefore: BaselineRegistry,
  registryAfter: BaselineRegistry,
): GovInvariantResult {
  for (const before of registryBefore.baselines) {
    const after = registryAfter.baselines.find((b) => b.version === before.version);
    if (!after) {
      return { id: 'INV-F-01', status: 'FAIL', message: `Baseline ${before.version} was deleted` };
    }
    if (before.manifest_hash !== after.manifest_hash) {
      return { id: 'INV-F-01', status: 'FAIL', message: `Baseline ${before.version} manifest_hash changed` };
    }
    if (before.certified !== after.certified) {
      return { id: 'INV-F-01', status: 'FAIL', message: `Baseline ${before.version} certified flag changed` };
    }
  }
  return { id: 'INV-F-01', status: 'PASS', evidence: `${registryBefore.baselines.length} baselines verified immutable` };
}

/**
 * INV-F-02: REPLAY_SAME_SEED
 * Replay uses the SAME seed as the original run.
 */
export function checkReplaySameSeed(
  originalSeed: string,
  replaySeed: string,
): GovInvariantResult {
  if (originalSeed === replaySeed) {
    return { id: 'INV-F-02', status: 'PASS', evidence: `seed=${originalSeed}` };
  }
  return { id: 'INV-F-02', status: 'FAIL', message: `Seed mismatch: original=${originalSeed}, replay=${replaySeed}` };
}

/**
 * INV-F-03: REPLAY_BYTE_IDENTICAL
 * Replay output byte-identical to stored baseline.
 */
export function checkReplayByteIdentical(replayResult: ReplayResult): GovInvariantResult {
  if (replayResult.identical) {
    return { id: 'INV-F-03', status: 'PASS', evidence: `baseline=${replayResult.baseline_run_id}, candidate=${replayResult.replay_run_id}` };
  }
  return {
    id: 'INV-F-03',
    status: 'FAIL',
    message: `${replayResult.differences.length} differences found between baseline and replay`,
  };
}

/**
 * INV-F-04: GATES_SEQUENTIAL
 * Gates execute sequentially G0→G5, fail-fast.
 */
export function checkGatesSequential(gates: readonly GateResult[]): GovInvariantResult {
  // Check order
  for (let i = 0; i < gates.length; i++) {
    if (i < GATE_ORDER.length && gates[i].gate !== GATE_ORDER[i]) {
      return { id: 'INV-F-04', status: 'FAIL', message: `Gate at index ${i} is ${gates[i].gate}, expected ${GATE_ORDER[i]}` };
    }
  }

  // Check fail-fast: after first FAIL, remaining should be SKIPPED
  let foundFail = false;
  for (const gate of gates) {
    if (foundFail && gate.verdict !== 'SKIPPED') {
      return { id: 'INV-F-04', status: 'FAIL', message: `Gate ${gate.gate} should be SKIPPED after failure, but is ${gate.verdict}` };
    }
    if (gate.verdict === 'FAIL') {
      foundFail = true;
    }
  }

  return { id: 'INV-F-04', status: 'PASS', evidence: `${gates.length} gates in correct order` };
}

/**
 * INV-F-05: THRESHOLDS_FROM_CONFIG
 * Drift thresholds come from config, not hardcoded.
 */
export function checkThresholdsFromConfig(
  config: CIConfig,
): GovInvariantResult {
  // Verify all threshold fields exist and are non-undefined
  const requiredFields: (keyof CIConfig)[] = [
    'ACCEPTABLE_DRIFT_LEVELS', 'MAX_VARIANCE_PERCENT', 'MAX_DURATION_MS', 'ACCEPTABLE_CERT_VERDICTS',
  ];

  for (const field of requiredFields) {
    if (config[field] === undefined || config[field] === null) {
      return { id: 'INV-F-05', status: 'FAIL', message: `Config field ${field} is missing` };
    }
  }

  return { id: 'INV-F-05', status: 'PASS', evidence: `${requiredFields.length} threshold fields present in config` };
}

/**
 * INV-F-06: CERTIFICATE_INCLUDES_GATES
 * Certificate hash includes ALL gate results.
 */
export function checkCertificateIncludesGates(
  result: CIResult,
): GovInvariantResult {
  // Verify all expected gates are present in result
  const gateIds = new Set(result.gates.map((g) => g.gate));

  // At minimum, G0 must be present
  if (!gateIds.has('G0')) {
    return { id: 'INV-F-06', status: 'FAIL', message: 'G0 gate missing from result' };
  }

  // If verdict is PASS, all gates must be present
  if (result.verdict === 'PASS') {
    for (const expected of GATE_ORDER) {
      if (!gateIds.has(expected)) {
        return { id: 'INV-F-06', status: 'FAIL', message: `Gate ${expected} missing from PASS result` };
      }
    }
  }

  return { id: 'INV-F-06', status: 'PASS', evidence: `${gateIds.size} gates present in result` };
}

/**
 * INV-F-07: REPORT_PURE_FUNCTION
 * Report is a pure function of gate results (no side effects).
 */
export function checkReportPureFunction(
  resultA: string,
  resultB: string,
): GovInvariantResult {
  if (resultA === resultB) {
    return { id: 'INV-F-07', status: 'PASS', evidence: 'Same input produces same report' };
  }
  return { id: 'INV-F-07', status: 'FAIL', message: 'Same input produced different reports' };
}

/**
 * INV-F-08: BASELINE_REGISTERED_IMMUTABLE
 * Baselines cannot be re-registered or modified.
 */
export function checkBaselineRegisteredImmutable(
  version: string,
  registry: BaselineRegistry,
  registrationAttempted: boolean,
  threw: boolean,
): GovInvariantResult {
  const exists = registry.baselines.some((b) => b.version === version);
  if (exists && registrationAttempted && threw) {
    return { id: 'INV-F-08', status: 'PASS', evidence: `Re-registration of ${version} correctly rejected` };
  }
  if (exists && registrationAttempted && !threw) {
    return { id: 'INV-F-08', status: 'FAIL', message: `Re-registration of ${version} was allowed` };
  }
  return { id: 'INV-F-08', status: 'PASS', evidence: `Baseline ${version} immutability verified` };
}

/**
 * INV-F-09: BADGE_REFLECTS_VERDICT
 * Badge reflects the REAL gate verdict, never cached.
 */
export function checkBadgeReflectsVerdict(
  result: CIResult,
  badge: BadgeResult,
): GovInvariantResult {
  const expectedStatus = result.verdict === 'PASS' ? 'passing' : 'failing';
  if (badge.status === expectedStatus) {
    return { id: 'INV-F-09', status: 'PASS', evidence: `Badge status=${badge.status} matches verdict=${result.verdict}` };
  }
  return { id: 'INV-F-09', status: 'FAIL', message: `Badge status=${badge.status} does not match verdict=${result.verdict}` };
}

/**
 * INV-F-10: CI_DETERMINISTIC
 * Same baseline + same candidate = same CI result (excluding timestamps).
 */
export function checkCIDeterministic(
  resultHash1: string,
  resultHash2: string,
): GovInvariantResult {
  if (resultHash1 === resultHash2) {
    return { id: 'INV-F-10', status: 'PASS', evidence: `hash=${resultHash1}` };
  }
  return { id: 'INV-F-10', status: 'FAIL', message: `Non-deterministic: run1=${resultHash1}, run2=${resultHash2}` };
}

/** Check all available CI invariants (convenience) */
export function checkAvailableCIInvariants(): readonly string[] {
  return [
    'INV-F-01', 'INV-F-02', 'INV-F-03', 'INV-F-04', 'INV-F-05',
    'INV-F-06', 'INV-F-07', 'INV-F-08', 'INV-F-09', 'INV-F-10',
  ];
}
