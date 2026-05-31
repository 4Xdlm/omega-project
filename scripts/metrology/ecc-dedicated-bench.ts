/**
 * OMEGA METROLOGY — ECC DEDICATED BENCH (LLM decomposition)
 * ============================================================================
 * Resolves NCR-ECC-CONTRACT-SENSOR (étape 3 — capteur chain).
 * READ-ONLY engine code (harness only). REAL Ollama qwen3:32b, judge temp 0, 0 paid API.
 *
 * Decomposes the ECC raw (its LLM + CALC sub-axes) on FIXED M0.b prose samples
 * (sample_sovereign.txt / sample_scribe.txt) under two contracts:
 *   - FORGE : assembleForgePacket("Le Gardien")  — production/fusion path (suspect)
 *   - HAND  : scene-appropriate sparse fear→sadness arc (MOCK_PACKET style)
 * ONLY the contract varies → isolates the contract as the lever (verdict A vs B).
 * Logs per run: tension_14d, emotion_coherence, interiority, impact, temporal_pacing,
 * bonuses, final ECC. N runs (env ECC_N, default 3). Reuses computeECC (engine, read-only).
 *
 * Env: ECC_N (3), ECC_MODEL (qwen3:32b), ECC_PROSE (sovereign,scribe), ECC_SMOKE (=1 → N=1, prose=sovereign).
 * Run (cwd = packages/sovereign-engine):  npx tsx ../../scripts/metrology/ecc-dedicated-bench.ts
 */
process.env.OMEGA_CHUNKED_V4 = '1';
process.env.OMEGA_PROMPT_V4 = '1';

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import * as path from 'node:path';

import { createGenesisPlan } from '../../packages/genesis-planner/src/planner.js';
import { createDefaultConfig } from '../../packages/genesis-planner/src/config.js';
import type { GenesisPlan, Scene } from '../../packages/genesis-planner/src/types.js';

import { assembleForgePacket } from '../../packages/sovereign-engine/src/input/forge-packet-assembler.js';
import { computeECC } from '../../packages/sovereign-engine/src/oracle/macro-axes.js';
import { createOllamaProvider } from '../../packages/sovereign-engine/src/runtime/ollama-provider.js';
import { DEFAULT_VOICE_GENOME } from '../../packages/sovereign-engine/src/voice/voice-genome.js';
import type {
  ForgePacket, StyleProfile, KillLists, CanonEntry, ForgeContinuity, EmotionContract,
} from '../../packages/sovereign-engine/src/types.js';

const SMOKE = !!process.env.ECC_SMOKE;
const N = SMOKE ? 1 : parseInt(process.env.ECC_N ?? '3', 10);
const MODEL = process.env.ECC_MODEL ?? 'qwen3:32b';
const OLLAMA_URL = process.env.ECC_OLLAMA_URL ?? 'http://localhost:11434';
const PROSE_SEL = (process.env.ECC_PROSE ?? (SMOKE ? 'sovereign' : 'sovereign,scribe')).split(',');
const TS = '2026-01-01T00:00:00.000Z';
const REPO_ROOT = path.resolve(process.cwd(), process.cwd().endsWith('sovereign-engine') ? '../..' : '.');
const GOLDEN = process.env.M0B_GOLDEN ?? 'golden/intents/intent_pack_gardien.json';
const RUNS_DIR = path.join(REPO_ROOT, 'docs', 'audit', 'metrology', 'm0b-runs');
const OUT_DIR = path.join(REPO_ROOT, 'docs', 'audit', 'minaxis');

const DIMS = ['joy','trust','fear','surprise','sadness','disgust','anger','anticipation','love','submission','awe','disapproval','remorse','contempt'] as const;
function log(s: string) { process.stderr.write(s + '\n'); }
function stats(xs: number[]) {
  const n = xs.length; if (!n) return { n: 0, mean: 0, stdev: 0 };
  const mean = xs.reduce((a, b) => a + b, 0) / n;
  const stdev = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
  return { n, mean: Math.round(mean * 100) / 100, stdev: Math.round(stdev * 100) / 100 };
}
function sub(ecc: any, name: string): number {
  const s = ecc.sub_scores.find((x: any) => x.name === name); return s ? s.score : NaN;
}

const judgeProvider = createOllamaProvider({
  baseUrl: OLLAMA_URL, model: MODEL,
  draftTemperature: 0.0, judgeTemperature: 0.0, draftMaxTokens: 2000, judgeMaxTokens: 2000,
});

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
  log(`=== OMEGA ECC DEDICATED BENCH — ${MODEL} | N=${N} | prose=[${PROSE_SEL.join(',')}] | SMOKE=${SMOKE} ===`);
  mkdirSync(OUT_DIR, { recursive: true });
  const ctx = buildContext();
  const forgePacket = assembleForgePacket({
    plan: ctx.plan, scene: ctx.scene0, style_profile: ctx.style_profile,
    kill_lists: ctx.kill_lists, canon: ctx.canon, continuity: ctx.continuity, run_id: 'ecc_bench', language: 'fr',
  });
  const contracts: { name: string; c: EmotionContract }[] = [
    { name: 'FORGE', c: forgePacket.emotion_contract },
    { name: 'HAND', c: handContract() },
  ];
  const proseSet: { name: string; prose: string }[] = [];
  for (const name of PROSE_SEL) {
    const file = name === 'sovereign' ? 'sample_sovereign.txt' : 'sample_scribe.txt';
    try { proseSet.push({ name, prose: readFileSync(path.join(RUNS_DIR, file), 'utf8') }); }
    catch { log(`WARN missing prose ${file}`); }
  }

  const mkPacket = (c: EmotionContract): ForgePacket => ({ ...forgePacket, emotion_contract: c });
  const SUBS = ['tension_14d', 'emotion_coherence', 'interiority', 'impact', 'temporal_pacing'];
  const runs: any[] = [];
  for (const { name: pname, prose } of proseSet) {
    for (const { name: cname, c } of contracts) {
      const cell: any = { prose: pname, contract: cname, runs: [] };
      for (let i = 0; i < N; i++) {
        const ecc = await computeECC(mkPacket(c), prose, judgeProvider);
        const rec: any = { ecc: Math.round(ecc.score * 100) / 100 };
        for (const s of SUBS) rec[s] = Math.round(sub(ecc, s) * 100) / 100;
        rec.bonus = Math.round((ecc.bonuses ?? []).filter((b: any) => b.triggered).reduce((a: number, b: any) => a + b.value, 0) * 100) / 100;
        cell.runs.push(rec);
        log(`  prose=${pname.padEnd(9)} contract=${cname.padEnd(5)} run${i + 1}/${N}: ECC=${rec.ecc} t14d=${rec.tension_14d} emoCoh=${rec.emotion_coherence} inter=${rec.interiority} impact=${rec.impact}`);
        writeFileSync(path.join(OUT_DIR, 'ecc_dedicated_bench.json'), JSON.stringify({ config: { N, MODEL, prose: PROSE_SEL, golden: GOLDEN }, runs }, null, 2), 'utf8');
      }
      cell.agg = {};
      for (const k of ['ecc', ...SUBS, 'bonus']) cell.agg[k] = stats(cell.runs.map((r: any) => r[k]));
      runs.push(cell);
      log(`  => ${pname}/${cname} AGG: ECC=${cell.agg.ecc.mean}±${cell.agg.ecc.stdev} t14d=${cell.agg.tension_14d.mean} emoCoh=${cell.agg.emotion_coherence.mean} inter=${cell.agg.interiority.mean} impact=${cell.agg.impact.mean}`);
    }
  }
  writeFileSync(path.join(OUT_DIR, 'ecc_dedicated_bench.json'), JSON.stringify({ config: { N, MODEL, prose: PROSE_SEL, golden: GOLDEN }, runs }, null, 2), 'utf8');
  log(`\nWrote ${path.join(OUT_DIR, 'ecc_dedicated_bench.json')}`);
}

main().catch((e) => { log('FATAL: ' + (e?.stack ?? e)); process.exit(1); });
