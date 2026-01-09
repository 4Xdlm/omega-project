/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — IDL CRYSTALLINE GRAMMAR
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module crystal/grammar
 * @version 2.0.0
 * @license MIT
 * 
 * IDL CRISTALLIN — GRAMMAIRE IMMUTABLE
 * =====================================
 * 
 * The IDL (Invariant Descriptor Language) is a YAML-based language for
 * declaring invariants. The grammar is CRYSTALLINE:
 * - Structure is IMMUTABLE (never changes)
 * - Instances are APPEND-ONLY (can add proofs, never remove)
 * - Computed fields are DERIVED (automatically calculated)
 * 
 * INVARIANTS:
 * - INV-IDL-01: Grammar version is immutable once declared
 * - INV-IDL-02: All required fields are validated
 * - INV-IDL-03: Invariant IDs follow strict pattern
 * - INV-IDL-04: Proof strengths are from valid set
 * - INV-IDL-05: Lineage forms a DAG (no cycles)
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { 
  IDL_VERSION,
  VALIDATION_PATTERNS,
  type ImpossibilityClass,
  IMPOSSIBILITY_CLASSES
} from '../foundation/constants.js';
import { type ProofStrength, STRENGTH_ORDER } from '../foundation/proof_strength.js';

// ═══════════════════════════════════════════════════════════════════════════════
// GRAMMAR VERSION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Current IDL grammar version
 * IMMUTABLE — breaking changes require new major version
 */
export const GRAMMAR_VERSION = IDL_VERSION;

/**
 * Minimum supported grammar version for backward compatibility
 */
export const MIN_SUPPORTED_VERSION = '2.0.0' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// CORE TYPES — INVARIANT STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Proof type enumeration
 */
export type ProofType = 
  | 'test'           // Unit/integration test
  | 'adversarial'    // Fuzzing/attack survival
  | 'formal'         // SMT/proof assistant
  | 'architectural'  // Design-level proof
  | 'exhaustive'     // Complete enumeration
  | 'statistical';   // Sampling-based

/**
 * Evidence reference for a proof
 */
export interface ProofEvidence {
  /** Source file or reference */
  readonly file?: string;
  
  /** Test case name */
  readonly case?: string;
  
  /** Coverage percentage [0, 1] */
  readonly coverage?: number;
  
  /** Corpus reference for adversarial */
  readonly corpus?: string;
  
  /** Number of attacks survived */
  readonly attacks_survived?: number;
  
  /** Coverage of corpus [0, 1] */
  readonly coverage_of_corpus?: number;
  
  /** Prover tool (Z3, Coq, etc.) */
  readonly prover?: string;
  
  /** Theorem file */
  readonly theorem?: string;
  
  /** Verification result */
  readonly verified?: boolean;
  
  /** Additional notes */
  readonly notes?: string;
}

/**
 * A single proof attached to an invariant
 * APPEND-ONLY: can be added, never removed
 */
export interface InvariantProof {
  /** Type of proof */
  readonly type: ProofType;
  
  /** Strength level (Ω, Λ, Σ, Δ, Ε) */
  readonly strength: ProofStrength;
  
  /** Evidence details */
  readonly evidence: ProofEvidence;
  
  /** When this proof was added */
  readonly added_at: string;  // ISO 8601
}

/**
 * Property definition — the core assertion
 */
export interface InvariantProperty {
  /** Human-readable statement */
  readonly natural: string;
  
  /** Formal logical statement (optional but recommended) */
  readonly formal?: string;
  
  /** Scope/module this applies to */
  readonly scope: string;
}

/**
 * Lineage tracking — genetic traceability
 */
export interface InvariantLineage {
  /** Parent invariant IDs (empty for root invariants) */
  readonly parents: readonly string[];
  
  /** Generation number (0 for root) */
  readonly generation: number;
}

/**
 * Computed fields — derived from proofs
 */
export interface InvariantComputed {
  /** Strongest proof type present */
  readonly dominant_strength: ProofStrength;
  
  /** Number of proofs attached */
  readonly proof_count: number;
  
  /** Number of impossibilities declared */
  readonly impossible_count: number;
  
  /** Most recent proof timestamp */
  readonly last_proven: string;  // ISO 8601
}

/**
 * Complete Invariant structure in IDL Crystalline
 */
export interface CrystallineInvariant {
  // ─────────────────────────────────────────────────────────────────────────────
  // IDENTITY (Crystallized at creation, NEVER modified)
  // ─────────────────────────────────────────────────────────────────────────────
  
  /** Unique identifier (INV-XXX-NNN format) */
  readonly id: string;
  
  /** Timestamp of crystallization */
  readonly crystallized_at: string;  // ISO 8601
  
  /** Hash of content at crystallization */
  readonly crystallized_hash: string;  // SHA-256
  
  // ─────────────────────────────────────────────────────────────────────────────
  // LINEAGE (Genetic traceability)
  // ─────────────────────────────────────────────────────────────────────────────
  
  /** Parent relationships */
  readonly lineage: InvariantLineage;
  
  // ─────────────────────────────────────────────────────────────────────────────
  // PROPERTY (The core assertion — IMMUTABLE)
  // ─────────────────────────────────────────────────────────────────────────────
  
  /** The invariant assertion */
  readonly property: InvariantProperty;
  
  // ─────────────────────────────────────────────────────────────────────────────
  // PROOFS (Append-only — can grow)
  // ─────────────────────────────────────────────────────────────────────────────
  
  /** Attached proofs (append-only) */
  readonly proofs: readonly InvariantProof[];
  
  // ─────────────────────────────────────────────────────────────────────────────
  // NEGATIVE SPACE (What it CANNOT do — append-only)
  // ─────────────────────────────────────────────────────────────────────────────
  
  /** Proven impossibilities */
  readonly impossibilities: readonly string[];
  
  // ─────────────────────────────────────────────────────────────────────────────
  // COMPUTED (Derived fields — recalculated)
  // ─────────────────────────────────────────────────────────────────────────────
  
  /** Computed statistics */
  readonly computed: InvariantComputed;
}

// ═══════════════════════════════════════════════════════════════════════════════
// IDL DOCUMENT STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Complete IDL document structure
 */
export interface IDLDocument {
  /** IDL grammar version */
  readonly idl_version: string;
  
  /** Document metadata */
  readonly metadata: {
    readonly name: string;
    readonly version: string;
    readonly created_at: string;
    readonly updated_at: string;
  };
  
  /** List of invariants */
  readonly invariants: readonly CrystallineInvariant[];
  
  /** Document hash (computed) */
  readonly document_hash?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRAMMAR SCHEMA — VALIDATION RULES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Field mutability classification
 */
export type FieldMutability = 'IMMUTABLE' | 'APPEND_ONLY' | 'COMPUTED';

/**
 * Schema definition for a field
 */
export interface FieldSchema {
  readonly name: string;
  readonly type: string;
  readonly required: boolean;
  readonly mutability: FieldMutability;
  readonly pattern?: RegExp;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly validValues?: readonly string[];
  readonly description: string;
}

/**
 * Complete grammar schema
 */
export const GRAMMAR_SCHEMA: Record<string, FieldSchema> = Object.freeze({
  
  // Identity fields
  id: {
    name: 'id',
    type: 'string',
    required: true,
    mutability: 'IMMUTABLE',
    pattern: VALIDATION_PATTERNS.INVARIANT_ID,
    description: 'Unique invariant identifier (INV-XXX-NNN format)'
  },
  
  crystallized_at: {
    name: 'crystallized_at',
    type: 'string',
    required: true,
    mutability: 'IMMUTABLE',
    pattern: VALIDATION_PATTERNS.ISO_TIMESTAMP,
    description: 'Timestamp when invariant was crystallized'
  },
  
  crystallized_hash: {
    name: 'crystallized_hash',
    type: 'string',
    required: true,
    mutability: 'IMMUTABLE',
    pattern: VALIDATION_PATTERNS.SHA256_HASH,
    description: 'SHA-256 hash of invariant content at crystallization'
  },
  
  // Lineage fields
  'lineage.parents': {
    name: 'lineage.parents',
    type: 'array<string>',
    required: true,
    mutability: 'IMMUTABLE',
    description: 'Parent invariant IDs'
  },
  
  'lineage.generation': {
    name: 'lineage.generation',
    type: 'number',
    required: true,
    mutability: 'IMMUTABLE',
    description: 'Generation number (distance from root)'
  },
  
  // Property fields
  'property.natural': {
    name: 'property.natural',
    type: 'string',
    required: true,
    mutability: 'IMMUTABLE',
    minLength: 10,
    description: 'Human-readable invariant statement'
  },
  
  'property.formal': {
    name: 'property.formal',
    type: 'string',
    required: false,
    mutability: 'IMMUTABLE',
    description: 'Formal logical statement'
  },
  
  'property.scope': {
    name: 'property.scope',
    type: 'string',
    required: true,
    mutability: 'IMMUTABLE',
    minLength: 1,
    description: 'Module/scope this invariant applies to'
  },
  
  // Proof fields
  proofs: {
    name: 'proofs',
    type: 'array<Proof>',
    required: true,
    mutability: 'APPEND_ONLY',
    description: 'Attached proofs (can only be added)'
  },
  
  'proof.type': {
    name: 'proof.type',
    type: 'string',
    required: true,
    mutability: 'IMMUTABLE',
    validValues: ['test', 'adversarial', 'formal', 'architectural', 'exhaustive', 'statistical'],
    description: 'Type of proof'
  },
  
  'proof.strength': {
    name: 'proof.strength',
    type: 'string',
    required: true,
    mutability: 'IMMUTABLE',
    validValues: [...STRENGTH_ORDER],
    description: 'Proof strength level'
  },
  
  'proof.added_at': {
    name: 'proof.added_at',
    type: 'string',
    required: true,
    mutability: 'IMMUTABLE',
    pattern: VALIDATION_PATTERNS.ISO_TIMESTAMP,
    description: 'When proof was added'
  },
  
  // Impossibilities
  impossibilities: {
    name: 'impossibilities',
    type: 'array<string>',
    required: true,
    mutability: 'APPEND_ONLY',
    description: 'Proven impossibilities (can only be added)'
  },
  
  // Computed fields
  'computed.dominant_strength': {
    name: 'computed.dominant_strength',
    type: 'string',
    required: true,
    mutability: 'COMPUTED',
    validValues: [...STRENGTH_ORDER],
    description: 'Strongest proof present (auto-calculated)'
  },
  
  'computed.proof_count': {
    name: 'computed.proof_count',
    type: 'number',
    required: true,
    mutability: 'COMPUTED',
    description: 'Number of proofs (auto-calculated)'
  },
  
  'computed.impossible_count': {
    name: 'computed.impossible_count',
    type: 'number',
    required: true,
    mutability: 'COMPUTED',
    description: 'Number of impossibilities (auto-calculated)'
  },
  
  'computed.last_proven': {
    name: 'computed.last_proven',
    type: 'string',
    required: true,
    mutability: 'COMPUTED',
    pattern: VALIDATION_PATTERNS.ISO_TIMESTAMP,
    description: 'Most recent proof timestamp (auto-calculated)'
  }
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROOF TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Mapping of proof types to their typical strength levels
 */
export const PROOF_TYPE_STRENGTHS: Record<ProofType, ProofStrength[]> = Object.freeze({
  test: ['Ε', 'Δ'],           // Empirical or Statistical
  adversarial: ['Δ', 'Σ'],    // Statistical or Exhaustive
  formal: ['Λ', 'Ω'],         // Mathematical or Impossibility
  architectural: ['Ω', 'Λ'],  // Impossibility or Mathematical
  exhaustive: ['Σ'],          // Exhaustive only
  statistical: ['Δ']          // Statistical only
});

/**
 * All valid proof types
 */
export const PROOF_TYPES: readonly ProofType[] = Object.freeze([
  'test',
  'adversarial',
  'formal',
  'architectural',
  'exhaustive',
  'statistical'
]);

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a string is a valid proof type
 */
export function isProofType(value: unknown): value is ProofType {
  return typeof value === 'string' && PROOF_TYPES.includes(value as ProofType);
}

/**
 * Check if a string is a valid invariant ID
 */
export function isValidInvariantId(id: unknown): id is string {
  return typeof id === 'string' && VALIDATION_PATTERNS.INVARIANT_ID.test(id);
}

/**
 * Check if a string is a valid ISO timestamp
 */
export function isValidTimestamp(ts: unknown): ts is string {
  return typeof ts === 'string' && VALIDATION_PATTERNS.ISO_TIMESTAMP.test(ts);
}

/**
 * Check if a string is a valid SHA-256 hash
 */
export function isValidHash(hash: unknown): hash is string {
  return typeof hash === 'string' && VALIDATION_PATTERNS.SHA256_HASH.test(hash);
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRAMMAR DOCUMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate human-readable grammar documentation
 */
export function generateGrammarDoc(): string {
  const lines: string[] = [
    '╔═══════════════════════════════════════════════════════════════════════════════╗',
    '║                 IDL CRYSTALLINE GRAMMAR v2.0.0                                ║',
    '╠═══════════════════════════════════════════════════════════════════════════════╣',
    '║                                                                               ║',
    '║  MUTABILITY RULES:                                                            ║',
    '║  • IMMUTABLE: Cannot be changed after crystallization                         ║',
    '║  • APPEND_ONLY: Can add new items, never remove                               ║',
    '║  • COMPUTED: Automatically derived, recalculated on read                      ║',
    '║                                                                               ║',
    '╚═══════════════════════════════════════════════════════════════════════════════╝',
    '',
    '## Field Schema',
    '',
    '| Field | Type | Required | Mutability |',
    '|-------|------|----------|------------|'
  ];
  
  for (const [key, schema] of Object.entries(GRAMMAR_SCHEMA)) {
    lines.push(
      `| ${key} | ${schema.type} | ${schema.required ? 'Yes' : 'No'} | ${schema.mutability} |`
    );
  }
  
  return lines.join('\n');
}

/**
 * Generate YAML template for a new invariant
 */
export function generateInvariantTemplate(id: string, scope: string): string {
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  
  return `# IDL Crystalline v${GRAMMAR_VERSION}
# Generated: ${now}

invariant:
  # IDENTITY (Crystallized at creation, NEVER modified)
  id: "${id}"
  crystallized_at: "${now}"
  crystallized_hash: ""  # Will be computed on save
  
  # LINEAGE (Genetic traceability)
  lineage:
    parents: []
    generation: 0
  
  # PROPERTY (The core assertion — IMMUTABLE)
  property:
    natural: "TODO: Describe what this invariant guarantees"
    formal: "TODO: Optional formal notation"
    scope: "${scope}"
  
  # PROOFS (Append-only — can grow)
  proofs: []
  
  # NEGATIVE SPACE (What it CANNOT do — append-only)
  impossibilities: []
`;
}
