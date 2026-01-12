/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NEXUS — AUTOMATION MODULE TESTS
 * Tests for git hooks, watcher, scheduler, backup
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { stringify } from 'yaml';

import {
  AUTOMATION_VERSION,
  HOOK_TYPES,
  WATCHER_EVENTS,
  SCHEDULE_INTERVALS,
  generatePreCommitHook,
  generatePostCommitHook,
  generatePrePushHook,
  installGitHooks,
  createWatcher,
  createScheduler,
  createBackup,
  verifyBackup
} from '../scripts/automation.js';

console.log('Automation tests loaded');

// ═══════════════════════════════════════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const TEST_DIR = '/tmp/omega-nexus-test-automation';

function setupTestDir() {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true });
  }
  mkdirSync(TEST_DIR, { recursive: true });
}

function cleanupTestDir() {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true });
  }
}

function createMinimalNexus() {
  // Create nexus structure
  mkdirSync(join(TEST_DIR, 'nexus', 'genesis'), { recursive: true });
  mkdirSync(join(TEST_DIR, 'nexus', 'ledger', 'entities'), { recursive: true });
  mkdirSync(join(TEST_DIR, 'nexus', 'ledger', 'events'), { recursive: true });
  mkdirSync(join(TEST_DIR, 'nexus', 'ledger', 'links'), { recursive: true });
  mkdirSync(join(TEST_DIR, 'nexus', 'ledger', 'registry'), { recursive: true });
  mkdirSync(join(TEST_DIR, 'nexus', 'raw', 'sessions'), { recursive: true });
  mkdirSync(join(TEST_DIR, 'nexus', 'proof', 'seals'), { recursive: true });
  mkdirSync(join(TEST_DIR, 'nexus', 'proof', 'snapshots', 'manifests'), { recursive: true });
  
  // Create genesis files
  writeFileSync(join(TEST_DIR, 'nexus', 'genesis', 'THE_OATH.md'), '# The Oath\n');
  writeFileSync(join(TEST_DIR, 'nexus', 'genesis', 'LAWS.yaml'), stringify({
    version: '1.0.0',
    laws: ['Law 1', 'Law 2']
  }));
  writeFileSync(join(TEST_DIR, 'nexus', 'genesis', 'IDENTITY.yaml'), stringify({
    project: 'OMEGA',
    version: '1.0.0'
  }));
}

function createFakeGitRepo() {
  mkdirSync(join(TEST_DIR, '.git', 'hooks'), { recursive: true });
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Automation Module', () => {

  describe('Constants', () => {
    
    it('should have AUTOMATION_VERSION defined', () => {
      assert.ok(AUTOMATION_VERSION);
      assert.match(AUTOMATION_VERSION, /^\d+\.\d+\.\d+$/);
    });
    
    it('should have HOOK_TYPES defined', () => {
      assert.ok(HOOK_TYPES.PRE_COMMIT);
      assert.ok(HOOK_TYPES.POST_COMMIT);
      assert.ok(HOOK_TYPES.PRE_PUSH);
    });
    
    it('should have WATCHER_EVENTS defined', () => {
      assert.ok(WATCHER_EVENTS.CHANGE);
      assert.ok(WATCHER_EVENTS.RENAME);
    });
    
    it('should have SCHEDULE_INTERVALS defined', () => {
      assert.strictEqual(SCHEDULE_INTERVALS.HOURLY, 3600000);
      assert.strictEqual(SCHEDULE_INTERVALS.DAILY, 86400000);
      assert.strictEqual(SCHEDULE_INTERVALS.WEEKLY, 604800000);
    });
    
  });

  describe('Git Hooks Generation', () => {
    
    it('should generate pre-commit hook', () => {
      const hook = generatePreCommitHook('/test/path');
      
      assert.ok(hook.includes('#!/bin/sh'));
      assert.ok(hook.includes('pre-commit'));
      assert.ok(hook.includes('Guardian'));
    });
    
    it('should generate post-commit hook', () => {
      const hook = generatePostCommitHook('/test/path');
      
      assert.ok(hook.includes('#!/bin/sh'));
      assert.ok(hook.includes('post-commit'));
      assert.ok(hook.includes('seal'));
    });
    
    it('should generate pre-push hook', () => {
      const hook = generatePrePushHook('/test/path');
      
      assert.ok(hook.includes('#!/bin/sh'));
      assert.ok(hook.includes('pre-push'));
      assert.ok(hook.includes('verify'));
    });
    
    it('should include base directory in hooks', () => {
      const hook = generatePreCommitHook('/my/custom/path');
      assert.ok(hook.includes('/my/custom/path'));
    });
    
  });

  describe('installGitHooks()', () => {
    
    beforeEach(() => setupTestDir());
    afterEach(() => cleanupTestDir());
    
    it('should fail if not a git repository', () => {
      const result = installGitHooks(TEST_DIR);
      
      assert.strictEqual(result.success, false);
      assert.ok(result.error.includes('git'));
    });
    
    it('should install hooks in git repository', () => {
      createFakeGitRepo();
      const result = installGitHooks(TEST_DIR);
      
      assert.strictEqual(result.success, true);
      assert.ok(result.installed.includes('pre-commit'));
      assert.ok(result.installed.includes('post-commit'));
      assert.ok(result.installed.includes('pre-push'));
    });
    
    it('should create hook files', () => {
      createFakeGitRepo();
      installGitHooks(TEST_DIR);
      
      assert.ok(existsSync(join(TEST_DIR, '.git', 'hooks', 'pre-commit')));
      assert.ok(existsSync(join(TEST_DIR, '.git', 'hooks', 'post-commit')));
      assert.ok(existsSync(join(TEST_DIR, '.git', 'hooks', 'pre-push')));
    });
    
    it('should allow selective installation', () => {
      createFakeGitRepo();
      const result = installGitHooks(TEST_DIR, {
        preCommit: true,
        postCommit: false,
        prePush: false
      });
      
      assert.ok(result.installed.includes('pre-commit'));
      assert.ok(!result.installed.includes('post-commit'));
      assert.ok(!result.installed.includes('pre-push'));
    });
    
  });

  describe('createWatcher()', () => {
    
    beforeEach(() => {
      setupTestDir();
      createMinimalNexus();
    });
    afterEach(() => cleanupTestDir());
    
    it('should create watcher with default options', () => {
      const watcher = createWatcher(TEST_DIR);
      
      assert.ok(watcher.start);
      assert.ok(watcher.stop);
      assert.ok(watcher.forceSeal);
      assert.ok(watcher.getStatus);
    });
    
    it('should report initial status', () => {
      const watcher = createWatcher(TEST_DIR);
      const status = watcher.getStatus();
      
      assert.strictEqual(status.running, false);
      assert.strictEqual(status.pendingChanges, 0);
      assert.strictEqual(status.lastSeal, null);
    });
    
    it('should start and stop watcher', () => {
      const watcher = createWatcher(TEST_DIR);
      
      watcher.start();
      assert.strictEqual(watcher.getStatus().running, true);
      
      watcher.stop();
      assert.strictEqual(watcher.getStatus().running, false);
    });
    
    it('should accept custom threshold', () => {
      const watcher = createWatcher(TEST_DIR, { threshold: 5 });
      const status = watcher.getStatus();
      
      assert.strictEqual(status.threshold, 5);
    });
    
  });

  describe('createScheduler()', () => {
    
    beforeEach(() => {
      setupTestDir();
      createMinimalNexus();
    });
    afterEach(() => cleanupTestDir());
    
    it('should create scheduler', () => {
      const scheduler = createScheduler(TEST_DIR);
      
      assert.ok(scheduler.start);
      assert.ok(scheduler.stop);
      assert.ok(scheduler.forceRun);
    });
    
    it('should accept custom interval', () => {
      const scheduler = createScheduler(TEST_DIR, {
        interval: SCHEDULE_INTERVALS.HOURLY
      });
      
      assert.ok(scheduler);
    });
    
  });

  describe('createBackup()', () => {
    
    beforeEach(() => {
      setupTestDir();
      createMinimalNexus();
    });
    afterEach(() => cleanupTestDir());
    
    it('should create backup', () => {
      const backupDir = join(TEST_DIR, 'backups');
      mkdirSync(backupDir, { recursive: true });
      
      const result = createBackup(TEST_DIR, backupDir);
      
      assert.strictEqual(result.success, true);
      assert.ok(result.path);
      assert.ok(existsSync(result.path));
    });
    
    it('should create backup manifest', () => {
      const backupDir = join(TEST_DIR, 'backups');
      mkdirSync(backupDir, { recursive: true });
      
      const result = createBackup(TEST_DIR, backupDir);
      const manifestPath = join(result.path, 'BACKUP-MANIFEST.json');
      
      assert.ok(existsSync(manifestPath));
      
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      assert.ok(manifest.created_at);
      assert.ok(manifest.root_hash);
      assert.ok(manifest.file_count > 0);
    });
    
    it('should include root hash in manifest', () => {
      const backupDir = join(TEST_DIR, 'backups');
      mkdirSync(backupDir, { recursive: true });
      
      const result = createBackup(TEST_DIR, backupDir);
      
      assert.ok(result.manifest.root_hash);
      assert.ok(result.manifest.root_hash.startsWith('sha256:'));
    });
    
  });

  describe('verifyBackup()', () => {
    
    beforeEach(() => {
      setupTestDir();
      createMinimalNexus();
    });
    afterEach(() => cleanupTestDir());
    
    it('should fail for missing backup', () => {
      const result = verifyBackup('/nonexistent/backup');
      
      assert.strictEqual(result.valid, false);
      assert.ok(result.error);
    });
    
    it('should verify valid backup', () => {
      const backupDir = join(TEST_DIR, 'backups');
      mkdirSync(backupDir, { recursive: true });
      
      const backup = createBackup(TEST_DIR, backupDir);
      const result = verifyBackup(backup.path);
      
      assert.strictEqual(result.valid, true);
      assert.ok(result.manifest);
    });
    
    it('should detect tampered backup', () => {
      const backupDir = join(TEST_DIR, 'backups');
      mkdirSync(backupDir, { recursive: true });
      
      const backup = createBackup(TEST_DIR, backupDir);
      
      // Tamper with a file
      writeFileSync(join(backup.path, 'nexus', 'genesis', 'THE_OATH.md'), 'TAMPERED');
      
      const result = verifyBackup(backup.path);
      
      assert.strictEqual(result.valid, false);
      assert.ok(result.error.includes('hash'));
    });
    
  });

});
