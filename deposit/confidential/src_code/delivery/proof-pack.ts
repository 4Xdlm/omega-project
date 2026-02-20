/**
 * OMEGA Delivery Proof Pack v1.0
 * Phase H - NASA-Grade L4 / DO-178C
 *
 * ZIP-based proof pack builder for certified deliveries.
 *
 * INVARIANTS:
 * - H-INV-01: Body bytes preserved EXACTLY
 * - H-INV-02: No network operations
 * - H-INV-03: No dynamic imports
 * - H-INV-05: Stable hashes
 * - H-INV-08: No path traversal
 *
 * SPEC: DELIVERY_SPEC v1.0 §H2
 */

import type {
  DeliveryArtifact,
  DeliveryManifest,
  DeliveryBundle,
  Sha256,
  ISO8601,
} from './types';
import { isValidFilename } from './types';
import { hashString, hashBuffer } from './hasher';
import { createManifest, serializeManifest } from './manifest';

// ═══════════════════════════════════════════════════════════════════════════════
// PROOF PACK STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Proof pack metadata.
 */
export interface ProofPackMeta {
  readonly version: '1.0';
  readonly created: ISO8601;
  readonly name: string;
  readonly description?: string;
  readonly artifactCount: number;
  readonly totalBytes: number;
  readonly packHash: Sha256;
}

/**
 * Proof pack file entry.
 */
export interface ProofPackEntry {
  readonly path: string;
  readonly content: string | Buffer;
  readonly hash: Sha256;
  readonly byteLength: number;
}

/**
 * Complete proof pack structure (in-memory representation).
 */
export interface ProofPack {
  readonly meta: ProofPackMeta;
  readonly manifest: DeliveryManifest;
  readonly entries: readonly ProofPackEntry[];
  readonly packHash: Sha256;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATH VALIDATION (H-INV-08)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validates path is safe (no traversal).
 * H-INV-08: No path traversal in delivery artifacts
 *
 * @param path - Path to validate
 * @returns true if path is safe
 */
export function isValidPath(path: string): boolean {
  // No empty paths
  if (!path || path.length === 0) {
    return false;
  }

  // No absolute paths
  if (path.startsWith('/') || path.startsWith('\\')) {
    return false;
  }

  // No drive letters (Windows)
  if (/^[a-zA-Z]:/.test(path)) {
    return false;
  }

  // No path traversal
  const segments = path.split(/[/\\]/);
  for (const segment of segments) {
    if (segment === '..') {
      return false;
    }
    if (segment === '.') {
      return false;
    }
  }

  // No null bytes
  if (path.includes('\0')) {
    return false;
  }

  return true;
}

/**
 * Normalizes path separators to forward slashes.
 *
 * @param path - Path to normalize
 * @returns Normalized path
 */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROOF PACK BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Builder options for proof pack.
 */
export interface ProofPackOptions {
  readonly name?: string;
  readonly description?: string;
  readonly includeManifest?: boolean;
  readonly includeMeta?: boolean;
  readonly basePath?: string;
}

/**
 * Creates proof pack entries from artifacts.
 *
 * @param artifacts - Artifacts to include
 * @param basePath - Base path for entries
 * @returns Proof pack entries
 */
export function createEntries(
  artifacts: readonly DeliveryArtifact[],
  basePath: string = 'artifacts'
): ProofPackEntry[] {
  const entries: ProofPackEntry[] = [];

  for (const artifact of artifacts) {
    // Validate filename
    if (!isValidFilename(artifact.filename)) {
      throw new Error(`H-INV-08 VIOLATION: Invalid filename: ${artifact.filename}`);
    }

    const path = normalizePath(`${basePath}/${artifact.filename}`);

    // Validate full path
    if (!isValidPath(path)) {
      throw new Error(`H-INV-08 VIOLATION: Invalid path: ${path}`);
    }

    const content = artifact.content;
    const hash = hashString(content);
    const byteLength = Buffer.byteLength(content, 'utf-8');

    entries.push(Object.freeze({
      path,
      content,
      hash,
      byteLength,
    }));
  }

  return entries;
}

/**
 * Builds a proof pack from artifacts.
 *
 * @param artifacts - Artifacts to include
 * @param timestamp - Creation timestamp
 * @param options - Build options
 * @returns Proof pack
 */
export function buildProofPack(
  artifacts: readonly DeliveryArtifact[],
  timestamp: ISO8601,
  options: ProofPackOptions = {}
): ProofPack {
  const name = options.name ?? 'proof-pack';
  const basePath = options.basePath ?? 'artifacts';
  const includeManifest = options.includeManifest ?? true;
  const includeMeta = options.includeMeta ?? true;

  // Create artifact entries
  const entries: ProofPackEntry[] = createEntries(artifacts, basePath);

  // Create manifest
  const manifest = createManifest(artifacts, timestamp, {
    name,
    description: options.description,
  });

  // Add manifest entry if requested
  if (includeManifest) {
    const manifestContent = serializeManifest(manifest);
    entries.push(Object.freeze({
      path: 'manifest.json',
      content: manifestContent,
      hash: hashString(manifestContent),
      byteLength: Buffer.byteLength(manifestContent, 'utf-8'),
    }));
  }

  // Compute pack hash from all entry hashes
  const allHashes = entries.map(e => e.hash).join('');
  const packHash = hashString(allHashes);

  // Create meta
  const meta: ProofPackMeta = Object.freeze({
    version: '1.0' as const,
    created: timestamp,
    name,
    description: options.description,
    artifactCount: artifacts.length,
    totalBytes: entries.reduce((sum, e) => sum + e.byteLength, 0),
    packHash,
  });

  // Add meta entry if requested
  if (includeMeta) {
    const metaContent = JSON.stringify(meta, null, 2);
    entries.push(Object.freeze({
      path: 'meta.json',
      content: metaContent,
      hash: hashString(metaContent),
      byteLength: Buffer.byteLength(metaContent, 'utf-8'),
    }));
  }

  return Object.freeze({
    meta,
    manifest,
    entries: Object.freeze(entries),
    packHash,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROOF PACK VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verification result for proof pack.
 */
export interface ProofPackVerification {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly entriesChecked: number;
  readonly entriesValid: number;
}

/**
 * Verifies proof pack integrity.
 *
 * @param pack - Pack to verify
 * @returns Verification result
 */
export function verifyProofPack(pack: ProofPack): ProofPackVerification {
  const errors: string[] = [];
  let validEntries = 0;

  // Check version
  if (pack.meta.version !== '1.0') {
    errors.push(`Invalid version: ${pack.meta.version}`);
  }

  // Check artifact count
  const artifactEntries = pack.entries.filter(e => e.path.startsWith('artifacts/'));
  if (pack.meta.artifactCount !== artifactEntries.length) {
    errors.push(`Artifact count mismatch: meta=${pack.meta.artifactCount}, actual=${artifactEntries.length}`);
  }

  // Verify each entry hash
  for (const entry of pack.entries) {
    // Validate path
    if (!isValidPath(entry.path)) {
      errors.push(`H-INV-08 VIOLATION: Invalid path in entry: ${entry.path}`);
      continue;
    }

    // Verify hash
    const computedHash = typeof entry.content === 'string'
      ? hashString(entry.content)
      : hashBuffer(entry.content);

    if (computedHash !== entry.hash) {
      errors.push(`Hash mismatch for ${entry.path}`);
      continue;
    }

    // Verify byte length
    const computedLength = typeof entry.content === 'string'
      ? Buffer.byteLength(entry.content, 'utf-8')
      : entry.content.length;

    if (computedLength !== entry.byteLength) {
      errors.push(`Byte length mismatch for ${entry.path}`);
      continue;
    }

    validEntries++;
  }

  // Verify pack hash
  const artifactHashes = pack.entries
    .filter(e => !e.path.endsWith('meta.json'))
    .map(e => e.hash)
    .join('');
  const computedPackHash = hashString(artifactHashes);

  if (computedPackHash !== pack.packHash) {
    errors.push('Pack hash mismatch');
  }

  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    entriesChecked: pack.entries.length,
    entriesValid: validEntries,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROOF PACK TO ZIP (Simulated - no actual ZIP library)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ZIP entry representation.
 */
export interface ZipEntry {
  readonly path: string;
  readonly content: Buffer;
  readonly hash: Sha256;
}

/**
 * Converts proof pack entries to ZIP-ready format.
 * Note: Actual ZIP creation would require a library like archiver.
 *
 * @param pack - Proof pack
 * @returns Array of ZIP entries
 */
export function toZipEntries(pack: ProofPack): readonly ZipEntry[] {
  return Object.freeze(
    pack.entries.map(entry => {
      const content = typeof entry.content === 'string'
        ? Buffer.from(entry.content, 'utf-8')
        : entry.content;

      return Object.freeze({
        path: entry.path,
        content,
        hash: entry.hash,
      });
    })
  );
}

/**
 * Gets total uncompressed size of proof pack.
 *
 * @param pack - Proof pack
 * @returns Total bytes
 */
export function getPackSize(pack: ProofPack): number {
  return pack.entries.reduce((sum, e) => sum + e.byteLength, 0);
}

/**
 * Lists all paths in proof pack.
 *
 * @param pack - Proof pack
 * @returns Array of paths
 */
export function listPackPaths(pack: ProofPack): readonly string[] {
  return Object.freeze(pack.entries.map(e => e.path));
}

/**
 * Gets entry by path from proof pack.
 *
 * @param pack - Proof pack
 * @param path - Path to find
 * @returns Entry or undefined
 */
export function getPackEntry(
  pack: ProofPack,
  path: string
): ProofPackEntry | undefined {
  const normalized = normalizePath(path);
  return pack.entries.find(e => e.path === normalized);
}
