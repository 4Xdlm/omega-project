/** OMEGA — C18 VARIATION_ENGINE V1 : MOTIF_REPULSION_FIELD (BF-08). */
import { describe, expect, it } from 'vitest';

import { MotifRepulsionField, isWeatherHead, normalizedHead } from '../src/variation/motif-repulsion.js';

const feed = (f: MotifRepulsionField, head: string, chapters: readonly number[]): void => {
  for (const c of chapters) {
    const r = f.observe({ kind: 'INCIPIT_HEAD', motif: head, chapter: c });
    expect(r.ok).toBe(true);
  }
};

describe('C18 — invariant combinatoire (loi dure, définition EMP-16 du clone)', () => {
  it('MRF-001 — 1re et 2e occurrences passent, la 3e est INTERDITE', () => {
    const f = new MotifRepulsionField();
    expect(f.evaluateIncipit('le sel collait aux', 3).verdict).toBe('OK');
    feed(f, 'le sel collait aux', [3]);
    expect(f.evaluateIncipit('le sel collait aux', 9).verdict).toBe('REPEAT_2ND');
    feed(f, 'le sel collait aux', [9]);
    expect(f.evaluateIncipit('le sel collait aux', 17).verdict).toBe('CLONE_3RD_FORBIDDEN');
  });

  it('MRF-002 — property : AUCUNE tête vue 0 ou 1 fois n\'est jamais interdite (200 tirages déterministes)', () => {
    const f = new MotifRepulsionField();
    for (let i = 0; i < 200; i += 1) {
      const head = `tete unique numero ${i}`;
      const v0 = f.evaluateIncipit(head, i + 1);
      expect(v0.verdict).toBe('OK');
      feed(f, head, [i + 1]);
      const v1 = f.evaluateIncipit(head, i + 2);
      expect(v1.verdict).toBe('REPEAT_2ND');
    }
  });

  it('MRF-003 — quota météo : 5 têtes météo admises, la 6e candidate est SATURÉE', () => {
    const f = new MotifRepulsionField();
    feed(f, 'la pluie battait les', [1]);
    feed(f, 'la brume couvrait le', [2]);
    feed(f, 'le vent sifflait sur', [3]);
    feed(f, 'le brouillard mangeait la', [4]);
    feed(f, "l'orage roulait au", [5]);
    expect(f.evaluateIncipit('la neige tombait sur', 6).verdict).toBe('WEATHER_SATURATED');
    expect(f.evaluateIncipit('garcia posa la lettre', 6).verdict).toBe('OK'); // non-météo intact
  });
});

describe('C18 — champ PID (pression continue, déterministe)', () => {
  it('MRF-004 — décomposition exacte : P seul, puis P+I, terme D nul en régime stable', () => {
    const f = new MotifRepulsionField({ gains: { kp: 1, ki: 0, kd: 0 }, window: 5 });
    feed(f, 'la peur', [1, 2, 3]); // kind INCIPIT pour simplicité du calcul
    // ρ_W(ch5) = 3 occurrences dans (0,5] / 5 = 0.6 → E = 0.6
    expect(f.energy('INCIPIT_HEAD', 'la peur', 5)).toBeCloseTo(0.6, 4);
    const g = new MotifRepulsionField({ gains: { kp: 1, ki: 1, kd: 0 }, window: 5 });
    feed(g, 'la peur', [1, 2, 3]);
    // + I : saturation = 3/5 = 0.6 → E = 0.6 + 0.6 = 1.2
    expect(g.energy('INCIPIT_HEAD', 'la peur', 5)).toBeCloseTo(1.2, 4);
  });

  it('MRF-005 — le terme DÉRIVÉ punit la tendance MONTANTE, pas la descente', () => {
    const up = new MotifRepulsionField({ gains: { kp: 0, ki: 0, kd: 1 }, window: 5 });
    feed(up, 'le silence', [7, 8, 9]); // fenêtre récente dense, précédente vide
    expect(up.energy('INCIPIT_HEAD', 'le silence', 10)).toBeGreaterThan(0);
    const down = new MotifRepulsionField({ gains: { kp: 0, ki: 0, kd: 1 }, window: 5 });
    feed(down, 'le silence', [1, 2, 3]); // dense AVANT, plus rien depuis
    expect(down.energy('INCIPIT_HEAD', 'le silence', 10)).toBe(0); // max(0, Δ<0)
  });

  it('MRF-006 — banned() : seuil franchi ⇒ listé ; motif froid ⇒ absent', () => {
    const f = new MotifRepulsionField({ gains: { kp: 1, ki: 0.5, kd: 0.5 }, window: 5 });
    for (const c of [1, 2, 3, 4]) { expect(f.observe({ kind: 'TIC', motif: 'il y a', chapter: c }).ok).toBe(true); }
    expect(f.observe({ kind: 'TIC', motif: 'le carnet', chapter: 1 }).ok).toBe(true);
    const banned = f.banned('TIC', 5, 0.9);
    expect(banned).toContain('il y a');
    expect(banned).not.toContain('le carnet');
  });
});

describe('C18 — directive compilée + contrat mode \'1\' (fallback A, ADR-003)', () => {
  it('MRF-007 — la directive n\'énonce que des INTERDITS et des faits (zéro coaching sémantique)', () => {
    const f = new MotifRepulsionField();
    feed(f, 'la cale sentait le', [2]);
    const d = f.compileVariationDirective(3);
    expect(d).toContain('INTERDIT d\'ouvrir');
    expect(d).toContain('la cale sentait le');
    expect(d).not.toMatch(/améliore|sois plus|ressens/iu); // pas de feedback Mode C
  });

  it('MRF-008 — filtre candidates : la cloneuse exclue, les saines admissibles', () => {
    const f = new MotifRepulsionField();
    feed(f, 'la pluie battait les', [1, 7]); // déjà ×2 → 3e interdite
    const candidates = [
      { prose: 'La pluie battait les vitres une fois de plus ce soir-là.' },
      { prose: 'Garcia posa la lettre cachetée devant Yvon sans un mot.' },
      { prose: 'Le registre était ouvert à la page des décès.' },
    ];
    const r = f.filterCandidatesByIncipit(candidates, 12);
    expect(r.fallbackAll).toBe(false);
    expect(r.admissible).toEqual([1, 2]);
    expect(r.verdicts[0]?.verdict).toBe('CLONE_3RD_FORBIDDEN');
  });

  it('MRF-009 — TOUTES violent ⇒ fallback A : indices intacts + flag (jamais de blocage muet)', () => {
    const f = new MotifRepulsionField();
    feed(f, 'la pluie battait les', [1, 7]);
    const candidates = [
      { prose: 'La pluie battait les volets.' },
      { prose: 'La pluie battait les quais du port.' },
    ];
    const r = f.filterCandidatesByIncipit(candidates, 12);
    expect(r.fallbackAll).toBe(true);
    expect(r.admissible).toEqual([0, 1]);
  });
});

describe('C18 — normalisation des têtes', () => {
  it('MRF-010 — définition verdict EMP-16 par défaut ; variante lettersOnly mesurable', () => {
    expect(normalizedHead('La Pluie battait les vitres de Ker-Morvan.')).toBe('la pluie battait les');
    expect(normalizedHead('— « Va-t\'en », dit-elle calmement.', false)).toBe('— « va-t\'en »,');
    // lettersOnly NE GARDE que les tokens porteurs de lettres (« — », « « », « », » exclus) :
    expect(normalizedHead('— « Va-t\'en », dit-elle calmement.', true)).toBe('va-t\'en dit-elle calmement.');
    expect(isWeatherHead('la pluie battait les')).toBe(true);
    expect(isWeatherHead('— la pluie battait')).toBe(true); // tiret de dialogue ignoré
    expect(isWeatherHead('garcia regardait la pluie')).toBe(false); // pas en TÊTE
  });
});
