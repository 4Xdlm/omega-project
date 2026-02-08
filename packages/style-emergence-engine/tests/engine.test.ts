import { describe, it, expect } from 'vitest';
import { runStyleEmergence } from '../src/engine.js';
import type { ScribeOutput } from '@omega/scribe-engine';
import {
  getScribeOutputA, getScribeOutputB,
  SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS,
  SCENARIO_B_GENOME, SCENARIO_B_CONSTRAINTS,
  getDefaultEConfig, TIMESTAMP,
} from './fixtures.js';

const config = getDefaultEConfig();

describe('Engine', () => {
  it('happy path A', () => {
    const scribe = getScribeOutputA();
    const { output, report } = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(output.output_id).toBeTruthy();
    expect(output.output_hash).toBeTruthy();
    expect(report.output_id).toBe(output.output_id);
  });

  it('happy path B', () => {
    const scribe = getScribeOutputB();
    const { output, report } = runStyleEmergence(scribe, SCENARIO_B_GENOME, SCENARIO_B_CONSTRAINTS, config, TIMESTAMP);
    expect(output.output_id).toBeTruthy();
    expect(report.verdict).toBeTruthy();
  });

  it('null scribe -> FAIL', () => {
    const { report } = runStyleEmergence(
      null as unknown as ScribeOutput,
      SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP,
    );
    expect(report.verdict).toBe('FAIL');
  });

  it('pipeline stages traced in evidence', () => {
    const scribe = getScribeOutputA();
    const { report } = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(report.evidence.steps.length).toBeGreaterThanOrEqual(5);
    const stepNames = report.evidence.steps.map((s) => s.step);
    expect(stepNames.some((s) => s.includes('E0'))).toBe(true);
    expect(stepNames.some((s) => s.includes('E2'))).toBe(true);
    expect(stepNames.some((s) => s.includes('E6'))).toBe(true);
  });

  it('evidence chain in output', () => {
    const scribe = getScribeOutputA();
    const { report } = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(report.evidence.chain_hash).toBeTruthy();
    expect(report.evidence.chain_hash).toHaveLength(64);
  });

  it('hash in output', () => {
    const scribe = getScribeOutputA();
    const { output } = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(output.output_hash).toHaveLength(64);
  });

  it('report generated', () => {
    const scribe = getScribeOutputA();
    const { report } = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(report.invariants_checked.length).toBe(10);
    expect(report.timestamp_deterministic).toBe(TIMESTAMP);
  });

  it('metrics computed', () => {
    const scribe = getScribeOutputA();
    const { report } = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(report.metrics.total_words).toBeGreaterThan(0);
    expect(report.metrics.total_paragraphs).toBeGreaterThan(0);
  });

  it('tournament in output', () => {
    const scribe = getScribeOutputA();
    const { output } = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(output.tournament.total_rounds).toBeGreaterThan(0);
    expect(output.tournament.tournament_hash).toHaveLength(64);
  });

  it('IA detection in output', () => {
    const scribe = getScribeOutputA();
    const { output } = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(typeof output.ia_detection.score).toBe('number');
    expect(output.ia_detection.verdict).toMatch(/^(PASS|FAIL)$/);
  });

  it('genre detection in output', () => {
    const scribe = getScribeOutputA();
    const { output } = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(typeof output.genre_detection.specificity).toBe('number');
    expect(output.genre_detection.verdict).toMatch(/^(PASS|FAIL)$/);
  });

  it('is deterministic', () => {
    const scribe = getScribeOutputA();
    const r1 = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    const r2 = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(r1.output.output_hash).toBe(r2.output.output_hash);
  });

  it('profile in output', () => {
    const scribe = getScribeOutputA();
    const { output } = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(output.global_profile).toBeTruthy();
    expect(output.global_profile.profile_hash).toHaveLength(64);
  });

  it('output_id starts with EOUT-', () => {
    const scribe = getScribeOutputA();
    const { output } = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(output.output_id.startsWith('EOUT-')).toBe(true);
  });

  it('scribe references preserved', () => {
    const scribe = getScribeOutputA();
    const { output } = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(output.scribe_output_id).toBe(scribe.output_id);
    expect(output.scribe_output_hash).toBe(scribe.output_hash);
  });

  it('banality in output', () => {
    const scribe = getScribeOutputA();
    const { output } = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(typeof output.banality_result.total_banality).toBe('number');
    expect(output.banality_result.verdict).toMatch(/^(PASS|FAIL)$/);
  });

  it('total_word_count matches paragraphs', () => {
    const scribe = getScribeOutputA();
    const { output } = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    const sum = output.paragraphs.reduce((acc, p) => acc + p.word_count, 0);
    expect(output.total_word_count).toBe(sum);
  });

  it('styled paragraphs have original_paragraph_id', () => {
    const scribe = getScribeOutputA();
    const { output } = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    for (const p of output.paragraphs) {
      expect(p.original_paragraph_id).toBeTruthy();
    }
  });

  it('styled paragraphs have selected_variant_id', () => {
    const scribe = getScribeOutputA();
    const { output } = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    for (const p of output.paragraphs) {
      expect(p.selected_variant_id).toBeTruthy();
    }
  });

  it('styled paragraphs have style_profile', () => {
    const scribe = getScribeOutputA();
    const { output } = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    for (const p of output.paragraphs) {
      expect(p.style_profile).toBeTruthy();
      expect(p.style_profile.profile_hash).toHaveLength(64);
    }
  });
});
