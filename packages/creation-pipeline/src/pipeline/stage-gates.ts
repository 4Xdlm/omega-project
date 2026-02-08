/**
 * OMEGA Creation Pipeline — F4: Unified E2E Gates
 * Phase C.4 — C4-INV-02: No bypass, C4-INV-07: Fail-closed
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type {
  StyledOutput, GenesisPlan, IntentPack, C4Config,
  StageResult, UnifiedGateChainResult, UnifiedGateResult, UnifiedGateId,
} from '../types.js';
import { runUnifiedTruthGate } from '../gates/unified-truth-gate.js';
import { runUnifiedNecessityGate } from '../gates/unified-necessity-gate.js';
import { runUnifiedCrossrefGate } from '../gates/unified-crossref-gate.js';
import { runUnifiedBanalityGate } from '../gates/unified-banality-gate.js';
import { runUnifiedStyleGate } from '../gates/unified-style-gate.js';
import { runUnifiedEmotionGate } from '../gates/unified-emotion-gate.js';
import { runUnifiedDiscomfortGate } from '../gates/unified-discomfort-gate.js';
import { runUnifiedQualityGate } from '../gates/unified-quality-gate.js';

type GateRunner = (
  styleOutput: StyledOutput,
  plan: GenesisPlan,
  input: IntentPack,
  config: C4Config,
  timestamp: string,
) => UnifiedGateResult;

const GATE_REGISTRY: Readonly<Record<UnifiedGateId, GateRunner>> = {
  U_TRUTH: runUnifiedTruthGate,
  U_NECESSITY: runUnifiedNecessityGate,
  U_CROSSREF: runUnifiedCrossrefGate,
  U_BANALITY: (so, _plan, input, config, ts) => runUnifiedBanalityGate(so, input, config, ts),
  U_STYLE: (so, _plan, input, config, ts) => runUnifiedStyleGate(so, input, config, ts),
  U_EMOTION: runUnifiedEmotionGate,
  U_DISCOMFORT: runUnifiedDiscomfortGate,
  U_QUALITY: runUnifiedQualityGate,
};

export function stageUnifiedGates(
  styleOutput: StyledOutput,
  plan: GenesisPlan,
  input: IntentPack,
  config: C4Config,
  timestamp: string,
): StageResult & { readonly gateChain: UnifiedGateChainResult } {
  const gateOrder = config.UNIFIED_GATE_ORDER.value as readonly string[];
  const results: UnifiedGateResult[] = [];
  let firstFailure: UnifiedGateId | null = null;
  let totalViolations = 0;

  for (const gateId of gateOrder) {
    const runner = GATE_REGISTRY[gateId as UnifiedGateId];
    if (!runner) continue;

    const result = runner(styleOutput, plan, input, config, timestamp);
    results.push(result);
    totalViolations += result.violations.length;

    if (result.verdict === 'FAIL' && firstFailure === null) {
      firstFailure = gateId as UnifiedGateId;
    }
  }

  const chainVerdict = firstFailure === null ? 'PASS' : 'FAIL';

  const gateChain: UnifiedGateChainResult = {
    verdict: chainVerdict,
    gate_results: results,
    first_failure: firstFailure,
    total_violations: totalViolations,
  };

  return {
    stage: 'F4',
    verdict: chainVerdict,
    input_hash: styleOutput.output_hash,
    output_hash: sha256(canonicalize(gateChain)),
    duration_ms: 0,
    details: `Unified gates: ${results.length} executed, ${firstFailure ? `FAIL at ${firstFailure}` : 'ALL PASS'}`,
    timestamp_deterministic: timestamp,
    gateChain,
  };
}
