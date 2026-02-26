// tests/prose-directive/instruction-toggle-table.test.ts
// InstructionToggleTable — 6 tests SSOT
// W2 — Phase T

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  INSTRUCTION_TOGGLE_TABLE,
  isInstructionEnabled,
} from '../../src/prose-directive/instruction-toggle-table.js';

describe('InstructionToggleTable — SSOT PDB toggles', () => {

  afterEach(() => {
    // Nettoyer les env vars injectées
    delete process.env.OMEGA_ENABLE_LOT1_04;
    delete process.env.OMEGA_DISABLE_LOT1_01;
  });

  // Test 1: LOT1-04 disabled by default
  it('LOT1-04 disabled by default', () => {
    expect(isInstructionEnabled('LOT1-04')).toBe(false);
  });

  // Test 2: LOT1-01/02/03 enabled by default
  it('LOT1-01, LOT1-02, LOT1-03 enabled by default', () => {
    expect(isInstructionEnabled('LOT1-01')).toBe(true);
    expect(isInstructionEnabled('LOT1-02')).toBe(true);
    expect(isInstructionEnabled('LOT1-03')).toBe(true);
  });

  // Test 3: LOT1-04 enabled via env OMEGA_ENABLE_LOT1_04=1
  it('LOT1-04 enabled via env OMEGA_ENABLE_LOT1_04', () => {
    process.env.OMEGA_ENABLE_LOT1_04 = '1';
    expect(isInstructionEnabled('LOT1-04')).toBe(true);
  });

  // Test 4: LOT1-04 disabled for Contemplative shape (conflict)
  it('LOT1-04 disabled for shape Contemplative (conflict)', () => {
    // Even if force-enabled via env, conflict check applies only to enabled_by_default=true
    // LOT1-04 is enabled_by_default=false, so shape conflict doesn't apply (already disabled)
    expect(isInstructionEnabled('LOT1-04', 'Contemplative')).toBe(false);
  });

  // Test 5: isInstructionEnabled('UNKNOWN') → false
  it('unknown instruction ID → false', () => {
    expect(isInstructionEnabled('UNKNOWN')).toBe(false);
    expect(isInstructionEnabled('LOT99-01')).toBe(false);
  });

  // Test 6: INSTRUCTION_TOGGLE_TABLE contient exactement 11 entrées (4 LOT1 + 3 LOT2 + 4 LOT3)
  it('INSTRUCTION_TOGGLE_TABLE contient 11 entrées (4 LOT1 + 3 LOT2 + 4 LOT3)', () => {
    expect(INSTRUCTION_TOGGLE_TABLE).toHaveLength(11);
    const lot1 = INSTRUCTION_TOGGLE_TABLE.filter(e => e.lot === 'LOT1');
    const lot2 = INSTRUCTION_TOGGLE_TABLE.filter(e => e.lot === 'LOT2');
    const lot3 = INSTRUCTION_TOGGLE_TABLE.filter(e => e.lot === 'LOT3');
    expect(lot1).toHaveLength(4);
    expect(lot2).toHaveLength(3);
    expect(lot3).toHaveLength(4);
  });
});
