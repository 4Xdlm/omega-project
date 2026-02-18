/**
 * ART-14 — Anti-Doublon Lint Tests
 * LINT-ART14-01 to LINT-ART14-04
 *
 * Verifies that phantom/ module files do NOT cross-import from
 * genius/ or scoring/ layers, ensuring anti-doublon isolation.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

function getPhantomPath(filename: string): string {
  const candidates = [
    path.resolve(__dirname, '../../src/phantom', filename),
    path.resolve(process.cwd(), 'packages/sovereign-engine/src/phantom', filename),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

function getAxisPath(filename: string): string {
  const candidates = [
    path.resolve(__dirname, '../../src/oracle/axes', filename),
    path.resolve(process.cwd(), 'packages/sovereign-engine/src/oracle/axes', filename),
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

describe('Anti-Doublon Lint Checks — ART-14 Phantom', () => {

  // LINT-ART14-01: phantom-state.ts does NOT import from genius/
  it('LINT-ART14-01: phantom-state has no import from genius/', () => {
    const content = readFileIfExists(getPhantomPath('phantom-state.ts'));
    if (content) {
      expect(content).not.toMatch(/from.*genius\//i);
      expect(content).not.toMatch(/from.*scoring\//i);
    }
  });

  // LINT-ART14-02: phantom-runner.ts does NOT import from genius/
  it('LINT-ART14-02: phantom-runner has no import from genius/', () => {
    const content = readFileIfExists(getPhantomPath('phantom-runner.ts'));
    if (content) {
      expect(content).not.toMatch(/from.*genius\//i);
      expect(content).not.toMatch(/from.*scoring\//i);
    }
  });

  // LINT-ART14-03: attention-sustain.ts does NOT import from genius/
  it('LINT-ART14-03: attention-sustain has no import from genius/', () => {
    const content = readFileIfExists(getAxisPath('attention-sustain.ts'));
    if (content) {
      expect(content).not.toMatch(/from.*genius\//i);
      expect(content).not.toMatch(/from.*scoring\//i);
    }
  });

  // LINT-ART14-04: fatigue-management.ts does NOT import from genius/
  it('LINT-ART14-04: fatigue-management has no import from genius/', () => {
    const content = readFileIfExists(getAxisPath('fatigue-management.ts'));
    if (content) {
      expect(content).not.toMatch(/from.*genius\//i);
      expect(content).not.toMatch(/from.*scoring\//i);
    }
  });
});
