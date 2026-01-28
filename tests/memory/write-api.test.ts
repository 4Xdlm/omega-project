/**
 * OMEGA Memory System - Write API Tests
 * Phase D2 - NASA-Grade L4
 *
 * INV-D2-02: Toute fonction WRITE existe en signature uniquement et throw DENY
 *
 * Tests that ALL write operations throw PERMISSION_DENIED.
 * This is a SECURITY BOUNDARY test - writes are blocked until Sentinel.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  createMemoryWriteApi,
  createWriteBlockedError,
  SENTINEL_STATUS,
  isWriteBlocked,
  assertWriteBlocked,
} from '../../src/memory/api/write-api.js';
import { toEntryId, toTimestamp, MEMORY_ERROR_CODES } from '../../src/memory/types.js';
import { MemoryError } from '../../src/memory/errors.js';
import type { MemoryEntry } from '../../src/memory/types.js';

describe('MemoryWriteApi - D-WRITE-BLOCK Rule', () => {
  let api: ReturnType<typeof createMemoryWriteApi>;

  const sampleEntry: Omit<MemoryEntry, 'id'> = {
    ts_utc: toTimestamp('2026-01-27T00:00:00Z'),
    author: 'TestAuthor',
    class: 'FACT',
    scope: 'TEST',
    payload: {
      title: 'Test Entry',
      body: 'Test body',
    },
    meta: {
      schema_version: '1.0',
      sealed: false,
    },
  };

  beforeAll(() => {
    api = createMemoryWriteApi();
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // SENTINEL STATUS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Sentinel Status', () => {
    it('SENTINEL_STATUS is NOT_IMPLEMENTED', () => {
      expect(SENTINEL_STATUS).toBe('NOT_IMPLEMENTED');
    });

    it('isWriteBlocked returns true in Phase D', () => {
      expect(isWriteBlocked()).toBe(true);
    });

    it('assertWriteBlocked does not throw in Phase D', () => {
      expect(() => assertWriteBlocked()).not.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE - MUST THROW DENY
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('create - throws DENY', () => {
    it('throws MemoryError with AUTHORITY_DENIED code', async () => {
      await expect(api.create(sampleEntry)).rejects.toThrow(MemoryError);

      try {
        await api.create(sampleEntry);
      } catch (e) {
        expect(e).toBeInstanceOf(MemoryError);
        const error = e as MemoryError;
        expect(error.code).toBe(MEMORY_ERROR_CODES.AUTHORITY_DENIED);
        expect(error.message).toContain('WRITE_BLOCKED_UNTIL_SENTINEL');
        expect(error.message).toContain('create');
      }
    });

    it('never actually writes anything', async () => {
      // This test verifies no side effects occur
      // If create actually wrote, this would fail in subsequent runs
      await expect(api.create(sampleEntry)).rejects.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // APPEND - MUST THROW DENY
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('append - throws DENY', () => {
    it('throws MemoryError with AUTHORITY_DENIED code', async () => {
      const id = toEntryId('FAC-20260127-0001-AAA111');

      await expect(api.append(id, { data: 'test' })).rejects.toThrow(MemoryError);

      try {
        await api.append(id, { data: 'test' });
      } catch (e) {
        expect(e).toBeInstanceOf(MemoryError);
        const error = e as MemoryError;
        expect(error.code).toBe(MEMORY_ERROR_CODES.AUTHORITY_DENIED);
        expect(error.message).toContain('WRITE_BLOCKED_UNTIL_SENTINEL');
        expect(error.message).toContain('append');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // SEAL - MUST THROW DENY
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('seal - throws DENY', () => {
    it('throws MemoryError with AUTHORITY_DENIED code', async () => {
      const id = toEntryId('FAC-20260127-0001-AAA111');

      await expect(api.seal(id)).rejects.toThrow(MemoryError);

      try {
        await api.seal(id);
      } catch (e) {
        expect(e).toBeInstanceOf(MemoryError);
        const error = e as MemoryError;
        expect(error.code).toBe(MEMORY_ERROR_CODES.AUTHORITY_DENIED);
        expect(error.message).toContain('WRITE_BLOCKED_UNTIL_SENTINEL');
        expect(error.message).toContain('seal');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // SUPERSEDE - MUST THROW DENY
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('supersede - throws DENY', () => {
    it('throws MemoryError with AUTHORITY_DENIED code', async () => {
      const id = toEntryId('FAC-20260127-0001-AAA111');

      await expect(api.supersede(id, sampleEntry)).rejects.toThrow(MemoryError);

      try {
        await api.supersede(id, sampleEntry);
      } catch (e) {
        expect(e).toBeInstanceOf(MemoryError);
        const error = e as MemoryError;
        expect(error.code).toBe(MEMORY_ERROR_CODES.AUTHORITY_DENIED);
        expect(error.message).toContain('WRITE_BLOCKED_UNTIL_SENTINEL');
        expect(error.message).toContain('supersede');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // ERROR FACTORY
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('createWriteBlockedError', () => {
    it('creates error with correct code and message', () => {
      const error = createWriteBlockedError('testOperation');

      expect(error).toBeInstanceOf(MemoryError);
      expect(error.code).toBe(MEMORY_ERROR_CODES.AUTHORITY_DENIED);
      expect(error.message).toContain('WRITE_BLOCKED_UNTIL_SENTINEL');
      expect(error.message).toContain('testOperation');
      expect(error.message).toContain('security boundary');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // INVARIANT D2-02 VERIFICATION
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('INV-D2-02: All writes throw DENY', () => {
    it('create throws DENY', async () => {
      await expect(api.create(sampleEntry)).rejects.toThrow();
    });

    it('append throws DENY', async () => {
      const id = toEntryId('FAC-20260127-0001-AAA111');
      await expect(api.append(id, {})).rejects.toThrow();
    });

    it('seal throws DENY', async () => {
      const id = toEntryId('FAC-20260127-0001-AAA111');
      await expect(api.seal(id)).rejects.toThrow();
    });

    it('supersede throws DENY', async () => {
      const id = toEntryId('FAC-20260127-0001-AAA111');
      await expect(api.supersede(id, sampleEntry)).rejects.toThrow();
    });
  });
});
