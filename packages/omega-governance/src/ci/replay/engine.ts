/**
 * OMEGA Governance — Replay Engine
 * Phase F — Deterministic replay by re-reading ProofPacks
 *
 * INV-F-02: Replay uses the SAME seed as the original run.
 * INV-F-03: Replay output byte-identical to stored baseline.
 *
 * NOTE: This engine does NOT re-execute the pipeline.
 * It reads a "candidate" ProofPack and compares it to the baseline ProofPack.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import type { ReplayResult, ReplayDifference, ReplayOptions } from './types.js';
import type { Manifest } from '../../core/types.js';

/** Replay: compare a candidate ProofPack against the baseline */
export function replayCompare(
  baselineDir: string,
  candidateDir: string,
  options: ReplayOptions,
): ReplayResult {
  const startTime = Date.now();

  const differences: ReplayDifference[] = [];

  const baselineManifest = readManifestFromDir(baselineDir);
  const candidateManifest = readManifestFromDir(candidateDir);

  if (!baselineManifest || !candidateManifest) {
    const msg = !baselineManifest ? 'Baseline manifest missing' : 'Candidate manifest missing';
    differences.push({ path: 'manifest.json', type: 'MISSING_IN_BASELINE', message: msg });
    return buildResult(baselineManifest, candidateManifest, differences, false, false, startTime, options.seed);
  }

  // Seed check (INV-F-02)
  if (baselineManifest.seed !== candidateManifest.seed) {
    differences.push({
      path: 'seed',
      type: 'CONTENT_DIFF',
      message: `Seed mismatch: baseline=${baselineManifest.seed}, candidate=${candidateManifest.seed}`,
    });
  }

  // Compare manifest hashes
  const baselineManifestHash = hashFile(join(baselineDir, 'manifest.json'));
  const candidateManifestHash = hashFile(join(candidateDir, 'manifest.json'));
  const manifestMatch = baselineManifestHash === candidateManifestHash;

  if (!manifestMatch) {
    differences.push({
      path: 'manifest.json',
      type: 'HASH_MISMATCH',
      baseline_hash: baselineManifestHash,
      replay_hash: candidateManifestHash,
      message: 'Manifest hash mismatch',
    });
  }

  // Compare merkle roots
  const merkleMatch = baselineManifest.merkle_root === candidateManifest.merkle_root;
  if (!merkleMatch) {
    differences.push({
      path: 'merkle_root',
      type: 'HASH_MISMATCH',
      baseline_hash: baselineManifest.merkle_root,
      replay_hash: candidateManifest.merkle_root,
      message: 'Merkle root mismatch',
    });
  }

  // Compare each artifact
  const artifactDiffs = compareArtifacts(baselineDir, baselineManifest, candidateDir, candidateManifest);
  differences.push(...artifactDiffs);

  return buildResult(baselineManifest, candidateManifest, differences, manifestMatch, merkleMatch, startTime, options.seed);
}

function compareArtifacts(
  _baselineDir: string,
  baselineManifest: Manifest,
  _candidateDir: string,
  candidateManifest: Manifest,
): ReplayDifference[] {
  const diffs: ReplayDifference[] = [];
  const baselineArtifacts = new Map(baselineManifest.artifacts.map((a) => [a.path, a]));
  const candidateArtifacts = new Map(candidateManifest.artifacts.map((a) => [a.path, a]));

  for (const [path, baseArt] of baselineArtifacts) {
    const candArt = candidateArtifacts.get(path);
    if (!candArt) {
      diffs.push({ path, type: 'MISSING_IN_REPLAY', baseline_hash: baseArt.sha256, message: `Artifact missing in candidate: ${path}` });
      continue;
    }

    if (baseArt.sha256 !== candArt.sha256) {
      diffs.push({
        path,
        type: 'HASH_MISMATCH',
        baseline_hash: baseArt.sha256,
        replay_hash: candArt.sha256,
        message: `Artifact hash mismatch: ${path}`,
      });
    }
  }

  for (const path of candidateArtifacts.keys()) {
    if (!baselineArtifacts.has(path)) {
      diffs.push({ path, type: 'MISSING_IN_BASELINE', message: `Artifact only in candidate: ${path}` });
    }
  }

  return diffs;
}

function readManifestFromDir(dir: string): Manifest | null {
  const manifestPath = join(dir, 'manifest.json');
  if (!existsSync(manifestPath)) return null;
  return JSON.parse(readFileSync(manifestPath, 'utf-8')) as Manifest;
}

function hashFile(filePath: string): string {
  if (!existsSync(filePath)) return '';
  const content = readFileSync(filePath, 'utf-8');
  return createHash('sha256').update(content.replace(/\r\n/g, '\n').replace(/\r/g, '\n'), 'utf-8').digest('hex');
}

function buildResult(
  baseline: Manifest | null,
  candidate: Manifest | null,
  differences: ReplayDifference[],
  manifestMatch: boolean,
  merkleMatch: boolean,
  startTime: number,
  seed: string,
): ReplayResult {
  return {
    baseline_run_id: baseline?.run_id ?? 'unknown',
    replay_run_id: candidate?.run_id ?? 'unknown',
    seed,
    identical: differences.length === 0,
    differences,
    manifest_match: manifestMatch,
    merkle_match: merkleMatch,
    duration_ms: Date.now() - startTime,
  };
}
