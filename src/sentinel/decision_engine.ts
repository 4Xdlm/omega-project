/**
 * DECISION_ENGINE — Validateur de décisions v1.1
 *
 * CORRECTIONS v1.1:
 * - Seuils depuis C_POLICY.json
 * - Pas de constantes magiques
 *
 * INVARIANTS:
 * - INV-DECISION-01: REJECTED si canon_check.passed = false
 * - INV-DECISION-02: REJECTED si invariant_check.passed = false
 * - INV-DECISION-03: ESCALATE si conflit non résolvable
 * - INV-DECISION-04: Chaque décision = fichier trace JSON
 */

import * as fs from 'fs';
import * as path from 'path';
import { OracleResponse, OracleOption } from './oracle';

// Types
export interface DecisionRequest {
  oracle_response_id: string;
  selected_option_id: string;
  selector: 'HUMAN' | 'RULE';
  rule_id?: string;
}

export interface DecisionVerdict {
  request_id: string;
  run_id: string;
  selected_option_id: string;
  verdict: 'APPROVED' | 'REJECTED' | 'ESCALATE';
  reason: string;
  canon_check: {
    passed: boolean;
    violations: string[];
  };
  invariant_check: {
    passed: boolean;
    violations: string[];
  };
  trace_file: string;
}

interface DecisionPolicy {
  τ_approval_threshold: number;
  τ_escalation_threshold: number;
}

// Charger policy
export function loadPolicy(): DecisionPolicy {
  const policyPath = path.join(process.cwd(), 'nexus', 'proof', 'phase_c_sentinel', 'C_POLICY.json');
  if (!fs.existsSync(policyPath)) {
    throw new Error(`FAIL: C_POLICY.json not found. Numbers Policy violated.`);
  }
  const policy = JSON.parse(fs.readFileSync(policyPath, 'utf-8'));
  return policy.decision_engine as DecisionPolicy;
}

// Importer RUN_ID
function getRunId(): string {
  const runIdPath = path.join(process.cwd(), 'nexus', 'proof', 'phase_c_sentinel', 'EVIDENCE', 'RUN_ID.txt');
  if (!fs.existsSync(runIdPath)) {
    throw new Error(`FAIL: RUN_ID.txt not found at ${runIdPath}`);
  }
  return fs.readFileSync(runIdPath, 'utf-8').trim();
}

// Vérifier conformité CANON
export function checkCanon(option: OracleOption): { passed: boolean; violations: string[] } {
  const violations: string[] = [];

  if (!option.canon_compliance) {
    violations.push(`Option ${option.id} marked as non-compliant with CANON`);
  }

  // Vérifier score_breakdown.canon_compliance
  if (option.score_breakdown.canon_compliance < 0.5) {
    violations.push(`Option ${option.id} has low canon compliance score: ${option.score_breakdown.canon_compliance}`);
  }

  return {
    passed: violations.length === 0,
    violations
  };
}

// Vérifier invariants
export function checkInvariants(option: OracleOption, policy: DecisionPolicy): { passed: boolean; violations: string[] } {
  const violations: string[] = [];

  // Vérifier que score est dans [0, 1]
  if (option.score < 0 || option.score > 1) {
    violations.push(`Option ${option.id} has invalid score: ${option.score}`);
  }

  // Vérifier que justification existe
  if (!option.justification || option.justification.trim() === '') {
    violations.push(`Option ${option.id} has no justification`);
  }

  // Vérifier score_breakdown complet
  const breakdown = option.score_breakdown;
  if (breakdown.canon_compliance === undefined ||
      breakdown.risk_mitigation === undefined ||
      breakdown.complexity === undefined ||
      breakdown.alignment === undefined) {
    violations.push(`Option ${option.id} has incomplete score_breakdown`);
  }

  return {
    passed: violations.length === 0,
    violations
  };
}

// Sauvegarder trace (INV-DECISION-04)
function saveTrace(verdict: DecisionVerdict): string {
  const traceDir = path.join(process.cwd(), 'nexus', 'proof', 'phase_c_sentinel', 'EVIDENCE', 'decisions');

  if (!fs.existsSync(traceDir)) {
    fs.mkdirSync(traceDir, { recursive: true });
  }

  const traceFile = path.join(traceDir, `DECISION_${verdict.request_id}.json`);
  fs.writeFileSync(traceFile, JSON.stringify(verdict, null, 2));

  return traceFile;
}

// DECISION_ENGINE principal (v1.1)
export function decide(
  request: DecisionRequest,
  oracleResponse: OracleResponse
): DecisionVerdict {
  const policy = loadPolicy();
  const runId = getRunId();

  // Trouver l'option sélectionnée
  const selectedOption = oracleResponse.options.find(o => o.id === request.selected_option_id);

  if (!selectedOption) {
    const verdict: DecisionVerdict = {
      request_id: request.oracle_response_id,
      run_id: runId,
      selected_option_id: request.selected_option_id,
      verdict: 'REJECTED',
      reason: `Selected option ${request.selected_option_id} not found in oracle response`,
      canon_check: { passed: false, violations: ['Option not found'] },
      invariant_check: { passed: false, violations: ['Option not found'] },
      trace_file: ''
    };
    verdict.trace_file = saveTrace(verdict);
    return verdict;
  }

  // Vérifications
  const canonCheck = checkCanon(selectedOption);
  const invariantCheck = checkInvariants(selectedOption, policy);

  // Déterminer verdict selon policy (v1.1 - pas de magic numbers)
  let verdict: 'APPROVED' | 'REJECTED' | 'ESCALATE';
  let reason: string;

  if (!canonCheck.passed) {
    // INV-DECISION-01
    verdict = 'REJECTED';
    reason = `CANON violation: ${canonCheck.violations.join(', ')}`;
  } else if (!invariantCheck.passed) {
    // INV-DECISION-02
    verdict = 'REJECTED';
    reason = `Invariant violation: ${invariantCheck.violations.join(', ')}`;
  } else if (selectedOption.score >= policy.τ_approval_threshold) {
    verdict = 'APPROVED';
    reason = `Score ${selectedOption.score.toFixed(3)} >= threshold ${policy.τ_approval_threshold}. All checks passed.`;
  } else if (selectedOption.score < policy.τ_escalation_threshold) {
    verdict = 'REJECTED';
    reason = `Score ${selectedOption.score.toFixed(3)} < escalation threshold ${policy.τ_escalation_threshold}`;
  } else {
    // INV-DECISION-03
    verdict = 'ESCALATE';
    reason = `Score ${selectedOption.score.toFixed(3)} between thresholds. Human review required.`;
  }

  const decisionVerdict: DecisionVerdict = {
    request_id: request.oracle_response_id,
    run_id: runId,
    selected_option_id: request.selected_option_id,
    verdict,
    reason,
    canon_check: canonCheck,
    invariant_check: invariantCheck,
    trace_file: ''
  };

  // INV-DECISION-04: Sauvegarder trace
  decisionVerdict.trace_file = saveTrace(decisionVerdict);

  return decisionVerdict;
}
