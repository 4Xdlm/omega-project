/**
 * MM3: Multi-Fixture Test Suite
 *
 * Tests the runner with diverse intent fixtures to ensure
 * comprehensive coverage of edge cases and scenarios.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, readdirSync } from 'fs';

describe('MM3: Multi-fixture test suite', () => {
  beforeAll(() => {
    // Ensure build exists
    if (!existsSync('dist/runner/main.js')) {
      execSync('npm run build', { stdio: 'inherit' });
    }
  });

  it('should succeed with minimal intent', () => {
    const result = execSync('node dist/runner/main.js run --intent intents/intent_minimal.json', {
      encoding: 'utf8',
    });

    expect(result).toContain('Run completed successfully');
    expect(result).toContain('intent_minimal');
  });

  it('should succeed with mvp intent', () => {
    const result = execSync('node dist/runner/main.js run --intent intents/intent_mvp.json', {
      encoding: 'utf8',
    });

    expect(result).toContain('Run completed successfully');
  });

  it('should succeed with full intent', () => {
    const result = execSync('node dist/runner/main.js run --intent intents/intent_full.json', {
      encoding: 'utf8',
    });

    expect(result).toContain('Run completed successfully');
    expect(result).toContain('intent_full');
  });

  it('should fail gracefully on empty content', () => {
    // Empty content is invalid - pipeline should fail gracefully
    expect(() => {
      execSync('node dist/runner/main.js run --intent intents/intent_edge_empty.json', {
        encoding: 'utf8',
        stdio: 'pipe',
      });
    }).toThrow();
  });

  it('should handle edge case: unicode content', () => {
    const result = execSync('node dist/runner/main.js run --intent intents/intent_edge_unicode.json', {
      encoding: 'utf8',
    });

    expect(result).toContain('Run completed successfully');
  });

  it('should produce deterministic run hash for same intent', () => {
    // Run twice with same intent
    const result1 = execSync('node dist/runner/main.js run --intent intents/intent_minimal.json', {
      encoding: 'utf8',
    });
    const result2 = execSync('node dist/runner/main.js run --intent intents/intent_minimal.json', {
      encoding: 'utf8',
    });

    // Extract run hash from output
    const hashMatch1 = result1.match(/Run Hash:\s+([A-Fa-f0-9]+)/);
    const hashMatch2 = result2.match(/Run Hash:\s+([A-Fa-f0-9]+)/);

    expect(hashMatch1).not.toBeNull();
    expect(hashMatch2).not.toBeNull();

    // Hashes should be identical for deterministic runs
    expect(hashMatch1![1]).toBe(hashMatch2![1]);
  });

  it('should create run directory for each intent', () => {
    execSync('node dist/runner/main.js run --intent intents/intent_minimal.json', {
      encoding: 'utf8',
    });

    const runsDir = 'artefacts/runs';
    const runDirs = readdirSync(runsDir).filter(d => d.startsWith('run_intent_minimal'));

    expect(runDirs.length).toBeGreaterThan(0);
  });

  it('should produce consistent output structure', () => {
    const result = execSync('node dist/runner/main.js run --intent intents/intent_minimal.json', {
      encoding: 'utf8',
    });

    // Verify output contains expected fields
    expect(result).toContain('Run ID:');
    expect(result).toContain('Run Path:');
    expect(result).toContain('Run Hash:');
  });
});
