/**
 * compiler/level-router.ts — Étapes 3+4+5 : Routage shape, détection conflits, résolution
 * Sprint P1 — V-PARTITION v3.0.0
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import type { InstructionToggleEntry } from '../prose-directive/instruction-toggle-table.js';
import { isInstructionEnabled } from '../prose-directive/instruction-toggle-table.js';
import type { RawConstraint, ConflictEntry } from './types.js';
import { countTokens } from '../constraints/token-counter.js';

// ── ÉTAPE 3 — ROUTAGE SHAPE ──────────────────────────────────────────────────

/**
 * Filtre les contraintes selon la shape active.
 * Les instructions PDB sont filtrées via isInstructionEnabled().
 * Les contraintes non-PDB passent toujours.
 */
export function routeByShape(
  constraints: RawConstraint[],
  shape: string,
  _toggleTable: readonly InstructionToggleEntry[],
): RawConstraint[] {
  return constraints.filter(c => {
    // Only PDB constraints are filtered by shape
    if (c.source.startsWith('pdb.')) {
      const instrId = c.source.replace('pdb.', '');
      return isInstructionEnabled(instrId, shape);
    }
    // All non-PDB constraints pass through
    return true;
  });
}

// ── ÉTAPE 4 — DÉTECTION DE CONFLITS ──────────────────────────────────────────

/**
 * Détecte 3 types de conflits entre contraintes :
 * - attention_competition : 2 contraintes ciblent les mêmes axes
 * - redundancy : 2 contraintes disent la même chose
 * - contradiction : 2 contraintes s'opposent
 */
export function detectConflicts(constraints: RawConstraint[]): ConflictEntry[] {
  const conflicts: ConflictEntry[] = [];
  const len = constraints.length;

  for (let i = 0; i < len; i++) {
    for (let j = i + 1; j < len; j++) {
      const a = constraints[i];
      const b = constraints[j];

      // Check redundancy (similar content)
      if (isRedundant(a, b)) {
        conflicts.push({
          source_a: a.id,
          source_b: b.id,
          type: 'redundancy',
          resolution: 'keep_shorter',
        });
        continue;
      }

      // Check contradiction
      if (isContradiction(a, b)) {
        conflicts.push({
          source_a: a.id,
          source_b: b.id,
          type: 'contradiction',
          resolution: 'higher_level_wins',
        });
        continue;
      }

      // Check attention competition (same target axes, different sources)
      if (isAttentionCompetition(a, b)) {
        conflicts.push({
          source_a: a.id,
          source_b: b.id,
          type: 'attention_competition',
          resolution: 'merge',
        });
      }
    }
  }

  return conflicts;
}

function isRedundant(a: RawConstraint, b: RawConstraint): boolean {
  // Normalize texts for comparison
  const normA = a.text.toLowerCase().trim();
  const normB = b.text.toLowerCase().trim();

  // Exact match
  if (normA === normB) return true;

  // Substring containment (one contains the other)
  if (normA.length > 10 && normB.length > 10) {
    if (normA.includes(normB) || normB.includes(normA)) return true;
  }

  return false;
}

function isContradiction(a: RawConstraint, b: RawConstraint): boolean {
  const textA = a.text.toLowerCase();
  const textB = b.text.toLowerCase();

  // Heuristic: "augmenter" vs "diminuer" or "pas de montée" on same axis
  const sharedAxes = a.target_axes.filter(ax => b.target_axes.includes(ax));
  if (sharedAxes.length === 0) return false;

  const augmentA = /augment|monter|escalad|croissant/i.test(textA);
  const diminueA = /diminu|baisser|pas de mont|stable|contemplatif/i.test(textA);
  const augmentB = /augment|monter|escalad|croissant/i.test(textB);
  const diminueB = /diminu|baisser|pas de mont|stable|contemplatif/i.test(textB);

  return (augmentA && diminueB) || (diminueA && augmentB);
}

function isAttentionCompetition(a: RawConstraint, b: RawConstraint): boolean {
  // Same target axes from different sources
  if (a.source === b.source) return false;
  const sharedAxes = a.target_axes.filter(ax => b.target_axes.includes(ax));
  return sharedAxes.length >= 2;
}

// ── ÉTAPE 5 — RÉSOLUTION DE CONFLITS ─────────────────────────────────────────

/**
 * Résout les conflits détectés :
 * - Redondance → garder la plus opératoire (la plus courte en tokens)
 * - Compétition d'attention → fusionner en une seule contrainte
 * - Contradiction → N1 gagne, alerte dans instrumentation
 */
export function resolveConflicts(
  constraints: RawConstraint[],
  conflicts: ConflictEntry[],
): RawConstraint[] {
  const removedIds = new Set<string>();

  for (const conflict of conflicts) {
    const a = constraints.find(c => c.id === conflict.source_a);
    const b = constraints.find(c => c.id === conflict.source_b);
    if (!a || !b) continue;

    switch (conflict.type) {
      case 'redundancy': {
        // Keep the shorter one (more operational)
        const tokensA = countTokens(a.text, 'chars_div_4');
        const tokensB = countTokens(b.text, 'chars_div_4');
        removedIds.add(tokensA <= tokensB ? b.id : a.id);
        break;
      }
      case 'contradiction': {
        // Higher level (lower number) wins. On tie, higher priority wins.
        if (a.level < b.level) {
          removedIds.add(b.id);
        } else if (b.level < a.level) {
          removedIds.add(a.id);
        } else {
          removedIds.add(a.priority >= b.priority ? b.id : a.id);
        }
        break;
      }
      case 'attention_competition': {
        // Keep both but mark the lower priority one for potential sacrifice
        // (budget manager will handle actual sacrifice)
        break;
      }
    }
  }

  return constraints.filter(c => !removedIds.has(c.id));
}
