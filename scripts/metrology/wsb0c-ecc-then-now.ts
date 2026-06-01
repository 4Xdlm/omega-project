/**
 * OMEGA METROLOGY — WS-B0c ECC THEN/NOW JUDGE DRIFT (Ollama, bench, READ-ONLY)
 * ============================================================================
 * Complète WS-B0b (qui a prouvé que computeRCI/CALC n'a pas dérivé). Ici on teste
 * le JUGE LLM : ECC. Re-score les passages ALTERNANCE 2026-03-26 (qui ont un ECC
 * historique enregistré) avec computeECC d'AUJOURD'HUI, k=3 pour la variance LLM.
 *
 * ⚠️ ANTI-BOÎTE-VIDE : on NE nourrit PAS le juge avec un contrat vide. On utilise
 * un contrat émotionnel scène-type DOCUMENTÉ et UNIFORME (menace = arc fear→sadness ;
 * revelation = arc surprise/awe→sadness), JAMAIS dérivé de la prose (anti-circularité).
 * ⚠️ CAVEAT HONNÊTE : le contrat ALTERNANCE ORIGINAL n'est PAS sauvegardé. Donc
 * Δ(hist,now) conflera (a) dérive du juge LLM, (b) écart de contrat (type vs original),
 * (c) variance LLM. k=3 isole (c). (a)+(b) ne sont pas séparables sans le contrat d'époque.
 *
 * NÉCESSITE OLLAMA → terminal Architecte (le shell Desktop Commander ne résout pas le
 * node imbriqué de l'ollama-provider). Run (cwd=packages/sovereign-engine) :
 *   $env:ECC_K='3'; npx tsx ../../scripts/metrology/wsb0c-ecc-then-now.ts
 */
process.env.OMEGA_CHUNKED_V4 = '1';
process.env.OMEGA_PROMPT_V4 = '1';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as path from 'node:path';
import { createGenesisPlan } from '../../packages/genesis-planner/src/planner.js';
import { createDefaultConfig } from '../../packages/genesis-planner/src/config.js';
import type { GenesisPlan, Scene } from '../../packages/genesis-planner/src/types.js';
import { assembleForgePacket } from '../../packages/sovereign-engine/src/input/forge-packet-assembler.js';
import { computeECC } from '../../packages/sovereign-engine/src/oracle/macro-axes.js';
import { createOllamaProvider } from '../../packages/sovereign-engine/src/runtime/ollama-provider.js';
import { DEFAULT_VOICE_GENOME } from '../../packages/sovereign-engine/src/voice/voice-genome.js';
import type { ForgePacket, StyleProfile, KillLists, CanonEntry, ForgeContinuity, EmotionContract } from '../../packages/sovereign-engine/src/types.js';

const DIMS = ['joy','trust','fear','surprise','sadness','disgust','anger','anticipation','love','submission','awe','disapproval','remorse','contempt'] as const;
const TS = '2026-01-01T00:00:00.000Z';
const REPO = path.resolve(process.cwd(), process.cwd().endsWith('sovereign-engine') ? '../..' : '.');
const ALT = path.join(REPO, 'packages', 'sovereign-engine', 'sessions', 'ALTERNANCE_STUDY_2026-03-26T21-03-33');
const OUT = path.join(REPO, 'docs', 'audit', 'minaxis');
const MODEL = process.env.ECC_MODEL ?? 'qwen3:32b';
const OLLAMA_URL = process.env.ECC_OLLAMA_URL ?? 'http://localhost:11434';
const K = parseInt(process.env.ECC_K ?? '3', 10);
function log(s: string) { process.stderr.write(s + '\n'); }
function words(s: string) { return s.split(/\s+/).filter((w) => w.length > 0).length; }
function sha(s: string) { return createHash('sha256').update(s).digest('hex').slice(0, 16); }
function z(): Record<string, number> { return Object.fromEntries(DIMS.map((d) => [d, 0])); }
function q(over: Record<string, number>) { return { ...z(), ...over }; }

// Contrats scène-type DOCUMENTÉS (uniformes, non dérivés de la prose)
function menaceContract(): EmotionContract {
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
function revelationContract(): EmotionContract {
  return {
    curve_quartiles: [
      { quartile: 'Q1', target_14d: q({ anticipation: 0.5, fear: 0.3, awe: 0.2 }), valence: -0.2, arousal: 0.6, dominant: 'anticipation', narrative_instruction: 'Approaching truth' },
      { quartile: 'Q2', target_14d: q({ surprise: 0.6, awe: 0.3, fear: 0.1 }), valence: 0.0, arousal: 0.85, dominant: 'surprise', narrative_instruction: 'The revelation strikes' },
      { quartile: 'Q3', target_14d: q({ awe: 0.5, sadness: 0.3, surprise: 0.2 }), valence: -0.1, arousal: 0.7, dominant: 'awe', narrative_instruction: 'Magnitude sinks in' },
      { quartile: 'Q4', target_14d: q({ sadness: 0.5, awe: 0.3, remorse: 0.2 }), valence: -0.4, arousal: 0.45, dominant: 'sadness', narrative_instruction: 'Bittersweet aftermath' },
    ] as any,
    intensity_range: { min: 0.3, max: 0.9 },
    tension: { slope_target: 'arc', pic_position_pct: 0.5, faille_position_pct: 0.6, silence_zones: [] },
    terminal_state: { target_14d: { ...z(), sadness: 0.5, awe: 0.3, remorse: 0.2 }, valence: -0.4, arousal: 0.45, dominant: 'sadness', reader_state: 'Bittersweet' },
    rupture: { exists: true, position_pct: 0.5, before_dominant: 'anticipation', after_dominant: 'surprise', delta_valence: 0.2 },
    valence_arc: { start: -0.2, end: -0.4, direction: 'darkening' },
  } as EmotionContract;
}

function buildBasePacket(): ForgePacket {
  const pack = JSON.parse(readFileSync(path.join(REPO, 'golden/intents/intent_pack_gardien.json'), 'utf8'));
  const { plan } = createGenesisPlan(pack.intent, pack.canon, pack.constraints, pack.genome, pack.emotion, createDefaultConfig(), TS) as { plan: GenesisPlan };
  const scene0: Scene = plan.arcs[0]!.scenes[0]!;
  const style_profile: StyleProfile = {
    version: '1.0.0', universe: 'literary_fiction',
    lexicon: { signature_words: ['phare','mer','lumiere','profondeur','silence'], forbidden_words: [], abstraction_max_ratio: 0.20, concrete_min_ratio: 0.60 },
    rhythm: { avg_sentence_length_target: 15, gini_target: 0.45, max_consecutive_similar: 2, min_syncopes_per_scene: 2, min_compressions_per_scene: 1 },
    tone: { dominant_register: 'soutenu', intensity_range: [0.2, 0.9] as readonly [number, number] },
    imagery: { recurrent_motifs: ['phare','ocean','lumiere'], density_target_per_100_words: 3, banned_metaphors: [] },
    voice: DEFAULT_VOICE_GENOME,
  };
  return assembleForgePacket({ plan, scene: scene0, style_profile, kill_lists: { banned_words: [], banned_cliches: [], banned_ai_patterns: [], banned_filter_words: [] } as KillLists, canon: [] as CanonEntry[], continuity: { previous_scene_summary: '', character_states: [], open_threads: [] } as ForgeContinuity, run_id: 'wsb0c', language: 'fr' });
}

const MAP: ReadonlyArray<readonly [string, string, string, 'menace' | 'revelation']> = [
  ['prose_A_baseline.txt', 'A_baseline', 'menace', 'menace'],
  ['prose_B_exemplar.txt', 'B_exemplar', 'menace', 'menace'],
  ['prose_C_sysprompt.txt', 'C_sysprompt', 'menace', 'menace'],
  ['prose_D_antimono_menace.txt', 'D_antimono', 'menace', 'menace'],
  ['prose_E_skeleton_menace.txt', 'E_skeleton', 'menace', 'menace'],
  ['prose_F_mask_menace.txt', 'F_mask', 'menace', 'menace'],
  ['prose_C_revelation.txt', 'C_sysprompt', 'revelation', 'revelation'],
];

function stats(xs: number[]) {
  const n = xs.length; if (!n) return { n: 0, mean: 0, std: 0 };
  const mean = xs.reduce((a, b) => a + b, 0) / n;
  const std = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
  return { n, mean: +mean.toFixed(2), std: +std.toFixed(2) };
}

async function main() {
  log(`=== WS-B0c ECC THEN/NOW — ${MODEL} | k=${K} ===`);
  const provider = createOllamaProvider({ baseUrl: OLLAMA_URL, model: MODEL, draftTemperature: 0.0, judgeTemperature: 0.0, draftMaxTokens: 2000, judgeMaxTokens: 2000 });
  const base = buildBasePacket();
  const hist = JSON.parse(readFileSync(path.join(ALT, 'phase2_results.json'), 'utf8')) as any[];
  const findHist = (name: string, scene: string) => hist.find((h) => h.name === name && h.scene === scene);
  const rows: any[] = [];
  for (const [file, name, scene, kind] of MAP) {
    const fp = path.join(ALT, file);
    let prose: string;
    try { prose = readFileSync(fp, 'utf8'); } catch { log('  MISSING ' + file); continue; }
    const h = findHist(name, scene); if (!h) { log('  NO HIST ' + name + '/' + scene); continue; }
    const contract = kind === 'menace' ? menaceContract() : revelationContract();
    const packet: ForgePacket = { ...base, emotion_contract: contract };
    const eccRuns: number[] = []; const t14: number[] = [];
    for (let i = 0; i < K; i++) {
      const ecc = await computeECC(packet, prose, provider);
      eccRuns.push(+ecc.score.toFixed(2));
      const t = (ecc.sub_scores as any[]).find((s) => s.name === 'tension_14d'); if (t) t14.push(+t.score.toFixed(2));
    }
    const st = stats(eccRuns);
    const delta = +(st.mean - h.ECC).toFixed(2);
    let verdict: string;
    if (st.std > 5) verdict = 'unstable_variance';
    else if (Math.abs(delta) <= 3) verdict = 'stable';
    else verdict = 'biased_shift';
    rows.push({
      name, scene, kind, words: words(prose), sha16: sha(prose),
      hist_ECC: +h.ECC.toFixed(2), now_ECC_mean: st.mean, now_ECC_std: st.std,
      delta, abs_delta: +Math.abs(delta).toFixed(2), now_t14d_mean: stats(t14).mean, k: K, verdict,
    });
    log(`  ${name}/${scene} [${kind}] hist=${h.ECC.toFixed(1)} now=${st.mean}±${st.std} Δ=${delta} t14d=${stats(t14).mean} -> ${verdict}`);
  }
  const ds = rows.map((r) => r.delta); const ab = rows.map((r) => r.abs_delta); const n = ds.length;
  const mean = (xs: number[]) => xs.length ? +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2) : 0;
  const med = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? +s[Math.floor(s.length / 2)].toFixed(2) : 0; };
  const summary = {
    tool: 'wsb0c-ecc-then-now.ts', model: MODEL, k: K, n,
    mean_delta: mean(ds), median_delta: med(ds),
    MAE: mean(ab), RMSE: +Math.sqrt(rows.reduce((a, r) => a + r.delta * r.delta, 0) / (n || 1)).toFixed(2),
    std_delta: stats(ds).std, min_delta: Math.min(...ds), max_delta: Math.max(...ds),
    pct_abs_gt2: +(100 * ab.filter((x) => x > 2).length / (n || 1)).toFixed(0),
    pct_abs_gt5: +(100 * ab.filter((x) => x > 5).length / (n || 1)).toFixed(0),
    pct_abs_gt10: +(100 * ab.filter((x) => x > 10).length / (n || 1)).toFixed(0),
    verdicts: { stable: rows.filter((r) => r.verdict === 'stable').length, biased_shift: rows.filter((r) => r.verdict === 'biased_shift').length, unstable_variance: rows.filter((r) => r.verdict === 'unstable_variance').length },
    CAVEAT: 'Contrat ALTERNANCE original NON sauvegarde. Delta(hist,now) confond derive-juge-LLM + ecart-contrat (type vs original) + variance-LLM. k=3 isole la variance (now_ECC_std). derive-juge et ecart-contrat NON separables sans le contrat d epoque. Contrat scene-type documente (menace=fear arc, revelation=surprise/awe->sadness), uniforme, non derive de la prose.',
    interpretation: 'mean_delta ~0 & std faible => juge ECC stable (sous reserve contrat). |delta| large & std faible => biased_shift (juge ET/OU contrat). std large => variance LLM dominante.',
  };
  mkdirSync(OUT, { recursive: true });
  const cols = ['name','scene','kind','words','sha16','hist_ECC','now_ECC_mean','now_ECC_std','delta','abs_delta','now_t14d_mean','k','verdict'];
  writeFileSync(path.join(OUT, 'JUDGE_DRIFT_ECC_THEN_NOW.csv'), [cols.join(','), ...rows.map((r) => cols.map((c) => r[c]).join(','))].join('\n') + '\n', 'utf8');
  writeFileSync(path.join(OUT, 'judge_drift_ecc_then_now_summary.json'), JSON.stringify({ summary, rows }, null, 2), 'utf8');
  log('\n=== SUMMARY ==='); log(JSON.stringify(summary, null, 2));
}
main().catch((e) => { log('FATAL: ' + (e?.stack ?? e)); process.exit(1); });
