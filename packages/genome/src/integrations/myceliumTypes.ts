/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/genome — MYCELIUM INTEGRATION TYPES
 * Phase 29.3 - NASA-Grade L4
 *
 * Types for Mycelium → Genome integration layer.
 * Mycelium is FROZEN at v3.30.0 (commit 35976d1).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SEAL REFERENCE — Traceability to certified Mycelium
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Reference to the certified Mycelium module
 * Required for audit trail
 */
export interface MyceliumSealRef {
  readonly tag: "v3.30.0";
  readonly commit: "35976d1";
  readonly scope: "packages/mycelium/";
}

/**
 * Frozen seal reference - DO NOT MODIFY
 */
export const MYCELIUM_SEAL_REF: MyceliumSealRef = {
  tag: "v3.30.0",
  commit: "35976d1",
  scope: "packages/mycelium/",
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Input to Genome's Mycelium integration layer
 */
export interface GenomeMyceliumInput {
  /** Required - deterministic request ID for tracing */
  readonly request_id: string;

  /** Raw text content to validate and normalize */
  readonly text: string;

  /** Optional locale - must not affect determinism unless declared */
  readonly locale?: string;

  /** Optional seed for deterministic operations */
  readonly seed?: number;

  /** Optional segmentation mode */
  readonly mode?: "paragraph" | "sentence";

  /** Optional metadata - isolated from processing */
  readonly metadata?: Readonly<Record<string, string | number | boolean | null>>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OUTPUT TYPES — Discriminated Union
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Successful validation result
 */
export interface GenomeMyceliumOk {
  readonly ok: true;

  /** Normalized content from Mycelium */
  readonly normalized: {
    readonly content: string;
    readonly seed: number;
    readonly mode: "paragraph" | "sentence";
  };

  /** Request ID echo for correlation */
  readonly request_id: string;

  /** Seal reference for audit trail */
  readonly seal_ref: MyceliumSealRef;
}

/**
 * Rejection result with propagated REJ-MYC-* code
 */
export interface GenomeMyceliumErr {
  readonly ok: false;

  /** Original Mycelium rejection code (REJ-MYC-*) */
  readonly rej_code: string;

  /** Human-readable message */
  readonly message: string;

  /** Category of rejection */
  readonly category: string;

  /** Additional structured details */
  readonly details?: {
    readonly offset?: number;
    readonly expected?: string;
    readonly received?: string;
    readonly size?: number;
    readonly max?: number;
    readonly lineNumber?: number;
    readonly hex?: string;
  };

  /** Request ID echo for correlation */
  readonly request_id: string;

  /** Seal reference for audit trail */
  readonly seal_ref: MyceliumSealRef;
}

/**
 * Discriminated union result type
 */
export type GenomeMyceliumResult = GenomeMyceliumOk | GenomeMyceliumErr;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════════

export function isMyceliumOk(result: GenomeMyceliumResult): result is GenomeMyceliumOk {
  return result.ok === true;
}

export function isMyceliumErr(result: GenomeMyceliumResult): result is GenomeMyceliumErr {
  return result.ok === false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GATE DEFINITIONS (from MYCELIUM_VALIDATION_PLAN.md)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Integration gate IDs
 * These map to GATE-MYC-* from the Mycelium design
 */
export const INTEGRATION_GATES = {
  /** GATE-MYC-01: Input must not be empty */
  INPUT_MINIMAL: "GATE-INT-01",

  /** GATE-MYC-02: Schema validation */
  SCHEMA_VALID: "GATE-INT-02",

  /** GATE-MYC-03: Normalizer must be deterministic */
  DETERMINISTIC: "GATE-INT-03",

  /** GATE-MYC-04: Reject propagation strict */
  REJECT_PROPAGATION: "GATE-INT-04",

  /** GATE-MYC-05: Seal reference must be attached */
  SEAL_ATTACHED: "GATE-INT-05",
} as const;

export type IntegrationGate = typeof INTEGRATION_GATES[keyof typeof INTEGRATION_GATES];
