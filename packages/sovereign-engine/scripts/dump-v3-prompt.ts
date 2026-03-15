/**
 * dump-v3-prompt.ts — Dump the full V3 prompt as received by the LLM
 * Phase R — Retro-Engineering Cognitif
 *
 * 0 API — assembles the prompt locally and saves to file.
 *
 * Usage:
 *   npx tsx scripts/dump-v3-prompt.ts
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assembleForgePacket, type ForgePacketInput } from '../src/input/forge-packet-assembler.js';
import { buildSovereignPrompt } from '../src/input/prompt-assembler-v2.js';
import { compilePartition } from '../src/compiler/prompt-compiler.js';
import { DEFAULT_COMPILER_CONFIG } from '../src/compiler/types.js';
import { LOT1_INSTRUCTIONS } from '../src/prose-directive/lot1-instructions.js';
import { LOT2_INSTRUCTIONS } from '../src/prose-directive/lot2-instructions.js';
import { LOT3_INSTRUCTIONS } from '../src/prose-directive/lot3-instructions.js';
import type { CDEInput } from '../src/cde/types.js';
import type { GenesisPlan, Scene } from '@omega/genesis-planner';
import type { StyleProfile, KillLists, ForgeContinuity } from '../src/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Scenario (same as bench scripts) ────────────────────────────────────────

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

const SCENE: Scene = {
  scene_id: 'retro-dump-scene', arc_id: 'arc-couple',
  objective: 'Pierre confronte Marie dans leur cuisine apres une longue journee',
  conflict: 'le silence explose en reproches voiles', conflict_type: 'relational',
  emotion_target: 'anger', emotion_intensity: 0.8,
  seeds_planted: ['Marie cache un document dans son sac'], seeds_bloomed: [],
  subtext: { character_thinks: 'Marie sait que Pierre sait', reader_knows: 'Pierre a trouve le message mais ne dit rien encore', tension_type: 'dramatic_irony', implied_emotion: 'dread' },
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
  plan_id: 'retro-dump-plan', plan_hash: 'retro-dump-hash', version: '1.0.0',
  intent_hash: 'i', canon_hash: 'c', constraints_hash: 'ct', genome_hash: 'g', emotion_hash: 'e',
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

// ── Main ────────────────────────────────────────────────────────────────────

function main(): void {
  process.env.OMEGA_PROMPT_COMPILER_V3 = '1';

  const forgeInput: ForgePacketInput = {
    plan: PLAN, scene: SCENE, style_profile: STYLE_PROFILE,
    kill_lists: KILL_LISTS, canon: [], continuity: CONTINUITY,
    run_id: 'retro-dump', language: 'fr',
  };

  const packet = assembleForgePacket(forgeInput);

  // Compile V3 partition
  const allInstructions = [...LOT1_INSTRUCTIONS, ...LOT2_INSTRUCTIONS, ...LOT3_INSTRUCTIONS];
  const partition = compilePartition(
    packet, CDE_INPUT,
    { ...DEFAULT_COMPILER_CONFIG, shape: packet.intent?.conflict_type ?? 'Confrontation' },
    allInstructions,
  );

  // Build prompt
  const prompt = buildSovereignPrompt(packet, undefined, undefined, partition);

  // Dump
  const lines: string[] = [];
  lines.push('═══════════════════════════════════════════════════════════════════');
  lines.push('OMEGA V3 PROMPT DUMP — Phase R Retro-Engineering');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Sections: ${prompt.sections.length}`);
  lines.push(`Total length (chars): ${prompt.total_length}`);
  lines.push(`Estimated tokens: ${Math.ceil(prompt.total_length / 4)}`);
  lines.push('═══════════════════════════════════════════════════════════════════');
  lines.push('');

  for (const section of prompt.sections) {
    lines.push(`──── SECTION: ${section.section_id} ────`);
    lines.push(section.content);
    lines.push('');
  }

  lines.push('═══════════════════════════════════════════════════════════════════');
  lines.push('FULL CONCATENATED PROMPT (as sent to LLM):');
  lines.push('═══════════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(prompt.sections.map(s => s.content).join('\n\n'));

  // V3 partition info
  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════════');
  lines.push('V3 PARTITION INFO:');
  lines.push(`  total_tokens: ${partition.total_tokens}`);
  lines.push(`  partition_hash: ${partition.partition_hash}`);
  lines.push(`  instrumentation.conflict_score: ${partition.instrumentation.conflict_score}`);
  lines.push(`  instrumentation.cognitive_load: ${partition.instrumentation.cognitive_load}`);
  lines.push(`  instrumentation.redundancy_score: ${partition.instrumentation.redundancy_score}`);
  lines.push(`  conflicts: ${partition.instrumentation.conflicts_detected.length}`);
  lines.push(`  sacrificed: ${partition.instrumentation.sacrificed_elements.length}`);
  lines.push('═══════════════════════════════════════════════════════════════════');

  const outDir = resolve(__dirname, '..', 'retro-engineering');
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, 'REF_prompt_v3_actuel.txt');
  writeFileSync(outPath, lines.join('\n'), 'utf-8');

  console.log(`[DUMP-V3] Prompt dumped to ${outPath}`);
  console.log(`[DUMP-V3] Sections: ${prompt.sections.length}`);
  console.log(`[DUMP-V3] Total chars: ${prompt.total_length}`);
  console.log(`[DUMP-V3] Estimated tokens: ${Math.ceil(prompt.total_length / 4)}`);

  delete process.env.OMEGA_PROMPT_COMPILER_V3;
}

main();
