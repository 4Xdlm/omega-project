/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 13A — Forensic Logger Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Test coverage for:
 * - INV-LOG-01: Each operation generates exactly 1 log
 * - INV-LOG-02: Strict JSON format validated by schema
 * - INV-LOG-03: SHA256 hash of each entry
 * 
 * Total: 22 tests
 * 
 * @module forensic_logger.test
 * @version 3.13.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rm, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import {
  computeHash,
  validateLogEntry,
  verifyEntryHash,
  ForensicLogger,
  ForensicLogEntry,
  GENESIS_HASH,
  LOG_LEVEL_VALUES,
  withForensicLogging,
  getDefaultLogger,
  resetDefaultLogger
} from '../forensic_logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SETUP
// ═══════════════════════════════════════════════════════════════════════════════

const TEST_LOG_PATH = './test_logs/forensic_test.log';

async function cleanupTestLogs(): Promise<void> {
  if (existsSync('./test_logs')) {
    await rm('./test_logs', { recursive: true, force: true });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: computeHash Tests (3 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeHash', () => {
  it('should return 64-character hex string', () => {
    const hash = computeHash('test data');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
  
  it('should be deterministic - same input = same output', () => {
    const input = { key: 'value', num: 42 };
    const hash1 = computeHash(input);
    const hash2 = computeHash(input);
    expect(hash1).toBe(hash2);
  });
  
  it('should produce different hashes for different inputs', () => {
    const hash1 = computeHash('input1');
    const hash2 = computeHash('input2');
    expect(hash1).not.toBe(hash2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: validateLogEntry Tests - INV-LOG-02 (6 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('validateLogEntry - INV-LOG-02', () => {
  const validEntry: ForensicLogEntry = {
    timestamp: '2026-01-04T12:00:00.000Z',
    level: 'INFO',
    operation: 'test_operation',
    module: 'test_module',
    input_hash: 'a'.repeat(64),
    output_hash: 'b'.repeat(64),
    duration_ms: 100,
    success: true,
    entry_hash: 'c'.repeat(64),
    sequence: 0,
    previous_hash: GENESIS_HASH
  };
  
  it('should validate a correct entry', () => {
    const result = validateLogEntry(validEntry);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
  
  it('should reject non-object input', () => {
    const result = validateLogEntry('not an object');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Entry must be an object');
  });
  
  it('should detect missing required fields', () => {
    const incomplete = { timestamp: '2026-01-04T12:00:00.000Z' };
    const result = validateLogEntry(incomplete);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Missing required field'))).toBe(true);
  });
  
  it('should reject invalid timestamp format', () => {
    const invalid = { ...validEntry, timestamp: 'not-a-date' };
    const result = validateLogEntry(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('timestamp'))).toBe(true);
  });
  
  it('should reject invalid hash format (too short)', () => {
    const invalid = { ...validEntry, entry_hash: 'abc123' };
    const result = validateLogEntry(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('entry_hash'))).toBe(true);
  });
  
  it('should reject negative duration', () => {
    const invalid = { ...validEntry, duration_ms: -10 };
    const result = validateLogEntry(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('duration_ms'))).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: verifyEntryHash Tests - INV-LOG-03 (3 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('verifyEntryHash - INV-LOG-03', () => {
  it('should verify a correctly hashed entry', () => {
    const entryWithoutHash = {
      timestamp: '2026-01-04T12:00:00.000Z',
      level: 'INFO' as const,
      operation: 'test',
      module: 'test',
      input_hash: computeHash('input'),
      output_hash: computeHash('output'),
      duration_ms: 50,
      success: true,
      sequence: 0,
      previous_hash: GENESIS_HASH
    };
    
    const entry: ForensicLogEntry = {
      ...entryWithoutHash,
      entry_hash: computeHash(entryWithoutHash)
    };
    
    expect(verifyEntryHash(entry)).toBe(true);
  });
  
  it('should reject entry with tampered hash', () => {
    const entry: ForensicLogEntry = {
      timestamp: '2026-01-04T12:00:00.000Z',
      level: 'INFO',
      operation: 'test',
      module: 'test',
      input_hash: computeHash('input'),
      output_hash: computeHash('output'),
      duration_ms: 50,
      success: true,
      sequence: 0,
      previous_hash: GENESIS_HASH,
      entry_hash: 'tampered_hash'.padEnd(64, '0')
    };
    
    expect(verifyEntryHash(entry)).toBe(false);
  });
  
  it('should reject entry with modified content', () => {
    const entryWithoutHash = {
      timestamp: '2026-01-04T12:00:00.000Z',
      level: 'INFO' as const,
      operation: 'test',
      module: 'test',
      input_hash: computeHash('input'),
      output_hash: computeHash('output'),
      duration_ms: 50,
      success: true,
      sequence: 0,
      previous_hash: GENESIS_HASH
    };
    
    const entry: ForensicLogEntry = {
      ...entryWithoutHash,
      entry_hash: computeHash(entryWithoutHash),
      // Now tamper with the content
      duration_ms: 999
    };
    
    expect(verifyEntryHash(entry)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: ForensicLogger Core Tests (6 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('ForensicLogger Core', () => {
  let logger: ForensicLogger;
  
  beforeEach(async () => {
    await cleanupTestLogs();
    logger = new ForensicLogger({ logPath: TEST_LOG_PATH, minLevel: 'DEBUG' });
  });
  
  afterEach(async () => {
    await cleanupTestLogs();
  });
  
  it('should initialize with default config', () => {
    const defaultLogger = new ForensicLogger();
    const config = defaultLogger.getConfig();
    expect(config.minLevel).toBe('INFO');
    expect(config.maxFiles).toBe(5);
  });
  
  it('should start with sequence 0 and genesis hash', () => {
    expect(logger.getSequence()).toBe(0);
    expect(logger.getPreviousHash()).toBe(GENESIS_HASH);
  });
  
  it('should increment sequence after each log', async () => {
    await logger.info('op1', 'mod', 'in', 'out', 10);
    expect(logger.getSequence()).toBe(1);
    
    await logger.info('op2', 'mod', 'in', 'out', 10);
    expect(logger.getSequence()).toBe(2);
  });
  
  it('should update previous hash after each log', async () => {
    const initial = logger.getPreviousHash();
    await logger.info('op1', 'mod', 'in', 'out', 10);
    const after = logger.getPreviousHash();
    
    expect(after).not.toBe(initial);
    expect(after).toHaveLength(64);
  });
  
  it('should filter logs below minLevel', async () => {
    const infoLogger = new ForensicLogger({ 
      logPath: TEST_LOG_PATH, 
      minLevel: 'WARN' 
    });
    
    const debugResult = await infoLogger.debug('op', 'mod', 'in', 'out', 10);
    const infoResult = await infoLogger.info('op', 'mod', 'in', 'out', 10);
    const warnResult = await infoLogger.warn('op', 'mod', 'in', 'out', 10);
    
    expect(debugResult).toBeNull();
    expect(infoResult).toBeNull();
    expect(warnResult).not.toBeNull();
  });
  
  it('should clear logs and reset state', async () => {
    await logger.info('op1', 'mod', 'in', 'out', 10);
    await logger.info('op2', 'mod', 'in', 'out', 10);
    
    await logger.clear();
    
    expect(logger.getSequence()).toBe(0);
    expect(logger.getPreviousHash()).toBe(GENESIS_HASH);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: ForensicLogger INV-LOG-01 Tests (2 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('ForensicLogger - INV-LOG-01: One log per operation', () => {
  let logger: ForensicLogger;
  
  beforeEach(async () => {
    await cleanupTestLogs();
    logger = new ForensicLogger({ logPath: TEST_LOG_PATH, minLevel: 'DEBUG' });
  });
  
  afterEach(async () => {
    await cleanupTestLogs();
  });
  
  it('should generate exactly one log entry per log call', async () => {
    await logger.info('operation1', 'module1', 'input1', 'output1', 100);
    await logger.info('operation2', 'module1', 'input2', 'output2', 200);
    await logger.info('operation3', 'module1', 'input3', 'output3', 300);
    
    const entries = await logger.readEntries();
    expect(entries).toHaveLength(3);
    
    // Verify each entry is unique
    const hashes = entries.map(e => e.entry_hash);
    const uniqueHashes = new Set(hashes);
    expect(uniqueHashes.size).toBe(3);
  });
  
  it('should generate exactly one log in withForensicLogging wrapper', async () => {
    const initialSequence = logger.getSequence();
    
    const { result, logEntry } = await withForensicLogging(
      logger,
      'wrapped_operation',
      'test_module',
      { input: 'data' },
      () => 'result_value'
    );
    
    expect(result).toBe('result_value');
    expect(logEntry).not.toBeNull();
    expect(logger.getSequence()).toBe(initialSequence + 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: Chain Integrity Tests (2 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('ForensicLogger Chain Integrity', () => {
  let logger: ForensicLogger;
  
  beforeEach(async () => {
    await cleanupTestLogs();
    logger = new ForensicLogger({ logPath: TEST_LOG_PATH, minLevel: 'DEBUG' });
  });
  
  afterEach(async () => {
    await cleanupTestLogs();
  });
  
  it('should maintain chain integrity across multiple entries', async () => {
    await logger.info('op1', 'mod', 'in', 'out', 10);
    await logger.info('op2', 'mod', 'in', 'out', 20);
    await logger.info('op3', 'mod', 'in', 'out', 30);
    
    const result = await logger.verifyChain();
    expect(result.valid).toBe(true);
  });
  
  it('should verify first entry has genesis hash', async () => {
    await logger.info('op1', 'mod', 'in', 'out', 10);
    
    const entries = await logger.readEntries();
    expect(entries[0].previous_hash).toBe(GENESIS_HASH);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: Log Level Methods Tests (3 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('ForensicLogger Log Levels', () => {
  let logger: ForensicLogger;
  
  beforeEach(async () => {
    await cleanupTestLogs();
    logger = new ForensicLogger({ logPath: TEST_LOG_PATH, minLevel: 'DEBUG' });
  });
  
  afterEach(async () => {
    await cleanupTestLogs();
  });
  
  it('should have correct log level values', () => {
    expect(LOG_LEVEL_VALUES.DEBUG).toBeLessThan(LOG_LEVEL_VALUES.INFO);
    expect(LOG_LEVEL_VALUES.INFO).toBeLessThan(LOG_LEVEL_VALUES.WARN);
    expect(LOG_LEVEL_VALUES.WARN).toBeLessThan(LOG_LEVEL_VALUES.ERROR);
    expect(LOG_LEVEL_VALUES.ERROR).toBeLessThan(LOG_LEVEL_VALUES.FATAL);
  });
  
  it('should set success=false for error and fatal levels', async () => {
    const errorEntry = await logger.error('op', 'mod', 'in', 'out', 10, 'error msg');
    const fatalEntry = await logger.fatal('op', 'mod', 'in', 'out', 10, 'fatal msg');
    
    expect(errorEntry?.success).toBe(false);
    expect(fatalEntry?.success).toBe(false);
    expect(errorEntry?.error).toBe('error msg');
    expect(fatalEntry?.error).toBe('fatal msg');
  });
  
  it('should set success=true for debug, info, and warn levels', async () => {
    const debugEntry = await logger.debug('op', 'mod', 'in', 'out', 10);
    const infoEntry = await logger.info('op', 'mod', 'in', 'out', 10);
    const warnEntry = await logger.warn('op', 'mod', 'in', 'out', 10);
    
    expect(debugEntry?.success).toBe(true);
    expect(infoEntry?.success).toBe(true);
    expect(warnEntry?.success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8: Statistics Tests (2 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('ForensicLogger Statistics', () => {
  let logger: ForensicLogger;
  
  beforeEach(async () => {
    await cleanupTestLogs();
    logger = new ForensicLogger({ logPath: TEST_LOG_PATH, minLevel: 'DEBUG' });
  });
  
  afterEach(async () => {
    await cleanupTestLogs();
  });
  
  it('should calculate correct statistics', async () => {
    await logger.info('op1', 'moduleA', 'in', 'out', 100);
    await logger.info('op2', 'moduleA', 'in', 'out', 200);
    await logger.error('op3', 'moduleB', 'in', 'out', 300, 'error');
    
    const stats = await logger.getStats();
    
    expect(stats.totalEntries).toBe(3);
    expect(stats.byLevel.INFO).toBe(2);
    expect(stats.byLevel.ERROR).toBe(1);
    expect(stats.byModule.moduleA).toBe(2);
    expect(stats.byModule.moduleB).toBe(1);
    expect(stats.successRate).toBeCloseTo(2/3);
    expect(stats.avgDuration).toBeCloseTo(200);
  });
  
  it('should return empty stats for empty log', async () => {
    const stats = await logger.getStats();
    
    expect(stats.totalEntries).toBe(0);
    expect(stats.successRate).toBe(0);
    expect(stats.avgDuration).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9: Singleton Tests (2 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('ForensicLogger Singleton', () => {
  afterEach(() => {
    resetDefaultLogger();
  });
  
  it('should return same instance on multiple calls', () => {
    const logger1 = getDefaultLogger();
    const logger2 = getDefaultLogger();
    expect(logger1).toBe(logger2);
  });
  
  it('should create new instance after reset', () => {
    const logger1 = getDefaultLogger();
    resetDefaultLogger();
    const logger2 = getDefaultLogger();
    expect(logger1).not.toBe(logger2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 10: Metadata Tests (1 test)
// ═══════════════════════════════════════════════════════════════════════════════

describe('ForensicLogger Metadata', () => {
  let logger: ForensicLogger;
  
  beforeEach(async () => {
    await cleanupTestLogs();
    logger = new ForensicLogger({ logPath: TEST_LOG_PATH, minLevel: 'DEBUG' });
  });
  
  afterEach(async () => {
    await cleanupTestLogs();
  });
  
  it('should include metadata in log entry', async () => {
    const metadata = { userId: 'user123', requestId: 'req456' };
    const entry = await logger.info('op', 'mod', 'in', 'out', 10, metadata);
    
    expect(entry?.metadata).toEqual(metadata);
  });
});
