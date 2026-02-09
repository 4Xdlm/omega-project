/**
 * OMEGA Governance — Test Fixtures Helper
 * Phase D.2 — Creates ProofPack fixtures in temp directories for testing
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import type { Manifest, ForgeReport, ForgeMetrics, ArtifactEntry, SerializedMerkleTree, StageId } from '../../src/core/types.js';

function sha256(input: string): string {
  return createHash('sha256').update(input.replace(/\r\n/g, '\n').replace(/\r/g, '\n'), 'utf-8').digest('hex');
}

function canonicalJSON(obj: unknown): string {
  return JSON.stringify(obj, Object.keys(obj as Record<string, unknown>).sort(), 0) ?? '';
}

function sortedStringify(obj: unknown): string {
  if (obj === null || obj === undefined) return JSON.stringify(obj);
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(sortedStringify).join(',') + ']';
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  return '{' + keys.map((k) => `${JSON.stringify(k)}:${sortedStringify((obj as Record<string, unknown>)[k])}`).join(',') + '}';
}

export interface FixtureOptions {
  runId?: string;
  seed?: string;
  verdict?: string;
  forgeScore?: number;
  emotionScore?: number;
  qualityScore?: number;
  trajectoryCompliance?: number;
  includeForge?: boolean;
  corruptManifest?: boolean;
  corruptMerkle?: boolean;
  missingArtifact?: StageId;
  m_scores?: Record<string, number>;
}

const DEFAULT_M_SCORES: Record<string, number> = {
  M1: 0, M2: 1, M3: 0.85, M4: 0.80, M5: 0.90,
  M6: 0.75, M7: 0.70, M8: 0.88, M9: 0.82,
  M10: 0.78, M11: 0.45, M12: 0.42,
};

export function createTempDir(prefix: string): string {
  const dir = join(tmpdir(), `omega-gov-test-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function createFixtureRun(dir: string, opts: FixtureOptions = {}): string {
  const runId = opts.runId ?? 'abcdef0123456789';
  const seed = opts.seed ?? '';
  const verdict = opts.verdict ?? 'PASS';
  const includeForge = opts.includeForge !== false;
  const forgeScore = opts.forgeScore ?? 0.85;
  const emotionScore = opts.emotionScore ?? 0.80;
  const qualityScore = opts.qualityScore ?? 0.75;
  const trajectoryCompliance = opts.trajectoryCompliance ?? 0.90;
  const mScores = { ...DEFAULT_M_SCORES, ...(opts.m_scores ?? {}) };

  const runDir = join(dir, runId);
  mkdirSync(runDir, { recursive: true });

  const stages: StageId[] = ['00-intent', '10-genesis', '20-scribe', '30-style', '40-creation'];
  if (includeForge) stages.push('50-forge');

  const stageFiles: Record<StageId, { filename: string; content: unknown }> = {
    '00-intent': { filename: 'intent.json', content: { title: 'Test Story', premise: 'A test narrative', themes: ['test'], core_emotion: 'anticipation' } },
    '10-genesis': { filename: 'genesis-plan.json', content: { plan: 'test plan', sections: 3 } },
    '20-scribe': { filename: 'scribe-output.json', content: { text: 'Once upon a time...', paragraphs: 5 } },
    '30-style': { filename: 'styled-output.json', content: { styled_text: 'Once upon a time, in a world...', style_applied: true } },
    '40-creation': { filename: 'creation-result.json', content: { pipeline_id: 'test-pipeline', output_hash: sha256('creation-output') } },
    '50-forge': { filename: 'forge-report.json', content: buildForgeReport(runId, forgeScore, emotionScore, qualityScore, trajectoryCompliance, mScores, verdict) },
  };

  const artifacts: ArtifactEntry[] = [];

  for (const stage of stages) {
    const { filename, content } = stageFiles[stage];
    const contentStr = JSON.stringify(content, null, 2);
    const hash = sha256(contentStr);

    // Always add to manifest, but skip writing the file for missingArtifact
    if (opts.missingArtifact !== stage) {
      const stageDir = join(runDir, stage);
      mkdirSync(stageDir, { recursive: true });
      writeFileSync(join(stageDir, filename), contentStr, 'utf-8');
    }

    artifacts.push({
      stage,
      filename,
      path: `${stage}/${filename}`,
      sha256: hash,
      size: Buffer.byteLength(contentStr, 'utf-8'),
    });
  }

  const leaves = artifacts.map((a) => ({ hash: a.sha256, label: a.path })).sort((a, b) => a.label.localeCompare(b.label));
  const merkleRoot = buildSimpleMerkleRoot(leaves.map((l) => l.hash));

  const manifest: Manifest = {
    run_id: runId,
    seed,
    versions: { runner: '0.1.0', genesis: '0.1.0', scribe: '0.1.0', style: '0.1.0', creation: '0.1.0', forge: '0.1.0' },
    artifacts,
    merkle_root: merkleRoot,
    intent_hash: artifacts[0]?.sha256 ?? sha256('empty'),
    final_hash: artifacts[artifacts.length - 1]?.sha256 ?? sha256('empty'),
    verdict,
    stages_completed: stages,
  };

  const manifestStr = sortedStringify(manifest);
  writeFileSync(join(runDir, 'manifest.json'), manifestStr, 'utf-8');

  const manifestHash = opts.corruptManifest ? 'ff'.repeat(32) : sha256(manifestStr);
  writeFileSync(join(runDir, 'manifest.sha256'), manifestHash, 'utf-8');

  const merkleTree: SerializedMerkleTree = {
    root_hash: opts.corruptMerkle ? 'ee'.repeat(32) : merkleRoot,
    leaf_count: leaves.length,
    leaves,
    tree: { hash: opts.corruptMerkle ? 'ee'.repeat(32) : merkleRoot },
  };
  writeFileSync(join(runDir, 'merkle-tree.json'), JSON.stringify(merkleTree, null, 2), 'utf-8');

  return runDir;
}

function buildForgeReport(
  forgeId: string,
  compositeScore: number,
  emotionScore: number,
  qualityScore: number,
  trajectoryCompliance: number,
  mScores: Record<string, number>,
  verdict: string,
): ForgeReport {
  const metrics: ForgeMetrics = {
    total_paragraphs: 10,
    emotion_coverage: 1,
    trajectory_compliance: trajectoryCompliance,
    avg_cosine_distance: 0.15,
    avg_euclidean_distance: 0.25,
    forced_transitions: 0,
    feasibility_failures: 0,
    law4_violations: 0,
    flux_balance_error: 0.001,
    M1: mScores['M1'] ?? 0,
    M2: mScores['M2'] ?? 1,
    M3: mScores['M3'] ?? 0.85,
    M4: mScores['M4'] ?? 0.80,
    M5: mScores['M5'] ?? 0.90,
    M6: mScores['M6'] ?? 0.75,
    M7: mScores['M7'] ?? 0.70,
    M8: mScores['M8'] ?? 0.88,
    M9: mScores['M9'] ?? 0.82,
    M10: mScores['M10'] ?? 0.78,
    M11: mScores['M11'] ?? 0.45,
    M12: mScores['M12'] ?? 0.42,
    emotion_score: emotionScore,
    quality_score: qualityScore,
    composite_score: compositeScore,
    dead_zones_count: 0,
    prescriptions_count: 0,
    critical_prescriptions: 0,
  };

  const reportData = {
    forge_id: forgeId,
    input_hash: sha256('input'),
    verdict,
    composite: compositeScore,
    config_hash: sha256('config'),
  };

  return {
    forge_id: forgeId,
    input_hash: sha256('input'),
    verdict,
    metrics,
    config_hash: sha256('config'),
    report_hash: sha256(JSON.stringify(reportData)),
    timestamp_deterministic: '2026-01-01T00:00:00.000Z',
  };
}

function buildSimpleMerkleRoot(hashes: string[]): string {
  if (hashes.length === 0) return sha256('EMPTY_TREE');
  if (hashes.length === 1) return hashes[0];

  const parents: string[] = [];
  for (let i = 0; i < hashes.length; i += 2) {
    const left = hashes[i];
    const right = i + 1 < hashes.length ? hashes[i + 1] : left;
    parents.push(sha256(left + right));
  }
  return buildSimpleMerkleRoot(parents);
}

export function createRuntimeEvent(overrides: Partial<import('../../src/history/types.js').RuntimeEvent> = {}): import('../../src/history/types.js').RuntimeEvent {
  const timestamp = overrides.timestamp ?? '2026-01-15T10:00:00.000Z';
  const run_id = overrides.run_id ?? 'test-run-001';
  const command = overrides.command ?? 'full';
  const status = overrides.status ?? 'SUCCESS';

  return {
    event_id: sha256(`${run_id}:${command}:${status}:${timestamp}`),
    run_id,
    command,
    status,
    duration_ms: overrides.duration_ms ?? 1500,
    manifest_hash: overrides.manifest_hash ?? sha256('manifest'),
    merkle_root: overrides.merkle_root ?? sha256('merkle'),
    forge_score: overrides.forge_score ?? 0.85,
    timestamp,
  };
}
