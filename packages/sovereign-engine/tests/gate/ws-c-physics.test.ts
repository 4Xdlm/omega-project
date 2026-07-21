/**
 * Tests — WS-C EMOTION PHYSICS (L0/L1 coeur) + GARDE IMPORT GARAGE.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  measureExtract, emotion01, fidelities, auc, shuffleQuartiles,
  type PhysicsContract,
} from '../../src/gate/emotional/ws-c-physics.js';

const C: PhysicsContract = { id: 't', X: [0, 0.1, 0.2, 0.3], Y: [0.2, 0.4, 0.7, 0.9], ruptureQ: null, lambda: 0 };
const Q: [string, string, string, string] = [
  'Le port dormait sous une pluie grise et calme, tranquille.',
  'Un bruit sourd monta, inquietant, puis la peur gagna la ruelle sombre.',
  'La panique explosa, cris et sang, la terreur absolue partout maintenant.',
  'Le hurlement dechira la nuit, horreur, effroi, chaos et fureur totale enfin.',
];

describe('GARDE IMPORT GARAGE (FORBID-CANON-GARAGE-001)', () => {
  it('ws-c-physics.ts n_importe AUCUN module gare', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(here, '../../src/gate/emotional/ws-c-physics.ts'), 'utf8');
    const importLines = src.split('\n').filter((l) => /^\s*import\s/.test(l)).join('\n');
    for (const forbidden of ['target_14d', 'scoreTension14D', 'analyzeEmotionFromText', 'deriveEmotionContract', 'omega-forge', 'tension-14d', 'semantic-analyzer']) {
      expect(importLines.includes(forbidden)).toBe(false);
    }
    // seul import externe autorise = features.ts
    expect(importLines.includes('detector/features')).toBe(true);
  });
});

describe('auc', () => {
  it('separation parfaite = 1, aucune = 0.5', () => {
    expect(auc([3, 4, 5], [0, 1, 2])).toBeCloseTo(1, 10);
    expect(auc([1, 1, 1], [1, 1, 1])).toBeCloseTo(0.5, 10);
    expect(auc([0, 1, 2], [3, 4, 5])).toBeCloseTo(0, 10);
  });
});

describe('emotion01 / fidelities', () => {
  it('sont dans [0,1] et deterministes', () => {
    const m = measureExtract(Q);
    const e1 = emotion01(m, C); const e2 = emotion01(m, C);
    expect(e1).toEqual(e2);
    for (const v of [e1.C1, e1.C2, e1.C3]) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
    const f = fidelities(m, C);
    for (const v of Object.values(f)) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
  });
  it('un texte a arousal croissant matche mieux un contrat croissant que decroissant (fid_shape)', () => {
    const m = measureExtract(Q); // Q monte en intensite emotionnelle
    const rise = fidelities(m, C).fid_shape;
    const fall = fidelities(m, { ...C, Y: [0.9, 0.7, 0.4, 0.2] }).fid_shape;
    expect(rise).toBeGreaterThanOrEqual(fall);
  });
});

describe('shuffleQuartiles', () => {
  it('permute (non identite) et reste une permutation', () => {
    const s = shuffleQuartiles([0, 1, 2, 3], 0);
    expect(s).not.toEqual([0, 1, 2, 3]);
    expect([...s].sort()).toEqual([0, 1, 2, 3]);
  });
});
