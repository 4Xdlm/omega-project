/**
 * OMEGA Genesis Planner — Output Normalization
 * Phase C.1 — Deterministic normalization for LF, whitespace, JSON.
 */

export function normalizeLF(input: string): string {
  return input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export function normalizeWhitespace(input: string): string {
  return input
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function normalizeJSON(input: string): string {
  const parsed: unknown = JSON.parse(input);
  return JSON.stringify(parsed, Object.keys(parsed as Record<string, unknown>).sort(), 0);
}

export function normalize(input: string): string {
  return normalizeWhitespace(normalizeLF(input));
}
