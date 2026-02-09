/**
 * OMEGA Release — Self-Test Reporter Tests
 * Phase G.0
 */

import { describe, it, expect } from 'vitest';
import { formatSelfTestText, formatSelfTestJSON, selfTestSummary } from '../../src/selftest/reporter.js';
import type { SelfTestResult } from '../../src/selftest/types.js';

const MOCK_RESULT: SelfTestResult = {
  timestamp: '2026-02-10T00:00:00.000Z',
  version: '1.0.0',
  platform: 'win32-x64',
  checks: [
    { id: 'VERSION', name: 'Version File', status: 'PASS', message: 'Version: 1.0.0', duration_ms: 1 },
    { id: 'HASH_ENGINE', name: 'Hash Engine', status: 'PASS', message: 'SHA-256 operational', duration_ms: 2 },
    { id: 'MODULES', name: 'Critical Modules', status: 'PASS', message: '2 modules verified', duration_ms: 1 },
    { id: 'CLI', name: 'CLI Operational', status: 'PASS', message: '5 commands available', duration_ms: 0 },
    { id: 'INTEGRITY', name: 'Package Integrity', status: 'PASS', message: '2 critical files verified', duration_ms: 1 },
  ],
  verdict: 'PASS',
  duration_ms: 5,
};

describe('formatSelfTestText', () => {
  it('includes header', () => {
    const text = formatSelfTestText(MOCK_RESULT);
    expect(text).toContain('OMEGA Self-Test Report');
  });

  it('includes version', () => {
    const text = formatSelfTestText(MOCK_RESULT);
    expect(text).toContain('1.0.0');
  });

  it('includes all checks', () => {
    const text = formatSelfTestText(MOCK_RESULT);
    expect(text).toContain('[PASS]');
    expect(text).toContain('Version File');
    expect(text).toContain('Hash Engine');
  });

  it('includes verdict', () => {
    const text = formatSelfTestText(MOCK_RESULT);
    expect(text).toContain('Verdict: PASS');
  });
});

describe('formatSelfTestJSON', () => {
  it('is valid JSON', () => {
    const json = formatSelfTestJSON(MOCK_RESULT);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe('1.0.0');
    expect(parsed.checks).toHaveLength(5);
  });
});

describe('selfTestSummary', () => {
  it('summarizes result', () => {
    const summary = selfTestSummary(MOCK_RESULT);
    expect(summary).toContain('5/5');
    expect(summary).toContain('PASS');
  });
});
