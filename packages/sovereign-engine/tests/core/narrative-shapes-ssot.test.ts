// tests/core/narrative-shapes-ssot.test.ts
import { describe, it, expect } from 'vitest';
import {
  NARRATIVE_SHAPES_SSOT,
  resolveAxisConflict,
  validatePromptContradictions,
  assertValidShape,
} from '../../src/core/narrative-shapes-ssot.js';

describe('INV-SHAPE-01 — SSOT NarrativeShape', () => {
  it('1. Les 5 shapes sont presentes et chargeables', () => {
    expect(Object.keys(NARRATIVE_SHAPES_SSOT)).toHaveLength(5);
    for (const key of ['ThreatReveal','Contemplative','SlowBurn','Spiral','ColdOpening']) {
      expect(NARRATIVE_SHAPES_SSOT).toHaveProperty(key);
    }
  });

  it('2. Chaque shape a les 5 champs obligatoires', () => {
    for (const shape of Object.values(NARRATIVE_SHAPES_SSOT)) {
      expect(shape).toHaveProperty('dominant_rule');
      expect(shape).toHaveProperty('active_axes');
      expect(shape).toHaveProperty('muted_axes');
      expect(shape).toHaveProperty('conflit_resolution_order');
      expect(shape).toHaveProperty('target_curve');
      expect(shape.target_curve).toHaveLength(4);
    }
  });

  it('3. target_curve valeurs dans [0,1]', () => {
    for (const shape of Object.values(NARRATIVE_SHAPES_SSOT)) {
      for (const v of shape.target_curve) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('INV-SHAPE-02 — resolveAxisConflict', () => {
  it('4. Axe ACTIVE detecte — ThreatReveal/tension_14d', () => {
    expect(resolveAxisConflict('tension_14d', 'ThreatReveal')).toBe('ACTIVE');
  });

  it('5. Axe MUTED detecte — ThreatReveal/espace_negatif', () => {
    expect(resolveAxisConflict('espace_negatif', 'ThreatReveal')).toBe('MUTED');
  });

  it('6. Axe NEUTRAL — axe non declare dans aucune liste', () => {
    expect(resolveAxisConflict('odorat_imaginaire', 'ThreatReveal')).toBe('NEUTRAL');
  });

  it('7. Contemplative: espace_negatif=ACTIVE, densite_sensorielle=MUTED', () => {
    expect(resolveAxisConflict('espace_negatif', 'Contemplative')).toBe('ACTIVE');
    expect(resolveAxisConflict('densite_sensorielle', 'Contemplative')).toBe('MUTED');
  });
});

describe('INV-SHAPE-03 — validatePromptContradictions', () => {
  it('8. Conflit detecte — instruction cible axe muted (FAIL-CLOSED)', () => {
    const r = validatePromptContradictions('ThreatReveal', ['Augmenter espace negatif au maximum']);
    expect(r.valid).toBe(false);
    expect(r.conflicts.length).toBeGreaterThan(0);
    expect(r.conflicts[0]).toContain('espace_negatif');
  });

  it('9. Aucun conflit — instructions sans axe muted', () => {
    const r = validatePromptContradictions('ThreatReveal', ['Augmenter densite sensorielle', 'Renforcer tension_14d']);
    expect(r.valid).toBe(true);
    expect(r.conflicts).toHaveLength(0);
  });

  it('10. assertValidShape throw sur shape inconnue', () => {
    expect(() => assertValidShape('ShapeInexistante')).toThrow('[INV-SHAPE-01');
    expect(() => assertValidShape('ThreatReveal')).not.toThrow();
  });
});
