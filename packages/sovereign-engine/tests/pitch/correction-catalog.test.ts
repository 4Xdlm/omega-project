/**
 * Tests for correction catalog (12 closed operations)
 */

import { describe, it, expect } from 'vitest';
import { CORRECTION_CATALOG, getOperationDescriptor, getOperationsByPrimaryAxis } from '../../src/pitch/correction-catalog.js';

describe('CORRECTION_CATALOG', () => {
  it('contient exactement 12 opérations', () => {
    expect(CORRECTION_CATALOG).toHaveLength(12);
  });

  it('chaque op a description, primary_axis, expected_delta', () => {
    for (const op of CORRECTION_CATALOG) {
      expect(op).toHaveProperty('op');
      expect(op).toHaveProperty('description');
      expect(op).toHaveProperty('primary_axis');
      expect(op).toHaveProperty('expected_delta');
      expect(op).toHaveProperty('instruction_template');
      expect(op.expected_delta).toBeGreaterThan(0);
    }
  });

  it('toutes les ops sont uniques', () => {
    const ops = CORRECTION_CATALOG.map((c) => c.op);
    const uniqueOps = new Set(ops);
    expect(uniqueOps.size).toBe(CORRECTION_CATALOG.length);
  });

  it('getOperationDescriptor retourne l\'op correcte', () => {
    const op = getOperationDescriptor('inject_sensory_detail');
    expect(op).toBeDefined();
    expect(op?.op).toBe('inject_sensory_detail');
  });

  it('getOperationsByPrimaryAxis filtre correctement', () => {
    const ops = getOperationsByPrimaryAxis('tension_14d');
    expect(ops.length).toBeGreaterThan(0);
    for (const op of ops) {
      expect(op.primary_axis).toBe('tension_14d');
    }
  });
});
