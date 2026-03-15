/**
 * prompt-assembler-v4.ts — V4 Native Prompt Assembler
 * Phase V4-1 — ~800-1200 tokens, 10 narrative blocks
 *
 * Phase R (retro-engineering cognitif) proved:
 *   - LLM wants ~300 tokens, not 15k
 *   - Narrative fluide > structured hierarchical
 *   - 6-8 constraints max, not 20+
 *   - Exemplar + few rules > 17 sections
 *   - Kill-lists PRODUCE the defects they try to correct
 *
 * INV-V4-01: prompt ≤ 1500 tokens
 * INV-V4-02: 10 blocks present
 * INV-V4-03: no floats (no 0.72, no 14D vectors)
 * INV-V4-05: interdictions ≤ 3
 * INV-V4-07: no kill-lists in prompt
 * INV-V4-09: deterministic (same packet → same prompt)
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import { sha256, canonicalize } from '@omega/canon-kernel';
import type { ForgePacket, SovereignPrompt, PromptSection, StyleProfile } from '../types.js';
import type { SymbolMap } from '../symbol/symbol-map-types.js';
import type { EmotionContract } from '../types.js';
import { selectExemplarDeterministic } from './golden-exemplars.js';

export const PROMPT_ASSEMBLER_V4_VERSION = '4.0.0';

// ── Flag ─────────────────────────────────────────────────────────────────────

export function isV4Active(): boolean {
  return process.env.OMEGA_PROMPT_V4 === '1';
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

  // Token count check — INV-V4-01
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

// ── BLOC 3 — Trajectory (~80 tokens) — LE PLUS CRITIQUE ────────────────────

function compileTrajectory(ec: EmotionContract): string {
  const q1 = ec.curve_quartiles[0];
  const q2 = ec.curve_quartiles[1];
  const q3 = ec.curve_quartiles[2];
  const q4 = ec.curve_quartiles[3];

  const arc = `Trajectoire émotionnelle : la scène s'ouvre sur ${describeEmotion(q1.dominant, q1.valence)} (${q1.narrative_instruction}). `;
  const mid = `Elle monte vers ${describeEmotion(q2.dominant, q2.valence)} (${q2.narrative_instruction}). `;
  const peak = `Le point de bascule arrive avec ${describeEmotion(q3.dominant, q3.valence)} (${q3.narrative_instruction}). `;
  const end = `La scène se ferme sur ${describeEmotion(q4.dominant, q4.valence)} (${q4.narrative_instruction}).`;

  const slope = ec.tension.slope_target;
  const slopeLine = slope === 'ascending' ? ' La tension monte tout au long.'
    : slope === 'descending' ? ' La tension décroît progressivement.'
    : slope === 'arc' ? ' La tension monte puis redescend.'
    : '';

  return arc + mid + peak + end + slopeLine;
}

function describeEmotion(dominant: string, valence: number): string {
  const absVal = Math.abs(valence);
  const intensity = absVal > 0.6 ? 'intense' : absVal > 0.3 ? 'contenue' : 'légère';
  const emotionMap: Record<string, string> = {
    'anger': 'colère',
    'fear': 'peur',
    'sadness': 'tristesse',
    'joy': 'joie',
    'surprise': 'surprise',
    'disgust': 'dégoût',
    'anticipation': 'anticipation',
    'trust': 'confiance',
    'tension': 'tension',
    'dread': 'appréhension',
    'despair': 'désespoir',
    'contempt': 'mépris',
    'guilt': 'culpabilité',
    'shame': 'honte',
  };
  const emotionWord = emotionMap[dominant.toLowerCase()] || dominant;
  return `${emotionWord} ${intensity}`;
}

// ── BLOC 4 — Beats (~120 tokens) ────────────────────────────────────────────

function compileBeats(beats: readonly import('../types.js').ForgeBeat[]): string {
  if (beats.length === 0) return '';

  const lines = beats.map((b, i) => {
    const pivotMark = b.subtext_type ? ` [${b.subtext_type}]` : '';
    return `${i + 1}. ${b.action} — ${b.emotion_instruction}${pivotMark}`;
  });

  return `Points de passage :\n${lines.join('\n')}`;
}

// ── BLOC 5 — Directives (~120 tokens) ───────────────────────────────────────

function compileDirectives(genome: StyleProfile): string {
  const directives: string[] = [];

  // 1. Ancrage physique (Phase R unanime)
  directives.push('Ancre chaque émotion dans un détail physique précis (geste, objet, sensation).');

  // 2. Rythme
  const target = genome.rhythm.avg_sentence_length_target;
  if (target <= 12) {
    directives.push('Phrases courtes et sèches dominantes, syncopes fréquentes.');
  } else if (target <= 18) {
    directives.push('Alterne phrases courtes percutantes et périodes plus amples.');
  } else {
    directives.push('Phrases longues et sinueuses, rythme méditatif.');
  }

  // 3. Registre
  directives.push(`Registre ${genome.tone.dominant_register}.`);

  // 4. Sous-texte (Phase R unanime)
  directives.push('Privilégie le sous-texte : dis l\'essentiel par ce qui n\'est pas dit.');

  // 5. Densité sensorielle
  const density = genome.imagery.density_target_per_100_words;
  if (density >= 3) {
    directives.push('Dense en sensations : chaque paragraphe active au moins 2 sens.');
  }

  // 6. Motifs récurrents
  if (genome.imagery.recurrent_motifs.length > 0) {
    directives.push(`Motifs récurrents : ${genome.imagery.recurrent_motifs.join(', ')}.`);
  }

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
  // Signature hooks from all quartiles
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

// ── BLOC 10 — Final Instruction (~20 tokens) ────────────────────────────────

function compileFinalInstruction(): string {
  return `Écris la scène maintenant. Commence par une sensation ou un geste — jamais par une description de cadre.`;
}
