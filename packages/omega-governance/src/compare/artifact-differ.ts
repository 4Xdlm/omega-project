/**
 * OMEGA Governance — Artifact Differ
 * Phase D.2 — Compare individual artifacts between runs by hash
 *
 * INV-GOV-08: Hashes are read from ProofPack manifest, never recomputed locally.
 */

import type { ArtifactEntry } from '../core/types.js';
import type { ArtifactDiff, ArtifactDiffStatus } from './types.js';

/** Compare artifacts from two manifests by their declared hashes */
export function diffArtifacts(
  leftArtifacts: readonly ArtifactEntry[],
  rightArtifacts: readonly ArtifactEntry[],
): readonly ArtifactDiff[] {
  const leftMap = new Map<string, ArtifactEntry>();
  for (const a of leftArtifacts) {
    leftMap.set(a.path, a);
  }

  const rightMap = new Map<string, ArtifactEntry>();
  for (const a of rightArtifacts) {
    rightMap.set(a.path, a);
  }

  const allPaths = new Set<string>([...leftMap.keys(), ...rightMap.keys()]);
  const sortedPaths = [...allPaths].sort();

  const diffs: ArtifactDiff[] = [];

  for (const path of sortedPaths) {
    const left = leftMap.get(path);
    const right = rightMap.get(path);

    let status: ArtifactDiffStatus;

    if (left && right) {
      status = left.sha256 === right.sha256 ? 'IDENTICAL' : 'DIFFERENT';
    } else if (left && !right) {
      status = 'MISSING_RIGHT';
    } else {
      status = 'MISSING_LEFT';
    }

    diffs.push({
      path,
      status,
      hash_left: left?.sha256,
      hash_right: right?.sha256,
    });
  }

  return diffs;
}

/** Count diffs by status */
export function countDiffsByStatus(diffs: readonly ArtifactDiff[]): Record<ArtifactDiffStatus, number> {
  const counts: Record<ArtifactDiffStatus, number> = {
    IDENTICAL: 0,
    DIFFERENT: 0,
    MISSING_LEFT: 0,
    MISSING_RIGHT: 0,
  };
  for (const d of diffs) {
    counts[d.status]++;
  }
  return counts;
}
