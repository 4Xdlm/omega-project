/**
 * ART-09 — Anti-Doublon Lint Tests
 * LINT-ART09-01 to LINT-ART09-06
 *
 * These tests verify that SEMANTIC module files do NOT cross-import from
 * scoring/oracle layers, ensuring anti-doublon isolation.
 *
 * Methodology: Read source file contents and check for forbidden imports.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

function getSemanticPath(filename: string): string {
  const candidates = [
    path.resolve(__dirname, '../../src/semantic', filename),
    path.resolve(process.cwd(), 'packages/sovereign-engine/src/semantic', filename),
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

describe('Anti-Doublon Lint Checks — ART-09 Semantic Module', () => {

  // LINT-ART09-01: semantic-analyzer.ts does NOT import from scoring layer
  it('LINT-ART09-01: semantic-analyzer has no import from scoring/', () => {
    const content = readFileIfExists(getSemanticPath('semantic-analyzer.ts'));
    if (content) {
      expect(content).not.toMatch(/from.*scoring\//i);
      expect(content).not.toMatch(/from.*oracle\/axes\//i);
      expect(content).not.toMatch(/import.*ECC/);
      expect(content).not.toMatch(/import.*RCI[^_]/);
    }
  });

  // LINT-ART09-02: semantic-cache.ts does NOT import external HTTP libs
  it('LINT-ART09-02: semantic-cache has no external HTTP imports', () => {
    const content = readFileIfExists(getSemanticPath('semantic-cache.ts'));
    if (content) {
      expect(content).not.toMatch(/import.*axios/i);
      expect(content).not.toMatch(/import.*node-fetch/i);
      expect(content).not.toMatch(/fetch\s*\(/);
      expect(content).not.toMatch(/import.*openai/i);
      expect(content).not.toMatch(/import.*anthropic/i);
    }
  });

  // LINT-ART09-03: emotion-contradiction.ts does NOT import from oracle/
  it('LINT-ART09-03: emotion-contradiction has no import from oracle/', () => {
    const content = readFileIfExists(getSemanticPath('emotion-contradiction.ts'));
    if (content) {
      expect(content).not.toMatch(/from.*oracle\//i);
      expect(content).not.toMatch(/from.*scoring\//i);
      expect(content).not.toMatch(/import.*TemporalEngine/i);
    }
  });

  // LINT-ART09-04: emotion-to-action.ts does NOT import external modules
  it('LINT-ART09-04: emotion-to-action has no import from oracle/ or scoring/', () => {
    const content = readFileIfExists(getSemanticPath('emotion-to-action.ts'));
    if (content) {
      expect(content).not.toMatch(/from.*oracle\//i);
      expect(content).not.toMatch(/from.*scoring\//i);
      expect(content).not.toMatch(/from.*genius\//i);
    }
  });

  // LINT-ART09-05: semantic-validation.ts does NOT import from runtime/
  it('LINT-ART09-05: semantic-validation has no import from runtime/', () => {
    const content = readFileIfExists(getSemanticPath('semantic-validation.ts'));
    if (content) {
      expect(content).not.toMatch(/from.*runtime\//i);
      expect(content).not.toMatch(/from.*oracle\//i);
      expect(content).not.toMatch(/from.*genius\//i);
    }
  });

  // LINT-ART09-06: semantic-prompts.ts is self-contained (no source imports)
  it('LINT-ART09-06: semantic-prompts is self-contained', () => {
    const content = readFileIfExists(getSemanticPath('semantic-prompts.ts'));
    if (content) {
      expect(content).not.toMatch(/from.*oracle\//i);
      expect(content).not.toMatch(/from.*scoring\//i);
      expect(content).not.toMatch(/from.*genius\//i);
      expect(content).not.toMatch(/from.*runtime\//i);
      // Should have zero imports from other modules (only local)
      const imports = content.match(/from\s+['"]([^'"]+)['"]/g) ?? [];
      for (const imp of imports) {
        expect(imp).not.toMatch(/from\s+['"](?!\.)/);
      }
    }
  });
});
