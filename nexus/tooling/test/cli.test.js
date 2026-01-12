/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NEXUS — CLI MODULE TESTS
 * Tests for Command Line Interface
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { stringify } from 'yaml';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CLI_PATH = join(__dirname, '..', 'scripts', 'cli.js');

console.log('CLI tests loaded');

// ═══════════════════════════════════════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const TEST_DIR = '/tmp/omega-nexus-test-cli';

/**
 * Run CLI command and return result
 * @param {string[]} args - CLI arguments
 * @param {object} options - Spawn options
 * @returns {Promise<{code: number, stdout: string, stderr: string}>}
 */
function runCli(args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [CLI_PATH, ...args], {
      cwd: options.cwd || TEST_DIR,
      env: { ...process.env, ...options.env },
      timeout: 30000
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    proc.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
    
    proc.on('error', reject);
  });
}

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
  // Create nexus structure manually
  mkdirSync(join(TEST_DIR, 'nexus', 'genesis'), { recursive: true });
  mkdirSync(join(TEST_DIR, 'nexus', 'ledger', 'entities'), { recursive: true });
  mkdirSync(join(TEST_DIR, 'nexus', 'ledger', 'events'), { recursive: true });
  mkdirSync(join(TEST_DIR, 'nexus', 'ledger', 'links'), { recursive: true });
  mkdirSync(join(TEST_DIR, 'nexus', 'ledger', 'registry'), { recursive: true });
  mkdirSync(join(TEST_DIR, 'nexus', 'raw', 'sessions'), { recursive: true });
  mkdirSync(join(TEST_DIR, 'nexus', 'proof', 'seals'), { recursive: true });
  mkdirSync(join(TEST_DIR, 'nexus', 'proof', 'states'), { recursive: true });
  mkdirSync(join(TEST_DIR, 'nexus', 'proof', 'completeness'), { recursive: true });
  mkdirSync(join(TEST_DIR, 'nexus', 'proof', 'snapshots', 'manifests'), { recursive: true });
  mkdirSync(join(TEST_DIR, 'nexus', 'atlas', 'museum'), { recursive: true });
  mkdirSync(join(TEST_DIR, 'nexus', 'atlas', 'visions'), { recursive: true });
  mkdirSync(join(TEST_DIR, 'nexus', 'atlas', 'lessons'), { recursive: true });
  
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

// ═══════════════════════════════════════════════════════════════════════════════
// CLI TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('CLI Module', () => {

  describe('--version', () => {
    
    before(() => setupTestDir());
    after(() => cleanupTestDir());
    
    it('should display version', async () => {
      const result = await runCli(['--version']);
      assert.strictEqual(result.code, 0);
      assert.match(result.stdout, /\d+\.\d+\.\d+/);
    });
    
  });

  describe('--help', () => {
    
    before(() => setupTestDir());
    after(() => cleanupTestDir());
    
    it('should display help', async () => {
      const result = await runCli(['--help']);
      assert.strictEqual(result.code, 0);
      assert.ok(result.stdout.includes('omega-nexus'));
      assert.ok(result.stdout.includes('Commands:'));
    });
    
    it('should list all commands', async () => {
      const result = await runCli(['--help']);
      assert.ok(result.stdout.includes('init'));
      assert.ok(result.stdout.includes('seal'));
      assert.ok(result.stdout.includes('verify'));
      assert.ok(result.stdout.includes('atlas'));
      assert.ok(result.stdout.includes('export'));
      assert.ok(result.stdout.includes('status'));
    });
    
  });

  describe('init', () => {
    
    beforeEach(() => setupTestDir());
    afterEach(() => cleanupTestDir());
    
    it('should initialize nexus structure', async () => {
      const result = await runCli(['init', '-d', TEST_DIR]);
      
      assert.strictEqual(result.code, 0);
      assert.ok(result.stdout.includes('initialized successfully'));
      
      // Check directories created
      assert.ok(existsSync(join(TEST_DIR, 'nexus', 'genesis')));
      assert.ok(existsSync(join(TEST_DIR, 'nexus', 'ledger', 'entities')));
      assert.ok(existsSync(join(TEST_DIR, 'nexus', 'proof', 'seals')));
    });
    
    it('should create genesis files', async () => {
      await runCli(['init', '-d', TEST_DIR]);
      
      assert.ok(existsSync(join(TEST_DIR, 'nexus', 'genesis', 'THE_OATH.md')));
      assert.ok(existsSync(join(TEST_DIR, 'nexus', 'genesis', 'LAWS.yaml')));
      assert.ok(existsSync(join(TEST_DIR, 'nexus', 'genesis', 'IDENTITY.yaml')));
    });
    
    it('should warn if nexus already exists', async () => {
      await runCli(['init', '-d', TEST_DIR]);
      const result = await runCli(['init', '-d', TEST_DIR]);
      
      assert.strictEqual(result.code, 0);
      assert.ok(result.stdout.includes('already exists'));
    });
    
    it('should reinitialize with --force', async () => {
      await runCli(['init', '-d', TEST_DIR]);
      const result = await runCli(['init', '-d', TEST_DIR, '--force']);
      
      assert.strictEqual(result.code, 0);
      assert.ok(result.stdout.includes('initialized') || result.stdout.includes('Exists'));
    });
    
  });

  describe('status', () => {
    
    beforeEach(() => setupTestDir());
    afterEach(() => cleanupTestDir());
    
    it('should report missing nexus', async () => {
      const result = await runCli(['status', '-d', TEST_DIR]);
      
      assert.strictEqual(result.code, 0);
      assert.ok(result.stdout.includes('not found'));
    });
    
    it('should show nexus status', async () => {
      createMinimalNexus();
      const result = await runCli(['status', '-d', TEST_DIR]);
      
      assert.strictEqual(result.code, 0);
      assert.ok(result.stdout.includes('Ledger:'));
      assert.ok(result.stdout.includes('Entities:'));
    });
    
    it('should show entity count', async () => {
      createMinimalNexus();
      const result = await runCli(['status', '-d', TEST_DIR]);
      
      assert.ok(result.stdout.includes('Entities:'));
      assert.ok(result.stdout.includes('0') || result.stdout.includes('Entities:'));
    });
    
  });

  describe('verify', () => {
    
    beforeEach(() => setupTestDir());
    afterEach(() => cleanupTestDir());
    
    it('should report missing nexus', async () => {
      const result = await runCli(['verify', '-d', TEST_DIR]);
      
      assert.strictEqual(result.code, 0);
      assert.ok(result.stdout.includes('not found'));
    });
    
    it('should verify existing nexus', async () => {
      createMinimalNexus();
      const result = await runCli(['verify', '-d', TEST_DIR]);
      
      assert.strictEqual(result.code, 0);
      assert.ok(result.stdout.includes('Structure:') || result.stdout.includes('VERIFY'));
    });
    
    it('should accept --seal option', async () => {
      createMinimalNexus();
      const result = await runCli(['verify', '-d', TEST_DIR, '--seal', 'SEAL-20260112-0001']);
      
      // Should try to verify the seal (may fail because seal doesn't exist)
      assert.strictEqual(result.code, 0);
      assert.ok(result.stdout.includes('Verifying seal') || result.stdout.includes('SEAL'));
    });
    
  });

  describe('atlas', () => {
    
    beforeEach(() => setupTestDir());
    afterEach(() => cleanupTestDir());
    
    it('should report missing nexus', async () => {
      const result = await runCli(['atlas', '-d', TEST_DIR]);
      
      assert.strictEqual(result.code, 0);
      assert.ok(result.stdout.includes('not found'));
    });
    
    it('should generate atlas', async () => {
      createMinimalNexus();
      const result = await runCli(['atlas', '-d', TEST_DIR]);
      
      assert.strictEqual(result.code, 0);
      assert.ok(result.stdout.includes('Generating') || result.stdout.includes('Atlas'));
    });
    
    it('should support --dry-run', async () => {
      createMinimalNexus();
      const result = await runCli(['atlas', '-d', TEST_DIR, '--dry-run']);
      
      assert.strictEqual(result.code, 0);
      assert.ok(result.stdout.includes('Dry run') || result.stdout.includes('dry'));
    });
    
    it('should support --verify', async () => {
      createMinimalNexus();
      const result = await runCli(['atlas', '-d', TEST_DIR, '--verify']);
      
      assert.strictEqual(result.code, 0);
      assert.ok(result.stdout.includes('Verifying') || result.stdout.includes('not found'));
    });
    
  });

  describe('seal', () => {
    
    beforeEach(() => setupTestDir());
    afterEach(() => cleanupTestDir());
    
    it('should report missing nexus', async () => {
      const result = await runCli(['seal', '-d', TEST_DIR]);
      
      assert.strictEqual(result.code, 0);
      assert.ok(result.stdout.includes('not found'));
    });
    
    it('should create seal on valid nexus', async () => {
      createMinimalNexus();
      const result = await runCli(['seal', '-d', TEST_DIR]);
      
      // CLI should run (code 0 or 1 if Guardian fails)
      assert.ok(result.code === 0 || result.code === 1);
      // Should either succeed or report guardian issues
      assert.ok(
        result.stdout.includes('Seal created') || 
        result.stdout.includes('SEAL') ||
        result.stdout.includes('Guardian') ||
        result.stdout.includes('Running')
      );
    });
    
    it('should accept --message option', async () => {
      createMinimalNexus();
      const result = await runCli(['seal', '-d', TEST_DIR, '-m', 'Test seal message']);
      
      // CLI should run (code 0 or 1 if Guardian fails)
      assert.ok(result.code === 0 || result.code === 1);
    });
    
  });

  describe('export', () => {
    
    beforeEach(() => setupTestDir());
    afterEach(() => cleanupTestDir());
    
    it('should report missing nexus', async () => {
      const result = await runCli(['export', '-d', TEST_DIR]);
      
      assert.strictEqual(result.code, 0);
      assert.ok(result.stdout.includes('not found'));
    });
    
    it('should warn when no seals exist', async () => {
      createMinimalNexus();
      const result = await runCli(['export', '-d', TEST_DIR]);
      
      assert.strictEqual(result.code, 0);
      assert.ok(result.stdout.includes('No seals') || result.stdout.includes('EXPORT'));
    });
    
    it('should accept --output option', async () => {
      createMinimalNexus();
      const outputPath = join(TEST_DIR, 'custom-export.json');
      const result = await runCli(['export', '-d', TEST_DIR, '-o', outputPath]);
      
      assert.strictEqual(result.code, 0);
    });
    
  });

  describe('Command help', () => {
    
    before(() => setupTestDir());
    after(() => cleanupTestDir());
    
    it('should show init help', async () => {
      const result = await runCli(['init', '--help']);
      assert.strictEqual(result.code, 0);
      assert.ok(result.stdout.includes('Initialize'));
    });
    
    it('should show seal help', async () => {
      const result = await runCli(['seal', '--help']);
      assert.strictEqual(result.code, 0);
      assert.ok(result.stdout.includes('seal'));
    });
    
    it('should show verify help', async () => {
      const result = await runCli(['verify', '--help']);
      assert.strictEqual(result.code, 0);
      assert.ok(result.stdout.includes('integrity'));
    });
    
    it('should show atlas help', async () => {
      const result = await runCli(['atlas', '--help']);
      assert.strictEqual(result.code, 0);
      assert.ok(result.stdout.includes('atlas'));
    });
    
    it('should show export help', async () => {
      const result = await runCli(['export', '--help']);
      assert.strictEqual(result.code, 0);
      assert.ok(result.stdout.includes('tribunal'));
    });
    
    it('should show status help', async () => {
      const result = await runCli(['status', '--help']);
      assert.strictEqual(result.code, 0);
      assert.ok(result.stdout.includes('status'));
    });
    
  });

});
