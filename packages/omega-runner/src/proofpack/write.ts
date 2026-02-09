/**
 * OMEGA Runner — ProofPack Writer
 * Phase D.1 — Write ProofPack to disk
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { ArtifactEntry, StageId, Manifest, MerkleTree } from '../types.js';
import type { VersionMap } from '../version.js';
import type { Logger } from '../logger/index.js';
import { canonicalJSON, canonicalPath } from './canonical.js';
import { hashString } from './hash.js';
import { buildMerkleTree, serializeMerkleTree } from './merkle.js';
import { buildManifest } from './manifest.js';

/** Artifact data to write */
export interface StageArtifact {
  readonly stage: StageId;
  readonly filename: string;
  readonly content: string;
}

/** Write a complete ProofPack to disk */
export function writeProofPack(
  runDir: string,
  runId: string,
  seed: string,
  versions: VersionMap,
  artifacts: readonly StageArtifact[],
  intentHash: string,
  finalHash: string,
  verdict: string,
  stagesCompleted: readonly StageId[],
  reportJson: string,
  reportMd: string,
  logText: string,
  logger: Logger,
): { manifest: Manifest; merkleTree: MerkleTree; manifestHash: string } {
  // Create run directory
  mkdirSync(runDir, { recursive: true });

  const entries: ArtifactEntry[] = [];

  // Write each stage artifact
  for (const art of artifacts) {
    const stageDir = join(runDir, art.stage);
    mkdirSync(stageDir, { recursive: true });

    const filePath = join(stageDir, art.filename);
    const hashPath = join(stageDir, art.filename.replace(/\.json$/, '') + '.sha256');
    const content = art.content;
    const hash = hashString(content);

    writeFileSync(filePath, content, 'utf8');
    writeFileSync(hashPath, hash, 'utf8');

    entries.push({
      stage: art.stage,
      filename: art.filename,
      path: canonicalPath(`${art.stage}/${art.filename}`),
      sha256: hash,
      size: Buffer.from(content, 'utf8').length,
    });

    logger.info(`GATE: ${art.stage} written (hash: ${hash.substring(0, 12)}...)`);
  }

  // Build Merkle tree from artifact hashes
  const leaves = entries.map((e) => ({ hash: e.sha256, label: e.path }));
  const merkleTree = buildMerkleTree(leaves);

  // Build manifest
  const manifest = buildManifest(
    runId, seed, versions, entries, merkleTree.root_hash,
    intentHash, finalHash, verdict, stagesCompleted,
  );

  const manifestJson = canonicalJSON(manifest);
  const manifestHash = hashString(manifestJson);

  // Write manifest
  writeFileSync(join(runDir, 'manifest.json'), manifestJson, 'utf8');
  writeFileSync(join(runDir, 'manifest.sha256'), manifestHash, 'utf8');

  // Write Merkle tree
  writeFileSync(join(runDir, 'merkle-tree.json'), canonicalJSON(serializeMerkleTree(merkleTree)), 'utf8');

  // Write reports
  writeFileSync(join(runDir, 'report.json'), reportJson, 'utf8');
  writeFileSync(join(runDir, 'report.md'), reportMd, 'utf8');

  // Write log (not hashed)
  writeFileSync(join(runDir, 'runner.log'), logText, 'utf8');

  logger.info(`Manifest hash: ${manifestHash}`);
  logger.info(`Run completed: RUN_ID=${runId}`);

  return { manifest, merkleTree, manifestHash };
}
