/**
 * ART-12 — Anti-Doublon Lint Tests
 * LINT-ART12-01 to LINT-ART12-06
 *
 * Verifies that metaphor/ module files do NOT cross-import from
 * genius/, oracle/, or semantic/ layers, ensuring anti-doublon isolation.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

function getMetaphorPath(filename: string): string {
  const candidates = [
    path.resolve(__dirname, '../../src/metaphor', filename),
    path.resolve(process.cwd(), 'packages/sovereign-engine/src/metaphor', filename),
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

describe('Anti-Doublon Lint Checks — ART-12 Metaphor Module', () => {

  // LINT-ART12-01: dead-metaphor-blacklist.ts does NOT import from oracle/
  it('LINT-ART12-01: dead-metaphor-blacklist has no import from oracle/', () => {
    const content = readFileIfExists(getMetaphorPath('dead-metaphor-blacklist.ts'));
    if (content) {
      expect(content).not.toMatch(/from.*oracle\//i);
      expect(content).not.toMatch(/from.*genius\//i);
    }
  });

  // LINT-ART12-02: novelty-scorer.ts does NOT import from genius/
  it('LINT-ART12-02: novelty-scorer has no import from genius/', () => {
    const content = readFileIfExists(getMetaphorPath('novelty-scorer.ts'));
    if (content) {
      expect(content).not.toMatch(/from.*genius\//i);
      expect(content).not.toMatch(/from.*scoring\//i);
    }
  });

  // LINT-ART12-03: novelty-scorer.ts does NOT import from runtime/
  it('LINT-ART12-03: novelty-scorer has no import from runtime/', () => {
    const content = readFileIfExists(getMetaphorPath('novelty-scorer.ts'));
    if (content) {
      expect(content).not.toMatch(/from.*runtime\//i);
      expect(content).not.toMatch(/from.*oracle\//i);
    }
  });

  // LINT-ART12-04: dead-metaphor-blacklist.ts does NOT import from genius/
  it('LINT-ART12-04: dead-metaphor-blacklist has no import from genius/', () => {
    const content = readFileIfExists(getMetaphorPath('dead-metaphor-blacklist.ts'));
    if (content) {
      expect(content).not.toMatch(/from.*genius\//i);
      expect(content).not.toMatch(/from.*runtime\//i);
    }
  });

  // LINT-ART12-05: metaphor-detector.ts does NOT import from genius/
  it('LINT-ART12-05: metaphor-detector has no import from genius/', () => {
    const content = readFileIfExists(getMetaphorPath('metaphor-detector.ts'));
    if (content) {
      expect(content).not.toMatch(/from.*genius\//i);
      expect(content).not.toMatch(/from.*scoring\//i);
    }
  });

  // LINT-ART12-06: dead-metaphor-blacklist.ts does NOT import from semantic/
  it('LINT-ART12-06: dead-metaphor-blacklist has no import from semantic/', () => {
    const content = readFileIfExists(getMetaphorPath('dead-metaphor-blacklist.ts'));
    if (content) {
      expect(content).not.toMatch(/from.*semantic\//i);
      expect(content).not.toMatch(/from.*polish\//i);
      // dead-metaphor-blacklist should be self-contained (no external module imports)
      const imports = content.match(/from\s+['"]([^'"]+)['"]/g) ?? [];
      for (const imp of imports) {
        expect(imp).not.toMatch(/from\s+['"](?!\.)/);
      }
    }
  });
});
