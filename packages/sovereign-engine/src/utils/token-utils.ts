/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — TOKEN ESTIMATION (SSOT)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: utils/token-utils.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Source unique de vérité pour l'estimation de tokens.
 * Remplace les définitions dupliquées dans :
 *   - cde/distiller.ts (estimateTokens)
 *   - voice/voice-compiler.ts (estimateTokens)
 *
 * Heuristique : ~4 caractères par token (français/anglais mixte).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/** Nombre moyen de caractères par token (heuristique fr/en) */
export const CHARS_PER_TOKEN = 4;

/**
 * Estime le nombre de tokens d'un texte.
 * Heuristique simple : Math.ceil(text.length / 4).
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}
