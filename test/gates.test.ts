/**
 * OMEGA Phase 92 - Constitution Gate Tests
 * @version 3.92.0
 * @standard NASA-Grade L4 / DO-178C Level A
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const ROOT_DIR = process.cwd();

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function fileExists(relativePath: string): boolean {
  return existsSync(join(ROOT_DIR, relativePath));
}

function readFile(relativePath: string): string {
  return readFileSync(join(ROOT_DIR, relativePath), 'utf-8');
}

function runGate(mode: string): { exitCode: number; output: string } {
  try {
    const output = execSync(`node scripts/gates/constitution-gate.cjs ${mode}`, {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
      timeout: 10000
    });
    return { exitCode: 0, output };
  } catch (error: any) {
    return { exitCode: error.status || 1, output: error.stdout || '' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTITUTION GATE SCRIPT TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Constitution Gate Script', () => {
  const gatePath = 'scripts/gates/constitution-gate.cjs';

  it('should have constitution-gate.cjs', () => {
    expect(fileExists(gatePath)).toBe(true);
  });

  it('should have version 3.92.0', () => {
    const content = readFile(gatePath);
    expect(content).toMatch(/version:\s*['"]3\.92\.0['"]/);
  });

  it('should define sanctuaries', () => {
    const content = readFile(gatePath);
    expect(content).toMatch(/sanctuaries/);
    expect(content).toMatch(/packages\/sentinel/);
    expect(content).toMatch(/packages\/genome/);
    expect(content).toMatch(/packages\/mycelium/);
    expect(content).toMatch(/gateway/);
  });

  it('should define timeout', () => {
    const content = readFile(gatePath);
    expect(content).toMatch(/timeout:\s*5000/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GATE RULES TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Gate Rules', () => {
  let gateContent: string;

  beforeAll(() => {
    gateContent = readFile('scripts/gates/constitution-gate.cjs');
  });

  it('should have ruleSanctuaryProtection', () => {
    expect(gateContent).toMatch(/function\s+ruleSanctuaryProtection/);
  });

  it('should have rulePhaseDeclaration', () => {
    expect(gateContent).toMatch(/function\s+rulePhaseDeclaration/);
  });

  it('should have ruleNoForbiddenPatterns', () => {
    expect(gateContent).toMatch(/function\s+ruleNoForbiddenPatterns/);
  });

  it('should have ruleWorkingTreeStatus', () => {
    expect(gateContent).toMatch(/function\s+ruleWorkingTreeStatus/);
  });

  it('should check for git add .', () => {
    expect(gateContent).toMatch(/git\s+add\s+\./);
  });

  it('should check for git add -A', () => {
    expect(gateContent).toMatch(/git\s+add\s+-A/);
  });

  it('should check for git push --force', () => {
    expect(gateContent).toMatch(/git\s+push\s+--force/);
  });

  it('should check for rm -rf', () => {
    expect(gateContent).toMatch(/rm\s+-rf/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GATE EXECUTION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Gate Execution', () => {
  it('should run in pre-commit mode', () => {
    const result = runGate('pre-commit');
    expect(result.output).toMatch(/Constitution Gate/);
    expect(result.output).toMatch(/pre-commit/);
  });

  it('should run in pre-push mode', () => {
    const result = runGate('pre-push');
    expect(result.output).toMatch(/Constitution Gate/);
    expect(result.output).toMatch(/pre-push/);
  });

  it('should complete within timeout', () => {
    const start = Date.now();
    runGate('pre-commit');
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000);
  });

  it('should validate sanctuary protection', () => {
    const result = runGate('pre-commit');
    expect(result.output).toMatch(/SANCTUARY_PROTECTION/);
  });

  it('should validate phase declaration', () => {
    const result = runGate('pre-commit');
    expect(result.output).toMatch(/PHASE_DECLARATION/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GIT HOOKS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Git Hooks', () => {
  it('should have pre-commit hook', () => {
    expect(fileExists('scripts/githooks/pre-commit')).toBe(true);
  });

  it('should have pre-push hook', () => {
    expect(fileExists('scripts/githooks/pre-push')).toBe(true);
  });

  it('should have install-hooks.ps1', () => {
    expect(fileExists('scripts/githooks/install-hooks.ps1')).toBe(true);
  });

  it('pre-commit should call constitution gate', () => {
    const content = readFile('scripts/githooks/pre-commit');
    expect(content).toMatch(/constitution-gate\.cjs/);
    expect(content).toMatch(/pre-commit/);
  });

  it('pre-push should call constitution gate', () => {
    const content = readFile('scripts/githooks/pre-push');
    expect(content).toMatch(/constitution-gate\.cjs/);
    expect(content).toMatch(/pre-push/);
  });

  it('pre-commit should have shebang', () => {
    const content = readFile('scripts/githooks/pre-commit');
    expect(content).toMatch(/^#!/);
  });

  it('pre-push should have shebang', () => {
    const content = readFile('scripts/githooks/pre-push');
    expect(content).toMatch(/^#!/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INSTALL HOOKS SCRIPT TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Install Hooks Script', () => {
  let installContent: string;

  beforeAll(() => {
    installContent = readFile('scripts/githooks/install-hooks.ps1');
  });

  it('should have Force parameter', () => {
    expect(installContent).toMatch(/\[switch\]\$Force/);
  });

  it('should have version 3.92.0', () => {
    expect(installContent).toMatch(/ScriptVersion.*3\.92\.0/);
  });

  it('should copy pre-commit hook', () => {
    expect(installContent).toMatch(/pre-commit/);
  });

  it('should copy pre-push hook', () => {
    expect(installContent).toMatch(/pre-push/);
  });

  it('should verify .git/hooks directory', () => {
    expect(installContent).toMatch(/\.git.*hooks/);
  });
});
