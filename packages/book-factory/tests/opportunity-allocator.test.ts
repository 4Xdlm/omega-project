/**
 * INV-ALLOC-01..05 — le plafond est un plafond, l'allocation est déterministe.
 * Spec ChatGPT ratifiée 2026-08-03 (lève le HOLD sur le branchement).
 */
import { describe, it, expect } from 'vitest';
import { allocateOpportunities, stableHash } from '../src/scribe/opportunity-allocator.js';
import { MemoryPack } from '../src/scribe/candidate-pack.js';
import { freezeCandidate } from '../src/scribe/candidate-pack.js';

function scene(chapterIndex: number, eligible: boolean, affinity: number) {
  return { chapterIndex, eligible, affinity };
}

describe('INV-ALLOC-01 — le cas exact de la spec', () => {
  it('20 éligibles × 0,50 = budget 10, mais 6 justifiées → 6 ouvertes, pas 10 forcées', () => {
    const scenes = [
      ...Array.from({ length: 6 }, (_, i) => scene(i + 1, true, 0.8)),
      ...Array.from({ length: 14 }, (_, i) => scene(i + 7, true, 0)), // éligibles mais sans justification
    ];
    const r = allocateOpportunities(scenes, 0.5, 'livre-test');
    expect(r.budget).toBe(10);
    expect(r.opened).toHaveLength(6);
    expect(r.journal.filter((j) => j.reason === 'NO_NARRATIVE_JUSTIFICATION')).toHaveLength(14);
  });
});

describe('INV-ALLOC-02 — une scène inéligible n’est JAMAIS ouverte', () => {
  it('même avec une affinité maximale et un budget libre', () => {
    const r = allocateOpportunities([scene(1, false, 1), scene(2, true, 0.5)], 1, 's');
    expect(r.opened).toEqual([2]);
    expect(r.journal[0]?.reason).toBe('NOT_ELIGIBLE');
  });
});

describe('INV-ALLOC-03 — déterminisme total', () => {
  const scenes = Array.from({ length: 12 }, (_, i) => scene(i + 1, true, 0.5));

  it('même seed → même allocation, deux fois', () => {
    const a = allocateOpportunities(scenes, 0.4, 'seed-A');
    const b = allocateOpportunities(scenes, 0.4, 'seed-A');
    expect(a.opened).toEqual(b.opened);
  });

  it('seed différent → départage différent (à affinités égales)', () => {
    const a = allocateOpportunities(scenes, 0.4, 'seed-A');
    const c = allocateOpportunities(scenes, 0.4, 'seed-B');
    expect(a.opened).not.toEqual(c.opened); // 12 scènes à égalité : le hash départage
  });

  it('le hash est stable (pas de dépendance à l’environnement)', () => {
    expect(stableHash('livre:5')).toBe(stableHash('livre:5'));
    expect(stableHash('livre:5')).not.toBe(stableHash('livre:6'));
  });
});

describe('INV-ALLOC-04 — l’affinité prime, le hash ne fait que départager', () => {
  it('les scènes les plus adéquates gagnent le budget', () => {
    const scenes = [scene(1, true, 0.9), scene(2, true, 0.2), scene(3, true, 0.7), scene(4, true, 0.1)];
    const r = allocateOpportunities(scenes, 0.5, 's'); // budget 2
    expect(r.opened).toEqual([1, 3]);
    expect(r.journal.find((j) => j.chapterIndex === 2)?.reason).toBe('BUDGET_EXHAUSTED');
  });
});

describe('INV-ALLOC-05 — bornes', () => {
  it('plafond 0 → aucune ouverture ; plafond hors bornes → clampé', () => {
    const scenes = [scene(1, true, 1)];
    expect(allocateOpportunities(scenes, 0, 's').opened).toHaveLength(0);
    expect(allocateOpportunities(scenes, 7, 's').opened).toHaveLength(1);
    expect(allocateOpportunities([], 0.5, 's').budget).toBe(0);
  });
});

describe('INV-PACK-01 — le gel de candidat est fidèle', () => {
  it('hash + compte de mots + collecte mémoire', () => {
    const pack = new MemoryPack();
    const c = freezeCandidate({
      packId: 'p1',
      chapterIndex: 3,
      attempt: 1,
      candidateIndex: 0,
      prose: 'Une phrase de test ici.',
      seed: 42,
      model: 'gemma4:31b',
    });
    pack.sink(c);
    expect(c.sha256).toHaveLength(64);
    expect(c.words).toBe(5);
    expect(pack.ofChapter(3)).toHaveLength(1);
    expect(pack.ofChapter(4)).toHaveLength(0);
  });
});
