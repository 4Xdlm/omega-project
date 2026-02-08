/**
 * OMEGA Scribe Engine -- Banality Gate
 * S-INV-08: Zero cliches, zero IA-speak, zero banned words. Total = 0.
 */

import type { Constraints } from '@omega/genesis-planner';
import type { ProseDoc, GateResult, GateViolation, SConfig } from '../types.js';

function findPatternOccurrences(text: string, patterns: readonly string[]): readonly { pattern: string; position: number }[] {
  const found: { pattern: string; position: number }[] = [];
  const lower = text.toLowerCase();
  for (const pattern of patterns) {
    const lowerPattern = pattern.toLowerCase();
    let idx = lower.indexOf(lowerPattern);
    while (idx !== -1) {
      found.push({ pattern, position: idx });
      idx = lower.indexOf(lowerPattern, idx + 1);
    }
  }
  return found;
}

export function runBanalityGate(
  prose: ProseDoc,
  constraints: Constraints,
  config: SConfig,
  timestamp: string,
): GateResult {
  const violations: GateViolation[] = [];
  const maxCount = config.BANALITY_MAX_COUNT.value as number;

  const iaPatterns = config.IA_SPEAK_PATTERNS.value as readonly string[];
  const clichePatterns = config.CLICHE_REGISTRY.value as readonly string[];
  const bannedWords = constraints.banned_words;
  const forbiddenCliches = constraints.forbidden_cliches;

  // Merge cliche registries
  const allCliches = [...clichePatterns];
  for (const fc of forbiddenCliches) {
    const lcFc = fc.toLowerCase();
    if (!allCliches.some((c) => c.toLowerCase() === lcFc)) {
      allCliches.push(fc);
    }
  }

  let totalBanalities = 0;

  for (const para of prose.paragraphs) {
    // Check IA-speak
    const iaHits = findPatternOccurrences(para.text, iaPatterns);
    for (const hit of iaHits) {
      totalBanalities++;
      violations.push({
        gate_id: 'BANALITY_GATE',
        invariant: 'S-INV-08',
        paragraph_id: para.paragraph_id,
        message: `IA-speak pattern found: "${hit.pattern}"`,
        severity: 'FATAL',
        details: `position: ${hit.position}`,
      });
    }

    // Check cliches
    const clicheHits = findPatternOccurrences(para.text, allCliches);
    for (const hit of clicheHits) {
      totalBanalities++;
      violations.push({
        gate_id: 'BANALITY_GATE',
        invariant: 'S-INV-08',
        paragraph_id: para.paragraph_id,
        message: `Cliche found: "${hit.pattern}"`,
        severity: 'FATAL',
        details: `position: ${hit.position}`,
      });
    }

    // Check banned words
    const lower = para.text.toLowerCase();
    for (const word of bannedWords) {
      const lowerWord = word.toLowerCase();
      // Match as whole word
      const regex = new RegExp(`\\b${lowerWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const matches = lower.match(regex);
      if (matches) {
        for (const _match of matches) {
          totalBanalities++;
          violations.push({
            gate_id: 'BANALITY_GATE',
            invariant: 'S-INV-08',
            paragraph_id: para.paragraph_id,
            message: `Banned word found: "${word}"`,
            severity: 'FATAL',
            details: `word: ${word}`,
          });
        }
      }
    }
  }

  const verdict = totalBanalities <= maxCount ? 'PASS' : 'FAIL';

  return {
    gate_id: 'BANALITY_GATE',
    verdict,
    violations,
    metrics: {
      ia_speak_count: violations.filter((v) => v.message.startsWith('IA-speak')).length,
      cliche_count: violations.filter((v) => v.message.startsWith('Cliche')).length,
      banned_word_count: violations.filter((v) => v.message.startsWith('Banned')).length,
      total_banalities: totalBanalities,
    },
    timestamp_deterministic: timestamp,
  };
}
