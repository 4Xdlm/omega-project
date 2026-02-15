/**
 * Tests for Version Compat Guard — Sprint 6 Commit 6.3 (Roadmap 4.4)
 * Invariants: VG-01 to VG-05
 */

import { describe, it, expect, vi } from 'vitest';
import { assertVersion2 } from '../../src/compat/version-guard.js';

describe('Version Compat Guard (Roadmap 4.4)', () => {
  const VALID_RESULT = {
    version: '2.0.0',
    final_prose: 'test',
    verdict: 'SEAL' as const,
  };

  const UNDEFINED_RESULT = {
    // Missing version field
    final_prose: 'test',
    verdict: 'SEAL' as const,
  };

  const INVALID_RESULT = {
    version: '1.0.0',
    final_prose: 'test',
    verdict: 'SEAL' as const,
  };

  const BEFORE_CUTOFF = new Date('2026-02-15T00:00:00Z'); // Before 2026-03-01
  const AFTER_CUTOFF = new Date('2026-03-15T00:00:00Z'); // After 2026-03-01

  it('VG-01: v2.0.0 passes silently', () => {
    expect(() => assertVersion2(VALID_RESULT, BEFORE_CUTOFF)).not.toThrow();
    expect(() => assertVersion2(VALID_RESULT, AFTER_CUTOFF)).not.toThrow();
  });

  it('VG-02: undefined warns before cutoff (backward compat)', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() => assertVersion2(UNDEFINED_RESULT, BEFORE_CUTOFF)).not.toThrow();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[COMPAT]'),
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('2026-03-01'),
    );

    consoleWarnSpy.mockRestore();
  });

  it('VG-03: undefined fails after cutoff', () => {
    expect(() => assertVersion2(UNDEFINED_RESULT, AFTER_CUTOFF)).toThrow(
      /missing version field/i,
    );
    expect(() => assertVersion2(UNDEFINED_RESULT, AFTER_CUTOFF)).toThrow(
      /grace period expired/i,
    );
  });

  it('VG-04: wrong version fails immediately', () => {
    expect(() => assertVersion2(INVALID_RESULT, BEFORE_CUTOFF)).toThrow(
      /Invalid.*version.*"1.0.0"/i,
    );
    expect(() => assertVersion2(INVALID_RESULT, AFTER_CUTOFF)).toThrow(
      /Invalid.*version.*"1.0.0"/i,
    );
  });

  it('VG-05: guard structure validation', () => {
    // Function signature
    expect(typeof assertVersion2).toBe('function');

    // Accepts result + optional date
    expect(() => assertVersion2(VALID_RESULT)).not.toThrow();
    expect(() => assertVersion2(VALID_RESULT, BEFORE_CUTOFF)).not.toThrow();

    // Returns void (undefined)
    const result = assertVersion2(VALID_RESULT);
    expect(result).toBeUndefined();
  });
});
