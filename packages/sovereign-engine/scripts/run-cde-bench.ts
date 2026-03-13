/**
 * run-cde-bench.ts — CDE Bench : 2 scenes chainees
 * Sprint V-PROTO
 *
 * Usage: npx tsx scripts/run-cde-bench.ts
 *
 * 1. Construit un CDEInput realiste (personnage + tension + dette)
 * 2. Construit un ForgePacketInput minimal
 * 3. Lance runSceneChain({ n_scenes: 2, ... }) avec le provider LLM reel
 * 4. Affiche le rapport : composites, SAGA_READY count, delta par scene
 * 5. Ecrit un fichier JSON de resultats dans sessions/
 *
 * Standard: NASA-Grade L4 / DO-178C
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { runSceneChain, type SceneChainConfig } from '../src/cde/scene-chain.js';
import type { CDEInput } from '../src/cde/types.js';
import type { ForgePacketInput } from '../src/input/forge-packet-assembler.js';
import { createAnthropicProvider } from '../src/runtime/anthropic-provider.js';

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
    { id: 'debt-01', content: 'Marie a promis de reveler son secret',   opened_at: 'ch-3',  resolved: false },
    { id: 'debt-02', content: 'Pierre doute de la fidelite de Marie',  opened_at: 'ch-5',  resolved: false },
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

// ── Build ForgePacketInput ───────────────────────────────────────────────────

const FORGE_INPUT: ForgePacketInput = {
  plan: {
    arcs: [{
      arc_id: 'arc-couple',
      theme: 'la desintegration d un couple par le non-dit',
      progression: 'confrontation',
      scenes: [],
      justification: 'tension narrative',
    }],
    intent_hash: 'cde-bench-001',
  } as never,
  scene: {
    scene_id: 'cde-bench-scene',
    arc_id: 'arc-couple',
    objective: 'Pierre confronte Marie dans leur cuisine apres une longue journee',
    conflict: 'le silence explose en reproches voiles',
    conflict_type: 'interpersonal',
    emotion_target: 'anger_suppressed',
    emotion_intensity: 0.8,
    seeds_planted: ['Marie cache un document dans son sac'],
    seeds_bloomed: [],
    subtext: { hidden_agenda: 'Marie sait que Pierre sait', surface_action: 'preparation du diner' },
    sensory_anchor: 'bruit du couteau sur la planche',
    constraints: ['Pas de violence physique', 'Pas de resolution — scene ouverte'],
    beats: [
      { action: 'Pierre entre dans la cuisine', emotion: 'tension', intensity: 0.6 },
      { action: 'Echange banal qui derape', emotion: 'anger', intensity: 0.8 },
      { action: 'Silence lourd — Pierre sort', emotion: 'despair', intensity: 0.7 },
    ],
    target_word_count: 500,
    justification: 'climax acte 2',
  } as never,
  style_profile: {
    shape: 'LINEAR',
    register: 'litteraire',
    rhythm: 'moderate',
  } as never,
  kill_lists: {
    words: ['soudain', 'tout a coup', 'en effet'],
    patterns: [],
  } as never,
  canon: [],
  continuity: {
    previous_scene_summary: 'Pierre a decouvert un message suspect sur le telephone de Marie',
    world_state: {},
  } as never,
  run_id: `cde-bench-${Date.now()}`,
  language: 'fr',
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
    modelId: 'claude-sonnet-4-20250514',
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
    const sagaReady = composite >= 92 ? 'oui' : 'non';
    console.log(`[CDE-BENCH] Scene ${scene.scene_index}/${report.total_scenes}`);
    console.log(`  Brief injected : ${scene.brief.token_estimate} tokens`);
    console.log(`  Composite      : ${composite.toFixed(1)}`);
    console.log(`  SAGA_READY     : ${sagaReady}`);
    if (scene.delta) {
      console.log(`  Delta facts    : ${scene.delta.new_facts.length} new`);
      console.log(`  Delta debts    : ${scene.delta.debts_opened.length} opened / ${scene.delta.debts_resolved.length} resolved`);
      console.log(`  Drift flags    : ${scene.delta.drift_flags.length}`);
    } else {
      console.log(`  Delta          : ERROR — ${scene.delta_error}`);
    }
    console.log('');
  }

  console.log('[CDE-BENCH] Rapport final');
  console.log(`  Composites     : [${report.composites.map(c => c.toFixed(1)).join(', ')}]`);
  console.log(`  Moyenne        : ${report.composite_mean.toFixed(1)}`);
  console.log(`  Min            : ${report.composite_min.toFixed(1)}`);
  console.log(`  SAGA_READY     : ${report.saga_ready_count}/${report.total_scenes}`);

  // ── Write JSON ─────────────────────────────────────────────────────────────
  const sessionsDir = resolve(import.meta.dirname ?? '.', '..', 'sessions');
  mkdirSync(sessionsDir, { recursive: true });
  const outPath = resolve(sessionsDir, `cde-bench-${new Date().toISOString().slice(0, 10)}.json`);
  writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`  Results        : ${outPath}`);
}

main().catch(err => {
  console.error('[CDE-BENCH] FATAL:', err);
  process.exit(1);
});
