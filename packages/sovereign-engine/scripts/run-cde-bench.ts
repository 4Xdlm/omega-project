/**
 * run-cde-bench.ts — CDE Bench : 2 scenes chainees
 * Sprint V-PROTO (fix V-BENCH)
 *
 * Usage: npx tsx scripts/run-cde-bench.ts
 *
 * Standard: NASA-Grade L4 / DO-178C
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSceneChain, type SceneChainConfig } from '../src/cde/scene-chain.js';
import type { CDEInput } from '../src/cde/types.js';
import type { ForgePacketInput } from '../src/input/forge-packet-assembler.js';
import type { GenesisPlan, Scene } from '@omega/genesis-planner';
import type { StyleProfile, KillLists, ForgeContinuity } from '../src/types.js';
import { createAnthropicProvider } from '../src/runtime/anthropic-provider.js';
import { computeMinAxis } from '../src/utils/math-utils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Build realistic CDEInput ─────────────────────────────────────────────────

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

// ── Build complete Scene (GenesisPlan types) ─────────────────────────────────

const SCENE: Scene = {
  scene_id:         'cde-bench-scene',
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
      beat_id:              'b-01',
      action:               'Pierre entre dans la cuisine',
      intention:            'observer Marie sans se trahir',
      pivot:                false,
      tension_delta:        1,
      information_revealed: [],
      information_withheld: ['il a lu le message'],
    },
    {
      beat_id:              'b-02',
      action:               'Echange banal qui derape',
      intention:            'tester la reaction de Marie',
      pivot:                true,
      tension_delta:        1,
      information_revealed: ['Pierre sait quelque chose'],
      information_withheld: ['la nature exacte du secret'],
    },
    {
      beat_id:              'b-03',
      action:               'Silence lourd — Pierre sort',
      intention:            'signifier sa connaissance sans confronter',
      pivot:                false,
      tension_delta:        0,
      information_revealed: [],
      information_withheld: ['la decision de Pierre'],
    },
  ],
  target_word_count: 500,
  justification:    'climax acte 2 — point de non-retour',
};

// ── Build complete GenesisPlan ───────────────────────────────────────────────

const PLAN: GenesisPlan = {
  plan_id:           'cde-bench-plan',
  plan_hash:         'cde-bench-plan-hash',
  version:           '1.0.0',
  intent_hash:       'cde-bench-intent',
  canon_hash:        'cde-bench-canon',
  constraints_hash:  'cde-bench-constraints',
  genome_hash:       'cde-bench-genome',
  emotion_hash:      'cde-bench-emotion',
  arcs: [
    {
      arc_id:        'arc-couple',
      theme:         'la desintegration d un couple par le non-dit',
      progression:   'confrontation',
      justification: 'tension narrative principale',
      scenes:        [SCENE],
    },
  ],
  seed_registry: [
    {
      id:          'seed-secret',
      type:        'plot',
      description: 'Le secret de Marie',
      planted_in:  'ch-1',
      blooms_in:   'ch-8',
    },
  ],
  tension_curve:          [0.3, 0.5, 0.7, 0.8, 0.6, 0.9, 0.7],
  emotion_trajectory: [
    { position: 0.0, emotion: 'tension',  intensity: 0.5 },
    { position: 0.5, emotion: 'anger',    intensity: 0.8 },
    { position: 1.0, emotion: 'despair',  intensity: 0.7 },
  ],
  scene_count:            1,
  beat_count:             3,
  estimated_word_count:   500,
};

// ── Build StyleProfile ───────────────────────────────────────────────────────

const STYLE_PROFILE: StyleProfile = {
  version:  '1.0.0',
  universe: 'contemporain-litteraire',
  lexicon: {
    signature_words:     ['silence', 'froid', 'regard', 'main'],
    forbidden_words:     ['soudain', 'tout a coup', 'en effet'],
    abstraction_max_ratio: 0.15,
    concrete_min_ratio:    0.60,
  },
  rhythm: {
    avg_sentence_length_target:    14,
    gini_target:                   0.45,
    max_consecutive_similar:       3,
    min_syncopes_per_scene:        2,
    min_compressions_per_scene:    1,
  },
  tone: {
    dominant_register: 'litteraire',
    intensity_range:   [0.6, 0.9],
  },
  imagery: {
    recurrent_motifs:            ['froid', 'couteau', 'lumiere'],
    density_target_per_100_words: 3,
    banned_metaphors:            ['le coeur brise', 'les larmes coulaient'],
  },
};

// ── Build KillLists ──────────────────────────────────────────────────────────

const KILL_LISTS: KillLists = {
  banned_words:       ['soudain', 'tout a coup', 'en effet', 'vraiment'],
  banned_cliches:     ['le coeur brise', 'les larmes coulaient', 'il retint son souffle'],
  banned_ai_patterns: ['il ne put s empecher', 'une vague de', 'ses pensees se bousculaient'],
  banned_filter_words: ['semblait', 'paraissait', 'avait l air'],
};

// ── Build ForgeContinuity ─────────────────────────────────────────────────────

const CONTINUITY: ForgeContinuity = {
  previous_scene_summary: 'Pierre a decouvert un message suspect sur le telephone de Marie apres le diner',
  character_states: [
    {
      character_id:   'pierre',
      character_name: 'Pierre',
      emotional_state: 'controlled_anger',
      physical_state:  'tense',
      location:        'apartment_corridor',
    },
    {
      character_id:   'marie',
      character_name: 'Marie',
      emotional_state: 'anxious_guilt',
      physical_state:  'tired_from_shift',
      location:        'kitchen',
    },
  ],
  open_threads: [
    'La nature du secret de Marie',
    'Le document dans son sac',
    'La decision que Pierre doit prendre',
  ],
};

// ── Build ForgePacketInput ───────────────────────────────────────────────────

const FORGE_INPUT: ForgePacketInput = {
  plan:          PLAN,
  scene:         SCENE,
  style_profile: STYLE_PROFILE,
  kill_lists:    KILL_LISTS,
  canon:         [],
  continuity:    CONTINUITY,
  run_id:        `cde-bench-${Date.now()}`,
  language:      'fr',
};

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not set');
    process.exit(1);
  }

  const provider = createAnthropicProvider({
    apiKey,
    model:           'claude-sonnet-4-20250514',
    judgeStable:     false,
    draftTemperature: 1.0,
    judgeTemperature: 0.0,
    judgeTopP:       1.0,
    judgeMaxTokens:  200,
  });

  console.log('[CDE-BENCH] Starting 2-scene chain bench...\n');

  const config: SceneChainConfig = {
    n_scenes:      2,
    initial_input: CDE_INPUT,
    forge_input:   FORGE_INPUT,
  };

  const report = await runSceneChain(config, provider);

  // ── Display results ────────────────────────────────────────────────────────
  console.log('\n[CDE-BENCH] === RESULTS ===\n');
  for (const scene of report.scenes) {
    const composite = scene.forge_result.s_score?.composite ?? 0;
    const ma = scene.forge_result.macro_score?.macro_axes;
    const minAxis = computeMinAxis(ma);
    const sagaReady = (composite >= 92 && minAxis >= 85) ? '✅ OUI' : '❌ NON';

    console.log(`[CDE-BENCH] Scene ${scene.scene_index + 1}/${report.total_scenes}`);
    console.log(`  Brief injecte  : ${scene.brief.token_estimate} tokens`);
    console.log(`  Composite      : ${composite.toFixed(1)}`);
    if (ma) {
      console.log(`  ECC/RCI/SII    : ${ma.ecc?.score?.toFixed(1) ?? '?'} / ${ma.rci?.score?.toFixed(1) ?? '?'} / ${ma.sii?.score?.toFixed(1) ?? '?'}`);
      console.log(`  IFI/AAI        : ${ma.ifi?.score?.toFixed(1) ?? '?'} / ${ma.aai?.score?.toFixed(1) ?? '?'}`);
      console.log(`  min_axis       : ${minAxis.toFixed(1)}`);
    }
    console.log(`  SAGA_READY     : ${sagaReady}`);
    console.log(`  Verdict        : ${scene.forge_result.verdict}`);
    if (scene.delta) {
      console.log(`  Delta facts    : ${scene.delta.new_facts.length} nouveaux`);
      console.log(`  Delta debts    : ${scene.delta.debts_opened.length} ouvertes / ${scene.delta.debts_resolved.length} resolues`);
      console.log(`  Drift flags    : ${scene.delta.drift_flags.length}`);
    } else {
      console.log(`  Delta          : SOFT-FAIL — ${scene.delta_error ?? 'inconnu'}`);
    }
    console.log('');
  }

  console.log('[CDE-BENCH] === RAPPORT FINAL ===');
  console.log(`  Composites     : [${report.composites.map(c => c.toFixed(1)).join(', ')}]`);
  console.log(`  Moyenne        : ${report.composite_mean.toFixed(1)}`);
  console.log(`  Min            : ${report.composite_min.toFixed(1)}`);
  console.log(`  SAGA_READY     : ${report.saga_ready_count}/${report.total_scenes}`);

  // ── Write JSON ─────────────────────────────────────────────────────────────
  const sessionsDir = resolve(__dirname, '..', 'sessions');
  mkdirSync(sessionsDir, { recursive: true });
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const outPath = resolve(sessionsDir, `cde-bench-${timestamp}.json`);
  writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`  Resultats      : ${outPath}`);
}

main().catch(err => {
  console.error('[CDE-BENCH] FATAL:', err);
  process.exit(1);
});
