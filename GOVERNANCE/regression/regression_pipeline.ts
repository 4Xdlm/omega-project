/**
 * REGRESSION PIPELINE — Orchestrate non-regression checking
 *
 * INV-REGR-001: Snapshot immutability
 * INV-REGR-002: Backward compatibility default
 * INV-REGR-003: Breaking change explicit
 * INV-REGR-004: WAIVER human-signed
 * INV-REGR-005: Regression test mandatory
 *
 * NON-ACTUATING: Returns report, does nothing else.
 */

import type {
  RegressionPipelineArgs,
  RegressionMatrix,
  SealedBaseline,
  CandidateVersion,
  RegressionWaiver,
  RegressionCheckResult
} from './types.js';

import { runRegressionCheck } from './regression_runner.js';
import { buildRegressionMatrix, GENERATOR } from './matrix_builder.js';
import { isBaselineApplicable } from './baseline_registry.js';

// ─────────────────────────────────────────────────────────────
// PIPELINE FUNCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * Run the full regression pipeline.
 *
 * Workflow:
 * 1. Validate inputs (INV-REGR-005: baselines required)
 * 2. Filter applicable baselines (SEALED only)
 * 3. Run regression check against each baseline
 * 4. Aggregate results into matrix
 * 5. Determine overall status
 * 6. Generate REGRESSION_MATRIX
 *
 * INV-REGR-002: Pure function - no I/O, no side effects.
 * NON-ACTUATING: Returns report, does nothing else.
 *
 * @param args - Pipeline inputs
 * @returns Complete RegressionMatrix
 * @throws Error if no baselines provided (INV-REGR-005)
 */
export function runRegressionPipeline(
  args: RegressionPipelineArgs
): RegressionMatrix {
  return runRegressionPipelineWithChecker(args, runRegressionCheck);
}

/**
 * Run pipeline with custom checker (for testing).
 * Same guarantees as runRegressionPipeline.
 * @param args - Pipeline inputs
 * @param checker - Custom regression checker function
 * @returns Complete RegressionMatrix
 */
export function runRegressionPipelineWithChecker(
  args: RegressionPipelineArgs,
  checker: (
    baseline: SealedBaseline,
    candidate: CandidateVersion,
    waivers: readonly RegressionWaiver[]
  ) => RegressionCheckResult
): RegressionMatrix {
  const { baselines, candidate, waivers, generatedAt, prevEventHash } = args;

  // INV-REGR-005: Regression test mandatory - baselines required
  if (!baselines || baselines.length === 0) {
    throw new Error('INV-REGR-005: At least one baseline is required for regression testing');
  }

  // Filter to only applicable baselines (SEALED with valid test results)
  const applicableBaselines = filterApplicableBaselines(baselines);

  // INV-REGR-005: At least one applicable baseline required
  if (applicableBaselines.length === 0) {
    throw new Error('INV-REGR-005: No applicable baselines found (must be SEALED with valid test results)');
  }

  // Run regression check against each baseline
  const entries: RegressionCheckResult[] = [];

  for (const baseline of applicableBaselines) {
    // Match waivers for this specific baseline
    const matchingWaivers = matchWaivers(waivers, baseline.baseline_id);

    // Run the check
    const result = checker(baseline, candidate, matchingWaivers);
    entries.push(result);
  }

  // Build and return the matrix
  return buildRegressionMatrix(
    entries,
    candidate,
    generatedAt,
    prevEventHash
  );
}

// ─────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * Filter baselines to only applicable ones.
 * @param baselines - All baselines
 * @returns Only SEALED baselines with valid test results
 */
export function filterApplicableBaselines(
  baselines: readonly SealedBaseline[]
): readonly SealedBaseline[] {
  return baselines.filter(isBaselineApplicable);
}

/**
 * Match waivers to a specific baseline.
 * @param waivers - All waivers
 * @param baselineId - Baseline ID to match
 * @returns Waivers applicable to this baseline
 */
export function matchWaivers(
  waivers: readonly RegressionWaiver[],
  baselineId: string
): readonly RegressionWaiver[] {
  return waivers.filter(w =>
    w.baseline_id === baselineId && w.status === 'ACTIVE'
  );
}

// Re-export generator for consistency
export { GENERATOR };
