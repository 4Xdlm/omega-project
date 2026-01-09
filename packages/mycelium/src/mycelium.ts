/**
 * OMEGA Mycelium - Input Validation Guardian
 * Phase 29.2 - NASA-Grade L4
 *
 * Single entry point for DNA pipeline validation
 * Implements: 12 INV-MYC-*, 20 REJ-MYC-*, 5 GATE-MYC-*, 4 INV-BOUND-*
 *
 * ARCHITECTURE:
 * DNAInput → Mycelium.validate() → GenomeInput | Rejection
 *
 * GUARANTEES (per BOUNDARY_MYCELIUM_GENOME.md):
 * - G-TYPE-01: Output is string
 * - G-TYPE-02: UTF-8 valid
 * - G-TYPE-03: No null bytes
 * - G-FMT-01: Line endings normalized (LF)
 * - G-FMT-02: No forbidden control chars
 * - G-FMT-03: Non-empty content
 * - G-LIM-01: Size ≤ 10 MB
 * - G-LIM-02: Lines ≤ 1 MB
 * - G-DET-01: Deterministic output
 * - G-DET-02: Seed transmitted intact
 * - G-DET-03: Metadata isolated
 */

import { DEFAULT_SEED, DEFAULT_MODE, REJECTION_CODES, REJECTION_MESSAGES, REJECTION_CATEGORIES } from './constants.js';
import type { DNAInput, GenomeInput, ValidationResult, Rejection, AcceptResult, RejectResult } from './types.js';
import { runHardValidations } from './validator.js';
import { runSoftNormalizations } from './normalizer.js';

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION
// ═══════════════════════════════════════════════════════════════════════════════

export const MYCELIUM_VERSION = '1.0.0';

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN VALIDATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate input and produce GenomeInput or Rejection
 *
 * INV-BOUND-01: No Bypass - all data must pass through this function
 * INV-BOUND-02: Single Entry Point - this is the ONLY way to get GenomeInput
 * INV-BOUND-04: Rejection Isolation - rejected data never reaches Genome
 *
 * Flow:
 * 1. HARD validations (reject on failure)
 * 2. SOFT normalizations (apply documented changes)
 * 3. EMIT GenomeInput
 *
 * @param input - Raw DNA input from external world
 * @returns ValidationResult - Either AcceptResult or RejectResult
 */
export function validate(input: DNAInput): ValidationResult {
  try {
    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 1: HARD VALIDATIONS
    // Order: Parameters → Binary → Size → UTF-8 → Control → Empty → Format
    // Any failure = immediate rejection (INV-MYC-10)
    // ═══════════════════════════════════════════════════════════════════════════

    const rejection = runHardValidations(input);
    if (rejection) {
      return createRejectResult(rejection);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 2: SOFT NORMALIZATIONS
    // Only reached if all HARD validations pass
    // INV-MYC-04: Normalize line endings to LF
    // ═══════════════════════════════════════════════════════════════════════════

    const normalizedContent = runSoftNormalizations(input.content);

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 3: EMIT GenomeInput
    // Apply defaults, preserve metadata isolation (INV-MYC-11)
    // Seed passthrough integrity (INV-MYC-12)
    // ═══════════════════════════════════════════════════════════════════════════

    const genomeInput: GenomeInput = {
      content: normalizedContent,
      seed: input.seed ?? DEFAULT_SEED,      // INV-MYC-12: Passthrough or default
      mode: input.mode ?? DEFAULT_MODE,
      meta: input.meta ? {
        sourceId: input.meta.sourceId,
        processedAt: new Date().toISOString(),
        myceliumVersion: MYCELIUM_VERSION,
      } : undefined,
    };

    return createAcceptResult(genomeInput);

  } catch (error) {
    // INV-MYC-10: System errors also result in rejection
    return createRejectResult({
      code: REJECTION_CODES.SYSTEM_ERROR,
      category: REJECTION_CATEGORIES[REJECTION_CODES.SYSTEM_ERROR],
      message: REJECTION_MESSAGES[REJECTION_CODES.SYSTEM_ERROR],
      timestamp: new Date().toISOString(),
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESULT FACTORIES
// ═══════════════════════════════════════════════════════════════════════════════

function createAcceptResult(output: GenomeInput): AcceptResult {
  return {
    accepted: true,
    output,
  };
}

function createRejectResult(rejection: Rejection): RejectResult {
  return {
    accepted: false,
    rejection,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export { isAccepted, isRejected } from './types.js';
