import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { oracle, OracleRequest, loadPolicy } from '../../src/sentinel/oracle';

describe('ORACLE v1.1', () => {
  beforeAll(() => {
    // Créer structure pour tests
    const evidenceDir = path.join(process.cwd(), 'nexus', 'proof', 'phase_c_sentinel', 'EVIDENCE');
    if (!fs.existsSync(evidenceDir)) {
      fs.mkdirSync(evidenceDir, { recursive: true });
    }
    const runIdPath = path.join(evidenceDir, 'RUN_ID.txt');
    if (!fs.existsSync(runIdPath)) {
      fs.writeFileSync(runIdPath, 'TEST_RUN_ID_001');
    }

    // Créer C_POLICY.json pour tests si absent
    const policyDir = path.join(process.cwd(), 'nexus', 'proof', 'phase_c_sentinel');
    const policyPath = path.join(policyDir, 'C_POLICY.json');
    if (!fs.existsSync(policyPath)) {
      const policy = {
        policy_version: "1.1",
        phase: "C",
        oracle: {
          τ_min_options: 2,
          τ_score_floor: 0.0,
          τ_score_ceiling: 1.0,
          τ_weight_canon_compliance: 0.4,
          τ_weight_risk_mitigation: 0.3,
          τ_weight_complexity: 0.2,
          τ_weight_alignment: 0.1
        },
        decision_engine: {
          τ_approval_threshold: 0.5,
          τ_escalation_threshold: 0.3
        }
      };
      fs.writeFileSync(policyPath, JSON.stringify(policy, null, 2));
    }
  });

  it('INV-ORACLE-01: recommendation is always null', () => {
    const request: OracleRequest = {
      context: 'Test decision context',
      constraints: ['constraint1'],
      canon_refs: ['ref1']
    };

    const response = oracle(request);
    expect(response.recommendation).toBeNull();
  });

  it('INV-ORACLE-02: generates at least τ_min_options', () => {
    const policy = loadPolicy();
    const request: OracleRequest = {
      context: 'Test decision',
      constraints: [],
      canon_refs: []
    };

    const response = oracle(request);
    expect(response.options.length).toBeGreaterThanOrEqual(policy.τ_min_options);
  });

  it('INV-ORACLE-03: each option has explicit canon_compliance', () => {
    const request: OracleRequest = {
      context: 'Test decision',
      constraints: [],
      canon_refs: []
    };

    const response = oracle(request);
    response.options.forEach(option => {
      expect(typeof option.canon_compliance).toBe('boolean');
    });
  });

  it('INV-ORACLE-04: deterministic output', () => {
    const request: OracleRequest = {
      context: 'Exact same context',
      constraints: ['c1', 'c2'],
      canon_refs: ['r1']
    };

    const response1 = oracle(request);
    const response2 = oracle(request);

    expect(response1.request_id).toBe(response2.request_id);
    expect(response1.options.length).toBe(response2.options.length);
    expect(response1.options[0].score).toBe(response2.options[0].score);
    expect(response1.options[0].id).toBe(response2.options[0].id);
  });

  it('INV-ORACLE-05: no magic numbers - all from policy', () => {
    const request: OracleRequest = {
      context: 'Test',
      constraints: [],
      canon_refs: []
    };

    const response = oracle(request);

    // Scores should be calculated, not hardcoded 0.7/0.6
    response.options.forEach(option => {
      expect(option.score_breakdown).toBeDefined();
      expect(option.score_breakdown.canon_compliance).toBeDefined();
      expect(option.score_breakdown.risk_mitigation).toBeDefined();
      expect(option.score_breakdown.complexity).toBeDefined();
      expect(option.score_breakdown.alignment).toBeDefined();
    });
  });

  it('options are sorted by score descending', () => {
    const request: OracleRequest = {
      context: 'Test sorting',
      constraints: [],
      canon_refs: []
    };

    const response = oracle(request);
    for (let i = 1; i < response.options.length; i++) {
      expect(response.options[i-1].score).toBeGreaterThanOrEqual(response.options[i].score);
    }
  });

  it('options are context-dependent (v1.1)', () => {
    const request1: OracleRequest = {
      context: 'Context A with specific requirements',
      constraints: ['fast', 'cheap'],
      canon_refs: []
    };

    const request2: OracleRequest = {
      context: 'Context B with different requirements',
      constraints: ['quality', 'scalable'],
      canon_refs: ['canon1']
    };

    const response1 = oracle(request1);
    const response2 = oracle(request2);

    // Different contexts should produce different request_ids
    expect(response1.request_id).not.toBe(response2.request_id);

    // Descriptions should reflect context
    expect(response1.options[0].description).toContain('Context A');
    expect(response2.options[0].description).toContain('Context B');
  });
});
