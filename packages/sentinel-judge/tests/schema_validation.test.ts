/**
 * OMEGA Phase C — Schema Validation Tests
 * 
 * Version: 1.0.0
 * Date: 2026-01-26
 * 
 * Test Requirements:
 * - Each valid JSON passes
 * - Missing required field = FAIL
 * - Invalid format = FAIL
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  validate,
  validateOrThrow,
  isValidDecisionRequest,
  isValidEvidencePack,
  isValidJudgement,
  isValidPolicyRef,
  isValidTraceId,
  isValidJudgementId,
  isValidSha256,
  isValidInvariantId,
  isValidReasonCode,
  clearSchemaCache,
  SentinelJudgeError,
  ERROR_CODES,
} from '../src/index.js';

// Test fixtures
const VALID_SHA256 = 'a'.repeat(64);
const VALID_TRACE_ID = 'C-20260126-143022-a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const VALID_JUDGEMENT_ID = 'J-20260126-143022-a1b2c3d4-e5f6-7890-abcd-ef1234567890';

const validPolicyRef = {
  invariantId: 'INV-C-01',
  sourcePath: 'docs/INVARIANTS.md',
  sourceSha256: VALID_SHA256,
  versionTag: 'v1.0.0',
  scope: 'ALL',
  severity: 'BLOCKER',
};

const validEvidencePack = {
  inputsDigest: VALID_SHA256,
  proofs: [
    {
      proofType: 'HASH_CHAIN',
      source: 'genesis-forge/J1_JUDGE',
      sourceVersion: 'v1.2.1',
      hash: VALID_SHA256,
      verdict: 'PASS',
    },
  ],
  missing: [],
};

const validDecisionRequest = {
  traceId: VALID_TRACE_ID,
  submittedBy: 'TEST_HARNESS',
  submittedAt: '2026-01-26T14:30:22Z',
  claim: {
    type: 'ARTIFACT_CERTIFICATION',
    payload: { test: true },
    payloadHash: VALID_SHA256,
  },
  contextRefs: [
    {
      refType: 'PHASE_A',
      path: 'docs/phase-a/manifest.md',
      sha256: VALID_SHA256,
    },
  ],
  evidencePack: validEvidencePack,
  policyBundle: {
    bundleId: 'test-bundle',
    bundleVersion: 'v1.0.0',
    bundleSha256: VALID_SHA256,
    policies: [validPolicyRef],
  },
};

const validJudgement = {
  judgementId: VALID_JUDGEMENT_ID,
  traceId: VALID_TRACE_ID,
  verdict: 'ACCEPT',
  reasons: [
    {
      code: 'RC-001',
      severity: 'MINOR',
    },
  ],
  requiredActions: [],
  evidenceRefs: [VALID_SHA256],
  prevJudgementHash: 'GENESIS',
  judgementHash: VALID_SHA256,
  executedAt: '2026-01-26T14:30:22Z',
  executionDurationMs: 150,
};

describe('Schema Loading', () => {
  beforeEach(() => {
    clearSchemaCache();
  });

  it('loads policy_ref schema', () => {
    const result = validate(validPolicyRef, 'policy_ref');
    expect(result.valid).toBe(true);
  });

  it('loads evidence_pack schema', () => {
    const result = validate(validEvidencePack, 'evidence_pack');
    expect(result.valid).toBe(true);
  });

  it('loads judgement schema', () => {
    const result = validate(validJudgement, 'judgement');
    expect(result.valid).toBe(true);
  });
});

describe('PolicyRef Validation', () => {
  it('validates correct PolicyRef', () => {
    const result = validate(validPolicyRef, 'policy_ref');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails on missing invariantId', () => {
    const invalid = { ...validPolicyRef };
    delete (invalid as Record<string, unknown>).invariantId;
    
    const result = validate(invalid, 'policy_ref');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.path.includes('invariantId'))).toBe(true);
  });

  it('fails on invalid invariantId format', () => {
    const invalid = { ...validPolicyRef, invariantId: 'invalid-format' };
    
    const result = validate(invalid, 'policy_ref');
    expect(result.valid).toBe(false);
  });

  it('fails on invalid scope enum', () => {
    const invalid = { ...validPolicyRef, scope: 'INVALID' };
    
    const result = validate(invalid, 'policy_ref');
    expect(result.valid).toBe(false);
  });

  it('fails on invalid severity enum', () => {
    const invalid = { ...validPolicyRef, severity: 'CRITICAL' };
    
    const result = validate(invalid, 'policy_ref');
    expect(result.valid).toBe(false);
  });

  it('fails on invalid sha256 format', () => {
    const invalid = { ...validPolicyRef, sourceSha256: 'too-short' };
    
    const result = validate(invalid, 'policy_ref');
    expect(result.valid).toBe(false);
  });
});

describe('EvidencePack Validation', () => {
  it('validates correct EvidencePack', () => {
    const result = validate(validEvidencePack, 'evidence_pack');
    expect(result.valid).toBe(true);
  });

  it('fails on missing inputsDigest', () => {
    const invalid = { ...validEvidencePack };
    delete (invalid as Record<string, unknown>).inputsDigest;
    
    const result = validate(invalid, 'evidence_pack');
    expect(result.valid).toBe(false);
  });

  it('fails on invalid proof verdict', () => {
    const invalid = {
      ...validEvidencePack,
      proofs: [{ ...validEvidencePack.proofs[0], verdict: 'INVALID' }],
    };
    
    const result = validate(invalid, 'evidence_pack');
    expect(result.valid).toBe(false);
  });
});

describe('Judgement Validation', () => {
  it('validates correct Judgement', () => {
    const result = validate(validJudgement, 'judgement');
    expect(result.valid).toBe(true);
  });

  it('fails on missing verdict', () => {
    const invalid = { ...validJudgement };
    delete (invalid as Record<string, unknown>).verdict;
    
    const result = validate(invalid, 'judgement');
    expect(result.valid).toBe(false);
  });

  it('fails on invalid verdict enum', () => {
    const invalid = { ...validJudgement, verdict: 'INVALID' };
    
    const result = validate(invalid, 'judgement');
    expect(result.valid).toBe(false);
  });

  it('fails on invalid judgementId format', () => {
    const invalid = { ...validJudgement, judgementId: 'invalid' };
    
    const result = validate(invalid, 'judgement');
    expect(result.valid).toBe(false);
  });

  it('fails on empty reasons array', () => {
    const invalid = { ...validJudgement, reasons: [] };
    
    const result = validate(invalid, 'judgement');
    expect(result.valid).toBe(false);
  });

  it('fails on empty evidenceRefs array', () => {
    const invalid = { ...validJudgement, evidenceRefs: [] };
    
    const result = validate(invalid, 'judgement');
    expect(result.valid).toBe(false);
  });
});

describe('validateOrThrow', () => {
  it('does not throw for valid input', () => {
    expect(() => validateOrThrow(validPolicyRef, 'policy_ref')).not.toThrow();
  });

  it('throws SentinelJudgeError for invalid input', () => {
    const invalid = { ...validPolicyRef };
    delete (invalid as Record<string, unknown>).invariantId;
    
    expect(() => validateOrThrow(invalid, 'policy_ref')).toThrow(SentinelJudgeError);
    expect(() => validateOrThrow(invalid, 'policy_ref')).toThrow(ERROR_CODES.SCHEMA_01);
  });
});

describe('Type Guards', () => {
  it('isValidPolicyRef returns true for valid', () => {
    expect(isValidPolicyRef(validPolicyRef)).toBe(true);
  });

  it('isValidPolicyRef returns false for invalid', () => {
    expect(isValidPolicyRef({})).toBe(false);
  });

  it('isValidEvidencePack returns true for valid', () => {
    expect(isValidEvidencePack(validEvidencePack)).toBe(true);
  });

  it('isValidJudgement returns true for valid', () => {
    expect(isValidJudgement(validJudgement)).toBe(true);
  });
});

describe('Pattern Validators', () => {
  describe('isValidTraceId', () => {
    it('accepts valid traceId', () => {
      expect(isValidTraceId(VALID_TRACE_ID)).toBe(true);
    });

    it('rejects invalid format', () => {
      expect(isValidTraceId('invalid')).toBe(false);
      expect(isValidTraceId('C-20260126')).toBe(false);
      expect(isValidTraceId('X-20260126-143022-a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(false);
    });
  });

  describe('isValidJudgementId', () => {
    it('accepts valid judgementId', () => {
      expect(isValidJudgementId(VALID_JUDGEMENT_ID)).toBe(true);
    });

    it('rejects invalid format', () => {
      expect(isValidJudgementId('invalid')).toBe(false);
      expect(isValidJudgementId(VALID_TRACE_ID)).toBe(false); // Wrong prefix
    });
  });

  describe('isValidSha256', () => {
    it('accepts valid SHA-256', () => {
      expect(isValidSha256(VALID_SHA256)).toBe(true);
      expect(isValidSha256('0123456789abcdef'.repeat(4))).toBe(true);
    });

    it('rejects invalid format', () => {
      expect(isValidSha256('too-short')).toBe(false);
      expect(isValidSha256('g'.repeat(64))).toBe(false); // Invalid hex
      expect(isValidSha256('A'.repeat(64))).toBe(false); // Uppercase not allowed
    });
  });

  describe('isValidInvariantId', () => {
    it('accepts valid invariant IDs', () => {
      expect(isValidInvariantId('INV-C-01')).toBe(true);
      expect(isValidInvariantId('INV-SENT-001')).toBe(true);
      expect(isValidInvariantId('INV-C-GATE-01')).toBe(true);
    });

    it('rejects invalid format', () => {
      expect(isValidInvariantId('invalid')).toBe(false);
      expect(isValidInvariantId('INV-c-01')).toBe(false); // Lowercase
    });
  });

  describe('isValidReasonCode', () => {
    it('accepts valid reason codes', () => {
      expect(isValidReasonCode('RC-001')).toBe(true);
      expect(isValidReasonCode('INV-C-01-VIOLATION')).toBe(true);
      expect(isValidReasonCode('ERR-C-GATE-01')).toBe(true);
    });

    it('rejects invalid format', () => {
      expect(isValidReasonCode('invalid')).toBe(false);
      expect(isValidReasonCode('RC-1')).toBe(false); // Too short
    });
  });
});
