/**
 * OMEGA Memory System - Ledger Reader Tests
 * Phase D2 - NASA-Grade L4
 *
 * Tests for memory-bounded streaming ledger operations.
 * INV-D2-04: Ledger reader memory-bounded (jamais tout en RAM)
 * 
 * CI HARDENING: Uses canonical hash (EOL-normalized) for cross-platform determinism
 */

import { describe, it, expect } from 'vitest';
import { join } from 'path';
import {
  scanLedger,
  readLineAtOffset,
  computeLedgerHash,
  verifyHashChain,
  countEntries,
  getAllIds,
  canonicalizeContent,
} from '../../src/memory/ledger/reader.js';
import { isOk, isErr, toByteOffset, toEntryId } from '../../src/memory/types.js';

const LEDGER_PATH = join(process.cwd(), 'docs', 'memory', 'ledgers', 'LEDGER_MEMORY_EVENTS.ndjson');

// ═══════════════════════════════════════════════════════════════════════════════
// SCAN LEDGER
// ═══════════════════════════════════════════════════════════════════════════════

describe('scanLedger', () => {
  it('scans all entries from ledger', async () => {
    const result = await scanLedger(LEDGER_PATH);

    expect(result.entries.length).toBe(3);
    expect(result.errors.length).toBe(0);
    expect(result.totalLines).toBe(3);
  });

  it('provides entry metadata (lineNumber, offset)', async () => {
    const result = await scanLedger(LEDGER_PATH);

    for (const scanEntry of result.entries) {
      expect(scanEntry.lineNumber).toBeGreaterThan(0);
      expect(scanEntry.offset).toBeGreaterThanOrEqual(0);
      expect(scanEntry.rawLine.length).toBeGreaterThan(0);
      expect(scanEntry.entry.id).toBeDefined();
    }
  });

  it('calls onEntry callback for each entry', async () => {
    const entries: string[] = [];

    await scanLedger(LEDGER_PATH, (scanEntry) => {
      entries.push(scanEntry.entry.id);
    });

    expect(entries.length).toBe(3);
    expect(entries[0]).toBe('FAC-20260127-0001-AAA111');
  });

  it('entries have contiguous line numbers', async () => {
    const result = await scanLedger(LEDGER_PATH);

    for (let i = 0; i < result.entries.length; i++) {
      expect(result.entries[i].lineNumber).toBe(i + 1);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// READ LINE AT OFFSET
// ═══════════════════════════════════════════════════════════════════════════════

describe('readLineAtOffset', () => {
  it('reads first entry at offset 0', () => {
    const result = readLineAtOffset(toByteOffset(0), LEDGER_PATH);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.id).toBe('FAC-20260127-0001-AAA111');
    }
  });

  it('returns error for out-of-bounds offset', () => {
    const result = readLineAtOffset(toByteOffset(999999), LEDGER_PATH);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('OFFSET_OUT_OF_BOUNDS');
    }
  });

  it('returns error for non-existent file', () => {
    const result = readLineAtOffset(toByteOffset(0), '/nonexistent/file.ndjson');

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('FILE_NOT_FOUND');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CANONICALIZE CONTENT
// ═══════════════════════════════════════════════════════════════════════════════

describe('canonicalizeContent', () => {
  it('normalizes CRLF to LF', () => {
    const input = 'line1\r\nline2\r\n';
    const output = canonicalizeContent(input);
    expect(output.toString()).toBe('line1\nline2\n');
  });

  it('normalizes standalone CR to LF', () => {
    const input = 'line1\rline2\r';
    const output = canonicalizeContent(input);
    expect(output.toString()).toBe('line1\nline2\n');
  });

  it('preserves LF', () => {
    const input = 'line1\nline2\n';
    const output = canonicalizeContent(input);
    expect(output.toString()).toBe('line1\nline2\n');
  });

  it('adds trailing newline if missing', () => {
    const input = 'line1\nline2';
    const output = canonicalizeContent(input);
    expect(output.toString()).toBe('line1\nline2\n');
  });

  it('produces same hash for CRLF and LF inputs', () => {
    const { createHash } = require('crypto');
    const contentLF = 'line1\nline2\n';
    const contentCRLF = 'line1\r\nline2\r\n';
    
    const hashLF = createHash('sha256').update(canonicalizeContent(contentLF)).digest('hex');
    const hashCRLF = createHash('sha256').update(canonicalizeContent(contentCRLF)).digest('hex');
    
    expect(hashLF).toBe(hashCRLF);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// COMPUTE LEDGER HASH
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeLedgerHash', () => {
  it('returns 64-char SHA-256 hash', () => {
    const hash = computeLedgerHash(LEDGER_PATH);

    expect(hash.length).toBe(64);
    expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
  });

  it('is deterministic', () => {
    const hash1 = computeLedgerHash(LEDGER_PATH);
    const hash2 = computeLedgerHash(LEDGER_PATH);
    const hash3 = computeLedgerHash(LEDGER_PATH);

    expect(hash1).toBe(hash2);
    expect(hash2).toBe(hash3);
  });

  it('matches known canonical hash (cross-platform deterministic)', () => {
    const hash = computeLedgerHash(LEDGER_PATH);
    // Canonical hash: computed with EOL normalized to LF
    // This ensures Windows (CRLF) and Linux (LF) produce identical results
    expect(hash).toBe('29111cb31f7992430f29c5b3597e962a96ec44545c37402e4b5c3dc362c431ec');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// VERIFY HASH CHAIN
// ═══════════════════════════════════════════════════════════════════════════════

describe('verifyHashChain', () => {
  it('returns valid report for clean ledger', async () => {
    const report = await verifyHashChain(LEDGER_PATH);

    expect(report.valid).toBe(true);
    expect(report.entriesChecked).toBe(3);
    expect(report.violations.length).toBe(0);
    expect(report.ledgerHash.length).toBe(64);
  });

  it('includes timestamp in report', async () => {
    const report = await verifyHashChain(LEDGER_PATH);

    expect(report.checkedAt).toBeDefined();
    expect(report.checkedAt.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// COUNT ENTRIES
// ═══════════════════════════════════════════════════════════════════════════════

describe('countEntries', () => {
  it('counts entries in ledger', async () => {
    const count = await countEntries(LEDGER_PATH);
    expect(count).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET ALL IDS
// ═══════════════════════════════════════════════════════════════════════════════

describe('getAllIds', () => {
  it('returns all entry IDs', async () => {
    const ids = await getAllIds(LEDGER_PATH);

    expect(ids.length).toBe(3);
    expect(ids[0]).toBe('FAC-20260127-0001-AAA111');
    expect(ids[1]).toBe('FAC-20260127-0002-BBB222');
    expect(ids[2]).toBe('FAC-20260127-0003-CCC333');
  });
});
