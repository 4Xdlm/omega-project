/**
 * OMEGA RESILIENCE PROOF SYSTEM
 * Resilience Crystal - Module Index
 * 
 * Phase 23 - Sprint 23.4
 */

// Types
export {
  // Branded types
  CrystalId,
  ProofId,
  CrystalSeal,
  
  // Enums
  ProofStatus,
  ProofCategory,
  CrystalStatus,
  
  // Proof types
  Proof,
  ProofEvidence,
  TestResults,
  FormalVerificationResult,
  StressTestSummary,
  
  // Coverage types
  CoverageCell,
  CoverageMatrix,
  
  // Crystal types
  ResilienceCrystal,
  CrystalSummary,
  CrystalMetadata,
  
  // Factory functions
  crystalId,
  proofId,
  crystalSeal,
  
  // Type guards
  isProven,
  isFailed,
  isSealed,
  
  // Constants
  ALL_PROOF_STATUSES,
  ALL_PROOF_CATEGORIES,
  ALL_CRYSTAL_STATUSES,
  CRITICAL_INVARIANTS,
} from './types.js';

// Builder
export {
  ProofBuilder,
  createProof,
  CoverageMatrixBuilder,
  createCoverageMatrix,
  CrystalBuilder,
  createCrystal,
  verifyCrystalSeal,
  isCrystalComplete,
  getMissingCriticalProofs,
} from './builder.js';
