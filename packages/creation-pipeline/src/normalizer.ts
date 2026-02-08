/**
 * OMEGA Creation Pipeline — Normalizer
 * Phase C.4 — Text normalization (same pattern as C.1/C.2/C.3)
 */

export function normalizeLF(input: string): string {
  return input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export function normalizeWhitespace(input: string): string {
  return input.replace(/[ \t]+/g, ' ').trim();
}

export function normalizeJSON(input: string): string {
  return normalizeLF(input).replace(/\n\s*\n/g, '\n');
}

export function normalize(input: string): string {
  return normalizeWhitespace(normalizeLF(input));
}
