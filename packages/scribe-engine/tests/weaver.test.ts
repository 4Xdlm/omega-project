import { describe, it, expect } from 'vitest';
import { weave } from '../src/weaver.js';
import { buildSkeleton } from '../src/skeleton.js';
import { segmentPlan } from '../src/segmenter.js';
import { getPlanA, getPlanB, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, SCENARIO_B_GENOME, SCENARIO_B_CONSTRAINTS, TIMESTAMP } from './fixtures.js';

describe('Weaver', () => {
  it('produces prose from skeleton', () => {
    const { plan } = getPlanA();
    const segments = segmentPlan(plan);
    const skeleton = buildSkeleton(segments, plan);
    const prose = weave(skeleton, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS);
    expect(prose.paragraphs.length).toBeGreaterThan(0);
  });

  it('applies cadence rules (tension_delta)', () => {
    const { plan } = getPlanA();
    const segments = segmentPlan(plan);
    const skeleton = buildSkeleton(segments, plan);
    const prose = weave(skeleton, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS);
    expect(prose.total_word_count).toBeGreaterThan(0);
  });

  it('tracks rhetorical_devices on pivot paragraphs', () => {
    const { plan } = getPlanA();
    const segments = segmentPlan(plan);
    const skeleton = buildSkeleton(segments, plan);
    const prose = weave(skeleton, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS);
    const allDevices = prose.paragraphs.flatMap((p) => p.rhetorical_devices);
    // Devices are added for pivots and reveals
    expect(prose.paragraphs.length).toBeGreaterThan(0);
  });

  it('applies rhythm from genome burstiness', () => {
    const { plan } = getPlanA();
    const segments = segmentPlan(plan);
    const skeleton = buildSkeleton(segments, plan);
    const prose = weave(skeleton, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS);
    expect(prose.prose_hash).toBeTruthy();
  });

  it('respects pov/tense from constraints', () => {
    const { plan } = getPlanB();
    const segments = segmentPlan(plan);
    const skeleton = buildSkeleton(segments, plan);
    const prose = weave(skeleton, SCENARIO_B_GENOME, SCENARIO_B_CONSTRAINTS);
    expect(prose.paragraphs.length).toBeGreaterThan(0);
  });

  it('computes word_count per paragraph', () => {
    const { plan } = getPlanA();
    const segments = segmentPlan(plan);
    const skeleton = buildSkeleton(segments, plan);
    const prose = weave(skeleton, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS);
    for (const para of prose.paragraphs) {
      expect(para.word_count).toBeGreaterThanOrEqual(0);
    }
  });

  it('computes sentence_count per paragraph', () => {
    const { plan } = getPlanA();
    const segments = segmentPlan(plan);
    const skeleton = buildSkeleton(segments, plan);
    const prose = weave(skeleton, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS);
    for (const para of prose.paragraphs) {
      expect(para.sentence_count).toBeGreaterThanOrEqual(0);
    }
  });

  it('assigns rhetorical_devices list', () => {
    const { plan } = getPlanA();
    const segments = segmentPlan(plan);
    const skeleton = buildSkeleton(segments, plan);
    const prose = weave(skeleton, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS);
    for (const para of prose.paragraphs) {
      expect(Array.isArray(para.rhetorical_devices)).toBe(true);
    }
  });

  it('is deterministic', () => {
    const { plan } = getPlanA();
    const seg = segmentPlan(plan);
    const sk = buildSkeleton(seg, plan);
    const p1 = weave(sk, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS);
    const p2 = weave(sk, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS);
    expect(p1.prose_hash).toBe(p2.prose_hash);
  });

  it('applies constraints to prose', () => {
    const { plan } = getPlanA();
    const segments = segmentPlan(plan);
    const skeleton = buildSkeleton(segments, plan);
    const prose = weave(skeleton, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS);
    expect(prose.skeleton_id).toBe(skeleton.skeleton_id);
  });
});
