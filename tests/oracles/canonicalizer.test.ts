/**
 * Tests for Canonicalizer
 *
 * Verifies:
 * - Volatile field removal (duration, timestamp, seed)
 * - Deterministic sorting
 * - Consistent output for equivalent inputs
 */

import { describe, it, expect } from 'vitest';
import { canonicalizeVitestJson, serializeCanonical } from '../../tools/oracles/canonicalizer.js';

describe('Canonicalizer', () => {
  describe('canonicalizeVitestJson', () => {
    it('should remove volatile fields', () => {
      const raw = {
        testResults: [{
          name: 'test/example.test.ts',
          startTime: 1234567890,
          endTime: 1234567899,
          assertionResults: [{
            title: 'should work',
            ancestorTitles: ['Suite'],
            status: 'passed',
            duration: 123,
          }]
        }]
      };

      const canonical = canonicalizeVitestJson(raw);
      const json = JSON.parse(serializeCanonical(canonical));

      // Should NOT have volatile fields at root
      expect(json).not.toHaveProperty('startTime');
      expect(json).not.toHaveProperty('endTime');
      expect(json).not.toHaveProperty('duration');

      // Should NOT have volatile fields in results
      expect(json.results[0]).not.toHaveProperty('duration');
      expect(json.results[0]).not.toHaveProperty('startTime');
    });

    it('should sort results deterministically', () => {
      const raw = {
        testResults: [
          {
            name: 'z/test.ts',
            assertionResults: [{ title: 'b', ancestorTitles: [], status: 'passed' }]
          },
          {
            name: 'a/test.ts',
            assertionResults: [{ title: 'a', ancestorTitles: [], status: 'passed' }]
          }
        ]
      };

      const canonical = canonicalizeVitestJson(raw);

      expect(canonical.results[0].file).toBe('a/test.ts');
      expect(canonical.results[1].file).toBe('z/test.ts');
    });

    it('should normalize path separators', () => {
      const raw = {
        testResults: [{
          name: 'test\\windows\\path.test.ts',
          assertionResults: [{ title: 'test', ancestorTitles: [], status: 'passed' }]
        }]
      };

      const canonical = canonicalizeVitestJson(raw);

      expect(canonical.results[0].file).toBe('test/windows/path.test.ts');
    });

    it('should map status correctly', () => {
      const raw = {
        testResults: [{
          name: 'test.ts',
          assertionResults: [
            { title: 'passed', ancestorTitles: [], status: 'passed' },
            { title: 'failed', ancestorTitles: [], status: 'failed' },
            { title: 'skipped', ancestorTitles: [], status: 'skipped' },
            { title: 'pending', ancestorTitles: [], status: 'pending' },
          ]
        }]
      };

      const canonical = canonicalizeVitestJson(raw);

      expect(canonical.results.find(r => r.name === 'passed')?.status).toBe('pass');
      expect(canonical.results.find(r => r.name === 'failed')?.status).toBe('fail');
      expect(canonical.results.find(r => r.name === 'skipped')?.status).toBe('skip');
      expect(canonical.results.find(r => r.name === 'pending')?.status).toBe('skip');
    });

    it('should count tests correctly', () => {
      const raw = {
        testResults: [{
          name: 'test.ts',
          assertionResults: [
            { title: 'test1', ancestorTitles: [], status: 'passed' },
            { title: 'test2', ancestorTitles: [], status: 'passed' },
            { title: 'test3', ancestorTitles: [], status: 'failed' },
            { title: 'test4', ancestorTitles: [], status: 'skipped' },
          ]
        }]
      };

      const canonical = canonicalizeVitestJson(raw);

      expect(canonical.totalTests).toBe(4);
      expect(canonical.passed).toBe(2);
      expect(canonical.failed).toBe(1);
      expect(canonical.skipped).toBe(1);
    });

    it('should join ancestor titles with " > "', () => {
      const raw = {
        testResults: [{
          name: 'test.ts',
          assertionResults: [{
            title: 'test',
            ancestorTitles: ['Suite', 'Nested'],
            status: 'passed',
          }]
        }]
      };

      const canonical = canonicalizeVitestJson(raw);

      expect(canonical.results[0].suite).toBe('Suite > Nested');
    });
  });

  describe('serializeCanonical', () => {
    it('should produce identical output for equivalent inputs', () => {
      const raw1 = {
        testResults: [{
          name: 'test.ts',
          startTime: 111,
          assertionResults: [{ title: 'test', ancestorTitles: [], status: 'passed', duration: 100 }]
        }]
      };
      const raw2 = {
        testResults: [{
          name: 'test.ts',
          startTime: 222, // Different
          assertionResults: [{ title: 'test', ancestorTitles: [], status: 'passed', duration: 200 }] // Different
        }]
      };

      const canon1 = serializeCanonical(canonicalizeVitestJson(raw1));
      const canon2 = serializeCanonical(canonicalizeVitestJson(raw2));

      expect(canon1).toBe(canon2);
    });

    it('should produce valid JSON', () => {
      const raw = {
        testResults: [{
          name: 'test.ts',
          assertionResults: [{ title: 'test', ancestorTitles: [], status: 'passed' }]
        }]
      };

      const canonical = canonicalizeVitestJson(raw);
      const serialized = serializeCanonical(canonical);

      expect(() => JSON.parse(serialized)).not.toThrow();
    });

    it('should have newline at end', () => {
      const raw = {
        testResults: [{
          name: 'test.ts',
          assertionResults: [{ title: 'test', ancestorTitles: [], status: 'passed' }]
        }]
      };

      const canonical = canonicalizeVitestJson(raw);
      const serialized = serializeCanonical(canonical);

      expect(serialized.endsWith('\n')).toBe(true);
    });
  });
});
