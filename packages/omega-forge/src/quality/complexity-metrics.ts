/**
 * OMEGA Forge — Complexity Metrics (M10 + M11)
 * Phase C.5 — Reading levels + discomfort index
 */

import type { StyledParagraph, StyledOutput } from '../types.js';

/**
 * M10: Reading levels — count of valid interpretation layers.
 * Layers: surface (literal), symbolic (metaphor/imagery),
 * structural (arc/scene), meta (self-referential).
 */
export function computeM10(paragraphs: readonly StyledParagraph[]): number {
  if (paragraphs.length === 0) return 0;

  const allText = paragraphs.map((p) => p.text).join(' ').toLowerCase();
  let layers = 0;

  if (allText.length > 0) layers++;

  const symbolicMarkers = ['like', 'as if', 'metaphor', 'symbol', 'mirror', 'shadow', 'echo', 'reflect', 'beneath', 'mask'];
  if (symbolicMarkers.some((m) => allText.includes(m))) layers++;

  const structuralMarkers = ['chapter', 'scene', 'arc', 'beginning', 'climax', 'resolution', 'turning point', 'meanwhile'];
  if (structuralMarkers.some((m) => allText.includes(m))) layers++;

  const metaMarkers = ['story', 'narrative', 'reader', 'tale', 'words', 'written', 'told', 'telling'];
  if (metaMarkers.some((m) => allText.includes(m))) layers++;

  return layers;
}

/**
 * M11: Discomfort index (target: [0.3, 0.7]).
 * Measures productive friction — not too comfortable, not too hostile.
 * Derived from C.3 banality detection (inverse) + tension markers.
 */
export function computeM11(
  paragraphs: readonly StyledParagraph[],
  styleOutput: StyledOutput,
): number {
  if (paragraphs.length === 0) return 0;

  const banality = styleOutput.banality_result.total_banality;
  const banalityFactor = 1 - Math.min(1, banality / Math.max(1, paragraphs.length));

  const allText = paragraphs.map((p) => p.text).join(' ').toLowerCase();
  const frictionMarkers = [
    'tension', 'conflict', 'struggle', 'pain', 'doubt', 'uncertain',
    'question', 'challenge', 'resist', 'break', 'shatter', 'crack',
    'twist', 'betray', 'expose', 'confront', 'sacrifice', 'risk',
    'threat', 'danger', 'loss', 'death', 'wound', 'scar',
    'silence', 'void', 'abyss', 'edge', 'limit', 'burden',
  ];

  const words = allText.split(/\s+/);
  const totalWords = words.length || 1;
  let frictionCount = 0;
  for (const w of words) {
    const cleaned = w.replace(/[^a-z]/g, '');
    if (frictionMarkers.some((m) => cleaned.startsWith(m))) {
      frictionCount++;
    }
  }

  const frictionDensity = Math.min(1, frictionCount / totalWords * 20);
  return (banalityFactor * 0.4 + frictionDensity * 0.6);
}
