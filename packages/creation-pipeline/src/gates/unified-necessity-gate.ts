/**
 * OMEGA Creation Pipeline — Unified Necessity Gate
 * Phase C.4 — C4-INV-05: Every paragraph is necessary
 */

import type {
  StyledOutput, GenesisPlan, IntentPack, C4Config,
  UnifiedGateResult, UnifiedGateViolation,
} from '../types.js';

function measureCoverage(paragraphs: readonly { readonly text: string }[]): number {
  const allText = paragraphs.map((p) => p.text).join(' ');
  const words = allText.split(/\s+/).filter((w) => w.length > 0);
  const unique = new Set(words.map((w) => w.toLowerCase()));
  return unique.size;
}

export function runUnifiedNecessityGate(
  styleOutput: StyledOutput,
  _plan: GenesisPlan,
  _input: IntentPack,
  config: C4Config,
  timestamp: string,
): UnifiedGateResult {
  const violations: UnifiedGateViolation[] = [];
  const threshold = config.NECESSITY_ABLATION_THRESHOLD.value as number;

  const baseCoverage = measureCoverage(styleOutput.paragraphs);
  let removableCount = 0;

  for (const para of styleOutput.paragraphs) {
    // Ablation: remove this paragraph and measure degradation
    const remaining = styleOutput.paragraphs.filter((p: { paragraph_id: string }) => p.paragraph_id !== para.paragraph_id);
    if (remaining.length === 0) continue;

    const ablatedCoverage = measureCoverage(remaining);
    const retainedRatio = baseCoverage > 0 ? ablatedCoverage / baseCoverage : 1;

    if (retainedRatio >= threshold) {
      removableCount++;
      violations.push({
        gate_id: 'U_NECESSITY',
        invariant: 'C4-INV-05',
        location: para.paragraph_id,
        message: `Paragraph removable without degradation (retained ${retainedRatio.toFixed(3)} >= ${threshold})`,
        severity: 'ERROR',
        source_phase: 'C4',
      });
    }
  }

  return {
    gate_id: 'U_NECESSITY',
    verdict: violations.length === 0 ? 'PASS' : 'FAIL',
    violations,
    metrics: {
      base_coverage: baseCoverage,
      removable_paragraphs: removableCount,
      total_paragraphs: styleOutput.paragraphs.length,
    },
    timestamp_deterministic: timestamp,
  };
}
