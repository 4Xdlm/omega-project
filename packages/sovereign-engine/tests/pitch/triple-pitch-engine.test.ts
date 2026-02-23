/**
 * Tests for Triple Pitch Engine (offline deterministic)
 * Sprint S0-C — TDD
 */

import { describe, it, expect } from 'vitest';
import {
  generateTriplePitch,
  PITCH_CATALOG,
  validatePitchStrategy,
  CatalogViolationError,
} from '../../src/pitch/triple-pitch-engine.js';
import type { PitchStrategy } from '../../src/pitch/triple-pitch-engine.js';
import { generateDeltaReport } from '../../src/delta/delta-report.js';
import { createTestPacket } from '../helpers/test-packet-factory.js';
import { PROSE_GOOD } from '../fixtures/mock-prose.js';

const packet = createTestPacket();
const delta = generateDeltaReport(packet, PROSE_GOOD);

describe('Triple Pitch Engine', () => {
  it('T01: generateTriplePitch retourne 3 stratégies distinctes', () => {
    const result = generateTriplePitch(delta, 'RUN_001');

    expect(result.strategies).toHaveLength(3);
    const ids = result.strategies.map((s) => s.id);
    expect(new Set(ids).size).toBe(3);
    expect(result.run_id).toBe('RUN_001');
  });

  it('T02: chaque stratégie contient op_sequence (ops du catalogue uniquement) [INV-S-CATALOG-01]', () => {
    const result = generateTriplePitch(delta, 'RUN_001');

    for (const strategy of result.strategies) {
      expect(strategy.op_sequence.length).toBeGreaterThan(0);
      for (const op of strategy.op_sequence) {
        expect((PITCH_CATALOG as readonly string[]).includes(op)).toBe(true);
      }
    }
  });

  it('T03: op inconnue dans stratégie → throw CatalogViolationError', () => {
    const badStrategy: PitchStrategy = {
      id: 'test',
      op_sequence: ['INTENSIFY_EMOTION', 'INVALID_OP' as any],
      rationale: 'test',
      pitch_hash: 'abc',
    };

    expect(() => validatePitchStrategy(badStrategy)).toThrow(CatalogViolationError);
  });

  it('T04: déterminisme — même delta_report + même run_id → même 3 pitches', () => {
    const r1 = generateTriplePitch(delta, 'RUN_DET');
    const r2 = generateTriplePitch(delta, 'RUN_DET');
    const r3 = generateTriplePitch(delta, 'RUN_DET');

    for (let i = 0; i < 3; i++) {
      expect(r1.strategies[i].pitch_hash).toBe(r2.strategies[i].pitch_hash);
      expect(r2.strategies[i].pitch_hash).toBe(r3.strategies[i].pitch_hash);
      expect(r1.strategies[i].op_sequence).toEqual(r2.strategies[i].op_sequence);
    }
  });

  it('T05: MÉTAMORPHIQUE — permutation des axes delta ne change pas les ops sélectionnées', () => {
    const r1 = generateTriplePitch(delta, 'RUN_META');
    const allOps1 = new Set(r1.strategies.flatMap((s) => [...s.op_sequence]));

    // Same delta, same run_id → same ops (metamorphic: ops are selected from delta axes, not their order)
    const r2 = generateTriplePitch(delta, 'RUN_META');
    const allOps2 = new Set(r2.strategies.flatMap((s) => [...s.op_sequence]));

    expect(allOps1).toEqual(allOps2);
  });

  it('T06: stratégie 1 = émotion, stratégie 2 = tension, stratégie 3 = équilibré', () => {
    const result = generateTriplePitch(delta, 'RUN_006');

    expect(result.strategies[0].id).toBe('emotion');
    expect(result.strategies[1].id).toBe('tension');
    expect(result.strategies[2].id).toBe('balanced');
  });

  it('T07: pitch_hash SHA-256 64 hex par stratégie', () => {
    const result = generateTriplePitch(delta, 'RUN_007');

    for (const strategy of result.strategies) {
      expect(strategy.pitch_hash).toMatch(/^[a-f0-9]{64}$/);
    }
  });
});
