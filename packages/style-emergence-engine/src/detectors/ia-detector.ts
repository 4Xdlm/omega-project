/**
 * OMEGA Style Emergence Engine -- IA Detector
 * Phase C.3 -- Scan for IA-generated text patterns
 */

import type { ProseParagraph } from '@omega/scribe-engine';
import type { EConfig, IADetectionResult, DetectionFinding, EVerdict } from '../types.js';

export function detectIA(paragraphs: readonly ProseParagraph[], config: EConfig): IADetectionResult {
  const patterns = config.IA_DETECTION_PATTERNS.value as readonly string[];
  const maxScore = config.IA_MAX_DETECTION_SCORE.value as number;

  const findings: DetectionFinding[] = [];
  const patternsFound = new Set<string>();

  for (const para of paragraphs) {
    const lowerText = para.text.toLowerCase();
    for (const pattern of patterns) {
      if (lowerText.includes(pattern.toLowerCase())) {
        patternsFound.add(pattern);
        const severity = determineSeverity(pattern);
        const contextStart = Math.max(0, lowerText.indexOf(pattern.toLowerCase()) - 20);
        const contextEnd = Math.min(lowerText.length, lowerText.indexOf(pattern.toLowerCase()) + pattern.length + 20);
        findings.push({
          pattern,
          paragraph_id: para.paragraph_id,
          context: para.text.slice(contextStart, contextEnd),
          severity,
        });
      }
    }
  }

  const maxPatternsPerParagraph = 5;
  const denominator = Math.max(1, paragraphs.length * maxPatternsPerParagraph);
  const score = Math.min(1, findings.length / denominator);
  const verdict: EVerdict = score <= maxScore ? 'PASS' : 'FAIL';

  return {
    score,
    patterns_found: [...patternsFound],
    pattern_count: patternsFound.size,
    verdict,
    details: findings,
  };
}

function determineSeverity(pattern: string): 'HIGH' | 'MEDIUM' | 'LOW' {
  const highSeverity = ['in conclusion', 'it goes without saying', 'delve into', 'tapestry of', 'symphony of'];
  const mediumSeverity = ['furthermore', 'moreover', 'it is worth noting', 'it should be noted', 'testament to'];
  if (highSeverity.includes(pattern.toLowerCase())) return 'HIGH';
  if (mediumSeverity.includes(pattern.toLowerCase())) return 'MEDIUM';
  return 'LOW';
}
