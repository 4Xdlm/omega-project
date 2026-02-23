/**
 * Tests for Duel Engine (offline deterministic)
 * Sprint S2 — TDD
 */

import { describe, it, expect } from 'vitest';
import { duelProses } from '../../src/duel/duel-engine.js';
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
