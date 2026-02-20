/**
 * OMEGA Canon Segment Manifest v1.0
 * Phase E - NASA-Grade L4 / DO-178C
 *
 * INVARIANTS:
 * - INV-E-MANIFEST-01: Hash manifest = hash(concat(segment_hashes))
 * - INV-E-MANIFEST-02: Ordre des segments préservé
 * - INV-E-SEG-03: Segment sealed = immuable
 *
 * SPEC: CANON_SCHEMA_SPEC v1.2 §8
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { withLock } from '../shared/lock';
import { canonicalize, sha256 } from '../shared/canonical';
import type { ClaimId, ChainHash, MonoNs } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Entry for a single segment in the manifest.
 */
export interface SegmentEntry {
  readonly id: string;
  readonly path: string;
  readonly firstClaimId: ClaimId | null;
  readonly lastClaimId: ClaimId | null;
  readonly claimCount: number;
  readonly byteSize: number;
  readonly hash: ChainHash;
  readonly createdAt: MonoNs;
  readonly sealed: boolean;
}

/**
 * Complete segment manifest.
 */
export interface SegmentManifest {
  readonly version: number;
  readonly segments: readonly SegmentEntry[];
  readonly lastModified: MonoNs;
  readonly manifestHash: ChainHash;
  readonly totalClaims: number;
  readonly totalBytes: number;
}

/**
 * Mutable manifest for building.
 */
interface MutableManifest {
  version: number;
  segments: SegmentEntry[];
  lastModified: MonoNs;
  manifestHash: ChainHash;
  totalClaims: number;
  totalBytes: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MANIFEST OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const MANIFEST_FILENAME = 'manifest.json';
const MANIFEST_VERSION = 1;

/**
 * Creates an empty manifest.
 */
export function createEmptyManifest(timestamp: MonoNs): SegmentManifest {
  const manifest: MutableManifest = {
    version: MANIFEST_VERSION,
    segments: [],
    lastModified: timestamp,
    manifestHash: '' as ChainHash,
    totalClaims: 0,
    totalBytes: 0,
  };

  manifest.manifestHash = computeManifestHash(manifest);
  return manifest;
}

/**
 * Computes the hash of a manifest.
 *
 * INV-E-MANIFEST-01: Hash = hash(concat(segment_hashes))
 */
export function computeManifestHash(manifest: Omit<SegmentManifest, 'manifestHash'>): ChainHash {
  // Concatenate segment hashes in order (INV-E-MANIFEST-02)
  const segmentHashes = manifest.segments.map((s) => s.hash).join('');
  const dataToHash = `${manifest.version}:${segmentHashes}:${manifest.totalClaims}`;
  return sha256(dataToHash) as ChainHash;
}

/**
 * Verifies a manifest's integrity.
 */
export function verifyManifest(manifest: SegmentManifest): boolean {
  const computedHash = computeManifestHash(manifest);
  return computedHash === manifest.manifestHash;
}

/**
 * Adds a segment entry to the manifest.
 *
 * INV-E-MANIFEST-02: Preserves segment order
 */
export function addSegmentToManifest(
  manifest: SegmentManifest,
  entry: SegmentEntry,
  timestamp: MonoNs
): SegmentManifest {
  const newSegments = [...manifest.segments, entry];

  const updated: MutableManifest = {
    version: manifest.version,
    segments: newSegments,
    lastModified: timestamp,
    manifestHash: '' as ChainHash,
    totalClaims: manifest.totalClaims + entry.claimCount,
    totalBytes: manifest.totalBytes + entry.byteSize,
  };

  updated.manifestHash = computeManifestHash(updated);
  return updated;
}

/**
 * Seals a segment in the manifest.
 *
 * INV-E-SEG-03: Sealed segments are immutable
 */
export function sealSegment(
  manifest: SegmentManifest,
  segmentId: string,
  finalHash: ChainHash,
  finalByteSize: number,
  finalClaimCount: number,
  timestamp: MonoNs
): SegmentManifest {
  const segmentIndex = manifest.segments.findIndex((s) => s.id === segmentId);
  if (segmentIndex === -1) {
    throw new Error(`Segment not found: ${segmentId}`);
  }

  const segment = manifest.segments[segmentIndex];
  if (segment.sealed) {
    throw new Error(`Segment already sealed: ${segmentId}`);
  }

  const updatedSegment: SegmentEntry = {
    ...segment,
    hash: finalHash,
    byteSize: finalByteSize,
    claimCount: finalClaimCount,
    sealed: true,
  };

  const newSegments = [...manifest.segments];
  newSegments[segmentIndex] = updatedSegment;

  const updated: MutableManifest = {
    version: manifest.version,
    segments: newSegments,
    lastModified: timestamp,
    manifestHash: '' as ChainHash,
    totalClaims: newSegments.reduce((sum, s) => sum + s.claimCount, 0),
    totalBytes: newSegments.reduce((sum, s) => sum + s.byteSize, 0),
  };

  updated.manifestHash = computeManifestHash(updated);
  return updated;
}

/**
 * Gets a segment by ID from the manifest.
 */
export function getSegment(manifest: SegmentManifest, segmentId: string): SegmentEntry | undefined {
  return manifest.segments.find((s) => s.id === segmentId);
}

/**
 * Gets the current (unsealed) segment from the manifest.
 */
export function getCurrentSegment(manifest: SegmentManifest): SegmentEntry | undefined {
  return manifest.segments.find((s) => !s.sealed);
}

/**
 * Gets all sealed segments.
 */
export function getSealedSegments(manifest: SegmentManifest): readonly SegmentEntry[] {
  return manifest.segments.filter((s) => s.sealed);
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILE OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Loads a manifest from disk.
 */
export async function loadManifest(storageDir: string): Promise<SegmentManifest | null> {
  const manifestPath = join(storageDir, MANIFEST_FILENAME);

  if (!existsSync(manifestPath)) {
    return null;
  }

  const content = await readFile(manifestPath, 'utf-8');
  const data = JSON.parse(content) as SegmentManifest;

  // Convert bigint strings back to bigint
  const manifest: SegmentManifest = {
    ...data,
    lastModified: BigInt(data.lastModified) as MonoNs,
    segments: data.segments.map((s) => ({
      ...s,
      createdAt: BigInt(s.createdAt) as MonoNs,
    })),
  };

  return manifest;
}

/**
 * Saves a manifest to disk.
 */
export async function saveManifest(
  storageDir: string,
  manifest: SegmentManifest
): Promise<void> {
  const manifestPath = join(storageDir, MANIFEST_FILENAME);

  // Ensure directory exists
  if (!existsSync(storageDir)) {
    await mkdir(storageDir, { recursive: true });
  }

  // Serialize with bigint conversion
  const data = {
    ...manifest,
    lastModified: manifest.lastModified.toString(),
    segments: manifest.segments.map((s) => ({
      ...s,
      createdAt: s.createdAt.toString(),
    })),
  };

  const content = JSON.stringify(data, null, 2);

  await withLock(manifestPath, async () => {
    await writeFile(manifestPath, content, 'utf-8');
  });
}

/**
 * Loads or creates a manifest.
 */
export async function loadOrCreateManifest(
  storageDir: string,
  timestamp: MonoNs
): Promise<SegmentManifest> {
  const existing = await loadManifest(storageDir);
  if (existing) {
    return existing;
  }
  return createEmptyManifest(timestamp);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MANIFEST STATS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Statistics about the manifest.
 */
export interface ManifestStats {
  readonly segmentCount: number;
  readonly sealedSegmentCount: number;
  readonly totalClaims: number;
  readonly totalBytes: number;
  readonly averageClaimsPerSegment: number;
  readonly averageBytesPerSegment: number;
}

/**
 * Computes statistics from a manifest.
 */
export function getManifestStats(manifest: SegmentManifest): ManifestStats {
  const segmentCount = manifest.segments.length;
  const sealedSegmentCount = manifest.segments.filter((s) => s.sealed).length;

  return {
    segmentCount,
    sealedSegmentCount,
    totalClaims: manifest.totalClaims,
    totalBytes: manifest.totalBytes,
    averageClaimsPerSegment: segmentCount > 0 ? manifest.totalClaims / segmentCount : 0,
    averageBytesPerSegment: segmentCount > 0 ? manifest.totalBytes / segmentCount : 0,
  };
}
