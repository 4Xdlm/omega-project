/**
 * Edge Cases — Special Characters Tests
 * Standard: NASA-Grade L4
 *
 * Tests for handling special characters, unicode, and edge-case strings.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { AtlasStore } from '../../nexus/atlas/src/index.js';
import { RawStorage, MemoryBackend } from '../../nexus/raw/src/index.js';

// ============================================================
// Atlas Special Characters
// ============================================================

describe('Edge Cases — Atlas Special Characters', () => {
  let store: AtlasStore;

  beforeEach(() => {
    store = new AtlasStore({
      clock: { now: () => Date.now() },
    });
  });

  test('handles unicode in view IDs', () => {
    const unicodeIds = [
      'emoji-🎉-test',
      '中文-chinese',
      'العربية-arabic',
      'עברית-hebrew',
      'ελληνικά-greek',
      '日本語-japanese',
      '한국어-korean',
      'русский-russian',
    ];

    for (const id of unicodeIds) {
      store.insert(id, { name: id });
    }

    expect(store.size()).toBe(unicodeIds.length);

    for (const id of unicodeIds) {
      const view = store.get(id);
      expect(view).toBeDefined();
      expect(view!.id).toBe(id);
    }
  });

  test('handles unicode in data values', () => {
    const view = store.insert('unicode-data', {
      emoji: '🎉🚀💻🔥',
      chinese: '你好世界',
      arabic: 'مرحبا بالعالم',
      japanese: 'こんにちは世界',
      mixed: 'Hello 世界 🌍 مرحبا',
    });

    const retrieved = store.get('unicode-data');
    expect(retrieved).toBeDefined();
    expect(retrieved!.data.emoji).toBe('🎉🚀💻🔥');
    expect(retrieved!.data.chinese).toBe('你好世界');
    expect(retrieved!.data.arabic).toBe('مرحبا بالعالم');
  });

  test('handles special characters in IDs', () => {
    const specialIds = [
      'with spaces in id',
      'with-dashes',
      'with_underscores',
      'with.dots',
      'with:colons',
      'with@at',
      'with#hash',
      'with$dollar',
      'with%percent',
    ];

    for (const id of specialIds) {
      store.insert(id, { name: id });
    }

    expect(store.size()).toBe(specialIds.length);

    for (const id of specialIds) {
      expect(store.get(id)).toBeDefined();
    }
  });

  test('handles escape sequences in data', () => {
    const view = store.insert('escape-chars', {
      newline: 'line1\nline2',
      tab: 'col1\tcol2',
      carriage: 'text\rmore',
      backslash: 'path\\to\\file',
      quotes: 'say "hello"',
      singleQuotes: "it's working",
      mixed: 'line1\nline2\twith\ttabs',
    });

    const retrieved = store.get('escape-chars');
    expect(retrieved!.data.newline).toBe('line1\nline2');
    expect(retrieved!.data.tab).toBe('col1\tcol2');
    expect(retrieved!.data.quotes).toBe('say "hello"');
  });

  test('handles very long IDs (200 characters)', () => {
    const longId = 'x'.repeat(200);
    store.insert(longId, { name: 'long id test' });

    const retrieved = store.get(longId);
    expect(retrieved).toBeDefined();
    expect(retrieved!.id.length).toBe(200);
  });

  test('handles very long string values', () => {
    const longValue = 'y'.repeat(10000);
    store.insert('long-value', { content: longValue });

    const retrieved = store.get('long-value');
    expect(retrieved!.data.content).toBe(longValue);
  });

  test('handles empty string ID', () => {
    // Empty string is technically valid
    store.insert('', { name: 'empty id' });

    const retrieved = store.get('');
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe('');
  });

  test('handles null and undefined values in data', () => {
    store.insert('null-values', {
      nullValue: null,
      undefinedValue: undefined,
      normalValue: 'normal',
    });

    const retrieved = store.get('null-values');
    expect(retrieved!.data.nullValue).toBeNull();
    expect(retrieved!.data.undefinedValue).toBeUndefined();
    expect(retrieved!.data.normalValue).toBe('normal');
  });

  test('handles numeric field names', () => {
    store.insert('numeric-fields', {
      '0': 'zero',
      '1': 'one',
      '123': 'one-two-three',
    });

    const retrieved = store.get('numeric-fields');
    expect(retrieved!.data['0']).toBe('zero');
    expect(retrieved!.data['123']).toBe('one-two-three');
  });
});

// ============================================================
// Raw Special Characters
// ============================================================

describe('Edge Cases — Raw Special Characters', () => {
  let storage: RawStorage;

  beforeEach(() => {
    storage = new RawStorage({
      backend: new MemoryBackend({ maxSize: 100 * 1024 * 1024 }),
      clock: { now: () => Date.now() },
    });
  });

  test('handles unicode in keys', async () => {
    const unicodeKeys = [
      'emoji-🎉-test',
      '中文-key',
      'مفتاح-عربي',
      'キー-japanese',
    ];

    for (const key of unicodeKeys) {
      await storage.store(key, Buffer.from(`data for ${key}`));
    }

    for (const key of unicodeKeys) {
      const data = await storage.retrieve(key);
      expect(data.toString()).toBe(`data for ${key}`);
    }
  });

  test('handles binary data with all byte values', async () => {
    // Create buffer with all possible byte values (0-255)
    const allBytes = Buffer.alloc(256);
    for (let i = 0; i < 256; i++) {
      allBytes[i] = i;
    }

    await storage.store('all-bytes', allBytes);

    const retrieved = await storage.retrieve('all-bytes');
    expect(retrieved.length).toBe(256);
    for (let i = 0; i < 256; i++) {
      expect(retrieved[i]).toBe(i);
    }
  });

  test('handles null bytes in data', async () => {
    const dataWithNulls = Buffer.from([0x00, 0x01, 0x00, 0x02, 0x00]);
    await storage.store('null-bytes', dataWithNulls);

    const retrieved = await storage.retrieve('null-bytes');
    expect(retrieved).toEqual(dataWithNulls);
  });

  test('handles UTF-8 encoded data', async () => {
    const utf8Strings = [
      'Hello, 世界!',
      'مرحبا بالعالم',
      '🎉🚀💻🔥',
      'Привет мир',
    ];

    for (let i = 0; i < utf8Strings.length; i++) {
      const data = Buffer.from(utf8Strings[i], 'utf-8');
      await storage.store(`utf8-${i}`, data);
    }

    for (let i = 0; i < utf8Strings.length; i++) {
      const retrieved = await storage.retrieve(`utf8-${i}`);
      expect(retrieved.toString('utf-8')).toBe(utf8Strings[i]);
    }
  });

  test('handles very long keys (200 characters)', async () => {
    const longKey = 'k'.repeat(200);
    await storage.store(longKey, Buffer.from('data'));

    const retrieved = await storage.retrieve(longKey);
    expect(retrieved.toString()).toBe('data');
  });

  test('handles keys with special filesystem characters', async () => {
    // Note: These might be sanitized by the backend
    const specialKeys = [
      'key-with-spaces',
      'key_with_underscores',
      'key.with.dots',
      'key-with-dashes',
    ];

    for (const key of specialKeys) {
      await storage.store(key, Buffer.from(`value-${key}`));
    }

    for (const key of specialKeys) {
      const exists = await storage.exists(key);
      expect(exists).toBe(true);
    }
  });

  test('handles JSON with special characters', async () => {
    const jsonData = {
      unicode: '中文 🎉',
      escaped: 'line1\nline2\ttab',
      quotes: '"quoted"',
      backslash: '\\path\\to\\file',
    };

    const buffer = Buffer.from(JSON.stringify(jsonData), 'utf-8');
    await storage.store('json-special', buffer);

    const retrieved = await storage.retrieve('json-special');
    const parsed = JSON.parse(retrieved.toString('utf-8'));

    expect(parsed.unicode).toBe('中文 🎉');
    expect(parsed.escaped).toBe('line1\nline2\ttab');
    expect(parsed.quotes).toBe('"quoted"');
  });

  test('preserves binary data exactly', async () => {
    // Random binary data
    const binaryData = Buffer.from([
      0xDE, 0xAD, 0xBE, 0xEF, 0x00, 0xFF, 0x12, 0x34,
      0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0,
    ]);

    await storage.store('binary', binaryData);

    const retrieved = await storage.retrieve('binary');
    expect(retrieved).toEqual(binaryData);
  });
});

// ============================================================
// Query with Special Characters
// ============================================================

describe('Edge Cases — Query with Special Characters', () => {
  let store: AtlasStore;

  beforeEach(() => {
    store = new AtlasStore({
      clock: { now: () => Date.now() },
    });

    // Insert test data
    store.insert('1', { category: 'cat-1', name: 'Hello 世界' });
    store.insert('2', { category: 'cat-2', name: 'emoji 🎉 test' });
    store.insert('3', { category: 'cat-1', name: 'normal text' });
  });

  test('filters by unicode value', () => {
    const result = store.query({
      filter: { field: 'name', operator: 'eq', value: 'Hello 世界' },
    });

    expect(result.total).toBe(1);
    expect(result.views[0].id).toBe('1');
  });

  test('contains filter with unicode', () => {
    const result = store.query({
      filter: { field: 'name', operator: 'contains', value: '世界' },
    });

    expect(result.total).toBe(1);
  });

  test('contains filter with emoji', () => {
    const result = store.query({
      filter: { field: 'name', operator: 'contains', value: '🎉' },
    });

    expect(result.total).toBe(1);
    expect(result.views[0].id).toBe('2');
  });
});
