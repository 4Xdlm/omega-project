/**
 * OMEGA Memory System - Tiering Tests
 * Phase D4 - NASA-Grade L4
 *
 * Tests for pure tiering functions.
 *
 * INV-D4-01: Toute promotion = fonction pure
 * INV-D4-02: Toute éviction = fonction pure
 * INV-D4-04: Aucune logique probabiliste/ML/adaptative
 */

import { describe, it, expect } from 'vitest';
import {
  classifyTier,
  createTierClassification,
  computePromotion,
  computeEviction,
  getTierIndex,
  compareTiers,
  isHotterThan,
  isColderThan,
  getColderTier,
  getHotterTier,
  classifyBatch,
  groupByTier,
} from '../../src/memory/tiering/policy.js';
import { DEFAULT_TIERING_CONFIG } from '../../src/memory/constants.js';
import { toEntryId, toTimestamp } from '../../src/memory/types.js';
import type { MemoryEntry, TieringConfig } from '../../src/memory/types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

function createTestEntry(options: {
  id?: string;
  ts?: string;
  sealed?: boolean;
}): MemoryEntry {
  return {
    id: toEntryId(options.id ?? 'FAC-20260127-0001-AAA111'),
    ts_utc: toTimestamp(options.ts ?? '2026-01-27T00:00:00Z'),
    author: 'Test',
    class: 'FACT',
    scope: 'TEST',
    payload: { title: 'Test', body: 'Test' },
    meta: {
      schema_version: '1.0',
      sealed: options.sealed ?? false,
    },
  };
}

// Fixed timestamp for deterministic tests
const NOW = new Date('2026-01-27T12:00:00Z').getTime();

// ═══════════════════════════════════════════════════════════════════════════════
// TIER CLASSIFICATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('classifyTier', () => {
  it('returns FROZEN for sealed entries', () => {
    const entry = createTestEntry({ sealed: true });
    expect(classifyTier(entry, NOW)).toBe('FROZEN');
  });

  it('returns HOT for entries within TTL_HOT', () => {
    // Entry created 30 minutes ago (within 1 hour TTL_HOT)
    const ts = new Date(NOW - 30 * 60 * 1000).toISOString();
    const entry = createTestEntry({ ts });
    expect(classifyTier(entry, NOW)).toBe('HOT');
  });

  it('returns WARM for entries within TTL_WARM', () => {
    // Entry created 12 hours ago (within 24 hour TTL_WARM)
    const ts = new Date(NOW - 12 * 60 * 60 * 1000).toISOString();
    const entry = createTestEntry({ ts });
    expect(classifyTier(entry, NOW)).toBe('WARM');
  });

  it('returns COLD for entries within TTL_COLD', () => {
    // Entry created 3 days ago (within 7 day TTL_COLD)
    const ts = new Date(NOW - 3 * 24 * 60 * 60 * 1000).toISOString();
    const entry = createTestEntry({ ts });
    expect(classifyTier(entry, NOW)).toBe('COLD');
  });

  it('returns FROZEN for very old entries', () => {
    // Entry created 30 days ago (beyond TTL_COLD)
    const ts = new Date(NOW - 30 * 24 * 60 * 60 * 1000).toISOString();
    const entry = createTestEntry({ ts });
    expect(classifyTier(entry, NOW)).toBe('FROZEN');
  });

  it('is deterministic - same inputs produce same output', () => {
    const entry = createTestEntry({ ts: '2026-01-27T10:00:00Z' });
    const result1 = classifyTier(entry, NOW);
    const result2 = classifyTier(entry, NOW);
    const result3 = classifyTier(entry, NOW);
    expect(result1).toBe(result2);
    expect(result2).toBe(result3);
  });

  it('respects custom config', () => {
    // Custom config with very short TTLs
    const config: TieringConfig = {
      ttlHotMs: 1000,    // 1 second
      ttlWarmMs: 2000,   // 2 seconds
      ttlColdMs: 3000,   // 3 seconds
    };

    // Entry created 1.5 seconds ago -> should be WARM
    const ts = new Date(NOW - 1500).toISOString();
    const entry = createTestEntry({ ts });
    expect(classifyTier(entry, NOW, config)).toBe('WARM');
  });
});

describe('createTierClassification', () => {
  it('returns complete classification', () => {
    const ts = new Date(NOW - 30 * 60 * 1000).toISOString(); // 30 min ago
    const entry = createTestEntry({ ts, id: 'FAC-20260127-0001-TEST01' });

    const result = createTierClassification(entry, NOW);

    expect(result.entryId).toBe('FAC-20260127-0001-TEST01');
    expect(result.tier).toBe('HOT');
    expect(result.ageMs).toBeCloseTo(30 * 60 * 1000, -2);
    expect(result.classifiedAt).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROMOTION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computePromotion', () => {
  it('promotes unsealed to FROZEN when sealed', () => {
    const entry = createTestEntry({ sealed: true });

    expect(computePromotion(entry, 'HOT')).toBe('FROZEN');
    expect(computePromotion(entry, 'WARM')).toBe('FROZEN');
    expect(computePromotion(entry, 'COLD')).toBe('FROZEN');
  });

  it('does not promote unsealed entries', () => {
    const entry = createTestEntry({ sealed: false });

    expect(computePromotion(entry, 'HOT')).toBe('HOT');
    expect(computePromotion(entry, 'WARM')).toBe('WARM');
    expect(computePromotion(entry, 'COLD')).toBe('COLD');
    expect(computePromotion(entry, 'FROZEN')).toBe('FROZEN');
  });

  it('is a pure function', () => {
    const entry = createTestEntry({ sealed: true });

    const r1 = computePromotion(entry, 'WARM');
    const r2 = computePromotion(entry, 'WARM');
    expect(r1).toBe(r2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EVICTION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeEviction', () => {
  it('never evicts FROZEN', () => {
    const entry = createTestEntry({ ts: '2020-01-01T00:00:00Z' }); // Very old
    expect(computeEviction(entry, 'FROZEN', NOW)).toBe('FROZEN');
  });

  it('evicts sealed to FROZEN', () => {
    const entry = createTestEntry({ sealed: true });
    expect(computeEviction(entry, 'HOT', NOW)).toBe('FROZEN');
    expect(computeEviction(entry, 'WARM', NOW)).toBe('FROZEN');
    expect(computeEviction(entry, 'COLD', NOW)).toBe('FROZEN');
  });

  it('evicts HOT to WARM when past TTL_HOT', () => {
    // Entry created 2 hours ago (past 1 hour TTL_HOT)
    const ts = new Date(NOW - 2 * 60 * 60 * 1000).toISOString();
    const entry = createTestEntry({ ts });
    expect(computeEviction(entry, 'HOT', NOW)).toBe('WARM');
  });

  it('evicts WARM to COLD when past TTL_WARM', () => {
    // Entry created 2 days ago (past 24 hour TTL_WARM)
    const ts = new Date(NOW - 2 * 24 * 60 * 60 * 1000).toISOString();
    const entry = createTestEntry({ ts });
    expect(computeEviction(entry, 'WARM', NOW)).toBe('COLD');
  });

  it('evicts COLD to FROZEN when past TTL_COLD', () => {
    // Entry created 14 days ago (past 7 day TTL_COLD)
    const ts = new Date(NOW - 14 * 24 * 60 * 60 * 1000).toISOString();
    const entry = createTestEntry({ ts });
    expect(computeEviction(entry, 'COLD', NOW)).toBe('FROZEN');
  });

  it('does not evict if within TTL', () => {
    // Entry created 30 minutes ago (within 1 hour TTL_HOT)
    const ts = new Date(NOW - 30 * 60 * 1000).toISOString();
    const entry = createTestEntry({ ts });
    expect(computeEviction(entry, 'HOT', NOW)).toBe('HOT');
  });

  it('is a pure function', () => {
    const ts = new Date(NOW - 2 * 60 * 60 * 1000).toISOString();
    const entry = createTestEntry({ ts });

    const r1 = computeEviction(entry, 'HOT', NOW);
    const r2 = computeEviction(entry, 'HOT', NOW);
    expect(r1).toBe(r2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TIER ORDERING TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Tier ordering', () => {
  it('getTierIndex returns correct indices', () => {
    expect(getTierIndex('HOT')).toBe(0);
    expect(getTierIndex('WARM')).toBe(1);
    expect(getTierIndex('COLD')).toBe(2);
    expect(getTierIndex('FROZEN')).toBe(3);
  });

  it('compareTiers works correctly', () => {
    expect(compareTiers('HOT', 'WARM')).toBeLessThan(0);
    expect(compareTiers('WARM', 'HOT')).toBeGreaterThan(0);
    expect(compareTiers('HOT', 'HOT')).toBe(0);
    expect(compareTiers('HOT', 'FROZEN')).toBeLessThan(0);
  });

  it('isHotterThan works correctly', () => {
    expect(isHotterThan('HOT', 'WARM')).toBe(true);
    expect(isHotterThan('HOT', 'FROZEN')).toBe(true);
    expect(isHotterThan('WARM', 'HOT')).toBe(false);
    expect(isHotterThan('HOT', 'HOT')).toBe(false);
  });

  it('isColderThan works correctly', () => {
    expect(isColderThan('FROZEN', 'HOT')).toBe(true);
    expect(isColderThan('COLD', 'WARM')).toBe(true);
    expect(isColderThan('HOT', 'WARM')).toBe(false);
    expect(isColderThan('WARM', 'WARM')).toBe(false);
  });

  it('getColderTier returns next colder', () => {
    expect(getColderTier('HOT')).toBe('WARM');
    expect(getColderTier('WARM')).toBe('COLD');
    expect(getColderTier('COLD')).toBe('FROZEN');
    expect(getColderTier('FROZEN')).toBe('FROZEN');
  });

  it('getHotterTier returns next hotter', () => {
    expect(getHotterTier('FROZEN')).toBe('COLD');
    expect(getHotterTier('COLD')).toBe('WARM');
    expect(getHotterTier('WARM')).toBe('HOT');
    expect(getHotterTier('HOT')).toBe('HOT');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH OPERATIONS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Batch operations', () => {
  it('classifyBatch classifies all entries', () => {
    const entries = [
      createTestEntry({ id: 'FAC-20260127-0001-AAA001', ts: new Date(NOW - 30 * 60 * 1000).toISOString() }),
      createTestEntry({ id: 'FAC-20260127-0002-AAA002', ts: new Date(NOW - 12 * 60 * 60 * 1000).toISOString() }),
      createTestEntry({ id: 'FAC-20260127-0003-AAA003', sealed: true }),
    ];

    const results = classifyBatch(entries, NOW);

    expect(results.length).toBe(3);
    expect(results[0].tier).toBe('HOT');
    expect(results[1].tier).toBe('WARM');
    expect(results[2].tier).toBe('FROZEN');
  });

  it('groupByTier groups correctly', () => {
    const entries = [
      createTestEntry({ id: 'FAC-20260127-0001-AAA001', ts: new Date(NOW - 30 * 60 * 1000).toISOString() }),
      createTestEntry({ id: 'FAC-20260127-0002-AAA002', ts: new Date(NOW - 12 * 60 * 60 * 1000).toISOString() }),
      createTestEntry({ id: 'FAC-20260127-0003-AAA003', sealed: true }),
    ];

    const groups = groupByTier(entries, NOW);

    expect(groups.get('HOT')?.length).toBe(1);
    expect(groups.get('WARM')?.length).toBe(1);
    expect(groups.get('COLD')?.length).toBe(0);
    expect(groups.get('FROZEN')?.length).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('D4 Invariants', () => {
  it('INV-D4-01: Promotion is a pure function', () => {
    const entry = createTestEntry({ sealed: true });

    // Same inputs always produce same output
    for (let i = 0; i < 10; i++) {
      expect(computePromotion(entry, 'WARM')).toBe('FROZEN');
    }
  });

  it('INV-D4-02: Eviction is a pure function', () => {
    const ts = new Date(NOW - 2 * 60 * 60 * 1000).toISOString();
    const entry = createTestEntry({ ts });

    // Same inputs always produce same output
    for (let i = 0; i < 10; i++) {
      expect(computeEviction(entry, 'HOT', NOW)).toBe('WARM');
    }
  });

  it('INV-D4-04: No probabilistic logic (determinism test)', () => {
    const entries = [
      createTestEntry({ id: 'FAC-20260127-0001-DET001', ts: new Date(NOW - 30 * 60 * 1000).toISOString() }),
      createTestEntry({ id: 'FAC-20260127-0002-DET002', ts: new Date(NOW - 2 * 60 * 60 * 1000).toISOString() }),
    ];

    // Run 100 times, all results must be identical
    const expected = classifyBatch(entries, NOW);

    for (let i = 0; i < 100; i++) {
      const result = classifyBatch(entries, NOW);
      expect(result[0].tier).toBe(expected[0].tier);
      expect(result[1].tier).toBe(expected[1].tier);
    }
  });

  it('INV-D4-05: TTL values are symbols (configurable)', () => {
    const customConfig: TieringConfig = {
      ttlHotMs: 1000,
      ttlWarmMs: 2000,
      ttlColdMs: 3000,
    };

    const ts = new Date(NOW - 1500).toISOString();
    const entry = createTestEntry({ ts });

    // With default config -> HOT (1500ms < 1 hour)
    expect(classifyTier(entry, NOW, DEFAULT_TIERING_CONFIG)).toBe('HOT');

    // With custom config -> WARM (1500ms > 1000ms TTL_HOT)
    expect(classifyTier(entry, NOW, customConfig)).toBe('WARM');
  });
});
