/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA — TEST INV-PROMPT-01
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Invariant contractuel : aucun prompt Scribe ne doit contenir de patterns
 * de gestion narrative système (IDs dettes, états personnages bruts, fils
 * narratifs bruts, langage backend).
 *
 * Source : OMEGA_DECISIONS_LOCK_v1.0 (Q6=A) + CONTRAT_OMEGA_SCRIBE_v1.0
 * Date : 2026-03-14
 * Standard : NASA-Grade L4 / DO-178C Level A
 *
 * INV-PROMPT-01 : aucun prompt Scribe ne contient DEBT[, openThreads,
 *                 charStates, ou patterns IDs système.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { buildSovereignPrompt } from '../../src/input/prompt-assembler-v2.js';
import { MINIMAL_FORGE_PACKET } from '../input/__fixtures__/minimal-forge-packet.js';
import { distillBrief } from '../../src/cde/distiller.js';
import { formatBriefText } from '../../src/cde/cde-pipeline.js';
import { propagateDelta } from '../../src/cde/scene-chain.js';
import type { CDEInput, StateDelta } from '../../src/cde/types.js';
import { sha256 } from '@omega/canon-kernel';

// ── PATTERNS INTERDITS ────────────────────────────────────────────────────────
// Ces patterns représentent des éléments de gestion narrative backend
// qui ne doivent JAMAIS figurer dans le prompt du Scribe.

const FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  {
    pattern: /DEBT\[/,
    description: 'IDs de dettes narratives (DEBT[id])',
  },
  {
    pattern: /open_threads/i,
    description: 'Référence aux fils narratifs ouverts (open_threads)',
  },
  {
    pattern: /charStates/i,
    description: 'Référence aux états de personnages (charStates)',
  },
  {
    pattern: /character_states.*=.*\{/,
    description: 'Assignation brute d\'états de personnages',
  },
  {
    pattern: /## Open Threads/,
    description: 'Section Open Threads dans le prompt',
  },
  {
    pattern: /openThreads/,
    description: 'Variable openThreads dans le prompt',
  },
  {
    pattern: /debt-\d+/i,
    description: 'ID de dette au format debt-NNN',
  },
  {
    pattern: /canon-\d+/i,
    description: 'ID de canon au format canon-NNN',
  },
  {
    pattern: /ETAT COURANT:/,
    description: 'Section "ETAT COURANT" (pattern e1-multi-prompt)',
  },
  {
    pattern: /Fils narratifs ouverts:/i,
    description: 'Injection de fils narratifs ouverts',
  },
  {
    pattern: /Etats personnages:/i,
    description: 'Injection d\'états de personnages',
  },
];

// ── PATTERNS INTERDITS — CDE BRIEF ────────────────────────────────────────────
// Patterns supplémentaires spécifiques au brief CDE (distillBrief + scene-chain)

const FORBIDDEN_BRIEF_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  ...FORBIDDEN_PATTERNS,
  { pattern: /auto-debt-s\d/, description: 'ID auto-généré scene-chain (auto-debt-sN)' },
  { pattern: /auto-fact-s\d/, description: 'ID auto-généré scene-chain (auto-fact-sN)' },
  { pattern: /DRIFT ALERT/,   description: 'Préfixe système DRIFT ALERT' },
  { pattern: /CANON:/,        description: 'Préfixe CANON: dans fallback' },
  { pattern: /char-\w+-\d+/,  description: 'ID personnage système (char-xxx-NNN)' },
];

// ── HELPER ────────────────────────────────────────────────────────────────────

function getFullPromptText(prompt: ReturnType<typeof buildSovereignPrompt>): string {
  return prompt.sections.map((s) => s.content).join('\n\n');
}

function makeCDEInputWithSystemIDs(): CDEInput {
  return {
    hot_elements: [
      { id: 'tension-001', type: 'tension', priority: 9, content: 'Le silence entre eux devient insoutenable' },
      { id: 'arc-001',     type: 'arc',     priority: 8, content: 'Elena cherche la verite sur son pere' },
      { id: 'debt-guard',  type: 'debt',    priority: 7, content: 'La promesse non tenue pese sur chaque geste' },
    ],
    canon_facts: [
      { id: 'canon-fact-042', fact: 'Elena est medecin a Lyon',     sealed_at: '2026-01-01T00:00:00Z' },
      { id: 'canon-fact-043', fact: 'Pierre enseigne la philosophie', sealed_at: '2026-01-01T00:00:00Z' },
    ],
    open_debts: [
      { id: 'debt-001', content: 'Elena a promis de reveler son secret',  opened_at: 'ch-3', resolved: false },
      { id: 'debt-002', content: 'Pierre doute de la fidelite de Elena', opened_at: 'ch-5', resolved: false },
    ],
    arc_states: [
      {
        character_id: 'char-elena-001',
        arc_phase:    'confrontation',
        current_need: 'comprendre pourquoi Pierre ment',
        current_mask: 'calme apparent',
        tension:      'rage contenue vs amour residuel',
      },
    ],
    scene_objective: 'Pierre confronte Elena dans leur cuisine',
  };
}

// ── TESTS ─────────────────────────────────────────────────────────────────────

describe('INV-PROMPT-01 — Aucun pattern système dans le prompt Scribe', () => {
  it('INV-PROMPT-01.1 : le prompt de base ne contient aucun pattern interdit', () => {
    const prompt = buildSovereignPrompt(MINIMAL_FORGE_PACKET);
    const fullText = getFullPromptText(prompt);

    for (const { pattern, description } of FORBIDDEN_PATTERNS) {
      expect(
        fullText,
        `VIOLATION INV-PROMPT-01 : Le prompt Scribe contient "${description}". ` +
        `Pattern : ${pattern}. ` +
        `Le Scribe doit recevoir uniquement du langage dramatique (CONTRAT_OMEGA_SCRIBE_v1.0).`
      ).not.toMatch(pattern);
    }
  });

  it('INV-PROMPT-01.2 : le prompt avec open_threads non vides ne les injecte pas', () => {
    // Créer un packet avec des open_threads pour vérifier qu'ils ne passent pas
    const packetWithThreads = {
      ...MINIMAL_FORGE_PACKET,
      continuity: {
        ...MINIMAL_FORGE_PACKET.continuity,
        open_threads: [
          'Pierre attend un signe de Marie',
          'La lettre non envoyée',
          'La promesse du chapitre 3',
        ],
      },
    };

    const prompt = buildSovereignPrompt(packetWithThreads);
    const fullText = getFullPromptText(prompt);

    // Les fils ne doivent PAS apparaître bruts dans le prompt
    expect(fullText).not.toMatch(/## Open Threads/);
    expect(fullText).not.toMatch(/open_threads/i);

    // Les fils narratifs crus ne doivent pas être injectés
    expect(fullText).not.toContain('Pierre attend un signe de Marie');
    expect(fullText).not.toContain('La lettre non envoyée');
  });

  it('INV-PROMPT-01.3 : le prompt ne contient aucun ID système de type DEBT ou canon', () => {
    const prompt = buildSovereignPrompt(MINIMAL_FORGE_PACKET);
    const fullText = getFullPromptText(prompt);

    expect(fullText).not.toMatch(/DEBT\[\w/);
    expect(fullText).not.toMatch(/canon-\d+/i);
    expect(fullText).not.toMatch(/debt-\d+/i);
  });

  it('INV-PROMPT-01.4 : sections du prompt conformes au contrat dramatique', () => {
    const prompt = buildSovereignPrompt(MINIMAL_FORGE_PACKET);

    // La section continuity doit exister (character states et previous scene sont OK)
    const continuitySection = prompt.sections.find((s) => s.section_id === 'continuity');
    expect(continuitySection).toBeDefined();

    // Mais elle ne doit pas contenir "Open Threads"
    if (continuitySection) {
      expect(continuitySection.content).not.toMatch(/## Open Threads/);
      expect(continuitySection.content).not.toMatch(/open_threads/i);
    }
  });

  it('INV-PROMPT-01.5 : le brief CDE ne contient aucun pattern interdit', () => {
    const testInput = makeCDEInputWithSystemIDs();
    const brief = distillBrief(testInput);
    const briefText = formatBriefText(brief);

    for (const { pattern, description } of FORBIDDEN_BRIEF_PATTERNS) {
      expect(
        briefText,
        `VIOLATION INV-PROMPT-01.5 : Le brief CDE contient "${description}". ` +
        `Pattern : ${pattern}. ` +
        `Le brief doit parler la langue de la scène (CONTRAT_OMEGA_SCRIBE_v1.0).`
      ).not.toMatch(pattern);
    }
  });

  it('INV-PROMPT-01.6 : le brief chaîné post-propagateDelta est propre', () => {
    const testInput = makeCDEInputWithSystemIDs();
    const delta: StateDelta = {
      new_facts:      ['Elena a decouvert la lettre cachee'],
      modified_facts: [],
      debts_opened:   [{ id: 'auto-debt-new', content: 'La lettre change tout' }],
      debts_resolved: [{ id: 'debt-001', reason: 'secret revele' }],
      arc_movements:  [],
      drift_flags:    ['Le lieu a change sans transition narrative'],
      prose_hash:     sha256('test-prose'),
    };

    const propagated = propagateDelta(testInput, delta, 1);
    const brief = distillBrief(propagated);
    const briefText = formatBriefText(brief);

    for (const { pattern, description } of FORBIDDEN_BRIEF_PATTERNS) {
      expect(
        briefText,
        `VIOLATION INV-PROMPT-01.6 : Le brief chaîné contient "${description}". ` +
        `Pattern : ${pattern}. ` +
        `Les IDs auto-générés et préfixes système ne doivent pas fuir.`
      ).not.toMatch(pattern);
    }
  });
});
