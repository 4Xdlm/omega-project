/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/genome — MYCELIUM ADAPTER
 * Phase 29.3 - NASA-Grade L4
 *
 * Adapter layer for Genome ↔ Mycelium integration.
 * Calls Mycelium's public API, propagates rejections strictly.
 *
 * INVARIANTS:
 * - INV-INT-01: Mycelium module is NOT modified (FROZEN)
 * - INV-INT-02: All REJ-MYC-* codes propagated without loss
 * - INV-INT-03: Gates are fail-fast (no silent fallback)
 * - INV-INT-04: seal_ref always attached
 * - INV-INT-05: Deterministic output for same input
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  validate as myceliumValidate,
  isAccepted,
  isRejected,
  type ValidationResult,
} from "@omega/mycelium";

import {
  type GenomeMyceliumInput,
  type GenomeMyceliumResult,
  type GenomeMyceliumOk,
  type GenomeMyceliumErr,
  MYCELIUM_SEAL_REF,
  INTEGRATION_GATES,
} from "./myceliumTypes.js";

// ═══════════════════════════════════════════════════════════════════════════════
// ADAPTER VERSION
// ═══════════════════════════════════════════════════════════════════════════════

export const ADAPTER_VERSION = "1.0.0";

// ═══════════════════════════════════════════════════════════════════════════════
// GATE VALIDATION (GATE-INT-01, GATE-INT-02)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Pre-flight validation before calling Mycelium
 * GATE-INT-01: Input minimal validation
 * GATE-INT-02: Schema validation
 */
function validateInput(input: GenomeMyceliumInput): GenomeMyceliumErr | null {
  // GATE-INT-01: request_id must be non-empty string
  if (!input.request_id || typeof input.request_id !== "string" || input.request_id.trim() === "") {
    return {
      ok: false,
      rej_code: "REJ-INT-001",
      message: "Invalid request_id: must be non-empty string",
      category: "Params",
      request_id: input.request_id || "UNKNOWN",
      seal_ref: MYCELIUM_SEAL_REF,
    };
  }

  // GATE-INT-02: text must be a string (Mycelium will validate further)
  if (typeof input.text !== "string") {
    return {
      ok: false,
      rej_code: "REJ-INT-002",
      message: "Invalid text: must be a string",
      category: "Params",
      request_id: input.request_id,
      seal_ref: MYCELIUM_SEAL_REF,
    };
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REJECTION MAPPING (GATE-INT-04)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map Mycelium rejection to Genome rejection format
 * Preserves all information (no loss)
 */
function mapRejection(
  myceliumResult: ValidationResult,
  requestId: string
): GenomeMyceliumErr {
  if (!isRejected(myceliumResult)) {
    throw new Error("mapRejection called on non-rejected result");
  }

  const { rejection } = myceliumResult;

  return {
    ok: false,
    rej_code: rejection.code,
    message: rejection.message,
    category: rejection.category,
    details: rejection.details ? {
      offset: rejection.details.offset,
      expected: rejection.details.expected,
      received: rejection.details.received,
      size: rejection.details.size,
      max: rejection.details.max,
      lineNumber: rejection.details.lineNumber,
      hex: rejection.details.hex,
    } : undefined,
    request_id: requestId,
    seal_ref: MYCELIUM_SEAL_REF,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ADAPTER FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Process input through Mycelium validation layer
 *
 * Flow:
 * 1. GATE-INT-01/02: Pre-flight validation
 * 2. Call Mycelium.validate()
 * 3. GATE-INT-04: Map rejection if any
 * 4. GATE-INT-05: Attach seal_ref
 * 5. Return result
 *
 * @param input - Input to validate
 * @returns GenomeMyceliumResult - Ok with normalized data or Err with rejection
 */
export function processWithMycelium(input: GenomeMyceliumInput): GenomeMyceliumResult {
  // ═══════════════════════════════════════════════════════════════════════════
  // GATE-INT-01/02: Pre-flight validation
  // ═══════════════════════════════════════════════════════════════════════════

  const inputError = validateInput(input);
  if (inputError) {
    return inputError;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Call Mycelium validation (FROZEN module)
  // ═══════════════════════════════════════════════════════════════════════════

  const myceliumResult = myceliumValidate({
    content: input.text,
    seed: input.seed,
    mode: input.mode,
    meta: input.metadata ? {
      sourceId: input.request_id,
    } : undefined,
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GATE-INT-04: Rejection propagation (strict, no fallback)
  // ═══════════════════════════════════════════════════════════════════════════

  if (isRejected(myceliumResult)) {
    return mapRejection(myceliumResult, input.request_id);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GATE-INT-05: Attach seal_ref to successful result
  // ═══════════════════════════════════════════════════════════════════════════

  if (!isAccepted(myceliumResult)) {
    // Should never happen, but type safety
    throw new Error("Unexpected Mycelium result state");
  }

  const { output } = myceliumResult;

  const result: GenomeMyceliumOk = {
    ok: true,
    normalized: {
      content: output.content,
      seed: output.seed,
      mode: output.mode,
    },
    request_id: input.request_id,
    seal_ref: MYCELIUM_SEAL_REF,
  };

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export { isMyceliumOk, isMyceliumErr } from "./myceliumTypes.js";
export { MYCELIUM_SEAL_REF, INTEGRATION_GATES } from "./myceliumTypes.js";
export type {
  GenomeMyceliumInput,
  GenomeMyceliumResult,
  GenomeMyceliumOk,
  GenomeMyceliumErr,
  MyceliumSealRef,
} from "./myceliumTypes.js";
