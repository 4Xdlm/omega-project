/**
 * Tests for delta-computer — Sprint S0-B
 * Invariants: INV-S-ORACLE-01, INV-S-EMOTION-01, INV-S-TENSION-01
 */

import { describe, it, expect } from 'vitest';
import { computeDelta } from '../../src/delta/delta-computer.js';
import { createTestPacket } from '../helpers/test-packet-factory.js';
import { PROSE_GOOD } from '../fixtures/mock-prose.js';
import { SOVEREIGN_CONFIG } from '../../src/config.js';
import type { DeltaComputerInput } from '../../src/delta/delta-computer.js';

const packet = createTestPacket();

const baseInput: DeltaComputerInput = {
  packet,
  prose: PROSE_GOOD,
};

describe('computeDelta', () => {
  it('T01: retourne DeltaComputerOutput valide', () => {
    const output = computeDelta(baseInput);

    expect(output).toHaveProperty('report');
    expect(output).toHaveProperty('report_hash');
    expect(output).toHaveProperty('global_distance');
    expect(output).toHaveProperty('needs_correction');
    expect(output.report_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(typeof output.global_distance).toBe('number');
    expect(typeof output.needs_correction).toBe('boolean');
    expect(output.report.report_id).toBe(`DELTA_${packet.scene_id}_${packet.run_id}`);
  });

  it('T02: needs_correction = true si global_distance > seuil', () => {
    const output = computeDelta(baseInput);

    if (output.global_distance > SOVEREIGN_CONFIG.DELTA_THRESHOLD) {
      expect(output.needs_correction).toBe(true);
    } else {
      expect(output.needs_correction).toBe(false);
    }
  });

  it('T03: needs_correction = false si global_distance <= seuil', () => {
    const output = computeDelta(baseInput);
    const expected = output.global_distance > SOVEREIGN_CONFIG.DELTA_THRESHOLD;
    expect(output.needs_correction).toBe(expected);
  });

  it('T04: déterminisme — même input → même output', () => {
    const output1 = computeDelta(baseInput);
    const output2 = computeDelta(baseInput);

    expect(output1.report_hash).toBe(output2.report_hash);
    expect(output1.global_distance).toBe(output2.global_distance);
    expect(output1.needs_correction).toBe(output2.needs_correction);
    expect(output1.report.emotion_delta).toEqual(output2.report.emotion_delta);
    expect(output1.report.tension_delta).toEqual(output2.report.tension_delta);
    expect(output1.report.style_delta).toEqual(output2.report.style_delta);
    expect(output1.report.cliche_delta).toEqual(output2.report.cliche_delta);
  });

  it('T05: MÉTAMORPHIQUE — idempotence computeDelta', () => {
    const output1 = computeDelta(baseInput);
    const output2 = computeDelta(baseInput);
    const output3 = computeDelta(baseInput);

    expect(output1.report_hash).toBe(output2.report_hash);
    expect(output2.report_hash).toBe(output3.report_hash);
    expect(output1.global_distance).toBe(output3.global_distance);
    expect(output1.needs_correction).toBe(output3.needs_correction);
  });
});
