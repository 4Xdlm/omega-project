/**
 * OMEGA RESILIENCE PROOF SYSTEM
 * Temporal Logic - Tests
 * 
 * Phase 23 - Sprint 23.2
 * 
 * INVARIANTS TESTED:
 * - INV-TEMP-01: Safety
 * - INV-TEMP-02: Liveness
 * - INV-TEMP-03: Fairness
 * - INV-TEMP-04: Causality
 * - INV-TEMP-05: Recovery
 */

import { describe, it, expect } from 'vitest';
import {
  // Types
  LTLOperator,
  InvariantSeverity,
  InvariantCategory,
  TRUE,
  FALSE,
  ALL_OPERATORS,
  
  // Formula builders
  atom,
  constant,
  not,
  and,
  andAll,
  or,
  orAll,
  implies,
  iff,
  always,
  eventually,
  next,
  until,
  weakUntil,
  release,
  historically,
  once,
  previous,
  since,
  safety,
  liveness,
  fairness,
  stability,
  absence,
  existence,
  precedence,
  mutualExclusion,
  boundedResponse,
  
  // Utilities
  toString,
  depth,
  getAtoms,
  countTemporalOperators,
  isSafetyProperty,
  simplify,
  
  // Evaluator
  LTLEvaluator,
  buildTrace,
  evaluateFormula,
  
  // Invariants
  OMEGA_TEMPORAL_INVARIANTS,
  CRITICAL_INVARIANTS,
  SAFETY_INVARIANTS,
  getInvariantById,
  getInvariantsByCategory,
  getInvariantsBySeverity,
  
  // Verifier
  TemporalVerifier,
  createVerifier,
  generateReport,
} from '../../src/temporal/index.js';

describe('Temporal Logic Types', () => {
  describe('LTL Operators', () => {
    it('should have all expected operators', () => {
      expect(ALL_OPERATORS).toContain(LTLOperator.ALWAYS);
      expect(ALL_OPERATORS).toContain(LTLOperator.EVENTUALLY);
      expect(ALL_OPERATORS).toContain(LTLOperator.NEXT);
      expect(ALL_OPERATORS).toContain(LTLOperator.UNTIL);
      expect(ALL_OPERATORS).toContain(LTLOperator.AND);
      expect(ALL_OPERATORS).toContain(LTLOperator.OR);
      expect(ALL_OPERATORS).toContain(LTLOperator.NOT);
      expect(ALL_OPERATORS).toContain(LTLOperator.IMPLIES);
    });

    it('should have past operators', () => {
      expect(ALL_OPERATORS).toContain(LTLOperator.HISTORICALLY);
      expect(ALL_OPERATORS).toContain(LTLOperator.ONCE);
      expect(ALL_OPERATORS).toContain(LTLOperator.PREVIOUS);
      expect(ALL_OPERATORS).toContain(LTLOperator.SINCE);
    });
  });

  describe('Constants', () => {
    it('should have TRUE and FALSE', () => {
      expect(TRUE.type).toBe('CONSTANT');
      expect(TRUE.value).toBe(true);
      expect(FALSE.type).toBe('CONSTANT');
      expect(FALSE.value).toBe(false);
    });
  });
});

describe('LTL Formula Builders', () => {
  describe('Atomic Propositions', () => {
    it('should create atomic proposition', () => {
      const p = atom('test', 'test.value === true');
      
      expect(p.type).toBe('ATOMIC');
      expect(p.name).toBe('test');
      expect(p.predicate).toBe('test.value === true');
    });

    it('should use name as predicate if not specified', () => {
      const p = atom('myProp');
      
      expect(p.predicate).toBe('myProp');
    });
  });

  describe('Propositional Operators', () => {
    const p = atom('p');
    const q = atom('q');

    it('should create negation', () => {
      const f = not(p);
      
      expect(f.type).toBe('UNARY');
      expect(f.operator).toBe('NOT');
    });

    it('should create conjunction', () => {
      const f = and(p, q);
      
      expect(f.type).toBe('BINARY');
      expect(f.operator).toBe('AND');
    });

    it('should create n-ary conjunction', () => {
      const r = atom('r');
      const f = andAll(p, q, r);
      
      expect(f.type).toBe('BINARY');
    });

    it('should create disjunction', () => {
      const f = or(p, q);
      
      expect(f.type).toBe('BINARY');
      expect(f.operator).toBe('OR');
    });

    it('should create implication', () => {
      const f = implies(p, q);
      
      expect(f.type).toBe('BINARY');
      expect(f.operator).toBe('IMPLIES');
    });

    it('should create bi-implication', () => {
      const f = iff(p, q);
      
      expect(f.type).toBe('BINARY');
      expect(f.operator).toBe('IFF');
    });
  });

  describe('Temporal Operators', () => {
    const p = atom('p');
    const q = atom('q');

    it('should create always', () => {
      const f = always(p);
      
      expect(f.type).toBe('UNARY');
      expect(f.operator).toBe('ALWAYS');
    });

    it('should create eventually', () => {
      const f = eventually(p);
      
      expect(f.type).toBe('UNARY');
      expect(f.operator).toBe('EVENTUALLY');
    });

    it('should create next', () => {
      const f = next(p);
      
      expect(f.type).toBe('UNARY');
      expect(f.operator).toBe('NEXT');
    });

    it('should create until', () => {
      const f = until(p, q);
      
      expect(f.type).toBe('BINARY');
      expect(f.operator).toBe('UNTIL');
    });

    it('should create weak until', () => {
      const f = weakUntil(p, q);
      
      expect(f.type).toBe('BINARY');
      expect(f.operator).toBe('WEAK_UNTIL');
    });

    it('should create release', () => {
      const f = release(p, q);
      
      expect(f.type).toBe('BINARY');
      expect(f.operator).toBe('RELEASE');
    });
  });

  describe('Past Operators', () => {
    const p = atom('p');
    const q = atom('q');

    it('should create historically', () => {
      const f = historically(p);
      
      expect(f.operator).toBe('HISTORICALLY');
    });

    it('should create once', () => {
      const f = once(p);
      
      expect(f.operator).toBe('ONCE');
    });

    it('should create previous', () => {
      const f = previous(p);
      
      expect(f.operator).toBe('PREVIOUS');
    });

    it('should create since', () => {
      const f = since(p, q);
      
      expect(f.operator).toBe('SINCE');
    });
  });

  describe('Pattern Templates', () => {
    const p = atom('p');
    const q = atom('q');

    it('should create safety pattern', () => {
      const f = safety(p, q);
      const str = toString(f);
      
      expect(str).toContain('□');
      expect(str).toContain('→');
    });

    it('should create liveness pattern', () => {
      const f = liveness(p, q);
      const str = toString(f);
      
      expect(str).toContain('□');
      expect(str).toContain('◇');
    });

    it('should create fairness pattern', () => {
      const f = fairness(p);
      const str = toString(f);
      
      expect(str).toContain('□');
      expect(str).toContain('◇');
    });

    it('should create stability pattern', () => {
      const f = stability(p);
      const str = toString(f);
      
      expect(str).toContain('◇');
      expect(str).toContain('□');
    });

    it('should create absence pattern', () => {
      const f = absence(p);
      const str = toString(f);
      
      expect(str).toContain('□');
      expect(str).toContain('¬');
    });

    it('should create mutual exclusion pattern', () => {
      const f = mutualExclusion(p, q);
      const str = toString(f);
      
      expect(str).toContain('□');
      expect(str).toContain('¬');
    });

    it('should create bounded response pattern', () => {
      const f = boundedResponse(p, q, 2);
      
      expect(f.type).toBe('UNARY');
      expect(f.operator).toBe('ALWAYS');
    });
  });
});

describe('Formula Utilities', () => {
  describe('toString', () => {
    it('should format constants', () => {
      expect(toString(TRUE)).toBe('⊤');
      expect(toString(FALSE)).toBe('⊥');
    });

    it('should format atoms', () => {
      const p = atom('test');
      expect(toString(p)).toBe('test');
    });

    it('should format unary', () => {
      const p = atom('p');
      expect(toString(not(p))).toBe('¬(p)');
      expect(toString(always(p))).toBe('□(p)');
      expect(toString(eventually(p))).toBe('◇(p)');
    });

    it('should format binary', () => {
      const p = atom('p');
      const q = atom('q');
      expect(toString(and(p, q))).toBe('(p ∧ q)');
      expect(toString(implies(p, q))).toBe('(p → q)');
      expect(toString(until(p, q))).toBe('(p U q)');
    });
  });

  describe('depth', () => {
    it('should calculate depth for atoms', () => {
      const p = atom('p');
      expect(depth(p)).toBe(1);
    });

    it('should calculate depth for unary', () => {
      const p = atom('p');
      expect(depth(not(p))).toBe(2);
      expect(depth(not(not(p)))).toBe(3);
    });

    it('should calculate depth for binary', () => {
      const p = atom('p');
      const q = atom('q');
      expect(depth(and(p, q))).toBe(2);
      expect(depth(and(not(p), q))).toBe(3);
    });
  });

  describe('getAtoms', () => {
    it('should return atoms', () => {
      const p = atom('p');
      const q = atom('q');
      const f = and(p, or(q, p));
      
      const atoms = getAtoms(f);
      
      expect(atoms.length).toBe(3); // p appears twice
      expect(atoms.map(a => a.name)).toContain('p');
      expect(atoms.map(a => a.name)).toContain('q');
    });
  });

  describe('countTemporalOperators', () => {
    it('should count temporal operators', () => {
      const p = atom('p');
      
      expect(countTemporalOperators(p)).toBe(0);
      expect(countTemporalOperators(always(p))).toBe(1);
      expect(countTemporalOperators(always(eventually(p)))).toBe(2);
    });
  });

  describe('isSafetyProperty', () => {
    it('should identify safety properties', () => {
      const p = atom('p');
      const q = atom('q');
      
      expect(isSafetyProperty(p)).toBe(true);
      expect(isSafetyProperty(always(p))).toBe(true);
      expect(isSafetyProperty(always(implies(p, q)))).toBe(true);
    });

    it('should identify non-safety (liveness) properties', () => {
      const p = atom('p');
      
      expect(isSafetyProperty(eventually(p))).toBe(false);
      expect(isSafetyProperty(always(eventually(p)))).toBe(false);
    });
  });

  describe('simplify', () => {
    it('should eliminate double negation', () => {
      const p = atom('p');
      const f = not(not(p));
      const simplified = simplify(f);
      
      expect(simplified).toBe(p);
    });

    it('should simplify with TRUE', () => {
      const p = atom('p');
      const f = and(p, TRUE);
      const simplified = simplify(f);
      
      expect(simplified).toBe(p);
    });

    it('should simplify with FALSE', () => {
      const f = and(atom('p'), FALSE);
      const simplified = simplify(f);
      
      expect(simplified).toBe(FALSE);
    });
  });
});

describe('LTL Evaluator', () => {
  describe('Atomic Evaluation', () => {
    it('should evaluate true proposition', () => {
      const trace = buildTrace('t1', [
        { p: true },
        { p: true },
      ]);
      
      const p = atom('p');
      const result = evaluateFormula(p, trace);
      
      expect(result).toBe(true);
    });

    it('should evaluate false proposition', () => {
      const trace = buildTrace('t1', [
        { p: false },
      ]);
      
      const p = atom('p');
      const result = evaluateFormula(p, trace);
      
      expect(result).toBe(false);
    });
  });

  describe('Always Operator', () => {
    it('should hold when proposition is always true', () => {
      const trace = buildTrace('t1', [
        { p: true },
        { p: true },
        { p: true },
      ]);
      
      const f = always(atom('p'));
      expect(evaluateFormula(f, trace)).toBe(true);
    });

    it('should fail when proposition is not always true', () => {
      const trace = buildTrace('t1', [
        { p: true },
        { p: false },
        { p: true },
      ]);
      
      const f = always(atom('p'));
      expect(evaluateFormula(f, trace)).toBe(false);
    });
  });

  describe('Eventually Operator', () => {
    it('should hold when proposition is eventually true', () => {
      const trace = buildTrace('t1', [
        { p: false },
        { p: false },
        { p: true },
      ]);
      
      const f = eventually(atom('p'));
      expect(evaluateFormula(f, trace)).toBe(true);
    });

    it('should fail when proposition is never true', () => {
      const trace = buildTrace('t1', [
        { p: false },
        { p: false },
        { p: false },
      ]);
      
      const f = eventually(atom('p'));
      expect(evaluateFormula(f, trace)).toBe(false);
    });
  });

  describe('Next Operator', () => {
    it('should evaluate at next state', () => {
      const trace = buildTrace('t1', [
        { p: false },
        { p: true },
      ]);
      
      const f = next(atom('p'));
      expect(evaluateFormula(f, trace)).toBe(true);
    });
  });

  describe('Until Operator', () => {
    it('should hold when p until q', () => {
      const trace = buildTrace('t1', [
        { p: true, q: false },
        { p: true, q: false },
        { p: false, q: true },
      ]);
      
      const f = until(atom('p'), atom('q'));
      expect(evaluateFormula(f, trace)).toBe(true);
    });

    it('should fail when q never holds', () => {
      const trace = buildTrace('t1', [
        { p: true, q: false },
        { p: true, q: false },
      ]);
      
      const f = until(atom('p'), atom('q'));
      expect(evaluateFormula(f, trace)).toBe(false);
    });
  });

  describe('Weak Until Operator', () => {
    it('should hold when p holds forever (q never)', () => {
      const trace = buildTrace('t1', [
        { p: true, q: false },
        { p: true, q: false },
        { p: true, q: false },
      ]);
      
      const f = weakUntil(atom('p'), atom('q'));
      expect(evaluateFormula(f, trace)).toBe(true);
    });
  });

  describe('Safety Pattern', () => {
    it('should hold for safe execution', () => {
      const trace = buildTrace('t1', [
        { valid_input: true, valid_output: true },
        { valid_input: true, valid_output: true },
        { valid_input: false, valid_output: false }, // No input, no output required
      ]);
      
      const f = safety(atom('valid_input'), atom('valid_output'));
      expect(evaluateFormula(f, trace)).toBe(true);
    });

    it('should fail for unsafe execution', () => {
      const trace = buildTrace('t1', [
        { valid_input: true, valid_output: true },
        { valid_input: true, valid_output: false }, // Valid input but invalid output
      ]);
      
      const f = safety(atom('valid_input'), atom('valid_output'));
      expect(evaluateFormula(f, trace)).toBe(false);
    });
  });

  describe('Liveness Pattern', () => {
    it('should hold when response follows request', () => {
      const trace = buildTrace('t1', [
        { request: true, response: false },
        { request: false, response: false },
        { request: false, response: true },
      ]);
      
      const f = liveness(atom('request'), atom('response'));
      expect(evaluateFormula(f, trace)).toBe(true);
    });

    it('should fail when response never comes', () => {
      const trace = buildTrace('t1', [
        { request: true, response: false },
        { request: false, response: false },
        { request: false, response: false },
      ]);
      
      const f = liveness(atom('request'), atom('response'));
      expect(evaluateFormula(f, trace)).toBe(false);
    });
  });

  describe('Past Operators', () => {
    it('should evaluate historically', () => {
      const trace = buildTrace('t1', [
        { p: true },
        { p: true },
        { p: true },
      ]);
      
      const evaluator = new LTLEvaluator(trace);
      const f = historically(atom('p'));
      
      // At position 2, historically(p) should be true
      expect(evaluator.evaluateAt(f, 2)).toBe(true);
    });

    it('should evaluate once', () => {
      const trace = buildTrace('t1', [
        { p: true },
        { p: false },
        { p: false },
      ]);
      
      const evaluator = new LTLEvaluator(trace);
      const f = once(atom('p'));
      
      // At position 2, once(p) should be true (p was true at state 0)
      expect(evaluator.evaluateAt(f, 2)).toBe(true);
    });
  });
});

describe('OMEGA Temporal Invariants', () => {
  it('should have all expected invariants', () => {
    expect(OMEGA_TEMPORAL_INVARIANTS.length).toBeGreaterThanOrEqual(15);
  });

  it('should have INV-TEMP-01 through INV-TEMP-05', () => {
    expect(getInvariantById('INV-TEMP-01')).toBeDefined();
    expect(getInvariantById('INV-TEMP-02')).toBeDefined();
    expect(getInvariantById('INV-TEMP-03')).toBeDefined();
    expect(getInvariantById('INV-TEMP-04')).toBeDefined();
    expect(getInvariantById('INV-TEMP-05')).toBeDefined();
  });

  it('should have critical invariants', () => {
    expect(CRITICAL_INVARIANTS.length).toBeGreaterThan(0);
    CRITICAL_INVARIANTS.forEach(inv => {
      expect(inv.severity).toBe(InvariantSeverity.CRITICAL);
    });
  });

  it('should have safety invariants', () => {
    expect(SAFETY_INVARIANTS.length).toBeGreaterThan(0);
    SAFETY_INVARIANTS.forEach(inv => {
      expect(inv.category).toBe(InvariantCategory.SAFETY);
    });
  });

  it('should get invariants by category', () => {
    const safetyInvs = getInvariantsByCategory(InvariantCategory.SAFETY);
    const livenessInvs = getInvariantsByCategory(InvariantCategory.LIVENESS);
    
    expect(safetyInvs.length).toBeGreaterThan(0);
    expect(livenessInvs.length).toBeGreaterThan(0);
  });

  it('should get invariants by severity', () => {
    const criticalInvs = getInvariantsBySeverity(InvariantSeverity.CRITICAL);
    const highInvs = getInvariantsBySeverity(InvariantSeverity.HIGH);
    
    expect(criticalInvs.length).toBeGreaterThan(0);
    expect(highInvs.length).toBeGreaterThan(0);
  });
});

describe('Temporal Verifier', () => {
  describe('Single Invariant Verification', () => {
    it('should verify passing invariant', () => {
      const inv = getInvariantById('INV-TEMP-01')!;
      const trace = buildTrace('t1', [
        { valid_input: true, valid_output: true },
        { valid_input: false, valid_output: false },
      ]);
      
      const verifier = createVerifier([inv], [trace]);
      const result = verifier.verifyInvariant(inv);
      
      expect(result.holds).toBe(true);
      expect(result.counterexamples.length).toBe(0);
    });

    it('should verify failing invariant', () => {
      const inv = getInvariantById('INV-TEMP-01')!;
      const trace = buildTrace('t1', [
        { valid_input: true, valid_output: false }, // Violation
      ]);
      
      const verifier = createVerifier([inv], [trace]);
      const result = verifier.verifyInvariant(inv);
      
      expect(result.holds).toBe(false);
      expect(result.counterexamples.length).toBeGreaterThan(0);
    });
  });

  describe('Full Verification', () => {
    it('should verify all invariants', () => {
      const trace = buildTrace('t1', [
        { 
          valid_input: true, 
          valid_output: true,
          request_received: true,
          response_sent: true,
          handler_executed: true,
          chronicle_ordered: true,
          circuit_open: false,
          circuit_closed: true,
          policy_allowed: true,
          policy_denied: false,
        },
      ]);
      
      const verifier = createVerifier(OMEGA_TEMPORAL_INVARIANTS.slice(0, 5), [trace]);
      const summary = verifier.verifyAll();
      
      expect(summary.totalInvariants).toBe(5);
    });

    it('should perform quick check', () => {
      const trace = buildTrace('t1', [
        { valid_input: true, valid_output: true },
      ]);
      
      const verifier = createVerifier([getInvariantById('INV-TEMP-01')!], [trace]);
      const result = verifier.quickCheck();
      
      expect(result.allPassed).toBe(true);
      expect(result.failedCount).toBe(0);
    });
  });

  describe('Report Generation', () => {
    it('should generate text report', () => {
      const inv = getInvariantById('INV-TEMP-01')!;
      const trace = buildTrace('t1', [
        { valid_input: true, valid_output: true },
      ]);
      
      const verifier = createVerifier([inv], [trace]);
      const summary = verifier.verifyAll();
      const report = generateReport(summary);
      
      expect(report).toContain('TEMPORAL VERIFICATION REPORT');
      expect(report).toContain('INV-TEMP-01');
    });
  });
});

describe('Integration Tests', () => {
  it('should verify a realistic OMEGA trace', () => {
    // Simulate a request processing trace
    const trace = buildTrace('omega-request', [
      // State 0: Request received (input not validated yet)
      { 
        request_received: true,
        valid_input: false, // Not yet validated
        envelope_valid: true,
        policy_checked: false,
        handler_executed: false,
        response_sent: false,
        chronicle_ordered: true,
        valid_output: false, // No output yet
      },
      // State 1: Policy checked
      {
        request_received: false,
        valid_input: true, // Now validated
        valid_output: true, // Output is valid
        envelope_valid: true,
        policy_checked: true,
        policy_allowed: true,
        policy_denied: false,
        handler_executed: false,
        response_sent: false,
        chronicle_ordered: true,
      },
      // State 2: Handler executed
      {
        request_received: false,
        valid_input: true,
        envelope_valid: true,
        policy_checked: true,
        policy_allowed: true,
        handler_executed: true,
        handler_active: true,
        response_sent: false,
        valid_output: true,
        chronicle_ordered: true,
        chronicle_recorded: true,
      },
      // State 3: Response sent
      {
        request_received: false,
        valid_input: false, // Request done
        envelope_valid: true,
        policy_checked: true,
        handler_executed: true,
        response_sent: true,
        valid_output: false, // No more output
        chronicle_ordered: true,
        chronicle_recorded: true,
        request_pending: false,
      },
    ]);

    // Verify safety invariants
    const safetyInvs = SAFETY_INVARIANTS.slice(0, 3);
    const verifier = createVerifier(safetyInvs, [trace]);
    const summary = verifier.verifyAll();

    expect(summary.criticalViolations.length).toBe(0);
  });
});
