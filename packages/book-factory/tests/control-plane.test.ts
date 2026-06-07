/** OMEGA — C17 CONTROL_PLANE V1 : R6_DRAMATIC_FUNCTION_GATE (BF-08). */
import { describe, expect, it } from 'vitest';

import { ControlPlane, selectorEntropy } from '../src/control/control-plane.js';
import type { ChapterControlRecord, DramaticFn } from '../src/control/control-plane.js';

const rec = (chapter: number, act: number, planned: DramaticFn, realized: DramaticFn, isRegenRound = false): ChapterControlRecord =>
  ({ chapter, act, plannedFn: planned, realizedFn: realized, isRegenRound });

describe('C17 — verdicts par mode (le mode hard N\'EXISTE PAS : loi EMP-16)', () => {
  it('CP-001 — MATCH : plan respecté, aucun bruit', () => {
    const cp = new ControlPlane('soft');
    expect(cp.record(rec(1, 1, 'SETUP', 'SETUP')).status).toBe('MATCH');
  });

  it('CP-002 — shadow : la dérive est LOGGÉE, jamais bloquée (télémétrie pure)', () => {
    const cp = new ControlPlane('shadow');
    const v = cp.record(rec(2, 1, 'CONFRONTATION', 'TRANSITION'));
    expect(v.status).toBe('DRIFT_LOGGED');
    expect(cp.report().regensRequested).toBe(0);
  });

  it('CP-003 — soft R1 : dérive vers TRANSITION qui CRÈVE le budget d\'acte ⇒ REGEN', () => {
    const cp = new ControlPlane('soft', { maxTransitionRatio: 0.45 });
    cp.record(rec(1, 1, 'TRANSITION', 'TRANSITION')); // 1/1 légitime (plan)
    const v = cp.record(rec(2, 1, 'ACTION', 'TRANSITION')); // 2/2 réalisées > floor(2×0.45)=0… aggrave
    expect(v.status).toBe('DRIFT_REGEN_REQUESTED');
    if (v.status === 'DRIFT_REGEN_REQUESTED') expect(v.rule).toBe('R1_TRANSITION_BUDGET');
  });

  it('CP-004 — soft R2 : RÉVÉLATION planifiée perdue ⇒ REGEN (l\'anémie 0/50 ne revient jamais)', () => {
    const cp = new ControlPlane('soft');
    const v = cp.record(rec(7, 1, 'REVELATION', 'ACTION'));
    expect(v.status).toBe('DRIFT_REGEN_REQUESTED');
    if (v.status === 'DRIFT_REGEN_REQUESTED') expect(v.rule).toBe('R2_LOST_REVELATION');
  });

  it('CP-005 — dérive INOFFENSIVE (ACTION→CONFRONTATION) : loggée, zéro regen (pas de zèle)', () => {
    const cp = new ControlPlane('soft');
    const v = cp.record(rec(3, 1, 'ACTION', 'CONFRONTATION'));
    expect(v.status).toBe('DRIFT_LOGGED');
  });

  it('CP-006 — fallback A : UNE regen max, la re-soumission est ACCEPTÉE FLAGGÉE (jamais de boucle)', () => {
    const cp = new ControlPlane('soft');
    const first = cp.record(rec(7, 1, 'REVELATION', 'ACTION'));
    expect(first.status).toBe('DRIFT_REGEN_REQUESTED');
    const second = cp.record(rec(7, 1, 'REVELATION', 'TRANSITION', true));
    expect(second.status).toBe('DRIFT_ACCEPTED_FLAGGED');
    if (second.status === 'DRIFT_ACCEPTED_FLAGGED') expect(second.flag).toBe('below_budget');
    expect(cp.report().chapters).toBe(1); // la regen refusée n'admet pas le chapitre
  });

  it('CP-007 — une regen demandée n\'ADMET pas le chapitre dans les compteurs d\'acte', () => {
    const cp = new ControlPlane('soft');
    cp.record(rec(7, 1, 'REVELATION', 'ACTION')); // regen → non admis
    expect(cp.actSnapshot(1).chapters).toBe(0);
  });
});

describe('C17 — clôture d\'acte (les planchers RÉALISÉS, pas planifiés)', () => {
  it('CP-008 — acte façon 88k (que des TRANSITION réalisées) ⇒ 3 brèches explicites', () => {
    const cp = new ControlPlane('shadow');
    for (let c = 1; c <= 5; c += 1) cp.record(rec(c, 1, 'TRANSITION', 'TRANSITION'));
    const breaches = cp.closeAct(1).map((b) => b.code);
    expect(breaches).toContain('NO_REVELATION_REALIZED');
    expect(breaches).toContain('NO_CONFRONTATION_REALIZED');
    expect(breaches).toContain('TRANSITION_RATIO_EXCEEDED');
  });

  it('CP-009 — acte équilibré ⇒ zéro brèche', () => {
    const cp = new ControlPlane('shadow');
    cp.record(rec(1, 1, 'SETUP', 'SETUP'));
    cp.record(rec(2, 1, 'ACTION', 'ACTION'));
    cp.record(rec(3, 1, 'CONFRONTATION', 'CONFRONTATION'));
    cp.record(rec(4, 1, 'REVELATION', 'REVELATION'));
    cp.record(rec(5, 1, 'TRANSITION', 'TRANSITION'));
    expect(cp.closeAct(1).length).toBe(0);
  });
});

describe('C17 — entropie du sélecteur (anti-monoculture Best-of-N)', () => {
  it('CP-010 — monoculture totale ⇒ ratio 0 ; distribution EMP-16 réelle ⇒ ratio élevé (hypothèse réfutée)', () => {
    const mono = selectorEntropy(['a', 'a', 'a', 'a']);
    expect(mono.ratio).toBe(0);
    const emp16 = selectorEntropy([
      ...Array<string>(13).fill('rythme-compresse'), ...Array<string>(8).fill('synthese'),
      ...Array<string>(7).fill('dialogue'), ...Array<string>(7).fill('tension-interne'),
      ...Array<string>(6).fill('canon-strict'), ...Array<string>(6).fill('sensoriel'),
      ...Array<string>(3).fill('voix-seche'),
    ]);
    expect(emp16.ratio).toBeGreaterThan(0.9); // Best-of-7 PAS effondré — mesuré, pas supposé
    expect(emp16.distribution['rythme-compresse']).toBe(13);
    const uniform = selectorEntropy(['a', 'b', 'c', 'd']);
    expect(uniform.ratio).toBeCloseTo(1, 6);
  });
});
