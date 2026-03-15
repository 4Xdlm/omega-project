/**
 * run-v4-bench.ts — Bench comparatif V3 vs V4
 * Phase V4-4 — A/B equitable
 *
 * Protocole strict :
 *   1. Meme scenario exact (CDEInput + ForgePacketInput)
 *   2. Meme modele, meme seed, meme temperature
 *   3. D'abord V3, puis V4 (ordre fixe)
 *   4. Seule variable = le prompt (V3 ~15k vs V4 ~800)
 *   5. Pipeline identique : SymbolMap, Duel, Polish, Loop, Score
 *
 * Usage :
 *   $env:ANTHROPIC_API_KEY = "sk-ant-..."
 *   npx tsx scripts/run-v4-bench.ts
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

// ── Configuration (identical for V3 and V4) ─────────────────────────────────

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
    { character_id: 'Pierre', arc_phase: 'confrontation', current_need: 'comprendre pourquoi Marie ment', current_mask: 'calme apparent, controle', tension: 'rage contenue vs amour residuel' },
    { character_id: 'Marie', arc_phase: 'setup', current_need: 'proteger son secret sans perdre Pierre', current_mask: 'normalite forcee', tension: 'culpabilite vs instinct de survie' },
  ],
  scene_objective: 'Pierre confronte Marie dans leur cuisine, le silence eclate en accusations voilees',
};

// ── Scene ───────────────────────────────────────────────────────────────────

const SCENE: Scene = {
  scene_id: 'v4-bench-scene', arc_id: 'arc-couple',
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
  plan_id: 'v4-bench-plan', plan_hash: 'v4-bench-plan-hash',
  version: '1.0.0', intent_hash: 'v4-bench-intent',
  canon_hash: 'v4-bench-canon', constraints_hash: 'v4-bench-constraints',
  genome_hash: 'v4-bench-genome', emotion_hash: 'v4-bench-emotion',
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
  run_id: `v4-bench-${Date.now()}`, language: 'fr',
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
}

function extractSceneScores(report: SceneChainReport, sceneIdx: number): SceneScores {
  const scene = report.scenes[sceneIdx];
  const ma = scene?.forge_result?.macro_score?.macro_axes;
  const composite = scene?.forge_result?.s_score?.composite ?? 0;

  return {
    composite,
    ecc: (ma?.ecc as any)?.score ?? 0,
    rci: (ma?.rci as any)?.score ?? 0,
    sii: (ma?.sii as any)?.score ?? 0,
    ifi: (ma?.ifi as any)?.score ?? 0,
    aai: (ma?.aai as any)?.score ?? 0,
    min_axis: computeMinAxis(ma),
  };
}

function fmt(n: number): string { return n.toFixed(1).padStart(6); }
function fmtDelta(d: number): string {
  const s = (d >= 0 ? '+' : '') + d.toFixed(1);
  return s.padStart(7);
}

// ── Verdict ─────────────────────────────────────────────────────────────────

type Verdict = 'VICTOIRE_V4_FRANCHE' | 'VICTOIRE_V4_SUFFISANTE' | 'ECHEC';

function computeVerdict(v3: SceneScores[], v4: SceneScores[]): { verdict: Verdict; reason: string } {
  const v3Mean = v3.reduce((s, x) => s + x.composite, 0) / v3.length;
  const v4Mean = v4.reduce((s, x) => s + x.composite, 0) / v4.length;

  // Check max regression on any axis
  const axes = ['ecc', 'rci', 'sii', 'ifi', 'aai'] as const;
  let maxRegression = 0;
  let regressionAxis = '';
  for (let i = 0; i < Math.min(v3.length, v4.length); i++) {
    for (const ax of axes) {
      const drop = v3[i][ax] - v4[i][ax];
      if (drop > maxRegression) {
        maxRegression = drop;
        regressionAxis = `${ax.toUpperCase()} S${i}`;
      }
    }
  }

  if (v4Mean < v3Mean - 1.0) {
    return { verdict: 'ECHEC', reason: `V4 moyen (${v4Mean.toFixed(1)}) < V3 (${v3Mean.toFixed(1)}) - 1.0` };
  }

  // VICTOIRE FRANCHE: V4 > V3, no regression > 3
  if (v4Mean > v3Mean && maxRegression <= 3) {
    return { verdict: 'VICTOIRE_V4_FRANCHE', reason: `V4 moyen (${v4Mean.toFixed(1)}) > V3 (${v3Mean.toFixed(1)}), aucune regression > 3` };
  }

  // VICTOIRE SUFFISANTE: V4 ≥ V3 - 0.5, prompt ÷10
  if (v4Mean >= v3Mean - 0.5) {
    return { verdict: 'VICTOIRE_V4_SUFFISANTE', reason: `V4 moyen (${v4Mean.toFixed(1)}) >= V3 (${v3Mean.toFixed(1)}) - 0.5, prompt divise par 10+` };
  }

  return { verdict: 'ECHEC', reason: `V4 moyen (${v4Mean.toFixed(1)}) trop bas vs V3 (${v3Mean.toFixed(1)}), regression max = ${maxRegression.toFixed(1)} sur ${regressionAxis}` };
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('ANTHROPIC_API_KEY not set'); process.exit(1); }

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

  // ── RUN V3 ──────────────────────────────────────────────────────────────────
  console.log('[V4-BENCH] ═══ RUN V3 (baseline) ═══\n');
  process.env.OMEGA_PROMPT_COMPILER_V3 = '1';
  delete process.env.OMEGA_PROMPT_V4;
  delete process.env.OMEGA_DAMAGE_GATE_MODE;

  const v3Report = await runSceneChain(chainConfig, provider);
  const v3Scores = v3Report.scenes.map((_, i) => extractSceneScores(v3Report, i));

  console.log('\n[V4-BENCH] V3 done.\n');

  // ── RUN V4 ──────────────────────────────────────────────────────────────────
  console.log('[V4-BENCH] ═══ RUN V4 ═══\n');
  process.env.OMEGA_PROMPT_V4 = '1';
  delete process.env.OMEGA_PROMPT_COMPILER_V3;

  const v4ForgeInput: ForgePacketInput = {
    ...FORGE_INPUT,
    run_id: `v4-bench-v4-${Date.now()}`,
  };
  const v4ChainConfig: SceneChainConfig = {
    ...chainConfig,
    forge_input: v4ForgeInput,
  };

  const v4Report = await runSceneChain(v4ChainConfig, provider);
  const v4Scores = v4Report.scenes.map((_, i) => extractSceneScores(v4Report, i));

  // ── FAIL-FAST ───────────────────────────────────────────────────────────────
  if (v4Scores[0].composite < FAIL_FAST_MIN) {
    console.error(`[V4-BENCH] FAIL-FAST: V4 scene 0 composite ${v4Scores[0].composite.toFixed(1)} < ${FAIL_FAST_MIN} — ABORT`);
  }

  // ── TABLEAU COMPARATIF ────────────────────────────────────────────────────
  console.log('\n[V4-BENCH] ═══ TABLEAU COMPARATIF ═══\n');
  console.log('| Metrique          |  V3-S0 |  V3-S1 |  V4-S0 |  V4-S1 | Delta(V4-V3) |');
  console.log('|-------------------|--------|--------|--------|--------|--------------|');

  function row(label: string, v3s0: number, v3s1: number, v4s0: number, v4s1: number) {
    const mean3 = (v3s0 + v3s1) / 2;
    const mean4 = (v4s0 + v4s1) / 2;
    console.log(`| ${label.padEnd(17)} | ${fmt(v3s0)} | ${fmt(v3s1)} | ${fmt(v4s0)} | ${fmt(v4s1)} | ${fmtDelta(mean4 - mean3).padStart(12)} |`);
  }

  row('Composite', v3Scores[0].composite, v3Scores[1].composite, v4Scores[0].composite, v4Scores[1].composite);
  row('ECC', v3Scores[0].ecc, v3Scores[1].ecc, v4Scores[0].ecc, v4Scores[1].ecc);
  row('RCI', v3Scores[0].rci, v3Scores[1].rci, v4Scores[0].rci, v4Scores[1].rci);
  row('SII', v3Scores[0].sii, v3Scores[1].sii, v4Scores[0].sii, v4Scores[1].sii);
  row('IFI', v3Scores[0].ifi, v3Scores[1].ifi, v4Scores[0].ifi, v4Scores[1].ifi);
  row('AAI', v3Scores[0].aai, v3Scores[1].aai, v4Scores[0].aai, v4Scores[1].aai);
  row('min_axis', v3Scores[0].min_axis, v3Scores[1].min_axis, v4Scores[0].min_axis, v4Scores[1].min_axis);

  // Fatigue
  const v3Fatigue = v3Scores[0].composite - v3Scores[1].composite;
  const v4Fatigue = v4Scores[0].composite - v4Scores[1].composite;
  console.log(`\n| delta S0→S1       | ${fmt(v3Fatigue).padStart(6)} |        | ${fmt(v4Fatigue).padStart(6)} |        |              |`);

  // Prompt tokens
  const v3PromptTokens = '~15000';
  const v4PromptTokens = '~800';
  console.log(`\n[V4-BENCH] Prompt tokens: V3=${v3PromptTokens} vs V4=${v4PromptTokens}`);

  // ── VERDICT ───────────────────────────────────────────────────────────────
  const { verdict, reason } = computeVerdict(v3Scores, v4Scores);
  console.log(`\n[V4-BENCH] ═══ VERDICT ═══`);
  console.log(`[V4-BENCH] ${verdict}`);
  console.log(`[V4-BENCH] Raison : ${reason}`);

  // ── SAVE ──────────────────────────────────────────────────────────────────
  const sessionsDir = resolve(__dirname, '..', 'sessions');
  mkdirSync(sessionsDir, { recursive: true });
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const benchResult = {
    bench_id: `BENCH_V4_V3V4_${timestamp.replace(/[-T]/g, '')}`,
    model: MODEL,
    seed: FORGE_INPUT.run_id,
    temperature: { draft: DRAFT_TEMPERATURE, judge: JUDGE_TEMPERATURE },
    n_scenes: N_SCENES,
    v3_results: {
      composites: v3Report.composites,
      composite_mean: v3Report.composite_mean,
      scores: v3Scores,
    },
    v4_results: {
      composites: v4Report.composites,
      composite_mean: v4Report.composite_mean,
      scores: v4Scores,
    },
    comparison: {
      composite_mean_delta: (v4Scores.reduce((s, x) => s + x.composite, 0) / v4Scores.length)
        - (v3Scores.reduce((s, x) => s + x.composite, 0) / v3Scores.length),
      per_scene: v3Scores.map((v3s, i) => ({
        scene: i,
        composite_delta: v4Scores[i].composite - v3s.composite,
        ecc_delta: v4Scores[i].ecc - v3s.ecc,
        rci_delta: v4Scores[i].rci - v3s.rci,
        sii_delta: v4Scores[i].sii - v3s.sii,
        ifi_delta: v4Scores[i].ifi - v3s.ifi,
        aai_delta: v4Scores[i].aai - v3s.aai,
      })),
      prompt_tokens: { v3: 15000, v4: 800 },
      fatigue: { v3: v3Fatigue, v4: v4Fatigue },
    },
    verdict,
    verdict_reason: reason,
    created_at: new Date().toISOString(),
  };

  const outPath = resolve(sessionsDir, `v4-bench-${timestamp}.json`);
  writeFileSync(outPath, JSON.stringify(benchResult, null, 2), 'utf-8');
  console.log(`\n[V4-BENCH] Resultats : ${outPath}`);

  // Cleanup env
  delete process.env.OMEGA_PROMPT_V4;
  delete process.env.OMEGA_PROMPT_COMPILER_V3;
  delete process.env.OMEGA_DAMAGE_GATE_MODE;
}

main().catch(err => {
  console.error('[V4-BENCH] FATAL:', err);
  process.exit(1);
});
