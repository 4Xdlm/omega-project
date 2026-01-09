/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — FALSIFICATION RUNNER TESTS
 * Sprint 27.2 — Self-Certification
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Tests for INV-FALS-SELF-01 through INV-FALS-SELF-04
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  // Survival proof
  SURVIVAL_PROOF_VERSION,
  MIN_ATTACKS_PER_INVARIANT,
  DEFAULT_SEED,
  computeProofHash,
  computeReportHash,
  createAttackVector,
  createAttackAttempt,
  createSurvivalProof,
  createFalsificationReport,
  validateSurvivalProof,
  validateFalsificationReport,
  getSurvivedProofs,
  getBreachedProofs,
  getProofByInvariantId,
  allInvariantsSurvived,
  getInsufficientCoverage,
  formatProofSummary,
  formatReportSummary,
  isAttackOutcome,
  isValidProofHash,
  type AttackAttempt,
  type SurvivalProof,
  
  // Runner
  DEFAULT_RUNNER_CONFIG,
  RUNNER_VERSION,
  createSeededRandom,
  shuffleWithSeed,
  selectWithSeed,
  generateAttackVectors,
  executeAttack,
  attackInvariant,
  createRunnerState,
  getPureInvariants,
  runFalsification,
  createAlwaysSurvivesTest,
  createAlwaysFailsTest,
  createFailsOnSeedTest,
  validateTestCoverage,
  isValidConfig,
  type InvariantTestRegistry,
} from '../self/index.js';

import { getInventoryByCategory, INVENTORY_COUNT } from '../meta/inventory.js';

// ============================================================================
// CONSTANTS & HELPERS
// ============================================================================

describe('Survival Proof Constants', () => {
  it('should have valid version', () => {
    expect(SURVIVAL_PROOF_VERSION).toBe('1.0.0');
  });
  
  it('should have minimum attacks >= 5', () => {
    expect(MIN_ATTACKS_PER_INVARIANT).toBeGreaterThanOrEqual(5);
  });
  
  it('should have default seed', () => {
    expect(DEFAULT_SEED).toBe(42);
  });
});

describe('Runner Constants', () => {
  it('should have valid version', () => {
    expect(RUNNER_VERSION).toBe('1.0.0');
  });
  
  it('should have default config frozen', () => {
    expect(Object.isFrozen(DEFAULT_RUNNER_CONFIG)).toBe(true);
  });
  
  it('should have correct default config values', () => {
    expect(DEFAULT_RUNNER_CONFIG.seed).toBe(DEFAULT_SEED);
    expect(DEFAULT_RUNNER_CONFIG.minAttacksPerInvariant).toBe(MIN_ATTACKS_PER_INVARIANT);
    expect(DEFAULT_RUNNER_CONFIG.stopOnFirstBreach).toBe(true);
    expect(DEFAULT_RUNNER_CONFIG.verbose).toBe(false);
  });
});

// ============================================================================
// SEEDED RANDOM — INV-FALS-SELF-04
// ============================================================================

describe('INV-FALS-SELF-04: Seeded Random (Determinism)', () => {
  describe('createSeededRandom', () => {
    it('should produce same sequence for same seed', () => {
      const random1 = createSeededRandom(42);
      const random2 = createSeededRandom(42);
      
      const seq1 = Array.from({ length: 10 }, () => random1());
      const seq2 = Array.from({ length: 10 }, () => random2());
      
      expect(seq1).toEqual(seq2);
    });
    
    it('should produce different sequence for different seed', () => {
      const random1 = createSeededRandom(42);
      const random2 = createSeededRandom(43);
      
      const val1 = random1();
      const val2 = random2();
      
      expect(val1).not.toBe(val2);
    });
    
    it('should produce values in [0, 1)', () => {
      const random = createSeededRandom(12345);
      
      for (let i = 0; i < 100; i++) {
        const val = random();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });
    
    it('should be deterministic across 20 runs', () => {
      const results: number[][] = [];
      
      for (let run = 0; run < 20; run++) {
        const random = createSeededRandom(42);
        results.push(Array.from({ length: 5 }, () => random()));
      }
      
      // All runs should produce identical sequences
      for (let run = 1; run < 20; run++) {
        expect(results[run]).toEqual(results[0]);
      }
    });
  });
  
  describe('shuffleWithSeed', () => {
    it('should produce same order for same seed', () => {
      const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const shuffled1 = shuffleWithSeed(arr, 42);
      const shuffled2 = shuffleWithSeed(arr, 42);
      
      expect(shuffled1).toEqual(shuffled2);
    });
    
    it('should not mutate original array', () => {
      const arr = [1, 2, 3, 4, 5];
      const original = [...arr];
      shuffleWithSeed(arr, 42);
      
      expect(arr).toEqual(original);
    });
    
    it('should produce permutation with same elements', () => {
      const arr = [1, 2, 3, 4, 5];
      const shuffled = shuffleWithSeed(arr, 42);
      
      expect(shuffled.sort()).toEqual(arr.sort());
    });
  });
  
  describe('selectWithSeed', () => {
    it('should select same items for same seed', () => {
      const arr = ['a', 'b', 'c', 'd', 'e', 'f'];
      const selected1 = selectWithSeed(arr, 3, 42);
      const selected2 = selectWithSeed(arr, 3, 42);
      
      expect(selected1).toEqual(selected2);
    });
    
    it('should select exactly N items', () => {
      const arr = ['a', 'b', 'c', 'd', 'e'];
      const selected = selectWithSeed(arr, 3, 42);
      
      expect(selected.length).toBe(3);
    });
    
    it('should not exceed array length', () => {
      const arr = ['a', 'b'];
      const selected = selectWithSeed(arr, 10, 42);
      
      expect(selected.length).toBe(2);
    });
  });
});

// ============================================================================
// ATTACK VECTOR GENERATION
// ============================================================================

describe('Attack Vector Generation', () => {
  describe('createAttackVector', () => {
    it('should create frozen vector', () => {
      const vector = createAttackVector(
        'ATK-STRUCT-001',
        'structural',
        'null',
        42,
        'Test null input'
      );
      
      expect(Object.isFrozen(vector)).toBe(true);
    });
    
    it('should have all required fields', () => {
      const vector = createAttackVector(
        'ATK-STRUCT-001',
        'structural',
        '{}',
        42,
        'Empty object'
      );
      
      expect(vector.attackId).toBe('ATK-STRUCT-001');
      expect(vector.category).toBe('structural');
      expect(vector.input).toBe('{}');
      expect(vector.seed).toBe(42);
      expect(vector.expectedFailure).toBe('Empty object');
      expect(vector.timestamp).toBeDefined();
    });
  });
  
  describe('generateAttackVectors', () => {
    it('should generate requested number of vectors', () => {
      const vectors = generateAttackVectors('INV-AX-01', 5, 42);
      
      expect(vectors.length).toBe(5);
    });
    
    it('should generate same vectors for same seed (determinism)', () => {
      const vectors1 = generateAttackVectors('INV-AX-01', 5, 42);
      const vectors2 = generateAttackVectors('INV-AX-01', 5, 42);
      
      expect(vectors1.map(v => v.attackId)).toEqual(vectors2.map(v => v.attackId));
      expect(vectors1.map(v => v.seed)).toEqual(vectors2.map(v => v.seed));
    });
    
    it('should generate different vectors for different invariants', () => {
      const vectors1 = generateAttackVectors('INV-AX-01', 5, 42);
      const vectors2 = generateAttackVectors('INV-AX-02', 5, 42);
      
      // Seeds will differ due to invariant ID influence
      expect(vectors1.map(v => v.seed)).not.toEqual(vectors2.map(v => v.seed));
    });
  });
});

// ============================================================================
// ATTACK EXECUTION
// ============================================================================

describe('Attack Execution', () => {
  describe('executeAttack', () => {
    it('should record SURVIVED for passing test', () => {
      const vector = createAttackVector('ATK-TEST', 'structural', '{}', 42, 'test');
      const testFn = createAlwaysSurvivesTest();
      
      const attempt = executeAttack(vector, testFn);
      
      expect(attempt.outcome).toBe('SURVIVED');
      expect(attempt.durationMs).toBeGreaterThanOrEqual(0);
    });
    
    it('should record BREACHED for failing test', () => {
      const vector = createAttackVector('ATK-TEST', 'structural', '{}', 42, 'test');
      const testFn = createAlwaysFailsTest();
      
      const attempt = executeAttack(vector, testFn);
      
      expect(attempt.outcome).toBe('BREACHED');
      expect(attempt.error).toBeDefined();
    });
    
    it('should record SURVIVED on exception (invariant defended)', () => {
      const vector = createAttackVector('ATK-TEST', 'structural', '{}', 42, 'test');
      const testFn = () => { throw new Error('Defense exception'); };
      
      const attempt = executeAttack(vector, testFn);
      
      expect(attempt.outcome).toBe('SURVIVED');
      expect(attempt.evidence).toContain('Exception');
    });
    
    it('should measure duration', () => {
      const vector = createAttackVector('ATK-TEST', 'structural', '{}', 42, 'test');
      const testFn = () => {
        // Simulate some work
        let sum = 0;
        for (let i = 0; i < 10000; i++) sum += i;
        return sum > 0;
      };
      
      const attempt = executeAttack(vector, testFn);
      
      expect(attempt.durationMs).toBeGreaterThanOrEqual(0);
    });
  });
});

// ============================================================================
// SURVIVAL PROOF — INV-FALS-SELF-02
// ============================================================================

describe('INV-FALS-SELF-02: Survival Proof', () => {
  describe('createSurvivalProof', () => {
    it('should create frozen proof', () => {
      const attempts: AttackAttempt[] = [
        createAttackAttempt(
          createAttackVector('ATK-1', 'structural', '{}', 42, 'test'),
          'SURVIVED',
          10
        ),
      ];
      
      const proof = createSurvivalProof('INV-AX-01', 'axioms', 'PURE', attempts);
      
      expect(Object.isFrozen(proof)).toBe(true);
    });
    
    it('should compute correct counts', () => {
      const attempts: AttackAttempt[] = [
        createAttackAttempt(createAttackVector('ATK-1', 's', '', 1, ''), 'SURVIVED', 1),
        createAttackAttempt(createAttackVector('ATK-2', 's', '', 2, ''), 'SURVIVED', 1),
        createAttackAttempt(createAttackVector('ATK-3', 's', '', 3, ''), 'BREACHED', 1, 'fail'),
        createAttackAttempt(createAttackVector('ATK-4', 's', '', 4, ''), 'SKIPPED', 0),
      ];
      
      const proof = createSurvivalProof('INV-TEST', 'test', 'PURE', attempts);
      
      expect(proof.survivedCount).toBe(2);
      expect(proof.breachedCount).toBe(1);
      expect(proof.skippedCount).toBe(1);
      expect(proof.attempts).toBe(4);
    });
    
    it('should compute survival rate correctly', () => {
      const attempts: AttackAttempt[] = [
        createAttackAttempt(createAttackVector('ATK-1', 's', '', 1, ''), 'SURVIVED', 1),
        createAttackAttempt(createAttackVector('ATK-2', 's', '', 2, ''), 'SURVIVED', 1),
        createAttackAttempt(createAttackVector('ATK-3', 's', '', 3, ''), 'SURVIVED', 1),
        createAttackAttempt(createAttackVector('ATK-4', 's', '', 4, ''), 'BREACHED', 1, 'fail'),
      ];
      
      const proof = createSurvivalProof('INV-TEST', 'test', 'PURE', attempts);
      
      // 3 survived / 4 effective = 0.75
      expect(proof.survivalRate).toBe(0.75);
    });
    
    it('should mark survived only if no breaches', () => {
      const survivedOnly: AttackAttempt[] = [
        createAttackAttempt(createAttackVector('ATK-1', 's', '', 1, ''), 'SURVIVED', 1),
        createAttackAttempt(createAttackVector('ATK-2', 's', '', 2, ''), 'SURVIVED', 1),
      ];
      
      const withBreach: AttackAttempt[] = [
        createAttackAttempt(createAttackVector('ATK-1', 's', '', 1, ''), 'SURVIVED', 1),
        createAttackAttempt(createAttackVector('ATK-2', 's', '', 2, ''), 'BREACHED', 1, 'fail'),
      ];
      
      const proof1 = createSurvivalProof('INV-1', 'test', 'PURE', survivedOnly);
      const proof2 = createSurvivalProof('INV-2', 'test', 'PURE', withBreach);
      
      expect(proof1.survived).toBe(true);
      expect(proof2.survived).toBe(false);
    });
    
    it('should compute deterministic proof hash', () => {
      const attempts: AttackAttempt[] = [
        createAttackAttempt(createAttackVector('ATK-1', 's', '', 42, ''), 'SURVIVED', 1),
      ];
      
      const proof1 = createSurvivalProof('INV-TEST', 'test', 'PURE', attempts);
      const proof2 = createSurvivalProof('INV-TEST', 'test', 'PURE', attempts);
      
      expect(proof1.proofHash).toBe(proof2.proofHash);
      expect(proof1.proofHash).toMatch(/^[a-f0-9]{64}$/);
    });
  });
  
  describe('validateSurvivalProof', () => {
    it('should validate correct proof', () => {
      const attempts: AttackAttempt[] = [
        createAttackAttempt(createAttackVector('ATK-1', 's', '', 42, ''), 'SURVIVED', 1),
      ];
      
      const proof = createSurvivalProof('INV-TEST', 'test', 'PURE', attempts);
      const result = validateSurvivalProof(proof);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should detect hash tampering', () => {
      const attempts: AttackAttempt[] = [
        createAttackAttempt(createAttackVector('ATK-1', 's', '', 42, ''), 'SURVIVED', 1),
      ];
      
      const proof = createSurvivalProof('INV-TEST', 'test', 'PURE', attempts);
      const tampered = { ...proof, proofHash: 'invalid_hash' } as SurvivalProof;
      
      const result = validateSurvivalProof(tampered);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Hash'))).toBe(true);
    });
  });
});

// ============================================================================
// FALSIFICATION REPORT
// ============================================================================

describe('Falsification Report', () => {
  describe('createFalsificationReport', () => {
    it('should create frozen report', () => {
      const proof = createSurvivalProof('INV-TEST', 'test', 'PURE', [
        createAttackAttempt(createAttackVector('ATK-1', 's', '', 42, ''), 'SURVIVED', 1),
      ]);
      
      const report = createFalsificationReport(
        42,
        [proof],
        '2026-01-07T00:00:00Z',
        '2026-01-07T00:01:00Z'
      );
      
      expect(Object.isFrozen(report)).toBe(true);
    });
    
    it('should compute correct summary', () => {
      const survived = createSurvivalProof('INV-1', 'test', 'PURE', [
        createAttackAttempt(createAttackVector('ATK-1', 's', '', 1, ''), 'SURVIVED', 1),
      ]);
      
      const breached = createSurvivalProof('INV-2', 'test', 'PURE', [
        createAttackAttempt(createAttackVector('ATK-2', 's', '', 2, ''), 'BREACHED', 1, 'fail'),
      ]);
      
      const report = createFalsificationReport(
        42,
        [survived, breached],
        '2026-01-07T00:00:00Z',
        '2026-01-07T00:01:00Z'
      );
      
      expect(report.summary.invariantsTested).toBe(2);
      expect(report.summary.invariantsSurvived).toBe(1);
      expect(report.summary.invariantsBreached).toBe(1);
      expect(report.summary.verdict).toBe('FAIL');
    });
    
    it('should have PASS verdict when no breaches', () => {
      const proof = createSurvivalProof('INV-TEST', 'test', 'PURE', [
        createAttackAttempt(createAttackVector('ATK-1', 's', '', 42, ''), 'SURVIVED', 1),
      ]);
      
      const report = createFalsificationReport(
        42,
        [proof],
        '2026-01-07T00:00:00Z',
        '2026-01-07T00:01:00Z'
      );
      
      expect(report.summary.verdict).toBe('PASS');
    });
    
    it('should compute deterministic report hash', () => {
      const proof = createSurvivalProof('INV-TEST', 'test', 'PURE', [
        createAttackAttempt(createAttackVector('ATK-1', 's', '', 42, ''), 'SURVIVED', 1),
      ]);
      
      const report1 = createFalsificationReport(42, [proof], '2026-01-07T00:00:00Z', '2026-01-07T00:01:00Z');
      const report2 = createFalsificationReport(42, [proof], '2026-01-07T00:00:00Z', '2026-01-07T00:01:00Z');
      
      expect(report1.reportHash).toBe(report2.reportHash);
      expect(report1.reportHash).toMatch(/^[a-f0-9]{64}$/);
    });
  });
  
  describe('validateFalsificationReport', () => {
    it('should validate correct report', () => {
      const proof = createSurvivalProof('INV-TEST', 'test', 'PURE', [
        createAttackAttempt(createAttackVector('ATK-1', 's', '', 42, ''), 'SURVIVED', 1),
      ]);
      
      const report = createFalsificationReport(
        42,
        [proof],
        '2026-01-07T00:00:00Z',
        '2026-01-07T00:01:00Z'
      );
      
      const result = validateFalsificationReport(report);
      
      expect(result.valid).toBe(true);
    });
  });
});

// ============================================================================
// REPORT QUERIES
// ============================================================================

describe('Report Queries', () => {
  const survivedProof = createSurvivalProof('INV-SURVIVED', 'test', 'PURE', [
    createAttackAttempt(createAttackVector('ATK-1', 's', '', 1, ''), 'SURVIVED', 1),
  ]);
  
  const breachedProof = createSurvivalProof('INV-BREACHED', 'test', 'PURE', [
    createAttackAttempt(createAttackVector('ATK-2', 's', '', 2, ''), 'BREACHED', 1, 'fail'),
  ]);
  
  const report = createFalsificationReport(
    42,
    [survivedProof, breachedProof],
    '2026-01-07T00:00:00Z',
    '2026-01-07T00:01:00Z'
  );
  
  it('getSurvivedProofs should return only survived', () => {
    const survived = getSurvivedProofs(report);
    
    expect(survived).toHaveLength(1);
    expect(survived[0].invariantId).toBe('INV-SURVIVED');
  });
  
  it('getBreachedProofs should return only breached', () => {
    const breached = getBreachedProofs(report);
    
    expect(breached).toHaveLength(1);
    expect(breached[0].invariantId).toBe('INV-BREACHED');
  });
  
  it('getProofByInvariantId should find proof', () => {
    const proof = getProofByInvariantId(report, 'INV-SURVIVED');
    
    expect(proof).toBeDefined();
    expect(proof?.invariantId).toBe('INV-SURVIVED');
  });
  
  it('getProofByInvariantId should return undefined for unknown', () => {
    const proof = getProofByInvariantId(report, 'INV-UNKNOWN');
    
    expect(proof).toBeUndefined();
  });
  
  it('allInvariantsSurvived should return false for report with breach', () => {
    expect(allInvariantsSurvived(report)).toBe(false);
  });
  
  it('getInsufficientCoverage should find proofs with few attacks', () => {
    const insufficient = getInsufficientCoverage(report, 5);
    
    // Both proofs have only 1 attack
    expect(insufficient.length).toBe(2);
  });
});

// ============================================================================
// FORMATTING
// ============================================================================

describe('Formatting', () => {
  it('formatProofSummary should produce readable string', () => {
    const proof = createSurvivalProof('INV-AX-01', 'axioms', 'PURE', [
      createAttackAttempt(createAttackVector('ATK-1', 's', '', 1, ''), 'SURVIVED', 1),
      createAttackAttempt(createAttackVector('ATK-2', 's', '', 2, ''), 'SURVIVED', 1),
    ]);
    
    const summary = formatProofSummary(proof);
    
    expect(summary).toContain('INV-AX-01');
    expect(summary).toContain('axioms');
    expect(summary).toContain('SURVIVED');
    expect(summary).toContain('2/2');
  });
  
  it('formatReportSummary should produce readable string', () => {
    const proof = createSurvivalProof('INV-TEST', 'test', 'PURE', [
      createAttackAttempt(createAttackVector('ATK-1', 's', '', 42, ''), 'SURVIVED', 1),
    ]);
    
    const report = createFalsificationReport(
      42,
      [proof],
      '2026-01-07T00:00:00Z',
      '2026-01-07T00:01:00Z'
    );
    
    const summary = formatReportSummary(report);
    
    expect(summary).toContain('PASS');
    expect(summary).toContain('Seed: 42');
    expect(summary).toContain('Invariants: 1');
  });
});

// ============================================================================
// TYPE GUARDS
// ============================================================================

describe('Type Guards', () => {
  describe('isAttackOutcome', () => {
    it('should return true for valid outcomes', () => {
      expect(isAttackOutcome('SURVIVED')).toBe(true);
      expect(isAttackOutcome('BREACHED')).toBe(true);
      expect(isAttackOutcome('SKIPPED')).toBe(true);
      expect(isAttackOutcome('ERROR')).toBe(true);
    });
    
    it('should return false for invalid values', () => {
      expect(isAttackOutcome('invalid')).toBe(false);
      expect(isAttackOutcome(123)).toBe(false);
      expect(isAttackOutcome(null)).toBe(false);
    });
  });
  
  describe('isValidProofHash', () => {
    it('should return true for valid hash', () => {
      expect(isValidProofHash('a'.repeat(64))).toBe(true);
      expect(isValidProofHash('0123456789abcdef'.repeat(4))).toBe(true);
    });
    
    it('should return false for invalid hash', () => {
      expect(isValidProofHash('short')).toBe(false);
      expect(isValidProofHash('g'.repeat(64))).toBe(false); // g is not hex
    });
  });
});

// ============================================================================
// INV-FALS-SELF-01: ALL PURE ARE ATTACKED
// ============================================================================

describe('INV-FALS-SELF-01: All PURE Invariants Are Attacked', () => {
  it('getPureInvariants should return only PURE', () => {
    const pure = getPureInvariants(DEFAULT_RUNNER_CONFIG);
    
    for (const inv of pure) {
      expect(inv.category).toBe('PURE');
    }
  });
  
  it('should have PURE invariants to test', () => {
    const pure = getInventoryByCategory('PURE');
    
    expect(pure.length).toBeGreaterThan(50); // We have 73 PURE
  });
  
  it('getPureInvariants should respect target filter', () => {
    const config = { ...DEFAULT_RUNNER_CONFIG, targetInvariants: ['INV-AX-01', 'INV-AX-02'] };
    const pure = getPureInvariants(config);
    
    expect(pure.length).toBeLessThanOrEqual(2);
  });
  
  it('getPureInvariants should respect exclude filter', () => {
    const allPure = getPureInvariants(DEFAULT_RUNNER_CONFIG);
    const config = { ...DEFAULT_RUNNER_CONFIG, excludeInvariants: ['INV-AX-01'] };
    const filtered = getPureInvariants(config);
    
    expect(filtered.length).toBe(allPure.length - 1);
  });
});

// ============================================================================
// INV-FALS-SELF-03: FAILURE = IMMEDIATE STOP
// ============================================================================

describe('INV-FALS-SELF-03: Failure = Immediate Stop', () => {
  it('should stop on first breach with stopOnFirstBreach=true', () => {
    // Create a registry where second invariant fails
    const registry: InvariantTestRegistry = {
      'INV-AX-01': createAlwaysSurvivesTest(),
      'INV-AX-02': createAlwaysFailsTest(), // This will fail
      'INV-AX-03': createAlwaysSurvivesTest(), // Should not be reached
    };
    
    const report = runFalsification(registry, {
      seed: 42,
      targetInvariants: ['INV-AX-01', 'INV-AX-02', 'INV-AX-03'],
      stopOnFirstBreach: true,
    });
    
    // Should have stopped after INV-AX-02 breach
    const breached = getBreachedProofs(report);
    expect(breached.length).toBe(1);
    expect(breached[0].invariantId).toBe('INV-AX-02');
    
    // INV-AX-03 should not have a proof (wasn't tested)
    const ax03Proof = getProofByInvariantId(report, 'INV-AX-03');
    expect(ax03Proof).toBeUndefined();
  });
  
  it('should continue with stopOnFirstBreach=false', () => {
    const registry: InvariantTestRegistry = {
      'INV-AX-01': createAlwaysFailsTest(),
      'INV-AX-02': createAlwaysFailsTest(),
    };
    
    const report = runFalsification(registry, {
      seed: 42,
      targetInvariants: ['INV-AX-01', 'INV-AX-02'],
      stopOnFirstBreach: false,
    });
    
    // Should have tested both
    const breached = getBreachedProofs(report);
    expect(breached.length).toBe(2);
  });
});

// ============================================================================
// INV-FALS-SELF-04: RUNNER DETERMINISM
// ============================================================================

describe('INV-FALS-SELF-04: Runner Determinism', () => {
  it('should produce identical reports with same seed', () => {
    const registry: InvariantTestRegistry = {
      'INV-AX-01': createAlwaysSurvivesTest(),
      'INV-AX-02': createAlwaysSurvivesTest(),
    };
    
    const report1 = runFalsification(registry, {
      seed: 42,
      targetInvariants: ['INV-AX-01', 'INV-AX-02'],
    });
    
    const report2 = runFalsification(registry, {
      seed: 42,
      targetInvariants: ['INV-AX-01', 'INV-AX-02'],
    });
    
    // Same report hash (excluding timestamps)
    expect(report1.reportHash).toBe(report2.reportHash);
  });
  
  it('should produce different reports with different seed', () => {
    const registry: InvariantTestRegistry = {
      'INV-AX-01': createAlwaysSurvivesTest(),
    };
    
    const report1 = runFalsification(registry, {
      seed: 42,
      targetInvariants: ['INV-AX-01'],
    });
    
    const report2 = runFalsification(registry, {
      seed: 43,
      targetInvariants: ['INV-AX-01'],
    });
    
    // Different seeds = different attack vectors = different report hash
    expect(report1.reportHash).not.toBe(report2.reportHash);
  });
  
  it('should be deterministic across 20 runs', () => {
    const registry: InvariantTestRegistry = {
      'INV-AX-01': createAlwaysSurvivesTest(),
    };
    
    const hashes: string[] = [];
    
    for (let i = 0; i < 20; i++) {
      const report = runFalsification(registry, {
        seed: 42,
        targetInvariants: ['INV-AX-01'],
      });
      hashes.push(report.reportHash);
    }
    
    // All hashes should be identical
    for (let i = 1; i < 20; i++) {
      expect(hashes[i]).toBe(hashes[0]);
    }
  });
});

// ============================================================================
// TEST COVERAGE VALIDATION
// ============================================================================

describe('Test Coverage Validation', () => {
  it('validateTestCoverage should identify missing tests', () => {
    const registry: InvariantTestRegistry = {
      'INV-AX-01': createAlwaysSurvivesTest(),
      // Missing all other PURE invariants
    };
    
    const { covered, missing } = validateTestCoverage(registry);
    
    expect(covered).toContain('INV-AX-01');
    expect(missing.length).toBeGreaterThan(0);
    expect(missing).not.toContain('INV-AX-01');
  });
  
  it('isValidConfig should validate config', () => {
    expect(isValidConfig({})).toBe(true);
    expect(isValidConfig({ seed: 42 })).toBe(true);
    expect(isValidConfig({ seed: 1.5 })).toBe(false); // Not integer
    expect(isValidConfig({ minAttacksPerInvariant: 0 })).toBe(false); // Too low
  });
});

// ============================================================================
// RUNNER STATE
// ============================================================================

describe('Runner State', () => {
  it('createRunnerState should create valid state', () => {
    const state = createRunnerState();
    
    expect(state.proofs).toEqual([]);
    expect(state.currentInvariant).toBeNull();
    expect(state.breached).toBe(false);
    expect(state.startTime).toBeDefined();
  });
  
  it('createRunnerState should merge config', () => {
    const state = createRunnerState({ seed: 12345, verbose: true });
    
    expect(state.config.seed).toBe(12345);
    expect(state.config.verbose).toBe(true);
    expect(state.config.stopOnFirstBreach).toBe(true); // Default preserved
  });
});

// ============================================================================
// INTEGRATION: FULL RUN
// ============================================================================

describe('Integration: Full Falsification Run', () => {
  it('should complete run with all survived', () => {
    // Create a registry that always survives for a subset
    const testIds = ['INV-AX-01', 'INV-AX-02', 'INV-AX-03'];
    const registry: InvariantTestRegistry = {};
    
    for (const id of testIds) {
      registry[id] = createAlwaysSurvivesTest();
    }
    
    const report = runFalsification(registry, {
      seed: 42,
      targetInvariants: testIds,
      minAttacksPerInvariant: 3, // Fewer attacks for speed
    });
    
    expect(report.summary.verdict).toBe('PASS');
    expect(report.summary.invariantsTested).toBe(3);
    expect(report.summary.invariantsSurvived).toBe(3);
    expect(report.summary.invariantsBreached).toBe(0);
  });
  
  it('should record breach correctly', () => {
    const registry: InvariantTestRegistry = {
      'INV-AX-01': createAlwaysSurvivesTest(),
      'INV-AX-02': createAlwaysFailsTest(),
    };
    
    const report = runFalsification(registry, {
      seed: 42,
      targetInvariants: ['INV-AX-01', 'INV-AX-02'],
      stopOnFirstBreach: false,
    });
    
    expect(report.summary.verdict).toBe('FAIL');
    expect(report.summary.breachedIds).toContain('INV-AX-02');
  });
  
  it('should handle missing test functions gracefully', () => {
    const registry: InvariantTestRegistry = {
      'INV-AX-01': createAlwaysSurvivesTest(),
      // INV-AX-02 has no test function
    };
    
    const report = runFalsification(registry, {
      seed: 42,
      targetInvariants: ['INV-AX-01', 'INV-AX-02'],
    });
    
    // INV-AX-02 should be skipped
    const ax02Proof = getProofByInvariantId(report, 'INV-AX-02');
    expect(ax02Proof).toBeDefined();
    expect(ax02Proof?.skippedCount).toBe(1);
  });
});

// ============================================================================
// DETERMINISM GATE (20 RUNS)
// ============================================================================

describe('Determinism Gate (20-run)', () => {
  it('survival proof hash should be deterministic', () => {
    const attempts: AttackAttempt[] = [
      createAttackAttempt(createAttackVector('ATK-1', 's', 'input', 42, 'test'), 'SURVIVED', 10),
    ];
    
    const hashes: string[] = [];
    for (let i = 0; i < 20; i++) {
      const proof = createSurvivalProof('INV-TEST', 'test', 'PURE', attempts);
      hashes.push(proof.proofHash);
    }
    
    for (let i = 1; i < 20; i++) {
      expect(hashes[i]).toBe(hashes[0]);
    }
  });
  
  it('attack generation should be deterministic', () => {
    const results: string[][] = [];
    
    for (let i = 0; i < 20; i++) {
      const vectors = generateAttackVectors('INV-AX-01', 5, 42);
      results.push(vectors.map(v => `${v.attackId}-${v.seed}`));
    }
    
    for (let i = 1; i < 20; i++) {
      expect(results[i]).toEqual(results[0]);
    }
  });
});
