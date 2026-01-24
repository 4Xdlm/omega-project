/**
 * OMEGA V4.4 — NO MAGIC NUMBERS TEST
 *
 * CRITICAL TEST: Verifies Phase 1 contract contains NO numeric literals
 * (except in constants.ts which defines canon values from Vision Scellée)
 *
 * STANDARD: NASA-Grade L4 / DO-178C Level A
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const PHASE1_DIR = path.resolve(__dirname, '../../src/phase1_contract');

/**
 * Files that are ALLOWED to contain numeric literals
 * (Canon values from Vision Scellée)
 */
const ALLOWED_FILES = [
  'constants.ts',  // Canon emotion parameters from Vision Scellée
];

/**
 * Patterns that are ALLOWED to contain numbers
 */
const ALLOWED_PATTERNS = [
  /\/\*\*[\s\S]*?\*\//g,           // JSDoc comments
  /\/\/.*/g,                        // Single-line comments
  /version.*['"`]\d+/gi,           // Version strings
  /\[\d+\]/g,                       // Array indices
  /\.length\s*===?\s*\d+/g,        // Length comparisons
  /['"`][^'"`]*\d+[^'"`]*['"`]/g,  // Numbers inside string literals
  /\.min\(\d+\)/g,                  // Zod .min() validators
  /\.max\(\d+\)/g,                  // Zod .max() validators
  /\.length\(\d+\)/g,               // Zod .length() validators
  /constraint:\s*['"`]/g,           // Constraint descriptions (strings)
];

/**
 * Extract numeric literals from code
 * Returns array of {value, line} objects
 */
function findNumericLiterals(content: string, filename: string): Array<{ value: string; line: number }> {
  // Skip allowed files
  if (ALLOWED_FILES.some(f => filename.endsWith(f))) {
    return [];
  }

  // Remove allowed patterns
  let cleanContent = content;
  for (const pattern of ALLOWED_PATTERNS) {
    cleanContent = cleanContent.replace(pattern, match => ' '.repeat(match.length));
  }

  const results: Array<{ value: string; line: number }> = [];
  const lines = cleanContent.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;

    // Match numeric literals (integers and floats)
    // Exclude: array indices [0], string lengths .length === 16
    const numericPattern = /(?<!['\"`\w\[])\b(\d+\.?\d*|\.\d+)\b(?!['"`\]])/g;
    let match: RegExpExecArray | null;

    while ((match = numericPattern.exec(line)) !== null) {
      const value = match[1];
      if (value === undefined) continue;

      // Skip if it's clearly a version/count constant
      if (/EMOTION_COUNT|INVARIANT.*COUNT/.test(line)) continue;

      // Skip 'as const' type assertions
      if (/as\s+const/.test(line)) continue;

      results.push({ value, line: i + 1 });
    }
  }

  return results;
}

describe('Phase 1 Contract — NO MAGIC NUMBERS', () => {
  it('should have no numeric literals in types.ts', () => {
    const filePath = path.join(PHASE1_DIR, 'types.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    const literals = findNumericLiterals(content, 'types.ts');

    expect(literals).toEqual([]);
  });

  it('should have no numeric literals in types-canon.ts', () => {
    const filePath = path.join(PHASE1_DIR, 'types-canon.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    const literals = findNumericLiterals(content, 'types-canon.ts');

    expect(literals).toEqual([]);
  });

  it('should have no numeric literals in types-runtime.ts', () => {
    const filePath = path.join(PHASE1_DIR, 'types-runtime.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    const literals = findNumericLiterals(content, 'types-runtime.ts');

    expect(literals).toEqual([]);
  });

  it('should have no numeric literals in symbols.ts', () => {
    const filePath = path.join(PHASE1_DIR, 'symbols.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    const literals = findNumericLiterals(content, 'symbols.ts');

    expect(literals).toEqual([]);
  });

  it('should have no numeric literals in invariants.ts', () => {
    const filePath = path.join(PHASE1_DIR, 'invariants.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    const literals = findNumericLiterals(content, 'invariants.ts');

    expect(literals).toEqual([]);
  });

  it('should have no numeric literals in schema.ts', () => {
    const filePath = path.join(PHASE1_DIR, 'schema.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    const literals = findNumericLiterals(content, 'schema.ts');

    expect(literals).toEqual([]);
  });

  it('should have no numeric literals in index.ts', () => {
    const filePath = path.join(PHASE1_DIR, 'index.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    const literals = findNumericLiterals(content, 'index.ts');

    expect(literals).toEqual([]);
  });

  it('constants.ts should ONLY contain Vision Scellée canon values', () => {
    const filePath = path.join(PHASE1_DIR, 'constants.ts');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Verify constants.ts exists and contains emotion definitions
    expect(content).toContain('EMOTIONS_V44');
    expect(content).toContain('AMOUR');
    expect(content).toContain('DEUIL');

    // Verify it references Vision Scellée
    expect(content).toContain('VISION_FINALE_SCELLEE');

    // Verify NO runtime parameters (C, omega, phi)
    expect(content).not.toMatch(/['"]C['"]\s*:/);
    expect(content).not.toMatch(/['"]omega['"]\s*:/);
    expect(content).not.toMatch(/['"]phi['"]\s*:/);
  });
});
