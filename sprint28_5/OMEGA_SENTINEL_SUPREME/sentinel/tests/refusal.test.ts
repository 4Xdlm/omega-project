/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — REFUSAL MODULE TESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module tests/refusal.test
 * @version 2.0.0
 * 
 * INVARIANTS TESTED:
 * - INV-REF-01: Every refusal has a code and reason
 * - INV-REF-02: Refusal codes are unique within category
 * - INV-REF-03: Axiom violations produce CRITICAL refusals
 * - INV-REF-04: Refusals are immutable after creation
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';

import {
  createRefusal,
  createAxiomRefusal,
  createCustomRefusal,
  getRefusalDefinition,
  getAllRefusalDefinitions,
  getRefusalsByCategory,
  getRefusalsBySeverity,
  getCriticalRefusals,
  countRefusalDefinitions,
  hasBlockingRefusals,
  allRecoverable,
  getHighestSeverity,
  groupRefusalsByCategory,
  getAllRemediations,
  success,
  failure,
  refuseWith,
  isRefusalCode,
  isRefusalCategory,
  isRefusalSeverity,
  formatRefusal,
  generateRefusalSummary,
  type Refusal,
  type RefusalCode,
  type RefusalCategory,
  type RefusalSeverity
} from '../refusal/engine.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: REFUSAL REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

describe('Refusal Registry', () => {
  
  describe('INV-REF-01: Every Refusal Has Code and Reason', () => {
    
    it('should have non-empty definitions', () => {
      const count = countRefusalDefinitions();
      expect(count).toBeGreaterThan(0);
    });
    
    it('every definition should have code', () => {
      const definitions = getAllRefusalDefinitions();
      for (const def of definitions) {
        expect(def.code).toBeDefined();
        expect(def.code).toMatch(/^REF-[A-Z]{3}-\d{3}$/);
      }
    });
    
    it('every definition should have description template', () => {
      const definitions = getAllRefusalDefinitions();
      for (const def of definitions) {
        expect(def.descriptionTemplate).toBeDefined();
        expect(def.descriptionTemplate.length).toBeGreaterThan(0);
      }
    });
    
    it('every definition should have category', () => {
      const definitions = getAllRefusalDefinitions();
      for (const def of definitions) {
        expect(def.category).toBeDefined();
        expect(isRefusalCategory(def.category)).toBe(true);
      }
    });
    
    it('every definition should have severity', () => {
      const definitions = getAllRefusalDefinitions();
      for (const def of definitions) {
        expect(def.severity).toBeDefined();
        expect(isRefusalSeverity(def.severity)).toBe(true);
      }
    });
    
  });
  
  describe('INV-REF-02: Unique Codes', () => {
    
    it('should have no duplicate codes', () => {
      const definitions = getAllRefusalDefinitions();
      const codes = definitions.map(d => d.code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });
    
    it('should have codes matching pattern REF-XXX-NNN', () => {
      const definitions = getAllRefusalDefinitions();
      for (const def of definitions) {
        expect(def.code).toMatch(/^REF-[A-Z]{3}-\d{3}$/);
      }
    });
    
  });
  
  describe('INV-REF-03: Axiom Violations Are CRITICAL', () => {
    
    it('should have AXIOM category refusals', () => {
      const axiomRefusals = getRefusalsByCategory('AXIOM');
      expect(axiomRefusals.length).toBeGreaterThan(0);
    });
    
    it('all axiom refusals should be CRITICAL', () => {
      const axiomRefusals = getRefusalsByCategory('AXIOM');
      for (const refusal of axiomRefusals) {
        expect(refusal.severity).toBe('CRITICAL');
      }
    });
    
    it('axiom refusals should reference related axiom', () => {
      const axiomRefusals = getRefusalsByCategory('AXIOM');
      for (const refusal of axiomRefusals) {
        expect(refusal.relatedAxiom).toBeDefined();
      }
    });
    
    it('should have 5 axiom refusals (one per axiom)', () => {
      const axiomRefusals = getRefusalsByCategory('AXIOM');
      expect(axiomRefusals.length).toBe(5);
    });
    
  });
  
  describe('Categories', () => {
    
    it('should have all expected categories', () => {
      const categories: RefusalCategory[] = [
        'AXIOM', 'VALIDATION', 'COVERAGE', 'STRENGTH', 
        'INTEGRITY', 'EXTERNAL', 'POLICY'
      ];
      
      for (const category of categories) {
        const refusals = getRefusalsByCategory(category);
        expect(refusals.length).toBeGreaterThan(0);
      }
    });
    
    it('getRefusalsByCategory should filter correctly', () => {
      const validationRefusals = getRefusalsByCategory('VALIDATION');
      for (const def of validationRefusals) {
        expect(def.category).toBe('VALIDATION');
      }
    });
    
  });
  
  describe('Severities', () => {
    
    it('should have refusals of different severities', () => {
      const severities: RefusalSeverity[] = ['INFO', 'WARNING', 'ERROR', 'CRITICAL'];
      
      let foundSeverities = 0;
      for (const severity of severities) {
        const refusals = getRefusalsBySeverity(severity);
        if (refusals.length > 0) foundSeverities++;
      }
      
      expect(foundSeverities).toBeGreaterThan(1);
    });
    
    it('getCriticalRefusals should return CRITICAL only', () => {
      const critical = getCriticalRefusals();
      for (const def of critical) {
        expect(def.severity).toBe('CRITICAL');
      }
    });
    
  });
  
  describe('Remediations', () => {
    
    it('every definition should have remediations', () => {
      const definitions = getAllRefusalDefinitions();
      for (const def of definitions) {
        expect(def.remediations).toBeDefined();
        expect(Array.isArray(def.remediations)).toBe(true);
      }
    });
    
    it('most definitions should have non-empty remediations', () => {
      const definitions = getAllRefusalDefinitions();
      const withRemediations = definitions.filter(d => d.remediations.length > 0);
      expect(withRemediations.length).toBeGreaterThan(definitions.length / 2);
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: REFUSAL CREATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Refusal Creation', () => {
  
  describe('createRefusal', () => {
    
    it('should create refusal from code', () => {
      const refusal = createRefusal('REF-VAL-001' as RefusalCode, { id: 'TEST' });
      
      expect(refusal.code).toBe('REF-VAL-001');
      expect(refusal.category).toBe('VALIDATION');
      expect(refusal.title).toBeDefined();
      expect(refusal.reason).toContain('TEST');
    });
    
    it('should fill template with context', () => {
      const refusal = createRefusal('REF-VAL-002' as RefusalCode, { hash: 'abc123' });
      
      expect(refusal.reason).toContain('abc123');
    });
    
    it('should set timestamp', () => {
      const refusal = createRefusal('REF-VAL-001' as RefusalCode);
      
      expect(refusal.timestamp).toBeDefined();
      expect(refusal.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
    
    it('should throw for unknown code', () => {
      expect(() => {
        createRefusal('REF-XXX-999' as RefusalCode);
      }).toThrow('Unknown refusal code');
    });
    
    it('INV-REF-04: refusal should be frozen', () => {
      const refusal = createRefusal('REF-VAL-001' as RefusalCode);
      expect(Object.isFrozen(refusal)).toBe(true);
    });
    
  });
  
  describe('createAxiomRefusal', () => {
    
    it('should create refusal for AX-Ω', () => {
      const refusal = createAxiomRefusal('AX-Ω', 'Cannot be falsified');
      
      expect(refusal.code).toBe('REF-AXI-001');
      expect(refusal.severity).toBe('CRITICAL');
      expect(refusal.relatedAxiom).toBe('AX-Ω');
      expect(refusal.reason).toContain('Cannot be falsified');
    });
    
    it('should create refusal for all axioms', () => {
      const axioms = ['AX-Ω', 'AX-Λ', 'AX-Σ', 'AX-Δ', 'AX-Ε'] as const;
      
      for (const axiomId of axioms) {
        const refusal = createAxiomRefusal(axiomId, 'Test reason');
        expect(refusal.relatedAxiom).toBe(axiomId);
        expect(refusal.severity).toBe('CRITICAL');
      }
    });
    
    it('should throw for unknown axiom', () => {
      expect(() => {
        createAxiomRefusal('AX-Z' as any, 'Reason');
      }).toThrow('Unknown axiom');
    });
    
  });
  
  describe('createCustomRefusal', () => {
    
    it('should create custom refusal', () => {
      const refusal = createCustomRefusal(
        'POLICY',
        'WARNING',
        'Custom Issue',
        'This is a custom reason',
        ['Fix it'],
        true
      );
      
      expect(refusal.category).toBe('POLICY');
      expect(refusal.severity).toBe('WARNING');
      expect(refusal.title).toBe('Custom Issue');
      expect(refusal.reason).toBe('This is a custom reason');
      expect(refusal.recoverable).toBe(true);
    });
    
    it('should have code format REF-XXX-999', () => {
      const refusal = createCustomRefusal('VALIDATION', 'ERROR', 'Test', 'Test');
      expect(refusal.code).toMatch(/^REF-[A-Z]{3}-999$/);
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: REFUSAL ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Refusal Analysis', () => {
  
  describe('hasBlockingRefusals', () => {
    
    it('should return true for ERROR refusals', () => {
      const refusals = [createRefusal('REF-VAL-001' as RefusalCode)];
      expect(hasBlockingRefusals(refusals)).toBe(true);
    });
    
    it('should return true for CRITICAL refusals', () => {
      const refusals = [createAxiomRefusal('AX-Ω', 'Test')];
      expect(hasBlockingRefusals(refusals)).toBe(true);
    });
    
    it('should return false for empty array', () => {
      expect(hasBlockingRefusals([])).toBe(false);
    });
    
    it('should return false for only WARNING', () => {
      const refusals = [createCustomRefusal('POLICY', 'WARNING', 'Test', 'Test')];
      expect(hasBlockingRefusals(refusals)).toBe(false);
    });
    
  });
  
  describe('allRecoverable', () => {
    
    it('should return true if all recoverable', () => {
      const refusals = [
        createRefusal('REF-VAL-001' as RefusalCode),
        createRefusal('REF-COV-001' as RefusalCode)
      ];
      expect(allRecoverable(refusals)).toBe(true);
    });
    
    it('should return false if any non-recoverable', () => {
      const refusals = [
        createRefusal('REF-INT-001' as RefusalCode) // Hash verification - non-recoverable
      ];
      expect(allRecoverable(refusals)).toBe(false);
    });
    
    it('should return true for empty array', () => {
      expect(allRecoverable([])).toBe(true);
    });
    
  });
  
  describe('getHighestSeverity', () => {
    
    it('should return null for empty array', () => {
      expect(getHighestSeverity([])).toBeNull();
    });
    
    it('should return CRITICAL if any CRITICAL', () => {
      const refusals = [
        createRefusal('REF-VAL-001' as RefusalCode), // ERROR
        createAxiomRefusal('AX-Ω', 'Test') // CRITICAL
      ];
      expect(getHighestSeverity(refusals)).toBe('CRITICAL');
    });
    
    it('should return ERROR if highest is ERROR', () => {
      const refusals = [createRefusal('REF-VAL-001' as RefusalCode)];
      expect(getHighestSeverity(refusals)).toBe('ERROR');
    });
    
    it('should return WARNING if highest is WARNING', () => {
      const refusals = [createCustomRefusal('POLICY', 'WARNING', 'T', 'T')];
      expect(getHighestSeverity(refusals)).toBe('WARNING');
    });
    
  });
  
  describe('groupRefusalsByCategory', () => {
    
    it('should group correctly', () => {
      const refusals = [
        createRefusal('REF-VAL-001' as RefusalCode),
        createRefusal('REF-VAL-002' as RefusalCode),
        createRefusal('REF-COV-001' as RefusalCode)
      ];
      
      const grouped = groupRefusalsByCategory(refusals);
      
      expect(grouped.get('VALIDATION')).toHaveLength(2);
      expect(grouped.get('COVERAGE')).toHaveLength(1);
    });
    
    it('should return empty map for empty array', () => {
      const grouped = groupRefusalsByCategory([]);
      expect(grouped.size).toBe(0);
    });
    
  });
  
  describe('getAllRemediations', () => {
    
    it('should collect unique remediations', () => {
      const refusals = [
        createRefusal('REF-VAL-001' as RefusalCode),
        createRefusal('REF-VAL-002' as RefusalCode)
      ];
      
      const remediations = getAllRemediations(refusals);
      expect(remediations.length).toBeGreaterThan(0);
      
      // Should be unique
      const unique = new Set(remediations);
      expect(unique.size).toBe(remediations.length);
    });
    
    it('should return empty for no refusals', () => {
      expect(getAllRemediations([])).toHaveLength(0);
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: RESULT HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Result Helpers', () => {
  
  describe('success', () => {
    
    it('should create success result', () => {
      const result = success(42);
      
      expect(result.success).toBe(true);
      expect(result.value).toBe(42);
      expect(result.refusals).toHaveLength(0);
    });
    
    it('should work with objects', () => {
      const result = success({ name: 'test' });
      
      expect(result.success).toBe(true);
      expect(result.value).toEqual({ name: 'test' });
    });
    
  });
  
  describe('failure', () => {
    
    it('should create failure result', () => {
      const refusals = [createRefusal('REF-VAL-001' as RefusalCode)];
      const result = failure<number>(refusals);
      
      expect(result.success).toBe(false);
      expect(result.value).toBeNull();
      expect(result.refusals).toHaveLength(1);
    });
    
  });
  
  describe('refuseWith', () => {
    
    it('should create failure with single refusal', () => {
      const result = refuseWith<number>('REF-VAL-001' as RefusalCode, { id: 'TEST' });
      
      expect(result.success).toBe(false);
      expect(result.refusals).toHaveLength(1);
      expect(result.refusals[0].code).toBe('REF-VAL-001');
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Type Guards', () => {
  
  describe('isRefusalCode', () => {
    
    it('should return true for valid codes', () => {
      expect(isRefusalCode('REF-VAL-001')).toBe(true);
      expect(isRefusalCode('REF-AXI-005')).toBe(true);
    });
    
    it('should return false for invalid codes', () => {
      expect(isRefusalCode('INVALID')).toBe(false);
      expect(isRefusalCode('REF-INVALID')).toBe(false);
      expect(isRefusalCode('REF-VA-001')).toBe(false); // Only 2 letters
      expect(isRefusalCode(123)).toBe(false);
    });
    
  });
  
  describe('isRefusalCategory', () => {
    
    it('should return true for valid categories', () => {
      expect(isRefusalCategory('AXIOM')).toBe(true);
      expect(isRefusalCategory('VALIDATION')).toBe(true);
      expect(isRefusalCategory('COVERAGE')).toBe(true);
    });
    
    it('should return false for invalid categories', () => {
      expect(isRefusalCategory('INVALID')).toBe(false);
      expect(isRefusalCategory(123)).toBe(false);
    });
    
  });
  
  describe('isRefusalSeverity', () => {
    
    it('should return true for valid severities', () => {
      expect(isRefusalSeverity('INFO')).toBe(true);
      expect(isRefusalSeverity('WARNING')).toBe(true);
      expect(isRefusalSeverity('ERROR')).toBe(true);
      expect(isRefusalSeverity('CRITICAL')).toBe(true);
    });
    
    it('should return false for invalid severities', () => {
      expect(isRefusalSeverity('INVALID')).toBe(false);
      expect(isRefusalSeverity('FATAL')).toBe(false);
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: DOCUMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Documentation', () => {
  
  describe('formatRefusal', () => {
    
    it('should format refusal as string', () => {
      const refusal = createRefusal('REF-VAL-001' as RefusalCode, { id: 'TEST' });
      const formatted = formatRefusal(refusal);
      
      expect(formatted).toContain('REF-VAL-001');
      expect(formatted).toContain('ERROR'); // Severity
      expect(formatted).toContain('Reason:');
    });
    
    it('should include remediations', () => {
      const refusal = createRefusal('REF-VAL-001' as RefusalCode);
      const formatted = formatRefusal(refusal);
      
      expect(formatted).toContain('Remediations:');
    });
    
    it('should include related axiom if present', () => {
      const refusal = createAxiomRefusal('AX-Ω', 'Test');
      const formatted = formatRefusal(refusal);
      
      expect(formatted).toContain('AX-Ω');
    });
    
  });
  
  describe('generateRefusalSummary', () => {
    
    it('should generate summary for empty array', () => {
      const summary = generateRefusalSummary([]);
      expect(summary).toBe('No refusals.');
    });
    
    it('should generate summary with count', () => {
      const refusals = [
        createRefusal('REF-VAL-001' as RefusalCode),
        createRefusal('REF-VAL-002' as RefusalCode)
      ];
      const summary = generateRefusalSummary(refusals);
      
      expect(summary).toContain('Refusals: 2');
    });
    
    it('should include severity info', () => {
      const refusals = [createAxiomRefusal('AX-Ω', 'Test')];
      const summary = generateRefusalSummary(refusals);
      
      expect(summary).toContain('CRITICAL');
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: DETERMINISM
// ═══════════════════════════════════════════════════════════════════════════════

describe('Determinism', () => {
  
  it('getAllRefusalDefinitions should be deterministic', () => {
    const defs1 = getAllRefusalDefinitions();
    const defs2 = getAllRefusalDefinitions();
    
    expect(defs1.length).toBe(defs2.length);
    for (let i = 0; i < defs1.length; i++) {
      expect(defs1[i].code).toBe(defs2[i].code);
    }
  });
  
  it('createRefusal should produce consistent structure', () => {
    const ref1 = createRefusal('REF-VAL-001' as RefusalCode, { id: 'X' });
    const ref2 = createRefusal('REF-VAL-001' as RefusalCode, { id: 'X' });
    
    expect(ref1.code).toBe(ref2.code);
    expect(ref1.category).toBe(ref2.category);
    expect(ref1.severity).toBe(ref2.severity);
    expect(ref1.title).toBe(ref2.title);
    expect(ref1.reason).toBe(ref2.reason);
  });
  
});
