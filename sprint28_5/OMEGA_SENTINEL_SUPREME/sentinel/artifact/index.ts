/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — ARTIFACT MODULE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module artifact
 * @version 2.0.0
 * 
 * ARTIFACT — Certification Evidence Package
 * 
 * The artifact module provides:
 * - Artifact: Certification evidence package structure
 * - Serialization: JSON/YAML import/export
 * - Verification: Hash integrity checking
 * 
 * An artifact is the immutable proof that an invariant has achieved
 * a certain certification level.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ARTIFACT
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Types
  type ArtifactStatus,
  type EvidenceItem,
  type CertificationArtifact,
  type CreateArtifactInput,
  
  // Creation
  generateUUID,
  createArtifact,
  
  // Evidence management
  addEvidence,
  createProofEvidence,
  createFalsificationEvidence,
  createAssertionEvidence,
  createReferenceEvidence,
  
  // Hash computation
  computeHash,
  computeArtifactHash,
  
  // Sealing
  sealArtifact,
  addExternalCertifier,
  revokeArtifact,
  
  // Verification
  verifyArtifactHash,
  isSealed,
  isValid,
  
  // Queries
  getEvidenceByType,
  getProofEvidence,
  getFalsificationEvidence,
  countEvidence,
  hasExternalCertifier,
  
  // Chain operations
  isChained,
  createLinkedArtifact,
  
  // Type guards
  isValidStatus,
  isValidEvidenceType
} from './artifact.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SERIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Types
  type SerializationFormat,
  type SerializationOptions,
  type DeserializationResult,
  
  // JSON
  toJSON,
  fromJSON,
  
  // YAML
  toYAML,
  
  // Generic
  serialize,
  isValidArtifactJSON,
  getArtifactSummary
} from './serialization.js';
