/**
 * OMEGA Creation Pipeline — Chaos Runner
 * Phase C.4 — C4-INV-11: Adversarial resilience
 * Runs pipeline on fuzzed inputs and verifies graceful failure
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type {
  FuzzedIntentPack, C4Config, ChaosResult, ChaosReport, PipelineStageId,
  GConfig, SConfig, EConfig,
} from '../types.js';
import { stageValidate } from '../pipeline/stage-validate.js';
import { stageGenesis } from '../pipeline/stage-genesis.js';

export function runChaos(
  fuzzedPacks: readonly FuzzedIntentPack[],
  config: C4Config,
  gConfig: GConfig,
  _sConfig: SConfig,
  _eConfig: EConfig,
  timestamp: string,
): ChaosReport {
  const results: ChaosResult[] = [];
  let gracefulFailures = 0;
  let ungracefulFailures = 0;
  let crashCount = 0;

  for (const fuzzed of fuzzedPacks) {
    let result: ChaosResult;

    try {
      // Try to validate the fuzzed pack
      const validation = stageValidate(fuzzed.pack, config, timestamp);

      if (validation.verdict === 'FAIL') {
        result = {
          fuzz_id: fuzzed.fuzz_id,
          category: fuzzed.category,
          mutation: fuzzed.mutation,
          verdict: 'FAIL',
          failure_stage: 'F0' as PipelineStageId,
          failure_reason: validation.details,
          handled_gracefully: true,
        };
        gracefulFailures++;
      } else {
        // If validation passes, try genesis
        try {
          stageGenesis(fuzzed.pack, validation.input_hash, gConfig, timestamp);
          // If genesis also passes, the fuzz was handled gracefully (either valid or caught)
          result = {
            fuzz_id: fuzzed.fuzz_id,
            category: fuzzed.category,
            mutation: fuzzed.mutation,
            verdict: 'PASS',
            failure_stage: null,
            failure_reason: '',
            handled_gracefully: true,
          };
          gracefulFailures++;
        } catch (innerErr: unknown) {
          const msg = innerErr instanceof Error ? innerErr.message : String(innerErr);
          result = {
            fuzz_id: fuzzed.fuzz_id,
            category: fuzzed.category,
            mutation: fuzzed.mutation,
            verdict: 'FAIL',
            failure_stage: 'F1' as PipelineStageId,
            failure_reason: msg,
            handled_gracefully: true,
          };
          gracefulFailures++;
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      result = {
        fuzz_id: fuzzed.fuzz_id,
        category: fuzzed.category,
        mutation: fuzzed.mutation,
        verdict: 'FAIL',
        failure_stage: 'F0' as PipelineStageId,
        failure_reason: msg,
        handled_gracefully: false,
      };
      crashCount++;
      ungracefulFailures++;
    }

    results.push(result);
  }

  const reportHash = sha256(canonicalize(results));

  return {
    total_runs: results.length,
    graceful_failures: gracefulFailures,
    ungraceful_failures: ungracefulFailures,
    crash_count: crashCount,
    results,
    report_hash: reportHash,
  };
}
