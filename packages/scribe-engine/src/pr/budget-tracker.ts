/**
 * OMEGA — BUDGET & LATENCY TRACKER
 * Phase: PR-2 | Invariant: INV-BUDGET-01
 *
 * Tracks cost and latency per LLM call and per run, enforcing budget envelopes.
 * FAIL if any budget exceeded or calibration field is null.
 */

import { readFileSync, existsSync } from 'node:fs';

// ============================================================================
// TYPES
// ============================================================================

export interface BudgetLimits {
  input_cost_per_1k: number;
  output_cost_per_1k: number;
  max_per_call_usd: number;
  max_per_run_usd: number;
}

export interface LatencyLimits {
  max_call_latency_ms: number;
  max_run_latency_ms: number;
  warn_call_latency_ms: number;
}

export interface BudgetCalibration {
  BUDGET_LIMITS: Record<string, BudgetLimits>;
  LATENCY_LIMITS: LatencyLimits;
}

export interface CallRecord {
  call_index: number;
  scene_id: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
  cost_usd: number;
  timestamp: string;
}

export interface BudgetViolation {
  type: 'cost_per_call' | 'cost_per_run' | 'latency_per_call' | 'latency_per_run' | 'calibration_null';
  value: number | string;
  limit: number | string;
  call_index?: number;
}

export interface BudgetReport {
  total_calls: number;
  total_cost_usd: number;
  total_latency_ms: number;
  budget_verdict: 'PASS' | 'FAIL';
  violations: BudgetViolation[];
  calls: CallRecord[];
}

// ============================================================================
// CALIBRATION LOADING (GAP-2B)
// ============================================================================

export function loadCalibrationFromFile(path: string): BudgetCalibration {
  if (!existsSync(path)) {
    throw new Error(`[budget-tracker] Calibration file not found: ${path}`);
  }

  try {
    const raw = readFileSync(path, 'utf8');
    const data = JSON.parse(raw);

    // GAP-2A: Check for null fields
    const requiredFields = ['BUDGET_LIMITS', 'LATENCY_LIMITS'];
    for (const field of requiredFields) {
      if (data[field] === null || data[field] === undefined) {
        throw new Error(`CALIBRATION_NULL: field ${field} is null or missing`);
      }
    }

    // Validate BUDGET_LIMITS structure
    if (typeof data.BUDGET_LIMITS !== 'object') {
      throw new Error(`CALIBRATION_NULL: BUDGET_LIMITS is not an object`);
    }

    for (const [model, limits] of Object.entries(data.BUDGET_LIMITS)) {
      const lim = limits as any;
      if (lim.input_cost_per_1k === null || lim.output_cost_per_1k === null ||
          lim.max_per_call_usd === null || lim.max_per_run_usd === null) {
        throw new Error(`CALIBRATION_NULL: BUDGET_LIMITS.${model} contains null fields`);
      }
    }

    // Validate LATENCY_LIMITS
    if (data.LATENCY_LIMITS === null || typeof data.LATENCY_LIMITS !== 'object') {
      throw new Error(`CALIBRATION_NULL: LATENCY_LIMITS is null or not an object`);
    }

    const latencyFields = ['max_call_latency_ms', 'max_run_latency_ms', 'warn_call_latency_ms'];
    for (const field of latencyFields) {
      if (data.LATENCY_LIMITS[field] === null || data.LATENCY_LIMITS[field] === undefined) {
        throw new Error(`CALIBRATION_NULL: LATENCY_LIMITS.${field} is null`);
      }
    }

    return {
      BUDGET_LIMITS: data.BUDGET_LIMITS,
      LATENCY_LIMITS: data.LATENCY_LIMITS,
    };
  } catch (err) {
    if (err instanceof Error && err.message.includes('CALIBRATION_NULL')) {
      throw err;
    }
    throw new Error(`[budget-tracker] Failed to load calibration: ${err}`);
  }
}

// ============================================================================
// BUDGET TRACKER
// ============================================================================

export class BudgetTracker {
  private calibration: BudgetCalibration;
  private calls: CallRecord[] = [];
  private totalCost = 0;
  private totalLatency = 0;

  constructor(calibration: BudgetCalibration) {
    this.calibration = calibration;
  }

  /**
   * Record a single LLM call and check per-call limits.
   */
  recordCall(
    sceneId: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
    latencyMs: number
  ): void {
    const limits = this.calibration.BUDGET_LIMITS[model];
    if (!limits) {
      throw new Error(`[budget-tracker] No budget limits defined for model: ${model}`);
    }

    const cost =
      (inputTokens / 1000) * limits.input_cost_per_1k +
      (outputTokens / 1000) * limits.output_cost_per_1k;

    this.calls.push({
      call_index: this.calls.length,
      scene_id: sceneId,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      latency_ms: latencyMs,
      cost_usd: cost,
      timestamp: new Date().toISOString(),
    });

    this.totalCost += cost;
    this.totalLatency += latencyMs;
  }

  /**
   * Finalize and generate budget report with PASS/FAIL verdict.
   */
  finalize(): BudgetReport {
    const violations: BudgetViolation[] = [];

    // Check per-call violations
    for (const call of this.calls) {
      const limits = this.calibration.BUDGET_LIMITS[call.model];

      if (call.cost_usd > limits.max_per_call_usd) {
        violations.push({
          type: 'cost_per_call',
          value: call.cost_usd,
          limit: limits.max_per_call_usd,
          call_index: call.call_index,
        });
      }

      if (call.latency_ms > this.calibration.LATENCY_LIMITS.max_call_latency_ms) {
        violations.push({
          type: 'latency_per_call',
          value: call.latency_ms,
          limit: this.calibration.LATENCY_LIMITS.max_call_latency_ms,
          call_index: call.call_index,
        });
      }
    }

    // Check per-run violations (use first model's run limit as proxy)
    const firstModel = this.calls[0]?.model;
    if (firstModel) {
      const runLimit = this.calibration.BUDGET_LIMITS[firstModel].max_per_run_usd;
      if (this.totalCost > runLimit) {
        violations.push({
          type: 'cost_per_run',
          value: this.totalCost,
          limit: runLimit,
        });
      }
    }

    if (this.totalLatency > this.calibration.LATENCY_LIMITS.max_run_latency_ms) {
      violations.push({
        type: 'latency_per_run',
        value: this.totalLatency,
        limit: this.calibration.LATENCY_LIMITS.max_run_latency_ms,
      });
    }

    const verdict = violations.length === 0 ? 'PASS' : 'FAIL';

    return {
      total_calls: this.calls.length,
      total_cost_usd: this.totalCost,
      total_latency_ms: this.totalLatency,
      budget_verdict: verdict,
      violations,
      calls: this.calls,
    };
  }

  /**
   * Check if budget is already exhausted (for early termination).
   */
  isBudgetExhausted(): boolean {
    if (this.calls.length === 0) return false;

    const firstModel = this.calls[0].model;
    const runLimit = this.calibration.BUDGET_LIMITS[firstModel]?.max_per_run_usd ?? Infinity;

    return this.totalCost >= runLimit;
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Estimate token count (rough approximation: 4 chars ≈ 1 token).
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
