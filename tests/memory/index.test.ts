/**
 * OMEGA Memory System - Index Tests
 * Phase D3 - NASA-Grade L4
 *
 * Tests for index building, verification, and rebuild.
 *
 * INV-D3-01: Index rebuildable à 100%
 * INV-D3-02: hash_before_rebuild == hash_after_rebuild
 * INV-D3-03: Bijection index ↔ ledger vérifiable
 * INV-D3-04: Hash calculé sur flux byte exact sans normalisation
 * INV-D3-05: Offset map couvre 100% des entrées
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { join } from 'path';
import { existsSync, rmSync, mkdirSync } from 'fs';
import {
  OffsetMapBuilder,
  serializeOffsetMap,
  deserializeOffsetMap,
  getOffset,
  hasEntry,
  getAllEntryIds,
  getEntryCount,
} from '../../src/memory/index/offset-map.js';
import {
  buildIndex,
  verifyIndexFreshness,
  verifyIndexBijection,
  testRebuildDeterminism,
} from '../../src/memory/index/index-builder.js';
import {
  saveIndex,
  loadIndex,
  indexExists,
  loadIndexMeta,
} from '../../src/memory/index/index-persistence.js';
import { computeLedgerHash } from '../../src/memory/ledger/reader.js';
import { isOk, isErr, toEntryId, toByteOffset } from '../../src/memory/types.js';

const LEDGER_PATH = join(process.cwd(), 'docs', 'memory', 'ledgers', 'LEDGER_MEMORY_EVENTS.ndjson');
const TEST_INDEX_DIR = join(process.cwd(), '.test_index_tmp');

// ═══════════════════════════════════════════════════════════════════════════════
// OFFSET MAP TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('OffsetMap', () => {
  describe('OffsetMapBuilder', () => {
    it('builds empty map', () => {
      const builder = new OffsetMapBuilder();
      const map = builder.build();
      expect(map.size).toBe(0);
    });

    it('adds entries correctly', () => {
      const builder = new OffsetMapBuilder();
      const id1 = toEntryId('FAC-20260127-0001-AAA111');
      const id2 = toEntryId('FAC-20260127-0002-BBB222');

      builder.add(id1, toByteOffset(0));
      builder.add(id2, toByteOffset(100));

      const map = builder.build();
      expect(map.size).toBe(2);
      expect(map.get(id1)).toBe(0);
      expect(map.get(id2)).toBe(100);
    });

    it('throws on duplicate ID', () => {
      const builder = new OffsetMapBuilder();
      const id = toEntryId('FAC-20260127-0001-AAA111');

      builder.add(id, toByteOffset(0));
      expect(() => builder.add(id, toByteOffset(100))).toThrow('Duplicate entry ID');
    });

    it('tracks size correctly', () => {
      const builder = new OffsetMapBuilder();
      expect(builder.size).toBe(0);

      builder.add(toEntryId('FAC-20260127-0001-AAA111'), toByteOffset(0));
      expect(builder.size).toBe(1);
    });
  });

  describe('OffsetMap operations', () => {
    it('getOffset returns correct value', () => {
      const builder = new OffsetMapBuilder();
      const id = toEntryId('FAC-20260127-0001-AAA111');
      builder.add(id, toByteOffset(42));
      const map = builder.build();

      expect(getOffset(map, id)).toBe(42);
    });

    it('getOffset returns undefined for missing ID', () => {
      const builder = new OffsetMapBuilder();
      const map = builder.build();
      const id = toEntryId('FAC-99999999-9999-ZZZZZZ');

      expect(getOffset(map, id)).toBeUndefined();
    });

    it('hasEntry returns correct boolean', () => {
      const builder = new OffsetMapBuilder();
      const id1 = toEntryId('FAC-20260127-0001-AAA111');
      const id2 = toEntryId('FAC-99999999-9999-ZZZZZZ');
      builder.add(id1, toByteOffset(0));
      const map = builder.build();

      expect(hasEntry(map, id1)).toBe(true);
      expect(hasEntry(map, id2)).toBe(false);
    });

    it('getAllEntryIds returns all IDs', () => {
      const builder = new OffsetMapBuilder();
      const id1 = toEntryId('FAC-20260127-0001-AAA111');
      const id2 = toEntryId('FAC-20260127-0002-BBB222');
      builder.add(id1, toByteOffset(0));
      builder.add(id2, toByteOffset(100));
      const map = builder.build();

      const ids = getAllEntryIds(map);
      expect(ids.length).toBe(2);
      expect(ids).toContain(id1);
      expect(ids).toContain(id2);
    });

    it('getEntryCount returns correct count', () => {
      const builder = new OffsetMapBuilder();
      builder.add(toEntryId('FAC-20260127-0001-AAA111'), toByteOffset(0));
      builder.add(toEntryId('FAC-20260127-0002-BBB222'), toByteOffset(100));
      const map = builder.build();

      expect(getEntryCount(map)).toBe(2);
    });
  });

  describe('Serialization', () => {
    it('serializes and deserializes correctly', () => {
      const builder = new OffsetMapBuilder();
      const id1 = toEntryId('FAC-20260127-0001-AAA111');
      const id2 = toEntryId('FAC-20260127-0002-BBB222');
      builder.add(id1, toByteOffset(0));
      builder.add(id2, toByteOffset(100));
      const map = builder.build();

      const serialized = serializeOffsetMap(map);
      const deserialized = deserializeOffsetMap(serialized);

      expect(deserialized.size).toBe(map.size);
      expect(deserialized.get(id1)).toBe(map.get(id1));
      expect(deserialized.get(id2)).toBe(map.get(id2));
    });

    it('serialization is deterministic (sorted keys)', () => {
      const builder1 = new OffsetMapBuilder();
      builder1.add(toEntryId('ZZZ-20260127-0001-AAA111'), toByteOffset(100));
      builder1.add(toEntryId('AAA-20260127-0001-AAA111'), toByteOffset(0));

      const builder2 = new OffsetMapBuilder();
      builder2.add(toEntryId('AAA-20260127-0001-AAA111'), toByteOffset(0));
      builder2.add(toEntryId('ZZZ-20260127-0001-AAA111'), toByteOffset(100));

      const ser1 = JSON.stringify(serializeOffsetMap(builder1.build()));
      const ser2 = JSON.stringify(serializeOffsetMap(builder2.build()));

      expect(ser1).toBe(ser2);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INDEX BUILDER TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('IndexBuilder', () => {
  describe('buildIndex', () => {
    it('builds index from ledger', async () => {
      const result = await buildIndex(LEDGER_PATH);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const index = result.value;
        expect(index.entryCount).toBe(3);
        expect(index.byId.size).toBe(3);
        expect(index.ledgerSha256.length).toBe(64);
      }
    });

    it('includes all entries in byId', async () => {
      const result = await buildIndex(LEDGER_PATH);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const index = result.value;
        expect(index.byId.has(toEntryId('FAC-20260127-0001-AAA111'))).toBe(true);
        expect(index.byId.has(toEntryId('FAC-20260127-0002-BBB222'))).toBe(true);
        expect(index.byId.has(toEntryId('FAC-20260127-0003-CCC333'))).toBe(true);
      }
    });

    it('builds class index correctly', async () => {
      const result = await buildIndex(LEDGER_PATH);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const index = result.value;
        const factIds = index.byClass.get('FACT');
        expect(factIds).toBeDefined();
        expect(factIds?.length).toBe(3);
      }
    });

    it('builds tag index correctly', async () => {
      const result = await buildIndex(LEDGER_PATH);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const index = result.value;
        const sealedIds = index.byTag.get('sealed');
        expect(sealedIds).toBeDefined();
        expect(sealedIds?.length).toBe(3);
      }
    });

    it('records correct ledger hash', async () => {
      const expectedHash = computeLedgerHash(LEDGER_PATH);
      const result = await buildIndex(LEDGER_PATH);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.ledgerSha256).toBe(expectedHash);
      }
    });
  });

  describe('verifyIndexFreshness', () => {
    it('returns true for fresh index', async () => {
      const result = await buildIndex(LEDGER_PATH);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(verifyIndexFreshness(result.value, LEDGER_PATH)).toBe(true);
      }
    });
  });

  describe('verifyIndexBijection', () => {
    it('returns true for valid bijection', async () => {
      const indexResult = await buildIndex(LEDGER_PATH);
      expect(isOk(indexResult)).toBe(true);

      if (isOk(indexResult)) {
        const result = await verifyIndexBijection(indexResult.value, LEDGER_PATH);
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value).toBe(true);
        }
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// REBUILD DETERMINISM TESTS (CRITICAL INVARIANTS)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Rebuild Determinism (INV-D3-01, INV-D3-02)', () => {
  it('testRebuildDeterminism passes', async () => {
    const result = await testRebuildDeterminism(LEDGER_PATH);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBe(true);
    }
  });

  it('hash_before_rebuild == hash_after_rebuild', async () => {
    const hashBefore = computeLedgerHash(LEDGER_PATH);
    await buildIndex(LEDGER_PATH);
    const hashAfter = computeLedgerHash(LEDGER_PATH);

    expect(hashBefore).toBe(hashAfter);
  });

  it('multiple rebuilds produce identical index', async () => {
    const result1 = await buildIndex(LEDGER_PATH);
    const result2 = await buildIndex(LEDGER_PATH);
    const result3 = await buildIndex(LEDGER_PATH);

    expect(isOk(result1) && isOk(result2) && isOk(result3)).toBe(true);

    if (isOk(result1) && isOk(result2) && isOk(result3)) {
      expect(result1.value.entryCount).toBe(result2.value.entryCount);
      expect(result2.value.entryCount).toBe(result3.value.entryCount);

      expect(result1.value.ledgerSha256).toBe(result2.value.ledgerSha256);
      expect(result2.value.ledgerSha256).toBe(result3.value.ledgerSha256);
    }
  });

  it('index.size == ledger.count (INV-D3-05)', async () => {
    const result = await buildIndex(LEDGER_PATH);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      // Ledger has 3 entries
      expect(result.value.entryCount).toBe(3);
      expect(result.value.byId.size).toBe(3);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INDEX PERSISTENCE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('IndexPersistence', () => {
  beforeAll(() => {
    if (existsSync(TEST_INDEX_DIR)) {
      rmSync(TEST_INDEX_DIR, { recursive: true });
    }
    mkdirSync(TEST_INDEX_DIR, { recursive: true });
  });

  afterAll(() => {
    if (existsSync(TEST_INDEX_DIR)) {
      rmSync(TEST_INDEX_DIR, { recursive: true });
    }
  });

  it('saves and loads index correctly', async () => {
    const buildResult = await buildIndex(LEDGER_PATH);
    expect(isOk(buildResult)).toBe(true);

    if (isOk(buildResult)) {
      const index = buildResult.value;

      // Save
      const saveResult = saveIndex(index, TEST_INDEX_DIR);
      expect(isOk(saveResult)).toBe(true);

      // Load
      const loadResult = loadIndex(TEST_INDEX_DIR);
      expect(isOk(loadResult)).toBe(true);

      if (isOk(loadResult)) {
        const loaded = loadResult.value;
        expect(loaded.entryCount).toBe(index.entryCount);
        expect(loaded.ledgerSha256).toBe(index.ledgerSha256);
        expect(loaded.byId.size).toBe(index.byId.size);
      }
    }
  });

  it('indexExists returns correct value', async () => {
    expect(indexExists(TEST_INDEX_DIR)).toBe(true);
    expect(indexExists('/nonexistent/path')).toBe(false);
  });

  it('loadIndexMeta returns metadata', async () => {
    const result = loadIndexMeta(TEST_INDEX_DIR);
    expect(isOk(result)).toBe(true);

    if (isOk(result)) {
      expect(result.value.entryCount).toBe(3);
      expect(result.value.ledgerSha256.length).toBe(64);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

describe('D3 Invariants Summary', () => {
  it('INV-D3-01: Index 100% rebuildable', async () => {
    const result = await testRebuildDeterminism(LEDGER_PATH);
    expect(isOk(result)).toBe(true);
  });

  it('INV-D3-02: hash_before_rebuild == hash_after_rebuild', async () => {
    const h1 = computeLedgerHash(LEDGER_PATH);
    await buildIndex(LEDGER_PATH);
    const h2 = computeLedgerHash(LEDGER_PATH);
    expect(h1).toBe(h2);
  });

  it('INV-D3-03: Bijection index <-> ledger verifiable', async () => {
    const indexResult = await buildIndex(LEDGER_PATH);
    expect(isOk(indexResult)).toBe(true);
    if (isOk(indexResult)) {
      const bijResult = await verifyIndexBijection(indexResult.value, LEDGER_PATH);
      expect(isOk(bijResult)).toBe(true);
    }
  });

  it('INV-D3-04: Hash on exact bytes', () => {
    const hash1 = computeLedgerHash(LEDGER_PATH);
    const hash2 = computeLedgerHash(LEDGER_PATH);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);
  });

  it('INV-D3-05: Offset map covers 100% entries', async () => {
    const result = await buildIndex(LEDGER_PATH);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.byId.size).toBe(result.value.entryCount);
    }
  });
});
