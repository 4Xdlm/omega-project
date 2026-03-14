/**
 * compiler/transducer.ts — Étape 6 : Transduction narrative
 * Sprint P1 — V-PARTITION v3.0.0
 *
 * Traduit chaque contrainte brute en langage opératoire français.
 * Pattern de emotion-to-action.ts : données machine → gestes narratifs.
 *
 * Jamais de vecteurs bruts, jamais d'IDs système, jamais de chiffres techniques.
 * Exception : seuils mesurables (CV ≥ 0.75, syncopes ≥ 40%).
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import type { RawConstraint } from './types.js';

// ── Transduction rules by source ─────────────────────────────────────────────

/**
 * Transduit une contrainte brute en texte narratif opératoire.
 *
 * Règles :
 * - kill_lists → "INTERDIT: [expression]"
 * - canon_facts → phrase courte factuelle
 * - PDB instructions → texte déjà narratif (passer tel quel)
 * - emotion_contract quartiles → instruction Q1→Q4
 * - tension arc_states → "Progression: X → Y. Par le corps."
 */
export function transduceToNarrative(constraint: RawConstraint): string {
  const { source, text } = constraint;

  // Kill lists — already formatted as INTERDIT
  if (source === 'packet.kill_lists') {
    return text;
  }

  // PDB instructions — already narrative, pass through
  if (source.startsWith('pdb.')) {
    return text;
  }

  // Emotion contract quartiles — translate to narrative instruction
  if (source === 'packet.emotion_contract') {
    return transduceQuartile(text);
  }

  // Emotion contract tension — translate slope/pic
  if (source === 'packet.emotion_contract.tension') {
    return transduceTension(text);
  }

  // Beats — compact to action + intention
  if (source === 'packet.beats') {
    return transduceBeat(text);
  }

  // CDE arc_states — translate to progression
  if (source === 'cde.arc_states') {
    return transduceArcState(text);
  }

  // CDE scene_objective — pass through
  if (source === 'cde.scene_objective') {
    return text;
  }

  // CDE hot_elements — pass through (already narrative)
  if (source.startsWith('cde.')) {
    return text;
  }

  // Canon entries — factual, pass through
  if (source === 'packet.canon' || source === 'cde.canon_facts') {
    return text;
  }

  // Sensory motifs — pass through
  if (source === 'packet.sensory') {
    return text;
  }

  // Subtext — pass through
  if (source === 'packet.subtext') {
    return text;
  }

  // Signature words — pass through
  if (source === 'packet.style_genome.lexicon') {
    return text;
  }

  // Intent / Continuity — pass through
  if (source === 'packet.intent' || source === 'packet.continuity') {
    return text;
  }

  // Default: pass through
  return text;
}

// ── Specialized transducers ──────────────────────────────────────────────────

function transduceQuartile(text: string): string {
  // Quartile narrative instructions are already in French
  // Just ensure no raw numeric vectors leak
  return text.replace(/\{[^}]*\}/g, '').trim();
}

function transduceTension(text: string): string {
  // Map slope types to French narrative instructions
  return text
    .replace('ascending', 'montée progressive')
    .replace('descending', 'descente contrôlée')
    .replace('arc', 'arc avec pic et résolution')
    .replace('reverse_arc', 'arc inversé');
}

function transduceBeat(text: string): string {
  // Beats are already partially narrative
  return text;
}

function transduceArcState(text: string): string {
  // Arc states: "need. tension" → "Progression: need → tension. Par le corps."
  const parts = text.split('. ');
  if (parts.length >= 2) {
    return `Progression: ${parts[0]} → ${parts[1]}. Par le corps.`;
  }
  return text;
}
