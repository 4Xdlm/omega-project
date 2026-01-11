/**
 * @fileoverview OMEGA Proof Pack - Verifier
 * @module @omega/proof-pack/verifier
 *
 * Verifies proof pack integrity.
 */

import { sha256 } from '@omega/orchestrator-core';
import type {
  ProofPackBundle,
  ProofPackManifest,
  PackVerificationResult,
  EvidenceVerificationResult,
  VerificationSummary,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// VERIFICATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verify a proof pack bundle.
 */
export function verifyProofPack(bundle: ProofPackBundle): PackVerificationResult {
  const { manifest, content } = bundle;
  const evidenceResults: EvidenceVerificationResult[] = [];
  let verified = 0;
  let failed = 0;
  let missing = 0;

  // Verify each evidence entry
  for (const entry of manifest.evidence) {
    const fileContent = content[entry.path];

    if (fileContent === undefined) {
      evidenceResults.push({
        evidenceId: entry.id,
        valid: false,
        expectedHash: entry.hash,
        actualHash: '',
        error: `Evidence file not found: ${entry.path}`,
      });
      missing++;
      continue;
    }

    const actualHash = sha256(fileContent);
    const valid = actualHash === entry.hash;

    evidenceResults.push({
      evidenceId: entry.id,
      valid,
      expectedHash: entry.hash,
      actualHash,
      error: valid ? undefined : 'Hash mismatch',
    });

    if (valid) {
      verified++;
    } else {
      failed++;
    }
  }

  // Verify root hash
  const computedRootHash = computeRootHash(manifest);
  const rootHashValid = computedRootHash === manifest.rootHash;

  const summary: VerificationSummary = {
    total: manifest.evidence.length,
    verified,
    failed,
    missing,
  };

  return {
    packId: manifest.packId,
    valid: rootHashValid && failed === 0 && missing === 0,
    rootHashValid,
    evidenceResults,
    verifiedAt: new Date().toISOString(),
    summary,
  };
}

/**
 * Verify only the manifest integrity (without content).
 */
export function verifyManifest(manifest: ProofPackManifest): boolean {
  const computedRootHash = computeRootHash(manifest);
  return computedRootHash === manifest.rootHash;
}

/**
 * Verify a single evidence entry.
 */
export function verifyEvidence(
  content: string,
  expectedHash: string
): boolean {
  const actualHash = sha256(content);
  return actualHash === expectedHash;
}

/**
 * Compute the root hash from manifest evidence.
 */
export function computeRootHash(manifest: ProofPackManifest): string {
  const sortedHashes = [...manifest.evidence]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((e) => e.hash)
    .join(':');

  return sha256(sortedHashes);
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate manifest structure.
 */
export function validateManifest(manifest: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, errors: ['Manifest must be an object'] };
  }

  const m = manifest as Record<string, unknown>;

  if (!m.version || typeof m.version !== 'string') {
    errors.push('Missing or invalid version');
  }

  if (!m.packId || typeof m.packId !== 'string') {
    errors.push('Missing or invalid packId');
  }

  if (!m.name || typeof m.name !== 'string') {
    errors.push('Missing or invalid name');
  }

  if (!m.createdAt || typeof m.createdAt !== 'string') {
    errors.push('Missing or invalid createdAt');
  }

  if (!Array.isArray(m.evidence)) {
    errors.push('Missing or invalid evidence array');
  } else {
    for (let i = 0; i < m.evidence.length; i++) {
      const e = m.evidence[i];
      if (!e || typeof e !== 'object') {
        errors.push(`Evidence ${i} is not an object`);
        continue;
      }

      const entry = e as Record<string, unknown>;
      if (!entry.id) errors.push(`Evidence ${i} missing id`);
      if (!entry.type) errors.push(`Evidence ${i} missing type`);
      if (!entry.path) errors.push(`Evidence ${i} missing path`);
      if (!entry.hash) errors.push(`Evidence ${i} missing hash`);
    }
  }

  if (!m.metadata || typeof m.metadata !== 'object') {
    errors.push('Missing or invalid metadata');
  }

  if (!m.rootHash || typeof m.rootHash !== 'string') {
    errors.push('Missing or invalid rootHash');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Check if a verification result is fully valid.
 */
export function isFullyVerified(result: PackVerificationResult): boolean {
  return (
    result.valid &&
    result.rootHashValid &&
    result.summary.failed === 0 &&
    result.summary.missing === 0 &&
    result.summary.verified === result.summary.total
  );
}

/**
 * Get failed evidence from verification result.
 */
export function getFailedEvidence(
  result: PackVerificationResult
): readonly EvidenceVerificationResult[] {
  return result.evidenceResults.filter((e) => !e.valid);
}

/**
 * Get verification report as string.
 */
export function formatVerificationReport(result: PackVerificationResult): string {
  const lines: string[] = [];

  lines.push(`# Proof Pack Verification Report`);
  lines.push(`Pack ID: ${result.packId}`);
  lines.push(`Verified At: ${result.verifiedAt}`);
  lines.push(``);
  lines.push(`## Summary`);
  lines.push(`- Total Evidence: ${result.summary.total}`);
  lines.push(`- Verified: ${result.summary.verified}`);
  lines.push(`- Failed: ${result.summary.failed}`);
  lines.push(`- Missing: ${result.summary.missing}`);
  lines.push(`- Root Hash Valid: ${result.rootHashValid ? 'YES' : 'NO'}`);
  lines.push(`- Overall Valid: ${result.valid ? 'YES' : 'NO'}`);
  lines.push(``);

  if (result.summary.failed > 0 || result.summary.missing > 0) {
    lines.push(`## Failed Evidence`);
    for (const ev of result.evidenceResults.filter((e) => !e.valid)) {
      lines.push(`- ${ev.evidenceId}: ${ev.error}`);
      if (ev.expectedHash && ev.actualHash) {
        lines.push(`  Expected: ${ev.expectedHash}`);
        lines.push(`  Actual: ${ev.actualHash}`);
      }
    }
  }

  return lines.join('\n');
}
