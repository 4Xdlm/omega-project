import { describe, it, expect } from 'vitest';
import { generateStyleReport, styleReportToMarkdown } from '../src/report.js';
import { createEEvidenceChainBuilder } from '../src/evidence.js';
import { buildMinimalStyledOutput, getDefaultEConfig, SCENARIO_A_GENOME, TIMESTAMP } from './fixtures.js';

const config = getDefaultEConfig();

describe('Report', () => {
  it('generates report with correct schema', () => {
    const output = buildMinimalStyledOutput();
    const evidence = createEEvidenceChainBuilder(output.output_id, TIMESTAMP);
    evidence.addStep('test', 'a', 'b', 'rule', 'PASS');
    const report = generateStyleReport(output, evidence.build(), config, SCENARIO_A_GENOME, TIMESTAMP);
    expect(report.output_id).toBe(output.output_id);
    expect(report.verdict).toBeTruthy();
  });

  it('has stable hash', () => {
    const output = buildMinimalStyledOutput();
    const e1 = createEEvidenceChainBuilder(output.output_id, TIMESTAMP);
    e1.addStep('test', 'a', 'b', 'rule', 'PASS');
    const e2 = createEEvidenceChainBuilder(output.output_id, TIMESTAMP);
    e2.addStep('test', 'a', 'b', 'rule', 'PASS');
    const r1 = generateStyleReport(output, e1.build(), config, SCENARIO_A_GENOME, TIMESTAMP);
    const r2 = generateStyleReport(output, e2.build(), config, SCENARIO_A_GENOME, TIMESTAMP);
    expect(r1.config_hash).toBe(r2.config_hash);
  });

  it('computes metrics', () => {
    const output = buildMinimalStyledOutput();
    const evidence = createEEvidenceChainBuilder(output.output_id, TIMESTAMP);
    evidence.addStep('test', 'a', 'b', 'rule', 'PASS');
    const report = generateStyleReport(output, evidence.build(), config, SCENARIO_A_GENOME, TIMESTAMP);
    expect(report.metrics).toBeTruthy();
    expect(typeof report.metrics.total_words).toBe('number');
  });

  it('includes evidence', () => {
    const output = buildMinimalStyledOutput();
    const evidence = createEEvidenceChainBuilder(output.output_id, TIMESTAMP);
    evidence.addStep('test', 'a', 'b', 'rule', 'PASS');
    const report = generateStyleReport(output, evidence.build(), config, SCENARIO_A_GENOME, TIMESTAMP);
    expect(report.evidence).toBeTruthy();
    expect(report.evidence.steps.length).toBeGreaterThan(0);
  });

  it('includes invariants checked', () => {
    const output = buildMinimalStyledOutput();
    const evidence = createEEvidenceChainBuilder(output.output_id, TIMESTAMP);
    evidence.addStep('test', 'a', 'b', 'rule', 'PASS');
    const report = generateStyleReport(output, evidence.build(), config, SCENARIO_A_GENOME, TIMESTAMP);
    expect(report.invariants_checked.length).toBe(10);
  });

  it('generates markdown', () => {
    const output = buildMinimalStyledOutput();
    const evidence = createEEvidenceChainBuilder(output.output_id, TIMESTAMP);
    evidence.addStep('test', 'a', 'b', 'rule', 'PASS');
    const report = generateStyleReport(output, evidence.build(), config, SCENARIO_A_GENOME, TIMESTAMP);
    const md = styleReportToMarkdown(report);
    expect(md).toContain('# OMEGA Style Emergence Engine');
    expect(md).toContain('Invariant');
  });

  it('includes IA results in report', () => {
    const output = buildMinimalStyledOutput();
    const evidence = createEEvidenceChainBuilder(output.output_id, TIMESTAMP);
    evidence.addStep('test', 'a', 'b', 'rule', 'PASS');
    const report = generateStyleReport(output, evidence.build(), config, SCENARIO_A_GENOME, TIMESTAMP);
    expect(report.ia_detection).toBeTruthy();
  });

  it('includes genre results in report', () => {
    const output = buildMinimalStyledOutput();
    const evidence = createEEvidenceChainBuilder(output.output_id, TIMESTAMP);
    evidence.addStep('test', 'a', 'b', 'rule', 'PASS');
    const report = generateStyleReport(output, evidence.build(), config, SCENARIO_A_GENOME, TIMESTAMP);
    expect(report.genre_detection).toBeTruthy();
  });

  it('includes style_profile in report', () => {
    const output = buildMinimalStyledOutput();
    const evidence = createEEvidenceChainBuilder(output.output_id, TIMESTAMP);
    evidence.addStep('test', 'a', 'b', 'rule', 'PASS');
    const report = generateStyleReport(output, evidence.build(), config, SCENARIO_A_GENOME, TIMESTAMP);
    expect(report.style_profile).toBeTruthy();
    expect(report.style_profile.profile_hash).toBeTruthy();
  });

  it('has config_hash', () => {
    const output = buildMinimalStyledOutput();
    const evidence = createEEvidenceChainBuilder(output.output_id, TIMESTAMP);
    evidence.addStep('test', 'a', 'b', 'rule', 'PASS');
    const report = generateStyleReport(output, evidence.build(), config, SCENARIO_A_GENOME, TIMESTAMP);
    expect(report.config_hash).toHaveLength(64);
  });

  it('has timestamp', () => {
    const output = buildMinimalStyledOutput();
    const evidence = createEEvidenceChainBuilder(output.output_id, TIMESTAMP);
    evidence.addStep('test', 'a', 'b', 'rule', 'PASS');
    const report = generateStyleReport(output, evidence.build(), config, SCENARIO_A_GENOME, TIMESTAMP);
    expect(report.timestamp_deterministic).toBe(TIMESTAMP);
  });
});
