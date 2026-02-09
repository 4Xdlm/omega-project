/**
 * OMEGA Governance — Governance Invariants
 * Phase D.2 — INV-GOV-01 through INV-GOV-08
 */

import type { GovInvariantResult, FileStat, ProofPackData } from '../core/types.js';
import type { CompareResult } from '../compare/types.js';
import type { DriftReport } from '../drift/types.js';

/**
 * INV-GOV-01: READ_ONLY
 * No source file modified after analysis.
 */
export function checkReadOnly(
  beforeStats: Map<string, FileStat>,
  afterStats: Map<string, FileStat>,
): GovInvariantResult {
  for (const [path, before] of beforeStats) {
    const after = afterStats.get(path);
    if (!after) {
      return {
        id: 'INV-GOV-01',
        status: 'FAIL',
        message: `File deleted: ${path}`,
        evidence: `before: mtime=${before.mtime}, size=${before.size}`,
      };
    }
    if (after.mtime !== before.mtime || after.size !== before.size) {
      return {
        id: 'INV-GOV-01',
        status: 'FAIL',
        message: `File modified: ${path}`,
        evidence: `before: mtime=${before.mtime},size=${before.size} after: mtime=${after.mtime},size=${after.size}`,
      };
    }
  }

  for (const path of afterStats.keys()) {
    if (!beforeStats.has(path)) {
      return {
        id: 'INV-GOV-01',
        status: 'FAIL',
        message: `File created: ${path}`,
      };
    }
  }

  return { id: 'INV-GOV-01', status: 'PASS' };
}

/**
 * INV-GOV-02: HASH_TRUST
 * All analysis relies on verified manifest + merkle.
 */
export function checkHashTrust(
  manifestHashValid: boolean,
  merkleRootValid: boolean,
): GovInvariantResult {
  if (manifestHashValid && merkleRootValid) {
    return { id: 'INV-GOV-02', status: 'PASS', evidence: 'manifest hash and merkle root verified' };
  }
  const failures: string[] = [];
  if (!manifestHashValid) failures.push('manifest hash invalid');
  if (!merkleRootValid) failures.push('merkle root invalid');
  return {
    id: 'INV-GOV-02',
    status: 'FAIL',
    message: `Hash trust violation: ${failures.join(', ')}`,
  };
}

/**
 * INV-GOV-03: COMPARE_SYMMETRIC
 * compare(A,B).diffs has inverse of compare(B,A).diffs
 */
export function checkCompareSymmetric(
  resultAB: CompareResult,
  resultBA: CompareResult,
): GovInvariantResult {
  if (resultAB.diffs.length !== resultBA.diffs.length) {
    return {
      id: 'INV-GOV-03',
      status: 'FAIL',
      message: `Diff count mismatch: AB=${resultAB.diffs.length}, BA=${resultBA.diffs.length}`,
    };
  }

  for (const diffAB of resultAB.diffs) {
    const diffBA = resultBA.diffs.find((d) => d.path === diffAB.path);
    if (!diffBA) {
      return {
        id: 'INV-GOV-03',
        status: 'FAIL',
        message: `Path ${diffAB.path} in AB but not in BA`,
      };
    }

    const expectedStatus = invertStatus(diffAB.status);
    if (diffBA.status !== expectedStatus) {
      return {
        id: 'INV-GOV-03',
        status: 'FAIL',
        message: `Status mismatch at ${diffAB.path}: AB=${diffAB.status}, BA=${diffBA.status}, expected=${expectedStatus}`,
      };
    }
  }

  return { id: 'INV-GOV-03', status: 'PASS', evidence: `${resultAB.diffs.length} diffs verified symmetric` };
}

function invertStatus(status: string): string {
  if (status === 'MISSING_LEFT') return 'MISSING_RIGHT';
  if (status === 'MISSING_RIGHT') return 'MISSING_LEFT';
  return status;
}

/**
 * INV-GOV-04: DRIFT_EXPLICIT
 * Every drift is classified with a rule cited.
 */
export function checkDriftExplicit(report: DriftReport): GovInvariantResult {
  for (const detail of report.details) {
    if (!detail.rule || detail.rule.trim().length === 0) {
      return {
        id: 'INV-GOV-04',
        status: 'FAIL',
        message: `Drift at ${detail.path} has no rule`,
      };
    }
  }
  return { id: 'INV-GOV-04', status: 'PASS', evidence: `${report.details.length} drifts all have rules` };
}

/**
 * INV-GOV-05: BENCH_DETERMINISTIC
 * Same suite + same runs = same result.
 */
export function checkBenchDeterministic(
  result1Hash: string,
  result2Hash: string,
): GovInvariantResult {
  if (result1Hash === result2Hash) {
    return { id: 'INV-GOV-05', status: 'PASS', evidence: `hash=${result1Hash}` };
  }
  return {
    id: 'INV-GOV-05',
    status: 'FAIL',
    message: `Non-deterministic: run1=${result1Hash}, run2=${result2Hash}`,
  };
}

/**
 * INV-GOV-06: CERT_STABLE
 * certify(run) twice produces identical certificates (excluding timestamp).
 */
export function checkCertStable(
  sig1: string,
  sig2: string,
): GovInvariantResult {
  if (sig1 === sig2) {
    return { id: 'INV-GOV-06', status: 'PASS', evidence: `signature=${sig1}` };
  }
  return {
    id: 'INV-GOV-06',
    status: 'FAIL',
    message: `Non-stable: cert1=${sig1}, cert2=${sig2}`,
  };
}

/**
 * INV-GOV-07: LOG_APPEND_ONLY
 * History log can only add, never delete.
 */
export function checkLogAppendOnly(
  lineCountBefore: number,
  lineCountAfter: number,
): GovInvariantResult {
  if (lineCountAfter >= lineCountBefore) {
    return { id: 'INV-GOV-07', status: 'PASS', evidence: `before=${lineCountBefore}, after=${lineCountAfter}` };
  }
  return {
    id: 'INV-GOV-07',
    status: 'FAIL',
    message: `Log entries decreased: before=${lineCountBefore}, after=${lineCountAfter}`,
  };
}

/**
 * INV-GOV-08: REPORT_DERIVED
 * All figures in report come from ProofPack, no local computation.
 */
export function checkReportDerived(
  data: ProofPackData,
  reportedScore: number,
): GovInvariantResult {
  if (!data.forgeReport) {
    if (reportedScore === 0) {
      return { id: 'INV-GOV-08', status: 'PASS', evidence: 'No forge report, score=0' };
    }
    return {
      id: 'INV-GOV-08',
      status: 'FAIL',
      message: `Score ${reportedScore} reported but no forge report exists`,
    };
  }

  const proofPackScore = data.forgeReport.metrics.composite_score;
  if (reportedScore === proofPackScore) {
    return { id: 'INV-GOV-08', status: 'PASS', evidence: `score=${proofPackScore} matches ProofPack` };
  }
  return {
    id: 'INV-GOV-08',
    status: 'FAIL',
    message: `Reported score ${reportedScore} != ProofPack score ${proofPackScore}`,
  };
}
