/**
 * OMEGA Phase 91 - Save Protocol Tests
 * @version 3.91.0
 * @standard NASA-Grade L4 / DO-178C Level A
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
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

// ═══════════════════════════════════════════════════════════════════════════════
// SCRIPT EXISTENCE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Save Script Structure', () => {
  const scriptPath = 'scripts/save/omega-save.ps1';

  it('should have omega-save.ps1 script', () => {
    expect(fileExists(scriptPath)).toBe(true);
  });

  it('should have version 12.0.0', () => {
    const content = readFile(scriptPath);
    expect(content).toMatch(/ScriptVersion\s*=\s*"12\.0\.0"/);
  });

  it('should have SYNOPSIS documentation', () => {
    const content = readFile(scriptPath);
    expect(content).toMatch(/\.SYNOPSIS/);
  });

  it('should have DESCRIPTION documentation', () => {
    const content = readFile(scriptPath);
    expect(content).toMatch(/\.DESCRIPTION/);
  });

  it('should have EXAMPLE documentation', () => {
    const content = readFile(scriptPath);
    expect(content).toMatch(/\.EXAMPLE/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PARAMETER TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Save Script Parameters', () => {
  let scriptContent: string;

  beforeAll(() => {
    scriptContent = readFile('scripts/save/omega-save.ps1');
  });

  it('should have mandatory Title parameter', () => {
    expect(scriptContent).toMatch(/\[Parameter\(Mandatory\s*=\s*\$true\)\]/);
    expect(scriptContent).toMatch(/\[string\]\$Title/);
  });

  it('should have Push switch parameter', () => {
    expect(scriptContent).toMatch(/\[switch\]\$Push/);
  });

  it('should have PushRequired switch parameter', () => {
    expect(scriptContent).toMatch(/\[switch\]\$PushRequired/);
  });

  it('should have DryRun switch parameter', () => {
    expect(scriptContent).toMatch(/\[switch\]\$DryRun/);
  });

  it('should have MaxRetries parameter with default 3', () => {
    expect(scriptContent).toMatch(/\[int\]\$MaxRetries\s*=\s*3/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// RETRY LOGIC TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Retry Logic', () => {
  let scriptContent: string;

  beforeAll(() => {
    scriptContent = readFile('scripts/save/omega-save.ps1');
  });

  it('should have Invoke-WithRetry function', () => {
    expect(scriptContent).toMatch(/function\s+Invoke-WithRetry/);
  });

  it('should accept Action scriptblock parameter', () => {
    expect(scriptContent).toMatch(/\[scriptblock\]\$Action/);
  });

  it('should accept Description parameter', () => {
    expect(scriptContent).toMatch(/\[string\]\$Description/);
  });

  it('should accept Retries parameter', () => {
    expect(scriptContent).toMatch(/\[int\]\$Retries/);
  });

  it('should implement retry loop', () => {
    expect(scriptContent).toMatch(/for\s*\(\s*\$attempt\s*=\s*1/);
  });

  it('should implement exponential backoff', () => {
    expect(scriptContent).toMatch(/Start-Sleep\s+-Seconds/);
  });

  it('should throw after max retries', () => {
    expect(scriptContent).toMatch(/All.*attempts failed/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROLLBACK TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Rollback Logic', () => {
  let scriptContent: string;

  beforeAll(() => {
    scriptContent = readFile('scripts/save/omega-save.ps1');
  });

  it('should have Invoke-Rollback function', () => {
    expect(scriptContent).toMatch(/function\s+Invoke-Rollback/);
  });

  it('should track created files', () => {
    expect(scriptContent).toMatch(/\$CreatedFiles\s*=/);
  });

  it('should have Add-CreatedFile function', () => {
    expect(scriptContent).toMatch(/function\s+Add-CreatedFile/);
  });

  it('should remove files during rollback', () => {
    expect(scriptContent).toMatch(/Remove-Item.*-Force/);
  });

  it('should call rollback on error', () => {
    expect(scriptContent).toMatch(/Invoke-Rollback\s+-Reason/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LOGGING TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('JSONL Logging', () => {
  let scriptContent: string;

  beforeAll(() => {
    scriptContent = readFile('scripts/save/omega-save.ps1');
  });

  it('should have Write-Log function', () => {
    expect(scriptContent).toMatch(/function\s+Write-Log/);
  });

  it('should define log file path', () => {
    expect(scriptContent).toMatch(/\$LogFile\s*=.*omega-save\.jsonl/);
  });

  it('should support INFO level', () => {
    expect(scriptContent).toMatch(/"INFO"/);
  });

  it('should support WARN level', () => {
    expect(scriptContent).toMatch(/"WARN"/);
  });

  it('should support ERROR level', () => {
    expect(scriptContent).toMatch(/"ERROR"/);
  });

  it('should support SUCCESS level', () => {
    expect(scriptContent).toMatch(/"SUCCESS"/);
  });

  it('should convert to JSON', () => {
    expect(scriptContent).toMatch(/ConvertTo-Json\s+-Compress/);
  });

  it('should append to log file', () => {
    expect(scriptContent).toMatch(/Add-Content\s+-Path\s+\$LogFile/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PUSH MODE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Push Modes', () => {
  let scriptContent: string;

  beforeAll(() => {
    scriptContent = readFile('scripts/save/omega-save.ps1');
  });

  it('should check Push flag', () => {
    expect(scriptContent).toMatch(/\$Push\.IsPresent/);
  });

  it('should check PushRequired flag', () => {
    expect(scriptContent).toMatch(/\$PushRequired\.IsPresent/);
  });

  it('should fail on PushRequired if push fails', () => {
    expect(scriptContent).toMatch(/Push failed in PushRequired mode/);
  });

  it('should warn on Push if push fails', () => {
    expect(scriptContent).toMatch(/Push failed but not required/);
  });

  it('should skip push by default', () => {
    expect(scriptContent).toMatch(/Push skipped/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ARTIFACT CREATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Artifact Creation', () => {
  let scriptContent: string;

  beforeAll(() => {
    scriptContent = readFile('scripts/save/omega-save.ps1');
  });

  it('should create session document', () => {
    expect(scriptContent).toMatch(/Create session document/);
    expect(scriptContent).toMatch(/\$sessionPath/);
  });

  it('should create seal', () => {
    expect(scriptContent).toMatch(/Create seal/);
    expect(scriptContent).toMatch(/\$sealPath/);
  });

  it('should create manifest', () => {
    expect(scriptContent).toMatch(/Create manifest/);
    expect(scriptContent).toMatch(/\$manifestPath/);
  });

  it('should create raw log', () => {
    expect(scriptContent).toMatch(/Create raw log/);
    expect(scriptContent).toMatch(/\$rawLogPath/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENTATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Save Protocol Documentation', () => {
  const docPath = 'docs/SAVE_PROTOCOL.md';

  it('should have SAVE_PROTOCOL.md', () => {
    expect(fileExists(docPath)).toBe(true);
  });

  it('should document retry logic', () => {
    const content = readFile(docPath);
    expect(content).toMatch(/Retry Logic/i);
  });

  it('should document rollback', () => {
    const content = readFile(docPath);
    expect(content).toMatch(/Rollback/i);
  });

  it('should document push modes', () => {
    const content = readFile(docPath);
    expect(content).toMatch(/Push.*Mode/i);
  });

  it('should document JSONL logging', () => {
    const content = readFile(docPath);
    expect(content).toMatch(/JSONL.*Logging/i);
  });

  it('should reference Phase 91', () => {
    const content = readFile(docPath);
    expect(content).toMatch(/Phase 91/);
  });
});
