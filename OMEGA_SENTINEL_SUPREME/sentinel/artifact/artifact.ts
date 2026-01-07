/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — CERTIFICATION ARTIFACT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module artifact/artifact
 * @version 2.0.0
 * @license MIT
 * 
 * ARTIFACT — CERTIFICATION EVIDENCE PACKAGE
 * ==========================================
 * 
 * A certification artifact is the immutable evidence package that proves
 * an invariant has achieved a certain certification level:
 * - Links invariant to its proofs
 * - Records falsification attempts
 * - Captures region determination
 * - Signed and hash-chained for integrity
 * 
 * INVARIANTS:
 * - INV-ART-01: Artifact hash is deterministically computed
 * - INV-ART-02: Artifact is immutable after creation
 * - INV-ART-03: Evidence chain is hash-linked
 * - INV-ART-04: Artifact references are valid
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { createHash } from 'crypto';
import { type ProofStrength } from '../foundation/proof_strength.js';
import { type RegionId } from '../regions/definitions.js';
import { type CertificationMetrics } from '../regions/containment.js';
import { SENTINEL_VERSION, HASH_ALGORITHM } from '../foundation/constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Artifact status
 */
export type ArtifactStatus = 
  | 'DRAFT'      // Being constructed
  | 'SEALED'     // Finalized, hash computed
  | 'VERIFIED'   // Independently verified
  | 'REVOKED';   // No longer valid

/**
 * Evidence item in the artifact
 */
export interface EvidenceItem {
  /** Evidence type */
  readonly type: 'proof' | 'falsification' | 'assertion' | 'reference';
  
  /** Evidence identifier */
  readonly id: string;
  
  /** Description */
  readonly description: string;
  
  /** Strength (for proofs) */
  readonly strength?: ProofStrength;
  
  /** Timestamp */
  readonly timestamp: string;
  
  /** Hash of evidence content */
  readonly contentHash: string;
  
  /** URI to evidence source */
  readonly sourceUri?: string;
}

/**
 * Certification artifact
 */
export interface CertificationArtifact {
  /** Artifact ID (UUID) */
  readonly id: string;
  
  /** SENTINEL version that created this */
  readonly version: string;
  
  /** Artifact status */
  readonly status: ArtifactStatus;
  
  /** Creation timestamp */
  readonly createdAt: string;
  
  /** Last modified timestamp */
  readonly modifiedAt: string;
  
  /** Sealed timestamp (when finalized) */
  readonly sealedAt: string | null;
  
  /** Invariant ID this certifies */
  readonly invariantId: string;
  
  /** Invariant hash at certification time */
  readonly invariantHash: string;
  
  /** Achieved certification region */
  readonly region: RegionId;
  
  /** Certification metrics at time of certification */
  readonly metrics: CertificationMetrics;
  
  /** Evidence items */
  readonly evidence: readonly EvidenceItem[];
  
  /** Previous artifact in chain (if upgrade) */
  readonly previousArtifactHash: string | null;
  
  /** Artifact hash (computed on seal) */
  readonly hash: string | null;
  
  /** External certifier ID (for TRANSCENDENT) */
  readonly externalCertifierId: string | null;
  
  /** External certifier signature (for TRANSCENDENT) */
  readonly externalCertifierSignature: string | null;
  
  /** Notes/comments */
  readonly notes: readonly string[];
}

/**
 * Input for creating a new artifact
 */
export interface CreateArtifactInput {
  /** Invariant ID */
  readonly invariantId: string;
  
  /** Invariant hash */
  readonly invariantHash: string;
  
  /** Achieved region */
  readonly region: RegionId;
  
  /** Metrics */
  readonly metrics: CertificationMetrics;
  
  /** Optional previous artifact hash */
  readonly previousArtifactHash?: string;
  
  /** Optional notes */
  readonly notes?: readonly string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// UUID GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  // Simple UUID v4 generator
  const hex = '0123456789abcdef';
  let uuid = '';
  
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid += '-';
    } else if (i === 14) {
      uuid += '4'; // Version 4
    } else if (i === 19) {
      uuid += hex[(Math.random() * 4 | 8)]; // Variant
    } else {
      uuid += hex[Math.random() * 16 | 0];
    }
  }
  
  return uuid;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARTIFACT CREATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new certification artifact
 */
export function createArtifact(input: CreateArtifactInput): CertificationArtifact {
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  
  return Object.freeze({
    id: generateUUID(),
    version: SENTINEL_VERSION,
    status: 'DRAFT',
    createdAt: now,
    modifiedAt: now,
    sealedAt: null,
    invariantId: input.invariantId,
    invariantHash: input.invariantHash,
    region: input.region,
    metrics: input.metrics,
    evidence: Object.freeze([]),
    previousArtifactHash: input.previousArtifactHash ?? null,
    hash: null,
    externalCertifierId: null,
    externalCertifierSignature: null,
    notes: Object.freeze(input.notes ?? [])
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVIDENCE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Add evidence to an artifact (returns new artifact)
 */
export function addEvidence(
  artifact: CertificationArtifact,
  evidence: EvidenceItem
): CertificationArtifact {
  if (artifact.status !== 'DRAFT') {
    throw new Error('Cannot modify sealed artifact');
  }
  
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  
  return Object.freeze({
    ...artifact,
    modifiedAt: now,
    evidence: Object.freeze([...artifact.evidence, evidence])
  });
}

/**
 * Create a proof evidence item
 */
export function createProofEvidence(
  id: string,
  description: string,
  strength: ProofStrength,
  contentHash: string,
  sourceUri?: string
): EvidenceItem {
  return Object.freeze({
    type: 'proof',
    id,
    description,
    strength,
    timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    contentHash,
    sourceUri
  });
}

/**
 * Create a falsification evidence item
 */
export function createFalsificationEvidence(
  id: string,
  description: string,
  contentHash: string,
  sourceUri?: string
): EvidenceItem {
  return Object.freeze({
    type: 'falsification',
    id,
    description,
    timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    contentHash,
    sourceUri
  });
}

/**
 * Create an assertion evidence item
 */
export function createAssertionEvidence(
  id: string,
  description: string,
  contentHash: string
): EvidenceItem {
  return Object.freeze({
    type: 'assertion',
    id,
    description,
    timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    contentHash
  });
}

/**
 * Create a reference evidence item
 */
export function createReferenceEvidence(
  id: string,
  description: string,
  sourceUri: string
): EvidenceItem {
  return Object.freeze({
    type: 'reference',
    id,
    description,
    timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    contentHash: computeHash(sourceUri),
    sourceUri
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// HASH COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute SHA-256 hash of a string
 */
export function computeHash(content: string): string {
  return createHash(HASH_ALGORITHM)
    .update(content, 'utf8')
    .digest('hex');
}

/**
 * Compute artifact hash (deterministic)
 * Includes all immutable fields except the hash itself
 */
export function computeArtifactHash(artifact: CertificationArtifact): string {
  // Create canonical representation for hashing
  const canonical = {
    id: artifact.id,
    version: artifact.version,
    createdAt: artifact.createdAt,
    invariantId: artifact.invariantId,
    invariantHash: artifact.invariantHash,
    region: artifact.region,
    metrics: {
      proofStrength: artifact.metrics.proofStrength,
      survivalRate: artifact.metrics.survivalRate,
      coverage: artifact.metrics.coverage,
      proofCount: artifact.metrics.proofCount,
      mandatoryCoverage: artifact.metrics.mandatoryCoverage,
      hasExternalCertifier: artifact.metrics.hasExternalCertifier,
      isSystemValid: artifact.metrics.isSystemValid
    },
    evidence: artifact.evidence.map(e => ({
      type: e.type,
      id: e.id,
      description: e.description,
      strength: e.strength,
      timestamp: e.timestamp,
      contentHash: e.contentHash,
      sourceUri: e.sourceUri
    })),
    previousArtifactHash: artifact.previousArtifactHash,
    notes: artifact.notes
  };
  
  return computeHash(JSON.stringify(canonical));
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEALING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Seal an artifact (compute hash, make immutable)
 */
export function sealArtifact(artifact: CertificationArtifact): CertificationArtifact {
  if (artifact.status !== 'DRAFT') {
    throw new Error('Can only seal DRAFT artifacts');
  }
  
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const hash = computeArtifactHash(artifact);
  
  return Object.freeze({
    ...artifact,
    status: 'SEALED',
    modifiedAt: now,
    sealedAt: now,
    hash
  });
}

/**
 * Add external certifier (for TRANSCENDENT)
 */
export function addExternalCertifier(
  artifact: CertificationArtifact,
  certifierId: string,
  signature: string
): CertificationArtifact {
  if (artifact.status !== 'SEALED') {
    throw new Error('Can only add certifier to SEALED artifacts');
  }
  
  if (artifact.region !== 'TRANSCENDENT') {
    throw new Error('External certifier only for TRANSCENDENT region');
  }
  
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  
  return Object.freeze({
    ...artifact,
    status: 'VERIFIED',
    modifiedAt: now,
    externalCertifierId: certifierId,
    externalCertifierSignature: signature
  });
}

/**
 * Revoke an artifact
 */
export function revokeArtifact(
  artifact: CertificationArtifact,
  reason: string
): CertificationArtifact {
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  
  return Object.freeze({
    ...artifact,
    status: 'REVOKED',
    modifiedAt: now,
    notes: Object.freeze([...artifact.notes, `REVOKED: ${reason}`])
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verify artifact hash integrity
 */
export function verifyArtifactHash(artifact: CertificationArtifact): boolean {
  if (!artifact.hash) {
    return false;
  }
  
  const computed = computeArtifactHash(artifact);
  return computed === artifact.hash;
}

/**
 * Verify artifact is properly sealed
 */
export function isSealed(artifact: CertificationArtifact): boolean {
  return artifact.status === 'SEALED' || 
         artifact.status === 'VERIFIED';
}

/**
 * Verify artifact is valid (not revoked, hash valid)
 */
export function isValid(artifact: CertificationArtifact): boolean {
  if (artifact.status === 'REVOKED') {
    return false;
  }
  
  if (artifact.status === 'DRAFT') {
    return true; // Draft is valid but not sealed
  }
  
  return verifyArtifactHash(artifact);
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get evidence by type
 */
export function getEvidenceByType(
  artifact: CertificationArtifact,
  type: EvidenceItem['type']
): readonly EvidenceItem[] {
  return artifact.evidence.filter(e => e.type === type);
}

/**
 * Get proof evidence items
 */
export function getProofEvidence(artifact: CertificationArtifact): readonly EvidenceItem[] {
  return getEvidenceByType(artifact, 'proof');
}

/**
 * Get falsification evidence items
 */
export function getFalsificationEvidence(artifact: CertificationArtifact): readonly EvidenceItem[] {
  return getEvidenceByType(artifact, 'falsification');
}

/**
 * Count evidence items
 */
export function countEvidence(artifact: CertificationArtifact): number {
  return artifact.evidence.length;
}

/**
 * Check if artifact has external certifier
 */
export function hasExternalCertifier(artifact: CertificationArtifact): boolean {
  return artifact.externalCertifierId !== null && 
         artifact.externalCertifierSignature !== null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAIN OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if artifact is part of a chain (has previous)
 */
export function isChained(artifact: CertificationArtifact): boolean {
  return artifact.previousArtifactHash !== null;
}

/**
 * Create a new artifact that links to a previous one
 */
export function createLinkedArtifact(
  input: CreateArtifactInput,
  previousArtifact: CertificationArtifact
): CertificationArtifact {
  if (!previousArtifact.hash) {
    throw new Error('Previous artifact must be sealed');
  }
  
  return createArtifact({
    ...input,
    previousArtifactHash: previousArtifact.hash
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if status is valid
 */
export function isValidStatus(value: unknown): value is ArtifactStatus {
  return typeof value === 'string' && 
    ['DRAFT', 'SEALED', 'VERIFIED', 'REVOKED'].includes(value);
}

/**
 * Check if evidence type is valid
 */
export function isValidEvidenceType(value: unknown): value is EvidenceItem['type'] {
  return typeof value === 'string' && 
    ['proof', 'falsification', 'assertion', 'reference'].includes(value);
}
