/**
 * OMEGA Phase 90 - Repository Hygiene Tests
 * @version 3.90.0
 * @standard NASA-Grade L4 / DO-178C Level A
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync, statSync } from 'fs';
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

function gitCommand(cmd: string): string {
  try {
    return execSync(`git ${cmd}`, { cwd: ROOT_DIR, encoding: 'utf-8' }).trim();
  } catch {
    return '';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GITIGNORE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('GitIgnore Configuration', () => {
  let gitignoreContent: string;

  beforeAll(() => {
    gitignoreContent = readFile('.gitignore');
  });

  it('should have .gitignore file', () => {
    expect(fileExists('.gitignore')).toBe(true);
  });

  it('should ignore node_modules', () => {
    expect(gitignoreContent).toMatch(/node_modules\//);
  });

  it('should ignore dist directories', () => {
    expect(gitignoreContent).toMatch(/dist\//);
  });

  it('should ignore coverage directories', () => {
    expect(gitignoreContent).toMatch(/coverage\//);
  });

  it('should ignore .vite cache', () => {
    expect(gitignoreContent).toMatch(/\.vite\//);
  });

  it('should ignore .vitest cache', () => {
    expect(gitignoreContent).toMatch(/\.vitest\//);
  });

  it('should ignore IDE directories', () => {
    expect(gitignoreContent).toMatch(/\.idea\//);
    expect(gitignoreContent).toMatch(/\.vscode\//);
  });

  it('should ignore Claude temp files', () => {
    expect(gitignoreContent).toMatch(/\.claude\//);
    expect(gitignoreContent).toMatch(/tmpclaude-/);
  });

  it('should ignore OS generated files', () => {
    expect(gitignoreContent).toMatch(/\.DS_Store/);
    expect(gitignoreContent).toMatch(/Thumbs\.db/);
  });

  it('should ignore environment files', () => {
    expect(gitignoreContent).toMatch(/\.env/);
  });

  it('should ignore temp files', () => {
    expect(gitignoreContent).toMatch(/tmp\//);
    expect(gitignoreContent).toMatch(/\*\.tmp/);
  });

  it('should have version header', () => {
    expect(gitignoreContent).toMatch(/Version: 3\.90\.0/);
  });

  it('should ignore omega pack directories', () => {
    expect(gitignoreContent).toMatch(/omega_pack_v10\//);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GITATTRIBUTES TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('GitAttributes Configuration', () => {
  let gitattributesContent: string;

  beforeAll(() => {
    gitattributesContent = readFile('.gitattributes');
  });

  it('should have .gitattributes file', () => {
    expect(fileExists('.gitattributes')).toBe(true);
  });

  it('should set TypeScript files to LF', () => {
    expect(gitattributesContent).toMatch(/\*\.ts\s+text\s+eol=lf/);
  });

  it('should set JavaScript files to LF', () => {
    expect(gitattributesContent).toMatch(/\*\.js\s+text\s+eol=lf/);
  });

  it('should set JSON files to LF', () => {
    expect(gitattributesContent).toMatch(/\*\.json\s+text\s+eol=lf/);
  });

  it('should set Markdown files to LF', () => {
    expect(gitattributesContent).toMatch(/\*\.md\s+text\s+eol=lf/);
  });

  it('should set YAML files to LF', () => {
    expect(gitattributesContent).toMatch(/\*\.yml\s+text\s+eol=lf/);
    expect(gitattributesContent).toMatch(/\*\.yaml\s+text\s+eol=lf/);
  });

  it('should set PowerShell files to CRLF', () => {
    expect(gitattributesContent).toMatch(/\*\.ps1\s+text\s+eol=crlf/);
  });

  it('should set batch files to CRLF', () => {
    expect(gitattributesContent).toMatch(/\*\.bat\s+text\s+eol=crlf/);
    expect(gitattributesContent).toMatch(/\*\.cmd\s+text\s+eol=crlf/);
  });

  it('should mark binary files correctly', () => {
    expect(gitattributesContent).toMatch(/\*\.png\s+binary/);
    expect(gitattributesContent).toMatch(/\*\.jpg\s+binary/);
    expect(gitattributesContent).toMatch(/\*\.zip\s+binary/);
  });

  it('should have version header', () => {
    expect(gitattributesContent).toMatch(/Version: 3\.90\.0/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CLEANUP SCRIPT TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Cleanup Script', () => {
  const cleanupScriptPath = 'scripts/cleanup/cleanup-repo.ps1';

  it('should have cleanup script', () => {
    expect(fileExists(cleanupScriptPath)).toBe(true);
  });

  it('should have DryRun parameter', () => {
    const content = readFile(cleanupScriptPath);
    expect(content).toMatch(/\[switch\]\$DryRun/);
  });

  it('should have protected paths defined', () => {
    const content = readFile(cleanupScriptPath);
    expect(content).toMatch(/ProtectedPaths/);
    expect(content).toMatch(/packages\/sentinel/);
    expect(content).toMatch(/packages\/genome/);
    expect(content).toMatch(/packages\/mycelium/);
    expect(content).toMatch(/gateway/);
  });

  it('should have version defined', () => {
    const content = readFile(cleanupScriptPath);
    expect(content).toMatch(/ScriptVersion.*3\.90\.0/);
  });

  it('should have cleanup patterns', () => {
    const content = readFile(cleanupScriptPath);
    expect(content).toMatch(/CleanupPatterns/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENTATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Documentation', () => {
  const docPath = 'docs/REPO_HYGIENE.md';

  it('should have REPO_HYGIENE.md', () => {
    expect(fileExists(docPath)).toBe(true);
  });

  it('should document gitignore rules', () => {
    const content = readFile(docPath);
    expect(content).toMatch(/\.gitignore/);
  });

  it('should document gitattributes rules', () => {
    const content = readFile(docPath);
    expect(content).toMatch(/\.gitattributes/);
  });

  it('should document protected paths', () => {
    const content = readFile(docPath);
    expect(content).toMatch(/Sanctuaries|Protected/i);
  });

  it('should reference Phase 90', () => {
    const content = readFile(docPath);
    expect(content).toMatch(/Phase 90/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SANCTUARY VERIFICATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Sanctuary Verification', () => {
  // Helper to filter out allowed package dependency changes
  const filterPackageChanges = (diff: string): string => {
    return diff.split('\n')
      .filter(line => !line.match(/package(-lock)?\.json$/))
      .filter(line => !line.match(/node_modules\//))
      .join('\n');
  };

  it('should not have modified source files in packages/genome', () => {
    const diff = gitCommand('diff --name-only packages/genome');
    const filteredDiff = filterPackageChanges(diff);
    expect(filteredDiff).toBe('');
  });

  it('should not have modified source files in packages/mycelium', () => {
    const diff = gitCommand('diff --name-only packages/mycelium');
    const filteredDiff = filterPackageChanges(diff);
    expect(filteredDiff).toBe('');
  });

  it('should not have modified files in gateway', () => {
    const diff = gitCommand('diff --name-only gateway');
    expect(diff).toBe('');
  });

  it('should not have staged source files in sanctuaries', () => {
    const staged = gitCommand('diff --cached --name-only packages/genome packages/mycelium gateway');
    const filteredStaged = filterPackageChanges(staged);
    expect(filteredStaged).toBe('');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GIT STATUS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Git Status Verification', () => {
  it('should have .gitignore tracked or staged', () => {
    const tracked = gitCommand('ls-files .gitignore');
    const staged = gitCommand('diff --cached --name-only .gitignore');
    expect(tracked || staged).toBeTruthy();
  });

  it('should have .gitattributes tracked or staged', () => {
    const tracked = gitCommand('ls-files .gitattributes');
    const staged = gitCommand('diff --cached --name-only .gitattributes');
    expect(tracked || staged).toBeTruthy();
  });
});
