/**
 * compiler/budget-manager.ts — Étape 7 : Budgétisation + Sacrifice
 * Sprint P1 — V-PARTITION v3.0.0
 *
 * Règles :
 * - N1 INCOMPRESSIBLE. Si dépasse budget_l1 → throw FAIL-CLOSED.
 * - N2 : si dépasse, trier par priorité DESC et tronquer les moins prioritaires.
 * - N3 : si dépasse, sacrifier les éléments les moins prioritaires. Si tout dépasse → vider.
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import type { RawConstraint, CompilerConfig, SacrificeEntry } from './types.js';
import { countTokens } from '../constraints/token-counter.js';
import { transduceToNarrative } from './transducer.js';

export interface BudgetResult {
  readonly l1: string;
  readonly l2: string;
  readonly l3: string;
  readonly sacrificed: SacrificeEntry[];
}

/**
 * Assemble les contraintes par niveau avec budget contrôlé.
 *
 * @throws Error si N1 dépasse budget_l1 (FAIL-CLOSED)
 */
export function budgetPartition(
  l1_constraints: RawConstraint[],
  l2_constraints: RawConstraint[],
  l3_constraints: RawConstraint[],
  config: CompilerConfig,
): BudgetResult {
  const tokenizerId = config.tokenizer_id;
  const sacrificed: SacrificeEntry[] = [];

  // ── N1 — INCOMPRESSIBLE ──────────────────────────────────────────────────

  const l1Texts = l1_constraints
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
    .map(c => transduceToNarrative(c));
  const l1 = l1Texts.join('\n');
  const l1Tokens = countTokens(l1, tokenizerId);

  if (l1Tokens > config.budget_l1) {
    throw new Error(
      `COMPILE FAIL: N1 laws exceed budget (${l1Tokens} > ${config.budget_l1} tokens). ` +
      `N1 is INCOMPRESSIBLE — reduce kill list or PDB interdictions.`
    );
  }

  // ── N2 — COMPRESSIBLE (trier par priorité, tronquer si besoin) ──────────

  const l2Sorted = [...l2_constraints].sort(
    (a, b) => b.priority - a.priority || a.id.localeCompare(b.id),
  );
  const l2Included: string[] = [];
  let l2Budget = config.budget_l2;

  for (const c of l2Sorted) {
    const text = transduceToNarrative(c);
    const tokens = countTokens(text, tokenizerId);
    if (tokens <= l2Budget) {
      l2Included.push(text);
      l2Budget -= tokens;
    } else {
      sacrificed.push({
        element: c.id,
        level: 2,
        reason: `budget_l2 exceeded (needed ${tokens}, remaining ${l2Budget})`,
      });
    }
  }
  const l2 = l2Included.join('\n');

  // ── N3 — SACRIFIABLE (sacrifier intégralement si dépasse) ────────────────

  const l3Sorted = [...l3_constraints].sort(
    (a, b) => b.priority - a.priority || a.id.localeCompare(b.id),
  );
  const l3Included: string[] = [];
  let l3Budget = config.budget_l3;

  for (const c of l3Sorted) {
    const text = transduceToNarrative(c);
    const tokens = countTokens(text, tokenizerId);
    if (tokens <= l3Budget) {
      l3Included.push(text);
      l3Budget -= tokens;
    } else {
      sacrificed.push({
        element: c.id,
        level: 3,
        reason: `budget_l3 exceeded (needed ${tokens}, remaining ${l3Budget})`,
      });
    }
  }
  const l3 = l3Included.join('\n');

  return { l1, l2, l3, sacrificed };
}
