/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NEXUS — Registry Tests
 * Tests pour le gestionnaire de registre
 * 
 * Version: 1.0.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  setClockOverride,
  getDate,
  getTimestamp,
  getLockPath,
  acquireLock,
  releaseLock,
  checkLock,
  getRegistryPath,
  readRegistry,
  saveRegistry,
  incrementCounter,
  formatSeq,
  getNextId,
  parseId,
  isValidId,
  isValidType,
  VALID_TYPES
} from '../scripts/registry.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SETUP
// ═══════════════════════════════════════════════════════════════════════════════

const TEST_DIR = '/tmp/omega-nexus-test-registry';

describe('Registry Module', () => {
  
  before(() => {
    // Nettoyer et créer le répertoire de test
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
  });
  
  after(() => {
    // Nettoyer après les tests
    setClockOverride(null);
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });
  
  beforeEach(() => {
    // Reset clock avant chaque test
    setClockOverride(null);
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // DATE & TIMESTAMP TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('getDate()', () => {
    
    it('should return YYYYMMDD format', () => {
      const date = new Date('2026-01-12T15:30:00Z');
      const result = getDate(date);
      assert.strictEqual(result, '20260112');
    });
    
    it('should use UTC timezone', () => {
      // 23:30 UTC du 11 janvier = 00:30 le 12 en Paris
      const date = new Date('2026-01-11T23:30:00Z');
      const result = getDate(date);
      assert.strictEqual(result, '20260111');
    });
    
    it('should handle clock override', () => {
      setClockOverride(new Date('2026-06-15T10:00:00Z'));
      const result = getDate();
      assert.strictEqual(result, '20260615');
    });
    
  });

  describe('getTimestamp()', () => {
    
    it('should return ISO 8601 UTC format', () => {
      const date = new Date('2026-01-12T15:30:45.123Z');
      const result = getTimestamp(date);
      // Doit être sans millisecondes
      assert.strictEqual(result, '2026-01-12T15:30:45Z');
    });
    
    it('should always end with Z', () => {
      const result = getTimestamp(new Date());
      assert.ok(result.endsWith('Z'));
    });
    
    it('should match ISO format pattern', () => {
      const result = getTimestamp(new Date('2026-01-12T08:05:03Z'));
      assert.match(result, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // LOCK TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Lock Management', () => {
    
    const lockDate = '20260112';
    
    afterEach(() => {
      // Toujours libérer le lock après chaque test
      releaseLock(lockDate, TEST_DIR);
    });
    
    it('should acquire lock successfully', async () => {
      const result = await acquireLock(lockDate, TEST_DIR, 'test');
      assert.strictEqual(result, true);
      
      const lockPath = getLockPath(lockDate, TEST_DIR);
      assert.ok(existsSync(lockPath));
    });
    
    it('should release lock successfully', async () => {
      await acquireLock(lockDate, TEST_DIR, 'test');
      const released = releaseLock(lockDate, TEST_DIR);
      assert.strictEqual(released, true);
      
      const lockPath = getLockPath(lockDate, TEST_DIR);
      assert.ok(!existsSync(lockPath));
    });
    
    it('should check lock status', async () => {
      // Pas de lock initialement
      let lockData = checkLock(lockDate, TEST_DIR);
      assert.strictEqual(lockData, null);
      
      // Après acquisition
      await acquireLock(lockDate, TEST_DIR, 'test');
      lockData = checkLock(lockDate, TEST_DIR);
      assert.ok(lockData !== null);
      assert.ok(lockData.timestamp);
      assert.ok(lockData.pid);
    });
    
    it('should include required lock fields', async () => {
      await acquireLock(lockDate, TEST_DIR, 'test-purpose');
      const lockData = checkLock(lockDate, TEST_DIR);
      
      assert.ok(lockData.timestamp);
      assert.ok(lockData.pid);
      assert.ok(lockData.hostname);
      assert.strictEqual(lockData.purpose, 'test-purpose');
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // REGISTRY TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Registry Management', () => {
    
    const regDate = '20260112';
    
    it('should create empty registry if not exists', () => {
      const registry = readRegistry(regDate, TEST_DIR);
      
      assert.strictEqual(registry.id, `REG-${regDate}`);
      assert.strictEqual(registry.date, regDate);
      assert.ok(registry.counters);
      assert.strictEqual(registry.counters.ENT, 0);
      assert.strictEqual(registry.counters.EVT, 0);
    });
    
    it('should save and read registry', () => {
      const registry = readRegistry(regDate, TEST_DIR);
      registry.counters.ENT = 5;
      
      saveRegistry(regDate, registry, TEST_DIR);
      
      const loaded = readRegistry(regDate, TEST_DIR);
      assert.strictEqual(loaded.counters.ENT, 5);
    });
    
    it('should increment counter correctly', () => {
      // Utiliser une date différente pour ce test
      const testDate = '20260113';
      
      const seq1 = incrementCounter(testDate, 'ENT', TEST_DIR);
      assert.strictEqual(seq1, 1);
      
      const seq2 = incrementCounter(testDate, 'ENT', TEST_DIR);
      assert.strictEqual(seq2, 2);
      
      const seq3 = incrementCounter(testDate, 'EVT', TEST_DIR);
      assert.strictEqual(seq3, 1);
    });
    
    it('should throw on invalid type', () => {
      assert.throws(() => {
        incrementCounter('20260112', 'INVALID', TEST_DIR);
      }, /Unknown type/);
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // ID TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('ID Generation', () => {
    
    it('should format sequence correctly', () => {
      assert.strictEqual(formatSeq(1), '0001');
      assert.strictEqual(formatSeq(42), '0042');
      assert.strictEqual(formatSeq(999), '0999');
      assert.strictEqual(formatSeq(9999), '9999');
    });
    
    it('should throw on invalid sequence', () => {
      assert.throws(() => formatSeq(0));
      assert.throws(() => formatSeq(10000));
    });
    
    it('should parse valid ID', () => {
      const parsed = parseId('ENT-20260112-0001');
      assert.strictEqual(parsed.type, 'ENT');
      assert.strictEqual(parsed.date, '20260112');
      assert.strictEqual(parsed.seq, 1);
    });
    
    it('should throw on invalid ID format', () => {
      assert.throws(() => parseId('INVALID'));
      assert.throws(() => parseId('ENT-2026-0001'));
      assert.throws(() => parseId('ent-20260112-0001'));
    });
    
    it('should validate ID correctly', () => {
      assert.strictEqual(isValidId('ENT-20260112-0001'), true);
      assert.strictEqual(isValidId('EVT-20260112-9999'), true);
      assert.strictEqual(isValidId('SEAL-20260101-0001'), true);
      
      assert.strictEqual(isValidId('invalid'), false);
      assert.strictEqual(isValidId('ENT-2026-001'), false);
      assert.strictEqual(isValidId('ent-20260112-0001'), false);
    });
    
    it('should generate next ID with correct format', () => {
      setClockOverride(new Date('2026-01-15T10:00:00Z'));
      
      const id = getNextId('ENT', TEST_DIR);
      assert.match(id, /^ENT-20260115-\d{4}$/);
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // TYPE VALIDATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Type Validation', () => {
    
    it('should have all expected types', () => {
      const expectedTypes = ['ENT', 'EVT', 'LINK', 'REG', 'SES', 'SEAL', 'STATE', 
                           'COMP', 'CERT', 'MANIFEST', 'TESTLOG', 'BUILDLOG', 'COV'];
      
      for (const type of expectedTypes) {
        assert.ok(VALID_TYPES.includes(type), `Missing type: ${type}`);
      }
    });
    
    it('should validate types correctly', () => {
      assert.strictEqual(isValidType('ENT'), true);
      assert.strictEqual(isValidType('EVT'), true);
      assert.strictEqual(isValidType('INVALID'), false);
      assert.strictEqual(isValidType('ent'), false);
    });
    
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // DETERMINISM TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Determinism', () => {
    
    it('should produce same date for same input', () => {
      const date = new Date('2026-01-12T15:30:00Z');
      const result1 = getDate(date);
      const result2 = getDate(date);
      assert.strictEqual(result1, result2);
    });
    
    it('should produce same timestamp for same input', () => {
      const date = new Date('2026-01-12T15:30:45Z');
      const result1 = getTimestamp(date);
      const result2 = getTimestamp(date);
      assert.strictEqual(result1, result2);
    });
    
    it('should respect clock override', () => {
      const fixedDate = new Date('2026-03-15T12:00:00Z');
      setClockOverride(fixedDate);
      
      const date1 = getDate();
      const date2 = getDate();
      
      assert.strictEqual(date1, date2);
      assert.strictEqual(date1, '20260315');
    });
    
  });

});

console.log('Registry tests loaded');
