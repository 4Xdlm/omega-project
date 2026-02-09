/**
 * OMEGA Runner — Report Tests
 * Phase D.1 — 10 tests for report generation
 */

import { describe, it, expect } from 'vitest';
import { buildConsolidatedReport, buildMarkdownReport, buildReportFromManifest } from '../src/orchestrator/runReport.js';
import { makeSampleManifest, makeSampleInvariantResults } from './fixtures.js';

describe('buildConsolidatedReport', () => {
  const manifest = makeSampleManifest();
  const invariants = makeSampleInvariantResults();
  const report = buildConsolidatedReport(manifest, invariants);

  it('has run_id', () => {
    expect(report.run_id).toBe(manifest.run_id);
    expect(typeof report.run_id).toBe('string');
    expect(report.run_id.length).toBeGreaterThan(0);
  });

  it('has verdict', () => {
    expect(report.verdict).toBe('PASS');
    expect(typeof report.verdict).toBe('string');
  });

  it('has stages', () => {
    expect(report.stages).toEqual(manifest.stages_completed);
    expect(report.stages.length).toBe(6);
  });

  it('has manifest_hash', () => {
    expect(typeof report.manifest_hash).toBe('string');
    expect(report.manifest_hash.length).toBe(64);
  });

  it('has merkle_root', () => {
    expect(report.merkle_root).toBe(manifest.merkle_root);
    expect(report.merkle_root.length).toBe(64);
  });
});

describe('buildMarkdownReport', () => {
  const manifest = makeSampleManifest();
  const invariants = makeSampleInvariantResults();
  const md = buildMarkdownReport(manifest, invariants);

  it('contains run_id', () => {
    expect(md).toContain(manifest.run_id);
  });

  it('contains stages table', () => {
    expect(md).toContain('## Stages');
    for (const stage of manifest.stages_completed) {
      expect(md).toContain(stage);
    }
  });

  it('contains invariants table', () => {
    expect(md).toContain('## Invariants');
    expect(md).toContain('| ID | Status | Message |');
    for (const inv of invariants) {
      expect(md).toContain(inv.id);
    }
  });
});

describe('buildReportFromManifest', () => {
  const manifest = makeSampleManifest();
  const invariants = makeSampleInvariantResults();

  it('returns both json and md', () => {
    const result = buildReportFromManifest(manifest, invariants);
    expect(typeof result.reportJson).toBe('string');
    expect(typeof result.reportMd).toBe('string');
    expect(result.reportJson.length).toBeGreaterThan(0);
    expect(result.reportMd.length).toBeGreaterThan(0);
    // JSON should be parseable
    const parsed = JSON.parse(result.reportJson);
    expect(parsed.run_id).toBe(manifest.run_id);
  });

  it('INV-RUN-06: report derived from manifest data only (deterministic)', () => {
    const result1 = buildReportFromManifest(manifest, invariants);
    const result2 = buildReportFromManifest(manifest, invariants);
    expect(result1.reportJson).toBe(result2.reportJson);
    expect(result1.reportMd).toBe(result2.reportMd);
  });
});
