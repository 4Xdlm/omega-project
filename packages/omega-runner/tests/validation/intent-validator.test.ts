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

// ─── GROUPE 1 — Format simplifié valide ──────────────────────────────────────

describe('GROUPE 1 — Simplified format valid', () => {
  it('accepts a minimal valid intent', () => {
    const result = validateIntent(validSimplified());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts paragraphs = 1 (lower bound)', () => {
    const result = validateIntent(validSimplified({ paragraphs: 1 }));
    expect(result.valid).toBe(true);
  });

  it('accepts paragraphs = 1000 (upper bound)', () => {
    const result = validateIntent(validSimplified({ paragraphs: 1000 }));
    expect(result.valid).toBe(true);
  });

  it('returns format = simplified', () => {
    const result = validateIntent(validSimplified());
    expect(result.format).toBe('simplified');
  });
});

// ─── GROUPE 2 — Règles structurelles V-01→V-05 ──────────────────────────────

describe('GROUPE 2 — Structural rules V-01→V-05', () => {
  // V-01: title
  it('V-01: rejects empty title', () => {
    const result = validateIntent(validSimplified({ title: '' }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'V-01')).toBe(true);
  });

  it('V-01: rejects missing title', () => {
    const obj = validSimplified();
    delete obj['title'];
    const result = validateIntent(obj);
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'V-01')).toBe(true);
  });

  it('V-01: rejects title > 500 chars', () => {
    const result = validateIntent(validSimplified({ title: 'x'.repeat(501) }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'V-01')).toBe(true);
  });

  it('V-01: rejects title non-string (number)', () => {
    const result = validateIntent(validSimplified({ title: 42 }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'V-01')).toBe(true);
  });

  // V-02: premise
  it('V-02: rejects empty premise', () => {
    const result = validateIntent(validSimplified({ premise: '' }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'V-02')).toBe(true);
  });

  it('V-02: rejects premise > 2000 chars', () => {
    const result = validateIntent(validSimplified({ premise: 'y'.repeat(2001) }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'V-02')).toBe(true);
  });

  // V-03: themes
  it('V-03: rejects empty themes ([])', () => {
    const result = validateIntent(validSimplified({ themes: [] }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'V-03')).toBe(true);
  });

  it('V-03: rejects themes non-array', () => {
    const result = validateIntent(validSimplified({ themes: 'not-array' }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'V-03')).toBe(true);
  });

  it('V-03: rejects themes with > 20 elements', () => {
    const themes = Array.from({ length: 21 }, (_, i) => `theme${i}`);
    const result = validateIntent(validSimplified({ themes }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'V-03')).toBe(true);
  });

  it('V-03: rejects theme element > 100 chars', () => {
    const result = validateIntent(validSimplified({ themes: ['x'.repeat(101)] }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'V-03')).toBe(true);
  });

  it('V-03: rejects themes with non-string element', () => {
    const result = validateIntent(validSimplified({ themes: [42] }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'V-03')).toBe(true);
  });

  // V-04: core_emotion
  it('V-04: rejects empty core_emotion', () => {
    const result = validateIntent(validSimplified({ core_emotion: '' }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'V-04')).toBe(true);
  });

  it('V-04: rejects missing core_emotion', () => {
    const obj = validSimplified();
    delete obj['core_emotion'];
    const result = validateIntent(obj);
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'V-04')).toBe(true);
  });

  // V-05: paragraphs
  it('V-05: rejects paragraphs = 0', () => {
    const result = validateIntent(validSimplified({ paragraphs: 0 }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'V-05')).toBe(true);
  });

  it('V-05: rejects paragraphs = -1', () => {
    const result = validateIntent(validSimplified({ paragraphs: -1 }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'V-05')).toBe(true);
  });

  it('V-05: rejects paragraphs = 999999', () => {
    const result = validateIntent(validSimplified({ paragraphs: 999999 }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'V-05')).toBe(true);
  });

  it('V-05: rejects paragraphs non-integer (3.5)', () => {
    const result = validateIntent(validSimplified({ paragraphs: 3.5 }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'V-05')).toBe(true);
  });

  it('V-05: rejects paragraphs non-number ("five")', () => {
    const result = validateIntent(validSimplified({ paragraphs: 'five' }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'V-05')).toBe(true);
  });
});

// ─── GROUPE 3 — Règles sécurité S-01→S-05 ───────────────────────────────────

describe('GROUPE 3 — Security rules S-01→S-05', () => {
  // S-01: XSS
  it('S-01: rejects <script> in title', () => {
    const result = validateIntent(validSimplified({ title: 'Hello <script>alert(1)</script>' }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'S-01')).toBe(true);
  });

  it('S-01: rejects <SCRIPT> in premise (case-insensitive)', () => {
    const result = validateIntent(validSimplified({ premise: 'Test <SCRIPT>alert(1)</SCRIPT>' }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'S-01')).toBe(true);
  });

  // S-02: Path traversal
  it('S-02: rejects ../ in title', () => {
    const result = validateIntent(validSimplified({ title: '../../etc/passwd' }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'S-02')).toBe(true);
  });

  it('S-02: rejects ..\\ in core_emotion', () => {
    const result = validateIntent(validSimplified({ core_emotion: '..\\windows\\system32' }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'S-02')).toBe(true);
  });

  // S-03: SQL injection
  it('S-03: rejects DROP TABLE in title', () => {
    const result = validateIntent(validSimplified({ title: "'; DROP TABLE users;--" }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'S-03')).toBe(true);
  });

  it('S-03: rejects DELETE FROM in premise', () => {
    const result = validateIntent(validSimplified({ premise: 'DELETE FROM users WHERE 1=1' }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'S-03')).toBe(true);
  });

  // S-04: Control characters
  it('S-04: rejects null byte (U+0000) in title', () => {
    const result = validateIntent(validSimplified({ title: 'Hello\u0000World' }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'S-04')).toBe(true);
  });

  // S-05: Zero-width characters
  it('S-05: rejects zero-width space (U+200B) in title', () => {
    const result = validateIntent(validSimplified({ title: 'Normal\u200BTitle' }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'S-05')).toBe(true);
  });

  it('S-05: rejects RTL override (U+202E) in title', () => {
    const result = validateIntent(validSimplified({ title: 'Normal\u202ETitle' }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'S-05')).toBe(true);
  });

  it('S-05: rejects BOM (U+FEFF) in premise', () => {
    const result = validateIntent(validSimplified({ premise: '\uFEFFA story about nothing' }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'S-05')).toBe(true);
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

  it('accumulates multiple errors (no short-circuit)', () => {
    const result = validateIntent({
      title: '',
      premise: '',
      themes: [],
      core_emotion: '',
      paragraphs: -1,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(5);
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
    const result = validateIntent(validSimplified({ title: '<script>xss' }));
    const json = JSON.stringify(result);
    // No Date patterns
    expect(json).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
    // No UUID patterns
    expect(json).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/);
  });
});

// ─── GROUPE 7 — Security in themes array ─────────────────────────────────────

describe('GROUPE 7 — Security rules in array fields', () => {
  it('S-01: rejects <script> in themes element', () => {
    const result = validateIntent(validSimplified({ themes: ['<script>'] }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'S-01')).toBe(true);
  });

  it('S-03: rejects SQL injection in themes element', () => {
    const result = validateIntent(validSimplified({ themes: ['DROP TABLE x'] }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'S-03')).toBe(true);
  });

  it('S-05: rejects zero-width chars in themes element', () => {
    const result = validateIntent(validSimplified({ themes: ['test\u200B'] }));
    expect(result.valid).toBe(false);
    expect(hasRule(result, 'S-05')).toBe(true);
  });
});
