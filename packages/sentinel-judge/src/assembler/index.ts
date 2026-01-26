/**
 * OMEGA Phase C — Assembler Module Export
 * 
 * Version: 1.0.0
 * Date: 2026-01-26
 */

export {
  assembleEvidence,
  computeInputsDigest,
  verifyInputsDigest,
  createEmptyEvidencePack,
  mergeEvidencePacks,
  extractEvidenceRefs,
  filterProofsByVerdict,
  allProofsPass,
  hasFailingProof,
  normalizeProof,
  normalizeMissingEvidence,
  sortProofs,
  sortMissing,
  type AssembleEvidenceInput,
  type AssembleEvidenceResult,
} from './evidence-assembler.js';
