/**
 * OMEGA RESILIENCE PROOF SYSTEM
 * Temporal Logic - Verifier
 * 
 * Phase 23 - Sprint 23.2
 * 
 * Verifies temporal invariants against execution traces.
 * Produces verification reports with counterexamples.
 */

import {
  TemporalInvariant,
  VerificationResult,
  VerificationSummary,
  Trace,
  EvaluationResult,
  InvariantSeverity,
} from './types.js';
import { LTLEvaluator } from './evaluator.js';

// ═══════════════════════════════════════════════════════════════════════════════
// VERIFIER CLASS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Temporal Invariant Verifier
 */
export class TemporalVerifier {
  private readonly invariants: TemporalInvariant[];
  private readonly traces: Trace[];

  constructor(invariants: TemporalInvariant[], traces: Trace[] = []) {
    this.invariants = [...invariants];
    this.traces = [...traces];
  }

  /**
   * Add a trace to verify against
   */
  addTrace(trace: Trace): void {
    this.traces.push(trace);
  }

  /**
   * Add multiple traces
   */
  addTraces(traces: Trace[]): void {
    this.traces.push(...traces);
  }

  /**
   * Verify a single invariant against all traces
   */
  verifyInvariant(invariant: TemporalInvariant): VerificationResult {
    const startTime = Date.now();
    const evaluations: EvaluationResult[] = [];
    let holds = true;

    for (const trace of this.traces) {
      const evaluator = new LTLEvaluator(trace);
      const result = evaluator.evaluate(invariant.formula);
      evaluations.push(result);

      if (!result.result) {
        holds = false;
      }
    }

    // If expected to hold but doesn't (or vice versa), that's a failure
    const expectedResult = invariant.expectedToHold ? holds : !holds;

    return {
      invariant,
      holds: expectedResult,
      evaluations,
      counterexamples: evaluations
        .filter(e => !e.result)
        .map(e => e.counterexample!)
        .filter(c => c !== null),
      verifiedAt: new Date(),
      executionTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Verify all invariants
   */
  verifyAll(): VerificationSummary {
    const results: VerificationResult[] = [];
    let passed = 0;
    let failed = 0;

    for (const invariant of this.invariants) {
      const result = this.verifyInvariant(invariant);
      results.push(result);

      if (result.holds) {
        passed++;
      } else {
        failed++;
      }
    }

    const criticalViolations = results.filter(
      r => !r.holds && r.invariant.severity === InvariantSeverity.CRITICAL
    );

    return {
      totalInvariants: this.invariants.length,
      passed,
      failed,
      results,
      criticalViolations,
      allPassed: failed === 0,
    };
  }

  /**
   * Verify only critical invariants
   */
  verifyCritical(): VerificationSummary {
    const criticalInvariants = this.invariants.filter(
      inv => inv.severity === InvariantSeverity.CRITICAL
    );

    const verifier = new TemporalVerifier(criticalInvariants, this.traces);
    return verifier.verifyAll();
  }

  /**
   * Quick check - just returns pass/fail for all invariants
   */
  quickCheck(): { allPassed: boolean; failedCount: number; criticalFailures: number } {
    let failedCount = 0;
    let criticalFailures = 0;

    for (const invariant of this.invariants) {
      let holds = true;

      for (const trace of this.traces) {
        const evaluator = new LTLEvaluator(trace);
        const result = evaluator.evaluate(invariant.formula);

        if (!result.result && invariant.expectedToHold) {
          holds = false;
          break;
        }
      }

      if (!holds) {
        failedCount++;
        if (invariant.severity === InvariantSeverity.CRITICAL) {
          criticalFailures++;
        }
      }
    }

    return {
      allPassed: failedCount === 0,
      failedCount,
      criticalFailures,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a verifier for given invariants and traces
 */
export function createVerifier(
  invariants: TemporalInvariant[],
  traces: Trace[] = []
): TemporalVerifier {
  return new TemporalVerifier(invariants, traces);
}

/**
 * Quick verification of invariants against a single trace
 */
export function verifyAgainstTrace(
  invariants: TemporalInvariant[],
  trace: Trace
): VerificationSummary {
  return new TemporalVerifier(invariants, [trace]).verifyAll();
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORT GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a text report from verification summary
 */
export function generateReport(summary: VerificationSummary): string {
  const lines: string[] = [];

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('           TEMPORAL VERIFICATION REPORT');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`Total Invariants: ${summary.totalInvariants}`);
  lines.push(`Passed: ${summary.passed}`);
  lines.push(`Failed: ${summary.failed}`);
  lines.push(`Status: ${summary.allPassed ? '✅ ALL PASSED' : '❌ FAILURES DETECTED'}`);
  lines.push('');

  if (summary.criticalViolations.length > 0) {
    lines.push('⚠️  CRITICAL VIOLATIONS:');
    lines.push('───────────────────────────────────────────────────────────────');
    for (const violation of summary.criticalViolations) {
      lines.push(`  • ${violation.invariant.id}: ${violation.invariant.name}`);
      lines.push(`    ${violation.invariant.description}`);
      if (violation.counterexamples.length > 0) {
        lines.push(`    Counterexample at state ${violation.counterexamples[0]!.stateIndex}`);
      }
    }
    lines.push('');
  }

  lines.push('DETAILED RESULTS:');
  lines.push('───────────────────────────────────────────────────────────────');

  for (const result of summary.results) {
    const status = result.holds ? '✅' : '❌';
    const severity = result.invariant.severity;
    lines.push(`${status} [${severity}] ${result.invariant.id}: ${result.invariant.name}`);
    
    if (!result.holds && result.counterexamples.length > 0) {
      const ce = result.counterexamples[0]!;
      lines.push(`   └─ Violation at state ${ce.stateIndex}: ${ce.reason}`);
    }
  }

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}

/**
 * Generate JSON report
 */
export function generateJsonReport(summary: VerificationSummary): object {
  return {
    timestamp: new Date().toISOString(),
    summary: {
      total: summary.totalInvariants,
      passed: summary.passed,
      failed: summary.failed,
      allPassed: summary.allPassed,
      criticalViolations: summary.criticalViolations.length,
    },
    results: summary.results.map(r => ({
      invariantId: r.invariant.id,
      name: r.invariant.name,
      severity: r.invariant.severity,
      category: r.invariant.category,
      holds: r.holds,
      executionTimeMs: r.executionTimeMs,
      counterexamples: r.counterexamples.map(ce => ({
        stateIndex: ce.stateIndex,
        reason: ce.reason,
      })),
    })),
  };
}
