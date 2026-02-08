import { describe, it, expect } from 'vitest';
import { runScribe } from '../src/engine.js';
import { generateScribeReport, scribeReportToMarkdown } from '../src/report.js';
import { createSEvidenceChainBuilder } from '../src/evidence.js';
import {
  getPlanA, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS, SCENARIO_A_GENOME, SCENARIO_A_EMOTION,
  getDefaultSConfig, TIMESTAMP,
} from './fixtures.js';

describe('Report', () => {
  it('generates report with correct schema', () => {
    const { plan } = getPlanA();
    const config = getDefaultSConfig();
    const result = runScribe(plan, SCENARIO_A_CANON, SCENARIO_A_GENOME, SCENARIO_A_EMOTION, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(result.report.output_id).toBeTruthy();
    expect(result.report.plan_id).toBe(plan.plan_id);
    expect(result.report.verdict).toMatch(/^(PASS|FAIL)$/);
  });

  it('stable hash across 2 runs', () => {
    const { plan } = getPlanA();
    const config = getDefaultSConfig();
    const r1 = runScribe(plan, SCENARIO_A_CANON, SCENARIO_A_GENOME, SCENARIO_A_EMOTION, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    const r2 = runScribe(plan, SCENARIO_A_CANON, SCENARIO_A_GENOME, SCENARIO_A_EMOTION, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(r1.report.output_hash).toBe(r2.report.output_hash);
  });

  it('metrics are correct', () => {
    const { plan } = getPlanA();
    const config = getDefaultSConfig();
    const result = runScribe(plan, SCENARIO_A_CANON, SCENARIO_A_GENOME, SCENARIO_A_EMOTION, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(result.report.metrics.total_words).toBeGreaterThan(0);
    expect(result.report.metrics.total_paragraphs).toBeGreaterThan(0);
    expect(result.report.metrics.rewrite_passes).toBeGreaterThanOrEqual(1);
  });

  it('evidence included', () => {
    const { plan } = getPlanA();
    const config = getDefaultSConfig();
    const result = runScribe(plan, SCENARIO_A_CANON, SCENARIO_A_GENOME, SCENARIO_A_EMOTION, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(result.report.evidence.steps.length).toBeGreaterThan(0);
    expect(result.report.evidence.chain_hash).toBeTruthy();
  });

  it('FAIL report when plan invalid', () => {
    const emptyPlan = {
      plan_id: 'EMPTY', plan_hash: '', version: '1.0.0' as const,
      intent_hash: '', canon_hash: '', constraints_hash: '', genome_hash: '', emotion_hash: '',
      arcs: [], seed_registry: [], tension_curve: [], emotion_trajectory: [],
      scene_count: 0, beat_count: 0, estimated_word_count: 0,
    };
    const config = getDefaultSConfig();
    const result = runScribe(emptyPlan as any, SCENARIO_A_CANON, SCENARIO_A_GENOME, SCENARIO_A_EMOTION, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(result.report.verdict).toBe('FAIL');
  });

  it('markdown contains sections', () => {
    const { plan } = getPlanA();
    const config = getDefaultSConfig();
    const result = runScribe(plan, SCENARIO_A_CANON, SCENARIO_A_GENOME, SCENARIO_A_EMOTION, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    const md = scribeReportToMarkdown(result.report);
    expect(md).toContain('## Metrics');
    expect(md).toContain('## Gates');
    expect(md).toContain('## Oracles');
    expect(md).toContain('## Evidence Chain');
  });

  it('gate results in report', () => {
    const { plan } = getPlanA();
    const config = getDefaultSConfig();
    const result = runScribe(plan, SCENARIO_A_CANON, SCENARIO_A_GENOME, SCENARIO_A_EMOTION, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(result.report.gate_result.gate_results.length).toBeGreaterThanOrEqual(1);
  });

  it('oracle results in report', () => {
    const { plan } = getPlanA();
    const config = getDefaultSConfig();
    const result = runScribe(plan, SCENARIO_A_CANON, SCENARIO_A_GENOME, SCENARIO_A_EMOTION, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(result.report.oracle_result.oracle_results.length).toBe(6);
  });
});
