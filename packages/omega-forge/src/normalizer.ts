/**
 * OMEGA Forge — Normalizer
 * Phase C.5 — Text normalization for deterministic analysis
 */

/** Normalize line endings to LF */
export function normalizeLF(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/** Collapse multiple whitespace to single space, trim lines */
export function normalizeWhitespace(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n');
}

/** Normalize JSON string for deterministic hashing */
export function normalizeJSON(text: string): string {
  return normalizeLF(text.trim());
}

/** Full normalization pipeline */
export function normalize(text: string): string {
  return normalizeWhitespace(normalizeLF(text));
}
