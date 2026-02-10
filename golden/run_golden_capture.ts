/**
 * Golden Run — LLM Response Capture
 * Phase Q-B — Captures raw LLM responses for Justesse & Precision analysis.
 *
 * Usage: ANTHROPIC_API_KEY=... npx tsx golden/run_golden_capture.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import https from 'node:https';
import { sha256 } from '../packages/canon-kernel/src/index.js';
import type { IntentPack } from '../packages/creation-pipeline/src/types.js';

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) { console.error('ANTHROPIC_API_KEY not set'); process.exit(1); }

const model = 'claude-sonnet-4-20250514';

function callClaudeAPI(systemPrompt: string, userPrompt: string): Promise<{ text: string; usage: any }> {
  return new Promise((resolve, reject) => {
    const requestBody = JSON.stringify({
      model,
      max_tokens: 4096,
      temperature: 0,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
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
          reject(new Error(`API ${res.statusCode}: ${body.substring(0, 300)}`));
          return;
        }
        const parsed = JSON.parse(body);
        resolve({ text: parsed.content[0].text, usage: parsed.usage });
      });
    });
    req.on('error', (e: Error) => reject(e));
    req.write(requestBody);
    req.end();
  });
}

const SYSTEM_ARC = `You are OMEGA, a deterministic narrative structure engine.
You generate narrative arc structures as valid JSON arrays.
Each arc must have: arc_id (string), title (string), purpose (string), scenes (array of scene objects).
You MUST return ONLY a valid JSON array — no markdown, no commentary, no wrapping.
Temperature is set to 0 for maximum determinism.`;

const SYSTEM_SCENE = `You are OMEGA, a deterministic narrative structure engine.
You generate scene structures as valid JSON arrays.
Each scene must have: scene_id (string), title (string), setting (string), emotional_beat (string), sensory_anchors (array), key_events (array).
You MUST return ONLY a valid JSON array — no markdown, no commentary, no wrapping.`;

const SYSTEM_BEAT = `You are OMEGA, a deterministic narrative structure engine.
You generate narrative beat structures as valid JSON arrays.
Each beat must have: beat_id (string), type (string), content_hint (string), emotion (string), intensity (number 0-1).
You MUST return ONLY a valid JSON array — no markdown, no commentary, no wrapping.`;

interface RunSpec {
  name: string;
  intentFile: string;
  outDir: string;
}

const runs: RunSpec[] = [
  { name: 'run_001_gardien', intentFile: 'golden/intents/intent_pack_gardien.json', outDir: 'golden/run_001' },
  { name: 'run_002_choix', intentFile: 'golden/intents/intent_pack_choix.json', outDir: 'golden/run_002' },
];

async function executeRun(spec: RunSpec) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[RUN] ${spec.name}`);
  console.log(`${'='.repeat(60)}`);

  const pack: IntentPack = JSON.parse(readFileSync(spec.intentFile, 'utf8'));
  mkdirSync(join(spec.outDir, 'llm_responses'), { recursive: true });

  // ARC prompt
  const arcPrompt = `Generate narrative arcs for the following story:

Title: ${pack.intent.title}
Premise: ${pack.intent.premise}
Themes: ${pack.intent.themes.join(', ')}
Core Emotion: ${pack.intent.core_emotion}
Target Word Count: ${pack.intent.target_word_count}
Message: ${pack.intent.message}

Canon entries:
${pack.canon.entries.map(e => `- [${e.category}] ${e.statement}`).join('\n')}

Constraints:
- POV: ${pack.constraints.pov}
- Tense: ${pack.constraints.tense}
- Min scenes: ${pack.constraints.min_scenes}
- Max scenes: ${pack.constraints.max_scenes}
- Banned words: ${pack.constraints.banned_words.join(', ') || '(none)'}

Generate a JSON array of narrative arcs, each containing scenes that tell this story within the constraints.`;

  console.log(`[RUN] Calling Claude for ARCS...`);
  const arcResult = await callClaudeAPI(SYSTEM_ARC, arcPrompt);
  const arcHash = sha256(arcResult.text);
  writeFileSync(join(spec.outDir, 'llm_responses', 'arcs.json'), arcResult.text, 'utf8');
  writeFileSync(join(spec.outDir, 'llm_responses', 'arcs.meta.json'), JSON.stringify({
    hash: arcHash, length: arcResult.text.length, usage: arcResult.usage, model,
  }, null, 2), 'utf8');
  console.log(`[RUN]   Arcs: ${arcResult.text.length} chars, hash: ${arcHash.substring(0, 16)}...`);
  console.log(`[RUN]   Usage: ${JSON.stringify(arcResult.usage)}`);

  // SCENE prompt (based on first arc)
  let firstArc: any;
  try {
    const parsed = JSON.parse(arcResult.text);
    firstArc = Array.isArray(parsed) ? parsed[0] : (parsed.arcs?.[0] ?? parsed.structure?.scenes?.[0] ?? parsed);
  } catch {
    firstArc = { title: pack.intent.title, purpose: 'main arc' };
  }

  const scenePrompt = `Generate detailed scenes for the following narrative arc:

Arc: ${JSON.stringify(firstArc, null, 2)}

Story context:
- Title: ${pack.intent.title}
- Core emotion: ${pack.intent.core_emotion}
- Emotion waypoints: ${pack.emotion.waypoints.map(w => `${w.emotion} @${w.position} (${w.intensity})`).join(', ')}

Generate a JSON array of scene objects with sensory details, emotional progression, and canon compliance.`;

  console.log(`[RUN] Calling Claude for SCENES...`);
  const sceneResult = await callClaudeAPI(SYSTEM_SCENE, scenePrompt);
  const sceneHash = sha256(sceneResult.text);
  writeFileSync(join(spec.outDir, 'llm_responses', 'scenes.json'), sceneResult.text, 'utf8');
  writeFileSync(join(spec.outDir, 'llm_responses', 'scenes.meta.json'), JSON.stringify({
    hash: sceneHash, length: sceneResult.text.length, usage: sceneResult.usage, model,
  }, null, 2), 'utf8');
  console.log(`[RUN]   Scenes: ${sceneResult.text.length} chars, hash: ${sceneHash.substring(0, 16)}...`);

  // BEAT prompt (based on first scene)
  let firstScene: any;
  try {
    const parsedScenes = JSON.parse(sceneResult.text);
    firstScene = Array.isArray(parsedScenes) ? parsedScenes[0] : parsedScenes;
  } catch {
    firstScene = { title: 'Opening scene' };
  }

  const beatPrompt = `Generate narrative beats for the following scene:

Scene: ${JSON.stringify(firstScene, null, 2)}

Generate a JSON array of beats with emotional transitions, sensory cues, and pacing information.`;

  console.log(`[RUN] Calling Claude for BEATS...`);
  const beatResult = await callClaudeAPI(SYSTEM_BEAT, beatPrompt);
  const beatHash = sha256(beatResult.text);
  writeFileSync(join(spec.outDir, 'llm_responses', 'beats.json'), beatResult.text, 'utf8');
  writeFileSync(join(spec.outDir, 'llm_responses', 'beats.meta.json'), JSON.stringify({
    hash: beatHash, length: beatResult.text.length, usage: beatResult.usage, model,
  }, null, 2), 'utf8');
  console.log(`[RUN]   Beats: ${beatResult.text.length} chars, hash: ${beatHash.substring(0, 16)}...`);

  // Save run summary
  const summary = {
    name: spec.name,
    intent_title: pack.intent.title,
    model,
    temperature: 0,
    timestamp: new Date().toISOString(),
    arcs: { hash: arcHash, length: arcResult.text.length, usage: arcResult.usage },
    scenes: { hash: sceneHash, length: sceneResult.text.length, usage: sceneResult.usage },
    beats: { hash: beatHash, length: beatResult.text.length, usage: beatResult.usage },
    total_chars: arcResult.text.length + sceneResult.text.length + beatResult.text.length,
  };
  writeFileSync(join(spec.outDir, 'run_summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  console.log(`[RUN] Total chars: ${summary.total_chars}`);

  return summary;
}

async function main() {
  console.log('[GOLDEN] Phase Q-B — LLM Response Capture');
  console.log(`[GOLDEN] Model: ${model}, Temperature: 0`);
  console.log(`[GOLDEN] Runs: ${runs.length}`);

  const results: any[] = [];
  for (const run of runs) {
    const summary = await executeRun(run);
    results.push(summary);
  }

  // Save global summary
  writeFileSync('golden/capture_summary.json', JSON.stringify(results, null, 2), 'utf8');
  console.log('\n[GOLDEN] All runs complete.');
}

main().catch(e => {
  console.error('[GOLDEN] FATAL:', e.message);
  process.exit(1);
});
