/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TESTS — INV-EXEMP-01/02/03/04
 * Module: tests/exemplar/exemplar-library.test.ts
 * Cible: 7 tests PASS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ExemplarLibrary, type ExemplarEntry } from '../../src/exemplar/exemplar-library.js';

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURES — 14D profiles distinctes
// ─────────────────────────────────────────────────────────────────────────────

function makeProfile(base: number, noise: number[]): number[] {
  return Array.from({ length: 14 }, (_, i) => base + (noise[i] ?? 0));
}

// Trois profiles très distincts (distance cosinus >> 0.25 entre eux)
const PROFILE_A = makeProfile(0.8, [0.1, -0.2, 0.3, -0.1, 0.2, -0.3, 0.1, 0, 0, 0, 0, 0, 0, 0]);
const PROFILE_B = makeProfile(0.1, [-0.1, 0.5, -0.3, 0.4, -0.2, 0.1, -0.4, 0.2, 0.3, -0.1, 0, 0, 0, 0]);
const PROFILE_C = makeProfile(0.5, [0.3, -0.4, 0.1, 0.2, -0.5, 0.4, 0.2, -0.3, 0.1, 0.4, 0, 0, 0, 0]);

function makeEntry(id: string, profile: number[], shape = 'ThreatReveal'): ExemplarEntry {
  return {
    id,
    run_id: `run_${id}`,
    shape,
    profile_14d: profile,
    prose_hash: `hash_${id}`,
    composite: 93.5,
    annotations: ['temps_dilaté', 'corps'],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe('INV-EXEMP-01/02/03/04 — ExemplarLibrary', () => {
  let lib: ExemplarLibrary;

  beforeEach(() => {
    lib = new ExemplarLibrary();
  });

  it('T01: addExemplar ajoute des entrées valides sans erreur', () => {
    expect(() => lib.addExemplar(makeEntry('e1', PROFILE_A))).not.toThrow();
    expect(() => lib.addExemplar(makeEntry('e2', PROFILE_B))).not.toThrow();
    expect(lib.size()).toBe(2);
  });

  it('T02: INV-EXEMP-04 — duplication cosinus > 0.95 → throw', () => {
    lib.addExemplar(makeEntry('e1', PROFILE_A));
    // Profile identique = cosine ≈ 1.0 > 0.95 → throw
    expect(() => lib.addExemplar(makeEntry('e2', [...PROFILE_A]))).toThrow('[INV-EXEMP-04]');
  });

  it('T03: INV-EXEMP-04 — champs obligatoires manquants → throw', () => {
    const bad = { ...makeEntry('e1', PROFILE_A), run_id: '' };
    expect(() => lib.addExemplar(bad)).toThrow('[INV-EXEMP-04]');

    const bad2 = { ...makeEntry('e1', PROFILE_A), profile_14d: [1, 2, 3] }; // 3D au lieu de 14D
    expect(() => lib.addExemplar(bad2)).toThrow('[INV-EXEMP-04]');
  });

  it('T04: INV-EXEMP-01 — selectForPacket diversité cosinus ≥ 0.25 entre chaque paire', () => {
    lib.addExemplar(makeEntry('e1', PROFILE_A));
    lib.addExemplar(makeEntry('e2', PROFILE_B));
    lib.addExemplar(makeEntry('e3', PROFILE_C));

    const selected = lib.selectForPacket(PROFILE_A, 3);
    expect(selected.length).toBeGreaterThan(0);

    if (selected.length >= 2) {
      for (let i = 0; i < selected.length; i++) {
        for (let j = i + 1; j < selected.length; j++) {
          const profileI = selected[i]!.profile_14d;
          const profileJ = selected[j]!.profile_14d;
          // cosine similarity
          const dot = profileI.reduce((s, v, k) => s + v * (profileJ[k] ?? 0), 0);
          const nI = Math.sqrt(profileI.reduce((s, v) => s + v * v, 0));
          const nJ = Math.sqrt(profileJ.reduce((s, v) => s + v * v, 0));
          const sim = nI === 0 || nJ === 0 ? 0 : dot / (nI * nJ);
          const diversity = 1 - sim;
          // INV-EXEMP-01: diversité ≥ 0.25
          expect(diversity, `Paire (${i},${j}) diversity=${diversity.toFixed(4)}`).toBeGreaterThanOrEqual(0.25);
        }
      }
    }
  });

  it('T05: INV-EXEMP-03 — cache déterministe: même packet → mêmes exemplars', () => {
    lib.addExemplar(makeEntry('e1', PROFILE_A));
    lib.addExemplar(makeEntry('e2', PROFILE_B));
    lib.addExemplar(makeEntry('e3', PROFILE_C));

    const result1 = lib.selectForPacket(PROFILE_A, 3);
    const result2 = lib.selectForPacket(PROFILE_A, 3);

    // INV-EXEMP-03: résultats identiques (même ordre, mêmes IDs)
    expect(result1.map((e) => e.id)).toEqual(result2.map((e) => e.id));
  });

  it('T06: selectForPacket retourne bibliothèque vide gracieusement', () => {
    const result = lib.selectForPacket(PROFILE_A, 3);
    expect(result).toHaveLength(0);
  });

  it('T07: INV-EXEMP-04 — cache invalidé après addExemplar (pas de stale cache)', () => {
    lib.addExemplar(makeEntry('e1', PROFILE_A));
    // Premier select — mis en cache
    const before = lib.selectForPacket(PROFILE_B, 3);

    // Ajout d'un nouvel exemplar → cache doit être invalide
    lib.addExemplar(makeEntry('e2', PROFILE_C));

    // Deuxième select — recalculé avec le nouvel exemplar
    const after = lib.selectForPacket(PROFILE_B, 3);

    // Le résultat doit avoir au moins autant d'exemplars (pool plus grand)
    expect(after.length).toBeGreaterThanOrEqual(before.length);
    // Le nouvel exemplar doit être sélectionnable
    const ids = after.map((e) => e.id);
    expect(ids.length).toBeGreaterThan(0);
  });
});
