/**
 * SPEC VALIDATION TESTS
 * Phase E-SPEC — Validates specification files exist and are well-formed
 *
 * TDD: These tests define the contract BEFORE implementation
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const DRIFT_DIR = path.resolve(__dirname, '../../src/governance/drift');

describe('Phase E-SPEC Validation', () => {
  describe('Specification files exist', () => {
    const requiredSpecs = [
      'E_POLICY.json',
      'DRIFT_TYPES.spec.ts',
      'VALIDATION.spec.ts',
      'ESCALATION.spec.ts',
      'HASH_UTILS.spec.ts'
    ];

    for (const spec of requiredSpecs) {
      it(`${spec} exists`, () => {
        const filePath = path.join(DRIFT_DIR, spec);
        expect(fs.existsSync(filePath)).toBe(true);
      });
    }
  });

  describe('E_POLICY.json structure', () => {
    it('contains required policy fields', () => {
      const policyPath = path.join(DRIFT_DIR, 'E_POLICY.json');
      const policy = JSON.parse(fs.readFileSync(policyPath, 'utf-8'));

      expect(policy.policy_id).toBe('E-DRIFT-POLICY');
      expect(policy.schema_version).toBe('1.0.0');
      expect(policy.thresholds).toBeDefined();
      expect(policy.drift_types).toBeDefined();
      expect(policy.escalation_levels).toBeDefined();
      expect(policy.invariants).toBeDefined();
    });

    it('contains τ (tau) threshold values', () => {
      const policyPath = path.join(DRIFT_DIR, 'E_POLICY.json');
      const policy = JSON.parse(fs.readFileSync(policyPath, 'utf-8'));

      expect(policy.thresholds.τ_drift_warning).toBeTypeOf('number');
      expect(policy.thresholds.τ_drift_critical).toBeTypeOf('number');
      expect(policy.thresholds.τ_drift_halt).toBeTypeOf('number');
      expect(policy.thresholds.τ_max_consecutive_drifts).toBeTypeOf('number');
      expect(policy.thresholds.τ_observation_window_ms).toBeTypeOf('number');
    });

    it('defines all 5 drift types', () => {
      const policyPath = path.join(DRIFT_DIR, 'E_POLICY.json');
      const policy = JSON.parse(fs.readFileSync(policyPath, 'utf-8'));

      const expectedTypes = [
        'SCHEMA_MISMATCH',
        'HASH_DEVIATION',
        'INVARIANT_VIOLATION',
        'THRESHOLD_BREACH',
        'CHAIN_BREAK'
      ];

      expect(policy.drift_types).toEqual(expectedTypes);
    });

    it('defines all 4 escalation levels', () => {
      const policyPath = path.join(DRIFT_DIR, 'E_POLICY.json');
      const policy = JSON.parse(fs.readFileSync(policyPath, 'utf-8'));

      expect(Object.keys(policy.escalation_levels)).toEqual([
        'INFO',
        'WARNING',
        'CRITICAL',
        'HALT'
      ]);
    });

    it('contains INV-DRIFT invariants', () => {
      const policyPath = path.join(DRIFT_DIR, 'E_POLICY.json');
      const policy = JSON.parse(fs.readFileSync(policyPath, 'utf-8'));

      expect(policy.invariants.length).toBeGreaterThanOrEqual(5);
      for (const inv of policy.invariants) {
        expect(inv).toMatch(/^INV-DRIFT-\d{3}:/);
      }
    });
  });

  describe('Type specifications', () => {
    it('DRIFT_TYPES.spec.ts exports required types', async () => {
      const types = await import('../../src/governance/drift/DRIFT_TYPES.spec');

      // Type exports exist (runtime check via typeof)
      expect(types).toBeDefined();
    });

    it('VALIDATION.spec.ts exports validation constants', async () => {
      const validation = await import('../../src/governance/drift/VALIDATION.spec');

      expect(validation.VALID_DRIFT_TYPES).toBeDefined();
      expect(validation.VALID_ESCALATION_LEVELS).toBeDefined();
      expect(validation.HASH_PATTERN).toBeInstanceOf(RegExp);
      expect(validation.ISO8601_PATTERN).toBeInstanceOf(RegExp);
    });

    it('ESCALATION.spec.ts exports escalation matrix', async () => {
      const escalation = await import('../../src/governance/drift/ESCALATION.spec');

      expect(escalation.ESCALATION_MATRIX).toBeDefined();
      expect(escalation.ESCALATION_ORDER).toBeDefined();

      // INV-DRIFT-004: Chain breaks must be HALT
      expect(escalation.ESCALATION_MATRIX.CHAIN_BREAK).toBe('HALT');
    });

    it('HASH_UTILS.spec.ts exports hash constants', async () => {
      const hashUtils = await import('../../src/governance/drift/HASH_UTILS.spec');

      expect(hashUtils.HASH_LENGTH).toBe(64);
      expect(hashUtils.HASH_ALGORITHM).toBe('sha256');
      expect(hashUtils.HASH_ENCODING).toBe('hex');
    });
  });

  describe('Invariant coverage', () => {
    it('INV-DRIFT-001: Read-only requirement documented', async () => {
      const policyPath = path.join(DRIFT_DIR, 'E_POLICY.json');
      const policy = JSON.parse(fs.readFileSync(policyPath, 'utf-8'));

      const inv001 = policy.invariants.find((i: string) => i.includes('INV-DRIFT-001'));
      expect(inv001).toContain('read-only');
    });

    it('INV-DRIFT-002: Policy-driven thresholds documented', async () => {
      const policyPath = path.join(DRIFT_DIR, 'E_POLICY.json');
      const policy = JSON.parse(fs.readFileSync(policyPath, 'utf-8'));

      const inv002 = policy.invariants.find((i: string) => i.includes('INV-DRIFT-002'));
      expect(inv002).toContain('policy');
    });

    it('INV-DRIFT-003: Determinism documented', async () => {
      const policyPath = path.join(DRIFT_DIR, 'E_POLICY.json');
      const policy = JSON.parse(fs.readFileSync(policyPath, 'utf-8'));

      const inv003 = policy.invariants.find((i: string) => i.includes('INV-DRIFT-003'));
      expect(inv003).toContain('deterministic');
    });

    it('INV-DRIFT-004: Chain break escalation documented', async () => {
      const policyPath = path.join(DRIFT_DIR, 'E_POLICY.json');
      const policy = JSON.parse(fs.readFileSync(policyPath, 'utf-8'));

      const inv004 = policy.invariants.find((i: string) => i.includes('INV-DRIFT-004'));
      expect(inv004).toContain('HALT');
    });

    it('INV-DRIFT-005: Manifest reference documented', async () => {
      const policyPath = path.join(DRIFT_DIR, 'E_POLICY.json');
      const policy = JSON.parse(fs.readFileSync(policyPath, 'utf-8'));

      const inv005 = policy.invariants.find((i: string) => i.includes('INV-DRIFT-005'));
      expect(inv005).toContain('manifest_ref');
    });
  });
});
