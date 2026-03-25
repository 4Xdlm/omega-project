/**
 * Tests for Duel Engine (offline deterministic)
 * Sprint S2 — TDD
 */

import { describe, it, expect } from 'vitest';
import { duelProses, computeCVSent } from '../../src/duel/duel-engine.js';
import type { OfflineDuelResult } from '../../src/duel/duel-engine.js';
import { createTestPacket } from '../helpers/test-packet-factory.js';
import { PROSE_GOOD, PROSE_BAD } from '../fixtures/mock-prose.js';

const packet = createTestPacket();

describe('Duel Engine (offline)', () => {
  it('T01: duelProses retourne OfflineDuelResult avec winner', () => {
    const result = duelProses(PROSE_GOOD, PROSE_BAD, packet, 'SEED_001');

    expect(result.winner).toBeTruthy();
    expect(result.winner_index === 0 || result.winner_index === 1).toBe(true);
    expect(result.scores).toHaveLength(2);
  });

  it('T02: déterminisme — même prose_a + prose_b + seed → même winner [INV-S-DUEL-01]', () => {
    const r1 = duelProses(PROSE_GOOD, PROSE_BAD, packet, 'SEED_DET');
    const r2 = duelProses(PROSE_GOOD, PROSE_BAD, packet, 'SEED_DET');
    const r3 = duelProses(PROSE_GOOD, PROSE_BAD, packet, 'SEED_DET');

    expect(r1.winner_index).toBe(r2.winner_index);
    expect(r2.winner_index).toBe(r3.winner_index);
    expect(r1.winner_hash).toBe(r2.winner_hash);
  });

  it('T03: duel_trace contient scores des 2 proses', () => {
    const result = duelProses(PROSE_GOOD, PROSE_BAD, packet, 'SEED_003');

    expect(result.duel_trace).toContain('score_a');
    expect(result.duel_trace).toContain('score_b');
  });

  it('T04: winner_hash SHA-256', () => {
    const result = duelProses(PROSE_GOOD, PROSE_BAD, packet, 'SEED_004');

    expect(result.winner_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('T05: MÉTAMORPHIQUE — swapper prose_a et prose_b → winner_index change en miroir', () => {
    const r1 = duelProses(PROSE_GOOD, PROSE_BAD, packet, 'SEED_META');
    const r2 = duelProses(PROSE_BAD, PROSE_GOOD, packet, 'SEED_META');

    // Same winner prose, but at different index
    if (r1.winner_index === 0) {
      expect(r2.winner_index).toBe(1);
    } else {
      expect(r2.winner_index).toBe(0);
    }
  });
});

// ── CV Gate Tests ─────────────────────────────────────────────────────────────

describe('CV Gate (computeCVSent)', () => {
  it('computeCVSent calcule correctement le CV', () => {
    // 3 sentences of equal length → CV ≈ 0
    const uniform = 'Un deux trois quatre. Un deux trois quatre. Un deux trois quatre.';
    expect(computeCVSent(uniform)).toBeLessThan(0.1);
  });

  it('CV Gate PASS pour prose avec CV < 1.05', () => {
    // Sentences of similar lengths → low CV
    const prose = 'Les murs de pierre gardaient la fraîcheur du matin. Elle posa sa tasse sur la table en bois massif. Le silence occupait chaque recoin de la pièce.';
    const cv = computeCVSent(prose);
    expect(cv).toBeLessThanOrEqual(1.05);
  });

  it('CV Gate REJECT pour prose avec CV > 1.05', () => {
    // One 1-word sentence + one very long → extreme CV
    const prose = 'Non. Oui. Elle traversa la pièce en longueur ses pas résonnant sur le carrelage froid tandis que le vent faisait claquer les volets de la cuisine contre les murs de pierre recouverts de lierre et que les dernières lueurs du crépuscule filtraient à travers les rideaux usés de la fenêtre donnant sur le jardin abandonné depuis des mois où personne ne venait plus jamais.';
    const cv = computeCVSent(prose);
    expect(cv).toBeGreaterThan(1.05);
  });

  it('computeCVSent retourne 0 pour prose sans phrases', () => {
    expect(computeCVSent('')).toBe(0);
    expect(computeCVSent('mot unique')).toBe(0);
  });
});
