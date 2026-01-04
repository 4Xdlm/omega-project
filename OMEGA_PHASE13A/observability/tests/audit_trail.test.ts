/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 13A — Audit Trail Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Test coverage for:
 * - INV-ATR-01: Append-only (no modify/delete)
 * - INV-ATR-02: Hash chain (prev_hash + hash)
 * - INV-ATR-03: Deterministic serialization
 * - INV-ATR-04: Export forensic (JSONL + root_hash)
 * 
 * Total: 23 tests
 * 
 * @module audit_trail.test
 * @version 3.13.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  AuditTrail,
  AuditEvent,
  AuditEventInput,
  GENESIS_HASH,
  sortObjectKeys,
  canonicalJSON,
  computeEventHash,
  validateEventInput,
  getDefaultAuditTrail,
  resetDefaultAuditTrail
} from '../audit_trail.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

const VALID_EVENT: AuditEventInput = {
  type: 'CREATE',
  actor_role: 'USER',
  actor_id: 'user123',
  action: 'create_document',
  resource: 'doc/123',
  data: { title: 'Test Document' }
};

const FIXED_DATE = new Date('2026-01-04T12:00:00.000Z');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: Deterministic Serialization - INV-ATR-03 (4 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-ATR-03: Deterministic Serialization', () => {
  it('should sort object keys alphabetically', () => {
    const unsorted = { z: 1, a: 2, m: 3 };
    const sorted = sortObjectKeys(unsorted) as Record<string, number>;
    const keys = Object.keys(sorted);
    expect(keys).toEqual(['a', 'm', 'z']);
  });
  
  it('should sort nested objects recursively', () => {
    const nested = { 
      outer: { z: 1, a: 2 },
      beta: { y: 3, b: 4 }
    };
    const sorted = sortObjectKeys(nested);
    const json = JSON.stringify(sorted);
    expect(json).toBe('{"beta":{"b":4,"y":3},"outer":{"a":2,"z":1}}');
  });
  
  it('should produce identical JSON for same payload', () => {
    const obj1 = { b: 2, a: 1, c: { z: 26, a: 1 } };
    const obj2 = { c: { a: 1, z: 26 }, a: 1, b: 2 };
    
    const json1 = canonicalJSON(obj1);
    const json2 = canonicalJSON(obj2);
    
    expect(json1).toBe(json2);
  });
  
  it('should produce deterministic hash for same payload', () => {
    const payload1 = {
      seq: 0,
      utc: '2026-01-04T12:00:00.000Z',
      type: 'CREATE' as const,
      actor_role: 'USER' as const,
      actor_id: 'user1',
      action: 'test',
      resource: '',
      data: { key: 'value' },
      prev_hash: GENESIS_HASH
    };
    
    const payload2 = { ...payload1 };
    
    const hash1 = computeEventHash(payload1);
    const hash2 = computeEventHash(payload2);
    
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: Append Operations - INV-ATR-01 (5 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-ATR-01: Append-Only', () => {
  let trail: AuditTrail;
  
  beforeEach(() => {
    trail = new AuditTrail();
  });
  
  it('should increment seq on each append', () => {
    const e1 = trail.append(VALID_EVENT, FIXED_DATE);
    const e2 = trail.append(VALID_EVENT, FIXED_DATE);
    const e3 = trail.append(VALID_EVENT, FIXED_DATE);
    
    expect(e1.seq).toBe(0);
    expect(e2.seq).toBe(1);
    expect(e3.seq).toBe(2);
  });
  
  it('should start with seq 0', () => {
    expect(trail.getNextSeq()).toBe(0);
    const event = trail.append(VALID_EVENT, FIXED_DATE);
    expect(event.seq).toBe(0);
    expect(trail.getNextSeq()).toBe(1);
  });
  
  it('should reject append on frozen trail', () => {
    trail.append(VALID_EVENT, FIXED_DATE);
    trail.freeze();
    
    expect(trail.isFrozen()).toBe(true);
    expect(() => trail.append(VALID_EVENT)).toThrow('Cannot append to frozen audit trail');
  });
  
  it('should return read-only copies of events', () => {
    trail.append(VALID_EVENT, FIXED_DATE);
    
    const event = trail.getEvent(0);
    const allEvents = trail.getAllEvents();
    
    // These are copies, not references
    expect(event).toBeDefined();
    expect(allEvents).toHaveLength(1);
    
    // Modifying copy should not affect trail
    if (event) {
      (event as { seq: number }).seq = 999;
    }
    expect(trail.getEvent(0)?.seq).toBe(0);
  });
  
  it('should reject events with missing required fields', () => {
    const invalid = { type: 'CREATE' } as AuditEventInput;
    expect(() => trail.append(invalid)).toThrow('Missing required field');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: Hash Chain - INV-ATR-02 (6 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-ATR-02: Hash Chain', () => {
  let trail: AuditTrail;
  
  beforeEach(() => {
    trail = new AuditTrail();
  });
  
  it('should have genesis hash for first event prev_hash', () => {
    const event = trail.append(VALID_EVENT, FIXED_DATE);
    expect(event.prev_hash).toBe(GENESIS_HASH);
  });
  
  it('should link each event to previous via prev_hash', () => {
    const e1 = trail.append(VALID_EVENT, FIXED_DATE);
    const e2 = trail.append(VALID_EVENT, FIXED_DATE);
    const e3 = trail.append(VALID_EVENT, FIXED_DATE);
    
    expect(e2.prev_hash).toBe(e1.hash);
    expect(e3.prev_hash).toBe(e2.hash);
  });
  
  it('should verify valid chain', () => {
    trail.append(VALID_EVENT, FIXED_DATE);
    trail.append(VALID_EVENT, FIXED_DATE);
    trail.append(VALID_EVENT, FIXED_DATE);
    
    const result = trail.verify();
    expect(result.valid).toBe(true);
  });
  
  it('should detect tampered event hash', () => {
    trail.append(VALID_EVENT, FIXED_DATE);
    trail.append(VALID_EVENT, FIXED_DATE);
    
    // Tamper with internal state (simulating attack)
    const events = trail.getAllEvents();
    events[0].hash = 'tampered'.padEnd(64, '0');
    
    // Verify the external chain
    const result = AuditTrail.verifyChain(events);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Hash mismatch');
  });
  
  it('should detect removed event in chain', () => {
    trail.append(VALID_EVENT, FIXED_DATE);
    trail.append(VALID_EVENT, FIXED_DATE);
    trail.append(VALID_EVENT, FIXED_DATE);
    
    // Remove middle event
    const events = trail.getAllEvents();
    events.splice(1, 1);
    
    // Fix sequence to hide removal (attacker tries to cover tracks)
    events[1].seq = 1;
    
    const result = AuditTrail.verifyChain(events);
    expect(result.valid).toBe(false);
  });
  
  it('should verify empty chain as valid', () => {
    const result = trail.verify();
    expect(result.valid).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: Export/Import JSONL - INV-ATR-04 (5 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-ATR-04: Export Forensic', () => {
  let trail: AuditTrail;
  
  beforeEach(() => {
    trail = new AuditTrail();
  });
  
  it('should export to JSONL format', () => {
    trail.append(VALID_EVENT, FIXED_DATE);
    trail.append(VALID_EVENT, FIXED_DATE);
    
    const result = trail.exportJSONL();
    
    expect(result.event_count).toBe(2);
    expect(result.first_seq).toBe(0);
    expect(result.last_seq).toBe(1);
    
    const lines = result.jsonl.split('\n');
    expect(lines).toHaveLength(2);
    
    // Each line should be valid JSON
    const parsed = lines.map(l => JSON.parse(l));
    expect(parsed[0].seq).toBe(0);
    expect(parsed[1].seq).toBe(1);
  });
  
  it('should produce stable JSONL on double run', () => {
    // First run
    const trail1 = new AuditTrail();
    trail1.append({ ...VALID_EVENT }, FIXED_DATE);
    trail1.append({ ...VALID_EVENT }, FIXED_DATE);
    const export1 = trail1.exportJSONL();
    
    // Second run - identical inputs
    const trail2 = new AuditTrail();
    trail2.append({ ...VALID_EVENT }, FIXED_DATE);
    trail2.append({ ...VALID_EVENT }, FIXED_DATE);
    const export2 = trail2.exportJSONL();
    
    expect(export1.jsonl).toBe(export2.jsonl);
    expect(export1.root_hash).toBe(export2.root_hash);
  });
  
  it('should have root_hash equal to last event hash', () => {
    trail.append(VALID_EVENT, FIXED_DATE);
    const last = trail.append(VALID_EVENT, FIXED_DATE);
    
    const result = trail.exportJSONL();
    expect(result.root_hash).toBe(last.hash);
  });
  
  it('should import valid JSONL', () => {
    trail.append(VALID_EVENT, FIXED_DATE);
    trail.append(VALID_EVENT, FIXED_DATE);
    
    const exported = trail.exportJSONL();
    const { trail: imported, result } = AuditTrail.importJSONL(exported.jsonl);
    
    expect(result.valid).toBe(true);
    expect(imported.getEventCount()).toBe(2);
    expect(imported.getRootHash()).toBe(exported.root_hash);
  });
  
  it('should reject invalid JSONL on import', () => {
    const invalidJsonl = '{"seq":0}\n{invalid json}';
    const { result } = AuditTrail.importJSONL(invalidJsonl);
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid JSON');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: Input Validation (3 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Input Validation', () => {
  it('should validate correct event input', () => {
    const result = validateEventInput(VALID_EVENT);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
  
  it('should reject invalid event type', () => {
    const invalid = { ...VALID_EVENT, type: 'INVALID_TYPE' };
    const result = validateEventInput(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Invalid type'))).toBe(true);
  });
  
  it('should reject invalid actor_role', () => {
    const invalid = { ...VALID_EVENT, actor_role: 'HACKER' };
    const result = validateEventInput(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Invalid actor_role'))).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: Singleton (2 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Singleton', () => {
  afterEach(() => {
    resetDefaultAuditTrail();
  });
  
  it('should return same instance on multiple calls', () => {
    const trail1 = getDefaultAuditTrail();
    const trail2 = getDefaultAuditTrail();
    expect(trail1).toBe(trail2);
  });
  
  it('should create new instance after reset', () => {
    const trail1 = getDefaultAuditTrail();
    resetDefaultAuditTrail();
    const trail2 = getDefaultAuditTrail();
    expect(trail1).not.toBe(trail2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: Performance (1 test)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Performance', () => {
  it('should verify 10k events under 500ms', () => {
    const trail = new AuditTrail();
    
    // Append 10k events
    for (let i = 0; i < 10000; i++) {
      trail.append({
        type: 'CREATE',
        actor_role: 'SYSTEM',
        action: `action_${i}`
      });
    }
    
    // Time verification
    const start = performance.now();
    const result = trail.verify();
    const duration = performance.now() - start;
    
    expect(result.valid).toBe(true);
    expect(duration).toBeLessThan(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8: Edge Cases (2 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Edge Cases', () => {
  it('should handle empty data object', () => {
    const trail = new AuditTrail();
    const event = trail.append({
      type: 'READ',
      actor_role: 'API',
      action: 'fetch'
    }, FIXED_DATE);
    
    expect(event.data).toEqual({});
    expect(event.resource).toBe('');
    expect(event.actor_id).toBe('');
  });
  
  it('should export empty trail correctly', () => {
    const trail = new AuditTrail();
    const result = trail.exportJSONL();
    
    expect(result.jsonl).toBe('');
    expect(result.root_hash).toBe(GENESIS_HASH);
    expect(result.event_count).toBe(0);
  });
});
