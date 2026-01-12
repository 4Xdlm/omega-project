/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NEXUS — Verify & Merkle Tests
 * Tests pour la vérification d'intégrité et le Merkle tree
 * 
 * Version: 1.0.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { setClockOverride } from '../scripts/registry.js';
import { computeFileHash } from '../scripts/hash.js';
import {
  LEAF_PREFIX,
  NODE_PREFIX,
  getFilesInScope,
  computeLeafHash,
  computeNodeHash,
  buildMerkleRoot,
  buildMerkleRootFromHashes,
  verifyMerkleRoot,
  identifyChanges
} from '../scripts/merkle.js';
import {
  VERIFY_STATUS,
  verifyFile,
  verifyFiles,
  verifyIntegrity,
  verifyIdExists,
  quickVerify
} from '../scripts/verify.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SETUP
// ═══════════════════════════════════════════════════════════════════════════════

const TEST_DIR_MERKLE = '/tmp/omega-nexus-test-merkle';
const TEST_DIR_VERIFY = '/tmp/omega-nexus-test-verify2';

function setupTestDir(testDir) {
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true });
  }
  const dirs = [
    'nexus/genesis',
    'nexus/ledger/entities',
    'nexus/ledger/events',
    'nexus/ledger/links',
    'nexus/ledger/registry',
    'nexus/proof/seals',
    'nexus/proof/snapshots/manifests',
    'nexus/proof/states',
    'nexus/proof/completeness'
  ];
  for (const dir of dirs) {
    mkdirSync(join(testDir, dir), { recursive: true });
  }
  writeFileSync(join(testDir, 'nexus/genesis/THE_OATH.md'), '# The Oath\n');
  writeFileSync(join(testDir, 'nexus/genesis/LAWS.yaml'), 'version: "2.2.3"\n');
  writeFileSync(join(testDir, 'nexus/genesis/IDENTITY.yaml'), 'project: omega\n');
}

describe('Merkle Module', () => {
  
  before(() => {
    setupTestDir(TEST_DIR_MERKLE);
  });
  
  after(() => {
    if (existsSync(TEST_DIR_MERKLE)) {
      rmSync(TEST_DIR_MERKLE, { recursive: true });
    }
  });
  
  // Alias pour compatibilité
  const TEST_DIR = TEST_DIR_MERKLE;

  // ═══════════════════════════════════════════════════════════════════════════════
  // CONSTANTS TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Constants', () => {
    
    it('should have LEAF_PREFIX as Buffer', () => {
      assert.ok(Buffer.isBuffer(LEAF_PREFIX));
      assert.ok(LEAF_PREFIX.includes('omega:leaf'));
    });
    
    it('should have NODE_PREFIX as Buffer', () => {
      assert.ok(Buffer.isBuffer(NODE_PREFIX));
      assert.ok(NODE_PREFIX.includes('omega:node'));
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // FILE COLLECTION TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('getFilesInScope()', () => {
    
    it('should find genesis files', () => {
      const files = getFilesInScope(TEST_DIR);
      
      assert.ok(files.some(f => f.includes('THE_OATH.md')));
      assert.ok(files.some(f => f.includes('LAWS.yaml')));
      assert.ok(files.some(f => f.includes('IDENTITY.yaml')));
    });
    
    it('should return sorted list', () => {
      const files = getFilesInScope(TEST_DIR);
      const sorted = [...files].sort();
      
      assert.deepStrictEqual(files, sorted);
    });
    
    it('should exclude specified files', () => {
      const files = getFilesInScope(TEST_DIR, ['nexus/genesis/THE_OATH.md']);
      
      assert.ok(!files.some(f => f === 'nexus/genesis/THE_OATH.md'));
    });
    
    it('should exclude LOCK files', () => {
      // Créer un fichier LOCK
      writeFileSync(join(TEST_DIR, 'nexus/ledger/registry/LOCK-20260112.json'), '{}');
      
      const files = getFilesInScope(TEST_DIR);
      
      assert.ok(!files.some(f => f.includes('LOCK-')));
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // HASH COMPUTATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('computeLeafHash()', () => {
    
    it('should return 32-byte Buffer', () => {
      const hash = computeLeafHash('test/path.yaml', 'sha256:' + 'a'.repeat(64));
      
      assert.ok(Buffer.isBuffer(hash));
      assert.strictEqual(hash.length, 32);
    });
    
    it('should include path in hash (path binding)', () => {
      const hash1 = computeLeafHash('path/a.yaml', 'sha256:' + 'x'.repeat(64));
      const hash2 = computeLeafHash('path/b.yaml', 'sha256:' + 'x'.repeat(64));
      
      // Même contenu, chemins différents = hashes différents
      assert.ok(!hash1.equals(hash2));
    });
    
    it('should be deterministic', () => {
      const hash1 = computeLeafHash('test.yaml', 'sha256:abc123');
      const hash2 = computeLeafHash('test.yaml', 'sha256:abc123');
      
      assert.ok(hash1.equals(hash2));
    });
    
  });

  describe('computeNodeHash()', () => {
    
    it('should return 32-byte Buffer', () => {
      const left = Buffer.alloc(32, 'a');
      const right = Buffer.alloc(32, 'b');
      
      const hash = computeNodeHash(left, right);
      
      assert.ok(Buffer.isBuffer(hash));
      assert.strictEqual(hash.length, 32);
    });
    
    it('should be deterministic', () => {
      const left = Buffer.alloc(32, 'x');
      const right = Buffer.alloc(32, 'y');
      
      const hash1 = computeNodeHash(left, right);
      const hash2 = computeNodeHash(left, right);
      
      assert.ok(hash1.equals(hash2));
    });
    
    it('should be different for different order', () => {
      const a = Buffer.alloc(32, 'a');
      const b = Buffer.alloc(32, 'b');
      
      const hash1 = computeNodeHash(a, b);
      const hash2 = computeNodeHash(b, a);
      
      assert.ok(!hash1.equals(hash2));
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // MERKLE ROOT TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('buildMerkleRoot()', () => {
    
    it('should return sha256: format', () => {
      const files = getFilesInScope(TEST_DIR);
      const root = buildMerkleRoot(files, TEST_DIR);
      
      assert.ok(root.startsWith('sha256:'));
      assert.strictEqual(root.length, 7 + 64);
    });
    
    it('should be deterministic', () => {
      const files = getFilesInScope(TEST_DIR);
      
      const root1 = buildMerkleRoot(files, TEST_DIR);
      const root2 = buildMerkleRoot(files, TEST_DIR);
      
      assert.strictEqual(root1, root2);
    });
    
    it('should change when file changes', () => {
      const files = getFilesInScope(TEST_DIR);
      const root1 = buildMerkleRoot(files, TEST_DIR);
      
      // Modifier un fichier
      writeFileSync(join(TEST_DIR, 'nexus/genesis/THE_OATH.md'), '# Modified Oath\n');
      
      const root2 = buildMerkleRoot(files, TEST_DIR);
      
      assert.notStrictEqual(root1, root2);
      
      // Restaurer
      writeFileSync(join(TEST_DIR, 'nexus/genesis/THE_OATH.md'), '# The Oath\n');
    });
    
    it('should handle empty file list', () => {
      const root = buildMerkleRoot([], TEST_DIR);
      
      assert.ok(root.startsWith('sha256:'));
    });
    
    it('should handle single file', () => {
      const root = buildMerkleRoot(['nexus/genesis/THE_OATH.md'], TEST_DIR);
      
      assert.ok(root.startsWith('sha256:'));
    });
    
  });

  describe('buildMerkleRootFromHashes()', () => {
    
    it('should produce same result as buildMerkleRoot', () => {
      const files = getFilesInScope(TEST_DIR);
      
      // Construire les hashes manuellement
      const fileHashes = {};
      for (const file of files) {
        fileHashes[file] = computeFileHash(join(TEST_DIR, file));
      }
      
      const root1 = buildMerkleRoot(files, TEST_DIR);
      const root2 = buildMerkleRootFromHashes(fileHashes);
      
      assert.strictEqual(root1, root2);
    });
    
  });

  describe('verifyMerkleRoot()', () => {
    
    it('should return valid for correct root', () => {
      const files = getFilesInScope(TEST_DIR);
      const root = buildMerkleRoot(files, TEST_DIR);
      
      const result = verifyMerkleRoot(root, files, TEST_DIR);
      
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.computed, result.expected);
    });
    
    it('should return invalid for wrong root', () => {
      const files = getFilesInScope(TEST_DIR);
      const wrongRoot = 'sha256:' + 'x'.repeat(64);
      
      const result = verifyMerkleRoot(wrongRoot, files, TEST_DIR);
      
      assert.strictEqual(result.valid, false);
    });
    
  });

  describe('identifyChanges()', () => {
    
    it('should detect modified files', () => {
      const files = getFilesInScope(TEST_DIR);
      const expectedHashes = {};
      for (const file of files) {
        expectedHashes[file] = computeFileHash(join(TEST_DIR, file));
      }
      
      // Aucune modification
      let changes = identifyChanges(expectedHashes, TEST_DIR);
      assert.strictEqual(changes.modified.length, 0);
      
      // Modifier un fichier
      writeFileSync(join(TEST_DIR, 'nexus/genesis/THE_OATH.md'), '# Changed!\n');
      
      changes = identifyChanges(expectedHashes, TEST_DIR);
      assert.ok(changes.modified.some(f => f.includes('THE_OATH.md')));
      
      // Restaurer
      writeFileSync(join(TEST_DIR, 'nexus/genesis/THE_OATH.md'), '# The Oath\n');
    });
    
  });

});

describe('Verify Module', () => {
  
  // Alias pour ce module
  const TEST_DIR = TEST_DIR_VERIFY;
  
  before(() => {
    setClockOverride(new Date('2026-01-12T15:00:00Z'));
    setupTestDir(TEST_DIR);
  });
  
  after(() => {
    setClockOverride(null);
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // VERIFY STATUS TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('VERIFY_STATUS', () => {
    
    it('should have all status values', () => {
      assert.strictEqual(VERIFY_STATUS.PASS, 'PASS');
      assert.strictEqual(VERIFY_STATUS.FAIL, 'FAIL');
      assert.strictEqual(VERIFY_STATUS.WARN, 'WARN');
      assert.strictEqual(VERIFY_STATUS.SKIP, 'SKIP');
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // FILE VERIFICATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('verifyFile()', () => {
    
    it('should pass for existing file', () => {
      const result = verifyFile(join(TEST_DIR, 'nexus/genesis/THE_OATH.md'));
      
      assert.strictEqual(result.status, VERIFY_STATUS.PASS);
      assert.ok(result.hash);
    });
    
    it('should pass for matching hash', () => {
      const filepath = join(TEST_DIR, 'nexus/genesis/LAWS.yaml');
      const hash = computeFileHash(filepath);
      
      const result = verifyFile(filepath, hash);
      
      assert.strictEqual(result.status, VERIFY_STATUS.PASS);
    });
    
    it('should fail for non-existent file', () => {
      const result = verifyFile(join(TEST_DIR, 'nonexistent.txt'));
      
      assert.strictEqual(result.status, VERIFY_STATUS.FAIL);
    });
    
    it('should fail for hash mismatch', () => {
      const filepath = join(TEST_DIR, 'nexus/genesis/LAWS.yaml');
      const wrongHash = 'sha256:' + 'z'.repeat(64);
      
      const result = verifyFile(filepath, wrongHash);
      
      assert.strictEqual(result.status, VERIFY_STATUS.FAIL);
    });
    
  });

  describe('verifyFiles()', () => {
    
    it('should verify multiple files', () => {
      const fileHashes = {
        'nexus/genesis/THE_OATH.md': computeFileHash(join(TEST_DIR, 'nexus/genesis/THE_OATH.md')),
        'nexus/genesis/LAWS.yaml': computeFileHash(join(TEST_DIR, 'nexus/genesis/LAWS.yaml'))
      };
      
      const result = verifyFiles(fileHashes, TEST_DIR);
      
      assert.strictEqual(result.status, VERIFY_STATUS.PASS);
      assert.strictEqual(result.pass_count, 2);
    });
    
    it('should report failures', () => {
      const fileHashes = {
        'nexus/genesis/THE_OATH.md': 'sha256:' + 'wrong'.padEnd(64, '0')
      };
      
      const result = verifyFiles(fileHashes, TEST_DIR);
      
      assert.strictEqual(result.status, VERIFY_STATUS.FAIL);
      assert.strictEqual(result.fail_count, 1);
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // INTEGRITY TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('verifyIntegrity()', () => {
    
    it('should check required directories', () => {
      const result = verifyIntegrity(TEST_DIR);
      
      // La structure existe
      assert.ok(result.pass_count > 0);
    });
    
    it('should check genesis files', () => {
      const result = verifyIntegrity(TEST_DIR);
      
      // Les fichiers genesis existent
      const genesisChecks = result.checks.filter(c => 
        c.message && c.message.includes('Genesis')
      );
      assert.ok(genesisChecks.length > 0);
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // ID VERIFICATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('verifyIdExists()', () => {
    
    it('should fail for invalid ID format', () => {
      const result = verifyIdExists('invalid', TEST_DIR);
      
      assert.strictEqual(result.status, VERIFY_STATUS.FAIL);
    });
    
    it('should fail for non-existent ID', () => {
      const result = verifyIdExists('ENT-20260112-9999', TEST_DIR);
      
      assert.strictEqual(result.status, VERIFY_STATUS.FAIL);
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // QUICK VERIFY TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('quickVerify()', () => {
    
    it('should warn when no seals exist', () => {
      const result = quickVerify(TEST_DIR);
      
      assert.strictEqual(result.status, VERIFY_STATUS.WARN);
    });
    
  });

});

console.log('Verify & Merkle tests loaded');
