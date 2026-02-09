/**
 * OMEGA Release — Changelog Validator Tests
 * Phase G.0
 */

import { describe, it, expect } from 'vitest';
import { validateChangelog, validateChangelogContent } from '../../src/changelog/validator.js';
import type { Changelog } from '../../src/changelog/types.js';

describe('validateChangelog', () => {
  it('validates valid changelog', () => {
    const cl: Changelog = {
      versions: [{
        version: '1.0.0',
        date: '2026-02-10',
        entries: [{ type: 'Added', message: 'Initial release' }],
      }],
      unreleased: [],
    };
    const result = validateChangelog(cl);
    expect(result.valid).toBe(true);
  });

  it('rejects empty changelog', () => {
    const cl: Changelog = { versions: [], unreleased: [] };
    const result = validateChangelog(cl);
    expect(result.valid).toBe(false);
  });

  it('reports invalid date format', () => {
    const cl: Changelog = {
      versions: [{
        version: '1.0.0',
        date: 'Feb 10 2026',
        entries: [{ type: 'Added', message: 'Test' }],
      }],
      unreleased: [],
    };
    const result = validateChangelog(cl);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('date format'))).toBe(true);
  });

  it('warns on empty entries', () => {
    const cl: Changelog = {
      versions: [{ version: '1.0.0', date: '2026-02-10', entries: [] }],
      unreleased: [],
    };
    const result = validateChangelog(cl);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe('validateChangelogContent', () => {
  it('validates proper format', () => {
    const content = '# Changelog\n\nBased on [Keep a Changelog] and [Semantic Versioning].\n';
    const result = validateChangelogContent(content);
    expect(result.valid).toBe(true);
  });

  it('rejects missing header', () => {
    const content = 'No header here\n';
    const result = validateChangelogContent(content);
    expect(result.valid).toBe(false);
  });
});
