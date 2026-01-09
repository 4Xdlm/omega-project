/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — CRYSTAL MODULE TESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module tests/crystal.test
 * @version 2.0.0
 * 
 * INVARIANTS TESTED:
 * - INV-IDL-01: Grammar version is immutable
 * - INV-IDL-02: All required fields are validated
 * - INV-IDL-03: Invariant IDs follow strict pattern
 * - INV-IDL-04: Proof strengths are from valid set
 * - INV-IDL-05: Lineage forms a DAG (no cycles)
 * - INV-VAL-01: All required fields must be present
 * - INV-VAL-02: Field patterns must match
 * - INV-CRYST-01: Crystallization produces valid SHA-256 hash
 * - INV-CRYST-02: Computed fields are deterministically derived
 * - INV-CRYST-03: Append operations never modify existing data
 * - INV-LIN-01: Lineage forms a DAG
 * - INV-LIN-02: Generation = max(parent generations) + 1
 * - INV-LIN-03: Root invariants have generation 0
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Grammar imports
import {
  GRAMMAR_VERSION,
  MIN_SUPPORTED_VERSION,
  GRAMMAR_SCHEMA,
  PROOF_TYPES,
  isProofType,
  isValidInvariantId,
  isValidTimestamp,
  isValidHash,
  generateGrammarDoc,
  generateInvariantTemplate
} from '../crystal/grammar.js';

// Validator imports
import {
  validateInvariant,
  validateDocument,
  isValidInvariant,
  getErrors,
  getWarnings,
  formatValidationResult,
  ValidationCodes
} from '../crystal/validator.js';

// Crystallizer imports
import {
  computeInvariantHash,
  verifyInvariantHash,
  computeDerivedFields,
  crystallize,
  addProof,
  addImpossibility,
  hasProofs,
  hasImpossibilities,
  getStrongestProof,
  meetsMinStrength,
  toJSON,
  createTestProof,
  createFormalProof
} from '../crystal/crystallizer.js';

// Lineage imports
import {
  buildLineageGraph,
  validateLineage,
  getAncestors,
  getDescendants,
  isAncestor,
  topologicalSort,
  calculateGeneration,
  createLineage,
  createRootLineage,
  getGraphStats
} from '../crystal/lineage.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: GRAMMAR
// ═══════════════════════════════════════════════════════════════════════════════

describe('Crystal Grammar', () => {
  
  describe('INV-IDL-01: Grammar Version Immutability', () => {
    
    it('should have version 2.0.0', () => {
      expect(GRAMMAR_VERSION).toBe('2.0.0');
    });
    
    it('should have minimum supported version', () => {
      expect(MIN_SUPPORTED_VERSION).toBe('2.0.0');
    });
    
    it('should have frozen schema', () => {
      expect(Object.isFrozen(GRAMMAR_SCHEMA)).toBe(true);
    });
    
  });
  
  describe('Proof Types', () => {
    
    it('should have 6 proof types', () => {
      expect(PROOF_TYPES).toHaveLength(6);
    });
    
    it('should include all expected types', () => {
      expect(PROOF_TYPES).toContain('test');
      expect(PROOF_TYPES).toContain('adversarial');
      expect(PROOF_TYPES).toContain('formal');
      expect(PROOF_TYPES).toContain('architectural');
      expect(PROOF_TYPES).toContain('exhaustive');
      expect(PROOF_TYPES).toContain('statistical');
    });
    
    it('isProofType should validate correctly', () => {
      expect(isProofType('test')).toBe(true);
      expect(isProofType('formal')).toBe(true);
      expect(isProofType('invalid')).toBe(false);
      expect(isProofType(123)).toBe(false);
    });
    
  });
  
  describe('INV-IDL-03: ID Pattern Validation', () => {
    
    it('should accept valid invariant IDs', () => {
      expect(isValidInvariantId('INV-AX-01')).toBe(true);
      expect(isValidInvariantId('INV-AUTH-001')).toBe(true);
      expect(isValidInvariantId('INV-PROOF-0001')).toBe(true);
    });
    
    it('should reject invalid invariant IDs', () => {
      expect(isValidInvariantId('AX-01')).toBe(false);
      expect(isValidInvariantId('INV-A-1')).toBe(false);
      expect(isValidInvariantId('inv-ax-01')).toBe(false);
      expect(isValidInvariantId('')).toBe(false);
    });
    
  });
  
  describe('Timestamp Validation', () => {
    
    it('should accept valid ISO timestamps', () => {
      expect(isValidTimestamp('2026-01-06T00:00:00Z')).toBe(true);
      expect(isValidTimestamp('2026-12-31T23:59:59Z')).toBe(true);
    });
    
    it('should reject invalid timestamps', () => {
      expect(isValidTimestamp('2026-01-06')).toBe(false);
      expect(isValidTimestamp('not-a-date')).toBe(false);
    });
    
  });
  
  describe('Hash Validation', () => {
    
    it('should accept valid SHA-256 hashes', () => {
      const validHash = 'a'.repeat(64);
      expect(isValidHash(validHash)).toBe(true);
    });
    
    it('should reject invalid hashes', () => {
      expect(isValidHash('a'.repeat(63))).toBe(false);
      expect(isValidHash('A'.repeat(64))).toBe(false);
    });
    
  });
  
  describe('Documentation Generation', () => {
    
    it('should generate grammar documentation', () => {
      const doc = generateGrammarDoc();
      expect(doc).toContain('IDL CRYSTALLINE');
      expect(doc).toContain('IMMUTABLE');
      expect(doc).toContain('APPEND_ONLY');
    });
    
    it('should generate invariant template', () => {
      const template = generateInvariantTemplate('INV-TEST-01', 'auth.login');
      expect(template).toContain('INV-TEST-01');
      expect(template).toContain('auth.login');
      expect(template).toContain('IDL Crystalline');  // Comment header
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: VALIDATOR
// ═══════════════════════════════════════════════════════════════════════════════

describe('Crystal Validator', () => {
  
  describe('INV-VAL-01: Required Field Validation', () => {
    
    it('should fail for null input', () => {
      const result = validateInvariant(null);
      expect(result.isValid).toBe(false);
      expect(result.errorCount).toBeGreaterThan(0);
    });
    
    it('should fail for missing ID', () => {
      const result = validateInvariant({
        crystallized_at: '2026-01-06T00:00:00Z',
        crystallized_hash: 'a'.repeat(64),
        lineage: { parents: [], generation: 0 },
        property: { natural: 'Test property statement', scope: 'test' },
        proofs: [],
        impossibilities: []
      });
      expect(result.isValid).toBe(false);
      expect(getErrors(result).some(e => e.code === ValidationCodes.REQUIRED_FIELD_MISSING)).toBe(true);
    });
    
    it('should fail for missing property', () => {
      const result = validateInvariant({
        id: 'INV-TEST-01',
        crystallized_at: '2026-01-06T00:00:00Z',
        crystallized_hash: 'a'.repeat(64),
        lineage: { parents: [], generation: 0 },
        proofs: [],
        impossibilities: []
      });
      expect(result.isValid).toBe(false);
    });
    
  });
  
  describe('INV-VAL-02: Pattern Validation', () => {
    
    it('should fail for invalid ID format', () => {
      const result = validateInvariant({
        id: 'invalid-id',
        crystallized_at: '2026-01-06T00:00:00Z',
        crystallized_hash: 'a'.repeat(64),
        lineage: { parents: [], generation: 0 },
        property: { natural: 'Test property statement', scope: 'test' },
        proofs: [],
        impossibilities: []
      });
      expect(result.isValid).toBe(false);
      expect(getErrors(result).some(e => e.code === ValidationCodes.INVALID_ID_FORMAT)).toBe(true);
    });
    
    it('should fail for invalid hash format', () => {
      const result = validateInvariant({
        id: 'INV-TEST-01',
        crystallized_at: '2026-01-06T00:00:00Z',
        crystallized_hash: 'invalid-hash',
        lineage: { parents: [], generation: 0 },
        property: { natural: 'Test property statement', scope: 'test' },
        proofs: [],
        impossibilities: []
      });
      expect(result.isValid).toBe(false);
      expect(getErrors(result).some(e => e.code === ValidationCodes.INVALID_HASH_FORMAT)).toBe(true);
    });
    
  });
  
  describe('Valid Invariant', () => {
    
    it('should pass for valid invariant', () => {
      const result = validateInvariant({
        id: 'INV-TEST-01',
        crystallized_at: '2026-01-06T00:00:00Z',
        crystallized_hash: 'a'.repeat(64),
        lineage: { parents: [], generation: 0 },
        property: { 
          natural: 'Test property statement that is long enough', 
          formal: '∀x: test(x)',
          scope: 'test' 
        },
        proofs: [{
          type: 'test',
          strength: 'Ε',
          evidence: { file: 'test.ts', case: 'test_case' },
          added_at: '2026-01-06T00:00:00Z'
        }],
        impossibilities: ['CANNOT leak data']
      });
      expect(result.isValid).toBe(true);
      expect(result.errorCount).toBe(0);
    });
    
  });
  
  describe('isValidInvariant', () => {
    
    it('should return boolean', () => {
      expect(typeof isValidInvariant({})).toBe('boolean');
    });
    
  });
  
  describe('formatValidationResult', () => {
    
    it('should format result as string', () => {
      const result = validateInvariant({});
      const formatted = formatValidationResult(result);
      expect(typeof formatted).toBe('string');
      expect(formatted).toContain('INVALID');
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: CRYSTALLIZER
// ═══════════════════════════════════════════════════════════════════════════════

describe('Crystallizer', () => {
  
  describe('INV-CRYST-01: Hash Computation', () => {
    
    it('should produce 64-character hex hash', () => {
      const hash = computeInvariantHash(
        'INV-TEST-01',
        { natural: 'Test statement', scope: 'test' },
        { parents: [], generation: 0 },
        '2026-01-06T00:00:00Z'
      );
      expect(hash).toHaveLength(64);
      expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true);
    });
    
    it('should produce same hash for same input (determinism)', () => {
      const input = {
        id: 'INV-TEST-01',
        property: { natural: 'Test statement', scope: 'test' },
        lineage: { parents: [] as string[], generation: 0 },
        timestamp: '2026-01-06T00:00:00Z'
      };
      
      const hash1 = computeInvariantHash(
        input.id, input.property, input.lineage, input.timestamp
      );
      const hash2 = computeInvariantHash(
        input.id, input.property, input.lineage, input.timestamp
      );
      
      expect(hash1).toBe(hash2);
    });
    
    it('should produce different hash for different input', () => {
      const property = { natural: 'Test statement', scope: 'test' };
      const lineage = { parents: [] as string[], generation: 0 };
      const timestamp = '2026-01-06T00:00:00Z';
      
      const hash1 = computeInvariantHash('INV-TEST-01', property, lineage, timestamp);
      const hash2 = computeInvariantHash('INV-TEST-02', property, lineage, timestamp);
      
      expect(hash1).not.toBe(hash2);
    });
    
  });
  
  describe('Crystallization', () => {
    
    it('should create valid invariant', () => {
      const result = crystallize({
        id: 'INV-TEST-01',
        property: {
          natural: 'Test invariant statement that is long enough',
          scope: 'test.module'
        }
      });
      
      expect(result.invariant).toBeDefined();
      expect(result.invariant.id).toBe('INV-TEST-01');
      expect(result.hash).toHaveLength(64);
    });
    
    it('should set correct lineage for root', () => {
      const result = crystallize({
        id: 'INV-TEST-01',
        property: { natural: 'Test statement long enough', scope: 'test' }
      });
      
      expect(result.invariant.lineage.parents).toHaveLength(0);
      expect(result.invariant.lineage.generation).toBe(0);
    });
    
    it('should set generation > 0 for child', () => {
      const result = crystallize({
        id: 'INV-TEST-02',
        property: { natural: 'Test statement long enough', scope: 'test' },
        parents: ['INV-TEST-01']
      });
      
      expect(result.invariant.lineage.parents).toContain('INV-TEST-01');
      expect(result.invariant.lineage.generation).toBeGreaterThan(0);
    });
    
    it('should verify hash after crystallization', () => {
      const result = crystallize({
        id: 'INV-TEST-01',
        property: { natural: 'Test statement long enough', scope: 'test' }
      });
      
      expect(verifyInvariantHash(result.invariant)).toBe(true);
    });
    
  });
  
  describe('INV-CRYST-02: Computed Fields', () => {
    
    it('should compute dominant strength correctly', () => {
      const result = crystallize({
        id: 'INV-TEST-01',
        property: { natural: 'Test statement long enough', scope: 'test' },
        proofs: [
          createTestProof('test.ts', 'case1'),  // Ε
          createFormalProof('Z3', 'theorem.smt2')  // Λ
        ]
      });
      
      expect(result.invariant.computed.dominant_strength).toBe('Λ');
    });
    
    it('should count proofs correctly', () => {
      const result = crystallize({
        id: 'INV-TEST-01',
        property: { natural: 'Test statement long enough', scope: 'test' },
        proofs: [
          createTestProof('test.ts', 'case1'),
          createTestProof('test.ts', 'case2')
        ]
      });
      
      expect(result.invariant.computed.proof_count).toBe(2);
    });
    
    it('should count impossibilities correctly', () => {
      const result = crystallize({
        id: 'INV-TEST-01',
        property: { natural: 'Test statement long enough', scope: 'test' },
        impossibilities: ['CANNOT leak', 'CANNOT corrupt']
      });
      
      expect(result.invariant.computed.impossible_count).toBe(2);
    });
    
  });
  
  describe('INV-CRYST-03: Append Operations', () => {
    
    it('should add proof without modifying original', () => {
      const original = crystallize({
        id: 'INV-TEST-01',
        property: { natural: 'Test statement long enough', scope: 'test' }
      }).invariant;
      
      const modified = addProof(original, createTestProof('test.ts', 'new_case'));
      
      expect(original.proofs).toHaveLength(0);
      expect(modified.proofs).toHaveLength(1);
    });
    
    it('should add impossibility without modifying original', () => {
      const original = crystallize({
        id: 'INV-TEST-01',
        property: { natural: 'Test statement long enough', scope: 'test' }
      }).invariant;
      
      const modified = addImpossibility(original, 'CANNOT leak');
      
      expect(original.impossibilities).toHaveLength(0);
      expect(modified.impossibilities).toHaveLength(1);
    });
    
    it('should not duplicate impossibilities', () => {
      let inv = crystallize({
        id: 'INV-TEST-01',
        property: { natural: 'Test statement long enough', scope: 'test' }
      }).invariant;
      
      inv = addImpossibility(inv, 'CANNOT leak');
      inv = addImpossibility(inv, 'CANNOT leak');  // Duplicate
      
      expect(inv.impossibilities).toHaveLength(1);
    });
    
  });
  
  describe('Query Functions', () => {
    
    it('hasProofs should return correct value', () => {
      const withProofs = crystallize({
        id: 'INV-TEST-01',
        property: { natural: 'Test statement long enough', scope: 'test' },
        proofs: [createTestProof('test.ts', 'case1')]
      }).invariant;
      
      const withoutProofs = crystallize({
        id: 'INV-TEST-02',
        property: { natural: 'Test statement long enough', scope: 'test' }
      }).invariant;
      
      expect(hasProofs(withProofs)).toBe(true);
      expect(hasProofs(withoutProofs)).toBe(false);
    });
    
    it('getStrongestProof should return correct proof', () => {
      const inv = crystallize({
        id: 'INV-TEST-01',
        property: { natural: 'Test statement long enough', scope: 'test' },
        proofs: [
          createTestProof('test.ts', 'case1'),  // Ε
          createFormalProof('Z3', 'theorem.smt2')  // Λ
        ]
      }).invariant;
      
      const strongest = getStrongestProof(inv);
      expect(strongest?.strength).toBe('Λ');
    });
    
    it('meetsMinStrength should check correctly', () => {
      const inv = crystallize({
        id: 'INV-TEST-01',
        property: { natural: 'Test statement long enough', scope: 'test' },
        proofs: [createFormalProof('Z3', 'theorem.smt2')]  // Λ
      }).invariant;
      
      expect(meetsMinStrength(inv, 'Ε')).toBe(true);
      expect(meetsMinStrength(inv, 'Λ')).toBe(true);
      expect(meetsMinStrength(inv, 'Ω')).toBe(false);
    });
    
  });
  
  describe('Serialization', () => {
    
    it('toJSON should produce valid JSON', () => {
      const inv = crystallize({
        id: 'INV-TEST-01',
        property: { natural: 'Test statement long enough', scope: 'test' }
      }).invariant;
      
      const json = toJSON(inv);
      expect(() => JSON.parse(json)).not.toThrow();
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: LINEAGE
// ═══════════════════════════════════════════════════════════════════════════════

describe('Lineage', () => {
  
  // Create test invariants
  function createTestInvariants() {
    const root1 = crystallize({
      id: 'INV-ROOT-01',
      property: { natural: 'Root invariant one long enough', scope: 'root' }
    }).invariant;
    
    const root2 = crystallize({
      id: 'INV-ROOT-02',
      property: { natural: 'Root invariant two long enough', scope: 'root' }
    }).invariant;
    
    const child1 = crystallize({
      id: 'INV-CHILD-01',
      property: { natural: 'Child invariant one long enough', scope: 'child' },
      parents: ['INV-ROOT-01']
    }).invariant;
    
    const child2 = crystallize({
      id: 'INV-CHILD-02',
      property: { natural: 'Child invariant two long enough', scope: 'child' },
      parents: ['INV-ROOT-01', 'INV-ROOT-02']
    }).invariant;
    
    return [root1, root2, child1, child2];
  }
  
  describe('Graph Construction', () => {
    
    it('should build graph from invariants', () => {
      const invariants = createTestInvariants();
      const graph = buildLineageGraph(invariants);
      
      expect(graph.nodes.size).toBe(4);
    });
    
    it('should identify roots correctly', () => {
      const invariants = createTestInvariants();
      const graph = buildLineageGraph(invariants);
      
      expect(graph.roots).toContain('INV-ROOT-01');
      expect(graph.roots).toContain('INV-ROOT-02');
      expect(graph.roots).not.toContain('INV-CHILD-01');
    });
    
    it('should identify leaves correctly', () => {
      const invariants = createTestInvariants();
      const graph = buildLineageGraph(invariants);
      
      expect(graph.leaves).toContain('INV-CHILD-01');
      expect(graph.leaves).toContain('INV-CHILD-02');
    });
    
    it('should compute children correctly', () => {
      const invariants = createTestInvariants();
      const graph = buildLineageGraph(invariants);
      
      const root1 = graph.nodes.get('INV-ROOT-01');
      expect(root1?.children).toContain('INV-CHILD-01');
      expect(root1?.children).toContain('INV-CHILD-02');
    });
    
  });
  
  describe('INV-LIN-01: DAG Validation', () => {
    
    it('should validate valid lineage', () => {
      const invariants = createTestInvariants();
      const result = validateLineage(invariants);
      
      expect(result.isValid).toBe(true);
      expect(result.hasCycles).toBe(false);
    });
    
    it('should detect invalid parent references', () => {
      const inv = crystallize({
        id: 'INV-ORPHAN-01',
        property: { natural: 'Orphan invariant long enough', scope: 'test' },
        parents: ['INV-NONEXISTENT-01']
      }).invariant;
      
      const result = validateLineage([inv]);
      
      expect(result.isValid).toBe(false);
      expect(result.invalidParents).toContain('INV-NONEXISTENT-01');
    });
    
  });
  
  describe('INV-LIN-03: Root Generation', () => {
    
    it('should create root lineage with generation 0', () => {
      const lineage = createRootLineage();
      
      expect(lineage.parents).toHaveLength(0);
      expect(lineage.generation).toBe(0);
    });
    
  });
  
  describe('INV-LIN-02: Generation Calculation', () => {
    
    it('should calculate generation from parents', () => {
      const invariants = createTestInvariants();
      const graph = buildLineageGraph(invariants);
      
      const gen = calculateGeneration(graph, ['INV-ROOT-01']);
      expect(gen).toBe(1);
    });
    
    it('should return 0 for no parents', () => {
      const graph = buildLineageGraph([]);
      const gen = calculateGeneration(graph, []);
      expect(gen).toBe(0);
    });
    
  });
  
  describe('Ancestor/Descendant Queries', () => {
    
    it('should find ancestors', () => {
      const invariants = createTestInvariants();
      const graph = buildLineageGraph(invariants);
      
      const ancestors = getAncestors(graph, 'INV-CHILD-02');
      
      expect(ancestors).toContain('INV-ROOT-01');
      expect(ancestors).toContain('INV-ROOT-02');
    });
    
    it('should find descendants', () => {
      const invariants = createTestInvariants();
      const graph = buildLineageGraph(invariants);
      
      const descendants = getDescendants(graph, 'INV-ROOT-01');
      
      expect(descendants).toContain('INV-CHILD-01');
      expect(descendants).toContain('INV-CHILD-02');
    });
    
    it('isAncestor should return correct value', () => {
      const invariants = createTestInvariants();
      const graph = buildLineageGraph(invariants);
      
      expect(isAncestor(graph, 'INV-ROOT-01', 'INV-CHILD-01')).toBe(true);
      expect(isAncestor(graph, 'INV-CHILD-01', 'INV-ROOT-01')).toBe(false);
    });
    
  });
  
  describe('Topological Sort', () => {
    
    it('should sort parents before children', () => {
      const invariants = createTestInvariants();
      const graph = buildLineageGraph(invariants);
      
      const sorted = topologicalSort(graph);
      
      const rootIndex = sorted.indexOf('INV-ROOT-01');
      const childIndex = sorted.indexOf('INV-CHILD-01');
      
      expect(rootIndex).toBeLessThan(childIndex);
    });
    
  });
  
  describe('Graph Statistics', () => {
    
    it('should compute correct stats', () => {
      const invariants = createTestInvariants();
      const graph = buildLineageGraph(invariants);
      
      const stats = getGraphStats(graph);
      
      expect(stats.totalNodes).toBe(4);
      expect(stats.totalRoots).toBe(2);
      expect(stats.totalLeaves).toBe(2);
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: DETERMINISM
// ═══════════════════════════════════════════════════════════════════════════════

describe('Determinism', () => {
  
  it('validation should be deterministic', () => {
    const inv = {
      id: 'INV-TEST-01',
      crystallized_at: '2026-01-06T00:00:00Z',
      crystallized_hash: 'a'.repeat(64),
      lineage: { parents: [], generation: 0 },
      property: { natural: 'Test statement long enough', scope: 'test' },
      proofs: [],
      impossibilities: []
    };
    
    const result1 = validateInvariant(inv);
    const result2 = validateInvariant(inv);
    
    expect(result1.isValid).toBe(result2.isValid);
    expect(result1.errorCount).toBe(result2.errorCount);
  });
  
  it('hash computation should be deterministic', () => {
    const args = [
      'INV-TEST-01',
      { natural: 'Test', scope: 'test' },
      { parents: [] as string[], generation: 0 },
      '2026-01-06T00:00:00Z'
    ] as const;
    
    const hash1 = computeInvariantHash(...args);
    const hash2 = computeInvariantHash(...args);
    
    expect(hash1).toBe(hash2);
  });
  
});
