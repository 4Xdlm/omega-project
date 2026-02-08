/**
 * OMEGA Creation Pipeline — Unified Style Gate
 * Phase C.4 — Style compliance at E2E level
 */

import type {
  StyledOutput, IntentPack, C4Config,
  UnifiedGateResult, UnifiedGateViolation,
} from '../types.js';

export function runUnifiedStyleGate(
  styleOutput: StyledOutput,
  _input: IntentPack,
  config: C4Config,
  timestamp: string,
): UnifiedGateResult {
  const violations: UnifiedGateViolation[] = [];
  const threshold = config.E2E_STYLE_THRESHOLD.value as number;

  const profile = styleOutput.global_profile;
  const dev = profile.genome_deviation;

  // Check each axis
  if (Math.abs(dev.burstiness_delta) > (1 - threshold)) {
    violations.push({
      gate_id: 'U_STYLE',
      invariant: 'C4-INV-06',
      location: 'burstiness',
      message: `Burstiness deviation ${dev.burstiness_delta.toFixed(3)} exceeds E2E tolerance`,
      severity: 'ERROR',
      source_phase: 'C4',
    });
  }

  if (Math.abs(dev.lexical_richness_delta) > (1 - threshold)) {
    violations.push({
      gate_id: 'U_STYLE',
      invariant: 'C4-INV-06',
      location: 'lexical_richness',
      message: `Lexical richness deviation ${dev.lexical_richness_delta.toFixed(3)} exceeds E2E tolerance`,
      severity: 'ERROR',
      source_phase: 'C4',
    });
  }

  if (Math.abs(dev.sentence_length_delta) > (1 - threshold)) {
    violations.push({
      gate_id: 'U_STYLE',
      invariant: 'C4-INV-06',
      location: 'sentence_length',
      message: `Sentence length deviation ${dev.sentence_length_delta.toFixed(3)} exceeds E2E tolerance`,
      severity: 'ERROR',
      source_phase: 'C4',
    });
  }

  // Check IA detection score from C.3 result
  if (styleOutput.ia_detection.score > 0.3) {
    violations.push({
      gate_id: 'U_STYLE',
      invariant: 'C4-INV-06',
      location: 'ia_detection',
      message: `IA detection score ${styleOutput.ia_detection.score} exceeds 0.3`,
      severity: 'ERROR',
      source_phase: 'C3',
    });
  }

  // Check genre specificity from C.3 result
  if (styleOutput.genre_detection.specificity > 0.6) {
    violations.push({
      gate_id: 'U_STYLE',
      invariant: 'C4-INV-06',
      location: 'genre_specificity',
      message: `Genre specificity ${styleOutput.genre_detection.specificity} exceeds 0.6`,
      severity: 'ERROR',
      source_phase: 'C3',
    });
  }

  const compliance = 1 - dev.max_deviation;

  return {
    gate_id: 'U_STYLE',
    verdict: violations.length === 0 ? 'PASS' : 'FAIL',
    violations,
    metrics: {
      compliance,
      max_deviation: dev.max_deviation,
      burstiness_delta: Math.abs(dev.burstiness_delta),
      lexical_delta: Math.abs(dev.lexical_richness_delta),
      ia_score: styleOutput.ia_detection.score,
      genre_specificity: styleOutput.genre_detection.specificity,
    },
    timestamp_deterministic: timestamp,
  };
}
