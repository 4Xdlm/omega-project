/**
 * OMEGA Creation Pipeline — Unified Banality Gate
 * Phase C.4 — Zero tolerance for cliches, IA patterns, banned words
 */

import type {
  StyledOutput, IntentPack, C4Config,
  UnifiedGateResult, UnifiedGateViolation,
} from '../types.js';

const IA_PATTERNS: readonly string[] = [
  'it is worth noting', 'it should be noted', 'in conclusion',
  'furthermore', 'moreover', 'needless to say', 'as previously mentioned',
  'it goes without saying', 'at the end of the day', 'in terms of',
  'with regard to', 'it is important to', 'it is clear that',
  'one might argue', 'delve into', 'tapestry of', 'symphony of',
  'dance of', 'testament to', 'echoed through',
  'a sense of', 'in this context', 'on the other hand',
  'having said that', 'to be sure', 'it bears mentioning',
  'not unlike', 'inasmuch as', 'in the grand scheme',
  'it stands to reason', 'for all intents and purposes',
];


export function runUnifiedBanalityGate(
  styleOutput: StyledOutput,
  input: IntentPack,
  _config: C4Config,
  timestamp: string,
): UnifiedGateResult {
  const violations: UnifiedGateViolation[] = [];
  let clicheCount = 0;
  let iaSpeakCount = 0;
  let bannedWordCount = 0;

  const bannedWords = input.constraints.banned_words;
  const forbiddenCliches = input.constraints.forbidden_cliches;

  for (const para of styleOutput.paragraphs) {
    const textLower = para.text.toLowerCase();

    // Check IA patterns
    for (const pattern of IA_PATTERNS) {
      if (textLower.includes(pattern)) {
        iaSpeakCount++;
        violations.push({
          gate_id: 'U_BANALITY',
          invariant: 'C4-INV-06',
          location: para.paragraph_id,
          message: `IA pattern detected: "${pattern}"`,
          severity: 'ERROR',
          source_phase: 'C4',
        });
      }
    }

    // Check forbidden cliches
    for (const cliche of forbiddenCliches) {
      if (textLower.includes(cliche.toLowerCase())) {
        clicheCount++;
        violations.push({
          gate_id: 'U_BANALITY',
          invariant: 'C4-INV-06',
          location: para.paragraph_id,
          message: `Forbidden cliche: "${cliche}"`,
          severity: 'FATAL',
          source_phase: 'C4',
        });
      }
    }

    // Check banned words
    for (const word of bannedWords) {
      const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(para.text)) {
        bannedWordCount++;
        violations.push({
          gate_id: 'U_BANALITY',
          invariant: 'C4-INV-06',
          location: para.paragraph_id,
          message: `Banned word: "${word}"`,
          severity: 'FATAL',
          source_phase: 'C4',
        });
      }
    }
  }

  return {
    gate_id: 'U_BANALITY',
    verdict: violations.length === 0 ? 'PASS' : 'FAIL',
    violations,
    metrics: {
      cliche_count: clicheCount,
      ia_speak_count: iaSpeakCount,
      banned_word_count: bannedWordCount,
      total_findings: clicheCount + iaSpeakCount + bannedWordCount,
    },
    timestamp_deterministic: timestamp,
  };
}
