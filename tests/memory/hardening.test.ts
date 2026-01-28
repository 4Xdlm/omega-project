/**
 * OMEGA Memory System - Hardening Tests
 * Phase D6 - NASA-Grade L4
 *
 * Tests in STRICT ORDER (NON-NEGOTIABLE):
 * 1. Tests NDJSON invalides (malformed, truncated)
 * 2. Tests Unicode hostiles (emoji, RTL, zero-width, NFC)
 * 3. Tests volumétriques (large entries, many entries)
 * 4. Tests index manquant/corrompu
 * 5. Tests concurrence READ-ONLY
 *
 * INV-D6-01: Malformed input never crashes
 * INV-D6-02: Unicode handled correctly
 * INV-D6-03: System stable under volume
 * INV-D6-04: Corrupted index = rebuild, not crash
 * INV-D6-05: Concurrent reads are safe
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

// Imports from memory module
import { parseAndValidateEntry } from '../../src/memory/validation.js';
import { scanLedger, readLineAtOffset, verifyHashChain } from '../../src/memory/ledger/reader.js';
import { buildIndex, testRebuildDeterminism } from '../../src/memory/index/index-builder.js';
import { loadIndex, saveIndex, indexExists } from '../../src/memory/index/index-persistence.js';
import { createMemoryReadApi } from '../../src/memory/api/read-api.js';
import { toByteOffset, toEntryId, isOk, isErr } from '../../src/memory/types.js';
import type { MemoryEntry, EntryId } from '../../src/memory/types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

const TEST_DIR = join(tmpdir(), `omega-d6-test-${Date.now()}-${randomBytes(4).toString('hex')}`);
const LEDGER_DIR = join(TEST_DIR, 'ledger');
const INDEX_DIR = join(TEST_DIR, 'index');

function createValidEntry(id: string, title: string, body: string): object {
  return {
    id,
    ts_utc: '2026-01-27T00:00:00Z',
    author: 'TestAuthor',
    class: 'FACT',
    scope: 'TEST',
    payload: { title, body },
    meta: { schema_version: '1.0', sealed: false },
  };
}

function createValidEntryJSON(id: string, title: string, body: string): string {
  return JSON.stringify(createValidEntry(id, title, body));
}

let testCounter = 0;
function createTestLedger(entries: string[]): string {
  testCounter++;
  const ledgerPath = join(LEDGER_DIR, `test-${testCounter}-${Date.now()}.ndjson`);
  writeFileSync(ledgerPath, entries.join('\n') + '\n', 'utf8');
  return ledgerPath;
}

beforeAll(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true });
  }
  mkdirSync(LEDGER_DIR, { recursive: true });
  mkdirSync(INDEX_DIR, { recursive: true });
});

afterAll(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true });
  }
});

afterEach(() => {
  // Clean up index files between tests (ledger files are unique per test)
  const indexFiles = [
    join(INDEX_DIR, 'by_id.offset.json'),
    join(INDEX_DIR, 'by_class.ids.json'),
    join(INDEX_DIR, 'by_tag.ids.json'),
    join(INDEX_DIR, 'index.meta.json'),
  ];
  for (const f of indexFiles) {
    if (existsSync(f)) {
      unlinkSync(f);
    }
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1. TESTS NDJSON INVALIDES - INV-D6-01
// ═══════════════════════════════════════════════════════════════════════════════

describe('D6-01: NDJSON Invalid Handling', () => {
  describe('Malformed JSON', () => {
    it('handles truncated JSON gracefully', () => {
      const truncated = '{"id":"FAC-20260127-0001-AAA111","ts_utc":"2026-01-';
      const result = parseAndValidateEntry(truncated);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe('INVALID_JSON');
      }
    });

    it('handles missing closing brace', () => {
      const noBrace = '{"id":"FAC-20260127-0001-AAA111","ts_utc":"2026-01-27T00:00:00Z"';
      const result = parseAndValidateEntry(noBrace);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe('INVALID_JSON');
      }
    });

    it('handles invalid JSON syntax (trailing comma)', () => {
      const trailingComma = '{"id":"FAC-20260127-0001-AAA111",}';
      const result = parseAndValidateEntry(trailingComma);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe('INVALID_JSON');
      }
    });

    it('handles completely invalid JSON', () => {
      const invalid = 'this is not json at all';
      const result = parseAndValidateEntry(invalid);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe('INVALID_JSON');
      }
    });

    it('handles empty string', () => {
      const result = parseAndValidateEntry('');

      expect(isErr(result)).toBe(true);
    });

    it('handles null byte in JSON', () => {
      const withNull = '{"id":"FAC-20260127-0001-AAA111\u0000"}';
      const result = parseAndValidateEntry(withNull);

      // Should either parse or fail gracefully
      expect(() => result).not.toThrow();
    });
  });

  describe('Ledger with malformed lines', () => {
    it('skips malformed lines and continues parsing', async () => {
      const ledgerPath = createTestLedger([
        createValidEntryJSON('FAC-20260127-0001-AAA111', 'Entry 1', 'Body 1'),
        'this is not json',
        createValidEntryJSON('FAC-20260127-0002-BBB222', 'Entry 2', 'Body 2'),
      ]);

      const result = await scanLedger(ledgerPath);

      // Should have 2 valid entries and 1 error
      expect(result.entries.length).toBe(2);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].code).toBe('INVALID_JSON');
    });

    it('handles ledger with only malformed lines', async () => {
      const ledgerPath = createTestLedger([
        'invalid line 1',
        'invalid line 2',
        'invalid line 3',
      ]);

      const result = await scanLedger(ledgerPath);

      expect(result.entries.length).toBe(0);
      expect(result.errors.length).toBe(3);
    });

    it('handles ledger with empty lines', async () => {
      const ledgerPath = createTestLedger([
        createValidEntryJSON('FAC-20260127-0001-AAA111', 'Entry 1', 'Body 1'),
        '',
        '   ',
        createValidEntryJSON('FAC-20260127-0002-BBB222', 'Entry 2', 'Body 2'),
      ]);

      const result = await scanLedger(ledgerPath);

      // Empty lines should be skipped, not counted as errors
      expect(result.entries.length).toBe(2);
      expect(result.errors.length).toBe(0);
    });

    it('handles truncated ledger file', async () => {
      const ledgerPath = join(LEDGER_DIR, 'test.ndjson');
      const validEntry = createValidEntryJSON('FAC-20260127-0001-AAA111', 'Entry', 'Body');
      // Write entry without newline, then truncated
      writeFileSync(ledgerPath, validEntry.substring(0, 50), 'utf8');

      const result = await scanLedger(ledgerPath);

      // Should fail to parse the truncated line
      expect(result.entries.length).toBe(0);
      expect(result.errors.length).toBe(1);
    });
  });

  describe('Schema validation failures', () => {
    it('handles missing required fields', () => {
      const noId = '{"ts_utc":"2026-01-27T00:00:00Z","author":"Test","class":"FACT","scope":"TEST","payload":{"title":"T","body":"B"},"meta":{"schema_version":"1.0","sealed":false}}';
      const result = parseAndValidateEntry(noId);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe('MISSING_FIELD');
      }
    });

    it('handles invalid entry class', () => {
      const badClass = JSON.stringify({
        ...createValidEntry('FAC-20260127-0001-AAA111', 'T', 'B'),
        class: 'INVALID_CLASS',
      });
      const result = parseAndValidateEntry(badClass);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe('INVALID_CLASS');
      }
    });

    it('handles invalid ID format', () => {
      const badId = JSON.stringify({
        ...createValidEntry('invalid-id', 'T', 'B'),
      });
      const result = parseAndValidateEntry(badId);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe('INVALID_ID_FORMAT');
      }
    });

    it('handles invalid timestamp format', () => {
      const entry = createValidEntry('FAC-20260127-0001-AAA111', 'T', 'B') as Record<string, unknown>;
      entry.ts_utc = 'not-a-timestamp';
      const badTs = JSON.stringify(entry);
      const result = parseAndValidateEntry(badTs);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe('INVALID_TIMESTAMP');
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. TESTS UNICODE HOSTILES - INV-D6-02
// ═══════════════════════════════════════════════════════════════════════════════

describe('D6-02: Unicode Hostile Handling', () => {
  describe('Emoji handling', () => {
    it('handles emoji in title', () => {
      const entry = createValidEntry('FAC-20260127-0001-AAA111', 'Test 🎉 Title', 'Body');
      const json = JSON.stringify(entry);
      const result = parseAndValidateEntry(json);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.payload.title).toBe('Test 🎉 Title');
      }
    });

    it('handles emoji in body', () => {
      const entry = createValidEntry('FAC-20260127-0001-AAA111', 'Title', 'Body with 🚀🌟✨');
      const json = JSON.stringify(entry);
      const result = parseAndValidateEntry(json);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.payload.body).toContain('🚀');
      }
    });

    it('handles multi-codepoint emoji (family)', () => {
      const entry = createValidEntry('FAC-20260127-0001-AAA111', 'Family 👨‍👩‍👧‍👦', 'Body');
      const json = JSON.stringify(entry);
      const result = parseAndValidateEntry(json);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.payload.title).toContain('👨‍👩‍👧‍👦');
      }
    });

    it('handles flag emoji', () => {
      const entry = createValidEntry('FAC-20260127-0001-AAA111', 'Flag 🇫🇷', 'Body');
      const json = JSON.stringify(entry);
      const result = parseAndValidateEntry(json);

      expect(isOk(result)).toBe(true);
    });
  });

  describe('RTL (Right-to-Left) handling', () => {
    it('handles Arabic text', () => {
      const entry = createValidEntry('FAC-20260127-0001-AAA111', 'مرحبا', 'نص عربي');
      const json = JSON.stringify(entry);
      const result = parseAndValidateEntry(json);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.payload.title).toBe('مرحبا');
      }
    });

    it('handles Hebrew text', () => {
      const entry = createValidEntry('FAC-20260127-0001-AAA111', 'שלום', 'טקסט עברי');
      const json = JSON.stringify(entry);
      const result = parseAndValidateEntry(json);

      expect(isOk(result)).toBe(true);
    });

    it('handles mixed LTR/RTL text', () => {
      const entry = createValidEntry('FAC-20260127-0001-AAA111', 'Hello مرحبا World', 'Mixed text');
      const json = JSON.stringify(entry);
      const result = parseAndValidateEntry(json);

      expect(isOk(result)).toBe(true);
    });

    it('handles RTL override characters', () => {
      // U+202E is Right-to-Left Override
      const entry = createValidEntry('FAC-20260127-0001-AAA111', 'Test \u202E Override', 'Body');
      const json = JSON.stringify(entry);
      const result = parseAndValidateEntry(json);

      // Should parse but preserve the character
      expect(isOk(result)).toBe(true);
    });
  });

  describe('Zero-width characters', () => {
    it('handles zero-width space (U+200B)', () => {
      const entry = createValidEntry('FAC-20260127-0001-AAA111', 'Test\u200BTitle', 'Body');
      const json = JSON.stringify(entry);
      const result = parseAndValidateEntry(json);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.payload.title).toBe('Test\u200BTitle');
        expect(result.value.payload.title.length).toBe(10); // Includes invisible char
      }
    });

    it('handles zero-width non-joiner (U+200C)', () => {
      const entry = createValidEntry('FAC-20260127-0001-AAA111', 'Test\u200CTitle', 'Body');
      const json = JSON.stringify(entry);
      const result = parseAndValidateEntry(json);

      expect(isOk(result)).toBe(true);
    });

    it('handles zero-width joiner (U+200D)', () => {
      const entry = createValidEntry('FAC-20260127-0001-AAA111', 'Test\u200DTitle', 'Body');
      const json = JSON.stringify(entry);
      const result = parseAndValidateEntry(json);

      expect(isOk(result)).toBe(true);
    });

    it('handles byte order mark (U+FEFF)', () => {
      const entry = createValidEntry('FAC-20260127-0001-AAA111', '\uFEFFTitle', 'Body');
      const json = JSON.stringify(entry);
      const result = parseAndValidateEntry(json);

      expect(isOk(result)).toBe(true);
    });
  });

  describe('Unicode normalization (NFC)', () => {
    it('handles composed vs decomposed characters (é)', () => {
      // é as single character (U+00E9) vs e + combining acute (U+0065 U+0301)
      const composed = 'caf\u00E9';
      const decomposed = 'cafe\u0301';

      const entry1 = createValidEntry('FAC-20260127-0001-AAA111', composed, 'Body');
      const entry2 = createValidEntry('FAC-20260127-0002-BBB222', decomposed, 'Body');

      const result1 = parseAndValidateEntry(JSON.stringify(entry1));
      const result2 = parseAndValidateEntry(JSON.stringify(entry2));

      expect(isOk(result1)).toBe(true);
      expect(isOk(result2)).toBe(true);

      // Both should parse, but may have different byte lengths
      if (isOk(result1) && isOk(result2)) {
        // Just verify they parsed correctly
        expect(result1.value.payload.title).toBe(composed);
        expect(result2.value.payload.title).toBe(decomposed);
      }
    });

    it('handles Korean Hangul composition', () => {
      const composed = '한글'; // Composed
      const decomposed = '\u1112\u1161\u11AB\u1100\u1173\u11AF'; // Decomposed jamo

      const entry1 = createValidEntry('FAC-20260127-0001-AAA111', composed, 'Body');
      const entry2 = createValidEntry('FAC-20260127-0002-BBB222', decomposed, 'Body');

      const result1 = parseAndValidateEntry(JSON.stringify(entry1));
      const result2 = parseAndValidateEntry(JSON.stringify(entry2));

      expect(isOk(result1)).toBe(true);
      expect(isOk(result2)).toBe(true);
    });

    it('handles combining diacritical marks', () => {
      // a + combining ring above + combining dot below
      const stacked = 'a\u030A\u0323';
      const entry = createValidEntry('FAC-20260127-0001-AAA111', stacked, 'Body');
      const json = JSON.stringify(entry);
      const result = parseAndValidateEntry(json);

      expect(isOk(result)).toBe(true);
    });
  });

  describe('Special Unicode edge cases', () => {
    it('handles null character (U+0000) in value', () => {
      const entry = createValidEntry('FAC-20260127-0001-AAA111', 'Title', 'Body\u0000end');
      const json = JSON.stringify(entry);
      const result = parseAndValidateEntry(json);

      // Should parse (JSON.stringify escapes null as \u0000)
      expect(isOk(result)).toBe(true);
    });

    it('handles maximum BMP character (U+FFFF)', () => {
      const entry = createValidEntry('FAC-20260127-0001-AAA111', 'Title\uFFFF', 'Body');
      const json = JSON.stringify(entry);
      const result = parseAndValidateEntry(json);

      expect(isOk(result)).toBe(true);
    });

    it('handles supplementary plane characters', () => {
      // Mathematical bold A (U+1D400)
      const entry = createValidEntry('FAC-20260127-0001-AAA111', 'Math: 𝐀', 'Body');
      const json = JSON.stringify(entry);
      const result = parseAndValidateEntry(json);

      expect(isOk(result)).toBe(true);
    });

    it('handles line separator (U+2028) and paragraph separator (U+2029)', () => {
      const entry = createValidEntry('FAC-20260127-0001-AAA111', 'Line\u2028Sep', 'Para\u2029Sep');
      const json = JSON.stringify(entry);
      const result = parseAndValidateEntry(json);

      expect(isOk(result)).toBe(true);
    });
  });

  describe('Unicode in ledger', () => {
    it('handles ledger with Unicode entries', async () => {
      const ledgerPath = createTestLedger([
        createValidEntryJSON('FAC-20260127-0001-AAA111', 'English', 'Text'),
        createValidEntryJSON('FAC-20260127-0002-BBB222', '日本語', 'テキスト'),
        createValidEntryJSON('FAC-20260127-0003-CCC333', 'العربية', 'نص'),
      ]);

      const result = await scanLedger(ledgerPath);

      expect(result.entries.length).toBe(3);
      expect(result.errors.length).toBe(0);
      expect(result.entries[1].entry.payload.title).toBe('日本語');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. TESTS VOLUMÉTRIQUES - INV-D6-03
// ═══════════════════════════════════════════════════════════════════════════════

describe('D6-03: Volumetric Handling', () => {
  describe('Large entries', () => {
    it('handles entry with large title (10KB)', () => {
      const largeTitle = 'A'.repeat(10 * 1024);
      const entry = createValidEntry('FAC-20260127-0001-AAA111', largeTitle, 'Body');
      const json = JSON.stringify(entry);
      const result = parseAndValidateEntry(json);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.payload.title.length).toBe(10 * 1024);
      }
    });

    it('handles entry with large body (100KB)', () => {
      const largeBody = 'B'.repeat(100 * 1024);
      const entry = createValidEntry('FAC-20260127-0001-AAA111', 'Title', largeBody);
      const json = JSON.stringify(entry);
      const result = parseAndValidateEntry(json);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.payload.body.length).toBe(100 * 1024);
      }
    });

    it('handles entry near MAX_LINE_SIZE (1MB)', () => {
      // Create entry with body close to 1MB
      const largeBody = 'C'.repeat(900 * 1024); // 900KB, leaving room for other fields
      const entry = createValidEntry('FAC-20260127-0001-AAA111', 'Title', largeBody);
      const json = JSON.stringify(entry);
      const result = parseAndValidateEntry(json);

      expect(isOk(result)).toBe(true);
    });
  });

  describe('Many entries', () => {
    it('handles ledger with 100 entries', async () => {
      const entries: string[] = [];
      for (let i = 0; i < 100; i++) {
        const id = `FAC-20260127-${String(i).padStart(4, '0')}-AAA${String(i).padStart(3, '0')}`;
        entries.push(createValidEntryJSON(id, `Entry ${i}`, `Body ${i}`));
      }

      const ledgerPath = createTestLedger(entries);
      const result = await scanLedger(ledgerPath);

      expect(result.entries.length).toBe(100);
      expect(result.errors.length).toBe(0);
    });

    it('handles ledger with 1000 entries', async () => {
      const entries: string[] = [];
      for (let i = 0; i < 1000; i++) {
        const id = `FAC-20260127-${String(i).padStart(4, '0')}-A${String(i).padStart(5, '0')}`;
        entries.push(createValidEntryJSON(id, `Entry ${i}`, `Body ${i}`));
      }

      const ledgerPath = createTestLedger(entries);
      const result = await scanLedger(ledgerPath);

      expect(result.entries.length).toBe(1000);
      expect(result.errors.length).toBe(0);
    }, 10000); // Increased timeout

    it('verifies integrity on large ledger', async () => {
      const entries: string[] = [];
      for (let i = 0; i < 500; i++) {
        const id = `FAC-20260127-${String(i).padStart(4, '0')}-B${String(i).padStart(5, '0')}`;
        entries.push(createValidEntryJSON(id, `Entry ${i}`, `Body ${i}`));
      }

      const ledgerPath = createTestLedger(entries);
      const report = await verifyHashChain(ledgerPath);

      expect(report.valid).toBe(true);
      expect(report.entriesChecked).toBe(500);
    }, 15000);
  });

  describe('Index with many entries', () => {
    it('builds index for 500 entries', async () => {
      const entries: string[] = [];
      for (let i = 0; i < 500; i++) {
        const id = `FAC-20260127-${String(i).padStart(4, '0')}-C${String(i).padStart(5, '0')}`;
        entries.push(createValidEntryJSON(id, `Entry ${i}`, `Body ${i}`));
      }

      const ledgerPath = createTestLedger(entries);
      const indexResult = await buildIndex(ledgerPath);

      expect(isOk(indexResult)).toBe(true);
      if (isOk(indexResult)) {
        expect(indexResult.value.entryCount).toBe(500);
        expect(indexResult.value.byId.size).toBe(500);
      }
    }, 15000);

    it('rebuild determinism holds for 200 entries', async () => {
      const entries: string[] = [];
      for (let i = 0; i < 200; i++) {
        const id = `FAC-20260127-${String(i).padStart(4, '0')}-D${String(i).padStart(5, '0')}`;
        entries.push(createValidEntryJSON(id, `Entry ${i}`, `Body ${i}`));
      }

      const ledgerPath = createTestLedger(entries);
      const result = await testRebuildDeterminism(ledgerPath);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(true);
      }
    }, 15000);
  });

  describe('Query performance', () => {
    it('queries 500 entries with filter', async () => {
      const entries: string[] = [];
      for (let i = 0; i < 500; i++) {
        const cls = i % 2 === 0 ? 'FACT' : 'DECISION';
        const entry = {
          id: `${cls.substring(0, 3)}-20260127-${String(i).padStart(4, '0')}-E${String(i).padStart(5, '0')}`,
          ts_utc: '2026-01-27T00:00:00Z',
          author: 'TestAuthor',
          class: cls,
          scope: 'TEST',
          payload: { title: `Entry ${i}`, body: `Body ${i}` },
          meta: { schema_version: '1.0', sealed: false },
        };
        entries.push(JSON.stringify(entry));
      }

      const ledgerPath = createTestLedger(entries);
      const api = createMemoryReadApi(ledgerPath);

      const result = await api.query({ class: 'FACT', limit: 100 });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.entries.length).toBe(100);
        expect(result.value.total).toBe(250); // Half are FACT
      }
    }, 10000);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. TESTS INDEX MANQUANT/CORROMPU - INV-D6-04
// ═══════════════════════════════════════════════════════════════════════════════

describe('D6-04: Index Missing/Corrupted Handling', () => {
  describe('Missing index', () => {
    it('indexExists returns false when no index', () => {
      const nonExistentDir = join(TEST_DIR, 'non-existent-index');
      expect(indexExists(nonExistentDir)).toBe(false);
    });

    it('loadIndex returns error for missing index', () => {
      const nonExistentDir = join(TEST_DIR, 'non-existent-index');
      const result = loadIndex(nonExistentDir);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe('FILE_NOT_FOUND');
      }
    });

    it('API works without index (fallback to scan)', async () => {
      const entries = [
        createValidEntryJSON('FAC-20260127-0001-AAA111', 'Entry 1', 'Body 1'),
        createValidEntryJSON('FAC-20260127-0002-BBB222', 'Entry 2', 'Body 2'),
      ];

      const ledgerPath = createTestLedger(entries);
      const api = createMemoryReadApi(ledgerPath); // No index provided

      const result = await api.getById(toEntryId('FAC-20260127-0001-AAA111'));

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.payload.title).toBe('Entry 1');
      }
    });
  });

  describe('Corrupted index', () => {
    it('handles corrupted by_id.offset.json', async () => {
      // First create valid ledger and index
      const entries = [
        createValidEntryJSON('FAC-20260127-0001-AAA111', 'Entry 1', 'Body 1'),
      ];
      const ledgerPath = createTestLedger(entries);
      const indexResult = await buildIndex(ledgerPath);
      expect(isOk(indexResult)).toBe(true);

      if (isOk(indexResult)) {
        saveIndex(indexResult.value, INDEX_DIR);
      }

      // Corrupt the offset file
      writeFileSync(join(INDEX_DIR, 'by_id.offset.json'), 'not valid json', 'utf8');

      // Try to load corrupted index
      const loadResult = loadIndex(INDEX_DIR);

      expect(isErr(loadResult)).toBe(true);
      if (isErr(loadResult)) {
        expect(loadResult.error.code).toBe('READ_ERROR');
      }
    });

    it('handles corrupted index.meta.json', async () => {
      const entries = [
        createValidEntryJSON('FAC-20260127-0001-AAA111', 'Entry 1', 'Body 1'),
      ];
      const ledgerPath = createTestLedger(entries);
      const indexResult = await buildIndex(ledgerPath);
      expect(isOk(indexResult)).toBe(true);

      if (isOk(indexResult)) {
        saveIndex(indexResult.value, INDEX_DIR);
      }

      // Corrupt the meta file
      writeFileSync(join(INDEX_DIR, 'index.meta.json'), '{malformed', 'utf8');

      const loadResult = loadIndex(INDEX_DIR);

      expect(isErr(loadResult)).toBe(true);
    });

    it('handles empty index files', async () => {
      mkdirSync(INDEX_DIR, { recursive: true });
      writeFileSync(join(INDEX_DIR, 'by_id.offset.json'), '', 'utf8');
      writeFileSync(join(INDEX_DIR, 'by_class.ids.json'), '', 'utf8');
      writeFileSync(join(INDEX_DIR, 'by_tag.ids.json'), '', 'utf8');
      writeFileSync(join(INDEX_DIR, 'index.meta.json'), '', 'utf8');

      const loadResult = loadIndex(INDEX_DIR);

      expect(isErr(loadResult)).toBe(true);
    });

    it('handles index with invalid offset values', async () => {
      mkdirSync(INDEX_DIR, { recursive: true });

      // Write index with negative offset
      writeFileSync(
        join(INDEX_DIR, 'by_id.offset.json'),
        '{"FAC-20260127-0001-AAA111": -100}',
        'utf8'
      );
      writeFileSync(join(INDEX_DIR, 'by_class.ids.json'), '{}', 'utf8');
      writeFileSync(join(INDEX_DIR, 'by_tag.ids.json'), '{}', 'utf8');
      writeFileSync(
        join(INDEX_DIR, 'index.meta.json'),
        '{"ledgerSha256":"abc","entryCount":1,"builtAt":"2026-01-27T00:00:00Z"}',
        'utf8'
      );

      // Load should work (it just stores the values)
      const loadResult = loadIndex(INDEX_DIR);

      // The corrupted data will cause issues when used, not when loaded
      // This tests that load doesn't crash
      expect(() => loadResult).not.toThrow();
    });
  });

  describe('Index rebuild after corruption', () => {
    it('can rebuild index after corruption', async () => {
      const entries = [
        createValidEntryJSON('FAC-20260127-0001-AAA111', 'Entry 1', 'Body 1'),
        createValidEntryJSON('FAC-20260127-0002-BBB222', 'Entry 2', 'Body 2'),
      ];
      const ledgerPath = createTestLedger(entries);

      // Build initial index
      let indexResult = await buildIndex(ledgerPath);
      expect(isOk(indexResult)).toBe(true);

      // Simulate corruption by creating invalid index
      if (isOk(indexResult)) {
        saveIndex(indexResult.value, INDEX_DIR);
      }
      writeFileSync(join(INDEX_DIR, 'by_id.offset.json'), 'corrupted!', 'utf8');

      // Verify it's corrupted
      const corruptedLoad = loadIndex(INDEX_DIR);
      expect(isErr(corruptedLoad)).toBe(true);

      // Rebuild from ledger (not from corrupted index)
      indexResult = await buildIndex(ledgerPath);
      expect(isOk(indexResult)).toBe(true);

      if (isOk(indexResult)) {
        expect(indexResult.value.entryCount).toBe(2);
        expect(indexResult.value.byId.size).toBe(2);

        // Save new clean index
        const saveResult = saveIndex(indexResult.value, INDEX_DIR);
        expect(isOk(saveResult)).toBe(true);

        // Now load should work
        const reloadResult = loadIndex(INDEX_DIR);
        expect(isOk(reloadResult)).toBe(true);
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. TESTS CONCURRENCE READ-ONLY - INV-D6-05
// ═══════════════════════════════════════════════════════════════════════════════

describe('D6-05: Concurrent Read-Only Operations', () => {
  describe('Concurrent reads', () => {
    it('handles concurrent getById calls', async () => {
      const entries = [
        createValidEntryJSON('FAC-20260127-0001-AAA111', 'Entry 1', 'Body 1'),
        createValidEntryJSON('FAC-20260127-0002-BBB222', 'Entry 2', 'Body 2'),
        createValidEntryJSON('FAC-20260127-0003-CCC333', 'Entry 3', 'Body 3'),
      ];
      const ledgerPath = createTestLedger(entries);
      const api = createMemoryReadApi(ledgerPath);

      // Execute multiple reads concurrently
      const results = await Promise.all([
        api.getById(toEntryId('FAC-20260127-0001-AAA111')),
        api.getById(toEntryId('FAC-20260127-0002-BBB222')),
        api.getById(toEntryId('FAC-20260127-0003-CCC333')),
        api.getById(toEntryId('FAC-20260127-0001-AAA111')), // Same entry again
      ]);

      expect(results.every(isOk)).toBe(true);
      expect(results.filter(isOk).map(r => r.value.payload.title)).toEqual([
        'Entry 1',
        'Entry 2',
        'Entry 3',
        'Entry 1',
      ]);
    });

    it('handles concurrent query calls', async () => {
      const entries: string[] = [];
      for (let i = 0; i < 50; i++) {
        // Valid classes: FACT, DECISION, EVIDENCE, METRIC, NOTE
        const classes = ['FACT', 'DECISION', 'EVIDENCE', 'METRIC', 'NOTE'] as const;
        const cls = classes[i % 5];
        const entry = {
          id: `${cls.substring(0, 3)}-20260127-${String(i).padStart(4, '0')}-F${String(i).padStart(5, '0')}`,
          ts_utc: '2026-01-27T00:00:00Z',
          author: i % 2 === 0 ? 'Author1' : 'Author2',
          class: cls,
          scope: 'TEST',
          payload: { title: `Entry ${i}`, body: `Body ${i}` },
          meta: { schema_version: '1.0', sealed: false },
        };
        entries.push(JSON.stringify(entry));
      }

      const ledgerPath = createTestLedger(entries);
      const api = createMemoryReadApi(ledgerPath);

      // Execute multiple queries concurrently
      const results = await Promise.all([
        api.query({ class: 'FACT' }),
        api.query({ class: 'DECISION' }),
        api.query({ author: 'Author1' }),
        api.query({ limit: 10 }),
      ]);

      expect(results.every(isOk)).toBe(true);
    });

    it('handles concurrent integrity checks', async () => {
      const entries = [
        createValidEntryJSON('FAC-20260127-0001-AAA111', 'Entry 1', 'Body 1'),
        createValidEntryJSON('FAC-20260127-0002-BBB222', 'Entry 2', 'Body 2'),
      ];
      const ledgerPath = createTestLedger(entries);
      const api = createMemoryReadApi(ledgerPath);

      // Run multiple integrity checks concurrently
      const results = await Promise.all([
        api.verifyIntegrity(),
        api.verifyIntegrity(),
        api.verifyIntegrity(),
      ]);

      expect(results.every(isOk)).toBe(true);
      results.forEach(r => {
        if (isOk(r)) {
          expect(r.value.valid).toBe(true);
        }
      });
    });
  });

  describe('Concurrent reads with index', () => {
    it('handles concurrent reads with built index', async () => {
      const entries = [
        createValidEntryJSON('FAC-20260127-0001-AAA111', 'Entry 1', 'Body 1'),
        createValidEntryJSON('FAC-20260127-0002-BBB222', 'Entry 2', 'Body 2'),
        createValidEntryJSON('FAC-20260127-0003-CCC333', 'Entry 3', 'Body 3'),
      ];
      const ledgerPath = createTestLedger(entries);

      // Build index
      const indexResult = await buildIndex(ledgerPath);
      expect(isOk(indexResult)).toBe(true);

      if (isOk(indexResult)) {
        const api = createMemoryReadApi(ledgerPath, indexResult.value);

        // Concurrent reads with index
        const results = await Promise.all([
          api.getById(toEntryId('FAC-20260127-0001-AAA111')),
          api.getById(toEntryId('FAC-20260127-0002-BBB222')),
          api.getById(toEntryId('FAC-20260127-0003-CCC333')),
          api.exists(toEntryId('FAC-20260127-0001-AAA111')),
          api.exists(toEntryId('FAC-20260127-0004-DDD444')), // Non-existent
        ]);

        expect(isOk(results[0])).toBe(true);
        expect(isOk(results[1])).toBe(true);
        expect(isOk(results[2])).toBe(true);
        expect(isOk(results[3])).toBe(true);
        expect(isOk(results[4])).toBe(true);

        if (isOk(results[3]) && isOk(results[4])) {
          expect(results[3].value).toBe(true);
          expect(results[4].value).toBe(false);
        }
      }
    });
  });

  describe('Mixed concurrent operations', () => {
    it('handles mix of reads, queries, and hash computations', async () => {
      const entries = [
        createValidEntryJSON('FAC-20260127-0001-AAA111', 'Entry 1', 'Body 1'),
        createValidEntryJSON('FAC-20260127-0002-BBB222', 'Entry 2', 'Body 2'),
      ];
      const ledgerPath = createTestLedger(entries);
      const api = createMemoryReadApi(ledgerPath);

      const results = await Promise.all([
        api.getById(toEntryId('FAC-20260127-0001-AAA111')),
        api.query({ limit: 10 }),
        api.getLedgerHash(),
        api.countEntries(),
        api.getAllIds(),
        api.verifyIntegrity(),
      ]);

      expect(results.every(isOk)).toBe(true);
    });

    it('concurrent operations do not interfere with each other', async () => {
      const entries: string[] = [];
      for (let i = 0; i < 20; i++) {
        const id = `FAC-20260127-${String(i).padStart(4, '0')}-G${String(i).padStart(5, '0')}`;
        entries.push(createValidEntryJSON(id, `Entry ${i}`, `Body ${i}`));
      }
      const ledgerPath = createTestLedger(entries);
      const api = createMemoryReadApi(ledgerPath);

      // Run same read multiple times concurrently
      const targetId = toEntryId('FAC-20260127-0010-G00010');
      const results = await Promise.all(
        Array(10).fill(null).map(() => api.getById(targetId))
      );

      // All should return the same entry
      expect(results.every(isOk)).toBe(true);
      const values = results.filter(isOk).map(r => r.value);
      expect(values.every(v => v.id === targetId)).toBe(true);
      expect(values.every(v => v.payload.title === 'Entry 10')).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// D6 INVARIANT SUMMARY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('D6 Invariants Summary', () => {
  it('INV-D6-01: Malformed input never crashes', () => {
    const malformedInputs = [
      '',
      'not json',
      '{',
      '{"incomplete',
      null,
      undefined,
      '{"id": null}',
      '[]',
      '123',
      '"string"',
    ];

    for (const input of malformedInputs) {
      expect(() => {
        if (typeof input === 'string') {
          parseAndValidateEntry(input);
        }
      }).not.toThrow();
    }
  });

  it('INV-D6-02: Unicode handled correctly', () => {
    const unicodeStrings = [
      '🎉',
      'مرحبا',
      '日本語',
      '\u0000',
      '\uFEFF',
      '\u200B',
      '\u202E',
      '👨‍👩‍👧‍👦',
      'caf\u00E9',
      'e\u0301',
    ];

    for (const str of unicodeStrings) {
      const entry = createValidEntry('FAC-20260127-0001-AAA111', str, 'Body');
      const json = JSON.stringify(entry);
      expect(() => parseAndValidateEntry(json)).not.toThrow();
    }
  });

  it('INV-D6-03: System stable under volume', async () => {
    const entries: string[] = [];
    for (let i = 0; i < 100; i++) {
      const id = `FAC-20260127-${String(i).padStart(4, '0')}-VO${String(i).padStart(4, '0')}`;
      entries.push(createValidEntryJSON(id, `Entry ${i}`, 'B'.repeat(1000)));
    }

    const ledgerPath = createTestLedger(entries);
    const result = await scanLedger(ledgerPath);

    expect(result.entries.length).toBe(100);
    expect(result.errors.length).toBe(0);
  });

  it('INV-D6-04: Corrupted index = rebuild, not crash', async () => {
    const entries = [
      createValidEntryJSON('FAC-20260127-0001-AAA111', 'Entry', 'Body'),
    ];
    const ledgerPath = createTestLedger(entries);

    // Create corrupted index
    mkdirSync(INDEX_DIR, { recursive: true });
    writeFileSync(join(INDEX_DIR, 'index.meta.json'), 'corrupted', 'utf8');

    // Load should fail gracefully
    const loadResult = loadIndex(INDEX_DIR);
    expect(isErr(loadResult)).toBe(true);

    // Rebuild should work
    const rebuildResult = await buildIndex(ledgerPath);
    expect(isOk(rebuildResult)).toBe(true);
  });

  it('INV-D6-05: Concurrent reads are safe', async () => {
    const entries = [
      createValidEntryJSON('FAC-20260127-0001-AAA111', 'Entry', 'Body'),
    ];
    const ledgerPath = createTestLedger(entries);
    const api = createMemoryReadApi(ledgerPath);

    const results = await Promise.all(
      Array(5).fill(null).map(() => api.getById(toEntryId('FAC-20260127-0001-AAA111')))
    );

    expect(results.every(isOk)).toBe(true);
  });
});
