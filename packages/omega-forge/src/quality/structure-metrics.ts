/**
 * OMEGA Forge — Structure Metrics (M3 + M4 + M5)
 * Phase C.5 — Coherence span, arc maintenance, memory integrity
 */

import type { StyledParagraph, GenesisPlan } from '../types.js';

/** M3: Coherence span — average words between topic shifts */
export function computeM3(paragraphs: readonly StyledParagraph[]): number {
  if (paragraphs.length <= 1) return paragraphs.length > 0 ? paragraphs[0].word_count : 0;

  let totalSpan = 0;
  let spanCount = 0;
  let currentSpan = paragraphs[0].word_count;

  for (let i = 1; i < paragraphs.length; i++) {
    const prevWords = new Set(paragraphs[i - 1].text.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3));
    const currWords = paragraphs[i].text.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
    const overlap = currWords.filter((w: string) => prevWords.has(w)).length;
    const overlapRatio = currWords.length > 0 ? overlap / currWords.length : 0;

    if (overlapRatio >= 0.1) {
      currentSpan += paragraphs[i].word_count;
    } else {
      totalSpan += currentSpan;
      spanCount++;
      currentSpan = paragraphs[i].word_count;
    }
  }
  totalSpan += currentSpan;
  spanCount++;

  return totalSpan / spanCount;
}

/** M4: Arc maintenance — count of arcs with all scenes represented */
export function computeM4(
  paragraphs: readonly StyledParagraph[],
  plan: GenesisPlan,
): number {
  if (plan.arcs.length === 0) return 0;

  const allText = paragraphs.map((p) => p.text.toLowerCase()).join(' ');
  let maintained = 0;

  for (const arc of plan.arcs) {
    const themeWords = arc.theme.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
    const found = themeWords.some((w: string) => allText.includes(w));
    if (found) maintained++;
  }

  return maintained;
}

/** M5: Memory integrity — coherence(t) / coherence(0) */
export function computeM5(paragraphs: readonly StyledParagraph[]): number {
  if (paragraphs.length <= 2) return 1;

  const firstHalf = paragraphs.slice(0, Math.floor(paragraphs.length / 2));
  const secondHalf = paragraphs.slice(Math.floor(paragraphs.length / 2));

  const firstCoherence = computeLocalCoherence(firstHalf);
  const secondCoherence = computeLocalCoherence(secondHalf);

  if (firstCoherence === 0) return 1;
  return Math.min(1, secondCoherence / firstCoherence);
}

function computeLocalCoherence(paragraphs: readonly StyledParagraph[]): number {
  if (paragraphs.length <= 1) return 1;

  let totalOverlap = 0;
  for (let i = 1; i < paragraphs.length; i++) {
    const prevWords = new Set(paragraphs[i - 1].text.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3));
    const currWords = paragraphs[i].text.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
    const overlap = currWords.filter((w: string) => prevWords.has(w)).length;
    totalOverlap += currWords.length > 0 ? overlap / currWords.length : 0;
  }

  return totalOverlap / (paragraphs.length - 1);
}
