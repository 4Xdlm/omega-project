/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NEXUS DEP — REPLAY TESTS
 * Test suite for deterministic replay
 * Sprint 15.0 — NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  replay,
  replayWithPayload,
  replayBatch,
  verifyReplayDeterminism,
  generateReplayReport,
} from '../replay';
import {
  registerAdapter,
  clearAdapters,
} from '../router';
import { createMockAdapter } from '../executor';
import { computeHashSync } from '../audit';
import {
  AuditEntry,
  ChronicleEntry,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_UUID_2 = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';

const createMockChronicleEntry = (
  route: string = 'ORACLE.analyze',
  outputData: unknown = { result: 'ok' }
): ChronicleEntry => {
  const auditEntry: AuditEntry = {
    input_hash: 'a'.repeat(64),
    output_hash: computeHashSync(outputData),
    route,
    duration_ms: 150,
    timestamp: new Date().toISOString(),
    module_version: '3.14.0',
    request_id: VALID_UUID,
    response_id: VALID_UUID_2,
    session_id: VALID_UUID,
    caller_id: 'UI',
    seed: 42,
    success: true,
  };
  
  return {
    index: 0,
    entry: auditEntry,
    prev_hash: '',
    entry_hash: 'c'.repeat(64),
    chronicle_timestamp: new Date().toISOString(),
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 1: Replay exact match
// ═══════════════════════════════════════════════════════════════════════════════

describe('Replay exact match', () => {
  beforeEach(() => {
    clearAdapters();
  });

  it('should match when adapter returns same result', async () => {
    const expectedOutput = { result: 'ok' };
    const adapter = createMockAdapter('ORACLE', expectedOutput);
    registerAdapter('omega-oracle-v2-adapter', () => adapter);
    
    const entry = createMockChronicleEntry('ORACLE.analyze', expectedOutput);
    const result = await replay(entry);
    
    expect(result.match).toBe(true);
    expect(result.diff).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 2: Replay with seed → deterministic
// ═══════════════════════════════════════════════════════════════════════════════

describe('Replay with seed', () => {
  beforeEach(() => {
    clearAdapters();
  });

  it('should produce deterministic results with seed', async () => {
    const expectedOutput = { seeded: true, value: 42 };
    const adapter = createMockAdapter('ORACLE', expectedOutput);
    registerAdapter('omega-oracle-v2-adapter', () => adapter);
    
    const entry = createMockChronicleEntry('ORACLE.analyze', expectedOutput);
    
    const result1 = await replay(entry);
    const result2 = await replay(entry);
    
    expect(result1.replay_output_hash).toBe(result2.replay_output_hash);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 3: Replay mismatch detection
// ═══════════════════════════════════════════════════════════════════════════════

describe('Replay mismatch', () => {
  beforeEach(() => {
    clearAdapters();
  });

  it('should detect mismatch when output differs', async () => {
    const originalOutput = { result: 'original' };
    const newOutput = { result: 'different' };
    
    const adapter = createMockAdapter('ORACLE', newOutput);
    registerAdapter('omega-oracle-v2-adapter', () => adapter);
    
    const entry = createMockChronicleEntry('ORACLE.analyze', originalOutput);
    const result = await replay(entry);
    
    expect(result.match).toBe(false);
    expect(result.diff).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 4: Replay diff generation
// ═══════════════════════════════════════════════════════════════════════════════

describe('Diff generation', () => {
  beforeEach(() => {
    clearAdapters();
  });

  it('should generate readable diff on mismatch', async () => {
    const originalOutput = { result: 'a' };
    const newOutput = { result: 'b' };
    
    const adapter = createMockAdapter('ORACLE', newOutput);
    registerAdapter('omega-oracle-v2-adapter', () => adapter);
    
    const entry = createMockChronicleEntry('ORACLE.analyze', originalOutput);
    const result = await replay(entry);
    
    expect(result.diff).toContain('Hash mismatch');
    expect(result.diff).toContain('Original');
    expect(result.diff).toContain('Replayed');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 5: Replay from chronicle entry
// ═══════════════════════════════════════════════════════════════════════════════

describe('Replay from entry', () => {
  beforeEach(() => {
    clearAdapters();
  });

  it('should reconstruct request from chronicle entry', async () => {
    const expectedOutput = { success: true };
    const adapter = createMockAdapter('ORACLE', expectedOutput);
    registerAdapter('omega-oracle-v2-adapter', () => adapter);
    
    const entry = createMockChronicleEntry('ORACLE.analyze', expectedOutput);
    const result = await replay(entry);
    
    expect(result.original_output_hash).toBe(entry.entry.output_hash);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 6: Replay error handling
// ═══════════════════════════════════════════════════════════════════════════════

describe('Replay error handling', () => {
  beforeEach(() => {
    clearAdapters();
  });

  it('should handle routing failure', async () => {
    // No adapter registered
    const entry = createMockChronicleEntry('ORACLE.analyze', {});
    const result = await replay(entry);
    
    expect(result.match).toBe(false);
    // The diff may vary but mismatch should be detected
    expect(result.diff).toBeDefined();
  });

  it('should handle invalid route', async () => {
    const entry = createMockChronicleEntry('INVALID.action', {});
    const result = await replay(entry);
    
    expect(result.match).toBe(false);
    expect(result.diff).toContain('failed');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 7: Replay result structure
// ═══════════════════════════════════════════════════════════════════════════════

describe('Replay result structure', () => {
  beforeEach(() => {
    clearAdapters();
  });

  it('should include all required fields', async () => {
    const adapter = createMockAdapter('ORACLE', { ok: true });
    registerAdapter('omega-oracle-v2-adapter', () => adapter);
    
    const entry = createMockChronicleEntry('ORACLE.analyze', { ok: true });
    const result = await replay(entry);
    
    expect(result).toHaveProperty('original_output_hash');
    expect(result).toHaveProperty('replay_output_hash');
    expect(result).toHaveProperty('match');
    expect(result).toHaveProperty('replay_duration_ms');
    expect(result.replay_duration_ms).toBeGreaterThanOrEqual(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 8: Replay determinism proof
// ═══════════════════════════════════════════════════════════════════════════════

describe('Replay determinism', () => {
  beforeEach(() => {
    clearAdapters();
  });

  it('should verify determinism across iterations', async () => {
    const adapter = createMockAdapter('ORACLE', { deterministic: true });
    registerAdapter('omega-oracle-v2-adapter', () => adapter);
    
    const entry = createMockChronicleEntry('ORACLE.analyze', { deterministic: true });
    const verification = await verifyReplayDeterminism(entry, 3);
    
    expect(verification.deterministic).toBe(true);
    expect(verification.hashes.length).toBe(3);
    expect(new Set(verification.hashes).size).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST: Batch replay
// ═══════════════════════════════════════════════════════════════════════════════

describe('Batch replay', () => {
  beforeEach(() => {
    clearAdapters();
  });

  it('should replay multiple entries', async () => {
    const adapter = createMockAdapter('ORACLE', { batch: true });
    registerAdapter('omega-oracle-v2-adapter', () => adapter);
    
    const entries = [
      createMockChronicleEntry('ORACLE.analyze', { batch: true }),
      createMockChronicleEntry('ORACLE.analyze', { batch: true }),
    ];
    
    const { results, allMatch } = await replayBatch(entries);
    
    expect(results.length).toBe(2);
    expect(allMatch).toBe(true);
  });

  it('should stop on mismatch if configured', async () => {
    const adapter = createMockAdapter('ORACLE', { different: true });
    registerAdapter('omega-oracle-v2-adapter', () => adapter);
    
    const entries = [
      createMockChronicleEntry('ORACLE.analyze', { first: true }),
      createMockChronicleEntry('ORACLE.analyze', { second: true }),
    ];
    
    const { results, allMatch } = await replayBatch(entries, { stopOnMismatch: true });
    
    expect(allMatch).toBe(false);
    expect(results.length).toBe(1); // Stopped after first mismatch
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST: Replay report
// ═══════════════════════════════════════════════════════════════════════════════

describe('Replay report', () => {
  it('should generate detailed report', () => {
    const entry = createMockChronicleEntry('ORACLE.analyze', { ok: true });
    const replayResult = {
      original_output_hash: 'a'.repeat(64),
      replay_output_hash: 'b'.repeat(64),
      match: false,
      diff: 'Hash mismatch',
      replay_duration_ms: 100,
    };
    
    const report = generateReplayReport(entry, replayResult);
    
    expect(report.entry_id).toBe(VALID_UUID);
    expect(report.route).toBe('ORACLE.analyze');
    expect(report.match).toBe(false);
    expect(report.duration_original_ms).toBe(150);
    expect(report.duration_replay_ms).toBe(100);
  });
});
