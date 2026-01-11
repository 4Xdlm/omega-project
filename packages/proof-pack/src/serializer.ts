/**
 * @fileoverview OMEGA Proof Pack - Serializer
 * @module @omega/proof-pack/serializer
 *
 * Serialization and deserialization of proof packs.
 */

import { stableStringify } from '@omega/orchestrator-core';
import type {
  ProofPackBundle,
  ProofPackManifest,
} from './types.js';
import { validateManifest } from './verifier.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SERIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Serialize a proof pack to JSON string.
 */
export function serializeProofPack(bundle: ProofPackBundle): string {
  return stableStringify({
    manifest: bundle.manifest,
    content: bundle.content,
  });
}

/**
 * Serialize only the manifest to JSON string.
 */
export function serializeManifest(manifest: ProofPackManifest): string {
  return stableStringify(manifest);
}

/**
 * Deserialize a proof pack from JSON string.
 */
export function deserializeProofPack(json: string): ProofPackBundle {
  const parsed = JSON.parse(json);

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid proof pack: not an object');
  }

  const { manifest, content } = parsed;

  const validation = validateManifest(manifest);
  if (!validation.valid) {
    throw new Error(`Invalid manifest: ${validation.errors.join(', ')}`);
  }

  if (!content || typeof content !== 'object') {
    throw new Error('Invalid proof pack: missing or invalid content');
  }

  return {
    manifest: manifest as ProofPackManifest,
    content: content as Record<string, string>,
  };
}

/**
 * Deserialize only the manifest from JSON string.
 */
export function deserializeManifest(json: string): ProofPackManifest {
  const parsed = JSON.parse(json);

  const validation = validateManifest(parsed);
  if (!validation.valid) {
    throw new Error(`Invalid manifest: ${validation.errors.join(', ')}`);
  }

  return parsed as ProofPackManifest;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT FORMATS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Export format type.
 */
export type ExportFormat = 'json' | 'json-pretty' | 'manifest-only';

/**
 * Export a proof pack in specified format.
 */
export function exportProofPack(bundle: ProofPackBundle, format: ExportFormat): string {
  switch (format) {
    case 'json':
      return serializeProofPack(bundle);

    case 'json-pretty':
      return JSON.stringify(
        {
          manifest: bundle.manifest,
          content: bundle.content,
        },
        null,
        2
      );

    case 'manifest-only':
      return serializeManifest(bundle.manifest);

    default:
      throw new Error(`Unknown export format: ${format}`);
  }
}

/**
 * Import a proof pack from JSON string.
 */
export function importProofPack(json: string): ProofPackBundle {
  return deserializeProofPack(json);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARCHIVE UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Archive entry for proof pack files.
 */
export interface ArchiveEntry {
  readonly path: string;
  readonly content: string;
}

/**
 * Convert proof pack to archive entries (for ZIP creation).
 */
export function toArchiveEntries(bundle: ProofPackBundle): readonly ArchiveEntry[] {
  const entries: ArchiveEntry[] = [];

  // Add manifest
  entries.push({
    path: 'MANIFEST.json',
    content: serializeManifest(bundle.manifest),
  });

  // Add evidence files
  for (const [path, content] of Object.entries(bundle.content)) {
    entries.push({ path, content });
  }

  return entries;
}

/**
 * Convert archive entries back to proof pack.
 */
export function fromArchiveEntries(entries: readonly ArchiveEntry[]): ProofPackBundle {
  const manifestEntry = entries.find((e) => e.path === 'MANIFEST.json');
  if (!manifestEntry) {
    throw new Error('Archive missing MANIFEST.json');
  }

  const manifest = deserializeManifest(manifestEntry.content);
  const content: Record<string, string> = {};

  for (const entry of entries) {
    if (entry.path !== 'MANIFEST.json') {
      content[entry.path] = entry.content;
    }
  }

  return { manifest, content };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPARISON UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Difference between two proof packs.
 */
export interface ProofPackDifference {
  readonly type: 'added' | 'removed' | 'modified' | 'hash_changed';
  readonly path: string;
  readonly oldHash?: string;
  readonly newHash?: string;
}

/**
 * Compare two proof pack manifests.
 */
export function compareManifests(
  oldManifest: ProofPackManifest,
  newManifest: ProofPackManifest
): readonly ProofPackDifference[] {
  const differences: ProofPackDifference[] = [];

  const oldPaths = new Map(oldManifest.evidence.map((e) => [e.path, e]));
  const newPaths = new Map(newManifest.evidence.map((e) => [e.path, e]));

  // Check for removed and modified
  for (const [path, oldEntry] of oldPaths) {
    const newEntry = newPaths.get(path);
    if (!newEntry) {
      differences.push({
        type: 'removed',
        path,
        oldHash: oldEntry.hash,
      });
    } else if (oldEntry.hash !== newEntry.hash) {
      differences.push({
        type: 'hash_changed',
        path,
        oldHash: oldEntry.hash,
        newHash: newEntry.hash,
      });
    }
  }

  // Check for added
  for (const [path, newEntry] of newPaths) {
    if (!oldPaths.has(path)) {
      differences.push({
        type: 'added',
        path,
        newHash: newEntry.hash,
      });
    }
  }

  return differences;
}
