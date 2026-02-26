/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TESTS — INV-FORENSIC-01
 * Module: tests/core/forensic-types.test.ts
 * Cible: 5 tests PASS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import {
  createEmptyForensicData,
  recordForensicRollback,
  validateForensicData,
  isRollback,
} from '../../src/core/forensic-types.js';

// ─────────────────────────────────────────────────────────────────────────────
// INV-FORENSIC-01
// ─────────────────────────────────────────────────────────────────────────────

describe('INV-FORENSIC-01 — Rollback Forensic Logger', () => {
  it('T01: createEmptyForensicData retourne structure vide valide', () => {
    const fd = createEmptyForensicData();
    expect(fd.rollback_count).toBe(0);
    expect(fd.rollbacks).toHaveLength(0);
    expect(() => validateForensicData(fd)).not.toThrow();
  });

  it('T02: rollback détecté — isRollback true quand candidat < courant', () => {
    expect(isRollback(85.0, 82.0)).toBe(true);
    expect(isRollback(85.0, 85.0)).toBe(false); // égal = pas un rollback
    expect(isRollback(85.0, 90.0)).toBe(false); // amélioration = pas un rollback
  });

  it('T03: recordForensicRollback — trigger_axes non vide avec axes régressifs', () => {
    const fd = createEmptyForensicData();

    recordForensicRollback(fd, {
      pass_index: 0,
      scores_before: { tension_14d: 0.75, interiorite: 0.80, rythme: 0.70 },
      scores_after:  { tension_14d: 0.65, interiorite: 0.78, rythme: 0.80 }, // tension et interiorite régressent
      composite_before: 85.0,
      composite_after: 82.0,
      judge_latency_ms: 120,
      cache_hit: false,
    });

    expect(fd.rollback_count).toBe(1);
    expect(fd.rollbacks).toHaveLength(1);

    const entry = fd.rollbacks[0];
    // INV-FORENSIC-01: trigger_axes non vide sur run avec rollback
    expect(entry).toBeDefined();
    expect(entry!.trigger_axes.length).toBeGreaterThan(0);

    // Seuls les axes avec delta < 0 sont dans trigger_axes
    for (const a of entry!.trigger_axes) {
      expect(a.delta).toBeLessThan(0);
    }
  });

  it('T04: rollback complet — tous les champs ForensicRollbackEntry présents', () => {
    const fd = createEmptyForensicData();

    recordForensicRollback(fd, {
      pass_index: 1,
      scores_before: { tension_14d: 0.90 },
      scores_after: { tension_14d: 0.60 },
      composite_before: 93.0,
      composite_after: 88.0,
      judge_latency_ms: 250,
      cache_hit: true,
    });

    const entry = fd.rollbacks[0];
    expect(entry).toBeDefined();
    expect(typeof entry!.pass_index).toBe('number');
    expect(typeof entry!.delta_composite).toBe('number');
    expect(Array.isArray(entry!.trigger_axes)).toBe(true);
    expect(typeof entry!.judge_latency_ms).toBe('number');
    expect(typeof entry!.cache_hit).toBe('boolean');

    // delta_composite doit être négatif (régression)
    expect(entry!.delta_composite).toBeLessThan(0);
    expect(entry!.judge_latency_ms).toBe(250);
    expect(entry!.cache_hit).toBe(true);
  });

  it('T05: validateForensicData — throw si structure invalide (FAIL-CLOSED)', () => {
    expect(() => validateForensicData(null)).toThrow('[INV-FORENSIC-01]');
    expect(() => validateForensicData({})).toThrow('[INV-FORENSIC-01]');
    expect(() => validateForensicData({ rollback_count: 0 })).toThrow('[INV-FORENSIC-01]');
    expect(() => validateForensicData({ rollback_count: 0, rollbacks: 'not-an-array' })).toThrow('[INV-FORENSIC-01]');
  });
});
