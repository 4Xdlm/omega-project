/**
 * OMEGA METROLOGY — WS-A.2 PROSE EMOTION DIAGNOSTIC (CALC-only, read-only)
 * ============================================================================
 * Objectif : désambiguïser la cause-racine de l'écart ECC FORGE(68)/HAND(92).
 * Mesure le 14D RÉEL par quartile de la prose M0.b (sample_sovereign.txt) via
 * l'analyseur keyword DÉTERMINISTE (zéro LLM, zéro Ollama, zéro API), tel que
 * tension-14d.ts l'utilise en fallback, puis :
 *   - cosinus(prose_actual, FORGE target_14d) par quartile  -> reproduit ~9
 *   - cosinus(prose_actual, HAND  target_14d) par quartile  -> reproduit ~86
 *   - dominant émotionnel mesuré par quartile
 * Verdict : R1 (label planner faux) / R2 (prose dérivée) / R3 (analyseur faux).
 *
 * READ-ONLY : aucune écriture moteur, aucun patch. Harness seul.
 * Run (cwd = packages/sovereign-engine) : npx tsx ../../scripts/metrology/wsa2-prose-emotion-diag.ts
 */
import { readFileSync } from 'node:fs';
import * as path from 'node:path';

import { createGenesisPlan } from '../../packages/genesis-planner/src/planner.js';
import { createDefaultConfig } from '../../packages/genesis-planner/src/config.js';
import type { GenesisPlan, Scene } from '../../packages/genesis-planner/src/types.js';

import { assembleForgePacket } from '../../packages/sovereign-engine/src/input/forge-packet-assembler.js';
import { SOVEREIGN_CONFIG } from '../../packages/sovereign-engine/src/config.js';
import { DEFAULT_VOICE_GENOME } from '../../packages/sovereign-engine/src/voice/voice-genome.js';
import type {
  StyleProfile, KillLists, CanonEntry, ForgeContinuity,
} from '../../packages/sovereign-engine/src/types.js';

import { analyzeEmotionFromText, cosineSimilarity14D } from '@omega/omega-forge';

const DIMS = ['joy','trust','fear','surprise','sadness','disgust','anger','anticipation','love','submission','awe','disapproval','remorse','contempt'] as const;
const TS = '2026-01-01T00:00:00.000Z';
const REPO_ROOT = path.resolve(process.cwd(), process.cwd().endsWith('sovereign-engine') ? '../..' : '.');
const GOLDEN = process.env.M0B_GOLDEN ?? 'golden/intents/intent_pack_gardien.json';
const RUNS_DIR = path.join(REPO_ROOT, 'docs', 'audit', 'metrology', 'm0b-runs');

function z(): Record<string, number> { return Object.fromEntries(DIMS.map((d) => [d, 0])); }
function q(over: Record<string, number>) { return { ...z(), ...over }; }

function handQuartiles() {
  return [
    q({ fear: 0.6, anticipation: 0.3, sadness: 0.1 }),
    q({ fear: 0.7, surprise: 0.2, anticipation: 0.1 }),
    q({ fear: 0.6, sadness: 0.3, awe: 0.1 }),
    q({ sadness: 0.5, fear: 0.3, remorse: 0.2 }),
  ];
}

function dominant(v: Record<string, number>): string {
  let best = ''; let bv = -Infinity;
  for (const d of DIMS) { const x = v[d] ?? 0; if (x > bv) { bv = x; best = d; } }
  return `${best}(${bv.toFixed(2)})`;
}

function topN(v: Record<string, number>, n = 3): string {
  return [...DIMS].map((d) => [d, v[d] ?? 0] as const)
    .sort((a, b) => b[1] - a[1]).slice(0, n)
    .filter(([, x]) => x > 0).map(([d, x]) => `${d}=${x.toFixed(2)}`).join(' ');
}

function main() {
  const pack = JSON.parse(readFileSync(path.join(REPO_ROOT, GOLDEN), 'utf8'));
  const g = createDefaultConfig();
  const { plan } = createGenesisPlan(pack.intent, pack.canon, pack.constraints, pack.genome, pack.emotion, g, TS) as { plan: GenesisPlan };
  const scene0: Scene = plan.arcs[0]!.scenes[0]!;

  const style_profile: StyleProfile = {
    version: '1.0.0', universe: 'literary_fiction',
    lexicon: { signature_words: ['phare','mer','lumiere','profondeur','silence'], forbidden_words: pack.constraints.banned_words ?? [], abstraction_max_ratio: 0.20, concrete_min_ratio: 0.60 },
    rhythm: { avg_sentence_length_target: pack.genome?.target_avg_sentence_length ?? 15, gini_target: 0.45, max_consecutive_similar: 2, min_syncopes_per_scene: 2, min_compressions_per_scene: 1 },
    tone: { dominant_register: 'soutenu', intensity_range: [0.2, 0.9] as readonly [number, number] },
    imagery: { recurrent_motifs: ['phare','ocean','lumiere'], density_target_per_100_words: 3, banned_metaphors: pack.constraints.forbidden_cliches ?? [] },
    voice: DEFAULT_VOICE_GENOME,
  };
  const kill_lists: KillLists = { banned_words: pack.constraints.banned_words ?? [], banned_cliches: pack.constraints.forbidden_cliches ?? [], banned_ai_patterns: [], banned_filter_words: [] };
  const canon: CanonEntry[] = (pack.canon?.entries ?? []).map((e: any) => ({ id: e.id, statement: e.statement }));
  const continuity: ForgeContinuity = { previous_scene_summary: '', character_states: [], open_threads: [] };

  const forgePacket = assembleForgePacket({
    plan, scene: scene0, style_profile, kill_lists, canon, continuity, run_id: 'wsa2_diag', language: 'fr',
  });
  const sc = (plan as any).scene_count;
  const inRange = plan.emotion_trajectory.filter((wp: any) => wp.position >= 0 && wp.position <= 1 / sc);
  console.log(`GRANULARITE: scene_count=${sc} | scene0_range=[0, ${(1/sc).toFixed(3)}] | book_waypoints=${plan.emotion_trajectory.length} | in-range(scene0)=${inRange.length} -> [${inRange.map((w:any)=>w.emotion+'@'+w.position).join(', ')}]`);
  const forgeQ = forgePacket.emotion_contract.curve_quartiles.map((c: any) => c.target_14d);
  const handQ = handQuartiles();

  const prose = readFileSync(path.join(RUNS_DIR, 'sample_sovereign.txt'), 'utf8');
  const paragraphs = prose.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const total = paragraphs.length;
  const bounds = SOVEREIGN_CONFIG.QUARTILE_BOUNDS;
  const quartiles = ['Q1','Q2','Q3','Q4'] as const;

  console.log('=== WS-A.2 PROSE EMOTION DIAGNOSTIC (CALC keyword, deterministic) ===');
  console.log(`prose=sample_sovereign.txt | paragraphs=${total} | scene0.emotion_target=${scene0.emotion_target} intensity=${scene0.emotion_intensity}`);
  console.log(`SEMANTIC_CORTEX_ENABLED=${SOVEREIGN_CONFIG.SEMANTIC_CORTEX_ENABLED} (false => keyword path, same as tension_14d fallback)`);
  console.log('');

  const cosF: number[] = []; const cosH: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [sF, eF] = bounds[quartiles[i]];
    const startIdx = Math.floor(sF * total);
    const endIdx = Math.ceil(eF * total);
    const qtext = paragraphs.slice(startIdx, endIdx).join('\n\n');
    const actual = analyzeEmotionFromText(qtext, 'fr') as unknown as Record<string, number>;
    const cf = cosineSimilarity14D(forgeQ[i] as any, actual as any);
    const ch = cosineSimilarity14D(handQ[i] as any, actual as any);
    cosF.push(cf); cosH.push(ch);
    console.log(`${quartiles[i]} [p${startIdx}..${endIdx}] actual_top3: ${topN(actual)} | dom=${dominant(actual)}`);
    console.log(`     FORGE_target_top3: ${topN(forgeQ[i] as any)}  -> cos=${cf.toFixed(3)}`);
    console.log(`     HAND_target_top3 : ${topN(handQ[i])}  -> cos=${ch.toFixed(3)}`);
  }
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  console.log('');
  console.log(`AVG cosine: FORGE=${avg(cosF).toFixed(3)}  HAND=${avg(cosH).toFixed(3)}`);
  console.log('Interprétation : si prose mesurée = fear/awe (cos HAND >> cos FORGE) -> R1/R2 (contrat trust ne reflète pas la scène).');
  console.log('  Si prose mesurée = trust (cos FORGE haut) mais ECC bas -> R3 (analyseur/curve_quartiles). Si prose = trust ET cos FORGE haut -> pas de bug contrat.');
}

main();
