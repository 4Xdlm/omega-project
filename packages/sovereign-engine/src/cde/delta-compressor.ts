/**
 * cde/delta-compressor.ts — Sprint P2 : Delta Compressor
 * V-PARTITION v3.0.0
 *
 * Compresses scene chain deltas to ≤60 tokens to prevent sequential fatigue.
 * When V3 is active, replaces raw propagateDelta with compressed form.
 *
 * INV-DC-01 : CompressedDelta.token_count ≤ 60
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import type { CDEInput, StateDelta, HotElement, CanonFact, DebtEntry } from './types.js';
import { countTokens } from '../constraints/token-counter.js';

// ── Constants ────────────────────────────────────────────────────────────────

export const COMPRESSED_DELTA_TOKEN_MAX = 60;
const ACTIVE_TRUTH_MAX_CHARS = 80;
const TENSION_MAX_CHARS = 60;
const DEBT_MAX_CHARS = 40;
const VECTOR_MAX_CHARS = 60;

// ── Types ────────────────────────────────────────────────────────────────────

export interface CompressedDelta {
  /** Condensed canon facts — what remains true */
  readonly active_truth: string;
  /** Current narrative tension — what drives the scene */
  readonly tension: string;
  /** Open debts summary — unresolved narrative seeds */
  readonly debt: string;
  /** Narrative vector — direction and momentum */
  readonly narrative_vector: string;
  /** Token count (must be ≤ 60) */
  readonly token_count: number;
  /** Scene index this delta was compressed from */
  readonly scene_index: number;
}

// ── Compression ──────────────────────────────────────────────────────────────

/**
 * Compresses a StateDelta + previous CDEInput into a CompressedDelta ≤60 tokens.
 *
 * Strategy:
 *   1. active_truth: top 2 canon facts (most recent first)
 *   2. tension: highest-priority tension/arc hot_element
 *   3. debt: first unresolved debt
 *   4. narrative_vector: from arc_movements + drift_flags
 *
 * If the result exceeds 60 tokens, fields are truncated in order: debt, vector, truth.
 */
export function compressDelta(
  previousInput: CDEInput,
  delta: StateDelta,
  sceneIndex: number,
): CompressedDelta {
  // ── 1. Active truth: new facts + top existing canon ────────────────────
  const allFacts = [
    ...delta.new_facts,
    ...previousInput.canon_facts.map(cf => cf.fact),
  ];
  const truthText = allFacts
    .slice(0, 2)
    .join('; ')
    .slice(0, ACTIVE_TRUTH_MAX_CHARS);

  // ── 2. Tension: highest-priority tension/arc element + delta drift ─────
  const tensionElements = previousInput.hot_elements
    .filter(h => h.type === 'tension' || h.type === 'arc')
    .sort((a, b) => b.priority - a.priority);
  const topTension = tensionElements[0]?.content ?? '';
  const driftNote = delta.drift_flags.length > 0
    ? ` [${delta.drift_flags[0].slice(0, 20)}]`
    : '';
  const tensionText = (topTension + driftNote).slice(0, TENSION_MAX_CHARS);

  // ── 3. Debt: first unresolved debt ─────────────────────────────────────
  const resolvedIds = new Set(delta.debts_resolved.map(d => d.id));
  const unresolvedDebts = previousInput.open_debts.filter(d => !d.resolved && !resolvedIds.has(d.id));
  const newDebts = delta.debts_opened.map(d => d.content);
  const allDebts = [...newDebts, ...unresolvedDebts.map(d => d.content)];
  const debtText = allDebts.length > 0
    ? allDebts[0].slice(0, DEBT_MAX_CHARS)
    : '';

  // ── 4. Narrative vector: arc movements summarized ──────────────────────
  const movements = delta.arc_movements
    .map(m => `${m.character_id}: ${m.movement}`)
    .join('; ');
  const vectorText = movements.slice(0, VECTOR_MAX_CHARS) || previousInput.scene_objective.slice(0, VECTOR_MAX_CHARS);

  // ── Enforce ≤60 tokens via iterative truncation ────────────────────────
  let result = buildCompressed(truthText, tensionText, debtText, vectorText, sceneIndex);

  if (result.token_count > COMPRESSED_DELTA_TOKEN_MAX) {
    // Truncate debt first
    const shorterDebt = debtText.slice(0, Math.floor(DEBT_MAX_CHARS * 0.5));
    result = buildCompressed(truthText, tensionText, shorterDebt, vectorText, sceneIndex);
  }

  if (result.token_count > COMPRESSED_DELTA_TOKEN_MAX) {
    // Truncate vector
    const shorterVector = vectorText.slice(0, Math.floor(VECTOR_MAX_CHARS * 0.5));
    const shorterDebt = debtText.slice(0, Math.floor(DEBT_MAX_CHARS * 0.5));
    result = buildCompressed(truthText, tensionText, shorterDebt, shorterVector, sceneIndex);
  }

  if (result.token_count > COMPRESSED_DELTA_TOKEN_MAX) {
    // Truncate truth
    const shorterTruth = truthText.slice(0, Math.floor(ACTIVE_TRUTH_MAX_CHARS * 0.5));
    const shorterVector = vectorText.slice(0, Math.floor(VECTOR_MAX_CHARS * 0.5));
    const shorterDebt = debtText.slice(0, Math.floor(DEBT_MAX_CHARS * 0.5));
    result = buildCompressed(shorterTruth, tensionText, shorterDebt, shorterVector, sceneIndex);
  }

  if (result.token_count > COMPRESSED_DELTA_TOKEN_MAX) {
    // Last resort: aggressive truncation of all fields
    result = buildCompressed(
      truthText.slice(0, 30),
      tensionText.slice(0, 30),
      debtText.slice(0, 20),
      vectorText.slice(0, 20),
      sceneIndex,
    );
  }

  return result;
}

function buildCompressed(
  truth: string,
  tension: string,
  debt: string,
  vector: string,
  sceneIndex: number,
): CompressedDelta {
  const combined = [truth, tension, debt, vector].filter(Boolean).join(' | ');
  return {
    active_truth: truth,
    tension,
    debt,
    narrative_vector: vector,
    token_count: countTokens(combined, 'chars_div_4'),
    scene_index: sceneIndex,
  };
}

// ── Application ──────────────────────────────────────────────────────────────

/**
 * Applies a CompressedDelta to produce the next scene's CDEInput.
 * Unlike propagateDelta, this produces a minimal CDEInput with only
 * the compressed information, preventing context accumulation.
 */
export function applyCompressedDelta(
  previousInput: CDEInput,
  compressed: CompressedDelta,
): CDEInput {
  const sceneIndex = compressed.scene_index;

  // Build minimal hot_elements from compressed data
  const hotElements: HotElement[] = [];

  if (compressed.tension) {
    hotElements.push({
      id: `cd-tension-s${sceneIndex}`,
      type: 'tension',
      content: compressed.tension,
      priority: 9,
    });
  }

  if (compressed.narrative_vector) {
    hotElements.push({
      id: `cd-vector-s${sceneIndex}`,
      type: 'arc',
      content: compressed.narrative_vector,
      priority: 7,
    });
  }

  // Canon facts: keep original + add active_truth as new fact
  const canonFacts: CanonFact[] = [
    ...previousInput.canon_facts,
  ];
  if (compressed.active_truth) {
    canonFacts.push({
      id: `cd-truth-s${sceneIndex}`,
      fact: compressed.active_truth,
      sealed_at: new Date().toISOString(),
    });
  }

  // Debts: replace with compressed debt only
  const openDebts: DebtEntry[] = [];
  if (compressed.debt) {
    openDebts.push({
      id: `cd-debt-s${sceneIndex}`,
      content: compressed.debt,
      opened_at: `scene-${sceneIndex}`,
      resolved: false,
    });
  }

  return {
    hot_elements: hotElements,
    canon_facts: canonFacts,
    open_debts: openDebts,
    arc_states: previousInput.arc_states,
    scene_objective: previousInput.scene_objective,
  };
}
