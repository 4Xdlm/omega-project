/**
 * ART-11 — Anti-Doublon Lint Tests
 * LINT-ART11-01 to LINT-ART11-06
 *
 * Verifies that silence/ and authenticity/ modules do NOT cross-import
 * from genius/, oracle/, or runtime/ layers, ensuring anti-doublon isolation.
 *
 * Methodology: Read source file contents and check for forbidden imports.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

function getSilencePath(filename: string): string {
  const candidates = [
    path.resolve(__dirname, '../../src/silence', filename),
    path.resolve(process.cwd(), 'packages/sovereign-engine/src/silence', filename),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

function getAuthenticityPath(filename: string): string {
  const candidates = [
    path.resolve(__dirname, '../../src/authenticity', filename),
    path.resolve(process.cwd(), 'packages/sovereign-engine/src/authenticity', filename),
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

describe('Anti-Doublon Lint Checks — ART-11 Silence & Authenticity', () => {

  // LINT-ART11-01: show-dont-tell.ts does NOT import from genius/
  it('LINT-ART11-01: show-dont-tell has no import from genius/', () => {
    const content = readFileIfExists(getSilencePath('show-dont-tell.ts'));
    if (content) {
      expect(content).not.toMatch(/from.*genius\//i);
      expect(content).not.toMatch(/from.*scoring\//i);
    }
  });

  // LINT-ART11-02: ia-smell-patterns.ts does NOT import provider/LLM
  it('LINT-ART11-02: ia-smell-patterns has no import from provider or LLM', () => {
    const content = readFileIfExists(getAuthenticityPath('ia-smell-patterns.ts'));
    if (content) {
      expect(content).not.toMatch(/from.*provider/i);
      expect(content).not.toMatch(/from.*runtime\//i);
      expect(content).not.toMatch(/import.*anthropic/i);
      expect(content).not.toMatch(/import.*openai/i);
    }
  });

  // LINT-ART11-03: telling-patterns.ts does NOT import from oracle/
  it('LINT-ART11-03: telling-patterns has no import from oracle/', () => {
    const content = readFileIfExists(getSilencePath('telling-patterns.ts'));
    if (content) {
      expect(content).not.toMatch(/from.*oracle\//i);
      expect(content).not.toMatch(/from.*genius\//i);
      expect(content).not.toMatch(/from.*scoring\//i);
    }
  });

  // LINT-ART11-04: authenticity-scorer.ts does NOT import from genius/
  it('LINT-ART11-04: authenticity-scorer has no import from genius/', () => {
    const content = readFileIfExists(getAuthenticityPath('authenticity-scorer.ts'));
    if (content) {
      expect(content).not.toMatch(/from.*genius\//i);
      expect(content).not.toMatch(/from.*scoring\//i);
      expect(content).not.toMatch(/from.*oracle\//i);
    }
  });

  // LINT-ART11-05: adversarial-judge.ts does NOT import from genius/
  it('LINT-ART11-05: adversarial-judge has no import from genius/', () => {
    const content = readFileIfExists(getAuthenticityPath('adversarial-judge.ts'));
    if (content) {
      expect(content).not.toMatch(/from.*genius\//i);
      expect(content).not.toMatch(/from.*scoring\//i);
      expect(content).not.toMatch(/from.*oracle\//i);
    }
  });

  // LINT-ART11-06: telling-patterns.ts does NOT import from runtime/
  it('LINT-ART11-06: telling-patterns has no import from runtime/', () => {
    const content = readFileIfExists(getSilencePath('telling-patterns.ts'));
    if (content) {
      expect(content).not.toMatch(/from.*runtime\//i);
      expect(content).not.toMatch(/from.*semantic\//i);
      // telling-patterns should have zero external imports (self-contained)
      const imports = content.match(/from\s+['"]([^'"]+)['"]/g) ?? [];
      for (const imp of imports) {
        expect(imp).not.toMatch(/from\s+['"](?!\.)/);
      }
    }
  });
});
