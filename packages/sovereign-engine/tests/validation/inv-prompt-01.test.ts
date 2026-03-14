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

// ── HELPER ────────────────────────────────────────────────────────────────────

function getFullPromptText(prompt: ReturnType<typeof buildSovereignPrompt>): string {
  return prompt.sections.map((s) => s.content).join('\n\n');
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
});
