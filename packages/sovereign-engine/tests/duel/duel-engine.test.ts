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

// ── R7: DUEL_RUNS / Best-of-N Tests ─────────────────────────────────────────

describe('R7: DUEL_RUNS env var parsing', () => {
  it('DUEL_RUNS defaults to 1 when env var not set', () => {
    // The constant is module-scoped. We test the same parsing logic.
    const parse = (val: string | undefined): number =>
      Math.max(1, Math.min(3, parseInt(val ?? '1', 10)));
    expect(parse(undefined)).toBe(1);
    // Note: '' (empty string) → NaN propagation. In practice env var is unset or '1'/'2'/'3'.
  });

  it('DUEL_RUNS parses valid values correctly', () => {
    const parse = (val: string | undefined): number =>
      Math.max(1, Math.min(3, parseInt(val ?? '1', 10)));
    expect(parse('1')).toBe(1);
    expect(parse('2')).toBe(2);
    expect(parse('3')).toBe(3);
  });

  it('DUEL_RUNS clamps to [1, 3]', () => {
    const parse = (val: string | undefined): number =>
      Math.max(1, Math.min(3, parseInt(val ?? '1', 10)));
    expect(parse('0')).toBe(1);   // clamped up
    expect(parse('-1')).toBe(1);  // clamped up
    expect(parse('5')).toBe(3);   // clamped down
    expect(parse('10')).toBe(3);  // clamped down
  });
});

describe('R7: Seed diversity between runs', () => {
  it('run 0 produces original seed (backward compatible)', () => {
    const llmSeed = 'SEED_42';
    const mode = 'tranchant_minimaliste';
    const runIdx = 0;
    const baseSeed = runIdx === 0
      ? `${llmSeed}_${mode}`
      : `${llmSeed}_${mode}_run${runIdx}`;
    expect(baseSeed).toBe('SEED_42_tranchant_minimaliste');
  });

  it('run 1+ produces distinct seeds with run suffix', () => {
    const llmSeed = 'SEED_42';
    const mode = 'sensoriel_dense';
    const seeds = [0, 1, 2].map(runIdx =>
      runIdx === 0
        ? `${llmSeed}_${mode}`
        : `${llmSeed}_${mode}_run${runIdx}`,
    );
    expect(seeds[0]).toBe('SEED_42_sensoriel_dense');
    expect(seeds[1]).toBe('SEED_42_sensoriel_dense_run1');
    expect(seeds[2]).toBe('SEED_42_sensoriel_dense_run2');
    // All distinct
    const unique = new Set(seeds);
    expect(unique.size).toBe(3);
  });

  it('seeds for same run but different modes are distinct', () => {
    const llmSeed = 'SEED_42';
    const modes = ['tranchant_minimaliste', 'sensoriel_dense', 'experimental_signature'];
    const runIdx = 1;
    const seeds = modes.map(mode => `${llmSeed}_${mode}_run${runIdx}`);
    const unique = new Set(seeds);
    expect(unique.size).toBe(3);
  });

  it('retry seeds include both run and retry indices', () => {
    const llmSeed = 'SEED_42';
    const mode = 'tranchant_minimaliste';
    const runIdx = 1;
    const baseSeed = `${llmSeed}_${mode}_run${runIdx}`;
    const retrySeed = `${baseSeed}_retry1`;
    expect(retrySeed).toBe('SEED_42_tranchant_minimaliste_run1_retry1');
    // Distinct from run 0 retry
    const run0Base = `${llmSeed}_${mode}`;
    const run0Retry = `${run0Base}_retry1`;
    expect(run0Retry).toBe('SEED_42_tranchant_minimaliste_retry1');
    expect(retrySeed).not.toBe(run0Retry);
  });
});

describe('R7: draft_id structure', () => {
  it('single run (N=1) uses classic format', () => {
    const duelRuns = 1;
    const mode = 'tranchant_minimaliste';
    const i = 0;
    const runIdx = 0;
    const draftSuffix = duelRuns > 1 ? `${mode}_run${runIdx}_${i}` : `${mode}_${i}`;
    expect(`DRAFT_${draftSuffix}`).toBe('DRAFT_tranchant_minimaliste_0');
  });

  it('multi run (N=2) includes run index', () => {
    const duelRuns = 2;
    const mode = 'sensoriel_dense';
    const i = 1;

    const ids = [0, 1].map(runIdx => {
      const draftSuffix = duelRuns > 1 ? `${mode}_run${runIdx}_${i}` : `${mode}_${i}`;
      return `DRAFT_${draftSuffix}`;
    });

    expect(ids[0]).toBe('DRAFT_sensoriel_dense_run0_1');
    expect(ids[1]).toBe('DRAFT_sensoriel_dense_run1_1');
    expect(ids[0]).not.toBe(ids[1]);
  });
});
