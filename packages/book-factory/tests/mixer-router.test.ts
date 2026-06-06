/** OMEGA — C10 ROUTER + C13 MIXER tests (BF-08). BF-09/10/15 incarnées. */

import { describe, it, expect } from 'vitest';

import { setMode, assertCapability, MODE_SPECS } from '../src/router/product-mode-router.js';
import type { OmegaSession } from '../src/router/product-mode-router.js';
import { measureKnobFeatures, traceabilityTable, KNOB_IDS, KNOB_BINDINGS } from '../src/mixer/knob-bindings.js';
import { mixedSelect } from '../src/mixer/mixer-selector.js';
import type { MixerCandidate } from '../src/mixer/mixer-selector.js';

describe('C10 ProductModeRouter (BF-09 RATIFIÉE)', () => {
  it('INV-RTR-001 — pas de capacité sans mode déclaré (refus typé)', () => {
    const r = assertCapability(undefined, 'GENERATE_PROSE');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('NO_MODE_DECLARED');
  });

  it('INV-RTR-002 — les lois du mode sont imposées par le code : GPS ne génère JAMAIS', () => {
    const gps = setMode('COAUTHOR_GPS');
    expect(gps.ok).toBe(true);
    if (!gps.ok) return;
    expect(gps.value.requires('BF-11_USER_SOVEREIGN')).toBe(true);
    const denied = assertCapability(gps.value, 'GENERATE_PROSE');
    expect(denied.ok).toBe(false); // « le GPS ne décide jamais » — VISION:279, par le CODE
    const allowed = assertCapability(gps.value, 'SUGGEST_TRAJECTORIES');
    expect(allowed.ok).toBe(true);
  });

  it('INV-RTR-003 — chaque mode porte N3_FORBIDDEN ou une loi de substitution ; MIXER ne génère pas', () => {
    for (const [mode, spec] of Object.entries(MODE_SPECS)) {
      expect(spec.laws.length, mode).toBeGreaterThan(0);
    }
    const mixer = setMode('MIXER_CONTROL');
    if (!mixer.ok) return;
    expect(assertCapability(mixer.value, 'GENERATE_PROSE').ok).toBe(false);
    expect(assertCapability(mixer.value, 'RERANK_SELECTION').ok).toBe(true);
    expect(mixer.value.tier).toBe('OFF'); // le mixer est CALC pur
  });
});

describe('C13 Mixer — bindings (BF-10 RATIFIÉE)', () => {
  it('INV-MIX-001 — traçabilité totale : chaque potard a mécanisme+limites+risque Goodhart+lexiques', () => {
    const table = traceabilityTable();
    expect(table.length).toBe(5); // les 5 de VISION:282, pas un de plus
    for (const row of table) {
      expect(row.mechanism.length).toBeGreaterThan(30);
      expect(row.limits.length).toBeGreaterThan(10);
      expect(row.goodhartRisk.length).toBeGreaterThan(10);
      expect(row.lexiconCount).toBeGreaterThan(0);
    }
  });

  it('INV-MIX-002 — les features discriminent des proses contrastées', () => {
    const tense = 'Il menace, frappe la table. Soudain elle se fige, le souffle court, le cœur qui bat. Il exige une réponse, brusquement.';
    const soft = 'Elle prend sa main avec tendresse. Ils sourient doucement, apaisés, dans la chaleur retrouvée du soir. Une promesse, enfin, demain.';
    const ft = measureKnobFeatures(tense);
    const fs = measureKnobFeatures(soft);
    expect(ft.TENSION).toBeGreaterThan(fs.TENSION);
    expect(fs.ROMANCE).toBeGreaterThan(ft.ROMANCE);
    expect(fs.ESPOIR).toBeGreaterThan(ft.ESPOIR);
  });
});

describe('C13 Mixer — sélecteur (BF-15 + réserve : sélection only, étage A inviolable)', () => {
  const mk = (id: string, prose: string, baseScore: number, eligible = true): MixerCandidate => ({ id, prose, baseScore, eligible });
  const SCENE: readonly MixerCandidate[] = [
    mk('calme', 'La mer restait étale sous le ciel gris. Elle prend sa main avec tendresse, apaisée, et ils regardent le large en silence, soulagés.', 100),
    mk('tendu', 'Il menace du poing, frappe la rambarde. Elle se fige, souffle court, cœur qui bat aux tempes. Brusquement il exige la vérité, aussitôt.', 98),
    mk('mystérieux', 'Une silhouette indistincte longe le quai. Qui ? Le secret reste entier, inexpliqué, étrange. Elle se tait, dissimule la lettre. Pourquoi ?', 97),
  ];

  it('INV-MIX-003 — potards à 0 ⇒ sélection IDENTIQUE à la base (identité)', () => {
    const r = mixedSelect(SCENE, {});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.winner).toBe('calme');
    expect(r.value.changedWinner).toBe(false);
    for (const c of r.value.ranked) expect(c.adjustedScore).toBe(c.baseScore);
  });

  it('INV-MIX-004 — TENSION+1 fait gagner le candidat tendu ; TENSION-1 le repousse (monotonie)', () => {
    const up = mixedSelect(SCENE, { TENSION: 1 });
    expect(up.ok && up.value.winner === 'tendu' && up.value.changedWinner).toBe(true);
    const down = mixedSelect(SCENE, { TENSION: -1 });
    expect(down.ok).toBe(true);
    if (!down.ok) return;
    expect(down.value.winner).not.toBe('tendu');
  });

  it('INV-MIX-005 — MYSTERE+1 couronne le candidat mystérieux, avec contributions tracées (BF-10)', () => {
    const r = mixedSelect(SCENE, { MYSTERE: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.winner).toBe('mystérieux');
    const w = r.value.ranked[0];
    expect(w?.contributions.length).toBe(1);
    expect(w?.contributions[0]?.knob).toBe('MYSTERE');
    expect(w?.contributions[0]?.delta).toBeGreaterThan(0);
  });

  it('INV-MIX-006 — étage A INVIOLABLE : un inéligible ne gagne JAMAIS, même parfait pour le potard', () => {
    const withIneligible: readonly MixerCandidate[] = [
      ...SCENE,
      mk('tendu-inéligible', 'Menace, frappe, exige, cogne, brise, hurle, sang, brusquement, soudain, il étrangle, fracasse, gifle, plaie, cœur qui bat.', 200, false),
    ];
    const r = mixedSelect(withIneligible, { TENSION: 1, VIOLENCE: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.winner).not.toBe('tendu-inéligible');
    expect(r.value.ranked.find((c) => c.id === 'tendu-inéligible')).toBeUndefined();
  });

  it('ADV — réglage hors borne = erreur typée ; zéro éligible = erreur typée', () => {
    const bad = mixedSelect(SCENE, { TENSION: 2 });
    expect(!bad.ok && bad.error.code === 'INVALID_SETTING').toBe(true);
    const none = mixedSelect(SCENE.map((c) => ({ ...c, eligible: false })), { TENSION: 1 });
    expect(!none.ok && none.error.code === 'NO_ELIGIBLE_CANDIDATES').toBe(true);
  });

  it('P-MIX-001 — déterminisme : double appel = résultat identique (JSON)', () => {
    for (const settings of [{ TENSION: 0.5 }, { ROMANCE: -0.7, ESPOIR: 0.3 }, { MYSTERE: 1, VIOLENCE: -1 }]) {
      expect(JSON.stringify(mixedSelect(SCENE, settings))).toBe(JSON.stringify(mixedSelect(SCENE, settings)));
    }
  });

  it('INV-MIX-007 — les 5 potards et SEULEMENT eux (VISION:282 — anti-inflation)', () => {
    expect([...KNOB_IDS].sort()).toEqual(['ESPOIR', 'MYSTERE', 'ROMANCE', 'TENSION', 'VIOLENCE']);
    expect(Object.keys(KNOB_BINDINGS).length).toBe(5);
  });
});
