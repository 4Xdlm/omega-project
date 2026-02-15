/**
 * Tests for Calibration CI Suite — Sprint 8 Commit 8.3 (HARDEN-CAL-CI-01)
 * Fixed corpus validation (no LIVE LLM, deterministic corpus structure)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { judgeAesthetic } from '../../src/oracle/aesthetic-oracle.js';
import { MockSovereignProvider } from '../fixtures/mock-provider.js';
import { MOCK_PACKET } from '../fixtures/mock-packet.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPUS_DIR = resolve(__dirname, '..', 'fixtures', 'calibration-corpus');

interface CalibrationCase {
  run_id: string;
  seed: string;
  prose: string;
}

function loadCase(caseId: string): CalibrationCase {
  const path = resolve(CORPUS_DIR, `${caseId}.json`);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function countParagraphs(prose: string): number {
  return prose.split('\n\n').filter(p => p.trim().length > 0).length;
}

describe('Calibration CI Suite (HARDEN-CAL-CI-01)', () => {
  const mockProvider = new MockSovereignProvider();

  it('CAL-CI-01: Case 01 corpus valid structure', async () => {
    const calCase = loadCase('CAL-CASE-01');

    // Validate structure
    expect(calCase.run_id).toBe('CAL-CASE-01');
    expect(calCase.seed).toBeDefined();
    expect(calCase.prose).toBeDefined();

    // Validate >= 8 paragraphs (avoid NaN)
    const paraCount = countParagraphs(calCase.prose);
    expect(paraCount).toBeGreaterThanOrEqual(8);

    // Run aesthetic judge to prove pipeline doesn't crash
    const result = await judgeAesthetic(MOCK_PACKET, calCase.prose, mockProvider);
    expect(result.composite).toBeGreaterThanOrEqual(0);
    expect(result.composite).toBeLessThanOrEqual(100);
  });

  it('CAL-CI-02: Case 02 corpus valid structure', async () => {
    const calCase = loadCase('CAL-CASE-02');
    expect(calCase.run_id).toBe('CAL-CASE-02');
    expect(countParagraphs(calCase.prose)).toBeGreaterThanOrEqual(8);

    const result = await judgeAesthetic(MOCK_PACKET, calCase.prose, mockProvider);
    expect(result.composite).toBeGreaterThanOrEqual(0);
    expect(result.composite).toBeLessThanOrEqual(100);
  });

  it('CAL-CI-03: Case 03 corpus valid structure', async () => {
    const calCase = loadCase('CAL-CASE-03');
    expect(calCase.run_id).toBe('CAL-CASE-03');
    expect(countParagraphs(calCase.prose)).toBeGreaterThanOrEqual(8);

    const result = await judgeAesthetic(MOCK_PACKET, calCase.prose, mockProvider);
    expect(result.composite).toBeGreaterThanOrEqual(0);
    expect(result.composite).toBeLessThanOrEqual(100);
  });

  it('CAL-CI-04: Case 04 corpus valid structure', async () => {
    const calCase = loadCase('CAL-CASE-04');
    expect(calCase.run_id).toBe('CAL-CASE-04');
    expect(countParagraphs(calCase.prose)).toBeGreaterThanOrEqual(8);

    const result = await judgeAesthetic(MOCK_PACKET, calCase.prose, mockProvider);
    expect(result.composite).toBeGreaterThanOrEqual(0);
    expect(result.composite).toBeLessThanOrEqual(100);
  });

  it('CAL-CI-05: Case 05 corpus valid structure', async () => {
    const calCase = loadCase('CAL-CASE-05');
    expect(calCase.run_id).toBe('CAL-CASE-05');
    expect(countParagraphs(calCase.prose)).toBeGreaterThanOrEqual(8);

    const result = await judgeAesthetic(MOCK_PACKET, calCase.prose, mockProvider);
    expect(result.composite).toBeGreaterThanOrEqual(0);
    expect(result.composite).toBeLessThanOrEqual(100);
  });
});
