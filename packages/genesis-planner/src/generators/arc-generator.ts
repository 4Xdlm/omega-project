/**
 * OMEGA Genesis Planner — Arc Generator
 * Phase C.1 — Decomposes intent into deterministic narrative arcs.
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type { Intent, Canon, Constraints, Arc } from '../types.js';

function determineArcCount(targetWordCount: number): number {
  if (targetWordCount <= 3000) return 1;
  if (targetWordCount <= 10000) return 2;
  return 3;
}

function generateArcId(index: number, intentHash: string): string {
  return `ARC-${String(index + 1).padStart(3, '0')}-${intentHash.slice(0, 8)}`;
}

export function generateArcs(intent: Intent, _canon: Canon, _constraints: Constraints): readonly Arc[] {
  const intentHash = sha256(canonicalize(intent));
  const arcCount = determineArcCount(intent.target_word_count);

  const arcs: Arc[] = [];

  for (let i = 0; i < arcCount; i++) {
    const themeIndex = i % intent.themes.length;
    const theme = intent.themes[themeIndex];
    const arcId = generateArcId(i, intentHash);

    const progressions = [
      `Setup and escalation of ${theme} through ${intent.core_emotion}`,
      `Development and complication of ${theme} with rising stakes`,
      `Resolution and transformation of ${theme} toward ${intent.message}`,
    ];

    const justifications = [
      `Primary arc: establishes ${theme} as core narrative driver for premise "${intent.premise}"`,
      `Secondary arc: deepens ${theme} through contrasting perspective, enriching narrative complexity`,
      `Tertiary arc: provides thematic counterpoint via ${theme}, ensuring full exploration of message`,
    ];

    arcs.push({
      arc_id: arcId,
      theme,
      progression: progressions[i % progressions.length],
      scenes: [],
      justification: justifications[i % justifications.length],
    });
  }

  return arcs;
}
