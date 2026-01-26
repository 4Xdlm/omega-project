/**
 * OMEGA Phase C — Evidence Assembler
 * 
 * Version: 1.0.0
 * Date: 2026-01-26
 * Standard: NASA-Grade L4
 * 
 * Purpose:
 * - Normalize evidence for evaluation
 * - Sort proofs deterministically
 * - Compute canonical hashes
 * - Build canonical EvidencePack
 */

import {
  EvidencePack,
  Proof,
  MissingEvidence,
  SentinelJudgeError,
  ERROR_CODES,
} from '../types.js';
import { sha256 } from '../digest.js';
import { toCanonicalJson } from '../canonical_json.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Input for assembling an EvidencePack
 */
export interface AssembleEvidenceInput {
  /** Raw proofs to include */
  proofs: Proof[];
  /** Missing evidence declarations */
  missing?: MissingEvidence[];
}

/**
 * Result of evidence assembly
 */
export interface AssembleEvidenceResult {
  /** The assembled EvidencePack */
  evidencePack: EvidencePack;
  /** Sorted proof hashes for verification */
  sortedHashes: string[];
  /** Whether any blocking evidence is missing */
  hasBlockingMissing: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Normalize a single proof
 * - Trims whitespace from string fields
 * - Validates hash format
 * - Ensures consistent structure
 */
export function normalizeProof(proof: Proof): Proof {
  // Validate hash
  if (!/^[a-f0-9]{64}$/.test(proof.hash)) {
    throw new SentinelJudgeError(
      ERROR_CODES.DIGEST_02,
      `Invalid proof hash format: "${proof.hash}"`,
      { proofType: proof.proofType, source: proof.source }
    );
  }
  
  return {
    proofType: proof.proofType.trim(),
    source: proof.source.trim(),
    sourceVersion: proof.sourceVersion.trim(),
    hash: proof.hash.toLowerCase(),
    verdict: proof.verdict,
    metrics: proof.metrics,
  };
}

/**
 * Normalize missing evidence declaration
 */
export function normalizeMissingEvidence(missing: MissingEvidence): MissingEvidence {
  return {
    evidenceType: missing.evidenceType.trim(),
    reason: missing.reason.trim(),
    blocksVerdict: missing.blocksVerdict,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SORTING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sort proofs deterministically by hash
 */
export function sortProofs(proofs: Proof[]): Proof[] {
  return [...proofs].sort((a, b) => a.hash.localeCompare(b.hash));
}

/**
 * Sort missing evidence declarations by evidenceType
 */
export function sortMissing(missing: MissingEvidence[]): MissingEvidence[] {
  return [...missing].sort((a, b) => a.evidenceType.localeCompare(b.evidenceType));
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIGEST COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute inputsDigest from sorted proof hashes
 * 
 * Algorithm:
 * 1. Extract hashes from all proofs
 * 2. Sort hashes alphabetically
 * 3. Create canonical JSON array
 * 4. Compute SHA-256
 */
export function computeInputsDigest(proofs: Proof[]): string {
  const sortedHashes = proofs.map(p => p.hash).sort();
  return sha256(toCanonicalJson(sortedHashes));
}

/**
 * Verify that an inputsDigest is correct for given proofs
 */
export function verifyInputsDigest(evidencePack: EvidencePack): boolean {
  const computed = computeInputsDigest(evidencePack.proofs);
  return computed === evidencePack.inputsDigest;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ASSEMBLY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Assemble a canonical EvidencePack from raw inputs
 * 
 * @param input - Raw proofs and missing evidence
 * @returns Assembled result with canonical EvidencePack
 */
export function assembleEvidence(input: AssembleEvidenceInput): AssembleEvidenceResult {
  // Normalize all proofs
  const normalizedProofs = input.proofs.map(normalizeProof);
  
  // Sort proofs by hash
  const sortedProofs = sortProofs(normalizedProofs);
  
  // Normalize and sort missing evidence
  const normalizedMissing = (input.missing ?? []).map(normalizeMissingEvidence);
  const sortedMissing = sortMissing(normalizedMissing);
  
  // Extract sorted hashes
  const sortedHashes = sortedProofs.map(p => p.hash);
  
  // Compute inputsDigest
  const inputsDigest = sha256(toCanonicalJson(sortedHashes));
  
  // Check for blocking missing evidence
  const hasBlockingMissing = sortedMissing.some(m => m.blocksVerdict);
  
  // Build EvidencePack
  const evidencePack: EvidencePack = {
    inputsDigest,
    proofs: sortedProofs,
    missing: sortedMissing,
  };
  
  return {
    evidencePack,
    sortedHashes,
    hasBlockingMissing,
  };
}

/**
 * Create an empty EvidencePack with no proofs
 */
export function createEmptyEvidencePack(): EvidencePack {
  const emptyDigest = sha256(toCanonicalJson([]));
  return {
    inputsDigest: emptyDigest,
    proofs: [],
    missing: [],
  };
}

/**
 * Merge multiple EvidencePacks into one
 * - Combines all proofs
 * - Combines all missing evidence
 * - Recomputes inputsDigest
 */
export function mergeEvidencePacks(packs: EvidencePack[]): EvidencePack {
  const allProofs: Proof[] = [];
  const allMissing: MissingEvidence[] = [];
  
  for (const pack of packs) {
    allProofs.push(...pack.proofs);
    allMissing.push(...pack.missing);
  }
  
  // Deduplicate proofs by hash
  const uniqueProofs = new Map<string, Proof>();
  for (const proof of allProofs) {
    uniqueProofs.set(proof.hash, proof);
  }
  
  // Deduplicate missing by evidenceType
  const uniqueMissing = new Map<string, MissingEvidence>();
  for (const missing of allMissing) {
    // Prefer blocksVerdict = true if duplicate
    const existing = uniqueMissing.get(missing.evidenceType);
    if (!existing || (missing.blocksVerdict && !existing.blocksVerdict)) {
      uniqueMissing.set(missing.evidenceType, missing);
    }
  }
  
  return assembleEvidence({
    proofs: Array.from(uniqueProofs.values()),
    missing: Array.from(uniqueMissing.values()),
  }).evidencePack;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVIDENCE EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extract evidence reference hashes from an EvidencePack
 * Returns sorted unique hashes for inclusion in Judgement.evidenceRefs
 */
export function extractEvidenceRefs(evidencePack: EvidencePack): string[] {
  const hashes = evidencePack.proofs.map(p => p.hash);
  return [...new Set(hashes)].sort();
}

/**
 * Filter proofs by verdict
 */
export function filterProofsByVerdict(
  proofs: Proof[],
  verdict: 'PASS' | 'FAIL' | 'WARN' | 'SKIP'
): Proof[] {
  return proofs.filter(p => p.verdict === verdict);
}

/**
 * Check if all proofs have PASS verdict
 */
export function allProofsPass(proofs: Proof[]): boolean {
  return proofs.every(p => p.verdict === 'PASS');
}

/**
 * Check if any proof has FAIL verdict
 */
export function hasFailingProof(proofs: Proof[]): boolean {
  return proofs.some(p => p.verdict === 'FAIL');
}
