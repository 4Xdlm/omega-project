/**
 * OMEGA T0 — Isoler la cause du target_14d={trust:1.0} (READ-ONLY, 0 code moteur modifie).
 * Reproduit le chemin assembleForgePacket sur Le Gardien scene-0 et imprime :
 * scene.emotion_target, plan.emotion_trajectory, le filtre waypoints (fallback ?),
 * et le target_14d final par quartile. Run: npx tsx scripts/metrology/t0-isolate-cause.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createGenesisPlan } from '../../packages/genesis-planner/src/planner.js';
import { createDefaultConfig } from '../../packages/genesis-planner/src/config.js';
import type { Scene } from '../../packages/genesis-planner/src/types.js';
import { assembleForgePacket } from '../../packages/sovereign-engine/src/input/forge-packet-assembler.js';
import { DEFAULT_VOICE_GENOME } from '../../packages/sovereign-engine/src/voice/voice-genome.js';
import type { StyleProfile, KillLists, CanonEntry, ForgeContinuity } from '../../packages/sovereign-engine/src/types.js';

const REPO = path.resolve(process.cwd());
const TS = '2026-01-01T00:00:00.000Z';
function log(s: string) { process.stdout.write(s + '\n'); }

const pack = JSON.parse(fs.readFileSync(path.join(REPO, 'golden/intents/intent_pack_gardien.json'), 'utf8'));
const { plan } = createGenesisPlan(pack.intent, pack.canon, pack.constraints, pack.genome, pack.emotion, createDefaultConfig(), TS);
const scenes = plan.arcs.flatMap((a: any) => a.scenes);
const scene0: Scene = scenes[0]!;

log('=== T0 ISOLATE CAUSE — Le Gardien scene-0 ===');
log('scene_count: ' + plan.scene_count);
log('scene0.scene_id: ' + scene0.scene_id);
log('scene0.emotion_target: ' + JSON.stringify((scene0 as any).emotion_target));
log('scene0.emotion_intensity: ' + JSON.stringify((scene0 as any).emotion_intensity));
log('--- plan.emotion_trajectory (waypoints) ---');
for (const wp of (plan as any).emotion_trajectory ?? []) log('  pos=' + wp.position + ' emotion=' + wp.emotion + ' intensity=' + wp.intensity);
const sceneStartPct = 0 / plan.scene_count;
const sceneEndPct = 1 / plan.scene_count;
const inRange = ((plan as any).emotion_trajectory ?? []).filter((wp: any) => wp.position >= sceneStartPct && wp.position <= sceneEndPct);
log(`--- scene0 range [${sceneStartPct}, ${sceneEndPct}] -> ${inRange.length} waypoints in range ---`);
log('  FALLBACK triggered (flat 2-waypoint on emotion_target): ' + (inRange.length === 0));
for (const wp of inRange) log('  inRange: pos=' + wp.position + ' emotion=' + wp.emotion);

const style: StyleProfile = { version: '1.0.0', universe: 'literary_fiction', lexicon: { signature_words: [], forbidden_words: [], abstraction_max_ratio: 0.95, concrete_min_ratio: 0.0 }, rhythm: { avg_sentence_length_target: 20, gini_target: 0.45, max_consecutive_similar: 3, min_syncopes_per_scene: 0, min_compressions_per_scene: 0 }, tone: { dominant_register: 'soutenu', intensity_range: [0.0, 1.0] as readonly [number, number] }, imagery: { recurrent_motifs: [], density_target_per_100_words: 0, banned_metaphors: [] }, voice: DEFAULT_VOICE_GENOME };
const packet = assembleForgePacket({ plan, scene: scene0, style_profile: style, kill_lists: { banned_words: [], banned_cliches: [], banned_ai_patterns: [], banned_filter_words: [] } as KillLists, canon: [] as CanonEntry[], continuity: { previous_scene_summary: '', character_states: [], open_threads: [] } as ForgeContinuity, run_id: 't0', language: 'fr' });
log('--- RESULT: emotion_contract.curve_quartiles[].target_14d ---');
const q = (packet as any).emotion_contract.curve_quartiles;
for (let i = 0; i < q.length; i++) {
  const t = q[i].target_14d as Record<string, number>;
  const nz = Object.entries(t).filter(([, v]) => (v as number) > 0).sort((a, b) => (b[1] as number) - (a[1] as number));
  log(`  Q${i + 1} dominant=${q[i].dominant} | 14d(non-zero)=${JSON.stringify(Object.fromEntries(nz.slice(0, 5)))} | keys=${Object.keys(t).length}`);
}
