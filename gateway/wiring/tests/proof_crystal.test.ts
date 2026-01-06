// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — TESTS: PROOF CRYSTAL MODULE
// Version: 1.0.0
// Date: 06 janvier 2026
// Standard: NASA-Grade L4 / DO-178C / MIL-STD
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';
import {
  sha256,
  hashObject,
  MerkleTreeBuilder,
  CausalityMatrixBuilder,
  StatisticalProfiler,
  DeterminismProver,
} from '../src/proof/crystal.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS SHA256
// ═══════════════════════════════════════════════════════════════════════════════

describe('sha256', () => {
  it('produces 64 character hex hash', () => {
    const hash = sha256('test');
    expect(hash.length).toBe(64);
    expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
  });

  it('is deterministic', () => {
    const hash1 = sha256('hello world');
    const hash2 = sha256('hello world');
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different inputs', () => {
    const hash1 = sha256('hello');
    const hash2 = sha256('world');
    expect(hash1).not.toBe(hash2);
  });

  it('handles empty string', () => {
    const hash = sha256('');
    expect(hash.length).toBe(64);
  });

  it('handles unicode', () => {
    const hash = sha256('日本語テスト 🔥');
    expect(hash.length).toBe(64);
  });
});

describe('hashObject', () => {
  it('hashes objects deterministically', () => {
    const obj = { a: 1, b: 2, c: [1, 2, 3] };
    const hash1 = hashObject(obj);
    const hash2 = hashObject(obj);
    expect(hash1).toBe(hash2);
  });

  it('produces same hash for equivalent objects with different key order', () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { b: 2, a: 1 };
    expect(hashObject(obj1)).toBe(hashObject(obj2));
  });

  it('produces different hashes for different objects', () => {
    const hash1 = hashObject({ x: 1 });
    const hash2 = hashObject({ x: 2 });
    expect(hash1).not.toBe(hash2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS MERKLE TREE
// ═══════════════════════════════════════════════════════════════════════════════

describe('MerkleTreeBuilder', () => {
  let builder: MerkleTreeBuilder;
  let time: number;

  beforeEach(() => {
    time = 1000;
    builder = new MerkleTreeBuilder({ nowMs: () => time++ });
  });

  describe('append', () => {
    it('creates node with correct structure', () => {
      const node = builder.append('TEST_EVENT', { value: 42 });

      expect(node.index).toBe(0);
      expect(node.eventType).toBe('TEST_EVENT');
      expect(node.hash.length).toBe(64);
      expect(node.parentHash).toBeNull();
    });

    it('chains nodes via parentHash', () => {
      const node1 = builder.append('EVENT_1', { a: 1 });
      const node2 = builder.append('EVENT_2', { b: 2 });
      const node3 = builder.append('EVENT_3', { c: 3 });

      expect(node1.parentHash).toBeNull();
      expect(node2.parentHash).toBe(node1.hash);
      expect(node3.parentHash).toBe(node2.hash);
    });

    it('increments index', () => {
      const n1 = builder.append('E1', {});
      const n2 = builder.append('E2', {});
      const n3 = builder.append('E3', {});

      expect(n1.index).toBe(0);
      expect(n2.index).toBe(1);
      expect(n3.index).toBe(2);
    });
  });

  describe('computeRoot', () => {
    it('returns consistent root for same sequence', () => {
      // Use fresh builders with identical clocks
      const time1 = { value: 1000 };
      const time2 = { value: 1000 };
      
      const builder1 = new MerkleTreeBuilder({ nowMs: () => time1.value++ });
      const builder2 = new MerkleTreeBuilder({ nowMs: () => time2.value++ });
      
      builder1.append('E1', { x: 1 });
      builder1.append('E2', { x: 2 });
      const root1 = builder1.computeRoot();

      builder2.append('E1', { x: 1 });
      builder2.append('E2', { x: 2 });
      const root2 = builder2.computeRoot();

      expect(root1).toBe(root2);
    });

    it('returns EMPTY_TREE hash for empty tree', () => {
      const root = builder.computeRoot();
      expect(root).toBe(sha256('EMPTY_TREE'));
    });

    it('changes when sequence changes', () => {
      builder.append('E1', { x: 1 });
      const root1 = builder.computeRoot();

      builder.reset();
      builder.append('E1', { x: 2 }); // Different data
      const root2 = builder.computeRoot();

      expect(root1).not.toBe(root2);
    });
  });

  describe('getNodes', () => {
    it('returns copy of nodes', () => {
      builder.append('E1', {});
      builder.append('E2', {});
      
      const nodes = builder.getNodes();
      expect(nodes.length).toBe(2);

      // Modifying returned array shouldn't affect builder
      nodes.push(null as any);
      expect(builder.getNodes().length).toBe(2);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS CAUSALITY MATRIX
// ═══════════════════════════════════════════════════════════════════════════════

describe('CausalityMatrixBuilder', () => {
  const builder = new CausalityMatrixBuilder();

  describe('buildMatrix', () => {
    it('builds correct size matrix', () => {
      const nodes = [
        { hash: 'h1', index: 0, timestamp: 1, eventType: 'DISPATCH_RECEIVED', data: '', parentHash: null },
        { hash: 'h2', index: 1, timestamp: 2, eventType: 'VALIDATION_OK', data: '', parentHash: 'h1' },
        { hash: 'h3', index: 2, timestamp: 3, eventType: 'DISPATCH_COMPLETE', data: '', parentHash: 'h2' },
      ];

      const matrix = builder.buildMatrix(nodes);

      expect(matrix.length).toBe(3);
      expect(matrix[0].length).toBe(3);
    });

    it('marks correct dependencies', () => {
      const nodes = [
        { hash: 'h1', index: 0, timestamp: 1, eventType: 'DISPATCH_RECEIVED', data: '', parentHash: null },
        { hash: 'h2', index: 1, timestamp: 2, eventType: 'VALIDATION_OK', data: '', parentHash: 'h1' },
      ];

      const matrix = builder.buildMatrix(nodes);

      // VALIDATION_OK depends on DISPATCH_RECEIVED
      expect(matrix[0][1]).toBe(true);
      // DISPATCH_RECEIVED has no dependencies
      expect(matrix[0][0]).toBe(false);
    });
  });

  describe('verify', () => {
    it('validates correct causal order', () => {
      const nodes = [
        { hash: 'h1', index: 0, timestamp: 100, eventType: 'DISPATCH_RECEIVED', data: '', parentHash: null },
        { hash: 'h2', index: 1, timestamp: 200, eventType: 'VALIDATION_OK', data: '', parentHash: 'h1' },
        { hash: 'h3', index: 2, timestamp: 300, eventType: 'POLICY_OK', data: '', parentHash: 'h2' },
      ];

      const matrix = builder.buildMatrix(nodes);
      const verification = builder.verify(nodes, matrix);

      expect(verification.valid).toBe(true);
      expect(verification.violations).toHaveLength(0);
      expect(verification.score).toBe(1);
    });

    it('detects causality violations', () => {
      const nodes = [
        { hash: 'h1', index: 0, timestamp: 200, eventType: 'DISPATCH_RECEIVED', data: '', parentHash: null }, // Later timestamp
        { hash: 'h2', index: 1, timestamp: 100, eventType: 'VALIDATION_OK', data: '', parentHash: 'h1' }, // Earlier timestamp
      ];

      const matrix = builder.buildMatrix(nodes);
      const verification = builder.verify(nodes, matrix);

      expect(verification.valid).toBe(false);
      expect(verification.violations.length).toBeGreaterThan(0);
      expect(verification.score).toBeLessThan(1);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS STATISTICAL PROFILER
// ═══════════════════════════════════════════════════════════════════════════════

describe('StatisticalProfiler', () => {
  const profiler = new StatisticalProfiler();

  describe('profile', () => {
    it('calculates correct mean', () => {
      const profile = profiler.profile([1, 2, 3, 4, 5]);
      expect(profile.mean).toBe(3);
    });

    it('calculates correct median', () => {
      const profile = profiler.profile([1, 2, 3, 4, 5]);
      expect(profile.median).toBe(3);
    });

    it('calculates correct stddev', () => {
      const profile = profiler.profile([2, 4, 4, 4, 5, 5, 7, 9]);
      // Stddev of this dataset is 2
      expect(profile.stddev).toBeCloseTo(2, 1);
    });

    it('calculates percentiles correctly', () => {
      const samples = Array.from({ length: 100 }, (_, i) => i + 1);
      const profile = profiler.profile(samples);

      expect(profile.p50).toBe(50);
      expect(profile.p99).toBe(99);
      expect(profile.min).toBe(1);
      expect(profile.max).toBe(100);
    });

    it('detects outliers', () => {
      // Use extremely outlier data
      const samples = [1, 1, 1, 1, 1, 1, 1, 1, 1, 10000];
      const profile = profiler.profile(samples);

      expect(profile.outliers).toContain(10000);
    });

    it('throws on empty samples', () => {
      expect(() => profiler.profile([])).toThrow();
    });

    it('handles single sample', () => {
      const profile = profiler.profile([42]);
      expect(profile.mean).toBe(42);
      expect(profile.median).toBe(42);
      expect(profile.n).toBe(1);
    });
  });

  describe('mannWhitneyU', () => {
    it('detects no significant difference for similar distributions', () => {
      const samples1 = [1, 2, 3, 4, 5];
      const samples2 = [1, 2, 3, 4, 5];

      const pValue = profiler.mannWhitneyU(samples1, samples2);
      expect(pValue).toBeGreaterThan(0.05);
    });

    it('detects significant difference for different distributions', () => {
      const samples1 = [1, 2, 3, 4, 5];
      const samples2 = [100, 200, 300, 400, 500];

      const pValue = profiler.mannWhitneyU(samples1, samples2);
      expect(pValue).toBeLessThan(0.05);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS DETERMINISM PROVER
// ═══════════════════════════════════════════════════════════════════════════════

describe('DeterminismProver', () => {
  const prover = new DeterminismProver();

  describe('prove', () => {
    it('proves determinism with identical outputs', () => {
      // Same output for all runs = deterministic
      const runs = [
        { inputHash: 'in1', outputHash: 'out1', traceHash: 'trace1' },
        { inputHash: 'in2', outputHash: 'out1', traceHash: 'trace2' }, // Different input, same output
        { inputHash: 'in3', outputHash: 'out1', traceHash: 'trace3' },
      ];

      const fingerprint = prover.prove(runs);

      expect(fingerprint.proven).toBe(true);
      expect(fingerprint.identicalRuns).toBe(3);
    });

    it('detects non-determinism when outputs differ', () => {
      const runs = [
        { inputHash: 'in1', outputHash: 'out1', traceHash: 'trace1' },
        { inputHash: 'in1', outputHash: 'out2', traceHash: 'trace1' }, // Different output!
        { inputHash: 'in1', outputHash: 'out1', traceHash: 'trace1' },
      ];

      const fingerprint = prover.prove(runs);

      expect(fingerprint.proven).toBe(false);
      expect(fingerprint.identicalRuns).toBe(2); // Only 2 have same output
    });

    it('handles empty runs', () => {
      const fingerprint = prover.prove([]);

      expect(fingerprint.proven).toBe(false);
      expect(fingerprint.identicalRuns).toBe(0);
    });

    it('requires at least 2 runs for proof', () => {
      const runs = [
        { inputHash: 'in1', outputHash: 'out1', traceHash: 'trace1' },
      ];

      const fingerprint = prover.prove(runs);

      expect(fingerprint.proven).toBe(false);
      expect(fingerprint.identicalRuns).toBe(1);
    });
  });
});
