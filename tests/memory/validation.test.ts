/**
 * OMEGA Memory System - Validation Tests
 * Phase D2 - NASA-Grade L4
 *
 * Tests for schema validation.
 */

import { describe, it, expect } from 'vitest';
import { validateEntry, parseAndValidateEntry } from '../../src/memory/validation.js';
import { isOk, isErr } from '../../src/memory/types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// VALID ENTRY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('validateEntry - valid entries', () => {
  it('accepts minimal valid entry', () => {
    const entry = {
      id: 'FAC-20260127-0001-AAA111',
      ts_utc: '2026-01-27T00:00:00Z',
      author: 'Francky',
      class: 'FACT',
      scope: 'PHASE-D/MEMORY',
      payload: {
        title: 'Test',
        body: 'Test body',
      },
      meta: {
        schema_version: '1.0',
        sealed: false,
      },
    };

    const result = validateEntry(entry);
    expect(isOk(result)).toBe(true);
  });

  it('accepts entry with all optional fields', () => {
    const entry = {
      id: 'FAC-20260127-0001-AAA111',
      ts_utc: '2026-01-27T00:00:00.123Z',
      author: 'Francky',
      class: 'FACT',
      scope: 'PHASE-D/MEMORY',
      payload: {
        title: 'Test',
        body: 'Test body',
        evidence: [
          { type: 'tag', ref: 'v1.0' },
          { type: 'commit', ref: 'abc123' },
        ],
      },
      meta: {
        schema_version: '1.0',
        sealed: true,
        tags: ['tag1', 'tag2'],
        supersedes: 'FAC-20260126-0001-AAA111',
      },
    };

    const result = validateEntry(entry);
    expect(isOk(result)).toBe(true);
  });

  it('accepts all entry classes', () => {
    const classes = ['FACT', 'DECISION', 'EVIDENCE', 'METRIC', 'NOTE'];

    for (const cls of classes) {
      const entry = {
        id: 'FAC-20260127-0001-AAA111',
        ts_utc: '2026-01-27T00:00:00Z',
        author: 'Francky',
        class: cls,
        scope: 'test',
        payload: { title: 'Test', body: 'Body' },
        meta: { schema_version: '1.0', sealed: false },
      };

      const result = validateEntry(entry);
      expect(isOk(result)).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INVALID ENTRY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('validateEntry - missing fields', () => {
  it('rejects entry without id', () => {
    const entry = {
      ts_utc: '2026-01-27T00:00:00Z',
      author: 'Francky',
      class: 'FACT',
      scope: 'test',
      payload: { title: 'Test', body: 'Body' },
      meta: { schema_version: '1.0', sealed: false },
    };

    const result = validateEntry(entry);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('MISSING_FIELD');
    }
  });

  it('rejects entry without ts_utc', () => {
    const entry = {
      id: 'FAC-20260127-0001-AAA111',
      author: 'Francky',
      class: 'FACT',
      scope: 'test',
      payload: { title: 'Test', body: 'Body' },
      meta: { schema_version: '1.0', sealed: false },
    };

    const result = validateEntry(entry);
    expect(isErr(result)).toBe(true);
  });

  it('rejects entry without payload.title', () => {
    const entry = {
      id: 'FAC-20260127-0001-AAA111',
      ts_utc: '2026-01-27T00:00:00Z',
      author: 'Francky',
      class: 'FACT',
      scope: 'test',
      payload: { body: 'Body' },
      meta: { schema_version: '1.0', sealed: false },
    };

    const result = validateEntry(entry);
    expect(isErr(result)).toBe(true);
  });

  it('rejects entry without meta.schema_version', () => {
    const entry = {
      id: 'FAC-20260127-0001-AAA111',
      ts_utc: '2026-01-27T00:00:00Z',
      author: 'Francky',
      class: 'FACT',
      scope: 'test',
      payload: { title: 'Test', body: 'Body' },
      meta: { sealed: false },
    };

    const result = validateEntry(entry);
    expect(isErr(result)).toBe(true);
  });
});

describe('validateEntry - invalid formats', () => {
  it('rejects invalid id format', () => {
    const entry = {
      id: 'invalid-id',
      ts_utc: '2026-01-27T00:00:00Z',
      author: 'Francky',
      class: 'FACT',
      scope: 'test',
      payload: { title: 'Test', body: 'Body' },
      meta: { schema_version: '1.0', sealed: false },
    };

    const result = validateEntry(entry);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('INVALID_ID_FORMAT');
    }
  });

  it('rejects invalid timestamp format', () => {
    const entry = {
      id: 'FAC-20260127-0001-AAA111',
      ts_utc: '2026-01-27',
      author: 'Francky',
      class: 'FACT',
      scope: 'test',
      payload: { title: 'Test', body: 'Body' },
      meta: { schema_version: '1.0', sealed: false },
    };

    const result = validateEntry(entry);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('INVALID_TIMESTAMP');
    }
  });

  it('rejects invalid class', () => {
    const entry = {
      id: 'FAC-20260127-0001-AAA111',
      ts_utc: '2026-01-27T00:00:00Z',
      author: 'Francky',
      class: 'INVALID',
      scope: 'test',
      payload: { title: 'Test', body: 'Body' },
      meta: { schema_version: '1.0', sealed: false },
    };

    const result = validateEntry(entry);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('INVALID_CLASS');
    }
  });

  it('rejects additional properties', () => {
    const entry = {
      id: 'FAC-20260127-0001-AAA111',
      ts_utc: '2026-01-27T00:00:00Z',
      author: 'Francky',
      class: 'FACT',
      scope: 'test',
      payload: { title: 'Test', body: 'Body' },
      meta: { schema_version: '1.0', sealed: false },
      extraField: 'not allowed',
    };

    const result = validateEntry(entry);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('SCHEMA_VIOLATION');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// JSON PARSING TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('parseAndValidateEntry', () => {
  it('parses and validates valid JSON', () => {
    const json = JSON.stringify({
      id: 'FAC-20260127-0001-AAA111',
      ts_utc: '2026-01-27T00:00:00Z',
      author: 'Francky',
      class: 'FACT',
      scope: 'test',
      payload: { title: 'Test', body: 'Body' },
      meta: { schema_version: '1.0', sealed: false },
    });

    const result = parseAndValidateEntry(json);
    expect(isOk(result)).toBe(true);
  });

  it('rejects invalid JSON', () => {
    const result = parseAndValidateEntry('{invalid json}');
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('INVALID_JSON');
    }
  });

  it('rejects valid JSON with invalid schema', () => {
    const result = parseAndValidateEntry('{"not": "an entry"}');
    expect(isErr(result)).toBe(true);
  });

  it('includes line number in error if provided', () => {
    const result = parseAndValidateEntry('invalid', 42);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.lineNumber).toBe(42);
    }
  });
});
