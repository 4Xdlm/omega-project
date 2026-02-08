import { describe, it, expect } from 'vitest';
import { generateReport, reportToMarkdown } from '../src/report.js';
import { createGenesisPlan } from '../src/planner.js';
import { createDefaultConfig } from '../src/config.js';
import {
  TIMESTAMP,
  SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS, SCENARIO_A_GENOME, SCENARIO_A_EMOTION,
} from './fixtures.js';

const config = createDefaultConfig();

describe('Report', () => {
  it('should match expected schema fields', () => {
    const { report } = createGenesisPlan(
      SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, config, TIMESTAMP,
    );
    expect(report.plan_id).toBeTruthy();
    expect(report.plan_hash).toBeTruthy();
    expect(report.verdict).toBeDefined();
    expect(report.validation).toBeDefined();
    expect(report.evidence).toBeDefined();
    expect(report.metrics).toBeDefined();
    expect(report.config_hash).toBeTruthy();
    expect(report.timestamp_deterministic).toBe(TIMESTAMP);
  });

  it('should produce stable hash across 2 runs', () => {
    const { report: r1 } = createGenesisPlan(
      SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, config, TIMESTAMP,
    );
    const { report: r2 } = createGenesisPlan(
      SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, config, TIMESTAMP,
    );
    expect(r1.plan_hash).toBe(r2.plan_hash);
    expect(r1.config_hash).toBe(r2.config_hash);
  });

  it('should include correct metrics', () => {
    const { report } = createGenesisPlan(
      SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, config, TIMESTAMP,
    );
    expect(report.metrics.arc_count).toBeGreaterThan(0);
    expect(report.metrics.scene_count).toBeGreaterThan(0);
    expect(report.metrics.beat_count).toBeGreaterThan(0);
    expect(report.metrics.seed_count).toBeGreaterThan(0);
  });

  it('should include evidence chain', () => {
    const { report } = createGenesisPlan(
      SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, config, TIMESTAMP,
    );
    expect(report.evidence.steps.length).toBeGreaterThan(0);
  });

  it('should FAIL when inputs FAIL', () => {
    const badIntent = { ...SCENARIO_A_INTENT, title: '' };
    const { report } = createGenesisPlan(
      badIntent, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, config, TIMESTAMP,
    );
    expect(report.verdict).toBe('FAIL');
  });

  it('should produce markdown with required sections', () => {
    const { report } = createGenesisPlan(
      SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, config, TIMESTAMP,
    );
    const md = reportToMarkdown(report);
    expect(md).toContain('## Plan ID');
    expect(md).toContain('## Metrics');
    expect(md).toContain('## Validation');
    expect(md).toContain('## Evidence Chain');
    expect(md).toContain('## Config Hash');
  });
});
