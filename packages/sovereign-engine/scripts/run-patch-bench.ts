/**
 * run-patch-bench.ts — Bench comparatif V3 standard vs V3 + PATCH
 * Sprint P5 — Targeted Patch
 *
 * Protocole strict :
 *   1. Meme scenario exact (CDEInput + ForgePacketInput)
 *   2. Meme modele, meme seed, meme temperature
 *   3. Ordre fixe: V3 standard → V3+PATCH
 *   4. V3+PATCH = V3 pipeline + surgical pass on weakest axis
 *   5. Damage Gate en mode WARN
 *   6. Fail-fast : si V3+PATCH composite < 80 → abort
 *   7. 3-column table: V3 | V3+PATCH | Δ(Patch)
 *
 * Usage :
 *   $env:ANTHROPIC_API_KEY = "sk-ant-..."
 *   npx tsx scripts/run-patch-bench.ts
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSceneChain, type SceneChainConfig, type SceneChainReport } from '../src/cde/scene-chain.js';
import type { CDEInput } from '../src/cde/types.js';
import type { ForgePacketInput } from '../src/input/forge-packet-assembler.js';
import type { GenesisPlan, Scene } from '@omega/genesis-planner';
import type { StyleProfile, KillLists, ForgeContinuity } from '../src/types.js';
import { createAnthropicProvider } from '../src/runtime/anthropic-provider.js';
import { computeMinAxis } from '../src/utils/math-utils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Configuration ───────────────────────────────────────────────────────────

const MODEL = 'claude-sonnet-4-20250514';
const DRAFT_TEMPERATURE = 1.0;
const JUDGE_TEMPERATURE = 0.0;
const N_SCENES = 2;
const FAIL_FAST_MIN = 80.0;

// ── CDEInput ────────────────────────────────────────────────────────────────

const CDE_INPUT: CDEInput = {
  hot_elements: [
    { id: 'persona-marie',  type: 'persona', priority: 9, content: 'Marie, 38 ans, medecin urgentiste, dissimule un secret' },
    { id: 'arc-pierre',     type: 'arc',     priority: 8, content: 'Pierre decouvre la trahison de Marie' },
    { id: 'tension-couple', type: 'tension', priority: 10, content: 'Le couple se dechire en silence depuis des mois' },
    { id: 'debt-promesse',  type: 'debt',    priority: 7, content: 'Marie a promis de tout dire avant la fin du mois' },
    { id: 'canon-lieu',     type: 'canon',   priority: 6, content: 'L action se passe a Lyon en hiver' },
  ],
  canon_facts: [
    { id: 'cf-marie-medecin', fact: 'Marie est medecin urgentiste a Lyon',   sealed_at: '2026-01-01T00:00:00Z' },
    { id: 'cf-pierre-prof',   fact: 'Pierre est professeur de philosophie', sealed_at: '2026-01-01T00:00:00Z' },
    { id: 'cf-saison',        fact: 'On est en janvier, il fait froid',     sealed_at: '2026-01-01T00:00:00Z' },
  ],
  open_debts: [
    { id: 'debt-01', content: 'Marie a promis de reveler son secret',  opened_at: 'ch-3', resolved: false },
    { id: 'debt-02', content: 'Pierre doute de la fidelite de Marie', opened_at: 'ch-5', resolved: false },
  ],
  arc_states: [
    {
      character_id: 'Pierre', arc_phase: 'confrontation',
      current_need: 'comprendre pourquoi Marie ment', current_mask: 'calme apparent, controle',
      tension: 'rage contenue vs amour residuel',
    },
    {
      character_id: 'Marie', arc_phase: 'setup',
      current_need: 'proteger son secret sans perdre Pierre', current_mask: 'normalite forcee',
      tension: 'culpabilite vs instinct de survie',
    },
  ],
  scene_objective: 'Pierre confronte Marie dans leur cuisine, le silence eclate en accusations voilees',
};

// ── Scene ───────────────────────────────────────────────────────────────────

const SCENE: Scene = {
  scene_id: 'patch-bench-scene', arc_id: 'arc-couple',
  objective: 'Pierre confronte Marie dans leur cuisine apres une longue journee',
  conflict: 'le silence explose en reproches voiles', conflict_type: 'relational',
  emotion_target: 'anger', emotion_intensity: 0.8,
  seeds_planted: ['Marie cache un document dans son sac'], seeds_bloomed: [],
  subtext: {
    character_thinks: 'Marie sait que Pierre sait',
    reader_knows: 'Pierre a trouve le message mais ne dit rien encore',
    tension_type: 'dramatic_irony', implied_emotion: 'dread',
  },
  sensory_anchor: 'bruit du couteau sur la planche a decouper',
  constraints: ['Pas de violence physique', 'Pas de resolution — scene ouverte'],
  beats: [
    { beat_id: 'b-01', action: 'Pierre entre dans la cuisine', intention: 'observer Marie sans se trahir', pivot: false, tension_delta: 1, information_revealed: [], information_withheld: ['il a lu le message'] },
    { beat_id: 'b-02', action: 'Echange banal qui derape', intention: 'tester la reaction de Marie', pivot: true, tension_delta: 1, information_revealed: ['Pierre sait quelque chose'], information_withheld: ['la nature exacte du secret'] },
    { beat_id: 'b-03', action: 'Silence lourd — Pierre sort', intention: 'signifier sa connaissance sans confronter', pivot: false, tension_delta: 0, information_revealed: [], information_withheld: ['la decision de Pierre'] },
  ],
  target_word_count: 500, justification: 'climax acte 2 — point de non-retour',
};

const PLAN: GenesisPlan = {
  plan_id: 'patch-bench-plan', plan_hash: 'patch-bench-plan-hash',
  version: '1.0.0', intent_hash: 'patch-bench-intent',
  canon_hash: 'patch-bench-canon', constraints_hash: 'patch-bench-constraints',
  genome_hash: 'patch-bench-genome', emotion_hash: 'patch-bench-emotion',
  arcs: [{ arc_id: 'arc-couple', theme: 'la desintegration d un couple par le non-dit', progression: 'confrontation', justification: 'tension narrative principale', scenes: [SCENE] }],
  seed_registry: [{ id: 'seed-secret', type: 'plot', description: 'Le secret de Marie', planted_in: 'ch-1', blooms_in: 'ch-8' }],
  tension_curve: [0.3, 0.5, 0.7, 0.8, 0.6, 0.9, 0.7],
  emotion_trajectory: [
    { position: 0.0, emotion: 'tension', intensity: 0.5 },
    { position: 0.5, emotion: 'anger', intensity: 0.8 },
    { position: 1.0, emotion: 'despair', intensity: 0.7 },
  ],
  scene_count: 1, beat_count: 3, estimated_word_count: 500,
};

const STYLE_PROFILE: StyleProfile = {
  version: '1.0.0', universe: 'contemporain-litteraire',
  lexicon: { signature_words: ['silence', 'froid', 'regard', 'main'], forbidden_words: ['soudain', 'tout a coup', 'en effet'], abstraction_max_ratio: 0.15, concrete_min_ratio: 0.60 },
  rhythm: { avg_sentence_length_target: 14, gini_target: 0.45, max_consecutive_similar: 3, min_syncopes_per_scene: 2, min_compressions_per_scene: 1 },
  tone: { dominant_register: 'litteraire', intensity_range: [0.6, 0.9] },
  imagery: { recurrent_motifs: ['froid', 'couteau', 'lumiere'], density_target_per_100_words: 3, banned_metaphors: ['le coeur brise', 'les larmes coulaient'] },
};

const KILL_LISTS: KillLists = {
  banned_words: ['soudain', 'tout a coup', 'en effet', 'vraiment'],
  banned_cliches: ['le coeur brise', 'les larmes coulaient', 'il retint son souffle'],
  banned_ai_patterns: ['il ne put s empecher', 'une vague de', 'ses pensees se bousculaient'],
  banned_filter_words: ['semblait', 'paraissait', 'avait l air'],
};

const CONTINUITY: ForgeContinuity = {
  previous_scene_summary: 'Pierre a decouvert un message suspect sur le telephone de Marie apres le diner',
  character_states: [
    { character_id: 'pierre', character_name: 'Pierre', emotional_state: 'controlled_anger', physical_state: 'tense', location: 'apartment_corridor' },
    { character_id: 'marie', character_name: 'Marie', emotional_state: 'anxious_guilt', physical_state: 'tired_from_shift', location: 'kitchen' },
  ],
  open_threads: ['La nature du secret de Marie', 'Le document dans son sac', 'La decision que Pierre doit prendre'],
};

const FORGE_INPUT: ForgePacketInput = {
  plan: PLAN, scene: SCENE, style_profile: STYLE_PROFILE,
  kill_lists: KILL_LISTS, canon: [], continuity: CONTINUITY,
  run_id: `patch-bench-${Date.now()}`, language: 'fr',
};

// ── Scoring helpers ─────────────────────────────────────────────────────────

interface SceneScores {
  composite: number;
  ecc: number; rci: number; sii: number; ifi: number; aai: number;
  min_axis: number;
}

function extractSceneScores(report: SceneChainReport, sceneIdx: number): SceneScores {
  const scene = report.scenes[sceneIdx];
  const ma = scene?.forge_result?.macro_score?.macro_axes;
  return {
    composite: scene?.forge_result?.s_score?.composite ?? 0,
    ecc: ma?.ecc?.score ?? 0, rci: ma?.rci?.score ?? 0,
    sii: ma?.sii?.score ?? 0, ifi: ma?.ifi?.score ?? 0,
    aai: ma?.aai?.score ?? 0, min_axis: computeMinAxis(ma),
  };
}

function fmt(n: number): string { return n.toFixed(1).padStart(6); }
function fmtDelta(d: number): string {
  return ((d >= 0 ? '+' : '') + d.toFixed(1)).padStart(9);
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('ANTHROPIC_API_KEY not set'); process.exit(1); }

  const provider = createAnthropicProvider({
    apiKey, model: MODEL, judgeStable: false,
    draftTemperature: DRAFT_TEMPERATURE, judgeTemperature: JUDGE_TEMPERATURE,
    judgeTopP: 1.0, judgeMaxTokens: 200,
  });

  const chainConfig: SceneChainConfig = { n_scenes: N_SCENES, initial_input: CDE_INPUT, forge_input: FORGE_INPUT };

  // ── RUN V3 STANDARD ──────────────────────────────────────────────────────
  console.log('[PATCH-BENCH] ═══ RUN V3 STANDARD ═══\n');
  process.env.OMEGA_PROMPT_COMPILER_V3 = '1';
  delete process.env.OMEGA_TARGETED_PATCH;
  const v3Report = await runSceneChain(chainConfig, provider);
  const v3Scores = v3Report.scenes.map((_, i) => extractSceneScores(v3Report, i));

  // ── RUN V3 + PATCH ───────────────────────────────────────────────────────
  console.log('\n[PATCH-BENCH] ═══ RUN V3 + PATCH ═══\n');
  process.env.OMEGA_PROMPT_COMPILER_V3 = '1';
  process.env.OMEGA_TARGETED_PATCH = '1';
  const patchForgeInput: ForgePacketInput = { ...FORGE_INPUT, run_id: `patch-bench-patched-${Date.now()}` };
  const patchReport = await runSceneChain({ ...chainConfig, forge_input: patchForgeInput }, provider);
  const patchScores = patchReport.scenes.map((_, i) => extractSceneScores(patchReport, i));

  // ── FAIL-FAST ──────────────────────────────────────────────────────────────
  if (patchScores[0].composite < FAIL_FAST_MIN) {
    console.error(`[PATCH-BENCH] FAIL-FAST: V3+PATCH scene 0 composite ${patchScores[0].composite.toFixed(1)} < ${FAIL_FAST_MIN} — ABORT`);
  }

  // ── TABLEAU COMPARATIF ─────────────────────────────────────────────────────
  console.log('\n[PATCH-BENCH] ═══ TABLEAU COMPARATIF ═══\n');
  console.log('| Metrique          |    V3 | V3+PATCH | Δ(Patch) |');
  console.log('|-------------------|-------|----------|----------|');

  function row(label: string, v3Val: number, patchVal: number) {
    console.log(`| ${label.padEnd(17)} | ${fmt(v3Val)} | ${fmt(patchVal).padStart(8)} | ${fmtDelta(patchVal - v3Val)} |`);
  }

  for (let i = 0; i < N_SCENES; i++) {
    row(`Composite S${i}`, v3Scores[i].composite, patchScores[i].composite);
  }

  const v3Mean = v3Scores.reduce((s, x) => s + x.composite, 0) / v3Scores.length;
  const patchMean = patchScores.reduce((s, x) => s + x.composite, 0) / patchScores.length;
  row('Moyenne', v3Mean, patchMean);
  console.log('|-------------------|-------|----------|----------|');

  for (let i = 0; i < N_SCENES; i++) {
    row(`ECC S${i}`, v3Scores[i].ecc, patchScores[i].ecc);
    row(`RCI S${i}`, v3Scores[i].rci, patchScores[i].rci);
    row(`SII S${i}`, v3Scores[i].sii, patchScores[i].sii);
    row(`IFI S${i}`, v3Scores[i].ifi, patchScores[i].ifi);
    row(`AAI S${i}`, v3Scores[i].aai, patchScores[i].aai);
    row(`min_axis S${i}`, v3Scores[i].min_axis, patchScores[i].min_axis);
  }

  if (N_SCENES >= 2) {
    const v3Fatigue = v3Scores[0].composite - v3Scores[1].composite;
    const patchFatigue = patchScores[0].composite - patchScores[1].composite;
    row('delta S0->S1', v3Fatigue, patchFatigue);
  }

  // ── VERDICT ──────────────────────────────────────────────────────────────
  const axes = ['ecc', 'rci', 'sii', 'ifi', 'aai'] as const;
  let maxRegression = 0;
  let regressionAxis = '';
  for (let i = 0; i < Math.min(v3Scores.length, patchScores.length); i++) {
    for (const ax of axes) {
      const drop = v3Scores[i][ax] - patchScores[i][ax];
      if (drop > maxRegression) {
        maxRegression = drop;
        regressionAxis = `${ax.toUpperCase()} S${i}`;
      }
    }
  }

  let verdict: string;
  let reason: string;
  if (patchMean > v3Mean && maxRegression <= 2) {
    verdict = 'VICTOIRE';
    reason = `Composite moyen V3+PATCH (${patchMean.toFixed(1)}) > V3 (${v3Mean.toFixed(1)}), max regression = ${maxRegression.toFixed(1)}`;
  } else if (patchMean <= v3Mean) {
    verdict = 'ECHEC';
    reason = `Composite moyen V3+PATCH (${patchMean.toFixed(1)}) <= V3 (${v3Mean.toFixed(1)})`;
  } else {
    verdict = 'ECHEC';
    reason = `Regression > 2 pts sur ${regressionAxis}: -${maxRegression.toFixed(1)}`;
  }

  console.log(`\n[PATCH-BENCH] ═══ VERDICT ═══`);
  console.log(`[PATCH-BENCH] ${verdict}`);
  console.log(`[PATCH-BENCH] Raison : ${reason}`);

  // ── SAVE ────────────────────────────────────────────────────────────────────
  const sessionsDir = resolve(__dirname, '..', 'sessions');
  mkdirSync(sessionsDir, { recursive: true });
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const benchResult = {
    bench_id: `BENCH_P5_PATCH_${timestamp.replace(/[-T]/g, '')}`,
    model: MODEL, n_scenes: N_SCENES,
    v3: { composites: v3Scores.map(s => s.composite), mean: v3Mean, scores: v3Scores },
    patch: { composites: patchScores.map(s => s.composite), mean: patchMean, scores: patchScores },
    comparison: { mean_delta: patchMean - v3Mean, max_regression: maxRegression, regression_axis: regressionAxis },
    verdict, verdict_reason: reason,
    created_at: new Date().toISOString(),
  };

  const outPath = resolve(sessionsDir, `patch-bench-${timestamp}.json`);
  writeFileSync(outPath, JSON.stringify(benchResult, null, 2), 'utf-8');
  console.log(`\n[PATCH-BENCH] Resultats : ${outPath}`);

  // Cleanup
  delete process.env.OMEGA_PROMPT_COMPILER_V3;
  delete process.env.OMEGA_TARGETED_PATCH;
}

main().catch(err => {
  console.error('[PATCH-BENCH] FATAL:', err);
  process.exit(1);
});
