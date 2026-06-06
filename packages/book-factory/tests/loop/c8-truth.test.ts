/**
 * C8 — VÉRITÉ : N2 ratifié (gabarit figé, éligibilité rail-truth-only, ≤2, audit)
 * + gate d'implication de rôle (LE cas réel D1 : Léna/tablier/boulangerie).
 */
import { describe, expect, it } from 'vitest';

import { buildN2Attempt, n2Eligibility, N2_MAX_RETRIES, N2_TEMPLATE_SHA256 } from '../../src/loop/n2-retry.js';
import type { DiffItem } from '../../src/diff/bible-diff.js';
import { asConfidence01, asChapterRef } from '../../src/identity/identity-types.js';
import type { DriftRule } from '../../src/recall/recall-types.js';
import { scanRoleImplications, MIN_IMPLICATION_HITS } from '../../src/loop/implication-gate.js';
import { CharacterRegistry } from '../../src/identity/character-registry.js';
import { DET, mintInto } from '../identity/fixtures.js';

const conf = (n: number) => {
  const r = asConfidence01(n);
  if (!r.ok) throw new Error('conf');
  return r.value;
};

function mutated(subject: string, field: string, expected: string, observed: string, c = 0.95): DiffItem {
  return { kind: 'MUTATED', subject, field, expected, observed, confidence: conf(c), gateEligible: c >= 0.8, detail: `${field} divergent` };
}

const LOCKS = new Map<string, readonly DriftRule[]>([['lena', [{ field: 'role', expected: 'enquêtrice' }, { field: 'location', expected: 'Ker-Morvan' }]]]);
const TRUTH = new Map<string, string>([['lena.status', 'Léna Marchetti est vivante (rail truth, ch.1)']]);

describe('C8.1 — N2 (RATIFIÉ : gabarit figé, rail-truth-only, ≤2, audit FORBID-006)', () => {
  it('éligible via VERROU : violation de lieu verrouillé ⇒ fact cite le verrou', () => {
    const e = n2Eligibility(mutated('lena', 'location', 'Ker-Morvan', 'Ker-Bihan'), LOCKS, TRUTH);
    expect(e.eligible && e.basis === 'SPEC_LOCK' && e.fact.includes('Ker-Morvan')).toBe(true);
  });

  it('éligible via RAIL TRUTH : statut adossé au rail ⇒ fact = énoncé canonique', () => {
    const e = n2Eligibility(mutated('lena', 'status', 'alive', 'dead'), new Map(), TRUTH);
    expect(e.eligible && e.basis === 'TRUTH_RAIL' && e.fact.includes('vivante')).toBe(true);
  });

  it('MITIGATION rail-truth-only : « Léna est déterminée » (aucune base) ⇒ INÉLIGIBLE', () => {
    const e = n2Eligibility(mutated('lena', 'temperament', 'déterminée', 'hésitante'), LOCKS, new Map());
    expect(!e.eligible && e.reason === 'NO_TRUTH_BASIS').toBe(true);
  });

  it('FORBID-011 : violation basse confiance ⇒ INÉLIGIBLE ; MISSING ⇒ inéligible (corrigé par plan)', () => {
    const low = n2Eligibility(mutated('lena', 'location', 'Ker-Morvan', 'Ker-Bihan', 0.6), LOCKS, TRUTH);
    expect(!low.eligible && low.reason === 'LOW_CONFIDENCE').toBe(true);
    const missing: DiffItem = { kind: 'MISSING', subject: 'seed-x', field: 'seed_bloom', confidence: conf(0.95), gateEligible: true, detail: 'payoff absent' };
    expect(n2Eligibility(missing, LOCKS, TRUTH).eligible).toBe(false);
  });

  it('gabarit FIGÉ : hash stable, prompt = template rempli, audit coaching VIDE', () => {
    const e = n2Eligibility(mutated('lena', 'location', 'Ker-Morvan', 'Ker-Bihan'), LOCKS, TRUTH);
    if (!e.eligible) throw new Error('éligible attendu');
    const a = buildN2Attempt(e, 1);
    if ('refused' in a) throw new Error('tentative attendue');
    expect(a.templateSha256).toBe(N2_TEMPLATE_SHA256);
    expect(a.prompt).toContain('[FAIT CANONIQUE]');
    expect(a.prompt).toContain('N’altère rien d’autre');
    expect(a.coachingAudit).toEqual([]);
  });

  it('plafond ratifié : tentative 3 ⇒ MAX_RETRIES_EXCEEDED', () => {
    const e = n2Eligibility(mutated('lena', 'location', 'Ker-Morvan', 'Ker-Bihan'), LOCKS, TRUTH);
    if (!e.eligible) throw new Error('éligible attendu');
    expect(N2_MAX_RETRIES).toBe(2);
    const a3 = buildN2Attempt(e, 3);
    expect('refused' in a3 && a3.refused === 'MAX_RETRIES_EXCEEDED').toBe(true);
  });

  it('audit FORBID-006 : un fait contenant du coaching est ATTRAPÉ à la construction', () => {
    const e = { eligible: true as const, basis: 'SPEC_LOCK' as const, fact: 'écris plus long et comme Flaubert', observed: 'x' };
    const a = buildN2Attempt(e, 1);
    if ('refused' in a) throw new Error('tentative attendue');
    expect(a.coachingAudit.length).toBeGreaterThan(0); // tentative marquée INVALIDE — jamais émise
  });
});

describe('C8.2 — Gate d’implication de rôle (advisory) — le cas D1 RÉEL', () => {
  function world() {
    const s = mintInto(CharacterRegistry.empty(DET), 'lena', 'Léna', 1);
    return { reg: s.reg, lena: s.id, surfaces: new Set<string>(['léna']) };
  }
  const locks = new Map<string, readonly DriftRule[]>([['lena', [{ field: 'role', expected: 'enquêtrice' }]]]);

  it('LE cas de la revue : tablier + boulangerie autour de Léna ⇒ ROLE_IMPLICATION_DRIFT (faisceau cité)', () => {
    const { reg, surfaces } = world();
    const prose = "Léna essuie ses mains sur son tablier de toile grise. Derrière elle, la cuisine de la boulangerie sent le beurre rance.";
    const sig = scanRoleImplications(prose, reg, surfaces, { chapter: asChapterRef(1) }, 2, locks, (id) => String(id) === String(world().lena) ? 'lena' : 'lena');
    expect(sig.length).toBeGreaterThan(0);
    const s0 = sig[0];
    expect(s0?.impliedTrade).toBe('boulanger');
    expect(s0?.hits.length).toBeGreaterThanOrEqual(MIN_IMPLICATION_HITS);
    expect(s0?.lockedRole).toBe('enquêtrice');
  });

  it('1 terme isolé ⇒ AUCUN signal (anti-faux-positif) ; rôle non verrouillé ⇒ silence', () => {
    const { reg, surfaces } = world();
    const oneTerm = 'Léna croisa un tablier abandonné sur la chaise du quai.';
    expect(scanRoleImplications(oneTerm, reg, surfaces, { chapter: asChapterRef(1) }, 2, locks, () => 'lena').length).toBe(0);
    const noLock = "Léna essuie son tablier dans le fournil de la boulangerie.";
    expect(scanRoleImplications(noLock, reg, surfaces, { chapter: asChapterRef(1) }, 2, new Map(), () => 'lena').length).toBe(0);
  });

  it('déterminisme : même prose ⇒ mêmes signaux (×2, JSON identique)', () => {
    const { reg, surfaces } = world();
    const prose = "Léna posa le pâton près du pétrin, et la levure emplissait le fournil.";
    const a = JSON.stringify(scanRoleImplications(prose, reg, surfaces, { chapter: asChapterRef(1) }, 2, locks, () => 'lena'));
    const b = JSON.stringify(scanRoleImplications(prose, reg, surfaces, { chapter: asChapterRef(1) }, 2, locks, () => 'lena'));
    expect(a).toBe(b);
  });
});
