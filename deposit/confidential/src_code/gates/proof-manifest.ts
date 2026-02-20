/**
 * OMEGA Truth Gate Proof Manifest v1.0
 * Phase F - NASA-Grade L4 / DO-178C
 *
 * F6: Creates audit-proof manifest of gate execution
 *
 * INVARIANTS:
 * - F6-INV-01: proofHash does NOT include timestamp
 * - F6-INV-02: All inputs recorded
 * - F6-INV-03: Hash is deterministic
 * - F6-INV-04: Manifest is immutable after creation
 * - F6-INV-05: Version is tracked
 *
 * SPEC: TRUTH_GATE_SPEC v1.0 §F6
 */

import { hashCanonical, sha256 } from '../shared/canonical';
import { normalizeForCanon } from '../canon';
import type { ChainHash } from '../canon';
import type { ProofManifest, VerdictResult, ClassifiedFact, ProofHash } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Current gate version */
export const GATE_VERSION = '1.0.0';

// ═══════════════════════════════════════════════════════════════════════════════
// HASH COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Computes deterministic proof hash.
 *
 * F6-INV-01: timestamp is NOT included in hash
 * F6-INV-03: Hash is deterministic
 *
 * @param inputHash - Hash of input text
 * @param verdict - Verdict result
 * @param facts - Classified facts
 * @param canonStateHash - CANON state hash
 * @returns Deterministic proof hash
 */
export function computeProofHash(
  inputHash: ChainHash,
  verdict: VerdictResult,
  facts: readonly ClassifiedFact[],
  canonStateHash: ChainHash
): ProofHash {
  // F6-INV-01: Do NOT include timestamp
  // Only include deterministic inputs
  const hashInput = normalizeForCanon({
    inputHash,
    verdict: {
      verdict: verdict.verdict,
      violationCount: verdict.violations.length,
      violationCodes: verdict.violations.map(v => v.code).sort(),
      factsProcessed: verdict.factsProcessed,
      strictFactsChecked: verdict.strictFactsChecked,
    },
    factIds: facts.map(f => f.id).sort(), // Sort for determinism
    canonStateHash,
    gateVersion: GATE_VERSION,
  });

  return hashCanonical(hashInput) as ProofHash;
}

/**
 * Computes hash of input text.
 *
 * @param text - Input text
 * @returns Hash of text
 */
export function computeInputHash(text: string): ChainHash {
  return sha256(text) as ChainHash;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MANIFEST CREATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates a proof manifest.
 *
 * F6-INV-01: proofHash excludes timestamp
 * F6-INV-02: All inputs recorded
 * F6-INV-03: Hash is deterministic
 * F6-INV-04: Manifest is frozen (immutable)
 * F6-INV-05: Version tracked
 *
 * @param inputText - Original input text
 * @param verdict - Verdict result
 * @param facts - All classified facts
 * @param canonStateHash - CANON state hash at time of check
 * @param timestamp - Execution timestamp (optional, defaults to now)
 * @returns Immutable proof manifest
 */
export function createProofManifest(
  inputText: string,
  verdict: VerdictResult,
  facts: readonly ClassifiedFact[],
  canonStateHash: ChainHash,
  timestamp?: string
): ProofManifest {
  const inputHash = computeInputHash(inputText);

  // F6-INV-01: proofHash computed without timestamp
  const proofHash = computeProofHash(inputHash, verdict, facts, canonStateHash);

  // F6-INV-02: Record all inputs
  const manifest: ProofManifest = {
    proofHash,
    inputHash,
    verdict,
    facts: Object.freeze([...facts]),
    timestamp: timestamp ?? new Date().toISOString(),
    gateVersion: GATE_VERSION,
    canonStateHash,
  };

  // F6-INV-04: Freeze manifest
  return Object.freeze(manifest);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MANIFEST VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verifies a proof manifest's integrity.
 *
 * F6-INV-03: Recomputes hash and compares
 *
 * @param manifest - Manifest to verify
 * @param originalText - Original input text
 * @returns true if manifest is valid
 */
export function verifyProofManifest(
  manifest: ProofManifest,
  originalText: string
): boolean {
  // Verify input hash
  const computedInputHash = computeInputHash(originalText);
  if (computedInputHash !== manifest.inputHash) {
    return false;
  }

  // Verify proof hash (excludes timestamp)
  const computedProofHash = computeProofHash(
    manifest.inputHash,
    manifest.verdict,
    manifest.facts,
    manifest.canonStateHash
  );

  return computedProofHash === manifest.proofHash;
}

/**
 * Checks if two manifests have the same proof hash.
 * Different timestamps can have same proof hash.
 *
 * F6-INV-01: timestamp not in hash, so different timestamps can match
 *
 * @param a - First manifest
 * @param b - Second manifest
 * @returns true if proof hashes match
 */
export function manifestsMatch(a: ProofManifest, b: ProofManifest): boolean {
  return a.proofHash === b.proofHash;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MANIFEST SERIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Serializes a manifest to JSON string.
 *
 * @param manifest - Manifest to serialize
 * @returns JSON string
 */
export function serializeManifest(manifest: ProofManifest): string {
  // Handle bigint in facts (mono_ns might be present in some contexts)
  return JSON.stringify(manifest, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  , 2);
}

/**
 * Deserializes a manifest from JSON string.
 *
 * @param json - JSON string
 * @returns Parsed manifest
 */
export function deserializeManifest(json: string): ProofManifest {
  const parsed = JSON.parse(json);
  // Freeze to maintain immutability
  return Object.freeze({
    ...parsed,
    facts: Object.freeze(parsed.facts),
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// MANIFEST UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Gets a summary of the manifest.
 *
 * @param manifest - Manifest to summarize
 * @returns Human-readable summary
 */
export function summarizeManifest(manifest: ProofManifest): string {
  const lines: string[] = [];

  lines.push(`Proof Manifest`);
  lines.push(`==============`);
  lines.push(`Proof Hash: ${manifest.proofHash.substring(0, 16)}...`);
  lines.push(`Input Hash: ${manifest.inputHash.substring(0, 16)}...`);
  lines.push(`Verdict: ${manifest.verdict.verdict}`);
  lines.push(`Facts: ${manifest.facts.length}`);
  lines.push(`Violations: ${manifest.verdict.violations.length}`);
  lines.push(`Timestamp: ${manifest.timestamp}`);
  lines.push(`Gate Version: ${manifest.gateVersion}`);

  return lines.join('\n');
}

/**
 * Checks if a manifest has violations.
 *
 * @param manifest - Manifest to check
 * @returns true if has violations
 */
export function hasViolations(manifest: ProofManifest): boolean {
  return manifest.verdict.violations.length > 0;
}

/**
 * Gets violation count from manifest.
 *
 * @param manifest - Manifest
 * @returns Number of violations
 */
export function getViolationCount(manifest: ProofManifest): number {
  return manifest.verdict.violations.length;
}
