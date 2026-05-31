/**
 * OMEGA METROLOGY — ECC CONTRACT PROBE (DRY, NO Ollama)
 * ============================================================================
 * Resolves NCR-ECC-CONTRACT-SENSOR (étape 3 — capteur chain).
 * READ-ONLY engine code (harness only). 100% CALC, 0 token, fully deterministic.
 *
 * Dumps the assembleForgePacket "Le Gardien" emotion_contract 14D trajectory
 * (the production/fusion path under suspicion) and computes the pure-CALC
 * scoreTension14D (provider=undefined → keyword path, deterministic) on the
 * FIXED M0.b prose samples (sample_sovereign.txt / sample_scribe.txt) under:
 *   - FORGE contract  (assembleForgePacket — production path)
 *   - HAND contract   (scene-appropriate sparse fear→sadness arc, MOCK_PACKET style)
 * ONLY the contract differs → isolates the contract as the lever (A vs B).
 *
 * Run (cwd = packages/sovereign-engine for import parity):
 *   npx tsx ../../scripts/metrology/ecc-contract-probe.ts
 */
process.env.OMEGA_CHUNKED_V4 = '1';
process.env.OMEGA_PROMPT_V4 = '1';

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import * as path from 'node:path';

import { createGenesisPlan } from '../../packages/genesis-planner/src/planner.js';
import { createDefaultConfig } from '../../packages/genesis-planner/src/config.js';
import type { GenesisPlan, Scene } from '../../packages/genesis-planner/src/types.js';

import { assembleForgePacket } from '../../packages/sovereign-engine/src/input/forge-packet-assembler.js';
import { scoreTension14D } from '../../packages/sovereign-engine/src/oracle/axes/tension-14d.js';
import { DEFAULT_VOICE_GENOME } from '../../packages/sovereign-engine/src/voice/voice-genome.js';
import type {
  ForgePacket, StyleProfile, KillLists, CanonEntry, ForgeContinuity, EmotionContract,
} from '../../packages/sovereign-engine/src/types.js';

const TS = '2026-01-01T00:00:00.000Z';
const REPO_ROOT = path.resolve(process.cwd(), process.cwd().endsWith('sovereign-engine') ? '../..' : '.');
const GOLDEN = process.env.M0B_GOLDEN ?? 'golden/intents/intent_pack_gardien.json';
const RUNS_DIR = path.join(REPO_ROOT, 'docs', 'audit', 'metrology', 'm0b-runs');
const OUT_DIR = path.join(REPO_ROOT, 'docs', 'audit', 'minaxis');

function log(s: string) { process.stderr.write(s + '\n'); }
const DIMS = ['joy','trust','fear','surprise','sadness','disgust','anger','anticipation','love','submission','awe','disapproval','remorse','contempt'] as const;
function nonzero(v: Record<string, number>): number { return Object.values(v).filter((x) => x > 0).length; }
function dominant(v: Record<string, number>): string {
  let best = ''; let bv = -1; for (const k of Object.keys(v)) if (v[k]! > bv) { bv = v[k]!; best = k; } return `${best}=${bv.toFixed(2)}`;
}
function vecStr(v: Record<string, number>): string {
  return DIMS.filter((d) => (v[d] ?? 0) > 0).map((d) => `${d}:${(v[d] ?? 0).toFixed(2)}`).join(' ');
}

function buildContext() {
  const pack = JSON.parse(readFileSync(path.join(REPO_ROOT, GOLDEN), 'utf8'));
  const g = createDefaultConfig();
  const { plan } = createGenesisPlan(pack.intent, pack.canon, pack.constraints, pack.genome, pack.emotion, g, TS);
  const scene0: Scene = plan.arcs[0]!.scenes[0]!;
  const style_profile: StyleProfile = {
    version: '1.0.0', universe: 'literary_fiction',
    lexicon: { signature_words: ['phare', 'mer', 'lumiere', 'profondeur', 'silence'], forbidden_words: pack.constraints.banned_words ?? [], abstraction_max_ratio: 0.20, concrete_min_ratio: 0.60 },
    rhythm: { avg_sentence_length_target: pack.genome?.target_avg_sentence_length ?? 15, gini_target: 0.45, max_consecutive_similar: 2, min_syncopes_per_scene: 2, min_compressions_per_scene: 1 },
    tone: { dominant_register: 'soutenu', intensity_range: [0.2, 0.9] as readonly [number, number] },
    imagery: { recurrent_motifs: ['phare', 'ocean', 'lumiere'], density_target_per_100_words: 3, banned_metaphors: pack.constraints.forbidden_cliches ?? [] },
    voice: DEFAULT_VOICE_GENOME,
  };
  const kill_lists: KillLists = { banned_words: pack.constraints.banned_words ?? [], banned_cliches: pack.constraints.forbidden_cliches ?? [], banned_ai_patterns: [], banned_filter_words: [] };
  const canon: CanonEntry[] = (pack.canon?.entries ?? []).map((e: any) => ({ id: e.id, statement: e.statement }));
  const continuity: ForgeContinuity = { previous_scene_summary: '', character_states: [], open_threads: [] };
  return { pack, plan, scene0, style_profile, kill_lists, canon, continuity };
}

// HAND-built contract: scene-appropriate sparse fear→sadness horror arc (MOCK_PACKET style).
// This is what a hand-authored EmotionContract for "Le Gardien" (horror) looks like:
// one or two dominant Plutchik dims per quartile, scene-coherent trajectory.
function handContract(): EmotionContract {
  const z = (): Record<string, number> => Object.fromEntries(DIMS.map((d) => [d, 0]));
  const q = (over: Record<string, number>) => ({ ...z(), ...over });
  return {
    curve_quartiles: [
      { quartile: 'Q1', target_14d: q({ fear: 0.6, anticipation: 0.3, sadness: 0.1 }), valence: -0.4, arousal: 0.55, dominant: 'fear', narrative_instruction: 'Rising unease' },
      { quartile: 'Q2', target_14d: q({ fear: 0.7, surprise: 0.2, anticipation: 0.1 }), valence: -0.6, arousal: 0.8, dominant: 'fear', narrative_instruction: 'Fear intensifies' },
      { quartile: 'Q3', target_14d: q({ fear: 0.6, sadness: 0.3, awe: 0.1 }), valence: -0.6, arousal: 0.7, dominant: 'fear', narrative_instruction: 'Peak dread' },
      { quartile: 'Q4', target_14d: q({ sadness: 0.5, fear: 0.3, remorse: 0.2 }), valence: -0.5, arousal: 0.4, dominant: 'sadness', narrative_instruction: 'Resolution in grief' },
    ] as any,
    intensity_range: { min: 0.3, max: 0.85 },
    tension: { slope_target: 'arc', pic_position_pct: 0.6, faille_position_pct: 0.75, silence_zones: [] },
    terminal_state: { target_14d: { ...z(), sadness: 0.5, fear: 0.3, remorse: 0.2 }, valence: -0.5, arousal: 0.4, dominant: 'sadness', reader_state: 'Lingering dread' },
    rupture: { exists: false, position_pct: 0, before_dominant: 'fear', after_dominant: 'fear', delta_valence: 0 },
    valence_arc: { start: -0.4, end: -0.5, direction: 'darkening' },
  } as EmotionContract;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const ctx = buildContext();
  log(`Golden: ${ctx.pack.intent.title} | scene0=${ctx.scene0.scene_id} (${ctx.scene0.beats.length} beats)`);

  const forgePacket = assembleForgePacket({
    plan: ctx.plan, scene: ctx.scene0, style_profile: ctx.style_profile,
    kill_lists: ctx.kill_lists, canon: ctx.canon, continuity: ctx.continuity,
    run_id: 'ecc_probe', language: 'fr',
  });
  const forgeC = forgePacket.emotion_contract;
  const handC = handContract();

  // dump both trajectories
  const trajectory = (c: EmotionContract) => c.curve_quartiles.map((qq, i) => ({
    q: `Q${i + 1}`, dominant: dominant(qq.target_14d as any), nonzero_dims: nonzero(qq.target_14d as any),
    valence: qq.valence, arousal: qq.arousal, declared_dominant: qq.dominant, vec: vecStr(qq.target_14d as any),
  }));
  const forgeTraj = trajectory(forgeC);
  const handTraj = trajectory(handC);
  log('\n=== FORGE contract (assembleForgePacket) 14D trajectory ===');
  forgeTraj.forEach((t) => log(`  ${t.q} declared=${t.declared_dominant} actual_dom=${t.dominant} nz=${t.nonzero_dims} | ${t.vec}`));
  log('\n=== HAND contract (scene-appropriate) 14D trajectory ===');
  handTraj.forEach((t) => log(`  ${t.q} declared=${t.declared_dominant} actual_dom=${t.dominant} nz=${t.nonzero_dims} | ${t.vec}`));

  // fixed prose samples (M0.b run-0 outputs) — ONLY the contract varies
  const proseSet: { name: string; prose: string }[] = [];
  for (const [name, file] of [['sovereign', 'sample_sovereign.txt'], ['scribe', 'sample_scribe.txt']] as const) {
    try { proseSet.push({ name, prose: readFileSync(path.join(RUNS_DIR, file), 'utf8') }); }
    catch { log(`WARN: missing prose ${file}`); }
  }

  // pure-CALC tension_14d (provider=undefined → deterministic keyword path)
  const mkPacket = (base: ForgePacket, c: EmotionContract): ForgePacket => ({ ...base, emotion_contract: c });
  const calc: any[] = [];
  for (const { name, prose } of proseSet) {
    for (const [cname, c] of [['FORGE', forgeC], ['HAND', handC]] as const) {
      const t = await scoreTension14D(mkPacket(forgePacket, c), prose, undefined);
      calc.push({ prose: name, contract: cname, tension_14d: Math.round(t.score * 100) / 100, details: t.details });
      log(`  CALC tension_14d  prose=${name.padEnd(9)} contract=${cname.padEnd(5)} = ${t.score.toFixed(2)}  (${t.details})`);
    }
  }

  const out = {
    generated_from: 'scripts/metrology/ecc-contract-probe.ts', mode: 'DRY_CALC_DETERMINISTIC',
    golden: GOLDEN, scene: ctx.scene0.scene_id,
    forge_trajectory: forgeTraj, hand_trajectory: handTraj,
    calc_tension_14d: calc,
  };
  writeFileSync(path.join(OUT_DIR, 'ecc_contract_probe.json'), JSON.stringify(out, null, 2), 'utf8');
  log(`\nWrote ${path.join(OUT_DIR, 'ecc_contract_probe.json')}`);
}

main().catch((e) => { log('FATAL: ' + (e?.stack ?? e)); process.exit(1); });
