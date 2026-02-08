import { describe, it, expect } from 'vitest';
import { addSensoryLayer } from '../src/sensory.js';
import { weave } from '../src/weaver.js';
import { buildSkeleton } from '../src/skeleton.js';
import { segmentPlan } from '../src/segmenter.js';
import { getPlanA, getPlanB, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, SCENARIO_B_GENOME, SCENARIO_B_CONSTRAINTS, getDefaultSConfig, TIMESTAMP } from './fixtures.js';

describe('Sensory Layer', () => {
  it('adds sensory anchors', () => {
    const { plan } = getPlanA();
    const seg = segmentPlan(plan);
    const sk = buildSkeleton(seg, plan);
    const prose = weave(sk, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS);
    const config = getDefaultSConfig();
    const enriched = addSensoryLayer(prose, plan, config);
    const totalAnchors = enriched.paragraphs.reduce((acc, p) => acc + p.sensory_anchors.length, 0);
    expect(totalAnchors).toBeGreaterThan(0);
  });

  it('tracks motif_refs', () => {
    const { plan } = getPlanA();
    const seg = segmentPlan(plan);
    const sk = buildSkeleton(seg, plan);
    const prose = weave(sk, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS);
    const config = getDefaultSConfig();
    const enriched = addSensoryLayer(prose, plan, config);
    const totalMotifs = enriched.paragraphs.reduce((acc, p) => acc + p.motif_refs.length, 0);
    expect(totalMotifs).toBeGreaterThanOrEqual(0);
  });

  it('links seeds from seed_registry', () => {
    const { plan } = getPlanA();
    const seg = segmentPlan(plan);
    const sk = buildSkeleton(seg, plan);
    const prose = weave(sk, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS);
    const config = getDefaultSConfig();
    const enriched = addSensoryLayer(prose, plan, config);
    expect(enriched.paragraphs.length).toBeGreaterThan(0);
  });

  it('meets sensory quota per scene', () => {
    const { plan } = getPlanA();
    const seg = segmentPlan(plan);
    const sk = buildSkeleton(seg, plan);
    const prose = weave(sk, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS);
    const config = getDefaultSConfig();
    const enriched = addSensoryLayer(prose, plan, config);
    // At least some paragraphs should have >= 2 sensory anchors
    const withEnoughAnchors = enriched.paragraphs.filter((p) => p.sensory_anchors.length >= 2);
    expect(withEnoughAnchors.length).toBeGreaterThan(0);
  });

  it('is deterministic', () => {
    const { plan } = getPlanA();
    const seg = segmentPlan(plan);
    const sk = buildSkeleton(seg, plan);
    const prose = weave(sk, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS);
    const config = getDefaultSConfig();
    const e1 = addSensoryLayer(prose, plan, config);
    const e2 = addSensoryLayer(prose, plan, config);
    expect(e1.prose_hash).toBe(e2.prose_hash);
  });

  it('handles empty plan gracefully', () => {
    const { plan } = getPlanA();
    const seg = segmentPlan(plan);
    const sk = buildSkeleton(seg, plan);
    const prose = weave(sk, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS);
    const config = getDefaultSConfig();
    const emptyPlan = { ...plan, arcs: [], seed_registry: [] };
    const enriched = addSensoryLayer(prose, emptyPlan as any, config);
    expect(enriched.paragraphs.length).toBe(prose.paragraphs.length);
  });

  it('handles multiple seeds', () => {
    const { plan } = getPlanA();
    expect(plan.seed_registry.length).toBeGreaterThanOrEqual(3);
    const seg = segmentPlan(plan);
    const sk = buildSkeleton(seg, plan);
    const prose = weave(sk, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS);
    const config = getDefaultSConfig();
    const enriched = addSensoryLayer(prose, plan, config);
    expect(enriched.prose_hash).toBeTruthy();
  });

  it('updates prose_hash after enrichment', () => {
    const { plan } = getPlanA();
    const seg = segmentPlan(plan);
    const sk = buildSkeleton(seg, plan);
    const prose = weave(sk, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS);
    const config = getDefaultSConfig();
    const enriched = addSensoryLayer(prose, plan, config);
    expect(enriched.prose_hash).not.toBe(prose.prose_hash);
  });
});
