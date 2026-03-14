/**
 * distiller.ts — Context Distillation Engine : distillBrief()
 * Sprint V-INIT
 *
 * Compresse les CDEInput en SceneBrief <= 150 tokens.
 *
 * Algorithme :
 *   1. Trier hot_elements par priority DESC
 *   2. Selectionner les elements par seuil de priorite (>= 7 toujours, 4-6 si budget)
 *   3. Construire les 4 champs du SceneBrief par agregation deterministe
 *   4. Calculer token_estimate et verifier INV-CDE-01
 *   5. Calculer input_hash (SHA256 de CDEInput serialise) pour INV-CDE-02
 *
 * Invariants:
 *   INV-CDE-01 : token_estimate <= 150
 *   INV-CDE-02 : determinisme — meme input -> meme hash
 *   INV-CDE-06 : 0 element decoratif (priority < 4 exclu)
 *
 * Standard: NASA-Grade L4 / DO-178C
 */

import { sha256 } from '@omega/canon-kernel';
import type { CDEInput, SceneBrief, HotElement } from './types.js';
import { CDEError } from './types.js';
import { estimateTokens, CHARS_PER_TOKEN } from '../utils/token-utils.js';

// ── Constants ────────────────────────────────────────────────────────────────

/** Total token budget — INV-CDE-01 */
export const BRIEF_TOKEN_MAX = 150;

/** Per-field token budgets */
export const FIELD_BUDGET_MUST_REMAIN_TRUE = 40;
export const FIELD_BUDGET_IN_TENSION       = 35;
export const FIELD_BUDGET_MUST_MOVE        = 40;
export const FIELD_BUDGET_MUST_NOT_BREAK   = 35;

/** Priority thresholds — INV-CDE-06 */
const PRIORITY_ALWAYS = 7;   // >= 7 : always included
const PRIORITY_IF_BUDGET = 4; // 4-6 : included if budget remains
// < 4 : excluded (non-necessary)

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Sort keys recursively for deterministic JSON serialization (INV-CDE-02).
 */
function sortedStringify(obj: unknown): string {
  return JSON.stringify(obj, (_key, value) => {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(value as Record<string, unknown>).sort()) {
        sorted[k] = (value as Record<string, unknown>)[k];
      }
      return sorted;
    }
    return value;
  });
}

/**
 * Truncate text to fit within a token budget.
 * Cuts at the last sentence boundary (period, exclamation, question mark)
 * that fits. If no sentence boundary fits, cuts at word boundary.
 */
function truncateToTokenBudget(text: string, maxTokens: number): string {
  if (estimateTokens(text) <= maxTokens) return text;
  const maxChars = maxTokens * CHARS_PER_TOKEN;
  const truncated = text.slice(0, maxChars);

  // Try to cut at last sentence boundary
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?'),
  );
  if (lastSentenceEnd > 0) {
    return truncated.slice(0, lastSentenceEnd + 1).trim();
  }

  // Fallback: cut at last space
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > 0) {
    return truncated.slice(0, lastSpace).trim();
  }

  return truncated.trim();
}

// ── Element selection ────────────────────────────────────────────────────────

interface SelectedElements {
  readonly canon:    HotElement[];
  readonly tension:  HotElement[];
  readonly movement: HotElement[];
  readonly guard:    HotElement[];
}

/**
 * Select and categorize hot elements by priority and type.
 * INV-CDE-06 : priority < 4 excluded.
 */
function selectElements(elements: HotElement[]): SelectedElements {
  // Sort by priority DESC, then by id ASC (determinism)
  const sorted = [...elements].sort((a, b) =>
    b.priority - a.priority || a.id.localeCompare(b.id),
  );

  const canon:    HotElement[] = [];
  const tension:  HotElement[] = [];
  const movement: HotElement[] = [];
  const guard:    HotElement[] = [];

  let tokenBudget = BRIEF_TOKEN_MAX;

  for (const el of sorted) {
    // INV-CDE-06 : exclude decorative elements
    if (el.priority < PRIORITY_IF_BUDGET) continue;

    const tokens = estimateTokens(el.content);

    // Priority >= 7 : always include (if any budget remains)
    // Priority 4-6 : include only if budget allows
    if (el.priority < PRIORITY_ALWAYS && tokens > tokenBudget) continue;

    tokenBudget -= Math.min(tokens, tokenBudget);

    switch (el.type) {
      case 'canon':
      case 'persona':
        canon.push(el);
        break;
      case 'tension':
        tension.push(el);
        break;
      case 'arc':
        movement.push(el);
        break;
      case 'debt':
        guard.push(el);
        break;
    }
  }

  return { canon, tension, movement, guard };
}

// ── Main function ────────────────────────────────────────────────────────────

/**
 * distillBrief() — Compresse les CDEInput en SceneBrief <= 150 tokens.
 *
 * @throws CDEError EMPTY_INPUT if hot_elements is empty
 * @throws CDEError MISSING_OBJECTIVE if scene_objective is empty
 * @throws CDEError BRIEF_TOO_LONG if brief exceeds 150 tokens after truncation
 */
export function distillBrief(input: CDEInput): SceneBrief {
  // ── Guards ─────────────────────────────────────────────────────────────────
  if (input.hot_elements.length === 0) {
    throw new CDEError('EMPTY_INPUT', 'hot_elements is empty — cannot distill');
  }
  if (!input.scene_objective || input.scene_objective.trim().length === 0) {
    throw new CDEError('MISSING_OBJECTIVE', 'scene_objective is empty');
  }

  // ── INV-CDE-02 : deterministic input hash ──────────────────────────────────
  const inputHash = sha256(sortedStringify(input));

  // ── Select elements ────────────────────────────────────────────────────────
  const selected = selectElements(input.hot_elements);

  // ── Build must_remain_true ─────────────────────────────────────────────────
  // Canon facts + canon/persona hot elements
  const canonParts: string[] = [];
  for (const fact of input.canon_facts) {
    canonParts.push(fact.fact);
  }
  for (const el of selected.canon) {
    canonParts.push(el.content);
  }
  const mustRemainTrueRaw = canonParts.length > 0
    ? canonParts.join(' | ')
    : input.scene_objective;
  const mustRemainTrue = truncateToTokenBudget(mustRemainTrueRaw, FIELD_BUDGET_MUST_REMAIN_TRUE);

  // ── Build in_tension ───────────────────────────────────────────────────────
  // Tension elements + arc states tension fields
  const tensionParts: string[] = [];
  for (const el of selected.tension) {
    tensionParts.push(el.content);
  }
  for (const arc of input.arc_states) {
    if (arc.tension.trim().length > 0) {
      tensionParts.push(arc.tension);
    }
  }
  const inTensionRaw = tensionParts.length > 0
    ? tensionParts.join(' | ')
    : input.scene_objective;
  const inTension = truncateToTokenBudget(inTensionRaw, FIELD_BUDGET_IN_TENSION);

  // ── Build must_move ────────────────────────────────────────────────────────
  // Arc movement elements + scene objective
  const moveParts: string[] = [input.scene_objective];
  for (const el of selected.movement) {
    moveParts.push(el.content);
  }
  for (const arc of input.arc_states) {
    if (arc.current_need.trim().length > 0) {
      moveParts.push(`${arc.character_id}: ${arc.current_need}`);
    }
  }
  const mustMoveRaw = moveParts.join(' | ');
  const mustMove = truncateToTokenBudget(mustMoveRaw, FIELD_BUDGET_MUST_MOVE);

  // ── Build must_not_break ───────────────────────────────────────────────────
  // Open debts + guard elements + canon constraints
  const guardParts: string[] = [];
  for (const el of selected.guard) {
    guardParts.push(el.content);
  }
  for (const debt of input.open_debts) {
    if (!debt.resolved) {
      guardParts.push(`DEBT[${debt.id}]: ${debt.content}`);
    }
  }
  if (guardParts.length === 0) {
    // Fallback: canon facts as guard rails
    for (const fact of input.canon_facts) {
      guardParts.push(`CANON: ${fact.fact}`);
    }
  }
  const mustNotBreakRaw = guardParts.length > 0
    ? guardParts.join(' | ')
    : 'No active constraints';
  const mustNotBreak = truncateToTokenBudget(mustNotBreakRaw, FIELD_BUDGET_MUST_NOT_BREAK);

  // ── Token estimate — INV-CDE-01 ───────────────────────────────────────────
  const totalChars = mustRemainTrue.length + inTension.length + mustMove.length + mustNotBreak.length;
  const tokenEstimate = Math.ceil(totalChars / CHARS_PER_TOKEN);

  if (tokenEstimate > BRIEF_TOKEN_MAX) {
    throw new CDEError(
      'BRIEF_TOO_LONG',
      `token_estimate=${tokenEstimate} exceeds max=${BRIEF_TOKEN_MAX}`,
    );
  }

  return {
    must_remain_true: mustRemainTrue,
    in_tension:       inTension,
    must_move:        mustMove,
    must_not_break:   mustNotBreak,
    token_estimate:   tokenEstimate,
    input_hash:       inputHash,
  };
}
