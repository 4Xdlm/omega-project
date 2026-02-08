/**
 * OMEGA Style Emergence Engine -- Normalizer
 * Phase C.3 -- Text normalization utilities
 */

export function normalizeLF(input: string): string {
  return input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export function normalizeWhitespace(input: string): string {
  return input.replace(/[ \t]+/g, ' ').replace(/^ +| +$/gm, '');
}

export function normalizeJSON(input: string): string {
  try {
    return JSON.stringify(JSON.parse(input));
  } catch {
    return input;
  }
}

export function normalize(input: string): string {
  return normalizeWhitespace(normalizeLF(input));
}
