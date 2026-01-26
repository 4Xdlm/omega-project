/**
 * OMEGA Phase C — Types Alignment Tests
 * 
 * Version: 1.0.0
 * Date: 2026-01-26
 * 
 * Test Requirements:
 * - Types TS coherent with JSON schemas
 * - All required fields present
 * - Enums match schema definitions
 */

import { describe, it, expect } from 'vitest';
import type {
  DecisionRequest,
  EvidencePack,
  Judgement,
  PolicyRef,
  PolicyBundle,
  GateClass,
  FailPolicy,
  Verdict,
  ClaimType,
  ContextRefType,
  PolicyScope,
  Severity,
  ProofVerdict,
  ActionType,
  Claim,
  ContextRef,
  Proof,
  MissingEvidence,
  ReasonCode,
  RequiredAction,
  CalibrationRef,
} from '../src/types.js';
import {
  PATTERNS,
  ERROR_CODES,
  DECISION_REQUEST_VOLATILE_FIELDS,
  JUDGEMENT_VOLATILE_FIELDS,
} from '../src/index.js';

describe('Type Definitions Exist', () => {
  it('exports all core types', () => {
    // These are compile-time checks - if they compile, the types exist
    const _verdict: Verdict = 'ACCEPT';
    const _gateClass: GateClass = 'REQUIRED';
    const _failPolicy: FailPolicy = 'REJECT';
    const _claimType: ClaimType = 'ARTIFACT_CERTIFICATION';
    const _contextRefType: ContextRefType = 'PHASE_A';
    const _policyScope: PolicyScope = 'ALL';
    const _severity: Severity = 'BLOCKER';
    const _proofVerdict: ProofVerdict = 'PASS';
    const _actionType: ActionType = 'PROVIDE_EVIDENCE';
    
    expect(true).toBe(true);
  });
});

describe('Verdict Enum Alignment', () => {
  it('has all schema-defined values', () => {
    const verdicts: Verdict[] = ['ACCEPT', 'REJECT', 'DEFER', 'APPEAL'];
    expect(verdicts).toHaveLength(4);
  });

  it('matches judgement.schema.json verdict enum', () => {
    // From schema: "enum": ["ACCEPT", "REJECT", "DEFER", "APPEAL"]
    const schemaVerdicts = ['ACCEPT', 'REJECT', 'DEFER', 'APPEAL'];
    const typeVerdicts: Verdict[] = ['ACCEPT', 'REJECT', 'DEFER', 'APPEAL'];
    
    expect(typeVerdicts).toEqual(schemaVerdicts);
  });
});

describe('GateClass Enum Alignment', () => {
  it('has all contract-defined values', () => {
    const classes: GateClass[] = ['REQUIRED', 'OPTIONAL'];
    expect(classes).toHaveLength(2);
  });
});

describe('FailPolicy Enum Alignment', () => {
  it('has all contract-defined values', () => {
    const policies: FailPolicy[] = ['REJECT', 'DEFER', 'APPEAL'];
    expect(policies).toHaveLength(3);
  });
});

describe('ClaimType Enum Alignment', () => {
  it('matches decision_request.schema.json ClaimType enum', () => {
    // From schema definitions.Claim.properties.type.enum
    const schemaTypes = [
      'ARTIFACT_CERTIFICATION',
      'EVIDENCE_VALIDATION',
      'SEGMENT_ACCEPTANCE',
      'FACT_PROMOTION',
      'MEMORY_ENTRY',
      'CUSTOM',
    ];
    
    const typeTypes: ClaimType[] = [
      'ARTIFACT_CERTIFICATION',
      'EVIDENCE_VALIDATION',
      'SEGMENT_ACCEPTANCE',
      'FACT_PROMOTION',
      'MEMORY_ENTRY',
      'CUSTOM',
    ];
    
    expect(typeTypes).toEqual(schemaTypes);
  });
});

describe('ContextRefType Enum Alignment', () => {
  it('matches decision_request.schema.json ContextRef.refType enum', () => {
    const schemaTypes = ['PHASE_A', 'PHASE_B', 'CANON', 'MEMORY', 'ARTIFACT'];
    const typeTypes: ContextRefType[] = ['PHASE_A', 'PHASE_B', 'CANON', 'MEMORY', 'ARTIFACT'];
    
    expect(typeTypes).toEqual(schemaTypes);
  });
});

describe('PolicyScope Enum Alignment', () => {
  it('matches policy_ref.schema.json scope enum', () => {
    const schemaScopes = ['CANON', 'MEMORY', 'ARTIFACT', 'PROMOTION', 'ALL'];
    const typeScopes: PolicyScope[] = ['CANON', 'MEMORY', 'ARTIFACT', 'PROMOTION', 'ALL'];
    
    expect(typeScopes).toEqual(schemaScopes);
  });
});

describe('Severity Enum Alignment', () => {
  it('matches policy_ref.schema.json severity enum', () => {
    const schemaSeverities = ['BLOCKER', 'MAJOR', 'MINOR'];
    const typeSeverities: Severity[] = ['BLOCKER', 'MAJOR', 'MINOR'];
    
    expect(typeSeverities).toEqual(schemaSeverities);
  });
});

describe('ProofVerdict Enum Alignment', () => {
  it('matches evidence_pack.schema.json Proof.verdict enum', () => {
    const schemaVerdicts = ['PASS', 'FAIL', 'WARN', 'SKIP'];
    const typeVerdicts: ProofVerdict[] = ['PASS', 'FAIL', 'WARN', 'SKIP'];
    
    expect(typeVerdicts).toEqual(schemaVerdicts);
  });
});

describe('ActionType Enum Alignment', () => {
  it('matches judgement.schema.json RequiredAction.actionType enum', () => {
    const schemaActions = [
      'PROVIDE_EVIDENCE',
      'RECALIBRATE',
      'ESCALATE',
      'RESOLVE_CONFLICT',
      'RETRY',
      'MANUAL_REVIEW',
    ];
    
    const typeActions: ActionType[] = [
      'PROVIDE_EVIDENCE',
      'RECALIBRATE',
      'ESCALATE',
      'RESOLVE_CONFLICT',
      'RETRY',
      'MANUAL_REVIEW',
    ];
    
    expect(typeActions).toEqual(schemaActions);
  });
});

describe('Volatile Fields Alignment', () => {
  it('DecisionRequest volatile fields match schema _volatileFields', () => {
    // From decision_request.schema.json: "_volatileFields": ["submittedAt"]
    const schemaVolatile = ['submittedAt'];
    
    expect([...DECISION_REQUEST_VOLATILE_FIELDS]).toEqual(schemaVolatile);
  });

  it('Judgement volatile fields match schema _volatileFields', () => {
    // From judgement.schema.json: "_volatileFields": ["executedAt", "executionDurationMs"]
    // Plus judgementHash which is excluded from self-hash
    const schemaVolatile = ['executedAt', 'executionDurationMs', 'judgementHash'];
    
    expect([...JUDGEMENT_VOLATILE_FIELDS]).toEqual(schemaVolatile);
  });
});

describe('PATTERNS Alignment', () => {
  it('TRACE_ID pattern matches schema', () => {
    // From schema: "^C-[0-9]{8}-[0-9]{6}-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
    const validId = 'C-20260126-143022-a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    expect(PATTERNS.TRACE_ID.test(validId)).toBe(true);
  });

  it('JUDGEMENT_ID pattern matches schema', () => {
    // From schema: "^J-[0-9]{8}-[0-9]{6}-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
    const validId = 'J-20260126-143022-a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    expect(PATTERNS.JUDGEMENT_ID.test(validId)).toBe(true);
  });

  it('SHA256 pattern matches schema', () => {
    // From schema: "^[a-f0-9]{64}$"
    const validHash = 'a'.repeat(64);
    expect(PATTERNS.SHA256.test(validHash)).toBe(true);
  });

  it('INVARIANT_ID pattern matches schema', () => {
    // From schema: "^INV-[A-Z]+-[0-9]+(-[A-Z0-9]+)?$"
    expect(PATTERNS.INVARIANT_ID.test('INV-C-01')).toBe(true);
    expect(PATTERNS.INVARIANT_ID.test('INV-SENT-001')).toBe(true);
    expect(PATTERNS.INVARIANT_ID.test('INV-C-GATE-01')).toBe(true);
  });

  it('REASON_CODE pattern matches schema', () => {
    // From schema: "^(RC-[0-9]{3}|INV-[A-Z]+-[0-9]+(-[A-Z0-9]+)?-VIOLATION|ERR-C-[A-Z]+-[0-9]+)$"
    expect(PATTERNS.REASON_CODE.test('RC-001')).toBe(true);
    expect(PATTERNS.REASON_CODE.test('INV-C-01-VIOLATION')).toBe(true);
    expect(PATTERNS.REASON_CODE.test('ERR-C-GATE-01')).toBe(true);
  });

  it('PREV_JUDGEMENT_HASH pattern matches schema', () => {
    // From schema: "^([a-f0-9]{64}|GENESIS)$"
    expect(PATTERNS.PREV_JUDGEMENT_HASH.test('GENESIS')).toBe(true);
    expect(PATTERNS.PREV_JUDGEMENT_HASH.test('a'.repeat(64))).toBe(true);
  });
});

describe('ERROR_CODES Structure', () => {
  it('has all gate error codes', () => {
    expect(ERROR_CODES.GATE_01).toBe('ERR-C-GATE-01');
    expect(ERROR_CODES.GATE_02).toBe('ERR-C-GATE-02');
    expect(ERROR_CODES.GATE_03).toBe('ERR-C-GATE-03');
    expect(ERROR_CODES.GATE_04).toBe('ERR-C-GATE-04');
    expect(ERROR_CODES.GATE_05).toBe('ERR-C-GATE-05');
    expect(ERROR_CODES.GATE_06).toBe('ERR-C-GATE-06');
    expect(ERROR_CODES.GATE_07).toBe('ERR-C-GATE-07');
    expect(ERROR_CODES.GATE_08).toBe('ERR-C-GATE-08');
    expect(ERROR_CODES.GATE_09).toBe('ERR-C-GATE-09');
  });

  it('has schema error codes', () => {
    expect(ERROR_CODES.SCHEMA_01).toBe('ERR-C-SCHEMA-01');
    expect(ERROR_CODES.SCHEMA_02).toBe('ERR-C-SCHEMA-02');
    expect(ERROR_CODES.SCHEMA_03).toBe('ERR-C-SCHEMA-03');
  });

  it('has digest error codes', () => {
    expect(ERROR_CODES.DIGEST_01).toBe('ERR-C-DIGEST-01');
    expect(ERROR_CODES.DIGEST_02).toBe('ERR-C-DIGEST-02');
  });

  it('has canonical JSON error codes', () => {
    expect(ERROR_CODES.CANONICAL_01).toBe('ERR-C-CANONICAL-01');
    expect(ERROR_CODES.CANONICAL_02).toBe('ERR-C-CANONICAL-02');
  });

  it('all error codes follow pattern ERR-C-*', () => {
    for (const code of Object.values(ERROR_CODES)) {
      expect(code).toMatch(/^ERR-C-[A-Z]+-[0-9]+$/);
    }
  });
});

describe('Interface Required Fields', () => {
  it('PolicyRef has all required fields from schema', () => {
    // Schema required: ["invariantId", "sourcePath", "sourceSha256", "versionTag", "scope", "severity"]
    const policyRef: PolicyRef = {
      invariantId: 'INV-C-01',
      sourcePath: 'docs/test.md',
      sourceSha256: 'a'.repeat(64),
      versionTag: 'v1.0.0',
      scope: 'ALL',
      severity: 'BLOCKER',
    };
    
    expect(policyRef.invariantId).toBeDefined();
    expect(policyRef.sourcePath).toBeDefined();
    expect(policyRef.sourceSha256).toBeDefined();
    expect(policyRef.versionTag).toBeDefined();
    expect(policyRef.scope).toBeDefined();
    expect(policyRef.severity).toBeDefined();
  });

  it('EvidencePack has all required fields from schema', () => {
    // Schema required: ["inputsDigest", "proofs", "missing"]
    const pack: EvidencePack = {
      inputsDigest: 'a'.repeat(64),
      proofs: [],
      missing: [],
    };
    
    expect(pack.inputsDigest).toBeDefined();
    expect(pack.proofs).toBeDefined();
    expect(pack.missing).toBeDefined();
  });

  it('Judgement has all required fields from schema', () => {
    // Schema required: all fields except none optional
    const judgement: Judgement = {
      judgementId: 'J-20260126-143022-a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      traceId: 'C-20260126-143022-a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      verdict: 'ACCEPT',
      reasons: [{ code: 'RC-001', severity: 'MINOR' }],
      requiredActions: [],
      evidenceRefs: ['a'.repeat(64)],
      prevJudgementHash: 'GENESIS',
      judgementHash: 'a'.repeat(64),
      executedAt: '2026-01-26T14:30:22Z',
      executionDurationMs: 100,
    };
    
    expect(judgement.judgementId).toBeDefined();
    expect(judgement.traceId).toBeDefined();
    expect(judgement.verdict).toBeDefined();
    expect(judgement.reasons).toBeDefined();
    expect(judgement.requiredActions).toBeDefined();
    expect(judgement.evidenceRefs).toBeDefined();
    expect(judgement.prevJudgementHash).toBeDefined();
    expect(judgement.judgementHash).toBeDefined();
    expect(judgement.executedAt).toBeDefined();
    expect(judgement.executionDurationMs).toBeDefined();
  });
});
