import { describe, it, expect } from 'vitest';
import { creationReportToMarkdown } from '../src/report.js';
import { runCreation } from '../src/engine.js';
import { INTENT_PACK_A, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP } from './fixtures.js';

describe('Report', () => {
  const result = runCreation(INTENT_PACK_A, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);

  it('generates markdown', () => {
    const md = creationReportToMarkdown(result.report);
    expect(md).toContain('# OMEGA Creation Pipeline Report');
  });

  it('includes verdict', () => {
    const md = creationReportToMarkdown(result.report);
    expect(md).toContain(result.report.verdict);
  });

  it('includes metrics', () => {
    const md = creationReportToMarkdown(result.report);
    expect(md).toContain('Total Words');
  });

  it('includes gates', () => {
    const md = creationReportToMarkdown(result.report);
    expect(md).toContain('Unified Gates');
  });

  it('includes invariants', () => {
    const md = creationReportToMarkdown(result.report);
    expect(md).toContain('Invariants');
  });

  it('includes hashes', () => {
    const md = creationReportToMarkdown(result.report);
    expect(md).toContain('Hashes');
  });

  it('includes pipeline id', () => {
    const md = creationReportToMarkdown(result.report);
    expect(md).toContain(result.report.pipeline_id);
  });

  it('deterministic', () => {
    const md1 = creationReportToMarkdown(result.report);
    const md2 = creationReportToMarkdown(result.report);
    expect(md1).toBe(md2);
  });
});
