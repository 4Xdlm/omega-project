/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — CRYSTALLIZER
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module crystal/crystallizer
 * @version 2.0.0
 * @license MIT
 * 
 * CRYSTALLIZER — INVARIANT CREATION & MANAGEMENT
 * ================================================
 * 
 * Creates new invariants and manages their lifecycle:
 * - Crystallization (initial creation with hash)
 * - Proof attachment (append-only)
 * - Impossibility declaration (append-only)
 * - Computed field recalculation
 * 
 * INVARIANTS:
 * - INV-CRYST-01: Crystallization produces a valid SHA-256 hash
 * - INV-CRYST-02: Computed fields are deterministically derived
 * - INV-CRYST-03: Append operations never modify existing data
 * - INV-CRYST-04: Hash changes only when crystallized content changes
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { createHash } from 'crypto';
import {
  type CrystallineInvariant,
  type InvariantProof,
  type InvariantProperty,
  type InvariantLineage,
  type InvariantComputed,
  type ProofEvidence,
  type ProofType,
  GRAMMAR_VERSION
} from './grammar.js';

import { 
  type ProofStrength,
  getStrengthWeight,
  maxStrength
} from '../foundation/proof_strength.js';

import { HASH_ALGORITHM } from '../foundation/constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CRYSTALLIZATION INPUT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Input for creating a new invariant
 */
export interface CreateInvariantInput {
  /** Invariant ID (must match INV-XXX-NNN pattern) */
  id: string;
  
  /** Property definition */
  property: {
    natural: string;
    formal?: string;
    scope: string;
  };
  
  /** Parent invariant IDs (empty for root) */
  parents?: string[];
  
  /** Initial proofs (optional) */
  proofs?: CreateProofInput[];
  
  /** Initial impossibilities (optional) */
  impossibilities?: string[];
}

/**
 * Input for creating a new proof
 */
export interface CreateProofInput {
  type: ProofType;
  strength: ProofStrength;
  evidence: ProofEvidence;
}

/**
 * Result of crystallization
 */
export interface CrystallizationResult {
  /** The crystallized invariant */
  invariant: CrystallineInvariant;
  
  /** The computed hash */
  hash: string;
  
  /** Timestamp of crystallization */
  crystallizedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HASH COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute SHA-256 hash of invariant content
 * Only includes immutable fields (not computed, not proofs, not impossibilities)
 */
export function computeInvariantHash(
  id: string,
  property: InvariantProperty,
  lineage: InvariantLineage,
  crystallizedAt: string
): string {
  // Create canonical JSON representation
  const content = JSON.stringify({
    id,
    property: {
      natural: property.natural,
      formal: property.formal ?? null,
      scope: property.scope
    },
    lineage: {
      parents: [...lineage.parents].sort(),  // Sort for determinism
      generation: lineage.generation
    },
    crystallized_at: crystallizedAt
  });
  
  // Compute SHA-256
  const hash = createHash('sha256');
  hash.update(content, 'utf8');
  return hash.digest('hex');
}

/**
 * Verify that a hash matches the invariant content
 */
export function verifyInvariantHash(invariant: CrystallineInvariant): boolean {
  const computedHash = computeInvariantHash(
    invariant.id,
    invariant.property,
    invariant.lineage,
    invariant.crystallized_at
  );
  return computedHash === invariant.crystallized_hash;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPUTED FIELD CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute derived fields from proofs and impossibilities
 */
export function computeDerivedFields(
  proofs: readonly InvariantProof[],
  impossibilities: readonly string[]
): InvariantComputed {
  // Find dominant (strongest) proof strength
  let dominant: ProofStrength = 'Ε';  // Default to weakest
  let lastProven = '';
  
  for (const proof of proofs) {
    if (getStrengthWeight(proof.strength) > getStrengthWeight(dominant)) {
      dominant = proof.strength;
    }
    if (proof.added_at > lastProven) {
      lastProven = proof.added_at;
    }
  }
  
  // If no proofs, use current time as "last proven"
  if (!lastProven) {
    lastProven = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  }
  
  return {
    dominant_strength: dominant,
    proof_count: proofs.length,
    impossible_count: impossibilities.length,
    last_proven: lastProven
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CRYSTALLIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crystallize a new invariant
 * Creates an immutable invariant with computed hash
 */
export function crystallize(input: CreateInvariantInput): CrystallizationResult {
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  
  // Build lineage
  const parents = input.parents ?? [];
  const generation = parents.length === 0 ? 0 : 1;  // Simplified: assume direct children
  
  const lineage: InvariantLineage = Object.freeze({
    parents: Object.freeze([...parents]),
    generation
  });
  
  // Build property
  const property: InvariantProperty = Object.freeze({
    natural: input.property.natural,
    formal: input.property.formal,
    scope: input.property.scope
  });
  
  // Compute hash
  const hash = computeInvariantHash(input.id, property, lineage, now);
  
  // Build proofs
  const proofs: InvariantProof[] = (input.proofs ?? []).map(p => 
    Object.freeze({
      type: p.type,
      strength: p.strength,
      evidence: Object.freeze({ ...p.evidence }),
      added_at: now
    })
  );
  
  // Build impossibilities
  const impossibilities = Object.freeze([...(input.impossibilities ?? [])]);
  
  // Compute derived fields
  const computed = Object.freeze(computeDerivedFields(proofs, impossibilities));
  
  // Build the invariant
  const invariant: CrystallineInvariant = Object.freeze({
    id: input.id,
    crystallized_at: now,
    crystallized_hash: hash,
    lineage,
    property,
    proofs: Object.freeze(proofs),
    impossibilities,
    computed
  });
  
  return {
    invariant,
    hash,
    crystallizedAt: now
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// APPEND OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Add a proof to an existing invariant
 * Returns a NEW invariant with the proof added (immutability preserved)
 */
export function addProof(
  invariant: CrystallineInvariant,
  proof: CreateProofInput
): CrystallineInvariant {
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  
  // Create new proof
  const newProof: InvariantProof = Object.freeze({
    type: proof.type,
    strength: proof.strength,
    evidence: Object.freeze({ ...proof.evidence }),
    added_at: now
  });
  
  // Create new proofs array (append-only)
  const newProofs = Object.freeze([...invariant.proofs, newProof]);
  
  // Recompute derived fields
  const newComputed = Object.freeze(
    computeDerivedFields(newProofs, invariant.impossibilities)
  );
  
  // Return new invariant (immutability preserved)
  return Object.freeze({
    ...invariant,
    proofs: newProofs,
    computed: newComputed
  });
}

/**
 * Add an impossibility to an existing invariant
 * Returns a NEW invariant with the impossibility added
 */
export function addImpossibility(
  invariant: CrystallineInvariant,
  impossibility: string
): CrystallineInvariant {
  // Check if already exists
  if (invariant.impossibilities.includes(impossibility)) {
    return invariant;  // No change needed
  }
  
  // Create new impossibilities array
  const newImpossibilities = Object.freeze([
    ...invariant.impossibilities,
    impossibility
  ]);
  
  // Recompute derived fields
  const newComputed = Object.freeze(
    computeDerivedFields(invariant.proofs, newImpossibilities)
  );
  
  // Return new invariant
  return Object.freeze({
    ...invariant,
    impossibilities: newImpossibilities,
    computed: newComputed
  });
}

/**
 * Add multiple proofs at once
 */
export function addProofs(
  invariant: CrystallineInvariant,
  proofs: readonly CreateProofInput[]
): CrystallineInvariant {
  let result = invariant;
  for (const proof of proofs) {
    result = addProof(result, proof);
  }
  return result;
}

/**
 * Add multiple impossibilities at once
 */
export function addImpossibilities(
  invariant: CrystallineInvariant,
  impossibilities: readonly string[]
): CrystallineInvariant {
  let result = invariant;
  for (const imp of impossibilities) {
    result = addImpossibility(result, imp);
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if an invariant has any proofs
 */
export function hasProofs(invariant: CrystallineInvariant): boolean {
  return invariant.proofs.length > 0;
}

/**
 * Check if an invariant has any impossibilities
 */
export function hasImpossibilities(invariant: CrystallineInvariant): boolean {
  return invariant.impossibilities.length > 0;
}

/**
 * Get the strongest proof in an invariant
 */
export function getStrongestProof(
  invariant: CrystallineInvariant
): InvariantProof | undefined {
  if (invariant.proofs.length === 0) {
    return undefined;
  }
  
  let strongest = invariant.proofs[0];
  for (const proof of invariant.proofs) {
    if (proof && strongest && 
        getStrengthWeight(proof.strength) > getStrengthWeight(strongest.strength)) {
      strongest = proof;
    }
  }
  return strongest;
}

/**
 * Get all proofs of a specific type
 */
export function getProofsByType(
  invariant: CrystallineInvariant,
  type: ProofType
): readonly InvariantProof[] {
  return invariant.proofs.filter(p => p.type === type);
}

/**
 * Get all proofs at or above a minimum strength
 */
export function getProofsByMinStrength(
  invariant: CrystallineInvariant,
  minStrength: ProofStrength
): readonly InvariantProof[] {
  const minWeight = getStrengthWeight(minStrength);
  return invariant.proofs.filter(
    p => getStrengthWeight(p.strength) >= minWeight
  );
}

/**
 * Check if an invariant meets a minimum proof strength
 */
export function meetsMinStrength(
  invariant: CrystallineInvariant,
  minStrength: ProofStrength
): boolean {
  return getStrengthWeight(invariant.computed.dominant_strength) >= 
         getStrengthWeight(minStrength);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convert invariant to YAML-compatible object
 */
export function toYAMLObject(invariant: CrystallineInvariant): object {
  return {
    idl_version: GRAMMAR_VERSION,
    invariant: {
      id: invariant.id,
      crystallized_at: invariant.crystallized_at,
      crystallized_hash: invariant.crystallized_hash,
      lineage: {
        parents: [...invariant.lineage.parents],
        generation: invariant.lineage.generation
      },
      property: {
        natural: invariant.property.natural,
        formal: invariant.property.formal,
        scope: invariant.property.scope
      },
      proofs: invariant.proofs.map(p => ({
        type: p.type,
        strength: p.strength,
        evidence: { ...p.evidence },
        added_at: p.added_at
      })),
      impossibilities: [...invariant.impossibilities],
      computed: { ...invariant.computed }
    }
  };
}

/**
 * Convert invariant to JSON string
 */
export function toJSON(invariant: CrystallineInvariant): string {
  return JSON.stringify(toYAMLObject(invariant), null, 2);
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a test proof
 */
export function createTestProof(
  file: string,
  testCase: string,
  coverage: number = 1.0
): CreateProofInput {
  return {
    type: 'test',
    strength: 'Ε',
    evidence: {
      file,
      case: testCase,
      coverage
    }
  };
}

/**
 * Create an adversarial proof
 */
export function createAdversarialProof(
  corpus: string,
  attacksSurvived: number,
  coverageOfCorpus: number
): CreateProofInput {
  return {
    type: 'adversarial',
    strength: 'Δ',
    evidence: {
      corpus,
      attacks_survived: attacksSurvived,
      coverage_of_corpus: coverageOfCorpus
    }
  };
}

/**
 * Create a formal proof
 */
export function createFormalProof(
  prover: string,
  theorem: string,
  verified: boolean = true
): CreateProofInput {
  return {
    type: 'formal',
    strength: verified ? 'Λ' : 'Δ',
    evidence: {
      prover,
      theorem,
      verified
    }
  };
}

/**
 * Create an architectural proof (impossibility)
 */
export function createArchitecturalProof(
  notes: string
): CreateProofInput {
  return {
    type: 'architectural',
    strength: 'Ω',
    evidence: {
      notes
    }
  };
}
