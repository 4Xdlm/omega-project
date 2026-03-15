/**
 * run-v3-bench.ts — Bench comparatif V2 vs V3
 * Sprint P4-PREP — V-PARTITION v3.0.0
 *
 * Protocole strict :
 *   1. Meme scenario exact (CDEInput + ForgePacketInput)
 *   2. Meme modele, meme seed, meme temperature
 *   3. D'abord V2, puis V3 (ordre fixe)
 *   4. Dump prompt complet pour les 2 runs
 *   5. Damage Gate en mode WARN (mesurer, pas censurer)
 *   6. Fail-fast : si V3 composite < 80 sur scene 0 → abort
 *   7. Lecture sous-scores complete
 *
 * Usage :
 *   $env:ANTHROPIC_API_KEY = "sk-ant-..."
 *   npx tsx scripts/run-v3-bench.ts
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
import type { MacroAxesScores } from '../src/oracle/macro-axes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Configuration (identical for V2 and V3) ─────────────────────────────────

const MODEL = 'claude-sonnet-4-20250514';
const DRAFT_TEMPERATURE = 1.0;
const JUDGE_TEMPERATURE = 0.0;
const N_SCENES = 2;
const FAIL_FAST_MIN = 80.0;

// ── CDEInput (same as run-cde-bench.ts) ─────────────────────────────────────

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
      character_id: 'Pierre',
      arc_phase:    'confrontation',
      current_need: 'comprendre pourquoi Marie ment',
      current_mask: 'calme apparent, controle',
      tension:      'rage contenue vs amour residuel',
    },
    {
      character_id: 'Marie',
      arc_phase:    'setup',
      current_need: 'proteger son secret sans perdre Pierre',
      current_mask: 'normalite forcee',
      tension:      'culpabilite vs instinct de survie',
    },
  ],
  scene_objective: 'Pierre confronte Marie dans leur cuisine, le silence eclate en accusations voilees',
};

// ── Scene ───────────────────────────────────────────────────────────────────

const SCENE: Scene = {
  scene_id:         'v3-bench-scene',
  arc_id:           'arc-couple',
  objective:        'Pierre confronte Marie dans leur cuisine apres une longue journee',
  conflict:         'le silence explose en reproches voiles',
  conflict_type:    'relational',
  emotion_target:   'anger',
  emotion_intensity: 0.8,
  seeds_planted:    ['Marie cache un document dans son sac'],
  seeds_bloomed:    [],
  subtext: {
    character_thinks: 'Marie sait que Pierre sait',
    reader_knows:     'Pierre a trouve le message mais ne dit rien encore',
    tension_type:     'dramatic_irony',
    implied_emotion:  'dread',
  },
  sensory_anchor:   'bruit du couteau sur la planche a decouper',
  constraints:      ['Pas de violence physique', 'Pas de resolution — scene ouverte'],
  beats: [
    {
      beat_id: 'b-01', action: 'Pierre entre dans la cuisine',
      intention: 'observer Marie sans se trahir', pivot: false, tension_delta: 1,
      information_revealed: [], information_withheld: ['il a lu le message'],
    },
    {
      beat_id: 'b-02', action: 'Echange banal qui derape',
      intention: 'tester la reaction de Marie', pivot: true, tension_delta: 1,
      information_revealed: ['Pierre sait quelque chose'], information_withheld: ['la nature exacte du secret'],
    },
    {
      beat_id: 'b-03', action: 'Silence lourd — Pierre sort',
      intention: 'signifier sa connaissance sans confronter', pivot: false, tension_delta: 0,
      information_revealed: [], information_withheld: ['la decision de Pierre'],
    },
  ],
  target_word_count: 500,
  justification:    'climax acte 2 — point de non-retour',
};

const PLAN: GenesisPlan = {
  plan_id: 'v3-bench-plan', plan_hash: 'v3-bench-plan-hash',
  version: '1.0.0', intent_hash: 'v3-bench-intent',
  canon_hash: 'v3-bench-canon', constraints_hash: 'v3-bench-constraints',
  genome_hash: 'v3-bench-genome', emotion_hash: 'v3-bench-emotion',
  arcs: [{
    arc_id: 'arc-couple', theme: 'la desintegration d un couple par le non-dit',
    progression: 'confrontation', justification: 'tension narrative principale',
    scenes: [SCENE],
  }],
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
  run_id: `v3-bench-${Date.now()}`, language: 'fr',
};

// ── Scoring helpers ─────────────────────────────────────────────────────────

interface SceneScores {
  composite: number;
  ecc: number;
  rci: number;
  sii: number;
  ifi: number;
  aai: number;
  min_axis: number;
  sub_scores: Record<string, number>;
}

function extractSceneScores(report: SceneChainReport, sceneIdx: number): SceneScores {
  const scene = report.scenes[sceneIdx];
  const ma = scene?.forge_result?.macro_score?.macro_axes;
  const composite = scene?.forge_result?.s_score?.composite ?? 0;

  const subScores: Record<string, number> = {};
  if (ma) {
    for (const [key, axis] of Object.entries(ma)) {
      const typedAxis = axis as { score: number; sub_scores?: readonly { name: string; score: number }[] };
      if (typedAxis.sub_scores) {
        for (const sub of typedAxis.sub_scores) {
          subScores[sub.name] = sub.score;
        }
      }
    }
  }

  return {
    composite,
    ecc: ma?.ecc?.score ?? 0,
    rci: ma?.rci?.score ?? 0,
    sii: ma?.sii?.score ?? 0,
    ifi: ma?.ifi?.score ?? 0,
    aai: ma?.aai?.score ?? 0,
    min_axis: computeMinAxis(ma),
    sub_scores: subScores,
  };
}

function fmt(n: number): string { return n.toFixed(1).padStart(6); }
function fmtDelta(d: number): string {
  const s = (d >= 0 ? '+' : '') + d.toFixed(1);
  return s.padStart(7);
}

// ── Verdict ─────────────────────────────────────────────────────────────────

type Verdict = 'VICTOIRE_FRANCHE' | 'VICTOIRE_PARTIELLE' | 'ECHEC';

function computeVerdict(v2: SceneScores[], v3: SceneScores[]): { verdict: Verdict; reason: string } {
  const v2Mean = v2.reduce((s, x) => s + x.composite, 0) / v2.length;
  const v3Mean = v3.reduce((s, x) => s + x.composite, 0) / v3.length;

  // Check for regression > 3 on any axis
  const axes = ['ecc', 'rci', 'sii', 'ifi', 'aai'] as const;
  let maxRegression = 0;
  let regressionAxis = '';
  for (let i = 0; i < Math.min(v2.length, v3.length); i++) {
    for (const ax of axes) {
      const drop = v2[i][ax] - v3[i][ax];
      if (drop > maxRegression) {
        maxRegression = drop;
        regressionAxis = `${ax.toUpperCase()} S${i}`;
      }
    }
  }

  if (v3Mean <= v2Mean) {
    return { verdict: 'ECHEC', reason: `Composite moyen V3 (${v3Mean.toFixed(1)}) <= V2 (${v2Mean.toFixed(1)})` };
  }
  if (maxRegression > 3) {
    return { verdict: 'ECHEC', reason: `Regression > 3 pts sur ${regressionAxis}: -${maxRegression.toFixed(1)}` };
  }

  // Check VICTOIRE FRANCHE conditions
  const eccRciOk = v3.every((s, i) => s.ecc >= v2[i].ecc && s.rci >= v2[i].rci);
  const minAxisOk = v3.every((s, i) => s.min_axis >= v2[i].min_axis);
  const siiOk = v3.every((s, i) => s.sii >= v2[i].sii - 2);
  const fatigueReduced = v3.length >= 2 && v2.length >= 2
    ? (v3[0].composite - v3[1].composite) < (v2[0].composite - v2[1].composite)
    : true;

  if (eccRciOk && minAxisOk && siiOk && fatigueReduced) {
    return { verdict: 'VICTOIRE_FRANCHE', reason: 'Tous les criteres satisfaits' };
  }

  // Check VICTOIRE PARTIELLE
  let axesUp = 0;
  for (const ax of ['ecc', 'rci'] as const) {
    if (v3[0][ax] > v2[0][ax]) axesUp++;
  }
  if (axesUp >= 1 && maxRegression <= 3) {
    return { verdict: 'VICTOIRE_PARTIELLE', reason: `${axesUp} axe(s) majeur(s) en progres, pas de regression > 3` };
  }

  return { verdict: 'VICTOIRE_PARTIELLE', reason: `Composite moyen V3 > V2, regression max = ${maxRegression.toFixed(1)}` };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not set');
    process.exit(1);
  }

  const provider = createAnthropicProvider({
    apiKey,
    model: MODEL,
    judgeStable: false,
    draftTemperature: DRAFT_TEMPERATURE,
    judgeTemperature: JUDGE_TEMPERATURE,
    judgeTopP: 1.0,
    judgeMaxTokens: 200,
  });

  const chainConfig: SceneChainConfig = {
    n_scenes: N_SCENES,
    initial_input: CDE_INPUT,
    forge_input: FORGE_INPUT,
  };

  // ── RUN V2 ──────────────────────────────────────────────────────────────────
  console.log('[V3-BENCH] ═══ RUN V2 ═══\n');
  delete process.env.OMEGA_PROMPT_COMPILER_V3;
  delete process.env.OMEGA_DAMAGE_GATE_MODE;

  const v2Report = await runSceneChain(chainConfig, provider);
  const v2Scores = v2Report.scenes.map((_, i) => extractSceneScores(v2Report, i));

  console.log('\n[V3-BENCH] V2 done.\n');

  // ── RUN V3 ──────────────────────────────────────────────────────────────────
  console.log('[V3-BENCH] ═══ RUN V3 ═══\n');
  process.env.OMEGA_PROMPT_COMPILER_V3 = '1';
  process.env.OMEGA_DAMAGE_GATE_MODE = 'WARN';

  // Update run_id to avoid cache collision
  const v3ForgeInput: ForgePacketInput = {
    ...FORGE_INPUT,
    run_id: `v3-bench-v3-${Date.now()}`,
  };
  const v3ChainConfig: SceneChainConfig = {
    ...chainConfig,
    forge_input: v3ForgeInput,
  };

  const v3Report = await runSceneChain(v3ChainConfig, provider);
  const v3Scores = v3Report.scenes.map((_, i) => extractSceneScores(v3Report, i));

  // ── FAIL-FAST ───────────────────────────────────────────────────────────────
  if (v3Scores[0].composite < FAIL_FAST_MIN) {
    console.error(`[V3-BENCH] FAIL-FAST: V3 scene 0 composite ${v3Scores[0].composite.toFixed(1)} < ${FAIL_FAST_MIN} — ABORT`);
  }

  // ── TABLEAU COMPARATIF ──────────────────────────────────────────────────────
  console.log('\n[V3-BENCH] ═══ TABLEAU COMPARATIF ═══\n');
  console.log('| Metrique          |    V2 |    V3 |  Delta |');
  console.log('|-------------------|-------|-------|--------|');

  function row(label: string, v2Val: number, v3Val: number) {
    console.log(`| ${label.padEnd(17)} | ${fmt(v2Val)} | ${fmt(v3Val)} | ${fmtDelta(v3Val - v2Val)} |`);
  }

  for (let i = 0; i < N_SCENES; i++) {
    row(`Composite S${i}`, v2Scores[i].composite, v3Scores[i].composite);
  }
  const v2Mean = v2Scores.reduce((s, x) => s + x.composite, 0) / v2Scores.length;
  const v3Mean = v3Scores.reduce((s, x) => s + x.composite, 0) / v3Scores.length;
  row('Moyenne', v2Mean, v3Mean);

  for (let i = 0; i < N_SCENES; i++) {
    row(`ECC S${i}`, v2Scores[i].ecc, v3Scores[i].ecc);
    row(`RCI S${i}`, v2Scores[i].rci, v3Scores[i].rci);
    row(`SII S${i}`, v2Scores[i].sii, v3Scores[i].sii);
    row(`IFI S${i}`, v2Scores[i].ifi, v3Scores[i].ifi);
    row(`AAI S${i}`, v2Scores[i].aai, v3Scores[i].aai);
    row(`min_axis S${i}`, v2Scores[i].min_axis, v3Scores[i].min_axis);
  }

  if (N_SCENES >= 2) {
    const v2Fatigue = v2Scores[0].composite - v2Scores[1].composite;
    const v3Fatigue = v3Scores[0].composite - v3Scores[1].composite;
    row('delta S0->S1', v2Fatigue, v3Fatigue);
  }

  // Sub-scores
  console.log('\n| Sous-scores S0    |    V2 |    V3 |  Delta |');
  console.log('|-------------------|-------|-------|--------|');
  const allSubKeys = new Set([...Object.keys(v2Scores[0].sub_scores), ...Object.keys(v3Scores[0].sub_scores)]);
  for (const key of allSubKeys) {
    const v2v = v2Scores[0].sub_scores[key] ?? 0;
    const v3v = v3Scores[0].sub_scores[key] ?? 0;
    row(key.slice(0, 17), v2v, v3v);
  }

  // ── VERDICT ─────────────────────────────────────────────────────────────────
  const { verdict, reason } = computeVerdict(v2Scores, v3Scores);
  console.log(`\n[V3-BENCH] ═══ VERDICT ═══`);
  console.log(`[V3-BENCH] ${verdict}`);
  console.log(`[V3-BENCH] Raison : ${reason}`);

  // ── SAVE ────────────────────────────────────────────────────────────────────
  const sessionsDir = resolve(__dirname, '..', 'sessions');
  mkdirSync(sessionsDir, { recursive: true });
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const benchResult = {
    bench_id: `BENCH_P4_V2V3_${timestamp.replace(/[-T]/g, '')}`,
    model: MODEL,
    seed: FORGE_INPUT.run_id,
    temperature: { draft: DRAFT_TEMPERATURE, judge: JUDGE_TEMPERATURE },
    n_scenes: N_SCENES,
    v2_results: {
      composites: v2Report.composites,
      composite_mean: v2Report.composite_mean,
      scores: v2Scores,
    },
    v3_results: {
      composites: v3Report.composites,
      composite_mean: v3Report.composite_mean,
      scores: v3Scores,
    },
    comparison: {
      composite_mean_delta: v3Mean - v2Mean,
      per_scene: v2Scores.map((v2s, i) => ({
        scene: i,
        composite_delta: v3Scores[i].composite - v2s.composite,
        ecc_delta: v3Scores[i].ecc - v2s.ecc,
        rci_delta: v3Scores[i].rci - v2s.rci,
        sii_delta: v3Scores[i].sii - v2s.sii,
        ifi_delta: v3Scores[i].ifi - v2s.ifi,
        aai_delta: v3Scores[i].aai - v2s.aai,
      })),
    },
    verdict,
    verdict_reason: reason,
    created_at: new Date().toISOString(),
  };

  const outPath = resolve(sessionsDir, `v3-bench-${timestamp}.json`);
  writeFileSync(outPath, JSON.stringify(benchResult, null, 2), 'utf-8');
  console.log(`\n[V3-BENCH] Resultats : ${outPath}`);

  // Cleanup env
  delete process.env.OMEGA_PROMPT_COMPILER_V3;
  delete process.env.OMEGA_DAMAGE_GATE_MODE;
}

main().catch(err => {
  console.error('[V3-BENCH] FATAL:', err);
  process.exit(1);
});
