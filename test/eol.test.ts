/**
 * OMEGA Phase 95 - EOL Cross-Platform Tests
 * @version 3.95.0
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const ROOT_DIR = process.cwd();
let eolModule: any;

beforeAll(() => { eolModule = require('../scripts/eol/normalize.cjs'); });

function fileExists(p: string): boolean { return existsSync(join(ROOT_DIR, p)); }
function readFile(p: string): string { return readFileSync(join(ROOT_DIR, p), 'utf-8'); }

describe('EOL Script', () => {
  it('should have normalize.cjs', () => { expect(fileExists('scripts/eol/normalize.cjs')).toBe(true); });
  it('should export CONFIG', () => { expect(eolModule.CONFIG).toBeDefined(); });
  it('should have version 3.95.0', () => { expect(eolModule.CONFIG.version).toBe('3.95.0'); });
  it('should export detectEOL', () => { expect(typeof eolModule.detectEOL).toBe('function'); });
  it('should export normalizeToLF', () => { expect(typeof eolModule.normalizeToLF).toBe('function'); });
  it('should export normalizeToCRLF', () => { expect(typeof eolModule.normalizeToCRLF).toBe('function'); });
  it('should export analyzeFile', () => { expect(typeof eolModule.analyzeFile).toBe('function'); });
  it('should export checkCompliance', () => { expect(typeof eolModule.checkCompliance).toBe('function'); });
});

describe('EOL Detection', () => {
  it('should detect LF only', () => {
    const result = eolModule.detectEOL('line1\nline2\nline3');
    expect(result.lf).toBe(2);
    expect(result.crlf).toBe(0);
    expect(result.mixed).toBe(false);
  });

  it('should detect CRLF only', () => {
    const result = eolModule.detectEOL('line1\r\nline2\r\nline3');
    expect(result.crlf).toBe(2);
    expect(result.lf).toBe(0);
    expect(result.mixed).toBe(false);
  });

  it('should detect mixed EOL', () => {
    const result = eolModule.detectEOL('line1\nline2\r\nline3');
    expect(result.mixed).toBe(true);
  });

  it('should detect CR only as mixed', () => {
    const result = eolModule.detectEOL('line1\rline2\rline3');
    expect(result.cr).toBe(2);
    expect(result.mixed).toBe(true);
  });
});

describe('EOL Normalization', () => {
  it('should normalize CRLF to LF', () => {
    const result = eolModule.normalizeToLF('line1\r\nline2\r\n');
    expect(result).toBe('line1\nline2\n');
  });

  it('should normalize CR to LF', () => {
    const result = eolModule.normalizeToLF('line1\rline2\r');
    expect(result).toBe('line1\nline2\n');
  });

  it('should normalize LF to CRLF', () => {
    const result = eolModule.normalizeToCRLF('line1\nline2\n');
    expect(result).toBe('line1\r\nline2\r\n');
  });

  it('should normalize mixed to LF', () => {
    const result = eolModule.normalizeToLF('line1\r\nline2\nline3\r');
    expect(result).toBe('line1\nline2\nline3\n');
  });
});

describe('Pattern Matching', () => {
  it('should recognize .ts as LF', () => {
    expect(eolModule.shouldUseLF('file.ts')).toBe(true);
    expect(eolModule.shouldUseCRLF('file.ts')).toBe(false);
  });

  it('should recognize .ps1 as CRLF', () => {
    expect(eolModule.shouldUseCRLF('script.ps1')).toBe(true);
    expect(eolModule.shouldUseLF('script.ps1')).toBe(false);
  });

  it('should recognize .cjs as LF', () => {
    expect(eolModule.shouldUseLF('module.cjs')).toBe(true);
  });

  it('should recognize .bat as CRLF', () => {
    expect(eolModule.shouldUseCRLF('run.bat')).toBe(true);
  });
});

describe('Documentation', () => {
  it('should have EOL_POLICY.md', () => { expect(fileExists('docs/EOL_POLICY.md')).toBe(true); });
  it('should document LF rule', () => { expect(readFile('docs/EOL_POLICY.md')).toMatch(/LF/); });
  it('should document CRLF rule', () => { expect(readFile('docs/EOL_POLICY.md')).toMatch(/CRLF/); });
  it('should reference Phase 95', () => { expect(readFile('docs/EOL_POLICY.md')).toMatch(/Phase:?\s*95/); });
});

describe('.gitattributes', () => {
  it('should exist', () => { expect(fileExists('.gitattributes')).toBe(true); });
  it('should have eol=lf rules', () => { expect(readFile('.gitattributes')).toMatch(/eol=lf/); });
  it('should have eol=crlf rules', () => { expect(readFile('.gitattributes')).toMatch(/eol=crlf/); });
});
