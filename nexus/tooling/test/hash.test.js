/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NEXUS — Hash Tests
 * Tests pour le gestionnaire de hashing
 * 
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / RFC 8785
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  getCanonicalPath,
  getExtensionForType,
  getBasePathForType,
  parseFile,
  parseYAML,
  parseJSON,
  parseJSONL,
  getParseType,
  canonicalizeObject,
  canonicalizeFile,
  computeHash,
  computeFileHash,
  isValidHash,
  extractHashHex,
  verifyFileHash,
  compareHashes
} from '../scripts/hash.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SETUP
// ═══════════════════════════════════════════════════════════════════════════════

const TEST_DIR = '/tmp/omega-nexus-test-hash';

describe('Hash Module', () => {
  
  before(() => {
    // Créer le répertoire de test
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
    
    // Créer des fichiers de test
    writeFileSync(join(TEST_DIR, 'test.yaml'), 'name: test\nvalue: 42\n');
    writeFileSync(join(TEST_DIR, 'test.json'), '{"name":"test","value":42}');
    writeFileSync(join(TEST_DIR, 'test.jsonl'), '{"a":1}\n{"b":2}\n');
    writeFileSync(join(TEST_DIR, 'test.md'), '# Hello World\n');
    writeFileSync(join(TEST_DIR, 'test.txt'), 'Hello World');
  });
  
  after(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // CANONICAL PATH TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  // Helper pour normaliser les chemins (cross-platform)
  const normalizePath = (p) => p.replace(/\\/g, '/');

  describe('getCanonicalPath()', () => {
    
    it('should return correct path for ENT', () => {
      const path = getCanonicalPath('ENT-20260112-0001', '.');
      assert.strictEqual(normalizePath(path), 'nexus/ledger/entities/ENT-20260112-0001.yaml');
    });
    
    it('should return correct path for EVT', () => {
      const path = getCanonicalPath('EVT-20260112-0001', '.');
      assert.strictEqual(normalizePath(path), 'nexus/ledger/events/EVT-20260112-0001.yaml');
    });
    
    it('should return correct path for SEAL', () => {
      const path = getCanonicalPath('SEAL-20260112-0001', '.');
      assert.strictEqual(normalizePath(path), 'nexus/proof/seals/SEAL-20260112-0001.yaml');
    });
    
    it('should return correct path for MANIFEST', () => {
      const path = getCanonicalPath('MANIFEST-20260112-0001', '.');
      assert.strictEqual(normalizePath(path), 'nexus/proof/snapshots/manifests/MANIFEST-20260112-0001.json');
    });
    
    it('should return correct path for SES', () => {
      const path = getCanonicalPath('SES-20260112-0001', '.');
      assert.strictEqual(normalizePath(path), 'nexus/raw/sessions/SES-20260112-0001.jsonl');
    });
    
    it('should throw on invalid ID format', () => {
      assert.throws(() => getCanonicalPath('INVALID', '.'));
    });
    
    it('should throw on unknown type', () => {
      assert.throws(() => getCanonicalPath('NNN-20260112-0001', '.'));
    });
    
  });

  describe('getExtensionForType()', () => {
    
    it('should return .yaml for YAML types', () => {
      assert.strictEqual(getExtensionForType('ENT'), '.yaml');
      assert.strictEqual(getExtensionForType('EVT'), '.yaml');
      assert.strictEqual(getExtensionForType('SEAL'), '.yaml');
    });
    
    it('should return .json for JSON types', () => {
      assert.strictEqual(getExtensionForType('MANIFEST'), '.json');
      assert.strictEqual(getExtensionForType('TESTLOG'), '.json');
    });
    
    it('should return .jsonl for SES', () => {
      assert.strictEqual(getExtensionForType('SES'), '.jsonl');
    });
    
    it('should return .txt for BUILDLOG', () => {
      assert.strictEqual(getExtensionForType('BUILDLOG'), '.txt');
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // PARSING TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('parseFile()', () => {
    
    it('should parse YAML file', () => {
      const data = parseFile(join(TEST_DIR, 'test.yaml'));
      assert.strictEqual(data.name, 'test');
      assert.strictEqual(data.value, 42);
    });
    
    it('should parse JSON file', () => {
      const data = parseFile(join(TEST_DIR, 'test.json'));
      assert.strictEqual(data.name, 'test');
      assert.strictEqual(data.value, 42);
    });
    
    it('should parse JSONL file', () => {
      const data = parseFile(join(TEST_DIR, 'test.jsonl'));
      assert.ok(Array.isArray(data));
      assert.strictEqual(data.length, 2);
      assert.strictEqual(data[0].a, 1);
      assert.strictEqual(data[1].b, 2);
    });
    
    it('should return string for MD file', () => {
      const data = parseFile(join(TEST_DIR, 'test.md'));
      assert.strictEqual(typeof data, 'string');
      assert.ok(data.includes('Hello World'));
    });
    
    it('should throw on non-existent file', () => {
      assert.throws(() => parseFile(join(TEST_DIR, 'nonexistent.yaml')));
    });
    
  });

  describe('parseYAML()', () => {
    
    it('should parse valid YAML', () => {
      const data = parseYAML('name: test\nvalue: 42');
      assert.strictEqual(data.name, 'test');
      assert.strictEqual(data.value, 42);
    });
    
    it('should handle arrays', () => {
      const data = parseYAML('items:\n  - a\n  - b\n  - c');
      assert.deepStrictEqual(data.items, ['a', 'b', 'c']);
    });
    
  });

  describe('parseJSON()', () => {
    
    it('should parse valid JSON', () => {
      const data = parseJSON('{"name":"test","value":42}');
      assert.strictEqual(data.name, 'test');
      assert.strictEqual(data.value, 42);
    });
    
    it('should throw on invalid JSON', () => {
      assert.throws(() => parseJSON('{invalid}'));
    });
    
  });

  describe('parseJSONL()', () => {
    
    it('should parse JSONL', () => {
      const data = parseJSONL('{"a":1}\n{"b":2}\n');
      assert.strictEqual(data.length, 2);
    });
    
    it('should handle empty lines', () => {
      const data = parseJSONL('{"a":1}\n\n{"b":2}\n');
      assert.strictEqual(data.length, 2);
    });
    
  });

  describe('getParseType()', () => {
    
    it('should detect YAML', () => {
      assert.strictEqual(getParseType('file.yaml'), 'yaml');
      assert.strictEqual(getParseType('file.yml'), 'yaml');
    });
    
    it('should detect JSON', () => {
      assert.strictEqual(getParseType('file.json'), 'json');
    });
    
    it('should detect JSONL', () => {
      assert.strictEqual(getParseType('file.jsonl'), 'jsonl');
    });
    
    it('should default to direct', () => {
      assert.strictEqual(getParseType('file.md'), 'direct');
      assert.strictEqual(getParseType('file.txt'), 'direct');
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // CANONICALIZATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('canonicalizeObject()', () => {
    
    it('should produce deterministic output', () => {
      const obj1 = { b: 2, a: 1 };
      const obj2 = { a: 1, b: 2 };
      
      const canon1 = canonicalizeObject(obj1);
      const canon2 = canonicalizeObject(obj2);
      
      assert.strictEqual(canon1, canon2);
    });
    
    it('should handle nested objects', () => {
      const obj = { outer: { inner: 1 } };
      const canon = canonicalizeObject(obj);
      assert.ok(canon.includes('outer'));
      assert.ok(canon.includes('inner'));
    });
    
    it('should handle arrays', () => {
      const obj = { items: [3, 1, 2] };
      const canon = canonicalizeObject(obj);
      // Arrays should maintain order
      assert.ok(canon.includes('[3,1,2]'));
    });
    
    it('should return string for string input', () => {
      const result = canonicalizeObject('hello');
      assert.strictEqual(result, 'hello');
    });
    
    it('should return null for null', () => {
      const result = canonicalizeObject(null);
      assert.strictEqual(result, 'null');
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // HASHING TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('computeHash()', () => {
    
    it('should return sha256: prefix', () => {
      const hash = computeHash('test');
      assert.ok(hash.startsWith('sha256:'));
    });
    
    it('should return 64 hex chars after prefix', () => {
      const hash = computeHash('test');
      const hex = hash.substring(7);
      assert.strictEqual(hex.length, 64);
      assert.match(hex, /^[a-f0-9]+$/);
    });
    
    it('should be deterministic', () => {
      const hash1 = computeHash('same input');
      const hash2 = computeHash('same input');
      assert.strictEqual(hash1, hash2);
    });
    
    it('should produce different hashes for different inputs', () => {
      const hash1 = computeHash('input1');
      const hash2 = computeHash('input2');
      assert.notStrictEqual(hash1, hash2);
    });
    
  });

  describe('computeFileHash()', () => {
    
    it('should hash file content', () => {
      const hash = computeFileHash(join(TEST_DIR, 'test.txt'));
      assert.ok(isValidHash(hash));
    });
    
    it('should be deterministic for same file', () => {
      const hash1 = computeFileHash(join(TEST_DIR, 'test.json'));
      const hash2 = computeFileHash(join(TEST_DIR, 'test.json'));
      assert.strictEqual(hash1, hash2);
    });
    
    it('should canonicalize YAML before hashing', () => {
      // Créer deux fichiers YAML avec le même contenu mais ordre différent
      writeFileSync(join(TEST_DIR, 'order1.yaml'), 'a: 1\nb: 2\n');
      writeFileSync(join(TEST_DIR, 'order2.yaml'), 'b: 2\na: 1\n');
      
      const hash1 = computeFileHash(join(TEST_DIR, 'order1.yaml'));
      const hash2 = computeFileHash(join(TEST_DIR, 'order2.yaml'));
      
      // Les hashes doivent être identiques après canonicalisation
      assert.strictEqual(hash1, hash2);
    });
    
  });

  describe('isValidHash()', () => {
    
    it('should validate correct hash format', () => {
      const validHash = 'sha256:' + 'a'.repeat(64);
      assert.strictEqual(isValidHash(validHash), true);
    });
    
    it('should reject incorrect prefix', () => {
      const invalidHash = 'md5:' + 'a'.repeat(64);
      assert.strictEqual(isValidHash(invalidHash), false);
    });
    
    it('should reject incorrect length', () => {
      const invalidHash = 'sha256:' + 'a'.repeat(32);
      assert.strictEqual(isValidHash(invalidHash), false);
    });
    
    it('should reject uppercase hex', () => {
      const invalidHash = 'sha256:' + 'A'.repeat(64);
      assert.strictEqual(isValidHash(invalidHash), false);
    });
    
  });

  describe('extractHashHex()', () => {
    
    it('should extract hex part', () => {
      const hash = 'sha256:' + 'abc123'.padEnd(64, '0');
      const hex = extractHashHex(hash);
      assert.strictEqual(hex.length, 64);
      assert.ok(hex.startsWith('abc123'));
    });
    
    it('should throw on invalid hash', () => {
      assert.throws(() => extractHashHex('invalid'));
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // VERIFICATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('verifyFileHash()', () => {
    
    it('should return true for matching hash', () => {
      const filepath = join(TEST_DIR, 'test.txt');
      const hash = computeFileHash(filepath);
      assert.strictEqual(verifyFileHash(filepath, hash), true);
    });
    
    it('should return false for non-matching hash', () => {
      const filepath = join(TEST_DIR, 'test.txt');
      const wrongHash = 'sha256:' + 'x'.repeat(64);
      assert.strictEqual(verifyFileHash(filepath, wrongHash), false);
    });
    
    it('should return false for non-existent file', () => {
      assert.strictEqual(verifyFileHash(join(TEST_DIR, 'nope.txt'), 'sha256:abc'), false);
    });
    
  });

  describe('compareHashes()', () => {
    
    it('should compare identical hashes', () => {
      const h1 = 'sha256:abc123';
      const h2 = 'sha256:abc123';
      assert.strictEqual(compareHashes(h1, h2), true);
    });
    
    it('should be case insensitive', () => {
      const h1 = 'sha256:ABC123';
      const h2 = 'sha256:abc123';
      assert.strictEqual(compareHashes(h1, h2), true);
    });
    
    it('should detect different hashes', () => {
      const h1 = 'sha256:abc123';
      const h2 = 'sha256:def456';
      assert.strictEqual(compareHashes(h1, h2), false);
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // DETERMINISM TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Determinism', () => {
    
    it('should produce reproducible hashes across runs', () => {
      const content = '{"test": true, "value": 42}';
      
      // Exécuter 100 fois pour vérifier le déterminisme
      const firstHash = computeHash(content);
      
      for (let i = 0; i < 100; i++) {
        const hash = computeHash(content);
        assert.strictEqual(hash, firstHash, `Run ${i} produced different hash`);
      }
    });
    
    it('should produce same hash for equivalent YAML/JSON', () => {
      writeFileSync(join(TEST_DIR, 'equiv.yaml'), 'x: 1\ny: 2\n');
      writeFileSync(join(TEST_DIR, 'equiv.json'), '{"x":1,"y":2}');
      
      const yamlHash = computeFileHash(join(TEST_DIR, 'equiv.yaml'));
      const jsonHash = computeFileHash(join(TEST_DIR, 'equiv.json'));
      
      // Après canonicalisation, ils devraient être identiques
      assert.strictEqual(yamlHash, jsonHash);
    });
    
  });

});

console.log('Hash tests loaded');
