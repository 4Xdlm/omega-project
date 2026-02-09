/**
 * OMEGA Governance — Run Differ
 * Phase D.2 — Compare complete ProofPack runs
 *
 * INV-GOV-03: compare(A,B).diffs = inverse(compare(B,A).diffs)
 */

import type { ProofPackData } from '../core/types.js';
import type { CompareResult, CompareSummary } from './types.js';
import { diffArtifacts, countDiffsByStatus } from './artifact-differ.js';
import { diffScores } from './score-differ.js';

/** Compare two complete ProofPack runs */
export function compareRuns(left: ProofPackData, right: ProofPackData): CompareResult {
  const diffs = diffArtifacts(left.manifest.artifacts, right.manifest.artifacts);
  const counts = countDiffsByStatus(diffs);

  const totalPaths = new Set([
    ...left.manifest.artifacts.map((a) => a.path),
    ...right.manifest.artifacts.map((a) => a.path),
  ]);

  const summary: CompareSummary = {
    total_artifacts: totalPaths.size,
    identical: counts.IDENTICAL,
    different: counts.DIFFERENT,
    missing_in_first: counts.MISSING_LEFT,
    missing_in_second: counts.MISSING_RIGHT,
  };

  const identical = counts.DIFFERENT === 0 && counts.MISSING_LEFT === 0 && counts.MISSING_RIGHT === 0;

  const score_comparison = (left.forgeReport && right.forgeReport)
    ? diffScores(left.forgeReport, right.forgeReport)
    : null;

  return {
    runs: [left.runId, right.runId],
    identical,
    summary,
    diffs,
    score_comparison,
  };
}

/** Compare multiple runs (pairwise with first as reference) */
export function compareMultipleRuns(runs: readonly ProofPackData[]): readonly CompareResult[] {
  if (runs.length < 2) {
    throw new Error('At least 2 runs required for comparison');
  }
  const results: CompareResult[] = [];
  const reference = runs[0];
  for (let i = 1; i < runs.length; i++) {
    results.push(compareRuns(reference, runs[i]));
  }
  return results;
}
