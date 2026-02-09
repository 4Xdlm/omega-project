/**
 * OMEGA Governance — Report Summary
 * Phase F — Build summary and recommendations from CI result
 *
 * INV-F-07: Report is a pure function of gate results (no side effects).
 */

import type { CIResult, CISummary } from '../types.js';

/** Build summary from CI result */
export function buildSummary(result: CIResult): CISummary {
  const total = result.gates.length;
  const passed = result.gates.filter((g) => g.verdict === 'PASS').length;
  const failed = result.gates.filter((g) => g.verdict === 'FAIL').length;
  const skipped = result.gates.filter((g) => g.verdict === 'SKIPPED').length;

  return { total_gates: total, passed_gates: passed, failed_gates: failed, skipped_gates: skipped };
}

/** Build recommendations based on results */
export function buildRecommendations(result: CIResult): readonly string[] {
  const recommendations: string[] = [];

  for (const gate of result.gates) {
    if (gate.verdict === 'FAIL') {
      switch (gate.gate) {
        case 'G0':
          recommendations.push('Baseline integrity check failed. Verify or re-register baseline.');
          break;
        case 'G1':
          recommendations.push('Replay mismatch detected. Ensure same seed and pipeline version.');
          break;
        case 'G2':
          recommendations.push('Comparison found differences. Review artifact changes.');
          break;
        case 'G3':
          recommendations.push('Drift exceeds acceptable levels. Review drift report for details.');
          break;
        case 'G4':
          recommendations.push('Benchmark thresholds not met. Adjust parameters or investigate regression.');
          break;
        case 'G5':
          recommendations.push('Certification failed. Review cert checks for specific failures.');
          break;
      }
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('All gates passed. Candidate is conformant with baseline.');
  }

  return recommendations;
}
