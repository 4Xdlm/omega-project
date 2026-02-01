import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { oracle, OracleRequest } from '../../src/sentinel/oracle';
import { decide, DecisionRequest, loadPolicy } from '../../src/sentinel/decision_engine';

describe('DECISION_ENGINE v1.1', () => {
  beforeAll(() => {
    const evidenceDir = path.join(process.cwd(), 'nexus', 'proof', 'phase_c_sentinel', 'EVIDENCE');
    if (!fs.existsSync(evidenceDir)) {
      fs.mkdirSync(evidenceDir, { recursive: true });
    }
    const runIdPath = path.join(evidenceDir, 'RUN_ID.txt');
    if (!fs.existsSync(runIdPath)) {
      fs.writeFileSync(runIdPath, 'TEST_RUN_ID_001');
    }

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

  it('INV-DECISION-01: REJECTED if canon_check fails', () => {
    const oracleRequest: OracleRequest = {
      context: 'Test canon failure',
      constraints: [],
      canon_refs: []
    };
    const oracleResponse = oracle(oracleRequest);

    // Forcer non-compliance
    oracleResponse.options[0].canon_compliance = false;

    const decisionRequest: DecisionRequest = {
      oracle_response_id: oracleResponse.request_id,
      selected_option_id: oracleResponse.options[0].id,
      selector: 'HUMAN'
    };

    const verdict = decide(decisionRequest, oracleResponse);
    expect(verdict.verdict).toBe('REJECTED');
    expect(verdict.canon_check.passed).toBe(false);
  });

  it('INV-DECISION-02: REJECTED if invariant_check fails', () => {
    const oracleRequest: OracleRequest = {
      context: 'Test invariant failure',
      constraints: [],
      canon_refs: []
    };
    const oracleResponse = oracle(oracleRequest);

    // Forcer violation invariant
    oracleResponse.options[0].score = 1.5; // Invalid score > 1

    const decisionRequest: DecisionRequest = {
      oracle_response_id: oracleResponse.request_id,
      selected_option_id: oracleResponse.options[0].id,
      selector: 'RULE',
      rule_id: 'TEST_RULE'
    };

    const verdict = decide(decisionRequest, oracleResponse);
    expect(verdict.verdict).toBe('REJECTED');
    expect(verdict.invariant_check.passed).toBe(false);
  });

  it('INV-DECISION-04: creates trace file', () => {
    const oracleRequest: OracleRequest = {
      context: 'Test trace creation',
      constraints: [],
      canon_refs: []
    };
    const oracleResponse = oracle(oracleRequest);

    const decisionRequest: DecisionRequest = {
      oracle_response_id: oracleResponse.request_id,
      selected_option_id: oracleResponse.options[0].id,
      selector: 'HUMAN'
    };

    const verdict = decide(decisionRequest, oracleResponse);
    expect(verdict.trace_file).toBeTruthy();
    expect(fs.existsSync(verdict.trace_file)).toBe(true);

    // Verify trace content
    const traceContent = JSON.parse(fs.readFileSync(verdict.trace_file, 'utf-8'));
    expect(traceContent.request_id).toBe(verdict.request_id);
  });

  it('uses policy thresholds (v1.1 - no magic numbers)', () => {
    const policy = loadPolicy();

    const oracleRequest: OracleRequest = {
      context: 'Test threshold usage',
      constraints: [],
      canon_refs: []
    };
    const oracleResponse = oracle(oracleRequest);

    const decisionRequest: DecisionRequest = {
      oracle_response_id: oracleResponse.request_id,
      selected_option_id: oracleResponse.options[0].id,
      selector: 'HUMAN'
    };

    const verdict = decide(decisionRequest, oracleResponse);

    // Verdict reason should reference policy thresholds
    if (verdict.verdict === 'APPROVED') {
      expect(verdict.reason).toContain(policy.τ_approval_threshold.toString());
    }
  });

  it('REJECTED for non-existent option', () => {
    const oracleRequest: OracleRequest = {
      context: 'Test',
      constraints: [],
      canon_refs: []
    };
    const oracleResponse = oracle(oracleRequest);

    const decisionRequest: DecisionRequest = {
      oracle_response_id: oracleResponse.request_id,
      selected_option_id: 'NON_EXISTENT_OPTION',
      selector: 'HUMAN'
    };

    const verdict = decide(decisionRequest, oracleResponse);
    expect(verdict.verdict).toBe('REJECTED');
    expect(verdict.reason).toContain('not found');
  });
});
