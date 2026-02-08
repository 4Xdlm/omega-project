/**
 * OMEGA Creation Pipeline — Engine Tests
 * Phase C.4 — 16 tests
 */

import { describe, it, expect } from 'vitest';
import { runCreation } from '../src/engine.js';
import {
  INTENT_PACK_A, INTENT_PACK_B, INTENT_PACK_C,
  DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG,
  TIMESTAMP,
} from './fixtures.js';

describe('Engine', () => {
  it('happy path A — produces result', () => {
    const result = runCreation(INTENT_PACK_A, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
    expect(result.pipeline_id).toMatch(/^CPIPE-/);
    expect(result.output_hash).toHaveLength(64);
    expect(result.intent_hash).toHaveLength(64);
  });

  it('happy path B — produces result', () => {
    const result = runCreation(INTENT_PACK_B, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
    expect(result.pipeline_id).toMatch(/^CPIPE-/);
    expect(result.output_hash).toHaveLength(64);
  });

  it('happy path C — produces result', () => {
    const result = runCreation(INTENT_PACK_C, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
    expect(result.pipeline_id).toMatch(/^CPIPE-/);
  });

  it('FAIL validation -> reject', () => {
    const bad = { ...INTENT_PACK_A, intent: { ...INTENT_PACK_A.intent, title: '', themes: [] } };
    const result = runCreation(bad, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
    expect(result.pipeline_id).toContain('FAIL');
  });

  it('FAIL validation -> empty styled output', () => {
    const bad = { ...INTENT_PACK_A, intent: { ...INTENT_PACK_A.intent, title: '' } };
    const result = runCreation(bad, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
    expect(result.final_text.paragraphs).toHaveLength(0);
  });

  it('pipeline trace complete', () => {
    const result = runCreation(INTENT_PACK_A, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
    expect(result.pipeline_trace.total_stages).toBeGreaterThanOrEqual(8);
    expect(result.pipeline_trace.stages.length).toBe(result.pipeline_trace.total_stages);
  });

  it('evidence chain present', () => {
    const result = runCreation(INTENT_PACK_A, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
    expect(result.evidence.chain_hash).toHaveLength(64);
    expect(result.evidence.merkle_tree.root_hash).toHaveLength(64);
  });

  it('proof-pack present and verifiable', () => {
    const result = runCreation(INTENT_PACK_A, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
    expect(result.proof_pack.verifiable).toBe(true);
    expect(result.proof_pack.root_hash).toHaveLength(64);
    expect(result.proof_pack.manifest.files.length).toBeGreaterThan(0);
  });

  it('report present', () => {
    const result = runCreation(INTENT_PACK_A, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
    expect(result.report.pipeline_id).toBe(result.pipeline_id);
    expect(result.report.output_hash).toHaveLength(64);
  });

  it('unified gates executed', () => {
    const result = runCreation(INTENT_PACK_A, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
    expect(result.unified_gates.gate_results.length).toBeGreaterThan(0);
  });

  it('genesis plan preserved', () => {
    const result = runCreation(INTENT_PACK_A, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
    expect(result.genesis_plan.arcs.length).toBeGreaterThan(0);
    expect(result.genesis_plan.plan_hash).toHaveLength(64);
  });

  it('scribe output preserved', () => {
    const result = runCreation(INTENT_PACK_A, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
    expect(result.scribe_output.final_prose.paragraphs.length).toBeGreaterThan(0);
  });

  it('style output preserved', () => {
    const result = runCreation(INTENT_PACK_A, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
    expect(result.style_output.paragraphs.length).toBeGreaterThan(0);
    expect(result.style_output.tournament.total_rounds).toBeGreaterThan(0);
  });

  it('metrics computed', () => {
    const result = runCreation(INTENT_PACK_A, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
    expect(result.report.metrics.total_words).toBeGreaterThan(0);
    expect(result.report.metrics.total_paragraphs).toBeGreaterThan(0);
    expect(result.report.metrics.total_arcs).toBeGreaterThan(0);
  });

  it('all stages executed in order', () => {
    const result = runCreation(INTENT_PACK_A, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
    const stages = result.pipeline_trace.stages.map((s) => s.stage);
    expect(stages[0]).toBe('F0');
    expect(stages[1]).toBe('F1');
    expect(stages[2]).toBe('F2');
    expect(stages[3]).toBe('F3');
  });

  it('final_text equals style_output', () => {
    const result = runCreation(INTENT_PACK_A, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
    expect(result.final_text.output_hash).toBe(result.style_output.output_hash);
  });
});
