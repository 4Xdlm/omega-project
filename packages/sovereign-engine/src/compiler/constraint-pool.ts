/**
 * compiler/constraint-pool.ts — Étapes 1+2 : Collecte + Classification
 * Sprint P1 — V-PARTITION v3.0.0
 *
 * Collecte TOUTES les contraintes de toutes les sources et les classifie
 * en 3 niveaux hiérarchisés (Lois / Trajectoire / Décor).
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import type { ForgePacket } from '../types.js';
import type { CDEInput } from '../cde/types.js';
import type { PDBInstruction } from '../prose-directive/lot1-instructions.js';
import type { RawConstraint, ConstraintLevel } from './types.js';

// ── Classification keywords ──────────────────────────────────────────────────

const INTERDIT_KEYWORDS = [
  'interdit', 'jamais', 'bannir', 'banni', 'liste noire', 'blacklist',
  'forbidden', 'never', 'banned', 'ne pas', 'ne jamais', 'ordre interdit',
];

// ── ÉTAPE 1 — COLLECTE ───────────────────────────────────────────────────────

/**
 * Rassemble TOUTES les contraintes de toutes les sources.
 * Chaque source produit des RawConstraint avec un level pré-classifié.
 */
export function collectConstraints(
  packet: ForgePacket,
  cdeInput: CDEInput | null,
  activeInstructions: PDBInstruction[],
): RawConstraint[] {
  const pool: RawConstraint[] = [];

  // ── Depuis ForgePacket ──────────────────────────────────────────────────

  // emotion_contract quartiles → N2 (trajectoire)
  for (const q of packet.emotion_contract.curve_quartiles) {
    pool.push({
      id: `ec-${q.quartile}`,
      source: 'packet.emotion_contract',
      level: 2,
      priority: 8,
      text: q.narrative_instruction,
      target_axes: ['tension_14d', 'coherence_emotionnelle'],
    });
  }

  // tension targets → N2
  const tension = packet.emotion_contract.tension;
  pool.push({
    id: 'ec-tension-slope',
    source: 'packet.emotion_contract.tension',
    level: 2,
    priority: 8,
    text: `Pente de tension: ${tension.slope_target}. Pic a ${Math.round(tension.pic_position_pct * 100)}%.`,
    target_axes: ['tension_14d'],
  });

  // beats → N2
  for (const beat of packet.beats) {
    pool.push({
      id: `beat-${beat.beat_id}`,
      source: 'packet.beats',
      level: 2,
      priority: 7,
      text: `${beat.action}. ${beat.emotion_instruction}`,
      target_axes: ['tension_14d', 'necessite_m8'],
    });
  }

  // kill_lists → N1 (lois)
  const killEntries: string[] = [
    ...packet.kill_lists.banned_words,
    ...packet.kill_lists.banned_cliches,
    ...packet.kill_lists.banned_ai_patterns,
    ...packet.kill_lists.banned_filter_words,
  ];
  if (killEntries.length > 0) {
    // Compact: top 6 entries + count to fit N1 budget (≤60 tokens)
    const shown = killEntries.slice(0, 6);
    const remaining = killEntries.length - shown.length;
    const suffix = remaining > 0 ? ` (+${remaining})` : '';
    pool.push({
      id: 'kill-lists',
      source: 'packet.kill_lists',
      level: 1,
      priority: 10,
      text: `INTERDIT: ${shown.join(', ')}${suffix}`,
      target_axes: ['anti_cliche', 'rythme_musical'],
    });
  }

  // signature_words → N3 (décor)
  if (packet.style_genome.lexicon.signature_words.length > 0) {
    pool.push({
      id: 'signature-words',
      source: 'packet.style_genome.lexicon',
      level: 3,
      priority: 5,
      text: `Mots signature: ${packet.style_genome.lexicon.signature_words.join(', ')}`,
      target_axes: ['signature'],
    });
  }

  // canon entries → N3
  for (const entry of packet.canon) {
    pool.push({
      id: `canon-${entry.id}`,
      source: 'packet.canon',
      level: 3,
      priority: 5,
      text: entry.statement,
      target_axes: ['coherence_emotionnelle'],
    });
  }

  // intent scene_goal → N2
  pool.push({
    id: 'intent-scene-goal',
    source: 'packet.intent',
    level: 2,
    priority: 8,
    text: packet.intent.scene_goal,
    target_axes: ['tension_14d', 'necessite_m8'],
  });

  // continuity previous_scene_summary → N3
  if (packet.continuity.previous_scene_summary) {
    pool.push({
      id: 'continuity-summary',
      source: 'packet.continuity',
      level: 3,
      priority: 4,
      text: packet.continuity.previous_scene_summary,
      target_axes: ['coherence_emotionnelle'],
    });
  }

  // sensory targets → N2
  if (packet.sensory.recurrent_motifs.length > 0) {
    pool.push({
      id: 'sensory-motifs',
      source: 'packet.sensory',
      level: 2,
      priority: 6,
      text: `Ancres sensorielles: ${packet.sensory.recurrent_motifs.join(', ')}`,
      target_axes: ['densite_sensorielle'],
    });
  }

  // subtext → N2
  for (const layer of packet.subtext.layers) {
    pool.push({
      id: `subtext-${layer.layer_id}`,
      source: 'packet.subtext',
      level: 2,
      priority: 6,
      text: layer.statement,
      target_axes: ['tension_14d', 'interiorite'],
    });
  }

  // ── Depuis CDEInput (si non null) ──────────────────────────────────────

  if (cdeInput) {
    // hot_elements tension/arc → N2
    for (const el of cdeInput.hot_elements) {
      if (el.type === 'tension' || el.type === 'arc') {
        pool.push({
          id: `cde-hot-${el.id}`,
          source: 'cde.hot_elements',
          level: 2,
          priority: el.priority,
          text: el.content,
          target_axes: ['tension_14d'],
        });
      }
    }

    // canon_facts → N3
    for (const fact of cdeInput.canon_facts) {
      pool.push({
        id: `cde-canon-${fact.id}`,
        source: 'cde.canon_facts',
        level: 3,
        priority: 5,
        text: fact.fact,
        target_axes: ['coherence_emotionnelle'],
      });
    }

    // open_debts → N2 (tension narrative)
    for (const debt of cdeInput.open_debts) {
      if (!debt.resolved) {
        pool.push({
          id: `cde-debt-${debt.id}`,
          source: 'cde.open_debts',
          level: 2,
          priority: 7,
          text: debt.content,
          target_axes: ['tension_14d', 'necessite_m8'],
        });
      }
    }

    // arc_states → N2
    for (const arc of cdeInput.arc_states) {
      pool.push({
        id: `cde-arc-${arc.character_id}`,
        source: 'cde.arc_states',
        level: 2,
        priority: 7,
        text: `${arc.current_need}. ${arc.tension}`,
        target_axes: ['tension_14d', 'interiorite'],
      });
    }

    // scene_objective → N2
    pool.push({
      id: 'cde-objective',
      source: 'cde.scene_objective',
      level: 2,
      priority: 9,
      text: cdeInput.scene_objective,
      target_axes: ['tension_14d', 'necessite_m8'],
    });
  }

  // ── Depuis activeInstructions (PDB) ────────────────────────────────────

  for (const instr of activeInstructions) {
    const level = classifyInstruction(instr);
    pool.push({
      id: `pdb-${instr.id}`,
      source: `pdb.${instr.id}`,
      level,
      priority: level === 1 ? 10 : 7,
      text: instr.content,
      target_axes: [...instr.target_axes],
    });
  }

  return pool;
}

// ── ÉTAPE 2 — CLASSIFICATION ──────────────────────────────────────────────────

/**
 * Classifie une instruction PDB en niveau de contrainte.
 *
 * TOUTES les instructions PDB sont N2 (trajectoire/construction).
 * Même LOT1-03 (blacklist transitions) est une instruction de CRAFT, pas une pure interdiction.
 * Seul packet.kill_lists est N1 — c'est la source canonique des interdictions pures.
 */
function classifyInstruction(_instr: PDBInstruction): ConstraintLevel {
  return 2;
}

/**
 * Reclassifie une contrainte brute (utilitaire externe).
 * Basé sur le texte de la contrainte.
 */
export function classifyConstraint(raw: RawConstraint): ConstraintLevel {
  const textLower = raw.text.toLowerCase();
  for (const keyword of INTERDIT_KEYWORDS) {
    if (textLower.includes(keyword)) {
      return 1;
    }
  }
  // Trajectoire keywords
  if (/quartile|progression|pente|arc|tension|escalade/i.test(raw.text)) {
    return 2;
  }
  // Default to original level
  return raw.level;
}
