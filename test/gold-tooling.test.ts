/**
 * OMEGA Phases 98-105 - GOLD TOOLING Tests
 * @version 3.105.0
 * 
 * CI HARDENING: Tests tolerate shallow clone (git tags/stats may be 0)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const ROOT_DIR = process.cwd();
const IS_CI = process.env.CI === 'true';

function fileExists(p: string): boolean { return existsSync(join(ROOT_DIR, p)); }

// Phase 98: Checkpoint
describe('Phase 98: Checkpoint System', () => {
  let cpModule: any;
  beforeAll(() => { cpModule = require('../scripts/checkpoint/checkpoint.cjs'); });

  it('should have checkpoint.cjs', () => { expect(fileExists('scripts/checkpoint/checkpoint.cjs')).toBe(true); });
  it('should export CONFIG', () => { expect(cpModule.CONFIG).toBeDefined(); });
  it('should have version 3.98.0', () => { expect(cpModule.CONFIG.version).toBe('3.98.0'); });
  it('should export createCheckpoint', () => { expect(typeof cpModule.createCheckpoint).toBe('function'); });
  it('should export listCheckpoints', () => { expect(typeof cpModule.listCheckpoints).toBe('function'); });
  it('should export loadCheckpoint', () => { expect(typeof cpModule.loadCheckpoint).toBe('function'); });
  it('should export verifyCheckpoint', () => { expect(typeof cpModule.verifyCheckpoint).toBe('function'); });
});

// Phase 99: Rollback
describe('Phase 99: Rollback System', () => {
  let rbModule: any;
  beforeAll(() => { rbModule = require('../scripts/rollback/rollback.cjs'); });

  it('should have rollback.cjs', () => { expect(fileExists('scripts/rollback/rollback.cjs')).toBe(true); });
  it('should export CONFIG', () => { expect(rbModule.CONFIG).toBeDefined(); });
  it('should have version 3.99.0', () => { expect(rbModule.CONFIG.version).toBe('3.99.0'); });
  it('should export getGitTags', () => { expect(typeof rbModule.getGitTags).toBe('function'); });
  it('should export rollbackToTag', () => { expect(typeof rbModule.rollbackToTag).toBe('function'); });
  it('should export canRollback', () => { expect(typeof rbModule.canRollback).toBe('function'); });
  it('should list git tags', () => {
    const tags = rbModule.getGitTags();
    expect(Array.isArray(tags)).toBe(true);
    // With fetch-depth: 0 in CI, tags should be available
    expect(tags.length).toBeGreaterThan(0);
  });
});

// Phase 100: Metrics
describe('Phase 100: Metrics Collection', () => {
  let mModule: any;
  beforeAll(() => { mModule = require('../scripts/metrics/metrics.cjs'); });

  it('should have metrics.cjs', () => { expect(fileExists('scripts/metrics/metrics.cjs')).toBe(true); });
  it('should export CONFIG', () => { expect(mModule.CONFIG).toBeDefined(); });
  it('should have version 3.100.0', () => { expect(mModule.CONFIG.version).toBe('3.100.0'); });
  it('should export collectMetrics', () => { expect(typeof mModule.collectMetrics).toBe('function'); });
  it('should export loadMetrics', () => { expect(typeof mModule.loadMetrics).toBe('function'); });
  it('should export getGitStats', () => { expect(typeof mModule.getGitStats).toBe('function'); });
  it('should get git stats', () => {
    const stats = mModule.getGitStats();
    // With fetch-depth: 0 in CI, full history is available
    expect(stats.commits).toBeGreaterThan(0);
    expect(stats.tags).toBeGreaterThan(0);
  });
});

// Phase 101: Documentation Generator
describe('Phase 101: Documentation Generator', () => {
  let dgModule: any;
  beforeAll(() => { dgModule = require('../scripts/docs-gen/docs-gen.cjs'); });

  it('should have docs-gen.cjs', () => { expect(fileExists('scripts/docs-gen/docs-gen.cjs')).toBe(true); });
  it('should export CONFIG', () => { expect(dgModule.CONFIG).toBeDefined(); });
  it('should have version 3.101.0', () => { expect(dgModule.CONFIG.version).toBe('3.101.0'); });
  it('should export extractJSDocHeader', () => { expect(typeof dgModule.extractJSDocHeader).toBe('function'); });
  it('should export parseScript', () => { expect(typeof dgModule.parseScript).toBe('function'); });
  it('should export generate', () => { expect(typeof dgModule.generate).toBe('function'); });
  it('should extract JSDoc header', () => {
    const content = '/**\n * @description Test\n */\nconst x = 1;';
    const header = dgModule.extractJSDocHeader(content);
    expect(header).toContain('Test');
  });
});

// Phase 102: Health Check
describe('Phase 102: Health Check', () => {
  let hModule: any;
  beforeAll(() => { hModule = require('../scripts/health/health.cjs'); });

  it('should have health.cjs', () => { expect(fileExists('scripts/health/health.cjs')).toBe(true); });
  it('should export CONFIG', () => { expect(hModule.CONFIG).toBeDefined(); });
  it('should have version 3.102.0', () => { expect(hModule.CONFIG.version).toBe('3.102.0'); });
  it('should export checkFile', () => { expect(typeof hModule.checkFile).toBe('function'); });
  it('should export checkDir', () => { expect(typeof hModule.checkDir).toBe('function'); });
  it('should export runHealthCheck', () => { expect(typeof hModule.runHealthCheck).toBe('function'); });
  it('should check critical files', () => {
    expect(hModule.checkFile('package.json')).toBe(true);
  });
  it('should check critical dirs', () => {
    expect(hModule.checkDir('scripts')).toBe(true);
  });
});

// Phase 103: Backup System
describe('Phase 103: Backup System', () => {
  let bModule: any;
  beforeAll(() => { bModule = require('../scripts/backup/backup.cjs'); });

  it('should have backup.cjs', () => { expect(fileExists('scripts/backup/backup.cjs')).toBe(true); });
  it('should export CONFIG', () => { expect(bModule.CONFIG).toBeDefined(); });
  it('should have version 3.103.0', () => { expect(bModule.CONFIG.version).toBe('3.103.0'); });
  it('should export createBackup', () => { expect(typeof bModule.createBackup).toBe('function'); });
  it('should export listBackups', () => { expect(typeof bModule.listBackups).toBe('function'); });
  it('should export verifyBackup', () => { expect(typeof bModule.verifyBackup).toBe('function'); });
  it('should have maxBackups setting', () => { expect(bModule.CONFIG.maxBackups).toBeGreaterThan(0); });
});

// Phase 104: Version Validator
describe('Phase 104: Version Validator', () => {
  let vModule: any;
  beforeAll(() => { vModule = require('../scripts/version/version.cjs'); });

  it('should have version.cjs', () => { expect(fileExists('scripts/version/version.cjs')).toBe(true); });
  it('should export CONFIG', () => { expect(vModule.CONFIG).toBeDefined(); });
  it('should have version 3.104.0', () => { expect(vModule.CONFIG.version).toBe('3.104.0'); });
  it('should export getPackageVersion', () => { expect(typeof vModule.getPackageVersion).toBe('function'); });
  it('should export getLatestTag', () => { expect(typeof vModule.getLatestTag).toBe('function'); });
  it('should export validateVersions', () => { expect(typeof vModule.validateVersions).toBe('function'); });
  it('should get package version', () => {
    const version = vModule.getPackageVersion();
    expect(version).toBeDefined();
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });
  it('should parse version', () => {
    const parsed = vModule.parseVersion('v3.104.0');
    expect(parsed.major).toBe(3);
    expect(parsed.minor).toBe(104);
    expect(parsed.patch).toBe(0);
  });
  it('should bump version', () => {
    expect(vModule.bumpVersion('patch')).toBeDefined();
  });
});

// Phase 105: Integration
describe('Phase 105: GOLD TOOLING Integration', () => {
  it('should have all 7 tooling scripts', () => {
    expect(fileExists('scripts/checkpoint/checkpoint.cjs')).toBe(true);
    expect(fileExists('scripts/rollback/rollback.cjs')).toBe(true);
    expect(fileExists('scripts/metrics/metrics.cjs')).toBe(true);
    expect(fileExists('scripts/docs-gen/docs-gen.cjs')).toBe(true);
    expect(fileExists('scripts/health/health.cjs')).toBe(true);
    expect(fileExists('scripts/backup/backup.cjs')).toBe(true);
    expect(fileExists('scripts/version/version.cjs')).toBe(true);
  });

  it('should have consistent version prefix 3.9x-3.10x', () => {
    const checkpointModule = require('../scripts/checkpoint/checkpoint.cjs');
    const rollbackModule = require('../scripts/rollback/rollback.cjs');
    const metricsModule = require('../scripts/metrics/metrics.cjs');
    const docsModule = require('../scripts/docs-gen/docs-gen.cjs');
    const healthModule = require('../scripts/health/health.cjs');
    const backupModule = require('../scripts/backup/backup.cjs');
    const versionModule = require('../scripts/version/version.cjs');

    expect(checkpointModule.CONFIG.version).toBe('3.98.0');
    expect(rollbackModule.CONFIG.version).toBe('3.99.0');
    expect(metricsModule.CONFIG.version).toBe('3.100.0');
    expect(docsModule.CONFIG.version).toBe('3.101.0');
    expect(healthModule.CONFIG.version).toBe('3.102.0');
    expect(backupModule.CONFIG.version).toBe('3.103.0');
    expect(versionModule.CONFIG.version).toBe('3.104.0');
  });
});
