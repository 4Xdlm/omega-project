/**
 * H2 Prompt Extraction Test
 * Extracts the actual SH2 structured prompts for manual LLM testing
 */

import { readFileSync } from 'node:fs';
import type { IntentPack } from '../../packages/creation-pipeline/src/types.js';
import { buildArcPrompt, buildScenePrompt, buildBeatPrompt } from '../../packages/genesis-planner/src/providers/prompt-builder.js';
import { createDefaultConfig } from '../../packages/genesis-planner/src/config.js';

const intentFile = process.argv[2] || 'golden/intents/intent_pack_gardien.json';
const pack: IntentPack = JSON.parse(readFileSync(intentFile, 'utf8'));

console.log('=== H2 PROMPT EXTRACTION ===');
console.log(`Intent: ${pack.intent.title}`);
console.log();

// Extract Arc Prompt
console.log('=== ARC PROMPT (SH2 STRUCTURED) ===');
const arcPrompt = buildArcPrompt(pack.intent, pack.canon, pack.constraints);
console.log(arcPrompt);
console.log();
console.log(`Arc prompt length: ${arcPrompt.length} chars`);
console.log();

// For scene/beat prompts, we'd need mock arcs
// Just show the structure for now
console.log('=== SCENE PROMPT STRUCTURE ===');
console.log('buildScenePrompt(arc, arcIndex, totalArcs, canon, constraints, emotionTarget)');
console.log();

console.log('=== BEAT PROMPT STRUCTURE ===');
console.log('buildBeatPrompt(scene, sceneIndex, config)');
console.log();

console.log('=== VERIFICATION ===');
console.log('Prompt includes schema? ', arcPrompt.includes('arc_id'));
console.log('Prompt includes constraints? ', arcPrompt.includes('constraints'));
console.log('Prompt includes banned words? ', arcPrompt.includes(pack.constraints.banned_words?.[0] || 'N/A'));
