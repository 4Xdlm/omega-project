/**
 * OMEGA Governance — Invariant Checker
 * Phase D.2 — Runtime verification of all 8 governance invariants
 */

import type { GovInvariantResult, ProofPackData, FileStat } from '../core/types.js';
import type { CompareResult } from '../compare/types.js';
import type { DriftReport } from '../drift/types.js';
import {
  checkReadOnly,
  checkHashTrust,
  checkCompareSymmetric,
  checkDriftExplicit,
  checkBenchDeterministic,
  checkCertStable,
  checkLogAppendOnly,
  checkReportDerived,
} from './gov-invariants.js';

export {
  checkReadOnly,
  checkHashTrust,
  checkCompareSymmetric,
  checkDriftExplicit,
  checkBenchDeterministic,
  checkCertStable,
  checkLogAppendOnly,
  checkReportDerived,
};

/** Run a subset of invariants that can be checked with available data */
export function checkAvailableInvariants(params: {
  beforeStats?: Map<string, FileStat>;
  afterStats?: Map<string, FileStat>;
  manifestHashValid?: boolean;
  merkleRootValid?: boolean;
  compareAB?: CompareResult;
  compareBA?: CompareResult;
  driftReport?: DriftReport;
  benchHash1?: string;
  benchHash2?: string;
  certSig1?: string;
  certSig2?: string;
  logLinesBefore?: number;
  logLinesAfter?: number;
  proofPackData?: ProofPackData;
  reportedScore?: number;
}): readonly GovInvariantResult[] {
  const results: GovInvariantResult[] = [];

  if (params.beforeStats && params.afterStats) {
    results.push(checkReadOnly(params.beforeStats, params.afterStats));
  }

  if (params.manifestHashValid !== undefined && params.merkleRootValid !== undefined) {
    results.push(checkHashTrust(params.manifestHashValid, params.merkleRootValid));
  }

  if (params.compareAB && params.compareBA) {
    results.push(checkCompareSymmetric(params.compareAB, params.compareBA));
  }

  if (params.driftReport) {
    results.push(checkDriftExplicit(params.driftReport));
  }

  if (params.benchHash1 !== undefined && params.benchHash2 !== undefined) {
    results.push(checkBenchDeterministic(params.benchHash1, params.benchHash2));
  }

  if (params.certSig1 !== undefined && params.certSig2 !== undefined) {
    results.push(checkCertStable(params.certSig1, params.certSig2));
  }

  if (params.logLinesBefore !== undefined && params.logLinesAfter !== undefined) {
    results.push(checkLogAppendOnly(params.logLinesBefore, params.logLinesAfter));
  }

  if (params.proofPackData && params.reportedScore !== undefined) {
    results.push(checkReportDerived(params.proofPackData, params.reportedScore));
  }

  return results;
}
