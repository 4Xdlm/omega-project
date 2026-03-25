/**
 * prompt-assembler-v4.ts — V4 Native Prompt Assembler
 * V4.3.0 — Asymmetric paragraphing + organic prose (Sprint 2)
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
 * V4.2: FORMAT FIRST + EXACTEMENT. ECC variance 9.4→0.8 pts. BUT:
 *   Sprint 1 telemetry proved CV_para=0.03 (paragraphs all same size)
 *   → RCI -6.4 pts. "EXACTEMENT 4" produces rigid symmetric blocks.
 *
 * V4.3 FIX (convergence 3/3: Claude + ChatGPT + Gemini):
 *   1. REMOVE "EXACTEMENT 4" — free the Scribe
 *   2. INJECT ASYMMETRY — Q1 short, Q2 ample, Q3 broken, Q4 spacious
 *   3. Semantic Slicer (CALC) guarantees quartile structure for scorer
 *   4. Polish disabled (proven NO-OP: delta 0.0 on all runs)
 *   Target: CV_para ≥ 0.40 (vs 0.03 in V4.2)
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import { sha256, canonicalize } from '@omega/canon-kernel';
import type { ForgePacket, SovereignPrompt, PromptSection, StyleProfile, ForgeBeat } from '../types.js';
import type { SymbolMap } from '../symbol/symbol-map-types.js';
import type { EmotionContract } from '../types.js';
import { selectExemplarDeterministic } from './golden-exemplars.js';
import { compileGlossary } from './omega-glossary.js';

export const PROMPT_ASSEMBLER_V4_VERSION = '4.3.0';

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

  blocks.push(compileRhythmAnchor());
  blocks.push(compileGlossary());
  blocks.push(compileInterdictions());
  blocks.push(compileRosettaConstraints(packet));
  blocks.push(compileFinalInstruction());

  const fullPrompt = blocks.join('\n\n');

  const tokenEstimate = Math.ceil(fullPrompt.length / 4);
  if (tokenEstimate > 1700) {
    console.warn(`[V4] WARNING: prompt ${tokenEstimate}t exceeds 1700t target`);
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
  // D-SYNTH-1 FIX: Removed "contemporaine" which biased toward modern/short style
  return `Tu es un écrivain de fiction ${register} ${lang}, maître de la narration par détails sensoriels, du sous-texte psychologique et de la subordination syntaxique.`;
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

// ── BLOC 3 — Trajectory V4.3 (~200 tokens) — ASYMÉTRIE ORGANIQUE ────────────
//
// V4.2 PROBLEM: "EXACTEMENT 4 paragraphes" → CV_para=0.03 → RCI -6.4 pts.
// The LLM produces 4 blocks of identical size when given rigid constraints.
// Sprint 1 telemetry PROVED this is the root cause.
//
// V4.3 FIX: ASYMMETRIC paragraph geometry prescribed in NATURAL language.
// The Semantic Slicer (CALC, engine.ts) guarantees 4 quartiles for the scorer.
// The prompt FREES the Scribe to write organic prose with varied paragraph sizes.
//
// Convergence 3/3: Claude + ChatGPT (2-pass plan) + Gemini (asymétrie bifurquée).
// ChatGPT-audit: "macro-structure fixe, micro-rythme libre".

function compileTrajectory(ec: EmotionContract): string {
  const lines: string[] = [
    'Écris cette scène en 4 paragraphes séparés par une ligne vide. Varie VIOLEMMENT la taille de tes paragraphes :',
    '— Paragraphe 1 : TRÈS COURT (2-3 phrases, incisif, coup de poing).',
    '— Paragraphe 2 : LONG ET AMPLE (développement sensoriel, phrases sinueuses).',
    '— Paragraphe 3 : COURT ET HACHÉ (rupture de rythme, phrases sèches).',
    '— Paragraphe 4 : AMPLE (fermeture respirée, vague finale).',
    '',
    'Arc émotionnel en 4 temps :',
  ];

  const quartileLabels = ['Paragraphe 1', 'Paragraphe 2', 'Paragraphe 3', 'Paragraphe 4'];

  for (let i = 0; i < 4 && i < ec.curve_quartiles.length; i++) {
    const q = ec.curve_quartiles[i];
    const physical = getPhysicalBehavior(q.dominant);

    lines.push(`${quartileLabels[i]} : ${q.narrative_instruction}. Émotion : ${q.dominant}. Corps : ${physical}.`);
  }

  // Tension slope
  const slope = ec.tension.slope_target;
  if (slope === 'ascending') {
    lines.push('La tension MONTE d\'un paragraphe au suivant.');
  } else if (slope === 'descending') {
    lines.push('La tension DÉCROÎT progressivement.');
  } else if (slope === 'arc') {
    lines.push('La tension MONTE jusqu\'au paragraphe 3 puis REDESCEND.');
  }

  // Rupture point if exists
  if (ec.rupture.exists) {
    const pct = Math.round(ec.rupture.position_pct * 100);
    lines.push(`Rupture émotionnelle à ~${pct}% — changement net de registre.`);
  }

  // Anti-monotony
  lines.push('Chaque paragraphe a sa propre couleur émotionnelle — jamais d\'uniformité.');

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

  // D-SYNTH-1 FIX: Always encourage long sentences + variation
  // Masters avg 28.8 words/sentence — never constrain below that
  const target = genome.rhythm.avg_sentence_length_target;
  if (target <= 12) {
    directives.push('Alterne phrases très courtes (frappes sèches) et périodes longues de 30+ mots.');
  } else {
    directives.push('Alterne phrases courtes (< 8 mots, frappes percutantes) et longues arches syntaxiques de 30-50 mots (subordination, incises, participiales). Au moins 10% de tes phrases doivent dépasser 40 mots.');
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

// ── BLOC 8b — Rhythm Anchor (~80 tokens) — ANCRE RYTHMIQUE ──────────────────
// Levier B: Guide le LLM vers le rythme des maîtres (Flaubert/Proust/Duras)
// Lore-coding pur, zéro chiffre prescriptif (L3)

const RHYTHM_ANCHOR = `ANCRE RYTHMIQUE — Le souffle de Bovary :
Ton rythme est celui de Flaubert dans Madame Bovary : des périodes
amples qui tiennent dans un souffle de lecture à voix haute,
ponctuées de verdicts nets — une phrase complète, pas un télégramme.
Le contraste vient de la variation organique, pas de l'excès.
Les phrases longues respirent sans s'égarer. Les phrases courtes
tombent comme des portes qui se ferment : brèves mais achevées.`;

function compileRhythmAnchor(): string {
  return RHYTHM_ANCHOR;
}

// ── BLOC 9 — Interdictions (~40 tokens) ─────────────────────────────────────

function compileInterdictions(): string {
  // D-SYNTH-1 FIX: Removed ban on temporal markers (soudain, alors, puis)
  // which are essential for f_temporal_anchor_rate and narration scoring.
  return `Interdits (3 règles) :
1. Ne nomme jamais une émotion directement (pas de "il était triste" ou "elle avait peur").
2. Pas de résumé d'action — montre les gestes, les corps, les sensations, pas les intentions.
3. Pas de lyrisme décoratif — chaque image doit servir l'histoire.`;
}

// ── BLOC 10 — Rosetta Mechanical Constraints (D-SYNTH-1) ────────────────────
// Validated on 450 tests in Phase S0. Only SOLIDE constraints injected.

function compileRosettaConstraints(packet: ForgePacket): string {
  const isFR = packet.language === 'fr';
  const lines = [
    'Contraintes mécaniques (calibrées sur 450 tests) :',
    '- Vocabulaire : au moins 70 mots uniques pour 100 mots consécutifs.',
    '- Contraste : une phrase sur trois < 8 mots, une sur trois > 25 mots.',
    '- Redondance : aucun bigramme ne doit apparaître plus de 2 fois.',
    '- Originalité : > 85% des bigrammes doivent être uniques.',
    '- Accroche : la première phrase contient une tension en moins de 15 mots.',
    '- Suspense : les 20 derniers mots laissent une question ouverte.',
    '- Sensoriel : au moins 6 mots sensoriels pour 100 mots.',
  ];
  if (isFR) {
    lines.push('');
    lines.push('Langue — FR natif :');
    lines.push('Écris directement en français natif. Pas de calques syntaxiques anglais.');
    lines.push('Utilise des subordonnées, des incises, des appositions. Cadence majeure française.');
  }
  return lines.join('\n');
}

// ── BLOC 11 — Final Instruction V4.3 (~30 tokens) ──────────────────────────
// V4.3: Organic directive. No "EXACTEMENT". Asymmetry reinforced.

function compileFinalInstruction(): string {
  return `Écris la scène en 4 paragraphes séparés par une ligne vide. Varie leurs tailles — alterne court et long. Commence par une sensation ou un geste.`;
}
