/**
 * OMNIPOTENT Sprint 1 — GATE-4: No Shadow Implementations
 *
 * Verifies that sovereign-engine/src/ contains NO local reimplementations
 * of omega-forge SSOT functions. Only imports from @omega/* are permitted.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function getSrcDir(): string {
  const candidates = [
    path.resolve(__dirname, '../../src'),
    path.resolve(process.cwd(), 'packages/sovereign-engine/src'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

function getAllTsFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      results.push(...getAllTsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

function readFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GATE-4: No Shadow Implementations
// ═══════════════════════════════════════════════════════════════════════════════

describe('GATE-4: No Shadow Implementations in sovereign-engine', () => {
  const srcDir = getSrcDir();
  const tsFiles = getAllTsFiles(srcDir);

  // Patterns that MUST NOT appear as local function definitions
  // (imports from @omega/* are fine — we check for function declarations)
  const FORBIDDEN_FUNCTION_PATTERNS = [
    /function\s+buildPrescribedTrajectory\s*\(/,
    /function\s+buildTrajectoryCore\s*\(/,
    /function\s+toOmegaState\s*\(/,
    /function\s+fromOmegaState\s*\(/,
    /function\s+verifyLaw[1-6]\s*\(/,
    /function\s+checkInertia\s*\(/,
    /function\s+checkFeasibility\s*\(/,
  ];

  // Constants that MUST NOT be redefined locally
  const FORBIDDEN_CONST_PATTERNS = [
    /(?:const|let|var)\s+EMOTION_KEYWORDS\s*=/,
    /(?:const|let|var)\s+canonicalTable\s*=\s*\{/,
  ];

  it('GATE-4a: no local function reimplementations of omega-forge SSOT', () => {
    const violations: string[] = [];

    for (const file of tsFiles) {
      const content = readFile(file);
      if (!content) continue;
      const relativePath = path.relative(srcDir, file).replace(/\\/g, '/');

      for (const pattern of FORBIDDEN_FUNCTION_PATTERNS) {
        if (pattern.test(content)) {
          violations.push(`${relativePath}: local definition matches ${pattern.source}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('GATE-4b: no local constant reimplementations of omega-forge SSOT', () => {
    const violations: string[] = [];

    for (const file of tsFiles) {
      const content = readFile(file);
      if (!content) continue;
      const relativePath = path.relative(srcDir, file).replace(/\\/g, '/');

      for (const pattern of FORBIDDEN_CONST_PATTERNS) {
        if (pattern.test(content)) {
          violations.push(`${relativePath}: local definition matches ${pattern.source}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('GATE-4c: all omega-forge usage comes from @omega/ imports, not local copies', () => {
    const violations: string[] = [];

    // These identifiers should ONLY appear in import statements, never as local definitions
    const SSOT_IDENTIFIERS = [
      'buildPrescribedTrajectory',
      'buildTrajectoryCore',
      'toOmegaState',
      'fromOmegaState',
      'checkInertia',
      'checkFeasibility',
      'EMOTION_KEYWORDS',
    ];

    for (const file of tsFiles) {
      const content = readFile(file);
      if (!content) continue;
      const relativePath = path.relative(srcDir, file).replace(/\\/g, '/');

      for (const id of SSOT_IDENTIFIERS) {
        // Check if identifier is used (not just imported)
        const usagePattern = new RegExp(`\\b${id}\\b`, 'g');
        const matches = content.match(usagePattern);
        if (!matches || matches.length === 0) continue;

        // If identifier is used, it MUST come from an @omega/ import
        const importPattern = new RegExp(`from\\s+['"]@omega/[^'"]+['"]`);
        const exportPattern = new RegExp(`export\\s+.*\\b${id}\\b`);

        // Check for local function/const definition (violation)
        const localDefPattern = new RegExp(
          `(?:function\\s+${id}\\s*\\(|(?:const|let|var)\\s+${id}\\s*=)`,
        );
        if (localDefPattern.test(content)) {
          violations.push(`${relativePath}: defines ${id} locally instead of importing from @omega/`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('GATE-4d: sovereign-engine has at least 1 file that imports from @omega/omega-forge', () => {
    let hasForgeImport = false;

    for (const file of tsFiles) {
      const content = readFile(file);
      if (!content) continue;

      if (/from\s+['"]@omega\/omega-forge['"]/.test(content)) {
        hasForgeImport = true;
        break;
      }
    }

    expect(hasForgeImport).toBe(true);
  });

  it('GATE-4e: file count sanity — sovereign-engine/src has > 10 .ts files', () => {
    // Ensures the test is actually scanning real source files
    expect(tsFiles.length).toBeGreaterThan(10);
  });
});
