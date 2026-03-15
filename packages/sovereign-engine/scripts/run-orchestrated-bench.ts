/**
 * run-orchestrated-bench.ts — Bench comparatif V2 vs V3 vs ORCH
 * Sprint S3 — SCRIBE ORCHESTRÉ v3.1.0
 *
 * Protocole strict :
 *   1. Meme scenario exact (CDEInput + ForgePacketInput)
 *   2. Meme modele, meme seed, meme temperature
 *   3. Ordre fixe: V2 → V3 → ORCH (N_SCENES chacun)
 *   4. ORCH = 2 drafts (DRAMATURGE + MUSICIEN), CALC selection,
 *      puis scoring LLM complet du winner via judgeAestheticV3()
 *   5. Damage Gate en mode WARN
 *   6. Fail-fast : si ORCH VRAI composite < 80 → abort
 *   7. 4-column table: V2 | V3 | ORCH | Δ(ORCH-V2)
 *
 * Usage :
 *   $env:ANTHROPIC_API_KEY = "sk-ant-..."
 *   npx tsx scripts/run-orchestrated-bench.ts
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
import type { StyleProfile, KillLists, ForgeContinuity, ForgePacket } from '../src/types.js';
import { createAnthropicProvider } from '../src/runtime/anthropic-provider.js';
import { computeMinAxis } from '../src/utils/math-utils.js';
import type { MacroAxesScores } from '../src/oracle/macro-axes.js';
import { runOrchestrator, type OrchestratorInput } from '../src/orchestrator/scribe-orchestrator.js';
import { assembleForgePacket } from '../src/input/forge-packet-assembler.js';
import { judgeAestheticV3 } from '../src/oracle/aesthetic-oracle.js';
import { extractDelta } from '../src/cde/delta-extractor.js';
import { compressDelta, applyCompressedDelta } from '../src/cde/delta-compressor.js';
import { LOT1_INSTRUCTIONS } from '../src/prose-directive/lot1-instructions.js';
import { LOT2_INSTRUCTIONS } from '../src/prose-directive/lot2-instructions.js';
import { LOT3_INSTRUCTIONS } from '../src/prose-directive/lot3-instructions.js';
import type { MacroSScore } from '../src/oracle/s-score.js';
import type { SovereignProvider } from '../src/types.js';

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
  scene_id: 'orch-bench-scene', arc_id: 'arc-couple',
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
  plan_id: 'orch-bench-plan', plan_hash: 'orch-bench-plan-hash',
  version: '1.0.0', intent_hash: 'orch-bench-intent',
  canon_hash: 'orch-bench-canon', constraints_hash: 'orch-bench-constraints',
  genome_hash: 'orch-bench-genome', emotion_hash: 'orch-bench-emotion',
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
  run_id: `orch-bench-${Date.now()}`, language: 'fr',
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

function macroScoreToSceneScores(macroScore: MacroSScore): SceneScores {
  const ma = macroScore.macro_axes;
  return {
    composite: macroScore.composite,
    ecc: ma.ecc.score, rci: ma.rci.score,
    sii: ma.sii.score, ifi: ma.ifi.score,
    aai: ma.aai.score, min_axis: macroScore.min_axis,
  };
}

function fmt(n: number): string { return n.toFixed(1).padStart(6); }
function fmtDelta(d: number): string {
  return ((d >= 0 ? '+' : '') + d.toFixed(1)).padStart(9);
}

// ── ORCH Scene Chain ────────────────────────────────────────────────────────

interface OrchSceneResult {
  readonly sceneIndex: number;
  readonly selectedProfile: string;
  readonly selectionMethod: string;
  readonly margin: number;
  readonly calcDram: number;
  readonly calcMusic: number;
  readonly macroScore: MacroSScore;
  readonly prose: string;
}

/**
 * Run N_SCENES orchestrated scenes with delta propagation + real LLM scoring.
 */
async function runOrchChain(
  provider: SovereignProvider,
  allInstructions: readonly import('../src/prose-directive/lot1-instructions.js').PDBInstruction[],
): Promise<OrchSceneResult[]> {
  const results: OrchSceneResult[] = [];
  let currentCdeInput = CDE_INPUT;

  for (let i = 0; i < N_SCENES; i++) {
    const runId = `orch-bench-orch-S${i}-${Date.now()}`;
    const orchPacket = assembleForgePacket({ ...FORGE_INPUT, run_id: runId });

    console.log(`[ORCH-BENCH] ORCH Scene ${i} — generating 2 drafts...`);

    // 1. Run orchestrator (CALC selection)
    const orchInput: OrchestratorInput = {
      packet: orchPacket,
      cdeInput: currentCdeInput,
      allInstructions,
    };
    const orchResult = await runOrchestrator(orchInput, provider);

    console.log(`[ORCH-BENCH] ORCH Scene ${i} — selected: ${orchResult.selected_profile} (${orchResult.selection_method}, margin=${orchResult.margin.toFixed(1)})`);
    console.log(`[ORCH-BENCH]   CALC: DRAM=${orchResult.scores.dramaturge.composite.toFixed(1)} MUSIC=${orchResult.scores.musicien.composite.toFixed(1)}`);

    // 2. Score winner with REAL judgeAestheticV3() (full LLM scoring)
    console.log(`[ORCH-BENCH] ORCH Scene ${i} — scoring winner with judgeAestheticV3()...`);
    const macroScore = await judgeAestheticV3(
      orchPacket,
      orchResult.selected_prose,
      provider,
      null, // symbolMap — not available in bench context
    );
    console.log(`[ORCH-BENCH] ORCH Scene ${i} — REAL composite=${macroScore.composite.toFixed(1)} verdict=${macroScore.verdict}`);

    results.push({
      sceneIndex: i,
      selectedProfile: orchResult.selected_profile,
      selectionMethod: orchResult.selection_method,
      margin: orchResult.margin,
      calcDram: orchResult.scores.dramaturge.composite,
      calcMusic: orchResult.scores.musicien.composite,
      macroScore,
      prose: orchResult.selected_prose,
    });

    // 3. Fail-fast on REAL composite
    if (i === 0 && macroScore.composite < FAIL_FAST_MIN) {
      console.error(`[ORCH-BENCH] FAIL-FAST: ORCH scene 0 REAL composite ${macroScore.composite.toFixed(1)} < ${FAIL_FAST_MIN} — ABORT`);
      break;
    }

    // 4. Propagate delta for next scene (V3 compressed delta)
    if (i < N_SCENES - 1) {
      try {
        const delta = extractDelta(orchResult.selected_prose, {
          canon_facts: currentCdeInput.canon_facts,
          open_debts: currentCdeInput.open_debts,
          arc_states: currentCdeInput.arc_states,
        });
        const compressed = compressDelta(currentCdeInput, delta, i);
        currentCdeInput = applyCompressedDelta(currentCdeInput, compressed);
        console.log(`[ORCH-BENCH] ORCH Scene ${i} — delta propagated (${compressed.token_count}t)`);
      } catch (err) {
        console.warn(`[ORCH-BENCH] ORCH Scene ${i} — delta extraction failed: ${err instanceof Error ? err.message : err}`);
        // Continue with same cdeInput (no propagation)
      }
    }
  }

  return results;
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

  const allInstructions = [...LOT1_INSTRUCTIONS, ...LOT2_INSTRUCTIONS, ...LOT3_INSTRUCTIONS];
  const chainConfig: SceneChainConfig = { n_scenes: N_SCENES, initial_input: CDE_INPUT, forge_input: FORGE_INPUT };

  // ── RUN V2 ──────────────────────────────────────────────────────────────────
  console.log('[ORCH-BENCH] ═══ RUN V2 ═══\n');
  delete process.env.OMEGA_PROMPT_COMPILER_V3;
  const v2Report = await runSceneChain(chainConfig, provider);
  const v2Scores = v2Report.scenes.map((_, i) => extractSceneScores(v2Report, i));

  // ── RUN V3 ──────────────────────────────────────────────────────────────────
  console.log('\n[ORCH-BENCH] ═══ RUN V3 ═══\n');
  process.env.OMEGA_PROMPT_COMPILER_V3 = '1';
  const v3ForgeInput: ForgePacketInput = { ...FORGE_INPUT, run_id: `orch-bench-v3-${Date.now()}` };
  const v3Report = await runSceneChain({ ...chainConfig, forge_input: v3ForgeInput }, provider);
  const v3Scores = v3Report.scenes.map((_, i) => extractSceneScores(v3Report, i));

  // ── RUN ORCH (N_SCENES with delta propagation + real scoring) ─────────────
  console.log('\n[ORCH-BENCH] ═══ RUN ORCH ═══\n');
  process.env.OMEGA_PROMPT_COMPILER_V3 = '1';
  const orchResults = await runOrchChain(provider, allInstructions);
  const orchScores = orchResults.map(r => macroScoreToSceneScores(r.macroScore));

  // ── TABLEAU COMPARATIF ────────────────────────────────────────────────────
  console.log('\n[ORCH-BENCH] ═══ TABLEAU COMPARATIF ═══\n');
  console.log('| Metrique          |    V2 |    V3 |  ORCH |  Δ(O-V2) |');
  console.log('|-------------------|-------|-------|-------|----------|');

  function row(label: string, v2Val: number, v3Val: number, orchVal: number) {
    console.log(`| ${label.padEnd(17)} | ${fmt(v2Val)} | ${fmt(v3Val)} | ${fmt(orchVal)} | ${fmtDelta(orchVal - v2Val)} |`);
  }

  const sceneCount = Math.min(N_SCENES, orchScores.length);
  for (let i = 0; i < sceneCount; i++) {
    row(`Composite S${i}`, v2Scores[i].composite, v3Scores[i].composite, orchScores[i].composite);
  }

  const v2Mean = v2Scores.reduce((s, x) => s + x.composite, 0) / v2Scores.length;
  const v3Mean = v3Scores.reduce((s, x) => s + x.composite, 0) / v3Scores.length;
  const orchMean = orchScores.reduce((s, x) => s + x.composite, 0) / orchScores.length;
  row('Moyenne', v2Mean, v3Mean, orchMean);

  console.log('|-------------------|-------|-------|-------|----------|');

  for (let i = 0; i < sceneCount; i++) {
    row(`ECC S${i}`, v2Scores[i].ecc, v3Scores[i].ecc, orchScores[i].ecc);
    row(`RCI S${i}`, v2Scores[i].rci, v3Scores[i].rci, orchScores[i].rci);
    row(`SII S${i}`, v2Scores[i].sii, v3Scores[i].sii, orchScores[i].sii);
    row(`IFI S${i}`, v2Scores[i].ifi, v3Scores[i].ifi, orchScores[i].ifi);
    row(`AAI S${i}`, v2Scores[i].aai, v3Scores[i].aai, orchScores[i].aai);
    row(`min_axis S${i}`, v2Scores[i].min_axis, v3Scores[i].min_axis, orchScores[i].min_axis);
  }

  if (sceneCount >= 2) {
    const v2Fatigue = v2Scores[0].composite - v2Scores[1].composite;
    const v3Fatigue = v3Scores[0].composite - v3Scores[1].composite;
    const orchFatigue = orchScores[0].composite - orchScores[1].composite;
    row('delta S0->S1', v2Fatigue, v3Fatigue, orchFatigue);
  }

  // ── DIAGNOSTIC CALC (présélection) ────────────────────────────────────────
  console.log('\n[ORCH-BENCH] ═══ DIAGNOSTIC CALC (présélection) ═══');
  for (const r of orchResults) {
    console.log(`[ORCH-BENCH] Scene ${r.sceneIndex}: profile=${r.selectedProfile} method=${r.selectionMethod} margin=${r.margin.toFixed(1)}`);
    console.log(`[ORCH-BENCH]   DRAM calc_composite=${r.calcDram.toFixed(1)}  MUSIC calc_composite=${r.calcMusic.toFixed(1)}`);
    console.log(`[ORCH-BENCH]   REAL composite=${r.macroScore.composite.toFixed(1)}  verdict=${r.macroScore.verdict}`);
  }

  // ── SAVE ────────────────────────────────────────────────────────────────────
  const sessionsDir = resolve(__dirname, '..', 'sessions');
  mkdirSync(sessionsDir, { recursive: true });
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const benchResult = {
    bench_id: `BENCH_S3_ORCH_${timestamp.replace(/[-T]/g, '')}`,
    model: MODEL, n_scenes: N_SCENES,
    v2: { composites: v2Scores.map(s => s.composite), mean: v2Mean, scores: v2Scores },
    v3: { composites: v3Scores.map(s => s.composite), mean: v3Mean, scores: v3Scores },
    orch: {
      composites: orchScores.map(s => s.composite),
      mean: orchMean,
      scores: orchScores,
      scenes: orchResults.map(r => ({
        scene: r.sceneIndex,
        selected_profile: r.selectedProfile,
        selection_method: r.selectionMethod,
        margin: r.margin,
        calc_dram: r.calcDram,
        calc_music: r.calcMusic,
        real_composite: r.macroScore.composite,
        real_verdict: r.macroScore.verdict,
      })),
    },
    comparison: {
      orch_vs_v2_mean: orchMean - v2Mean,
      orch_vs_v3_mean: orchMean - v3Mean,
    },
    created_at: new Date().toISOString(),
  };

  const outPath = resolve(sessionsDir, `orch-bench-${timestamp}.json`);
  writeFileSync(outPath, JSON.stringify(benchResult, null, 2), 'utf-8');
  console.log(`\n[ORCH-BENCH] Resultats : ${outPath}`);

  // Cleanup
  delete process.env.OMEGA_PROMPT_COMPILER_V3;
}

main().catch(err => {
  console.error('[ORCH-BENCH] FATAL:', err);
  process.exit(1);
});
