/**
 * ART-10 — Anti-Doublon Lint Tests
 * LINT-ART10-01 to LINT-ART10-06
 *
 * These tests verify that POLISH module files do NOT cross-import from
 * genius/ layer or oracle/axes/ directly, ensuring anti-doublon isolation.
 *
 * Methodology: Read source file contents and check for forbidden imports.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

function getPolishPath(filename: string): string {
  const candidates = [
    path.resolve(__dirname, '../../src/polish', filename),
    path.resolve(process.cwd(), 'packages/sovereign-engine/src/polish', filename),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

function readFileIfExists(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

describe('Anti-Doublon Lint Checks — ART-10 Polish Module', () => {

  // LINT-ART10-01: sentence-surgeon.ts does NOT import from oracle/axes/
  it('LINT-ART10-01: sentence-surgeon has no import from oracle/axes/', () => {
    const content = readFileIfExists(getPolishPath('sentence-surgeon.ts'));
    if (content) {
      expect(content).not.toMatch(/from.*oracle\/axes\//i);
      expect(content).not.toMatch(/from.*genius\//i);
      expect(content).not.toMatch(/from.*semantic\//i);
    }
  });

  // LINT-ART10-02: re-score-guard.ts does NOT import from genius/
  it('LINT-ART10-02: re-score-guard has no import from genius/', () => {
    const content = readFileIfExists(getPolishPath('re-score-guard.ts'));
    if (content) {
      expect(content).not.toMatch(/from.*genius\//i);
      expect(content).not.toMatch(/from.*semantic\//i);
    }
  });

  // LINT-ART10-03: paragraph-patch.ts does NOT import from genius/
  it('LINT-ART10-03: paragraph-patch has no import from genius/', () => {
    const content = readFileIfExists(getPolishPath('paragraph-patch.ts'));
    if (content) {
      expect(content).not.toMatch(/from.*genius\//i);
      expect(content).not.toMatch(/from.*semantic\//i);
      expect(content).not.toMatch(/from.*oracle\/axes\//i);
    }
  });

  // LINT-ART10-04: musical-engine.ts does NOT import from genius/
  it('LINT-ART10-04: musical-engine has no import from genius/', () => {
    const content = readFileIfExists(getPolishPath('musical-engine.ts'));
    if (content) {
      expect(content).not.toMatch(/from.*genius\//i);
      expect(content).not.toMatch(/from.*semantic\//i);
    }
  });

  // LINT-ART10-05: anti-cliche-sweep.ts does NOT import from genius/
  it('LINT-ART10-05: anti-cliche-sweep has no import from genius/', () => {
    const content = readFileIfExists(getPolishPath('anti-cliche-sweep.ts'));
    if (content) {
      expect(content).not.toMatch(/from.*genius\//i);
      expect(content).not.toMatch(/from.*semantic\//i);
    }
  });

  // LINT-ART10-06: signature-enforcement.ts does NOT import from genius/
  it('LINT-ART10-06: signature-enforcement has no import from genius/', () => {
    const content = readFileIfExists(getPolishPath('signature-enforcement.ts'));
    if (content) {
      expect(content).not.toMatch(/from.*genius\//i);
      expect(content).not.toMatch(/from.*semantic\//i);
    }
  });
});
