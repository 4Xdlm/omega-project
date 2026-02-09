/**
 * OMEGA Governance — Gate Orchestrator
 * Phase F — Sequential gate execution with fail-fast
 *
 * INV-F-04: Gates execute sequentially G0→G5, fail-fast.
 */

import type { GateId, GateResult, GateContext } from './types.js';
import { GATE_ORDER, GATE_DEFINITIONS } from './types.js';
import type { CIConfig } from '../config.js';
import { executeG0 } from './g0-precheck.js';
import { executeG1 } from './g1-replay.js';
import { executeG2 } from './g2-compare.js';
import { executeG3 } from './g3-drift.js';
import { executeG4 } from './g4-bench.js';
import { executeG5 } from './g5-certify.js';

export interface OrchestratorResult {
  readonly gates: readonly GateResult[];
  readonly verdict: 'PASS' | 'FAIL';
  readonly failed_gate?: GateId;
  readonly duration_ms: number;
}

/** Execute all gates sequentially with fail-fast */
export function executeGates(ctx: GateContext, config: CIConfig): OrchestratorResult {
  const startTime = Date.now();
  const results: GateResult[] = [];
  let failedGate: GateId | undefined;

  for (const gateId of GATE_ORDER) {
    const result = executeGate(gateId, ctx, config);
    results.push(result);

    if (result.verdict === 'FAIL' && config.FAIL_FAST) {
      failedGate = gateId;
      // Mark remaining gates as SKIPPED
      const remaining = GATE_ORDER.slice(GATE_ORDER.indexOf(gateId) + 1);
      for (const skippedId of remaining) {
        results.push({
          gate: skippedId,
          name: GATE_DEFINITIONS[skippedId],
          verdict: 'SKIPPED',
          duration_ms: 0,
          details: [`Skipped due to ${gateId} failure`],
          checks: [],
        });
      }
      break;
    }

    if (result.verdict === 'FAIL') {
      failedGate = failedGate ?? gateId;
    }
  }

  const hasFail = results.some((r) => r.verdict === 'FAIL');

  return {
    gates: results,
    verdict: hasFail ? 'FAIL' : 'PASS',
    failed_gate: failedGate,
    duration_ms: Date.now() - startTime,
  };
}

function executeGate(gateId: GateId, ctx: GateContext, config: CIConfig): GateResult {
  switch (gateId) {
    case 'G0': return executeG0(ctx);
    case 'G1': return executeG1(ctx, config);
    case 'G2': return executeG2(ctx);
    case 'G3': return executeG3(ctx, config);
    case 'G4': return executeG4(ctx, config);
    case 'G5': return executeG5(ctx, config);
  }
}
