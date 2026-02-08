/**
 * OMEGA Style Emergence Engine -- Banality Detector
 * Phase C.3 -- Detect cliches, IA-speak, banned words, generic transitions
 */

import type { ProseParagraph } from '@omega/scribe-engine';
import type { Constraints } from '@omega/genesis-planner';
import type { EConfig, BanalityResult, EVerdict } from '../types.js';

const GENERIC_TRANSITIONS = [
  'then,', 'then ', 'after that,', 'after that ', 'next,', 'next ',
  'meanwhile,', 'meanwhile ', 'however,', 'however ', 'therefore,',
  'therefore ', 'consequently,', 'consequently ', 'subsequently,',
  'subsequently ', 'in addition,', 'in addition ',
];

const CLICHE_REGISTRY: readonly string[] = [
  'dark and stormy night', 'heart pounding', 'blood ran cold',
  'butterflies in stomach', 'light at the end of the tunnel', 'tip of the iceberg',
  'hit the nail on the head', 'time stood still', 'silence was deafening',
  'breath caught in throat', 'tears streamed down', 'world came crashing down',
  'cold sweat', 'sigh of relief', 'knot in stomach',
];

export function detectBanality(
  paragraphs: readonly ProseParagraph[],
  constraints: Constraints,
  config: EConfig,
): BanalityResult {
  const iaPatterns = config.IA_DETECTION_PATTERNS.value as readonly string[];
  const findings: string[] = [];
  let clicheCount = 0;
  let iaSpeakCount = 0;
  let genericTransitionCount = 0;

  const fullText = paragraphs.map((p) => p.text).join('\n');
  const lowerText = fullText.toLowerCase();

  for (const cliche of CLICHE_REGISTRY) {
    if (lowerText.includes(cliche.toLowerCase())) {
      clicheCount++;
      findings.push(`cliche: ${cliche}`);
    }
  }

  for (const cliche of constraints.forbidden_cliches) {
    if (lowerText.includes(cliche.toLowerCase())) {
      clicheCount++;
      findings.push(`forbidden_cliche: ${cliche}`);
    }
  }

  for (const pattern of iaPatterns) {
    if (lowerText.includes(pattern.toLowerCase())) {
      iaSpeakCount++;
      findings.push(`ia_speak: ${pattern}`);
    }
  }

  for (const banned of constraints.banned_words) {
    if (lowerText.includes(banned.toLowerCase())) {
      findings.push(`banned_word: ${banned}`);
    }
  }

  for (const para of paragraphs) {
    const lower = para.text.toLowerCase().trim();
    for (const transition of GENERIC_TRANSITIONS) {
      if (lower.startsWith(transition)) {
        genericTransitionCount++;
        findings.push(`generic_transition: "${transition.trim()}" in ${para.paragraph_id}`);
        break;
      }
    }
  }

  const totalBanality = clicheCount + iaSpeakCount + genericTransitionCount;
  const verdict: EVerdict = totalBanality === 0 ? 'PASS' : 'FAIL';

  return {
    cliche_count: clicheCount,
    ia_speak_count: iaSpeakCount,
    generic_transition_count: genericTransitionCount,
    total_banality: totalBanality,
    verdict,
    findings,
  };
}
