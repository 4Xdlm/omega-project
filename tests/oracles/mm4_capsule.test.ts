/**
 * MM4: Capsule Command Verification
 *
 * Tests the capsule creation functionality to ensure
 * deterministic, hermetic capsule generation.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, rmSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

describe('MM4: Capsule command verification', () => {
  // Capsule must output to artefacts/runs/ or .test_* paths per I-INV-08
  const CAPSULE_OUTPUT = 'artefacts/runs/test_capsule.zip';
  let runPath: string = '';

  beforeAll(() => {
    // Ensure build exists
    if (!existsSync('dist/runner/main.js')) {
      execSync('npm run build', { stdio: 'inherit' });
    }

    // Create a run to capsule
    const result = execSync('node dist/runner/main.js run --intent intents/intent_mvp.json', {
      encoding: 'utf8',
    });

    // Extract run path from output (relative path, not absolute)
    const pathMatch = result.match(/Run Path:\s+(.+)/);
    if (pathMatch) {
      // The runner returns absolute path, convert to relative
      const absPath = pathMatch[1].trim();
      // Extract just the artefacts/runs/... part
      const artefactsIndex = absPath.indexOf('artefacts');
      if (artefactsIndex >= 0) {
        runPath = absPath.substring(artefactsIndex).replace(/\\/g, '/');
      } else {
        runPath = absPath;
      }
    }

    // Clean up previous test capsule
    if (existsSync(CAPSULE_OUTPUT)) {
      rmSync(CAPSULE_OUTPUT);
    }
  });

  afterAll(() => {
    // Clean up test capsules
    if (existsSync(CAPSULE_OUTPUT)) {
      rmSync(CAPSULE_OUTPUT);
    }
    if (existsSync(CAPSULE_OUTPUT + '1')) {
      rmSync(CAPSULE_OUTPUT + '1');
    }
    if (existsSync(CAPSULE_OUTPUT + '2')) {
      rmSync(CAPSULE_OUTPUT + '2');
    }
  });

  it('should have valid run path from setup', () => {
    expect(runPath).not.toBe('');
    expect(existsSync(runPath)).toBe(true);
  });

  it('should create capsule from run artifacts', () => {
    const result = execSync(
      `node dist/runner/main.js capsule --run "${runPath}" --output ${CAPSULE_OUTPUT}`,
      { encoding: 'utf8' }
    );

    expect(result).toContain('Capsule created successfully');
    expect(existsSync(CAPSULE_OUTPUT)).toBe(true);
  });

  it('should include hash in capsule output', () => {
    if (existsSync(CAPSULE_OUTPUT)) {
      rmSync(CAPSULE_OUTPUT);
    }

    const result = execSync(
      `node dist/runner/main.js capsule --run "${runPath}" --output ${CAPSULE_OUTPUT}`,
      { encoding: 'utf8' }
    );

    expect(result).toContain('Hash:');
    const hashMatch = result.match(/Hash:\s+([A-Fa-f0-9]+)/);
    expect(hashMatch).not.toBeNull();
  });

  it('should produce deterministic capsule (double run)', () => {
    // Create first capsule
    if (existsSync(CAPSULE_OUTPUT + '1')) rmSync(CAPSULE_OUTPUT + '1');
    const result1 = execSync(
      `node dist/runner/main.js capsule --run "${runPath}" --output ${CAPSULE_OUTPUT}1`,
      { encoding: 'utf8' }
    );

    // Create second capsule
    if (existsSync(CAPSULE_OUTPUT + '2')) rmSync(CAPSULE_OUTPUT + '2');
    const result2 = execSync(
      `node dist/runner/main.js capsule --run "${runPath}" --output ${CAPSULE_OUTPUT}2`,
      { encoding: 'utf8' }
    );

    // Extract hashes
    const hashMatch1 = result1.match(/Hash:\s+([A-Fa-f0-9]+)/);
    const hashMatch2 = result2.match(/Hash:\s+([A-Fa-f0-9]+)/);

    expect(hashMatch1).not.toBeNull();
    expect(hashMatch2).not.toBeNull();
    expect(hashMatch1![1]).toBe(hashMatch2![1]);
  });

  it('should report file count in output', () => {
    if (existsSync(CAPSULE_OUTPUT)) {
      rmSync(CAPSULE_OUTPUT);
    }

    const result = execSync(
      `node dist/runner/main.js capsule --run "${runPath}" --output ${CAPSULE_OUTPUT}`,
      { encoding: 'utf8' }
    );

    expect(result).toContain('Files:');
    const filesMatch = result.match(/Files:\s+(\d+)/);
    expect(filesMatch).not.toBeNull();
    expect(parseInt(filesMatch![1])).toBeGreaterThan(0);
  });

  it('should fail gracefully for non-existent run', () => {
    expect(() => {
      execSync(
        'node dist/runner/main.js capsule --run nonexistent_run_path --output test.zip',
        { encoding: 'utf8', stdio: 'pipe' }
      );
    }).toThrow();
  });
});
