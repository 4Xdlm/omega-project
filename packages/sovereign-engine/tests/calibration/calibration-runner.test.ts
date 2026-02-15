/**
 * Tests for calibration runner — Sprint 5 Commit 5.3
 * Invariants: CAL-RUN-01 to CAL-RUN-03
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOVEREIGN_CONFIG } from '../../src/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.resolve(__dirname, '../../scripts/run-calibration.ts');

describe('calibration runner', () => {
  it('CAL-RUN-01: config contains calibration entries', () => {
    expect(SOVEREIGN_CONFIG).toHaveProperty('CALIBRATION_RUNS');
    expect(SOVEREIGN_CONFIG).toHaveProperty('CALIBRATION_SCENES');
    expect(SOVEREIGN_CONFIG).toHaveProperty('CALIBRATION_OUTPUT_PATH');

    expect(typeof SOVEREIGN_CONFIG.CALIBRATION_RUNS).toBe('number');
    expect(SOVEREIGN_CONFIG.CALIBRATION_RUNS).toBeGreaterThan(0);

    expect(Array.isArray(SOVEREIGN_CONFIG.CALIBRATION_SCENES)).toBe(true);
    expect(SOVEREIGN_CONFIG.CALIBRATION_SCENES.length).toBeGreaterThan(0);

    expect(typeof SOVEREIGN_CONFIG.CALIBRATION_OUTPUT_PATH).toBe('string');
  });

  it('CAL-RUN-02: calibration script file exists and has correct structure', () => {
    // Verify script exists
    expect(fs.existsSync(scriptPath)).toBe(true);

    // Read script content
    const content = fs.readFileSync(scriptPath, 'utf-8');

    // Verify key components are present
    expect(content).toContain('runSovereignForge');
    expect(content).toContain('CalibrationReport');
    expect(content).toContain('runCalibration');
    expect(content).toContain('SOVEREIGN_CONFIG.CALIBRATION_RUNS');
    expect(content).toContain('calibration-report.json');

    // Verify it's executable
    expect(content).toContain('#!/usr/bin/env node');
  });

  it('CAL-RUN-03: calibration output path is defined correctly', () => {
    const outputPath = SOVEREIGN_CONFIG.CALIBRATION_OUTPUT_PATH;

    // Validate output path format
    expect(outputPath).toBeTruthy();
    expect(outputPath).toContain('.json');
    expect(outputPath).toContain('calibration');

    // Validate it's a relative path
    expect(outputPath.startsWith('./')).toBe(true);
  });
});
