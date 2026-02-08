/**
 * OMEGA Creation Pipeline — Unified Truth Gate
 * Phase C.4 — C4-INV-04: Canon Lock
 * Checks that text content derives from canon + plan sources.
 */

import type {
  StyledOutput, GenesisPlan, IntentPack, C4Config,
  UnifiedGateResult, UnifiedGateViolation,
} from '../types.js';

export function runUnifiedTruthGate(
  styleOutput: StyledOutput,
  plan: GenesisPlan,
  input: IntentPack,
  config: C4Config,
  timestamp: string,
): UnifiedGateResult {
  const violations: UnifiedGateViolation[] = [];
  const threshold = config.E2E_TRUTH_THRESHOLD.value as number;

  // Build comprehensive set of known vocabulary from all sources
  const knownWords = new Set<string>();

  // From canon entries
  for (const entry of input.canon.entries) {
    for (const word of entry.statement.toLowerCase().split(/\s+/)) {
      if (word.length > 2) knownWords.add(word);
    }
  }

  // From plan arcs, scenes, beats, seeds
  for (const arc of plan.arcs) {
    knownWords.add(arc.theme.toLowerCase());
    for (const word of arc.justification.toLowerCase().split(/\s+/)) {
      if (word.length > 2) knownWords.add(word);
    }
    for (const scene of arc.scenes) {
      for (const word of scene.objective.toLowerCase().split(/\s+/)) {
        if (word.length > 2) knownWords.add(word);
      }
      for (const beat of scene.beats) {
        for (const word of beat.action.toLowerCase().split(/\s+/)) {
          if (word.length > 2) knownWords.add(word);
        }
      }
    }
  }

  // From seeds
  for (const seed of plan.seed_registry) {
    for (const word of seed.description.toLowerCase().split(/\s+/)) {
      if (word.length > 2) knownWords.add(word);
    }
  }

  // From intent (themes, premise, message)
  for (const theme of input.intent.themes) {
    knownWords.add(theme.toLowerCase());
  }
  for (const word of input.intent.premise.toLowerCase().split(/\s+/)) {
    if (word.length > 2) knownWords.add(word);
  }
  for (const word of input.intent.message.toLowerCase().split(/\s+/)) {
    if (word.length > 2) knownWords.add(word);
  }

  // From emotion waypoints
  for (const wp of input.emotion.waypoints) {
    knownWords.add(wp.emotion.toLowerCase());
  }

  // Check each paragraph — at least one sentence per paragraph must connect to known sources
  let totalParagraphs = 0;
  let supportedParagraphs = 0;

  for (const para of styleOutput.paragraphs) {
    totalParagraphs++;
    const text = para.text.toLowerCase();
    const words = text.split(/\s+/).filter((w: string) => w.length > 2);

    // Count how many words from this paragraph appear in known vocabulary
    const matchCount = words.filter((w: string) => knownWords.has(w)).length;
    const matchRatio = words.length > 0 ? matchCount / words.length : 0;

    // A paragraph is "supported" if at least 10% of its content words are from known sources
    if (matchRatio >= 0.1) {
      supportedParagraphs++;
    }
  }

  const truthRatio = totalParagraphs > 0 ? supportedParagraphs / totalParagraphs : 1;

  if (truthRatio < threshold) {
    violations.push({
      gate_id: 'U_TRUTH',
      invariant: 'C4-INV-04',
      location: 'global',
      message: `Truth ratio ${truthRatio.toFixed(3)} below threshold ${threshold}`,
      severity: 'FATAL',
      source_phase: 'C4',
    });
  }

  return {
    gate_id: 'U_TRUTH',
    verdict: violations.length === 0 ? 'PASS' : 'FAIL',
    violations,
    metrics: {
      truth_ratio: truthRatio,
      total_paragraphs: totalParagraphs,
      supported_paragraphs: supportedParagraphs,
      known_words: knownWords.size,
    },
    timestamp_deterministic: timestamp,
  };
}
