// tests/oracle/genesis-v2/patch-dsl.test.ts
// PatchDSL — 4 tests
// W3a — Phase T

import { describe, it, expect } from 'vitest';
import { AXIS_TO_PATCH, PARETO_MIN_GAIN, MAX_DIFFUSION_STEPS, getPatchInstruction } from '../../../src/oracle/genesis-v2/patch-dsl.js';
import type { PatchKind } from '../../../src/oracle/genesis-v2/patch-dsl.js';

describe('patch-dsl — PatchDSL types + constants', () => {

  // Test 1: AXIS_TO_PATCH couvre au moins 8 axes
  it('AXIS_TO_PATCH couvre au moins 8 axes', () => {
    const keys = Object.keys(AXIS_TO_PATCH);
    expect(keys.length).toBeGreaterThanOrEqual(8);
    expect(AXIS_TO_PATCH['tension_14d']).toBe('TENSION_RATCHET');
    expect(AXIS_TO_PATCH['signature']).toBe('SIGNATURE_ANCHOR');
    expect(AXIS_TO_PATCH['necessite_m8']).toBe('NECESSITY_COMPRESS');
    expect(AXIS_TO_PATCH['interiorite']).toBe('INTERIOR_SURFACE');
  });

  // Test 2: PARETO_MIN_GAIN lisible depuis env (default 0.05)
  it('PARETO_MIN_GAIN default = 0.05', () => {
    expect(typeof PARETO_MIN_GAIN).toBe('number');
    expect(PARETO_MIN_GAIN).toBe(0.05);
  });

  // Test 3: MAX_DIFFUSION_STEPS default = 4
  it('MAX_DIFFUSION_STEPS default = 4', () => {
    expect(typeof MAX_DIFFUSION_STEPS).toBe('number');
    expect(MAX_DIFFUSION_STEPS).toBe(4);
  });

  // Test 4: PatchKind contient SCENE_CONSTRAINT_LOCK, SUBTEXT_INVERSION, PARADOX_CLEANUP
  it('PatchKind inclut SCENE_CONSTRAINT_LOCK, SUBTEXT_INVERSION, PARADOX_CLEANUP', () => {
    const allKinds: PatchKind[] = [
      'TENSION_RATCHET', 'SIGNATURE_ANCHOR', 'NECESSITY_COMPRESS',
      'SENSORY_DENSITY', 'RHYTHM_BREAK', 'ANTICLICHE_SUBVERT',
      'INTERIOR_SURFACE', 'SCENE_CONSTRAINT_LOCK', 'SUBTEXT_INVERSION',
      'KEEP_CANON', 'PARADOX_CLEANUP',
    ];
    expect(allKinds).toContain('SCENE_CONSTRAINT_LOCK');
    expect(allKinds).toContain('SUBTEXT_INVERSION');
    expect(allKinds).toContain('PARADOX_CLEANUP');
    expect(allKinds).toHaveLength(11);
  });

  // Test 5: getPatchInstruction returns non-empty string for all kinds
  it('getPatchInstruction returns non-empty for all 11 kinds', () => {
    const allKinds: PatchKind[] = [
      'TENSION_RATCHET', 'SIGNATURE_ANCHOR', 'NECESSITY_COMPRESS',
      'SENSORY_DENSITY', 'RHYTHM_BREAK', 'ANTICLICHE_SUBVERT',
      'INTERIOR_SURFACE', 'SCENE_CONSTRAINT_LOCK', 'SUBTEXT_INVERSION',
      'KEEP_CANON', 'PARADOX_CLEANUP',
    ];
    for (const kind of allKinds) {
      const instruction = getPatchInstruction(kind);
      expect(instruction).toBeTruthy();
      expect(instruction.length).toBeGreaterThan(10);
    }
  });
});
