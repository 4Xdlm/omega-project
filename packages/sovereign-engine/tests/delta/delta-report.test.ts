/**
 * Tests for delta-report — Sprint S0-B
 * Invariant: INV-S-ORACLE-01 (même packet + même prose → même report_hash)
 */

import { describe, it, expect } from 'vitest';
import { generateDeltaReport } from '../../src/delta/delta-report.js';
import { createTestPacket } from '../helpers/test-packet-factory.js';
import { PROSE_GOOD } from '../fixtures/mock-prose.js';

const packet = createTestPacket();

describe('generateDeltaReport', () => {
  it('T01: retourne DeltaReport valide (tous champs présents)', () => {
    const report = generateDeltaReport(packet, PROSE_GOOD);

    expect(report).toHaveProperty('report_id');
    expect(report).toHaveProperty('report_hash');
    expect(report).toHaveProperty('scene_id');
    expect(report).toHaveProperty('timestamp');
    expect(report).toHaveProperty('emotion_delta');
    expect(report).toHaveProperty('tension_delta');
    expect(report).toHaveProperty('style_delta');
    expect(report).toHaveProperty('cliche_delta');
    expect(report).toHaveProperty('global_distance');
    expect(report).toHaveProperty('physics_delta');
    expect(report).toHaveProperty('prescriptions_delta');
  });

  it('T02: report_hash est SHA-256 valide 64 hex', () => {
    const report = generateDeltaReport(packet, PROSE_GOOD);
    expect(report.report_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('T03: même packet + même prose → même report_hash [INV-S-ORACLE-01]', () => {
    const report1 = generateDeltaReport(packet, PROSE_GOOD);
    const report2 = generateDeltaReport(packet, PROSE_GOOD);
    expect(report1.report_hash).toBe(report2.report_hash);
  });

  it('T04: report_id = DELTA_{scene_id}_{run_id} (déterministe)', () => {
    const report = generateDeltaReport(packet, PROSE_GOOD);
    expect(report.report_id).toBe(`DELTA_${packet.scene_id}_${packet.run_id}`);
  });

  it('T05: timestamp présent mais ABSENT du hash', () => {
    const report1 = generateDeltaReport(packet, PROSE_GOOD);
    const report2 = generateDeltaReport(packet, PROSE_GOOD);
    expect(report1.timestamp).toBeDefined();
    expect(typeof report1.timestamp).toBe('string');
    expect(report1.timestamp.length).toBeGreaterThan(0);
    expect(report1.report_hash).toBe(report2.report_hash);
  });

  it('T06: global_distance dans [0, 1]', () => {
    const report = generateDeltaReport(packet, PROSE_GOOD);
    expect(report.global_distance).toBeGreaterThanOrEqual(0);
    expect(report.global_distance).toBeLessThanOrEqual(1);
  });

  it('T07: MÉTAMORPHIQUE — prose avec espaces supplémentaires normalisés → même hash', () => {
    const proseExtraSpaces = PROSE_GOOD.replace(/ /g, '  ');
    const report1 = generateDeltaReport(packet, PROSE_GOOD);
    const report2 = generateDeltaReport(packet, proseExtraSpaces);
    expect(report1.report_hash).toBe(report2.report_hash);
  });

  it('T08: MÉTAMORPHIQUE — idempotence — appel 2× même input → même report', () => {
    const report1 = generateDeltaReport(packet, PROSE_GOOD);
    const report2 = generateDeltaReport(packet, PROSE_GOOD);

    expect(report1.report_id).toBe(report2.report_id);
    expect(report1.report_hash).toBe(report2.report_hash);
    expect(report1.global_distance).toBe(report2.global_distance);
    expect(report1.emotion_delta).toEqual(report2.emotion_delta);
    expect(report1.tension_delta).toEqual(report2.tension_delta);
    expect(report1.style_delta).toEqual(report2.style_delta);
    expect(report1.cliche_delta).toEqual(report2.cliche_delta);
  });

  it('T09: packet différent (scene_id) → report_hash différent', () => {
    const packet2 = { ...createTestPacket(), scene_id: 'SCENE_TEST_002', run_id: 'RUN_TEST_002' };
    const report1 = generateDeltaReport(packet, PROSE_GOOD);
    const report2 = generateDeltaReport(packet2, PROSE_GOOD);

    expect(report1.report_hash).not.toBe(report2.report_hash);
    expect(report1.report_id).not.toBe(report2.report_id);
  });

  it('T10: global_distance reflète les sous-deltas (emotion×0.4 + tension×0.3 + style×0.2 + cliche×0.1)', () => {
    const report = generateDeltaReport(packet, PROSE_GOOD);

    const emotionDist = 1 - report.emotion_delta.curve_correlation;
    const tensionDist = 1 - report.tension_delta.slope_match * report.tension_delta.monotony_score;
    const styleDist = report.style_delta.gini_delta + (1 - report.style_delta.signature_hit_rate);
    const clicheDist = Math.min(1, report.cliche_delta.total_matches / 10);

    const expected =
      0.4 * emotionDist +
      0.3 * tensionDist +
      0.2 * styleDist +
      0.1 * clicheDist;

    expect(report.global_distance).toBeCloseTo(expected, 10);
  });
});
