/**
 * prompt-assembler-v4.ts — V4 Native Prompt Assembler
 * V4.2.0 — Stabilize paragraph compliance: FORMAT FIRST + EXACTEMENT + runtime guard
 *
 * Phase R (retro-engineering cognitif) proved:
 *   - LLM wants ~300 tokens, not 15k
 *   - Narrative fluide > structured hierarchical
 *   - 6-8 constraints max, not 20+
 *   - Exemplar + few rules > 17 sections
 *   - Kill-lists PRODUCE the defects they try to correct
 *
 * V4.0: 10 blocs narratifs ~800t. ECC collapsed (-14pts) — LLM wrote 1 block.
 * V4.1.1: Explicit quartile boundaries + FORCE 4 paragraphs. ECC +8.6pts.
 *         But "minimum 4" was too soft → LLM obeyed ~50% → variance 9.4pts.
 *
 * V4.2 FIX (convergence 3/3: Claude + ChatGPT + Gemini):
 *   1. Move FORMAT constraint to FIRST LINE of trajectory (primacy effect)
 *   2. Replace "minimum" with "EXACTEMENT" (hard contract, not suggestion)
 *   3. Sèche/impérative final instruction (ChatGPT recommendation)
 *   4. Runtime paragraph guard in engine.ts (retry if < 4 paragraphs)
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import { sha256, canonicalize } from '@omega/canon-kernel';
import type { ForgePacket, SovereignPrompt, PromptSection, StyleProfile, ForgeBeat } from '../types.js';
import type { SymbolMap } from '../symbol/symbol-map-types.js';
import type { EmotionContract } from '../types.js';
import { selectExemplarDeterministic } from './golden-exemplars.js';

export const PROMPT_ASSEMBLER_V4_VERSION = '4.2.0';

// ── Flag ─────────────────────────────────────────────────────────────────────

export function isV4Active(): boolean {
  return process.env.OMEGA_PROMPT_V4 === '1';
}

// ── Emotion → Physical Behavior Mapping ──────────────────────────────────────
// The tension_14d scorer uses SEMANTIC LLM analysis (SEMANTIC_CORTEX_ENABLED=true).
// We guide the LLM to produce PHYSICAL BEHAVIORS that trigger the right
// emotional recognition. The semantic analyzer understands physical behaviors
// as emotional states — "mâchoires serrées" → anger.

const EMOTION_PHYSICAL_MAP: Record<string, string> = {
  'anger': 'mâchoires serrées, gestes saccadés, voix basse et coupante',
  'fear': 'souffle court, regard fuyant, mains qui cherchent un appui',
  'sadness': 'épaules affaissées, regard dans le vide, gestes au ralenti',
  'joy': 'corps détendu, mouvements fluides, voix claire',
  'surprise': 'corps figé, yeux écarquillés, souffle coupé',
  'disgust': 'recul physique, visage détourné, geste de rejet',
  'anticipation': 'corps penché en avant, attention aiguisée, muscles tendus',
  'trust': 'posture ouverte, proximité physique, rythme calme',
  'tension': 'immobilité chargée, silence pesant, gestes retenus',
  'dread': 'froid dans la nuque, immobilité de proie, respiration suspendue',
  'despair': 'corps vidé, bras le long du corps, regard fixe sans cible',
  'contempt': 'menton relevé, distance calculée, sourire froid',
  'guilt': 'épaules rentrées, évitement du regard, mains qui se tordent',
  'shame': 'tête baissée, corps replié, voix inaudible',
};

function getPhysicalBehavior(emotion: string): string {
  return EMOTION_PHYSICAL_MAP[emotion.toLowerCase()] || 'corps en alerte, gestes mesurés';
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function buildSovereignPrompt_V4(
  packet: ForgePacket,
  symbolMap: SymbolMap,
): SovereignPrompt {
  const blocks: string[] = [];

  blocks.push(compilePersona(packet));
  blocks.push(compileContext(packet));
  blocks.push(compileTrajectory(packet.emotion_contract));
  blocks.push(compileBeats(packet.beats));
  blocks.push(compileDirectives(packet.style_genome));
  blocks.push(compileVoiceAnchor(packet));
  blocks.push(compileSymbols(symbolMap, packet));

  const exemplarBlock = compileExemplar(packet.packet_id);
  if (exemplarBlock) blocks.push(exemplarBlock);

  blocks.push(compileInterdictions());
  blocks.push(compileFinalInstruction());

  const fullPrompt = blocks.join('\n\n');

  const tokenEstimate = Math.ceil(fullPrompt.length / 4);
  if (tokenEstimate > 1500) {
    console.warn(`[V4] WARNING: prompt ${tokenEstimate}t exceeds 1500t target`);
  }

  const sections: PromptSection[] = [{
    section_id: 'v4_complete',
    title: 'PROMPT V4',
    content: fullPrompt,
    priority: 'critical',
  }];

  const total_length = fullPrompt.length;
  const prompt_hash = sha256(canonicalize({ version: PROMPT_ASSEMBLER_V4_VERSION, content: fullPrompt }));

  return {
    sections,
    total_length,
    prompt_hash,
  };
}

// ── BLOC 1 — Persona (~30 tokens) ───────────────────────────────────────────

function compilePersona(packet: ForgePacket): string {
  const register = packet.style_genome.tone.dominant_register;
  const lang = packet.language === 'fr' ? 'française' : 'English';
  return `Tu es un écrivain de fiction ${register} ${lang} contemporaine, maître de la narration par détails sensoriels et du sous-texte psychologique.`;
}

// ── BLOC 2 — Context (~100 tokens) ──────────────────────────────────────────

function compileContext(packet: ForgePacket): string {
  const intent = packet.intent;
  const cont = packet.continuity;
  const sub = packet.subtext;

  const pov = intent.pov;
  const tense = intent.tense;
  const sceneGoal = intent.scene_goal;
  const conflict = intent.conflict_type;

  const previousContext = cont.previous_scene_summary
    ? `Contexte : ${cont.previous_scene_summary}. `
    : '';

  const characters = cont.character_states
    .map(c => `${c.character_name} (${c.emotional_state.replace(/_/g, ' ')})`)
    .join(', ');

  const subtextLine = sub.layers.length > 0
    ? ` Sous-texte : ${sub.layers[0].statement}.`
    : '';

  return `${previousContext}${sceneGoal}. ${characters}. Conflit : ${conflict}.${subtextLine} Narration ${pov}, au ${tense}. ~${intent.target_word_count} mots.`;
}

// ── BLOC 3 — Trajectory V4.2 (~180 tokens) — LE CŒUR DU FIX ────────────────
//
// V4.0 PROBLEM: All 4 quartiles fused in 1 paragraph → LLM wrote uniform
// emotion → tension_14d scorer found monotony → penalty -20 + low similarity.
//
// V4.1 FIX: Explicit quartile boundaries + dominant emotion + physical behavior.
// V4.1.1 FIX: FORCE 4 PARAGRAPHS at end of block — but directive was BURIED
// after 7 lines of emotional content → LLM obeyed only ~50% of the time.
//
// V4.2 FIX: Move FORMAT constraint to FIRST LINE (primacy effect).
// Remove "minimum" (too soft). Use EXACTEMENT (hard contract).
// Convergence 3/3: Claude + ChatGPT + Gemini unanimous.
//
// The scorer uses SEMANTIC LLM analysis (SEMANTIC_CORTEX_ENABLED=true),
// so physical behaviors ARE understood as emotional states.

function compileTrajectory(ec: EmotionContract): string {
  const quartileLabels = ['Premier quart (0-25%)', 'Deuxième quart (25-50%)', 'Tournant (50-75%)', 'Fermeture (75-100%)'];

  // V4.2: FORMAT FIRST — primacy effect. The LLM reads this before emotional content.
  const lines: string[] = [
    'FORMAT OBLIGATOIRE : EXACTEMENT 4 paragraphes séparés par une ligne vide. Paragraphe 1 = Q1, 2 = Q2, 3 = Q3, 4 = Q4.',
    'Arc émotionnel en 4 temps :',
  ];

  for (let i = 0; i < 4 && i < ec.curve_quartiles.length; i++) {
    const q = ec.curve_quartiles[i];
    const physical = getPhysicalBehavior(q.dominant);

    lines.push(`${quartileLabels[i]} : ${q.narrative_instruction}. Émotion dominante : ${q.dominant}. Incarnation physique : ${physical}.`);
  }

  // Tension slope
  const slope = ec.tension.slope_target;
  if (slope === 'ascending') {
    lines.push('La tension MONTE d\'un quartile au suivant — chaque section est plus intense que la précédente.');
  } else if (slope === 'descending') {
    lines.push('La tension DÉCROÎT progressivement — l\'intensité baisse à chaque quartile.');
  } else if (slope === 'arc') {
    lines.push('La tension MONTE jusqu\'au tournant puis REDESCEND — structure en arc.');
  }

  // Rupture point if exists
  if (ec.rupture.exists) {
    const pct = Math.round(ec.rupture.position_pct * 100);
    lines.push(`Point de rupture émotionnelle à ~${pct}% du texte — marque un changement net de registre.`);
  }

  // Anti-monotony directive
  lines.push('Chaque paragraphe doit avoir une couleur émotionnelle DISTINCTE — évite l\'uniformité.');

  return lines.join('\n');
}

// ── BLOC 4 — Beats V4.1 (~130 tokens) ───────────────────────────────────────

function compileBeats(beats: readonly ForgeBeat[]): string {
  if (beats.length === 0) return '';

  const lines = beats.map((b, i) => {
    const pivotMark = b.pivot ? ' ★ PIVOT' : '';
    const subtextInfo = b.subtext_type ? ` [${b.subtext_type}]` : '';
    const sensory = b.sensory_tags.length > 0
      ? ` — Sens : ${b.sensory_tags.slice(0, 2).join(', ')}.`
      : '';
    return `${i + 1}. ${b.action} — ${b.emotion_instruction}${subtextInfo}${pivotMark}${sensory}`;
  });

  return `Points de passage narratifs :\n${lines.join('\n')}`;
}

// ── BLOC 5 — Directives (~120 tokens) ───────────────────────────────────────

function compileDirectives(genome: StyleProfile): string {
  const directives: string[] = [];

  directives.push('Ancre chaque émotion dans un détail physique précis (geste, objet, sensation corporelle).');

  const target = genome.rhythm.avg_sentence_length_target;
  if (target <= 12) {
    directives.push('Phrases courtes et sèches dominantes, syncopes fréquentes.');
  } else if (target <= 18) {
    directives.push('Alterne phrases courtes percutantes et périodes plus amples.');
  } else {
    directives.push('Phrases longues et sinueuses, rythme méditatif.');
  }

  directives.push(`Registre ${genome.tone.dominant_register}.`);
  directives.push('Privilégie le sous-texte : dis l\'essentiel par ce qui n\'est pas dit.');

  const density = genome.imagery.density_target_per_100_words;
  if (density >= 3) {
    directives.push('Dense en sensations : chaque paragraphe active au moins 2 sens.');
  }

  if (genome.imagery.recurrent_motifs.length > 0) {
    directives.push(`Motifs récurrents : ${genome.imagery.recurrent_motifs.join(', ')}.`);
  }

  directives.push('Varie le registre émotionnel entre les paragraphes — pas de ton uniforme.');

  return `Style :\n${directives.slice(0, 7).map(d => `- ${d}`).join('\n')}`;
}

// ── BLOC 6 — Voice Anchor (~25 tokens) ──────────────────────────────────────

function compileVoiceAnchor(packet: ForgePacket): string {
  const conflict = packet.intent.conflict_type;

  const anchorMap: Record<string, string> = {
    'relational': 'Écris comme quelqu\'un qui observe au microscope la désintégration d\'un lien.',
    'internal': 'Écris comme une conscience qui se regarde penser sans pouvoir s\'arrêter.',
    'societal': 'Écris comme un témoin lucide qui refuse les consolations faciles.',
    'existential': 'Écris comme quelqu\'un qui découvre que le sol sous ses pieds n\'a jamais existé.',
  };

  return `Ancre vocale : ${anchorMap[conflict] || 'Écris avec la précision d\'un anatomiste et la sensibilité d\'un poète.'}`;
}

// ── BLOC 7 — Symbols (~80 tokens) ──────────────────────────────────────────

function compileSymbols(symbolMap: SymbolMap, packet: ForgePacket): string {
  const hooks = symbolMap.quartiles
    .flatMap(q => [...q.signature_hooks])
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 8);

  const motifs = packet.style_genome.imagery.recurrent_motifs;
  const sigWords = packet.style_genome.lexicon.signature_words.slice(0, 6);

  const sensoryTags = packet.beats
    .flatMap(b => [...b.sensory_tags])
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 4);

  const parts: string[] = [];
  if (sigWords.length) parts.push(`Mots-palette : ${sigWords.join(', ')}.`);
  if (motifs.length) parts.push(`Motifs : ${motifs.join(', ')}.`);
  if (hooks.length) parts.push(`Accroches : ${hooks.slice(0, 4).join(', ')}.`);
  if (sensoryTags.length) parts.push(`Ancrage sensoriel : ${sensoryTags.join(', ')}.`);

  return parts.length > 0 ? `Palette :\n${parts.join('\n')}` : '';
}

// ── BLOC 8 — Exemplar (~150 tokens) ────────────────────────────────────────

function compileExemplar(packetId: string): string | null {
  const exemplar = selectExemplarDeterministic(packetId);
  if (!exemplar) return null;
  return `Exemple du niveau de qualité attendu :\n« ${exemplar.text} »`;
}

// ── BLOC 9 — Interdictions (~40 tokens) ─────────────────────────────────────

function compileInterdictions(): string {
  return `Interdits (3 règles) :
1. Ne nomme jamais une émotion directement (pas de "il était triste" ou "elle avait peur").
2. Pas de transitions mécaniques (soudain, alors, puis, ensuite, tout à coup).
3. Pas de lyrisme décoratif — chaque image doit servir l'histoire.`;
}

// ── BLOC 10 — Final Instruction V4.2 (~25 tokens) ──────────────────────────
// V4.2: Reinforcement of 4-paragraph contract. Sèche, impérative, pas de "minimum".
// Convergence 3/3: Claude + ChatGPT + Gemini.

function compileFinalInstruction(): string {
  return `Écris la scène en EXACTEMENT 4 paragraphes séparés par une ligne vide. Un quartile par paragraphe. Commence par une sensation ou un geste.`;
}
