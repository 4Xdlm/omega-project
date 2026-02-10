/**
 * OMEGA Runner — Intent Validator Tests
 * Hardening Sprint H1 — NCR-G1B-001
 *
 * ≥40 tests covering V-01→V-05 (structural) and S-01→S-05 (security)
 */

import { describe, it, expect } from 'vitest';
import { validateIntent } from '../../src/validation/intent-validator.js';
import type { IntentValidationResult } from '../../src/validation/intent-validator.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function validSimplified(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title: 'A valid title',
    premise: 'A lone explorer discovers a hidden library',
    themes: ['discovery', 'knowledge'],
    core_emotion: 'wonder',
    paragraphs: 5,
    ...overrides,
  };
}

function hasRule(result: IntentValidationResult, rule: string): boolean {
  return result.errors.some(e => e.rule === rule);
}

// ─── GROUPE 1 — Format simplifié rejeté (TF-2 fix) ──────────────────────────

describe('GROUPE 1 — Simplified format rejected (TF-2)', () => {
  it('rejects simplified format with V-06 error', () => {
    const result = validateIntent(validSimplified());
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'V-06')).toBe(true);
  });

  it('rejects even well-formed simplified intent', () => {
    const result = validateIntent(validSimplified({ paragraphs: 1 }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'V-06')).toBe(true);
  });

  it('V-06 error message mentions IntentPack', () => {
    const result = validateIntent(validSimplified());
    const v06 = result.errors.find(e => e.rule === 'V-06');
    expect(v06).toBeDefined();
    expect(v06!.message).toContain('IntentPack');
  });

  it('returns format = simplified even when rejected', () => {
    const result = validateIntent(validSimplified());
    expect(result.format).toBe('simplified');
  });
});

// ─── GROUPE 2 — Simplified format always rejected (V-01→V-05 no longer tested individually) ──

describe('GROUPE 2 — Simplified format always rejected via V-06', () => {
  it('rejects simplified even with invalid title (V-06 takes precedence)', () => {
    const result = validateIntent(validSimplified({ title: '' }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'V-06')).toBe(true);
  });

  it('rejects simplified even with missing title', () => {
    const obj = validSimplified();
    delete obj['title'];
    const result = validateIntent(obj);
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'V-06')).toBe(true);
  });

  it('rejects simplified with bad premise', () => {
    const result = validateIntent(validSimplified({ premise: '' }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'V-06')).toBe(true);
  });

  it('rejects simplified with bad themes', () => {
    const result = validateIntent(validSimplified({ themes: [] }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'V-06')).toBe(true);
  });

  it('rejects simplified with bad core_emotion', () => {
    const result = validateIntent(validSimplified({ core_emotion: '' }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'V-06')).toBe(true);
  });

  it('rejects simplified with bad paragraphs', () => {
    const result = validateIntent(validSimplified({ paragraphs: 0 }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'V-06')).toBe(true);
  });
});

// ─── GROUPE 3 — Simplified format rejected before security checks ────────────

describe('GROUPE 3 — Simplified always rejected (V-06 preempts S-01→S-05)', () => {
  it('rejects simplified with XSS in title (V-06)', () => {
    const result = validateIntent(validSimplified({ title: 'Hello <script>alert(1)</script>' }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'V-06')).toBe(true);
  });

  it('rejects simplified with path traversal (V-06)', () => {
    const result = validateIntent(validSimplified({ title: '../../etc/passwd' }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'V-06')).toBe(true);
  });

  it('rejects simplified with SQL injection (V-06)', () => {
    const result = validateIntent(validSimplified({ title: "'; DROP TABLE users;--" }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'V-06')).toBe(true);
  });

  it('rejects simplified with control char (V-06)', () => {
    const result = validateIntent(validSimplified({ title: 'Hello\u0000World' }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'V-06')).toBe(true);
  });

  it('rejects simplified with zero-width char (V-06)', () => {
    const result = validateIntent(validSimplified({ title: 'Normal\u200BTitle' }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'V-06')).toBe(true);
  });
});

// ─── GROUPE 4 — Format formel IntentPack ─────────────────────────────────────

describe('GROUPE 4 — Formal format IntentPack', () => {
  function validFormal(): Record<string, unknown> {
    return {
      intent: { goal: 'test' },
      canon: { entries: [] },
      constraints: {},
      genome: {},
      emotion: {},
      metadata: { pack_id: 'test-id', pack_version: '1.0.0' },
    };
  }

  it('accepts a valid formal IntentPack', () => {
    const result = validateIntent(validFormal());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns format = formal', () => {
    const result = validateIntent(validFormal());
    expect(result.format).toBe('formal');
  });

  it('rejects formal without metadata.pack_id', () => {
    const obj = validFormal();
    (obj['metadata'] as Record<string, unknown>)['pack_id'] = '';
    const result = validateIntent(obj);
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'V-F1')).toBe(true);
  });

  it('rejects formal without metadata.pack_version', () => {
    const obj = validFormal();
    (obj['metadata'] as Record<string, unknown>)['pack_version'] = '';
    const result = validateIntent(obj);
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'V-F2')).toBe(true);
  });

  it('rejects formal with non-object intent', () => {
    const obj = validFormal();
    obj['intent'] = 'not-an-object';
    const result = validateIntent(obj);
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'V-F3')).toBe(true);
  });
});

// ─── GROUPE 5 — Cas limites ──────────────────────────────────────────────────

describe('GROUPE 5 — Edge cases', () => {
  it('rejects null', () => {
    const result = validateIntent(null);
    expect(result.valid).toBe(false);
    expect(result.format).toBe('unknown');
    expect(hasRule(result, 'V-00')).toBe(true);
  });

  it('rejects undefined', () => {
    const result = validateIntent(undefined);
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'V-00')).toBe(true);
  });

  it('rejects an array', () => {
    const result = validateIntent([1, 2, 3]);
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'V-00')).toBe(true);
  });

  it('rejects a string', () => {
    const result = validateIntent('hello');
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'V-00')).toBe(true);
  });

  it('rejects a number', () => {
    const result = validateIntent(42);
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'V-00')).toBe(true);
  });

  it('rejects {} (empty object) — format = unknown', () => {
    const result = validateIntent({});
    expect(result.valid).toBe(false);
    expect(result.format).toBe('unknown');
    expect(hasRule(result, 'V-00')).toBe(true);
  });

  it('simplified format produces exactly one V-06 error (no short-circuit into V-01→V-05)', () => {
    const result = validateIntent({
      title: '',
      premise: '',
      themes: [],
      core_emotion: '',
      paragraphs: -1,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(1);
    expect(hasRule(result, 'V-06')).toBe(true);
  });
});

// ─── GROUPE 6 — Déterminisme ─────────────────────────────────────────────────

describe('GROUPE 6 — Determinism', () => {
  it('same input produces same result (10 calls)', () => {
    const input = validSimplified();
    const first = validateIntent(input);
    for (let i = 0; i < 10; i++) {
      const result = validateIntent(input);
      expect(result.valid).toBe(first.valid);
      expect(result.format).toBe(first.format);
      expect(result.errors.length).toBe(first.errors.length);
    }
  });

  it('result contains no timestamp or random values', () => {
    const result = validateIntent(validSimplified());
    const json = JSON.stringify(result);
    // No Date patterns
    expect(json).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
    // No UUID patterns
    expect(json).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/);
  });
});

// ─── GROUPE 7 — Simplified format with bad themes (V-06 preempts) ────────────

describe('GROUPE 7 — Simplified always rejected (V-06 preempts theme security)', () => {
  it('rejects simplified with XSS in themes (V-06)', () => {
    const result = validateIntent(validSimplified({ themes: ['<script>'] }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'V-06')).toBe(true);
  });

  it('rejects simplified with SQL injection in themes (V-06)', () => {
    const result = validateIntent(validSimplified({ themes: ['DROP TABLE x'] }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'V-06')).toBe(true);
  });

  it('rejects simplified with zero-width in themes (V-06)', () => {
    const result = validateIntent(validSimplified({ themes: ['test\u200B'] }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'V-06')).toBe(true);
  });
});
