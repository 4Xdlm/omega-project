/**
 * OMEGA Phase Q — Output Normalizer (Q-INV-05)
 *
 * Normalizes candidate outputs before evaluation for deterministic comparison.
 * Pipeline: CRLF→LF → whitespace collapse → trim
 */

import { canonicalize } from '@omega/canon-kernel';

/**
 * Normalize line endings to LF (replace CRLF and lone CR with LF).
 */
export function normalizeLF(input: string): string {
  return input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Normalize whitespace: collapse multiple spaces/tabs to single space, trim each line.
 */
export function normalizeWhitespace(input: string): string {
  return input
    .split('\n')
    .map(line => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n');
}

/**
 * Sort JSON keys lexicographically using canon-kernel canonicalize.
 * If input is not valid JSON, returns input unchanged.
 */
export function normalizeJSON(input: string): string {
  try {
    const parsed: unknown = JSON.parse(input);
    if (typeof parsed === 'object' && parsed !== null) {
      return canonicalize(parsed);
    }
    return input;
  } catch {
    return input;
  }
}

/**
 * Full normalization pipeline: LF → whitespace → trim.
 * This is the standard normalization applied to all candidate outputs.
 */
export function normalize(input: string): string {
  let result = normalizeLF(input);
  result = normalizeWhitespace(result);
  result = result.trim();
  return result;
}

/**
 * Verify normalization is idempotent: normalize(normalize(x)) === normalize(x).
 */
export function isIdempotent(input: string): boolean {
  const once = normalize(input);
  const twice = normalize(once);
  return once === twice;
}
