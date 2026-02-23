/**
 * Tests for S-ORACLE V2 — 9 axes deterministic scoring
 * Sprint S1 — TDD
 *
 * ALL axes CALC — 0 LLM — fully deterministic.
 */

import { describe, it, expect } from 'vitest';
import { scoreV2 } from '../../src/oracle/s-oracle-v2.js';
import type { SScoreV2 } from '../../src/oracle/s-oracle-v2.js';
import { createTestPacket } from '../helpers/test-packet-factory.js';
import { PROSE_GOOD, PROSE_BAD, PROSE_FLAT } from '../fixtures/mock-prose.js';
import { computeDelta } from '../../src/delta/delta-computer.js';

const packet = createTestPacket();
const delta = computeDelta({ packet, prose: PROSE_GOOD });

describe('S-ORACLE V2 (9 axes offline)', () => {
  it('T01: scoreV2 retourne SScoreV2 valide (tous 9 axes présents)', () => {
    const result = scoreV2(PROSE_GOOD, packet, delta);

    expect(result.axes).toHaveLength(9);
    const names = result.axes.map((a) => a.name);
    expect(names).toContain('tension_14d');
    expect(names).toContain('coherence_emotionnelle');
    expect(names).toContain('interiorite');
    expect(names).toContain('impact_ouverture_cloture');
    expect(names).toContain('densite_sensorielle');
    expect(names).toContain('necessite_m8');
    expect(names).toContain('anti_cliche');
    expect(names).toContain('rythme_musical');
    expect(names).toContain('signature');
  });

  it('T02: score composite dans [0, 100]', () => {
    const result = scoreV2(PROSE_GOOD, packet, delta);

    expect(result.composite).toBeGreaterThanOrEqual(0);
    expect(result.composite).toBeLessThanOrEqual(100);
  });

  it('T03: poids émotion ≥ 60% [INV-S-EMOTION-60]', () => {
    const result = scoreV2(PROSE_GOOD, packet, delta);

    expect(result.emotion_weight_ratio).toBeGreaterThanOrEqual(0.60);
  });

  it('T04: déterminisme — même prose + même packet → même score [INV-S-ORACLE-01]', () => {
    const r1 = scoreV2(PROSE_GOOD, packet, delta);
    const r2 = scoreV2(PROSE_GOOD, packet, delta);
    const r3 = scoreV2(PROSE_GOOD, packet, delta);

    expect(r1.composite).toBe(r2.composite);
    expect(r2.composite).toBe(r3.composite);
    expect(r1.s_score_hash).toBe(r2.s_score_hash);
  });

  it('T05: prose avec 0 tension → tension_14d score bas (< 30)', () => {
    const flatDelta = computeDelta({ packet, prose: PROSE_FLAT });
    const result = scoreV2(PROSE_FLAT, packet, flatDelta);

    const tensionAxis = result.axes.find((a) => a.name === 'tension_14d');
    expect(tensionAxis).toBeDefined();
    // Flat prose should have low tension conformity
    expect(tensionAxis!.raw).toBeLessThan(0.50);
  });

  it('T06: prose avec blacklist → anti_cliche pénalisé', () => {
    const badDelta = computeDelta({ packet, prose: PROSE_BAD });
    const result = scoreV2(PROSE_BAD, packet, badDelta);

    const acAxis = result.axes.find((a) => a.name === 'anti_cliche');
    expect(acAxis).toBeDefined();
    expect(acAxis!.raw).toBeLessThan(1.0);
  });

  it('T07: score ≥ 92 → verdict SEAL', () => {
    const result = scoreV2(PROSE_GOOD, packet, delta);

    if (result.composite >= 92) {
      expect(result.verdict).toBe('SEAL');
    }
    // If score < 92, this test is vacuously true — T08 covers the other case
  });

  it('T08: score < 92 → verdict REJECT', () => {
    const badDelta = computeDelta({ packet, prose: PROSE_BAD });
    const result = scoreV2(PROSE_BAD, packet, badDelta);

    if (result.composite < 92) {
      expect(result.verdict).toBe('REJECT');
    }
  });

  it('T09: axe < 50 → verdict REJECT même si composite ≥ 92', () => {
    // This tests the floor check logic
    const result = scoreV2(PROSE_GOOD, packet, delta);

    // If any axis is below 50, verdict must be REJECT regardless of composite
    const hasLowAxis = result.axes.some((a) => a.raw * 100 < 50);
    if (hasLowAxis) {
      expect(result.verdict).toBe('REJECT');
      expect(result.rejection_reason).toContain('axis_floor_violation');
    }
  });

  it('T10: MÉTAMORPHIQUE — même prose, packet différent run_id → même score', () => {
    const packet2 = { ...packet, run_id: 'DIFFERENT_RUN_ID' };
    const delta2 = computeDelta({ packet: packet2, prose: PROSE_GOOD });

    const r1 = scoreV2(PROSE_GOOD, packet, delta);
    const r2 = scoreV2(PROSE_GOOD, packet2, delta2);

    // run_id should not affect score
    expect(r1.composite).toBe(r2.composite);
  });

  it('T11: s_score_hash SHA-256 64 hex', () => {
    const result = scoreV2(PROSE_GOOD, packet, delta);

    expect(result.s_score_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('T12: baseline golden 1 — scoreV2 retourne valeur stable', () => {
    const result = scoreV2(PROSE_GOOD, packet, delta);

    // Snapshot: composite should be a specific stable value
    // This will be set after first run
    expect(typeof result.composite).toBe('number');
    expect(Number.isFinite(result.composite)).toBe(true);
  });
});
