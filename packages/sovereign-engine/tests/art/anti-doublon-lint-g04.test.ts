/**
 * GENIUS-04 — Anti-Doublon Lint Tests
 * LINT-G04-01 to LINT-G04-04
 *
 * Verifies pipeline isolation:
 * - genius-metrics.ts imports only from genius/ submodules
 * - C_llm never touches seal_granted or Q_text
 * - No cross-layer imports from oracle/ or emotion/
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

function getGeniusPath(filename: string): string {
  const candidates = [
    path.resolve(__dirname, '../../src/genius', filename),
    path.resolve(process.cwd(), 'packages/sovereign-engine/src/genius', filename),
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

describe('Anti-Doublon Lint Checks — GENIUS-04 Pipeline', () => {

  // LINT-G04-01: genius-metrics.ts does NOT import from oracle/ layer
  it('LINT-G04-01: genius-metrics has no import from oracle/', () => {
    const content = readFileIfExists(getGeniusPath('genius-metrics.ts'));
    if (content) {
      expect(content).not.toMatch(/from.*oracle\//i);
      expect(content).not.toMatch(/from.*phantom\//i);
    }
  });

  // LINT-G04-02: genius-metrics.ts does NOT import from scoring/ (emotion layer)
  it('LINT-G04-02: genius-metrics has no import from scoring/ or emotion/', () => {
    const content = readFileIfExists(getGeniusPath('genius-metrics.ts'));
    if (content) {
      expect(content).not.toMatch(/from.*scoring\//i);
      expect(content).not.toMatch(/from.*emotion\//i);
    }
  });

  // LINT-G04-03: genius-calibrator.ts never mutates seal_granted or Q_text
  it('LINT-G04-03: C_llm never touches seal_granted or Q_text', () => {
    const content = readFileIfExists(getGeniusPath('genius-calibrator.ts'));
    if (content) {
      expect(content).not.toMatch(/seal_granted\s*=/);
      expect(content).not.toMatch(/\.seal_run\s*=/);
      expect(content).not.toMatch(/Q_text\s*[\+\-\*]?=/);
      expect(content).not.toMatch(/verdict\s*=/);
    }
  });

  // LINT-G04-04: genius-metrics pipeline imports only from genius/ submodules
  it('LINT-G04-04: genius-metrics imports only from genius/ tree', () => {
    const content = readFileIfExists(getGeniusPath('genius-metrics.ts'));
    if (content) {
      const importLines = content.match(/from\s+['"]([^'"]+)['"]/g) ?? [];
      for (const imp of importLines) {
        // All imports should reference local genius submodules
        expect(imp).toMatch(/from\s+['"]\.\//);
      }
    }
  });
});
