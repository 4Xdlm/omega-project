/**
 * OMEGA Book-Factory — P0.6b Epistemic Hardening Probe
 *
 * Corrects + proves the 4 model-level weaknesses:
 *   #1 knows = JUSTIFIED true belief (believing the truth by luck ≠ knowing)
 *   #2 revelation requires evidence (no knowledge without proof)
 *   #3 readerState ≠ truthState (suspense: reader is not omniscient)
 *   #4 promote references its source interpretation tx (not a disguised SET truth)
 * + regression: a rumor repeated by N characters never contaminates the truth.
 *
 * 100% deterministic, hors-LLM. If green → P0.6b gate PASS.
 */

import { describe, it, expect } from 'vitest';
import { BookCanonAdapter } from '../src/book-canon-adapter.js';

const S = 'key';
const P = 'location';
const KEY = 'key.location';
const WELL = 'well';
const BEDROOM = 'bedroom';
const PROOF = [{ type: 'human' as const, path: 'witness:well', description: 'The key was seen in the well' }];

describe('P0.6b — Epistemic hardening (Gettier-safe knows / reader / promote source)', () => {
  // ---- Regression: the Test of the Well (anti-contamination) ----
  it('REGRESSION — a belief repeated by 3 characters NEVER contaminates the truth', () => {
    const a = new BookCanonAdapter();
    a.recordTruth(S, P, WELL);
    a.recordBelief('Paul', S, P, BEDROOM);
    a.recordBelief('Irina', S, P, BEDROOM, 'Paul');
    a.recordBelief('Garcia', S, P, BEDROOM, 'Irina');
    expect(a.rumorCarriers(S, P, BEDROOM)).toBe(3);
    expect(a.truthState().get(KEY)).toBe(WELL);
  });

  // ---- #1 knows = JUSTIFIED true belief ----
  it('#1 — believing the truth BY LUCK is NOT knowing (unjustified belief)', () => {
    const a = new BookCanonAdapter();
    a.recordTruth(S, P, WELL);
    a.recordBelief('Paul', S, P, WELL); // Paul guesses right, but has no proof
    expect(a.beliefState('Paul').get(KEY)).toBe(WELL);
    expect(a.justified('Paul', S, P)).toBe(false);
    expect(a.knows('Paul', S, P)).toBe(false); // true belief, but NOT knowledge
  });

  // ---- #2 revelation requires evidence ----
  it('#2 — a revelation WITHOUT evidence is rejected and yields no knowledge', () => {
    const a = new BookCanonAdapter();
    a.recordTruth(S, P, WELL);
    a.recordBelief('Paul', S, P, BEDROOM);
    const r = a.recordRevelation('Paul', S, P, WELL, []); // no proof
    expect(r.allowed).toBe(false);
    expect(a.knows('Paul', S, P)).toBe(false);
    expect(a.beliefState('Paul').get(KEY)).toBe(BEDROOM); // belief unchanged
  });

  it('#2 — a revelation WITH evidence yields knowledge', () => {
    const a = new BookCanonAdapter();
    a.recordTruth(S, P, WELL);
    a.recordBelief('Paul', S, P, BEDROOM);
    const r = a.recordRevelation('Paul', S, P, WELL, PROOF);
    expect(r.allowed).toBe(true);
    expect(a.knows('Paul', S, P)).toBe(true);
  });

  // ---- #3 readerState ≠ truthState ----
  it('#3 — the reader is NOT omniscient: ignores the truth before it is revealed to them', () => {
    const a = new BookCanonAdapter();
    a.recordTruth(S, P, WELL); // truth exists in the world…
    expect(a.readerKnows(S, P)).toBe(false); // …but the reader has not been told
    expect(a.readerState().get(KEY)).toBeUndefined();
  });

  it('#3 — the reader knows only AFTER an explicit reader-reveal', () => {
    const a = new BookCanonAdapter();
    a.recordTruth(S, P, WELL);
    a.readerReveal(S, P, WELL);
    expect(a.readerKnows(S, P)).toBe(true);
    expect(a.readerState().get(KEY)).toBe(WELL);
  });

  // ---- #4 promote references a source interpretation tx ----
  it('#4 — PROMOTE without a valid source interpretation tx is REJECTED', () => {
    const a = new BookCanonAdapter();
    const r = a.promote('tx_does_not_exist', 'letter', 'hidden', 'yes', PROOF);
    expect(r.allowed).toBe(false);
    expect(a.truthState().get('letter.hidden')).toBeUndefined();
  });

  it('#4 — PROMOTE with a real source belief + evidence is ACCEPTED and writes the truth', () => {
    const a = new BookCanonAdapter();
    const belief = a.recordBelief('Paul', 'letter', 'hidden', 'yes'); // an interpretation tx
    expect(belief.tx_id).toBeDefined();
    const r = a.promote(belief.tx_id as string, 'letter', 'hidden', 'yes', PROOF);
    expect(r.allowed).toBe(true);
    expect(a.truthState().get('letter.hidden')).toBe('yes');
  });

  it('L2 — a raw PROMOTE without evidence is DENIED by the truth-gate', () => {
    const a = new BookCanonAdapter();
    const r = a.rawPromote(S, P, BEDROOM, []);
    expect(r.allowed).toBe(false);
    expect(r.verdict).toBe('DENY');
    expect(a.truthState().get(KEY)).toBeUndefined();
  });

  // ---- lie / bluff / mistake disambiguation ----
  it('lie vs bluff — guessing right then asserting the contrary is a BLUFF, not a lie', () => {
    const a = new BookCanonAdapter();
    a.recordTruth(S, P, WELL);
    a.recordBelief('Paul', S, P, WELL); // guesses the truth (unjustified)
    a.recordAssertion('Paul', S, P, BEDROOM); // asserts the opposite
    expect(a.knows('Paul', S, P)).toBe(false);
    expect(a.isBluff('Paul', S, P)).toBe(true);
    expect(a.isLie('Paul', S, P)).toBe(false); // NOT a lie — he never knew
  });

  it('lie — knowing the truth then asserting the contrary IS a lie', () => {
    const a = new BookCanonAdapter();
    a.recordTruth(S, P, WELL);
    a.recordBelief('Paul', S, P, BEDROOM);
    a.recordRevelation('Paul', S, P, WELL, PROOF); // now he KNOWS
    a.recordAssertion('Paul', S, P, BEDROOM); // asserts against his knowledge
    expect(a.isLie('Paul', S, P)).toBe(true);
    expect(a.isBluff('Paul', S, P)).toBe(false);
    expect(a.truthState().get(KEY)).toBe(WELL);
  });

  it('mistake — sincerely asserting a wrong belief is a MISTAKE, not a lie', () => {
    const a = new BookCanonAdapter();
    a.recordTruth(S, P, WELL);
    a.recordBelief('Paul', S, P, BEDROOM);
    a.recordAssertion('Paul', S, P, BEDROOM); // says what he believes
    expect(a.isMistake('Paul', S, P)).toBe(true);
    expect(a.isLie('Paul', S, P)).toBe(false);
    expect(a.isBluff('Paul', S, P)).toBe(false);
  });

  // ---- dramatic irony ----
  it('dramatic irony — reader told the truth while a character still does not know it', () => {
    const a = new BookCanonAdapter();
    a.recordTruth(S, P, WELL);
    a.recordBelief('Paul', S, P, BEDROOM);
    a.readerReveal(S, P, WELL);
    expect(a.dramaticIrony('Paul', S, P)).toBe(true);
  });
});
