import { describe, it, expect } from 'vitest';
import { buildSkeleton } from '../src/skeleton.js';
import { segmentPlan } from '../src/segmenter.js';
import { getPlanA, TIMESTAMP } from './fixtures.js';

describe('Skeleton', () => {
  it('builds skeleton from segments', () => {
    const { plan } = getPlanA();
    const segments = segmentPlan(plan);
    const skeleton = buildSkeleton(segments, plan);
    expect(skeleton.skeleton_id).toBeTruthy();
    expect(skeleton.segments.length).toBe(segments.length);
  });

  it('preserves segment ordering', () => {
    const { plan } = getPlanA();
    const segments = segmentPlan(plan);
    const skeleton = buildSkeleton(segments, plan);
    for (let i = 0; i < segments.length; i++) {
      expect(skeleton.segments[i].segment_id).toBe(segments[i].segment_id);
    }
  });

  it('computes stable hash', () => {
    const { plan } = getPlanA();
    const segments = segmentPlan(plan);
    const sk1 = buildSkeleton(segments, plan);
    const sk2 = buildSkeleton(segments, plan);
    expect(sk1.skeleton_hash).toBe(sk2.skeleton_hash);
  });

  it('includes scene_order', () => {
    const { plan } = getPlanA();
    const segments = segmentPlan(plan);
    const skeleton = buildSkeleton(segments, plan);
    expect(skeleton.scene_order.length).toBeGreaterThan(0);
  });

  it('is deterministic', () => {
    const { plan } = getPlanA();
    const seg1 = segmentPlan(plan);
    const seg2 = segmentPlan(plan);
    const sk1 = buildSkeleton(seg1, plan);
    const sk2 = buildSkeleton(seg2, plan);
    expect(sk1.skeleton_hash).toBe(sk2.skeleton_hash);
    expect(sk1.skeleton_id).toBe(sk2.skeleton_id);
  });

  it('has correct segment_count', () => {
    const { plan } = getPlanA();
    const segments = segmentPlan(plan);
    const skeleton = buildSkeleton(segments, plan);
    expect(skeleton.segment_count).toBe(segments.length);
  });

  it('references plan_id', () => {
    const { plan } = getPlanA();
    const segments = segmentPlan(plan);
    const skeleton = buildSkeleton(segments, plan);
    expect(skeleton.plan_id).toBe(plan.plan_id);
  });

  it('handles empty segments', () => {
    const { plan } = getPlanA();
    const skeleton = buildSkeleton([], plan);
    expect(skeleton.segments).toHaveLength(0);
    expect(skeleton.segment_count).toBe(0);
  });
});
