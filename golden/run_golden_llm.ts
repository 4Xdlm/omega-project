/**
 * Golden Run — LLM Mode via Direct API
 * Phase Q-B — Calls Claude API directly, saves cache, runs pipeline with cache.
 *
 * Usage: ANTHROPIC_API_KEY=... npx tsx golden/run_golden_llm.ts <intent_file> <out_dir> <seed>
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import https from 'node:https';
import { canonicalize, sha256 } from '../packages/canon-kernel/src/index.js';
import { createDefaultConfig } from '../packages/genesis-planner/src/config.js';
import type { Intent, Canon, Constraints, StyleGenomeInput, EmotionTarget, Arc, Scene } from '../packages/genesis-planner/src/types.js';
import type { IntentPack } from '../packages/creation-pipeline/src/types.js';

const intentFile = process.argv[2] || 'golden/intents/intent_pack_gardien.json';
const outDir = process.argv[3] || 'golden/run_001';
const seed = process.argv[4] || 'golden-001-v1';

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) { console.error('ANTHROPIC_API_KEY not set'); process.exit(1); }

const model = 'claude-sonnet-4-20250514';
const SYSTEM_PROMPT = `You are OMEGA, a deterministic narrative structure engine.
You generate narrative structures as valid JSON.
You MUST return ONLY valid JSON — no markdown, no commentary, no wrapping.
Temperature is set to 0 for maximum determinism.`;

const pack: IntentPack = JSON.parse(readFileSync(intentFile, 'utf8'));
const config = createDefaultConfig();
const timestamp = '2026-01-01T00:00:00.000Z';
const cacheDir = join(outDir, 'cache');

// Compute the same keys the planner would use
const intentHash = sha256(canonicalize(pack.intent));
const planIdSeed = sha256(canonicalize({
  intent: pack.intent,
  canon: pack.canon,
  constraints: pack.constraints,
  genome: pack.genome,
  emotionTarget: pack.emotion,
}));

console.log(`[GOLDEN-LLM] Intent: ${pack.intent.title}`);
console.log(`[GOLDEN-LLM] Model: ${model}`);
console.log(`[GOLDEN-LLM] Seed: ${seed}`);
console.log(`[GOLDEN-LLM] IntentHash: ${intentHash.substring(0, 16)}...`);

function callClaudeAPI(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const requestBody = JSON.stringify({
      model,
      max_tokens: 4096,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey!,
        'anthropic-version': '2023-06-01',
      },
    }, (res) => {
      let body = '';
      res.on('data', (chunk: Buffer) => body += chunk.toString());
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`API ${res.statusCode}: ${body.substring(0, 200)}`));
          return;
        }
        const parsed = JSON.parse(body);
        resolve(parsed.content[0].text);
      });
    });
    req.on('error', (e: Error) => reject(e));
    req.write(requestBody);
    req.end();
  });
}

function buildCacheKey(prompt: string, step: string): string {
  return sha256(prompt + '\0' + intentHash + '\0' + planIdSeed + '\0' + step);
}

function saveCacheEntry(key: string, content: string): void {
  mkdirSync(cacheDir, { recursive: true });
  const entry = {
    content,
    contentHash: sha256(content),
    mode: 'llm' as const,
    model,
    cached: false,
    timestamp: new Date().toISOString(),
  };
  writeFileSync(join(cacheDir, `${key}.json`), JSON.stringify(entry, null, 2), 'utf8');
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  mkdirSync(cacheDir, { recursive: true });

  // Step 1: Generate arcs
  console.log('[GOLDEN-LLM] Step 1: Calling Claude for ARC generation...');
  const arcPrompt = JSON.stringify({
    intent: pack.intent,
    canon: pack.canon,
    constraints: pack.constraints,
  });
  const arcContent = await callClaudeAPI(arcPrompt);
  const arcKey = buildCacheKey(arcPrompt, 'arcs');
  saveCacheEntry(arcKey, arcContent);
  console.log(`[GOLDEN-LLM]   Arcs response: ${arcContent.length} chars, key: ${arcKey.substring(0, 16)}...`);

  // Parse arcs for next steps
  let rawArcs: Arc[];
  try {
    rawArcs = JSON.parse(arcContent) as Arc[];
    console.log(`[GOLDEN-LLM]   Arcs count: ${rawArcs.length}`);
  } catch (e: any) {
    console.error(`[GOLDEN-LLM]   PARSE ERROR on arcs response: ${e.message}`);
    console.error(`[GOLDEN-LLM]   Raw response (first 500 chars): ${arcContent.substring(0, 500)}`);
    writeFileSync(join(outDir, 'arc_raw_response.txt'), arcContent, 'utf8');
    process.exit(1);
  }

  // Step 2: Generate scenes per arc
  console.log('[GOLDEN-LLM] Step 2: Calling Claude for SCENE generation...');
  for (let i = 0; i < rawArcs.length; i++) {
    const scenePrompt = JSON.stringify({
      arc: rawArcs[i],
      arcIndex: i,
      totalArcs: rawArcs.length,
      canon: pack.canon,
      constraints: pack.constraints,
      emotionTarget: pack.emotion,
    });
    const sceneContent = await callClaudeAPI(scenePrompt);
    const sceneKey = buildCacheKey(scenePrompt, 'scenes');
    saveCacheEntry(sceneKey, sceneContent);
    console.log(`[GOLDEN-LLM]   Arc ${i} scenes: ${sceneContent.length} chars`);

    // Parse scenes for beat prompts
    let scenes: Scene[];
    try {
      scenes = JSON.parse(sceneContent) as Scene[];
      rawArcs[i] = { ...rawArcs[i], scenes };
      console.log(`[GOLDEN-LLM]   Arc ${i} scene count: ${scenes.length}`);
    } catch (e: any) {
      console.error(`[GOLDEN-LLM]   PARSE ERROR on scenes[${i}]: ${e.message}`);
      writeFileSync(join(outDir, `scene_raw_response_${i}.txt`), sceneContent, 'utf8');
      process.exit(1);
    }
  }

  // Step 3: Generate beats per scene
  console.log('[GOLDEN-LLM] Step 3: Calling Claude for BEAT generation...');
  for (const arc of rawArcs) {
    for (let si = 0; si < (arc.scenes?.length ?? 0); si++) {
      const beatPrompt = JSON.stringify({
        scene: arc.scenes[si],
        sceneIndex: si,
        config,
      });
      const beatContent = await callClaudeAPI(beatPrompt);
      const beatKey = buildCacheKey(beatPrompt, 'beats');
      saveCacheEntry(beatKey, beatContent);
      console.log(`[GOLDEN-LLM]   Scene ${si} beats: ${beatContent.length} chars`);
    }
  }

  // Save manifest
  const manifest = {
    provider_mode: 'llm',
    model,
    intent_file: intentFile,
    seed,
    timestamp: new Date().toISOString(),
    intent_hash: intentHash,
    arc_count: rawArcs.length,
    scene_count: rawArcs.reduce((s, a) => s + (a.scenes?.length ?? 0), 0),
    api_calls: 1 + rawArcs.length + rawArcs.reduce((s, a) => s + (a.scenes?.length ?? 0), 0),
  };
  writeFileSync(join(outDir, 'llm_manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`[GOLDEN-LLM] Total API calls: ${manifest.api_calls}`);
  console.log(`[GOLDEN-LLM] Cache files saved to: ${cacheDir}`);
  console.log('[GOLDEN-LLM] DONE — Now run with OMEGA_PROVIDER_MODE=cache to replay');
}

main().catch(e => {
  console.error('[GOLDEN-LLM] FATAL:', e.message);
  process.exit(1);
});
