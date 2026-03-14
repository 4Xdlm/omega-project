/**
 * pathological-scenes.ts — 3 scènes pathologiques pour crash tests compilateur
 * Sprint P0.5 — V-PARTITION v3.0.0
 *
 * SCÈNE 1 : Confrontation intime haute tension (isolée)
 * SCÈNE 2 : Contemplative avec lourd passif canon (isolée)
 * SCÈNE 3 : Mini-chaîne S0→S1 avec propagation (chaînée)
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import { describe, it, expect } from 'vitest';
import type { CDEInput, StateDelta } from '../../src/cde/types.js';
import { distillBrief, BRIEF_TOKEN_MAX } from '../../src/cde/distiller.js';
import { formatBriefText } from '../../src/cde/cde-pipeline.js';
import { propagateDelta } from '../../src/cde/scene-chain.js';

// ── FORBIDDEN PATTERNS (from INV-PROMPT-01) ─────────────────────────────────

const FORBIDDEN_BRIEF_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  { pattern: /DEBT\[/,                    description: 'IDs dettes (DEBT[id])' },
  { pattern: /open_threads/i,             description: 'open_threads' },
  { pattern: /charStates/i,               description: 'charStates' },
  { pattern: /character_states.*=.*\{/,   description: 'character_states brut' },
  { pattern: /## Open Threads/,           description: 'Section Open Threads' },
  { pattern: /openThreads/,               description: 'openThreads' },
  { pattern: /debt-\d+/i,                 description: 'debt-NNN' },
  { pattern: /canon-\d+/i,               description: 'canon-NNN' },
  { pattern: /ETAT COURANT:/,             description: 'ETAT COURANT' },
  { pattern: /Fils narratifs ouverts:/i,  description: 'Fils narratifs ouverts' },
  { pattern: /Etats personnages:/i,       description: 'Etats personnages' },
  { pattern: /auto-debt-s\d/,             description: 'auto-debt-sN' },
  { pattern: /auto-fact-s\d/,             description: 'auto-fact-sN' },
  { pattern: /DRIFT ALERT/,              description: 'DRIFT ALERT' },
  { pattern: /CANON:/,                    description: 'CANON:' },
  { pattern: /char-\w+-\d+/,              description: 'char-xxx-NNN' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SCÈNE 1 — Confrontation intime haute tension
// ═══════════════════════════════════════════════════════════════════════════════

export const PATHOLOGICAL_SCENE_1: CDEInput = {
  hot_elements: [
    { id: 'persona-marie',  type: 'persona', priority: 9,  content: 'Marie, 38 ans, medecin urgentiste, dissimule une trahison depuis six mois' },
    { id: 'arc-pierre',     type: 'arc',     priority: 8,  content: 'Pierre decouvre la trahison et hesite entre rage et pardon' },
    { id: 'tension-couple', type: 'tension', priority: 10, content: 'Le silence entre eux est devenu une arme — chaque mot pese' },
    { id: 'debt-promesse',  type: 'debt',    priority: 7,  content: 'Marie a jure de tout dire avant la fin du mois' },
    { id: 'canon-lieu',     type: 'canon',   priority: 7,  content: 'Cuisine de leur appartement lyonnais en janvier' },
  ],
  canon_facts: [
    { id: 'cf-marie', fact: 'Marie est medecin urgentiste a Lyon',          sealed_at: '2026-01-01T00:00:00Z' },
    { id: 'cf-pierre', fact: 'Pierre est professeur de philosophie',        sealed_at: '2026-01-01T00:00:00Z' },
    { id: 'cf-saison', fact: 'On est en janvier, il fait froid et humide',  sealed_at: '2026-01-01T00:00:00Z' },
  ],
  open_debts: [
    { id: 'd1', content: 'Marie a promis de reveler son secret',           opened_at: 'ch-3', resolved: false },
    { id: 'd2', content: 'Pierre doute de la fidelite de Marie',           opened_at: 'ch-5', resolved: false },
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
  scene_objective: 'Marie avoue sa trahison, Pierre doit decider s il pardonne',
};

// ═══════════════════════════════════════════════════════════════════════════════
// SCÈNE 2 — Contemplative avec lourd passif canon
// ═══════════════════════════════════════════════════════════════════════════════

export const PATHOLOGICAL_SCENE_2: CDEInput = {
  hot_elements: [
    { id: 'persona-elena', type: 'persona', priority: 8, content: 'Elena, architecte retraitee, porte le deuil de son mari depuis deux ans' },
    { id: 'canon-ville',   type: 'canon',   priority: 6, content: 'La ville de Lisbonne en automne, toits rouges et brume' },
    { id: 'canon-maison',  type: 'canon',   priority: 6, content: 'La maison bleue sur la colline ou elle a vecu trente ans' },
    { id: 'canon-lettre',  type: 'canon',   priority: 6, content: 'La lettre jamais envoyee dans le tiroir de la commode' },
    { id: 'tension-temps', type: 'tension', priority: 7, content: 'Le temps qui passe efface les details du visage de Marco' },
    { id: 'arc-elena',     type: 'arc',     priority: 8, content: 'Elena doit choisir entre rester dans le souvenir ou avancer' },
    { id: 'debt-photo',    type: 'debt',    priority: 5, content: 'La photo cachee dans le livre de poemes' },
    { id: 'canon-mer',     type: 'canon',   priority: 5, content: 'La mer visible depuis le toit quand le brouillard se leve' },
  ],
  canon_facts: [
    { id: 'cf-elena',  fact: 'Elena a 67 ans et vit seule a Lisbonne',           sealed_at: '2026-01-01T00:00:00Z' },
    { id: 'cf-marco',  fact: 'Marco est mort il y a deux ans d un cancer',        sealed_at: '2026-01-01T00:00:00Z' },
    { id: 'cf-maison', fact: 'La maison bleue est classee patrimoine historique',  sealed_at: '2026-01-01T00:00:00Z' },
    { id: 'cf-fille',  fact: 'Leur fille Clara vit a Berlin et appelle rarement', sealed_at: '2026-01-01T00:00:00Z' },
    { id: 'cf-metier', fact: 'Elena a concu le pont de Vasco da Gama en 1998',    sealed_at: '2026-01-01T00:00:00Z' },
  ],
  open_debts: [
    { id: 'd-old', content: 'Elena n a jamais dit a Marco qu elle savait pour sa maladie', opened_at: 'ch-1', resolved: false },
  ],
  arc_states: [
    {
      character_id: 'Elena',
      arc_phase:    'resolution',
      current_need: 'trouver la paix avec le passe',
      current_mask: 'serenite de facade',
      tension:      'deuil inacheve vs desir de vivre',
    },
  ],
  scene_objective: 'Elena contemple la ville depuis le toit, seule avec ses souvenirs',
};

// ═══════════════════════════════════════════════════════════════════════════════
// SCÈNE 3 — Mini-chaîne S0→S1 avec propagation
// ═══════════════════════════════════════════════════════════════════════════════

const CHAIN_INITIAL: CDEInput = {
  hot_elements: [
    { id: 'tension-meeting', type: 'tension', priority: 8, content: 'La reunion de famille tourne a la confrontation' },
    { id: 'arc-lucas',       type: 'arc',     priority: 7, content: 'Lucas cherche a imposer sa vision a la famille' },
    { id: 'debt-heritage',   type: 'debt',    priority: 7, content: 'Le testament du pere n a toujours pas ete lu' },
  ],
  canon_facts: [
    { id: 'cf-famille', fact: 'Les trois freres se retrouvent dans la maison familiale', sealed_at: '2026-01-01T00:00:00Z' },
    { id: 'cf-maison',  fact: 'La maison est en Bretagne, au bord de la falaise',        sealed_at: '2026-01-01T00:00:00Z' },
  ],
  open_debts: [
    { id: 'd-testament', content: 'Le testament cache un secret sur les origines de Lucas', opened_at: 'ch-2', resolved: false },
  ],
  arc_states: [
    {
      character_id: 'Lucas',
      arc_phase:    'confrontation',
      current_need: 'decouvrir la verite sur ses origines',
      current_mask: 'assurance agressive',
      tension:      'colere vs peur de la verite',
    },
  ],
  scene_objective: 'Les trois freres se disputent lors du diner de retrouvailles',
};

const CHAIN_DELTA: StateDelta = {
  new_facts:       ['Lucas a decouvert que le testament mentionne un quatrieme heritier'],
  modified_facts:  [],
  debts_opened:    [{ content: 'L identite du quatrieme heritier reste inconnue', evidence: 'testament lu partiellement' }],
  debts_resolved:  [{ id: 'd-testament', evidence: 'le testament a ete ouvert' }],
  arc_movements:   [{ character_id: 'Lucas', movement: 'de la colere vers le doute' }],
  drift_flags:     ['Le lieu de la scene a change implicitement de la salle a manger au bureau'],
  prose_hash:      'fake-hash-for-test',
};

export const PATHOLOGICAL_CHAIN = {
  initial: CHAIN_INITIAL,
  delta:   CHAIN_DELTA,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('P0.5 — Pathological Crash Suite', () => {

  // ── SCÈNE 1 ─────────────────────────────────────────────────────────────────

  describe('SCENE 1 — Confrontation haute tension', () => {
    it('distillBrief() ne crash pas', () => {
      const brief = distillBrief(PATHOLOGICAL_SCENE_1);
      expect(brief).toBeDefined();
      expect(brief.must_remain_true.length).toBeGreaterThan(0);
      expect(brief.in_tension.length).toBeGreaterThan(0);
      expect(brief.must_move.length).toBeGreaterThan(0);
      expect(brief.must_not_break.length).toBeGreaterThan(0);
    });

    it('brief ≤ 150 tokens', () => {
      const brief = distillBrief(PATHOLOGICAL_SCENE_1);
      expect(brief.token_estimate).toBeLessThanOrEqual(BRIEF_TOKEN_MAX);
      expect(brief.token_estimate).toBeGreaterThan(0);
    });

    it('brief respecte INV-PROMPT-01 (16 patterns interdits)', () => {
      const brief = distillBrief(PATHOLOGICAL_SCENE_1);
      const briefText = formatBriefText(brief);
      for (const { pattern, description } of FORBIDDEN_BRIEF_PATTERNS) {
        expect(briefText, `Brief contient "${description}"`).not.toMatch(pattern);
      }
    });
  });

  // ── SCÈNE 2 ─────────────────────────────────────────────────────────────────

  describe('SCENE 2 — Contemplative lourd canon', () => {
    it('distillBrief() ne crash pas', () => {
      const brief = distillBrief(PATHOLOGICAL_SCENE_2);
      expect(brief).toBeDefined();
      expect(brief.must_remain_true.length).toBeGreaterThan(0);
    });

    it('brief ≤ 150 tokens', () => {
      const brief = distillBrief(PATHOLOGICAL_SCENE_2);
      expect(brief.token_estimate).toBeLessThanOrEqual(BRIEF_TOKEN_MAX);
    });

    it('brief respecte INV-PROMPT-01 (16 patterns interdits)', () => {
      const brief = distillBrief(PATHOLOGICAL_SCENE_2);
      const briefText = formatBriefText(brief);
      for (const { pattern, description } of FORBIDDEN_BRIEF_PATTERNS) {
        expect(briefText, `Brief contient "${description}"`).not.toMatch(pattern);
      }
    });
  });

  // ── SCÈNE 3 — CHAÎNE ─────────────────────────────────────────────────────────

  describe('SCENE 3 — Chaîne S0→S1 avec propagation', () => {
    it('propagateDelta + distillBrief fonctionnent', () => {
      const propagated = propagateDelta(PATHOLOGICAL_CHAIN.initial, PATHOLOGICAL_CHAIN.delta, 1);
      const brief = distillBrief(propagated);
      expect(brief).toBeDefined();
      expect(brief.token_estimate).toBeGreaterThan(0);
    });

    it('brief scene 1 ≤ 150 tokens', () => {
      const propagated = propagateDelta(PATHOLOGICAL_CHAIN.initial, PATHOLOGICAL_CHAIN.delta, 1);
      const brief = distillBrief(propagated);
      expect(brief.token_estimate).toBeLessThanOrEqual(BRIEF_TOKEN_MAX);
    });

    it('brief scene 1 respecte INV-PROMPT-01 (16 patterns interdits)', () => {
      const propagated = propagateDelta(PATHOLOGICAL_CHAIN.initial, PATHOLOGICAL_CHAIN.delta, 1);
      const brief = distillBrief(propagated);
      const briefText = formatBriefText(brief);
      for (const { pattern, description } of FORBIDDEN_BRIEF_PATTERNS) {
        expect(briefText, `Brief chaîné contient "${description}"`).not.toMatch(pattern);
      }
    });
  });
});
