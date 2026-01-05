/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NEXUS DEP — CHRONICLE TESTS
 * Test suite for hash chain journal
 * Sprint 15.0 — NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  Chronicle,
  getGlobalChronicle,
  resetGlobalChronicle,
} from '../chronicle';
import {
  AuditEntry,
  ChronicleEntry,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_UUID_2 = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';

const createMockEntry = (requestId: string = VALID_UUID, success: boolean = true): AuditEntry => ({
  input_hash: 'a'.repeat(64),
  output_hash: 'b'.repeat(64),
  route: 'ORACLE.analyze',
  duration_ms: 150,
  timestamp: new Date().toISOString(),
  module_version: '3.14.0',
  request_id: requestId,
  response_id: VALID_UUID_2,
  session_id: VALID_UUID,
  caller_id: 'UI',
  success,
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 1: Append single entry
// ═══════════════════════════════════════════════════════════════════════════════

describe('Chronicle append', () => {
  let chronicle: Chronicle;
  
  beforeEach(() => {
    chronicle = new Chronicle();
  });

  it('should append single entry', () => {
    const entry = createMockEntry();
    const result = chronicle.append(entry);
    
    expect(result.index).toBe(0);
    expect(result.prev_hash).toBe('');
    expect(result.entry_hash).toHaveLength(64);
    expect(chronicle.length).toBe(1);
  });

  it('should append multiple entries', () => {
    chronicle.append(createMockEntry('id-1'));
    chronicle.append(createMockEntry('id-2'));
    chronicle.append(createMockEntry('id-3'));
    
    expect(chronicle.length).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 2: Hash chain integrity
// ═══════════════════════════════════════════════════════════════════════════════

describe('Hash chain integrity', () => {
  let chronicle: Chronicle;
  
  beforeEach(() => {
    chronicle = new Chronicle();
  });

  it('should maintain hash chain', () => {
    const entry1 = chronicle.append(createMockEntry('id-1'));
    const entry2 = chronicle.append(createMockEntry('id-2'));
    const entry3 = chronicle.append(createMockEntry('id-3'));
    
    expect(entry2.prev_hash).toBe(entry1.entry_hash);
    expect(entry3.prev_hash).toBe(entry2.entry_hash);
  });

  it('should verify valid chain', () => {
    chronicle.append(createMockEntry('id-1'));
    chronicle.append(createMockEntry('id-2'));
    chronicle.append(createMockEntry('id-3'));
    
    const result = chronicle.verify();
    expect(result.valid).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 3: Chain verification success
// ═══════════════════════════════════════════════════════════════════════════════

describe('Chain verification', () => {
  it('should verify empty chronicle', () => {
    const chronicle = new Chronicle();
    expect(chronicle.verify().valid).toBe(true);
  });

  it('should verify single entry', () => {
    const chronicle = new Chronicle();
    chronicle.append(createMockEntry());
    expect(chronicle.verify().valid).toBe(true);
  });

  it('should verify large chain', () => {
    const chronicle = new Chronicle();
    for (let i = 0; i < 100; i++) {
      chronicle.append(createMockEntry(`id-${i}`));
    }
    expect(chronicle.verify().valid).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 4: Chain verification failure (tampered)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Tamper detection', () => {
  it('should detect tampered entry', () => {
    const chronicle = new Chronicle();
    chronicle.append(createMockEntry('id-1'));
    chronicle.append(createMockEntry('id-2'));
    
    // Try to tamper (this should fail due to freeze)
    const chain = chronicle.getChain();
    expect(() => {
      (chain[0] as any).entry_hash = 'tampered';
    }).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 5: Get entry by ID
// ═══════════════════════════════════════════════════════════════════════════════

describe('Get entry', () => {
  let chronicle: Chronicle;
  
  beforeEach(() => {
    chronicle = new Chronicle();
    chronicle.append(createMockEntry('id-1'));
    chronicle.append(createMockEntry('id-2'));
    chronicle.append(createMockEntry('id-3'));
  });

  it('should get entry by request ID', () => {
    const entry = chronicle.getEntry('id-2');
    expect(entry).not.toBeNull();
    expect(entry?.entry.request_id).toBe('id-2');
  });

  it('should return null for unknown ID', () => {
    const entry = chronicle.getEntry('unknown');
    expect(entry).toBeNull();
  });

  it('should get entry by index', () => {
    const entry = chronicle.getEntryByIndex(1);
    expect(entry?.index).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 6: Get full chain
// ═══════════════════════════════════════════════════════════════════════════════

describe('Get chain', () => {
  it('should return full chain', () => {
    const chronicle = new Chronicle();
    chronicle.append(createMockEntry('id-1'));
    chronicle.append(createMockEntry('id-2'));
    
    const chain = chronicle.getChain();
    expect(chain.length).toBe(2);
    expect(chain[0].index).toBe(0);
    expect(chain[1].index).toBe(1);
  });

  it('should return immutable chain', () => {
    const chronicle = new Chronicle();
    chronicle.append(createMockEntry());
    
    const chain = chronicle.getChain();
    // Chain entries are frozen
    expect(Object.isFrozen(chain[0])).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 7: Export JSONL format
// ═══════════════════════════════════════════════════════════════════════════════

describe('Export', () => {
  it('should export as JSONL', () => {
    const chronicle = new Chronicle();
    chronicle.append(createMockEntry('id-1'));
    chronicle.append(createMockEntry('id-2'));
    
    const jsonl = chronicle.export();
    const lines = jsonl.split('\n');
    
    expect(lines.length).toBe(2);
    expect(JSON.parse(lines[0]).index).toBe(0);
    expect(JSON.parse(lines[1]).index).toBe(1);
  });

  it('should export as JSON array', () => {
    const chronicle = new Chronicle();
    chronicle.append(createMockEntry());
    
    const json = chronicle.exportJSON();
    const parsed = JSON.parse(json);
    
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 8: Chronicle immutability
// ═══════════════════════════════════════════════════════════════════════════════

describe('Immutability', () => {
  it('should freeze entries', () => {
    const chronicle = new Chronicle();
    const entry = chronicle.append(createMockEntry());
    
    expect(Object.isFrozen(entry)).toBe(true);
    expect(Object.isFrozen(entry.entry)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 9: Empty chronicle
// ═══════════════════════════════════════════════════════════════════════════════

describe('Empty chronicle', () => {
  it('should handle empty chronicle', () => {
    const chronicle = new Chronicle();
    
    expect(chronicle.isEmpty).toBe(true);
    expect(chronicle.length).toBe(0);
    expect(chronicle.getLastEntry()).toBeNull();
    expect(chronicle.verify().valid).toBe(true);
    expect(chronicle.export()).toBe('');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 10: Large chronicle
// ═══════════════════════════════════════════════════════════════════════════════

describe('Large chronicle', () => {
  it('should handle 1000+ entries', () => {
    const chronicle = new Chronicle({ maxEntries: 2000 });
    
    for (let i = 0; i < 1000; i++) {
      chronicle.append(createMockEntry(`id-${i}`));
    }
    
    expect(chronicle.length).toBe(1000);
    expect(chronicle.verify().valid).toBe(true);
  });

  it('should enforce max entries', () => {
    const chronicle = new Chronicle({ maxEntries: 5 });
    
    for (let i = 0; i < 5; i++) {
      chronicle.append(createMockEntry(`id-${i}`));
    }
    
    expect(() => {
      chronicle.append(createMockEntry('id-6'));
    }).toThrow(/maximum capacity/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 11: Deterministic hashes
// ═══════════════════════════════════════════════════════════════════════════════

describe('Deterministic hashes', () => {
  it('should produce same hash for same entry', () => {
    const chronicle1 = new Chronicle();
    const chronicle2 = new Chronicle();
    
    const entry = createMockEntry();
    
    const result1 = chronicle1.append(entry);
    const result2 = chronicle2.append(entry);
    
    expect(result1.entry_hash).toBe(result2.entry_hash);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 12: Import from JSONL
// ═══════════════════════════════════════════════════════════════════════════════

describe('Import', () => {
  it('should import from JSONL', () => {
    const chronicle = new Chronicle();
    chronicle.append(createMockEntry('id-1'));
    chronicle.append(createMockEntry('id-2'));
    
    const exported = chronicle.export();
    const imported = Chronicle.fromJSONL(exported);
    
    expect(imported.length).toBe(2);
    expect(imported.verify().valid).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST: Statistics
// ═══════════════════════════════════════════════════════════════════════════════

describe('Statistics', () => {
  it('should calculate success rate', () => {
    const chronicle = new Chronicle();
    chronicle.append(createMockEntry('id-1', true));
    chronicle.append(createMockEntry('id-2', true));
    chronicle.append(createMockEntry('id-3', false));
    
    expect(chronicle.getSuccessRate()).toBeCloseTo(2/3);
  });

  it('should calculate average duration', () => {
    const chronicle = new Chronicle();
    chronicle.append({ ...createMockEntry('id-1'), duration_ms: 100 });
    chronicle.append({ ...createMockEntry('id-2'), duration_ms: 200 });
    chronicle.append({ ...createMockEntry('id-3'), duration_ms: 300 });
    
    expect(chronicle.getAverageDuration()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST: Global chronicle
// ═══════════════════════════════════════════════════════════════════════════════

describe('Global chronicle', () => {
  beforeEach(() => {
    resetGlobalChronicle();
  });

  it('should return singleton instance', () => {
    const c1 = getGlobalChronicle();
    const c2 = getGlobalChronicle();
    
    expect(c1).toBe(c2);
  });

  it('should reset global chronicle', () => {
    const c1 = getGlobalChronicle();
    c1.append(createMockEntry());
    
    resetGlobalChronicle();
    
    const c2 = getGlobalChronicle();
    expect(c2.isEmpty).toBe(true);
  });
});
