/**
 * Golden Run Script — Phase Q-B
 * Runs the OMEGA pipeline and saves individual artifacts.
 * Bypasses writeProofPack (circular ref issue in creation result).
 *
 * Usage: OMEGA_PROVIDER_MODE=mock|llm npx tsx golden/run_golden.ts <intent_file> <out_dir> <seed>
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createGenesisPlan } from '../packages/genesis-planner/src/planner.js';
import { createDefaultConfig } from '../packages/genesis-planner/src/config.js';
import { runScribe, createDefaultSConfig } from '../packages/scribe-engine/src/index.js';
import { runStyleEmergence, createDefaultEConfig } from '../packages/style-emergence-engine/src/index.js';
import { canonicalize, sha256 } from '../packages/canon-kernel/src/index.js';
import type { IntentPack } from '../packages/creation-pipeline/src/types.js';

const intentFile = process.argv[2] || 'golden/intents/intent_pack_gardien.json';
const outDir = process.argv[3] || 'golden/run_mock';
const seed = process.argv[4] || 'golden-mock-v1';

const providerMode = process.env.OMEGA_PROVIDER_MODE || 'mock';
console.log(`[GOLDEN] Mode: ${providerMode}`);
console.log(`[GOLDEN] Intent: ${intentFile}`);
console.log(`[GOLDEN] Output: ${outDir}`);
console.log(`[GOLDEN] Seed: ${seed}`);

// Read and validate intent
const intentRaw = readFileSync(intentFile, 'utf8');
const pack: IntentPack = JSON.parse(intentRaw);
console.log(`[GOLDEN] Intent title: ${pack.intent.title}`);

const timestamp = '2026-01-01T00:00:00.000Z';
const gConfig = createDefaultConfig();
const sConfig = createDefaultSConfig();
const eConfig = createDefaultEConfig();

// C.1 — Genesis
console.log('[GOLDEN] C.1 — Genesis Planning...');
const { plan, report: genesisReport } = createGenesisPlan(
  pack.intent, pack.canon, pack.constraints, pack.genome, pack.emotion,
  gConfig, timestamp,
);
console.log(`[GOLDEN]   arcs: ${plan.arcs.length}, scenes: ${plan.scene_count}, beats: ${plan.beat_count}`);
console.log(`[GOLDEN]   plan_hash: ${plan.plan_hash}`);

// C.2 — Scribe
console.log('[GOLDEN] C.2 — Scribe Engine...');
const { output: scribeOutput, report: scribeReport } = runScribe(
  plan, pack.canon, pack.genome, pack.emotion, pack.constraints,
  sConfig, timestamp,
);
console.log(`[GOLDEN]   paragraphs: ${scribeOutput.final_prose.paragraphs.length}`);

// C.3 — Style Emergence
console.log('[GOLDEN] C.3 — Style Emergence...');
const { output: styleOutput, report: styleReport } = runStyleEmergence(
  scribeOutput, pack.genome, pack.constraints, eConfig, timestamp,
);
console.log(`[GOLDEN]   styled paragraphs: ${styleOutput.paragraphs.length}`);

// Save artifacts
mkdirSync(join(outDir, '00-intent'), { recursive: true });
mkdirSync(join(outDir, '10-genesis'), { recursive: true });
mkdirSync(join(outDir, '20-scribe'), { recursive: true });
mkdirSync(join(outDir, '30-style'), { recursive: true });
mkdirSync(join(outDir, 'reports'), { recursive: true });

function saveArtifact(dir: string, name: string, data: unknown): string {
  const json = canonicalize(data);
  const hash = sha256(json);
  writeFileSync(join(dir, `${name}.json`), json, 'utf8');
  writeFileSync(join(dir, `${name}.sha256`), hash, 'utf8');
  console.log(`[GOLDEN]   ${name}: ${hash.substring(0, 16)}...`);
  return hash;
}

console.log('[GOLDEN] Saving artifacts...');
const intentHash = saveArtifact(join(outDir, '00-intent'), 'intent', pack);
const genesisHash = saveArtifact(join(outDir, '10-genesis'), 'genesis-plan', plan);
saveArtifact(join(outDir, '10-genesis'), 'genesis-report', genesisReport);
const scribeHash = saveArtifact(join(outDir, '20-scribe'), 'scribe-output', scribeOutput);
saveArtifact(join(outDir, '20-scribe'), 'scribe-report', scribeReport);
const styleHash = saveArtifact(join(outDir, '30-style'), 'styled-output', styleOutput);
saveArtifact(join(outDir, '30-style'), 'style-report', styleReport);

// Build manifest
const manifest = {
  run_seed: seed,
  provider_mode: providerMode,
  intent_file: intentFile,
  timestamp,
  intent_hash: intentHash,
  genesis_hash: genesisHash,
  scribe_hash: scribeHash,
  style_hash: styleHash,
  plan_hash: plan.plan_hash,
  arcs: plan.arcs.length,
  scenes: plan.scene_count,
  beats: plan.beat_count,
  paragraphs: styleOutput.paragraphs?.length ?? scribeOutput.final_prose.paragraphs.length,
};
const manifestJson = canonicalize(manifest);
const manifestHash = sha256(manifestJson);
writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
writeFileSync(join(outDir, 'manifest.sha256'), manifestHash, 'utf8');

console.log(`[GOLDEN] Manifest hash: ${manifestHash}`);
console.log('[GOLDEN] DONE');
