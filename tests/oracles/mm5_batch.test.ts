/**
 * MM5: Batch Command Verification
 *
 * Tests the batch execution functionality to ensure
 * consistent processing of multiple intents.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, readdirSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

describe('MM5: Batch command verification', () => {
  const BATCH_TEST_DIR = 'artefacts/batch_test_intents';

  beforeAll(() => {
    // Ensure build exists
    if (!existsSync('dist/runner/main.js')) {
      execSync('npm run build', { stdio: 'inherit' });
    }

    // Create test batch directory with controlled intents
    if (existsSync(BATCH_TEST_DIR)) {
      rmSync(BATCH_TEST_DIR, { recursive: true });
    }
    mkdirSync(BATCH_TEST_DIR, { recursive: true });

    // Create two test intents
    writeFileSync(join(BATCH_TEST_DIR, 'batch_test_1.json'), JSON.stringify({
      intentId: 'batch_test_1',
      actorId: 'batch_actor',
      content: 'Batch test content 1',
      goal: 'Test batch execution',
      toneId: 'NEUTRAL',
      forbiddenSetId: 'OMEGA_DEFAULT',
      domain: 'test'
    }, null, 2));

    writeFileSync(join(BATCH_TEST_DIR, 'batch_test_2.json'), JSON.stringify({
      intentId: 'batch_test_2',
      actorId: 'batch_actor',
      content: 'Batch test content 2',
      goal: 'Test batch execution',
      toneId: 'NEUTRAL',
      forbiddenSetId: 'OMEGA_DEFAULT',
      domain: 'test'
    }, null, 2));
  });

  it('should execute batch with multiple intents', () => {
    const result = execSync(`node dist/runner/main.js batch --dir ${BATCH_TEST_DIR}`, {
      encoding: 'utf8',
    });

    expect(result).toContain('Processing');
    expect(result).toContain('Batch Complete');
  });

  it('should process files in alphabetical order', () => {
    const result = execSync(`node dist/runner/main.js batch --dir ${BATCH_TEST_DIR}`, {
      encoding: 'utf8',
    });

    // batch_test_1.json should be processed before batch_test_2.json
    const pos1 = result.indexOf('batch_test_1.json');
    const pos2 = result.indexOf('batch_test_2.json');

    expect(pos1).toBeGreaterThan(-1);
    expect(pos2).toBeGreaterThan(-1);
    expect(pos1).toBeLessThan(pos2);
  });

  it('should report success count', () => {
    const result = execSync(`node dist/runner/main.js batch --dir ${BATCH_TEST_DIR}`, {
      encoding: 'utf8',
    });

    expect(result).toContain('Success:');
    const successMatch = result.match(/Success:\s+(\d+)/);
    expect(successMatch).not.toBeNull();
    expect(parseInt(successMatch![1])).toBe(2);
  });

  it('should produce deterministic results for same batch', () => {
    // Run batch twice
    const result1 = execSync(`node dist/runner/main.js batch --dir ${BATCH_TEST_DIR}`, {
      encoding: 'utf8',
    });
    const result2 = execSync(`node dist/runner/main.js batch --dir ${BATCH_TEST_DIR}`, {
      encoding: 'utf8',
    });

    // Extract run hashes for each intent
    const hashes1 = result1.match(/Run Hash:\s+([A-Fa-f0-9]+)/g) || [];
    const hashes2 = result2.match(/Run Hash:\s+([A-Fa-f0-9]+)/g) || [];

    expect(hashes1.length).toBe(hashes2.length);
    expect(hashes1.length).toBe(2);

    // Each corresponding hash should match
    for (let i = 0; i < hashes1.length; i++) {
      expect(hashes1[i]).toBe(hashes2[i]);
    }
  });

  it('should fail gracefully for non-existent directory', () => {
    expect(() => {
      execSync('node dist/runner/main.js batch --dir nonexistent_dir', {
        encoding: 'utf8',
        stdio: 'pipe',
      });
    }).toThrow();
  });

  it('should fail gracefully for directory with no JSON files', () => {
    const emptyDir = 'artefacts/empty_batch_test';
    mkdirSync(emptyDir, { recursive: true });
    writeFileSync(join(emptyDir, 'not_json.txt'), 'not a json file');

    expect(() => {
      execSync(`node dist/runner/main.js batch --dir ${emptyDir}`, {
        encoding: 'utf8',
        stdio: 'pipe',
      });
    }).toThrow();

    rmSync(emptyDir, { recursive: true });
  });
});
