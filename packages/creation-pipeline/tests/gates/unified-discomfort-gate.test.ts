/**
 * OMEGA Creation Pipeline — Unified Discomfort Gate Tests
 * Phase C.4 — Minimum friction per scene
 * 8 tests
 */

import { describe, it, expect } from 'vitest';
import { runUnifiedDiscomfortGate } from '../../src/gates/unified-discomfort-gate.js';
import {
  runPipeline, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
} from '../fixtures.js';

describe('UnifiedDiscomfortGate', () => {
  const snap = runPipeline(INTENT_PACK_A);

  it('friction present PASS — scenario A text contains friction markers', () => {
    const result = runUnifiedDiscomfortGate(
      snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(result.gate_id).toBe('U_DISCOMFORT');
    // Horror scenario text should contain friction: fear, dark, threat, etc.
    expect(result.verdict).toBe('PASS');
  });

  it('no friction FAIL — bland text with zero friction markers', () => {
    const blandParagraphs = snap.styleOutput.paragraphs.map((p) => ({
      ...p,
      text: 'The sun rose. Birds sang. Flowers bloomed. Everything was pleasant and calm and smooth.',
    }));
    const blandOutput = { ...snap.styleOutput, paragraphs: blandParagraphs };

    const result = runUnifiedDiscomfortGate(
      blandOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(result.verdict).toBe('FAIL');
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.metrics.scenes_with_friction).toBe(0);
  });

  it('per scene — each scene segment is checked independently', () => {
    const result = runUnifiedDiscomfortGate(
      snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(result.metrics.total_scenes).toBeGreaterThan(0);
    // With 50% threshold, PASS requires at least half the scenes to have friction
    if (result.verdict === 'PASS') {
      expect(result.metrics.scenes_with_friction).toBeGreaterThanOrEqual(
        Math.ceil(result.metrics.total_scenes * 0.5),
      );
    }
  });

  it('minimum — at least one scene must have friction', () => {
    const result = runUnifiedDiscomfortGate(
      snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    // Fiction text should always have some friction markers
    expect(result.metrics.scenes_with_friction).toBeGreaterThanOrEqual(1);
  });

  it('edge — text with exactly one friction word per scene', () => {
    // Create paragraphs where each scene segment has exactly one friction marker
    const edgeParas = snap.styleOutput.paragraphs.map((p, i) => ({
      ...p,
      text: i % 2 === 0
        ? 'The room was warm and bright, yet something lingered.'
        : 'Soft melodies played in the golden hall, despite the hour.',
    }));
    const edgeOutput = { ...snap.styleOutput, paragraphs: edgeParas };

    const result = runUnifiedDiscomfortGate(
      edgeOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    // "yet" and "despite" are friction markers
    expect(result.metrics.scenes_with_friction).toBeGreaterThan(0);
  });

  it('single scene — one segment evaluated', () => {
    const singlePara = [{
      ...snap.styleOutput.paragraphs[0],
      text: 'The keeper struggled against the howling wind, fear rising in his chest.',
    }];
    const singleOutput = { ...snap.styleOutput, paragraphs: singlePara };

    const result = runUnifiedDiscomfortGate(
      singleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(result.metrics.total_scenes).toBeGreaterThanOrEqual(1);
    // "struggled", "against", "fear" are friction markers
    expect(result.metrics.scenes_with_friction).toBeGreaterThanOrEqual(1);
    expect(result.verdict).toBe('PASS');
  });

  it('determinism — same input produces identical output', () => {
    const r1 = runUnifiedDiscomfortGate(
      snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    const r2 = runUnifiedDiscomfortGate(
      snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(r1.verdict).toBe(r2.verdict);
    expect(r1.metrics.total_scenes).toBe(r2.metrics.total_scenes);
    expect(r1.metrics.scenes_with_friction).toBe(r2.metrics.scenes_with_friction);
    expect(r1.metrics.friction_ratio).toBe(r2.metrics.friction_ratio);
    expect(r1.violations.length).toBe(r2.violations.length);
    expect(r1.timestamp_deterministic).toBe(r2.timestamp_deterministic);
  });

  it('metrics are present and correctly typed', () => {
    const result = runUnifiedDiscomfortGate(
      snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(typeof result.metrics.total_scenes).toBe('number');
    expect(typeof result.metrics.scenes_with_friction).toBe('number');
    expect(typeof result.metrics.friction_ratio).toBe('number');
    expect(result.metrics.friction_ratio).toBeGreaterThanOrEqual(0);
    expect(result.metrics.friction_ratio).toBeLessThanOrEqual(1);
    expect(result.timestamp_deterministic).toBe(TIMESTAMP);
  });
});
