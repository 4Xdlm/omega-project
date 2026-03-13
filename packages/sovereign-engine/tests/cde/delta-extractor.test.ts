/**
 * delta-extractor.test.ts — Tests for extractDelta()
 * Sprint V-INIT
 *
 * Couverture : CDE-11..18 + INV-CDE-03/04/05
 * 100% CALC — 0 appel LLM.
 * Standard: NASA-Grade L4 / DO-178C
 */

import { describe, it, expect } from 'vitest';
import { sha256 } from '@omega/canon-kernel';
import { extractDelta } from '../../src/cde/delta-extractor';
import type { DeltaContext } from '../../src/cde/delta-extractor';
import { CDEError } from '../../src/cde/types';
import type { CanonFact, DebtEntry, ArcState } from '../../src/cde/types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeCanon(id: string, fact: string): CanonFact {
  return { id, fact, sealed_at: '2026-01-01T00:00:00Z' };
}

function makeDebt(id: string, content: string): DebtEntry {
  return { id, content, opened_at: 'ch-1', resolved: false };
}

function makeArc(charId: string, phase: ArcState['arc_phase'] = 'setup'): ArcState {
  return {
    character_id: charId,
    arc_phase:    phase,
    current_need: `${charId} needs truth`,
    current_mask: `${charId} pretends calm`,
    tension:      `${charId} inner conflict`,
  };
}

const EMPTY_CONTEXT: DeltaContext = {
  canon_facts: [],
  open_debts:  [],
  arc_states:  [],
};

const SAMPLE_PROSE = 'Marie etait assise dans le salon. Pierre entra et la regarda. Il etait fatigue. Le silence devint insupportable.';

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 1 — extractDelta() core — INV-CDE-03/04/05
// ══════════════════════════════════════════════════════════════════════════════

describe('V-INIT extractDelta() — INV-CDE-03/04/05', () => {

  // CDE-11 : valid StateDelta on non-empty prose
  it('CDE-11: returns valid StateDelta on non-empty prose', () => {
    const delta = extractDelta(SAMPLE_PROSE, EMPTY_CONTEXT);
    expect(Array.isArray(delta.new_facts)).toBe(true);
    expect(Array.isArray(delta.modified_facts)).toBe(true);
    expect(Array.isArray(delta.debts_opened)).toBe(true);
    expect(Array.isArray(delta.debts_resolved)).toBe(true);
    expect(Array.isArray(delta.arc_movements)).toBe(true);
    expect(Array.isArray(delta.drift_flags)).toBe(true);
    expect(typeof delta.prose_hash).toBe('string');
    expect(delta.prose_hash.length).toBe(64);
  });

  // CDE-12 : EMPTY_PROSE
  it('CDE-12: CDEError EMPTY_PROSE if prose empty', () => {
    expect(() => extractDelta('', EMPTY_CONTEXT)).toThrow(CDEError);
    expect(() => extractDelta('', EMPTY_CONTEXT)).toThrow('EMPTY_PROSE');
  });

  it('CDE-12b: CDEError EMPTY_PROSE if prose whitespace only', () => {
    expect(() => extractDelta('   \n  ', EMPTY_CONTEXT)).toThrow('EMPTY_PROSE');
  });

  // CDE-13 : canon conflict -> drift_flag (INV-CDE-03)
  it('CDE-13: canon conflict detected -> drift_flag added (INV-CDE-03)', () => {
    const context: DeltaContext = {
      canon_facts: [makeCanon('cf1', 'Marie est medecin')],
      open_debts:  [],
      arc_states:  [],
    };
    const prose = 'Marie n\'etait plus medecin depuis longtemps. Elle avait tout quitte.';
    const delta = extractDelta(prose, context);
    expect(delta.drift_flags.length).toBeGreaterThan(0);
    expect(delta.drift_flags[0]).toContain('CANON_CONFLICT');
    expect(delta.drift_flags[0]).toContain('cf1');
  });

  // CDE-14 : debt mentioned -> debts_resolved or debts_opened (INV-CDE-04/05)
  it('CDE-14a: debt resolved when close signal matches (INV-CDE-05)', () => {
    const context: DeltaContext = {
      canon_facts: [],
      open_debts:  [makeDebt('d1', 'Pierre avait promis de revenir')],
      arc_states:  [],
    };
    const prose = 'Pierre revele la verite sur sa promesse. Il avait promis de revenir et il a tenu sa parole.';
    const delta = extractDelta(prose, context);
    expect(delta.debts_resolved.length).toBeGreaterThan(0);
    expect(delta.debts_resolved[0].id).toBe('d1');
    expect(delta.debts_resolved[0].evidence.length).toBeGreaterThan(0);
  });

  it('CDE-14b: new debt opened when open signal detected (INV-CDE-04)', () => {
    const prose = 'Marie fit une promesse solennelle. Elle jura de ne jamais revenir.';
    const delta = extractDelta(prose, EMPTY_CONTEXT);
    expect(delta.debts_opened.length).toBeGreaterThan(0);
    expect(delta.debts_opened[0].content.length).toBeGreaterThan(0);
    expect(delta.debts_opened[0].evidence.length).toBeGreaterThan(0);
  });

  // CDE-15 : prose_hash = SHA256(prose)
  it('CDE-15: prose_hash = SHA256(prose)', () => {
    const delta = extractDelta(SAMPLE_PROSE, EMPTY_CONTEXT);
    expect(delta.prose_hash).toBe(sha256(SAMPLE_PROSE));
  });

  // CDE-16 : empty context -> empty fields, no error
  it('CDE-16: empty context -> fields empty, no error', () => {
    const prose = 'Une simple phrase sans contexte narratif.';
    const delta = extractDelta(prose, EMPTY_CONTEXT);
    expect(delta.debts_resolved).toHaveLength(0);
    expect(delta.arc_movements).toHaveLength(0);
    // drift_flags may or may not be empty depending on prose content
    expect(Array.isArray(delta.drift_flags)).toBe(true);
  });

  // CDE-17 : arc_movement detected if transition keyword present
  it('CDE-17: arc_movement detected if transition keyword present', () => {
    const context: DeltaContext = {
      canon_facts: [],
      open_debts:  [],
      arc_states:  [makeArc('Pierre', 'setup')],
    };
    const prose = 'Pierre affronta enfin la verite. Il combattit ses demons interieurs.';
    const delta = extractDelta(prose, context);
    expect(delta.arc_movements.length).toBeGreaterThan(0);
    expect(delta.arc_movements[0].character_id).toBe('Pierre');
    expect(delta.arc_movements[0].movement).toContain('setup');
    expect(delta.arc_movements[0].movement).toContain('confrontation');
  });

  // CDE-18 : drift_flags empty if no inconsistency detected
  it('CDE-18: drift_flags empty if no inconsistency detected', () => {
    const context: DeltaContext = {
      canon_facts: [makeCanon('cf1', 'Marie est medecin')],
      open_debts:  [],
      arc_states:  [],
    };
    // Prose consistent with canon — no negation
    const prose = 'Marie la medecin examina le patient avec attention. Elle etait competente.';
    const delta = extractDelta(prose, context);
    expect(delta.drift_flags).toHaveLength(0);
  });
});
