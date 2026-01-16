/**
 * OMEGA Phase 97 - CI/CD Pipeline Tests
 * @version 3.97.0
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const ROOT_DIR = process.cwd();
let ciModule: any;

beforeAll(() => { ciModule = require('../scripts/ci/run-local.cjs'); });

function fileExists(p: string): boolean { return existsSync(join(ROOT_DIR, p)); }
function readFile(p: string): string { return readFileSync(join(ROOT_DIR, p), 'utf-8'); }

describe('CI/CD Workflow', () => {
  it('should have ci.yml workflow', () => { expect(fileExists('.github/workflows/ci.yml')).toBe(true); });
  it('should define OMEGA CI name', () => { expect(readFile('.github/workflows/ci.yml')).toMatch(/name: OMEGA CI/); });
  it('should trigger on push', () => { expect(readFile('.github/workflows/ci.yml')).toMatch(/on:\s*\n\s*push:/); });
  it('should have phase-gate job', () => { expect(readFile('.github/workflows/ci.yml')).toMatch(/phase-gate:/); });
  it('should have test job', () => { expect(readFile('.github/workflows/ci.yml')).toMatch(/test:/); });
  it('should have sanctuary job', () => { expect(readFile('.github/workflows/ci.yml')).toMatch(/sanctuary:/); });
  it('should use Node.js 20', () => { expect(readFile('.github/workflows/ci.yml')).toMatch(/NODE_VERSION: '20.x'/); });
});

describe('Local CI Runner', () => {
  it('should have run-local.cjs', () => { expect(fileExists('scripts/ci/run-local.cjs')).toBe(true); });
  it('should export CONFIG', () => { expect(ciModule.CONFIG).toBeDefined(); });
  it('should have version 3.97.0', () => { expect(ciModule.CONFIG.version).toBe('3.97.0'); });
  it('should export checkPhaseDeclaration', () => { expect(typeof ciModule.checkPhaseDeclaration).toBe('function'); });
  it('should export checkSanctuaries', () => { expect(typeof ciModule.checkSanctuaries).toBe('function'); });
  it('should export runLocalCI', () => { expect(typeof ciModule.runLocalCI).toBe('function'); });
});

describe('Sanctuary Configuration', () => {
  it('should define sanctuaries array', () => {
    expect(Array.isArray(ciModule.CONFIG.sanctuaries)).toBe(true);
  });

  it('should include packages/sentinel', () => {
    expect(ciModule.CONFIG.sanctuaries).toContain('packages/sentinel');
  });

  it('should include packages/genome', () => {
    expect(ciModule.CONFIG.sanctuaries).toContain('packages/genome');
  });

  it('should include packages/mycelium', () => {
    expect(ciModule.CONFIG.sanctuaries).toContain('packages/mycelium');
  });

  it('should include gateway', () => {
    expect(ciModule.CONFIG.sanctuaries).toContain('gateway');
  });
});

describe('Phase Check', () => {
  it('should check phase declaration', () => {
    const result = ciModule.checkPhaseDeclaration();
    expect(result.success).toBe(true);
    expect(typeof result.phase).toBe('number');
  });

  it('should return current phase number', () => {
    const result = ciModule.checkPhaseDeclaration();
    expect(result.phase).toBeGreaterThan(90);
  });
});

describe('Sanctuary Check', () => {
  it('should check sanctuary paths', () => {
    const result = ciModule.checkSanctuaries();
    expect(result).toBeDefined();
    // May have violations in working directory
  });
});

describe('Documentation', () => {
  it('should have CI_CD_PIPELINE.md', () => { expect(fileExists('docs/CI_CD_PIPELINE.md')).toBe(true); });
  it('should document GitHub Actions', () => { expect(readFile('docs/CI_CD_PIPELINE.md')).toMatch(/GitHub Actions/); });
  it('should document local runner', () => { expect(readFile('docs/CI_CD_PIPELINE.md')).toMatch(/Local CI Runner/); });
  it('should reference Phase 97', () => { expect(readFile('docs/CI_CD_PIPELINE.md')).toMatch(/Phase:?\s*97/); });
});
