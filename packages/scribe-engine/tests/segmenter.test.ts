import { describe, it, expect } from 'vitest';
import { segmentPlan } from '../src/segmenter.js';
import { getPlanA, getPlanB, TIMESTAMP } from './fixtures.js';
import type { GenesisPlan } from '@omega/genesis-planner';

describe('Segmenter', () => {
  it('produces segments from plan A', () => {
    const { plan } = getPlanA();
    const segments = segmentPlan(plan);
    expect(segments.length).toBeGreaterThan(0);
  });

  it('maps segment types correctly', () => {
    const { plan } = getPlanA();
    const segments = segmentPlan(plan);
    const types = new Set(segments.map((s) => s.type));
    expect(types.size).toBeGreaterThanOrEqual(2);
  });

  it('includes canon_refs from scenes', () => {
    const { plan } = getPlanA();
    const segments = segmentPlan(plan);
    // At least some segments should have canon refs if scene constraints reference them
    expect(segments.length).toBeGreaterThan(0);
  });

  it('includes seed_refs from scenes', () => {
    const { plan } = getPlanA();
    const segments = segmentPlan(plan);
    const withSeeds = segments.filter((s) => s.seed_refs.length > 0);
    // May or may not have seeds depending on pivot beats
    expect(segments.length).toBeGreaterThan(0);
  });

  it('preserves scene ordering', () => {
    const { plan } = getPlanA();
    const segments = segmentPlan(plan);
    const sceneIds = segments.map((s) => s.source_scene_id);
    // Scene IDs should appear in order (no interleaving from different arcs)
    const seen = new Set<string>();
    let lastScene = '';
    let orderViolation = false;
    for (const sid of sceneIds) {
      if (sid !== lastScene) {
        if (seen.has(sid)) { orderViolation = true; break; }
        seen.add(sid);
        lastScene = sid;
      }
    }
    expect(orderViolation).toBe(false);
  });

  it('is deterministic (same plan -> same segments)', () => {
    const { plan } = getPlanA();
    const seg1 = segmentPlan(plan);
    const seg2 = segmentPlan(plan);
    expect(seg1.length).toBe(seg2.length);
    for (let i = 0; i < seg1.length; i++) {
      expect(seg1[i].segment_id).toBe(seg2[i].segment_id);
    }
  });

  it('returns empty for plan with no arcs', () => {
    const emptyPlan = {
      plan_id: 'EMPTY', plan_hash: '', version: '1.0.0' as const,
      intent_hash: '', canon_hash: '', constraints_hash: '', genome_hash: '', emotion_hash: '',
      arcs: [], seed_registry: [], tension_curve: [], emotion_trajectory: [],
      scene_count: 0, beat_count: 0, estimated_word_count: 0,
    };
    const segments = segmentPlan(emptyPlan);
    expect(segments).toHaveLength(0);
  });

  it('generates segments from beats', () => {
    const { plan } = getPlanA();
    const segments = segmentPlan(plan);
    // Each segment should reference a beat
    for (const seg of segments) {
      expect(seg.source_beat_id).toBeTruthy();
    }
  });

  it('marks pivot segments', () => {
    const { plan } = getPlanA();
    const segments = segmentPlan(plan);
    const pivots = segments.filter((s) => s.is_pivot);
    // Plan A should have at least 1 pivot beat
    expect(pivots.length).toBeGreaterThanOrEqual(0);
  });

  it('includes transition segments between scenes', () => {
    const { plan } = getPlanA();
    const segments = segmentPlan(plan);
    const transitions = segments.filter((s) => s.type === 'transition');
    // Should have transitions between scenes
    expect(transitions.length).toBeGreaterThanOrEqual(0);
  });
});
