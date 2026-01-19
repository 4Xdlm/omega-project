/**
 * Serialization Utilities
 * Standard: NASA-Grade L4
 *
 * Provides JSON serialization/deserialization for manifests and snapshots.
 */

import type { Manifest, Snapshot, SerializedManifest, SerializedSnapshot } from './types.js';
import { ProofSerializeError, ProofDeserializeError } from './errors.js';

// ============================================================
// Manifest Serialization
// ============================================================

export function serializeManifest(manifest: Manifest): string {
  try {
    const serialized: SerializedManifest = {
      version: manifest.version,
      timestamp: manifest.timestamp,
      entries: manifest.entries.map(e => ({
        path: e.path,
        size: e.size,
        sha256: e.sha256,
      })),
    };
    return JSON.stringify(serialized, null, 2);
  } catch (error) {
    throw new ProofSerializeError(`Failed to serialize manifest: ${(error as Error).message}`);
  }
}

export function deserializeManifest(json: string): Manifest {
  try {
    const parsed = JSON.parse(json) as SerializedManifest;

    // Validate structure
    if (!parsed.version || typeof parsed.version !== 'string') {
      throw new Error('Invalid manifest: missing version');
    }
    if (typeof parsed.timestamp !== 'number') {
      throw new Error('Invalid manifest: missing timestamp');
    }
    if (!Array.isArray(parsed.entries)) {
      throw new Error('Invalid manifest: entries must be array');
    }

    // Validate entries
    for (const entry of parsed.entries) {
      if (!entry.path || typeof entry.path !== 'string') {
        throw new Error('Invalid manifest entry: missing path');
      }
      if (typeof entry.size !== 'number') {
        throw new Error('Invalid manifest entry: missing size');
      }
      if (!entry.sha256 || typeof entry.sha256 !== 'string') {
        throw new Error('Invalid manifest entry: missing sha256');
      }
    }

    return Object.freeze({
      version: parsed.version,
      timestamp: parsed.timestamp,
      entries: Object.freeze(
        parsed.entries.map(e =>
          Object.freeze({
            path: e.path,
            size: e.size,
            sha256: e.sha256,
          })
        )
      ),
    });
  } catch (error) {
    if (error instanceof ProofDeserializeError) {
      throw error;
    }
    throw new ProofDeserializeError(`Failed to deserialize manifest: ${(error as Error).message}`);
  }
}

// ============================================================
// Snapshot Serialization
// ============================================================

export function serializeSnapshot(snapshot: Snapshot): string {
  try {
    const serialized: SerializedSnapshot = {
      id: snapshot.id,
      name: snapshot.name,
      timestamp: snapshot.timestamp,
      metadata: snapshot.metadata,
      entries: snapshot.entries.map(e => ({
        path: e.path,
        sha256: e.sha256,
        size: e.size,
        content: e.content,
      })),
    };
    return JSON.stringify(serialized, null, 2);
  } catch (error) {
    throw new ProofSerializeError(`Failed to serialize snapshot: ${(error as Error).message}`);
  }
}

export function deserializeSnapshot(json: string): Snapshot {
  try {
    const parsed = JSON.parse(json) as SerializedSnapshot;

    // Validate structure
    if (!parsed.id || typeof parsed.id !== 'string') {
      throw new Error('Invalid snapshot: missing id');
    }
    if (!parsed.name || typeof parsed.name !== 'string') {
      throw new Error('Invalid snapshot: missing name');
    }
    if (typeof parsed.timestamp !== 'number') {
      throw new Error('Invalid snapshot: missing timestamp');
    }
    if (!Array.isArray(parsed.entries)) {
      throw new Error('Invalid snapshot: entries must be array');
    }

    // Validate entries
    for (const entry of parsed.entries) {
      if (!entry.path || typeof entry.path !== 'string') {
        throw new Error('Invalid snapshot entry: missing path');
      }
      if (!entry.sha256 || typeof entry.sha256 !== 'string') {
        throw new Error('Invalid snapshot entry: missing sha256');
      }
      if (typeof entry.size !== 'number') {
        throw new Error('Invalid snapshot entry: missing size');
      }
      if (!entry.content || typeof entry.content !== 'string') {
        throw new Error('Invalid snapshot entry: missing content');
      }
    }

    return Object.freeze({
      id: parsed.id,
      name: parsed.name,
      timestamp: parsed.timestamp,
      metadata: Object.freeze(parsed.metadata ?? {}),
      entries: Object.freeze(
        parsed.entries.map(e =>
          Object.freeze({
            path: e.path,
            sha256: e.sha256,
            size: e.size,
            content: e.content,
          })
        )
      ),
    });
  } catch (error) {
    if (error instanceof ProofDeserializeError) {
      throw error;
    }
    throw new ProofDeserializeError(`Failed to deserialize snapshot: ${(error as Error).message}`);
  }
}

// ============================================================
// File Operations
// ============================================================

import { writeFileSync, readFileSync } from 'fs';

export function saveManifest(manifest: Manifest, filePath: string): void {
  try {
    writeFileSync(filePath, serializeManifest(manifest), 'utf-8');
  } catch (error) {
    throw new ProofSerializeError(`Failed to save manifest to ${filePath}: ${(error as Error).message}`);
  }
}

export function loadManifest(filePath: string): Manifest {
  try {
    const json = readFileSync(filePath, 'utf-8');
    return deserializeManifest(json);
  } catch (error) {
    if (error instanceof ProofDeserializeError) {
      throw error;
    }
    throw new ProofDeserializeError(`Failed to load manifest from ${filePath}: ${(error as Error).message}`);
  }
}

export function saveSnapshot(snapshot: Snapshot, filePath: string): void {
  try {
    writeFileSync(filePath, serializeSnapshot(snapshot), 'utf-8');
  } catch (error) {
    throw new ProofSerializeError(`Failed to save snapshot to ${filePath}: ${(error as Error).message}`);
  }
}

export function loadSnapshot(filePath: string): Snapshot {
  try {
    const json = readFileSync(filePath, 'utf-8');
    return deserializeSnapshot(json);
  } catch (error) {
    if (error instanceof ProofDeserializeError) {
      throw error;
    }
    throw new ProofDeserializeError(`Failed to load snapshot from ${filePath}: ${(error as Error).message}`);
  }
}
