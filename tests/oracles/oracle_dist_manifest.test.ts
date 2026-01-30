/**
 * Tests for ORACLE-2: Production Artefact Manifest
 *
 * Verifies:
 * - Manifest file generation
 * - Deterministic output (same hash across runs)
 * - Sorted entries
 * - Baseline matching (when baseline exists)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';

describe('ORACLE-2: dist manifest', () => {
  beforeAll(() => {
    // Ensure build exists
    if (!existsSync('dist/runner/main.js')) {
      execSync('npm run build', { stdio: 'inherit' });
    }
  });

  it('should generate manifest file', () => {
    execSync('npm run oracle:dist', { stdio: 'inherit' });

    expect(existsSync('artefacts/oracles/dist_manifest.txt')).toBe(true);
    expect(existsSync('artefacts/oracles/dist_manifest.sha256')).toBe(true);
  });

  it('should produce deterministic output (double run)', () => {
    execSync('npm run oracle:dist', { stdio: 'inherit' });
    const hash1 = readFileSync('artefacts/oracles/dist_manifest.sha256', 'utf8').trim();

    execSync('npm run oracle:dist', { stdio: 'inherit' });
    const hash2 = readFileSync('artefacts/oracles/dist_manifest.sha256', 'utf8').trim();

    expect(hash1).toBe(hash2);
  });

  it('should have valid SHA-256 hash format', () => {
    execSync('npm run oracle:dist', { stdio: 'inherit' });
    const hash = readFileSync('artefacts/oracles/dist_manifest.sha256', 'utf8').trim();

    // SHA-256 hash should be 64 hex characters (uppercase)
    expect(hash).toMatch(/^[A-F0-9]{64}$/);
  });

  it('should have sorted entries', () => {
    execSync('npm run oracle:dist', { stdio: 'inherit' });
    const content = readFileSync('artefacts/oracles/dist_manifest.txt', 'utf8');
    const lines = content.trim().split('\n');
    const paths = lines.map(l => l.split('  ')[1]);
    const sorted = [...paths].sort();

    expect(paths).toEqual(sorted);
  });

  it('should match baseline if baseline exists', () => {
    const baselinePath = 'baselines/oracles/dist_manifest.expected.sha256';

    if (existsSync(baselinePath)) {
      execSync('npm run oracle:dist', { stdio: 'inherit' });
      const actual = readFileSync('artefacts/oracles/dist_manifest.sha256', 'utf8').trim();
      const expected = readFileSync(baselinePath, 'utf8').trim();

      expect(actual).toBe(expected);
    } else {
      // No baseline - skip this test
      console.log('No baseline found, skipping baseline comparison');
    }
  });

  it('should include all required production files', () => {
    execSync('npm run oracle:dist', { stdio: 'inherit' });
    const content = readFileSync('artefacts/oracles/dist_manifest.txt', 'utf8');

    expect(content).toContain('dist/runner/main.js');
    expect(content).toContain('dist/auditpack/index.js');
  });
});
