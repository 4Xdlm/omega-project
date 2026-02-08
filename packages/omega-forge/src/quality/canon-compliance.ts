/**
 * OMEGA Forge — Canon Compliance (M1 + M2)
 * Phase C.5 — M1: contradiction_rate = 0, M2: canon_compliance = 100%
 */

import type { Canon, StyledParagraph } from '../types.js';

/** M1: Count canon contradictions (target: 0) */
export function computeM1(
  paragraphs: readonly StyledParagraph[],
  canon: Canon,
): number {
  let contradictions = 0;
  const statements = canon.entries.map((e: { readonly statement: string }) => e.statement.toLowerCase());
  const negationPatterns = ['not ', 'never ', 'no ', 'without ', "didn't ", "wasn't ", "isn't "];

  for (const p of paragraphs) {
    const lower = p.text.toLowerCase();
    for (const stmt of statements) {
      const keywords = stmt.split(/\s+/).filter((w: string) => w.length > 3);
      for (const kw of keywords) {
        const idx = lower.indexOf(kw);
        if (idx >= 0) {
          const context = lower.slice(Math.max(0, idx - 30), idx);
          for (const neg of negationPatterns) {
            if (context.includes(neg)) {
              contradictions++;
              break;
            }
          }
        }
      }
    }
  }

  return contradictions;
}

/** M2: Canon compliance ratio (target: 1.0) */
export function computeM2(
  paragraphs: readonly StyledParagraph[],
  canon: Canon,
): number {
  if (canon.entries.length === 0) return 1;

  const allText = paragraphs.map((p) => p.text.toLowerCase()).join(' ');
  let referenced = 0;

  for (const entry of canon.entries) {
    const keywords = entry.statement.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
    const found = keywords.some((kw: string) => allText.includes(kw));
    if (found) referenced++;
  }

  return referenced / canon.entries.length;
}
