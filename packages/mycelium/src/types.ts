/**
 * OMEGA Mycelium Types
 * Phase 29.2 - NASA-Grade L4
 *
 * Type definitions per DNA_INPUT_CONTRACT.md and BOUNDARY_MYCELIUM_GENOME.md
 */

import type { SegmentMode, RejectionCode, RejectionCategory } from './constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT TYPES (DNA_INPUT_CONTRACT)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Raw input to Mycelium from external world
 * INV-MYC-03: No bypass parameters allowed
 */
export interface DNAInput {
  /** UTF-8 strict content, 1B-10MB (OBLIGATOIRE) */
  readonly content: string;

  /** Seed for determinism, default 42 (OPTIONNEL) */
  readonly seed?: number;

  /** Segmentation mode (OPTIONNEL) */
  readonly mode?: SegmentMode;

  /** Metadata - NOT part of hash (OPTIONNEL) */
  readonly meta?: InputMetadata;
}

/**
 * Input metadata - isolated from processing (INV-MYC-11)
 */
export interface InputMetadata {
  readonly sourceId?: string;
  readonly timestamp?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OUTPUT TYPES (BOUNDARY_MYCELIUM_GENOME)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validated output ready for Genome
 * All guarantees from BOUNDARY_MYCELIUM_GENOME.md apply
 */
export interface GenomeInput {
  /** Validated UTF-8 content, non-empty, ≤10MB */
  readonly content: string;

  /** Seed value (default applied if not provided) */
  readonly seed: number;

  /** Segmentation mode (default applied if not provided) */
  readonly mode: SegmentMode;

  /** Metadata (not used by Genome for hash) */
  readonly meta?: ProcessedMetadata;
}

/**
 * Processed metadata with Mycelium trace
 */
export interface ProcessedMetadata {
  readonly sourceId?: string;
  readonly processedAt: string;
  readonly myceliumVersion: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REJECTION TYPES (MYCELIUM_REJECTION_CATALOG)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Rejection details
 * INV-MYC-10: Rejection is terminal
 */
export interface RejectionDetails {
  /** Position of error if applicable */
  readonly offset?: number;

  /** What was expected */
  readonly expected?: string;

  /** What was received */
  readonly received?: string;

  /** Size info if applicable */
  readonly size?: number;

  /** Max allowed if applicable */
  readonly max?: number;

  /** Line number if applicable */
  readonly lineNumber?: number;

  /** Segment count if applicable */
  readonly count?: number;

  /** Hex value if applicable */
  readonly hex?: string;
}

/**
 * Full rejection response
 */
export interface Rejection {
  readonly code: RejectionCode;
  readonly category: RejectionCategory;
  readonly message: string;
  readonly details?: RejectionDetails;
  readonly timestamp: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESULT TYPES (Discriminated Union)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Successful validation result
 */
export interface AcceptResult {
  readonly accepted: true;
  readonly output: GenomeInput;
}

/**
 * Rejection result
 * INV-MYC-10: No partial data passes
 */
export interface RejectResult {
  readonly accepted: false;
  readonly rejection: Rejection;
}

/**
 * Mycelium validation result - discriminated union
 */
export type ValidationResult = AcceptResult | RejectResult;

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION STATE (Internal)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Internal validation context
 */
export interface ValidationContext {
  readonly input: DNAInput;
  readonly startTime: number;
  normalizedContent?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════════

export function isAccepted(result: ValidationResult): result is AcceptResult {
  return result.accepted === true;
}

export function isRejected(result: ValidationResult): result is RejectResult {
  return result.accepted === false;
}
