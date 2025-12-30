import { describe, expect, test } from 'vitest';
import {
  BACKUP_SUFFIX,
  CURRENT_SCHEMA_VERSION,
  EVENTS_DIR,
  IntegritySchema,
  JOURNAL_DIR,
  LOCK_FILENAME,
  LockFileSchema,
  OmegaProjectSchema,
  PROJECT_FILENAME,
  ProjectMetaSchema,
  ProjectWithoutIntegritySchema,
  QUARANTINE_DIR,
  QuarantineMetaSchema,
  RunRecordSchema,
  RunSummarySchema,
  TMP_SUFFIX,
} from './types';

function isoNow(): string {
  return new Date().toISOString();
}

function sha256Hex(): string {
  return 'a'.repeat(64); // valid 64 hex
}

describe('types.ts ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â constants', () => {
  test('constants have expected values', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe('1.0.0');
    expect(PROJECT_FILENAME).toBe('omega.json');
    expect(LOCK_FILENAME).toBe('.omega.lock');
    expect(BACKUP_SUFFIX).toBe('.backup');
    expect(TMP_SUFFIX).toBe('.tmp');

    expect(EVENTS_DIR).toBe('events');
    expect(QUARANTINE_DIR).toBe('_quarantine');
    expect(JOURNAL_DIR).toBe('journal');
  });
});

describe('types.ts ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â IntegritySchema', () => {
  test('accepts valid integrity block', () => {
    const obj = { sha256: sha256Hex(), computed_at: isoNow() };
    expect(() => IntegritySchema.parse(obj)).not.toThrow();
  });

  test('rejects invalid sha256', () => {
    const obj = { sha256: 'not-a-hash', computed_at: isoNow() };
    expect(() => IntegritySchema.parse(obj)).toThrow();
  });

  test('rejects invalid computed_at datetime', () => {
    const obj = { sha256: sha256Hex(), computed_at: 'yesterday' };
    expect(() => IntegritySchema.parse(obj)).toThrow();
  });
});

describe('types.ts ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ProjectMetaSchema', () => {
  test('accepts valid project meta', () => {
    const obj = {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'My Project',
      author: 'Francky',
      description: 'test',
      created_at: isoNow(),
      updated_at: isoNow(),
    };
    expect(() => ProjectMetaSchema.parse(obj)).not.toThrow();
  });

  test('accepts optional fields missing', () => {
    const obj = {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'My Project',
      created_at: isoNow(),
      updated_at: isoNow(),
    };
    expect(() => ProjectMetaSchema.parse(obj)).not.toThrow();
  });

  test('rejects empty name', () => {
    const obj = {
      id: '11111111-1111-1111-1111-111111111111',
      name: '',
      created_at: isoNow(),
      updated_at: isoNow(),
    };
    expect(() => ProjectMetaSchema.parse(obj)).toThrow();
  });

  test('rejects invalid uuid', () => {
    const obj = {
      id: 'not-a-uuid',
      name: 'Ok',
      created_at: isoNow(),
      updated_at: isoNow(),
    };
    expect(() => ProjectMetaSchema.parse(obj)).toThrow();
  });
});

describe('types.ts ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â RunSummarySchema', () => {
  test('accepts any record values', () => {
    const obj = { a: 1, b: 'x', c: { nested: true }, d: null };
    expect(() => RunSummarySchema.parse(obj)).not.toThrow();
  });

  test('rejects non-record', () => {
    expect(() => RunSummarySchema.parse('nope')).toThrow();
    expect(() => RunSummarySchema.parse(123)).toThrow();
    expect(() => RunSummarySchema.parse(null)).toThrow();
  });
});

describe('types.ts ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â RunRecordSchema', () => {
  test('accepts valid run record', () => {
    const obj = {
      run_id: '22222222-2222-2222-2222-222222222222',
      timestamp: isoNow(),
      events_path: 'events/run_1',
      summary: { ok: true },
    };
    expect(() => RunRecordSchema.parse(obj)).not.toThrow();
  });

  test('rejects invalid run_id', () => {
    const obj = {
      run_id: 'bad',
      timestamp: isoNow(),
      events_path: 'events/run_1',
      summary: {},
    };
    expect(() => RunRecordSchema.parse(obj)).toThrow();
  });

  test('rejects invalid timestamp', () => {
    const obj = {
      run_id: '22222222-2222-2222-2222-222222222222',
      timestamp: 'now',
      events_path: 'events/run_1',
      summary: {},
    };
    expect(() => RunRecordSchema.parse(obj)).toThrow();
  });
});

describe('types.ts ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â OmegaProjectSchema', () => {
  test('accepts valid project', () => {
    const obj = {
      schema_version: CURRENT_SCHEMA_VERSION,
      integrity: { sha256: sha256Hex(), computed_at: isoNow() },
      meta: {
        id: '33333333-3333-3333-3333-333333333333',
        name: 'Omega',
        created_at: isoNow(),
        updated_at: isoNow(),
      },
      state: { anything: 123 },
      runs: [
        {
          run_id: '44444444-4444-4444-4444-444444444444',
          timestamp: isoNow(),
          events_path: 'events/run_1',
          summary: { ok: true },
        },
      ],
    };

    expect(() => OmegaProjectSchema.parse(obj)).not.toThrow();
  });

  test('rejects wrong schema_version', () => {
    const obj = {
      schema_version: '9.9.9',
      integrity: { sha256: sha256Hex(), computed_at: isoNow() },
      meta: {
        id: '33333333-3333-3333-3333-333333333333',
        name: 'Omega',
        created_at: isoNow(),
        updated_at: isoNow(),
      },
      state: {},
      runs: [],
    };

    expect(() => OmegaProjectSchema.parse(obj)).toThrow();
  });

  test('rejects missing integrity', () => {
    const obj = {
      schema_version: CURRENT_SCHEMA_VERSION,
      meta: {
        id: '33333333-3333-3333-3333-333333333333',
        name: 'Omega',
        created_at: isoNow(),
        updated_at: isoNow(),
      },
      state: {},
      runs: [],
    };

    expect(() => OmegaProjectSchema.parse(obj)).toThrow();
  });
});

describe('types.ts ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ProjectWithoutIntegritySchema', () => {
  test('accepts project without integrity', () => {
    const obj = {
      schema_version: CURRENT_SCHEMA_VERSION,
      meta: {
        id: '55555555-5555-5555-5555-555555555555',
        name: 'Omega',
        created_at: isoNow(),
        updated_at: isoNow(),
      },
      state: {},
      runs: [],
    };

    expect(() => ProjectWithoutIntegritySchema.parse(obj)).not.toThrow();
  });

  test('still enforces schema_version literal', () => {
    const obj = {
      schema_version: 'nope',
      meta: {
        id: '55555555-5555-5555-5555-555555555555',
        name: 'Omega',
        created_at: isoNow(),
        updated_at: isoNow(),
      },
      state: {},
      runs: [],
    };

    expect(() => ProjectWithoutIntegritySchema.parse(obj)).toThrow();
  });
});

describe('types.ts ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â LockFileSchema', () => {
  test('accepts valid lock file', () => {
    const obj = {
      pid: 1234,
      hostname: 'machine',
      acquired_at: isoNow(),
      ttl_seconds: 60,
    };

    expect(() => LockFileSchema.parse(obj)).not.toThrow();
  });

  test('rejects non-positive pid', () => {
    const obj = { pid: 0, hostname: 'x', acquired_at: isoNow(), ttl_seconds: 60 };
    expect(() => LockFileSchema.parse(obj)).toThrow();
  });

  test('rejects non-positive ttl_seconds', () => {
    const obj = { pid: 1, hostname: 'x', acquired_at: isoNow(), ttl_seconds: 0 };
    expect(() => LockFileSchema.parse(obj)).toThrow();
  });
});

describe('types.ts ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â QuarantineMetaSchema', () => {
  test('accepts valid quarantine meta', () => {
    const obj = {
      original_path: 'some/file.json',
      quarantined_at: isoNow(),
      reason: 'bad checksum',
      original_size: 0,
    };

    expect(() => QuarantineMetaSchema.parse(obj)).not.toThrow();
  });

  test('rejects negative original_size', () => {
    const obj = {
      original_path: 'some/file.json',
      quarantined_at: isoNow(),
      reason: 'bad checksum',
      original_size: -1,
    };

    expect(() => QuarantineMetaSchema.parse(obj)).toThrow();
  });
});
