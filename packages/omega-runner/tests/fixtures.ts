/**
 * OMEGA Runner — Test Fixtures
 * Phase D.1 — Shared test data
 */

import type { IntentPack } from '@omega/creation-pipeline';
import type { Manifest, ArtifactEntry, StageId, InvariantResult } from '../src/types.js';
import type { VersionMap } from '../src/version.js';
import { getVersionMap } from '../src/version.js';

export const TIMESTAMP = '2026-01-01T00:00:00.000Z';
export const TEST_SEED = 'test-seed-deterministic';

export const SAMPLE_INTENT: IntentPack = {
  intent: {
    title: 'Test Story',
    premise: 'A simple test narrative',
    themes: ['test'],
    core_emotion: 'anticipation',
    target_audience: 'test',
    message: 'Testing is essential',
    target_word_count: 500,
  },
  canon: {
    entries: [
      { id: 'CANON-001', category: 'world', statement: 'A test world', immutable: true },
    ],
  },
  constraints: {
    pov: 'third-limited',
    tense: 'past',
    banned_words: [],
    banned_topics: [],
    max_dialogue_ratio: 0.3,
    min_sensory_anchors_per_scene: 1,
    max_scenes: 4,
    min_scenes: 1,
    forbidden_cliches: [],
  },
  genome: {
    target_burstiness: 0.5,
    target_lexical_richness: 0.5,
    target_avg_sentence_length: 12,
    target_dialogue_ratio: 0.1,
    target_description_density: 0.5,
    signature_traits: ['concise'],
  },
  emotion: {
    arc_emotion: 'anticipation',
    waypoints: [
      { position: 0.0, emotion: 'anticipation', intensity: 0.3 },
      { position: 1.0, emotion: 'sadness', intensity: 0.6 },
    ],
    climax_position: 0.7,
    resolution_emotion: 'sadness',
  },
  metadata: {
    pack_id: 'TEST-PACK-001',
    pack_version: '1.0.0',
    author: 'Test',
    created_at: TIMESTAMP,
    description: 'Test fixture',
  },
};

export function makeSampleManifest(): Manifest {
  const versions = getVersionMap();
  const artifacts: ArtifactEntry[] = [
    { stage: '00-intent', filename: 'intent.json', path: '00-intent/intent.json', sha256: 'a'.repeat(64), size: 100 },
    { stage: '10-genesis', filename: 'genesis-plan.json', path: '10-genesis/genesis-plan.json', sha256: 'b'.repeat(64), size: 200 },
    { stage: '20-scribe', filename: 'scribe-output.json', path: '20-scribe/scribe-output.json', sha256: 'c'.repeat(64), size: 300 },
    { stage: '30-style', filename: 'styled-output.json', path: '30-style/styled-output.json', sha256: 'd'.repeat(64), size: 400 },
    { stage: '40-creation', filename: 'creation-result.json', path: '40-creation/creation-result.json', sha256: 'e'.repeat(64), size: 500 },
    { stage: '50-forge', filename: 'forge-report.json', path: '50-forge/forge-report.json', sha256: 'f'.repeat(64), size: 600 },
  ];

  return {
    run_id: 'abcdef0123456789',
    seed: TEST_SEED,
    versions,
    artifacts,
    merkle_root: '1'.repeat(64),
    intent_hash: '2'.repeat(64),
    final_hash: '3'.repeat(64),
    verdict: 'PASS',
    stages_completed: ['00-intent', '10-genesis', '20-scribe', '30-style', '40-creation', '50-forge'],
  };
}

export function makeSampleInvariantResults(): InvariantResult[] {
  return Array.from({ length: 12 }, (_, i) => ({
    id: `INV-RUN-${String(i + 1).padStart(2, '0')}`,
    status: 'PASS' as const,
    message: `Invariant ${i + 1} passed`,
  }));
}
