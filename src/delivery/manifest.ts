/**
 * OMEGA Delivery Manifest v1.0
 * Phase H - NASA-Grade L4 / DO-178C
 *
 * Bundle manifest creation and validation for delivery artifacts.
 *
 * INVARIANTS:
 * - H-INV-04: Profiles locked by SHA256
 * - H-INV-05: Stable hashes
 * - H-INV-10: Manifest sealed by root hash
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
import { isSha256, isISO8601 } from './types';
import { hashString, hashObject, computeMerkleRoot } from './hasher';

// ═══════════════════════════════════════════════════════════════════════════════
// MANIFEST ENTRY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Entry in the manifest for a single artifact.
 */
export interface ManifestEntry {
  readonly filename: string;
  readonly format: string;
  readonly hash: Sha256;
  readonly bodyHash: Sha256;
  readonly byteLength: number;
  readonly profileId: string;
}

/**
 * Creates manifest entry from artifact.
 *
 * @param artifact - Delivery artifact
 * @returns Manifest entry
 */
export function createManifestEntry(artifact: DeliveryArtifact): ManifestEntry {
  return Object.freeze({
    filename: artifact.filename,
    format: artifact.format,
    hash: artifact.hash,
    bodyHash: artifact.bodyHash,
    byteLength: artifact.byteLength,
    profileId: artifact.profileId,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// MANIFEST CREATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Manifest builder options.
 */
export interface ManifestOptions {
  readonly name?: string;
  readonly description?: string;
  readonly profilesHash?: Sha256;
}

/**
 * Creates a delivery manifest from artifacts.
 * H-INV-10: Manifest sealed by root hash
 *
 * @param artifacts - Array of delivery artifacts
 * @param timestamp - Creation timestamp
 * @param options - Optional manifest metadata
 * @returns Delivery manifest
 */
export function createManifest(
  artifacts: readonly DeliveryArtifact[],
  timestamp: ISO8601,
  options: ManifestOptions = {}
): DeliveryManifest {
  // Create entries from artifacts
  const entries = artifacts.map(a => createManifestEntry(a));

  // Compute artifact hashes for Merkle root
  const artifactHashes = artifacts.map(a => a.hash);
  const artifactsRoot = computeMerkleRoot(artifactHashes);

  // Compute manifest root hash (seals entire manifest)
  const manifestData = {
    version: '1.0',
    timestamp,
    entries,
    artifactsRoot,
    profilesHash: options.profilesHash,
  };
  const rootHash = hashObject(manifestData);

  return Object.freeze({
    version: '1.0',
    created: timestamp,
    name: options.name ?? 'delivery',
    description: options.description,
    entries: Object.freeze(entries),
    artifactCount: entries.length,
    totalBytes: entries.reduce((sum, e) => sum + e.byteLength, 0),
    artifactsRoot,
    profilesHash: options.profilesHash,
    rootHash,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// MANIFEST VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verification result for manifest.
 */
export interface ManifestVerification {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly checkedArtifacts: number;
  readonly matchedArtifacts: number;
}

/**
 * Verifies manifest integrity.
 * H-INV-10: Checks root hash seals manifest
 *
 * @param manifest - Manifest to verify
 * @returns Verification result
 */
export function verifyManifest(manifest: DeliveryManifest): ManifestVerification {
  const errors: string[] = [];

  // Check version
  if (manifest.version !== '1.0') {
    errors.push(`Invalid manifest version: ${manifest.version}`);
  }

  // Check created timestamp
  if (!isISO8601(manifest.created)) {
    errors.push('Invalid created timestamp');
  }

  // Check artifact count matches entries
  if (manifest.artifactCount !== manifest.entries.length) {
    errors.push(
      `Artifact count mismatch: ${manifest.artifactCount} vs ${manifest.entries.length} entries`
    );
  }

  // Check total bytes
  const computedTotal = manifest.entries.reduce((sum, e) => sum + e.byteLength, 0);
  if (manifest.totalBytes !== computedTotal) {
    errors.push(
      `Total bytes mismatch: ${manifest.totalBytes} vs ${computedTotal} computed`
    );
  }

  // Verify each entry has valid hash
  for (const entry of manifest.entries) {
    if (!isSha256(entry.hash)) {
      errors.push(`Invalid hash for ${entry.filename}`);
    }
    if (!isSha256(entry.bodyHash)) {
      errors.push(`Invalid bodyHash for ${entry.filename}`);
    }
  }

  // Verify artifacts root
  const hashes = manifest.entries.map(e => e.hash);
  const computedRoot = computeMerkleRoot(hashes);
  if (manifest.artifactsRoot !== computedRoot) {
    errors.push('Artifacts root hash mismatch');
  }

  // Verify root hash
  const manifestData = {
    version: '1.0',
    timestamp: manifest.created,
    entries: manifest.entries,
    artifactsRoot: manifest.artifactsRoot,
    profilesHash: manifest.profilesHash,
  };
  const computedRootHash = hashObject(manifestData);
  if (manifest.rootHash !== computedRootHash) {
    errors.push('H-INV-10 VIOLATION: Manifest root hash mismatch (tampering detected)');
  }

  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    checkedArtifacts: manifest.entries.length,
    matchedArtifacts: manifest.entries.length - errors.filter(e => e.includes('Invalid')).length,
  });
}

/**
 * Verifies artifacts against manifest.
 *
 * @param manifest - Manifest to verify against
 * @param artifacts - Artifacts to check
 * @returns Verification result
 */
export function verifyArtifactsAgainstManifest(
  manifest: DeliveryManifest,
  artifacts: readonly DeliveryArtifact[]
): ManifestVerification {
  const errors: string[] = [];
  let matched = 0;

  // Create lookup for artifacts
  const artifactMap = new Map(artifacts.map(a => [a.filename, a]));

  // Check each entry has matching artifact
  for (const entry of manifest.entries) {
    const artifact = artifactMap.get(entry.filename);

    if (!artifact) {
      errors.push(`Missing artifact: ${entry.filename}`);
      continue;
    }

    if (artifact.hash !== entry.hash) {
      errors.push(`Hash mismatch for ${entry.filename}`);
      continue;
    }

    if (artifact.bodyHash !== entry.bodyHash) {
      errors.push(`Body hash mismatch for ${entry.filename}`);
      continue;
    }

    if (artifact.byteLength !== entry.byteLength) {
      errors.push(`Byte length mismatch for ${entry.filename}`);
      continue;
    }

    matched++;
  }

  // Check for extra artifacts not in manifest
  for (const artifact of artifacts) {
    const entry = manifest.entries.find(e => e.filename === artifact.filename);
    if (!entry) {
      errors.push(`Unexpected artifact: ${artifact.filename}`);
    }
  }

  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    checkedArtifacts: manifest.entries.length,
    matchedArtifacts: matched,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUNDLE CREATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates a delivery bundle from artifacts and manifest.
 *
 * @param manifest - Bundle manifest
 * @param artifacts - Bundle artifacts
 * @returns Delivery bundle
 */
export function createBundle(
  manifest: DeliveryManifest,
  artifacts: readonly DeliveryArtifact[]
): DeliveryBundle {
  return Object.freeze({
    manifest,
    artifacts: Object.freeze([...artifacts]),
  });
}

/**
 * Verifies bundle integrity.
 *
 * @param bundle - Bundle to verify
 * @returns Verification result
 */
export function verifyBundle(bundle: DeliveryBundle): ManifestVerification {
  // First verify manifest itself
  const manifestResult = verifyManifest(bundle.manifest);
  if (!manifestResult.valid) {
    return manifestResult;
  }

  // Then verify artifacts against manifest
  return verifyArtifactsAgainstManifest(bundle.manifest, bundle.artifacts);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MANIFEST SERIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Serializes manifest to JSON.
 *
 * @param manifest - Manifest to serialize
 * @returns JSON string
 */
export function serializeManifest(manifest: DeliveryManifest): string {
  return JSON.stringify(manifest, null, 2);
}

/**
 * Parses manifest from JSON.
 *
 * @param json - JSON string
 * @returns Parsed manifest or null if invalid
 */
export function parseManifest(json: string): DeliveryManifest | null {
  try {
    const parsed = JSON.parse(json);

    // Validate required fields
    if (parsed.version !== '1.0') {
      return null;
    }

    if (!parsed.created || !isISO8601(parsed.created)) {
      return null;
    }

    if (!Array.isArray(parsed.entries)) {
      return null;
    }

    if (!isSha256(parsed.rootHash)) {
      return null;
    }

    // Validate entries
    for (const entry of parsed.entries) {
      if (!entry.filename || !entry.format) {
        return null;
      }
      if (!isSha256(entry.hash) || !isSha256(entry.bodyHash)) {
        return null;
      }
    }

    return Object.freeze({
      version: parsed.version,
      created: parsed.created as ISO8601,
      name: parsed.name ?? 'delivery',
      description: parsed.description,
      entries: Object.freeze(parsed.entries.map((e: ManifestEntry) => Object.freeze(e))),
      artifactCount: parsed.artifactCount ?? parsed.entries.length,
      totalBytes: parsed.totalBytes ?? 0,
      artifactsRoot: parsed.artifactsRoot as Sha256,
      profilesHash: parsed.profilesHash as Sha256 | undefined,
      rootHash: parsed.rootHash as Sha256,
    });
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MANIFEST LOOKUP
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Gets manifest entry by filename.
 *
 * @param manifest - Manifest to search
 * @param filename - Filename to find
 * @returns Entry or undefined
 */
export function getManifestEntry(
  manifest: DeliveryManifest,
  filename: string
): ManifestEntry | undefined {
  return manifest.entries.find(e => e.filename === filename);
}

/**
 * Gets all entries for a specific format.
 *
 * @param manifest - Manifest to search
 * @param format - Format to filter by
 * @returns Matching entries
 */
export function getEntriesByFormat(
  manifest: DeliveryManifest,
  format: string
): readonly ManifestEntry[] {
  return Object.freeze(manifest.entries.filter(e => e.format === format));
}

/**
 * Gets all entries for a specific profile.
 *
 * @param manifest - Manifest to search
 * @param profileId - Profile ID to filter by
 * @returns Matching entries
 */
export function getEntriesByProfile(
  manifest: DeliveryManifest,
  profileId: string
): readonly ManifestEntry[] {
  return Object.freeze(manifest.entries.filter(e => e.profileId === profileId));
}
