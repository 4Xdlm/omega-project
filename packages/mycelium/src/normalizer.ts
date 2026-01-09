/**
 * OMEGA Mycelium Normalizer
 * Phase 29.2 - NASA-Grade L4
 *
 * Implements SOFT normalizations after HARD validations
 * INV-MYC-04: Line Ending Normalization
 * INV-MYC-09: No Silent Modification (only documented changes)
 */

// ═══════════════════════════════════════════════════════════════════════════════
// LINE ENDING NORMALIZATION (INV-MYC-04)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Normalize all line endings to LF (\n)
 * This is the ONLY modification Mycelium performs on content
 *
 * Converts:
 * - CRLF (\r\n) → LF (\n)
 * - CR (\r) → LF (\n)
 * - LF (\n) → LF (\n) (no change)
 *
 * INV-MYC-09: This is a DOCUMENTED modification, not silent
 */
export function normalizeLineEndings(content: string): string {
  // Replace CRLF first (order matters!)
  // Then replace standalone CR
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOFT NORMALIZATION PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Run all SOFT normalizations
 * Called ONLY after all HARD validations pass
 *
 * Current normalizations:
 * 1. Line endings → LF (INV-MYC-04)
 *
 * Future normalizations would be added here with documentation
 */
export function runSoftNormalizations(content: string): string {
  return normalizeLineEndings(content);
}
