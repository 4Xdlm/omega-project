/**
 * OMEGA Phase 94 - Registry Governance Tests
 * @version 3.94.0
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const ROOT_DIR = process.cwd();
let registryModule: any;

beforeAll(() => { registryModule = require('../scripts/registry/rotate.cjs'); });

function fileExists(p: string): boolean { return existsSync(join(ROOT_DIR, p)); }
function readFile(p: string): string { return readFileSync(join(ROOT_DIR, p), 'utf-8'); }

describe('Registry Script', () => {
  it('should have rotate.cjs', () => { expect(fileExists('scripts/registry/rotate.cjs')).toBe(true); });
  it('should export rotateRegistries', () => { expect(typeof registryModule.rotateRegistries).toBe('function'); });
  it('should export createRegistry', () => { expect(typeof registryModule.createRegistry).toBe('function'); });
  it('should export listRegistries', () => { expect(typeof registryModule.listRegistries).toBe('function'); });
  it('should export getAuditTrail', () => { expect(typeof registryModule.getAuditTrail).toBe('function'); });
  it('should have version 3.94.0', () => { expect(registryModule.CONFIG.version).toBe('3.94.0'); });
});

describe('Registry Functions', () => {
  it('should list registries', () => {
    const regs = registryModule.listRegistries();
    expect(Array.isArray(regs)).toBe(true);
  });
  it('should run rotation in dry-run', () => {
    const result = registryModule.rotateRegistries({ dryRun: true });
    expect(result).toBeDefined();
    expect(result.kept).toBeDefined();
  });
});

describe('Documentation', () => {
  it('should have REGISTRY_GOVERNANCE.md', () => { expect(fileExists('docs/REGISTRY_GOVERNANCE.md')).toBe(true); });
  it('should document rotation', () => { expect(readFile('docs/REGISTRY_GOVERNANCE.md')).toMatch(/Rotation/i); });
  it('should reference Phase 94', () => { expect(readFile('docs/REGISTRY_GOVERNANCE.md')).toMatch(/Phase:?\s*94/); });
});
