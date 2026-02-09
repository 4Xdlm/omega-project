/**
 * OMEGA Governance — ProofPack Reader
 * Phase D.2 — READ-ONLY access to ProofPack directories
 *
 * INV-GOV-01: This module NEVER modifies any file.
 * INV-GOV-08: All data is read from ProofPack, never computed locally.
 */

import { readFileSync, statSync, readdirSync } from 'node:fs';
import { join, posix } from 'node:path';
import type {
  Manifest,
  SerializedMerkleTree,
  ForgeReport,
  ProofPackData,
  FileStat,
} from './types.js';

/** Read and parse manifest.json from a run directory */
export function readManifest(runDir: string): Manifest {
  const manifestPath = join(runDir, 'manifest.json');
  const raw = readFileSync(manifestPath, 'utf-8');
  const parsed: unknown = JSON.parse(raw);
  assertManifest(parsed);
  return parsed;
}

/** Read manifest.sha256 file (64-char hex hash) */
export function readManifestHash(runDir: string): string {
  const hashPath = join(runDir, 'manifest.sha256');
  const raw = readFileSync(hashPath, 'utf-8').trim();
  if (!/^[a-f0-9]{64}$/.test(raw)) {
    throw new Error(`Invalid manifest hash format in ${hashPath}: expected 64 hex chars`);
  }
  return raw;
}

/** Read and parse merkle-tree.json from a run directory */
export function readMerkleTree(runDir: string): SerializedMerkleTree {
  const merklePath = join(runDir, 'merkle-tree.json');
  const raw = readFileSync(merklePath, 'utf-8');
  const parsed: unknown = JSON.parse(raw);
  assertMerkleTree(parsed);
  return parsed;
}

/** Read forge-report.json from 50-forge/ stage (returns null if no forge stage) */
export function readForgeReport(runDir: string): ForgeReport | null {
  const forgePath = join(runDir, '50-forge', 'forge-report.json');
  try {
    const raw = readFileSync(forgePath, 'utf-8');
    return JSON.parse(raw) as ForgeReport;
  } catch {
    return null;
  }
}

/** Read a complete ProofPack from a run directory */
export function readProofPack(runDir: string): ProofPackData {
  const manifest = readManifest(runDir);
  const manifestHash = readManifestHash(runDir);
  const merkleTree = readMerkleTree(runDir);
  const forgeReport = readForgeReport(runDir);

  return {
    runDir,
    runId: manifest.run_id,
    manifest,
    manifestHash,
    merkleTree,
    forgeReport,
  };
}

/** Read artifact content from a run directory by its manifest path */
export function readArtifact(runDir: string, artifactPath: string): string {
  const fullPath = join(runDir, ...artifactPath.split(posix.sep));
  return readFileSync(fullPath, 'utf-8');
}

/** Collect file stats for all files in a directory (for INV-GOV-01 read-only check) */
export function collectFileStats(dir: string): Map<string, FileStat> {
  const stats = new Map<string, FileStat>();
  collectStatsRecursive(dir, dir, stats);
  return stats;
}

function collectStatsRecursive(baseDir: string, currentDir: string, stats: Map<string, FileStat>): void {
  const entries = readdirSync(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(currentDir, entry.name);
    if (entry.isFile()) {
      const s = statSync(fullPath);
      const relativePath = fullPath.slice(baseDir.length + 1).replace(/\\/g, '/');
      stats.set(relativePath, { mtime: s.mtimeMs, size: s.size });
    } else if (entry.isDirectory()) {
      collectStatsRecursive(baseDir, fullPath, stats);
    }
  }
}

/** Type guard: assert value is a valid Manifest */
function assertManifest(value: unknown): asserts value is Manifest {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Manifest must be a non-null object');
  }
  const obj = value as Record<string, unknown>;
  if (typeof obj['run_id'] !== 'string') throw new Error('Manifest missing run_id');
  if (typeof obj['merkle_root'] !== 'string') throw new Error('Manifest missing merkle_root');
  if (!Array.isArray(obj['artifacts'])) throw new Error('Manifest missing artifacts array');
  if (!Array.isArray(obj['stages_completed'])) throw new Error('Manifest missing stages_completed');
}

/** Type guard: assert value is a valid SerializedMerkleTree */
function assertMerkleTree(value: unknown): asserts value is SerializedMerkleTree {
  if (typeof value !== 'object' || value === null) {
    throw new Error('MerkleTree must be a non-null object');
  }
  const obj = value as Record<string, unknown>;
  if (typeof obj['root_hash'] !== 'string') throw new Error('MerkleTree missing root_hash');
  if (typeof obj['leaf_count'] !== 'number') throw new Error('MerkleTree missing leaf_count');
  if (!Array.isArray(obj['leaves'])) throw new Error('MerkleTree missing leaves array');
}
