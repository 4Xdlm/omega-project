/**
 * OMEGA Memory System - Read API Tests
 * Phase D2 - NASA-Grade L4
 *
 * Tests for read-only memory operations.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createMemoryReadApi } from '../../src/memory/api/read-api.js';
import { isOk, isErr, toEntryId } from '../../src/memory/types.js';
import { join } from 'path';

// Use the actual ledger for integration tests
const LEDGER_PATH = join(process.cwd(), 'docs', 'memory', 'ledgers', 'LEDGER_MEMORY_EVENTS.ndjson');

describe('MemoryReadApi', () => {
  let api: ReturnType<typeof createMemoryReadApi>;

  beforeAll(() => {
    api = createMemoryReadApi(LEDGER_PATH);
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // getById
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('getById', () => {
    it('returns entry for existing ID', async () => {
      const id = toEntryId('FAC-20260127-0001-AAA111');
      const result = await api.getById(id);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.id).toBe(id);
        expect(result.value.class).toBe('FACT');
        expect(result.value.author).toBe('Francky');
      }
    });

    it('returns error for non-existent ID', async () => {
      const id = toEntryId('FAC-99999999-9999-ZZZZZZ');
      const result = await api.getById(id);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe('ENTRY_NOT_FOUND');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // query
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('query', () => {
    it('returns all entries with no filters', async () => {
      const result = await api.query();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.entries.length).toBeGreaterThan(0);
        expect(result.value.total).toBe(result.value.entries.length);
      }
    });

    it('filters by class', async () => {
      const result = await api.query({ class: 'FACT' });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        for (const entry of result.value.entries) {
          expect(entry.class).toBe('FACT');
        }
      }
    });

    it('filters by author', async () => {
      const result = await api.query({ author: 'Francky' });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        for (const entry of result.value.entries) {
          expect(entry.author).toBe('Francky');
        }
      }
    });

    it('filters by tags', async () => {
      const result = await api.query({ tags: ['sealed'] });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        for (const entry of result.value.entries) {
          expect(entry.meta.tags).toContain('sealed');
        }
      }
    });

    it('respects limit', async () => {
      const result = await api.query({ limit: 1 });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.entries.length).toBeLessThanOrEqual(1);
      }
    });

    it('respects offset for pagination', async () => {
      const allResult = await api.query();
      const offsetResult = await api.query({ offset: 1 });

      expect(isOk(allResult)).toBe(true);
      expect(isOk(offsetResult)).toBe(true);

      if (isOk(allResult) && isOk(offsetResult) && allResult.value.entries.length > 1) {
        expect(offsetResult.value.entries[0].id).toBe(allResult.value.entries[1].id);
      }
    });

    it('reports hasMore correctly', async () => {
      const result = await api.query({ limit: 1 });

      expect(isOk(result)).toBe(true);
      if (isOk(result) && result.value.total > 1) {
        expect(result.value.hasMore).toBe(true);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // verifyIntegrity
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('verifyIntegrity', () => {
    it('returns valid report for clean ledger', async () => {
      const result = await api.verifyIntegrity();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.valid).toBe(true);
        expect(result.value.entriesChecked).toBeGreaterThan(0);
        expect(result.value.violations.length).toBe(0);
        expect(result.value.ledgerHash.length).toBe(64);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // getLedgerHash
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('getLedgerHash', () => {
    it('returns 64-char SHA-256 hash', () => {
      const result = api.getLedgerHash();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.length).toBe(64);
        expect(/^[a-f0-9]+$/.test(result.value)).toBe(true);
      }
    });

    it('is deterministic', () => {
      const hash1 = api.getLedgerHash();
      const hash2 = api.getLedgerHash();

      expect(isOk(hash1) && isOk(hash2)).toBe(true);
      if (isOk(hash1) && isOk(hash2)) {
        expect(hash1.value).toBe(hash2.value);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // countEntries
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('countEntries', () => {
    it('returns correct count', async () => {
      const result = await api.countEntries();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(3); // Known ledger has 3 entries
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // getAllIds
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('getAllIds', () => {
    it('returns all entry IDs', async () => {
      const result = await api.getAllIds();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.length).toBe(3);
        expect(result.value).toContain('FAC-20260127-0001-AAA111');
        expect(result.value).toContain('FAC-20260127-0002-BBB222');
        expect(result.value).toContain('FAC-20260127-0003-CCC333');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // exists
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('exists', () => {
    it('returns true for existing ID', async () => {
      const id = toEntryId('FAC-20260127-0001-AAA111');
      const result = await api.exists(id);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(true);
      }
    });

    it('returns false for non-existent ID', async () => {
      const id = toEntryId('FAC-99999999-9999-ZZZZZZ');
      const result = await api.exists(id);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(false);
      }
    });
  });
});
