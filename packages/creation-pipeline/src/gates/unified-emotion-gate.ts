/**
 * OMEGA Creation Pipeline — Unified Emotion Gate
 * Phase C.4 — Emotion pivot coverage verification
 */

import type {
  StyledOutput, GenesisPlan, IntentPack, C4Config,
  UnifiedGateResult, UnifiedGateViolation,
} from '../types.js';

const EMOTION_KEYWORDS: Readonly<Record<string, readonly string[]>> = {
  fear: ['fear', 'afraid', 'terrif', 'dread', 'horror', 'fright', 'panic', 'trembl'],
  sadness: ['sad', 'grief', 'sorrow', 'mourn', 'weep', 'tear', 'loss', 'melanchol'],
  anger: ['anger', 'rage', 'fury', 'wrath', 'hostil', 'bitter'],
  joy: ['joy', 'happy', 'delight', 'bliss', 'elat', 'cheerful'],
  trust: ['trust', 'faith', 'confid', 'rely', 'loyal', 'believ'],
  anticipation: ['anticipat', 'expect', 'await', 'eager', 'watch', 'prepar'],
  surprise: ['surprise', 'shock', 'astonish', 'startle', 'unexpect', 'sudden'],
  disgust: ['disgust', 'revuls', 'repuls', 'loath', 'abhor', 'nause'],
  hope: ['hope', 'optimi', 'aspir', 'wish', 'dream', 'promis'],
};

export function runUnifiedEmotionGate(
  styleOutput: StyledOutput,
  _plan: GenesisPlan,
  input: IntentPack,
  _config: C4Config,
  timestamp: string,
): UnifiedGateResult {
  const violations: UnifiedGateViolation[] = [];

  // Get unique target emotions from waypoints
  const targetEmotions = new Set<string>();
  for (const wp of input.emotion.waypoints) {
    targetEmotions.add(wp.emotion);
  }

  // Build full text for scanning
  const fullText = styleOutput.paragraphs.map((p: { text: string }) => p.text).join(' ').toLowerCase();

  // Check coverage of each target emotion
  let coveredCount = 0;
  for (const emotion of targetEmotions) {
    const keywords = EMOTION_KEYWORDS[emotion] ?? [emotion];
    const found = keywords.some((kw) => fullText.includes(kw));
    if (found) {
      coveredCount++;
    } else {
      violations.push({
        gate_id: 'U_EMOTION',
        invariant: 'C4-INV-06',
        location: 'emotion_coverage',
        message: `Target emotion "${emotion}" not detected in final text`,
        severity: 'ERROR',
        source_phase: 'C4',
      });
    }
  }

  const coverage = targetEmotions.size > 0 ? coveredCount / targetEmotions.size : 1;

  // Require at least 50% of target emotions to be covered
  const minCoverage = 0.5;
  const passed = coverage >= minCoverage;

  return {
    gate_id: 'U_EMOTION',
    verdict: passed ? 'PASS' : 'FAIL',
    violations,
    metrics: {
      target_emotions: targetEmotions.size,
      covered_emotions: coveredCount,
      coverage,
    },
    timestamp_deterministic: timestamp,
  };
}
