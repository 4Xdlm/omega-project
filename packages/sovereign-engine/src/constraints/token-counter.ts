/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Sovereign — Deterministic Token Counter
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Approximation conservative : 1 token ≈ 4 chars (UTF-8 français).
 * tokenizerId OBLIGATOIRE — pas de default.
 */

const TOKENIZER_REGISTRY: Readonly<Record<string, (text: string) => number>> = {
  'chars_div_4': (text: string) => Math.ceil(text.length / 4),
};

/**
 * Count tokens using the specified tokenizer.
 * @throws if tokenizerId is unknown or empty.
 */
export function countTokens(text: string, tokenizerId: string): number {
  if (!tokenizerId || tokenizerId.trim() === '') {
    throw new Error('COMPILE FAIL: tokenizerId is required (empty string forbidden)');
  }
  const counter = TOKENIZER_REGISTRY[tokenizerId];
  if (!counter) {
    const valid = Object.keys(TOKENIZER_REGISTRY).join(', ');
    throw new Error(`COMPILE FAIL: unknown tokenizerId '${tokenizerId}'. Valid: ${valid}`);
  }
  return counter(text);
}

export function listTokenizerIds(): readonly string[] {
  return Object.keys(TOKENIZER_REGISTRY);
}
