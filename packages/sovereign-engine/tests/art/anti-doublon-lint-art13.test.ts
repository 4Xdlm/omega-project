/**
 * ART-13 — Anti-Doublon Lint Tests
 * LINT-ART13-01 to LINT-ART13-04
 *
 * Verifies that voice/ module files do NOT cross-import from
 * genius/ or oracle/ layers, ensuring anti-doublon isolation.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

function getVoicePath(filename: string): string {
  const candidates = [
    path.resolve(__dirname, '../../src/voice', filename),
    path.resolve(process.cwd(), 'packages/sovereign-engine/src/voice', filename),
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

describe('Anti-Doublon Lint Checks — ART-13 Voice', () => {

  // LINT-ART13-01: voice-genome.ts does NOT import from genius/
  it('LINT-ART13-01: voice-genome has no import from genius/', () => {
    const content = readFileIfExists(getVoicePath('voice-genome.ts'));
    if (content) {
      expect(content).not.toMatch(/from.*genius\//i);
      expect(content).not.toMatch(/from.*scoring\//i);
    }
  });

  // LINT-ART13-02: voice-compiler.ts does NOT import from genius/
  it('LINT-ART13-02: voice-compiler has no import from genius/', () => {
    const content = readFileIfExists(getVoicePath('voice-compiler.ts'));
    if (content) {
      expect(content).not.toMatch(/from.*genius\//i);
      expect(content).not.toMatch(/from.*oracle\//i);
    }
  });

  // LINT-ART13-03: voice-conformity.ts does NOT import from genius/
  it('LINT-ART13-03: voice-conformity has no import from genius/', () => {
    const content = readFileIfExists(getAxisPath('voice-conformity.ts'));
    if (content) {
      expect(content).not.toMatch(/from.*genius\//i);
      expect(content).not.toMatch(/from.*scoring\//i);
    }
  });

  // LINT-ART13-04: voice-genome.ts does NOT import from oracle/
  it('LINT-ART13-04: voice-genome has no import from oracle/', () => {
    const content = readFileIfExists(getVoicePath('voice-genome.ts'));
    if (content) {
      expect(content).not.toMatch(/from.*oracle\//i);
      expect(content).not.toMatch(/from.*runtime\//i);
    }
  });
});
