/**
 * OMEGA Phase C — Input Gates Tests
 * 
 * Version: 1.0.0
 * Date: 2026-01-26
 * 
 * Tests for:
 * - GATE_C_01 → GATE_C_08
 * - Gate definitions
 * - Mode flag (STRICT/ADVERSARIAL)
 */

import { describe, it, expect } from 'vitest';
import {
  evaluateInputGates,
  getGateDefinition,
  getAllGateDefinitions,
  INPUT_GATES,
} from '../src/gates/index.js';
import {
  DecisionRequest,
  EvidencePack,
  PolicyRef,
  ERROR_CODES,
} from '../src/types.js';
import { sha256 } from '../src/digest.js';
import { toCanonicalJson } from '../src/canonical_json.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function createValidTraceId(): string {
  const now = new Date();
  const date = now.toISOString().split('T')[0].replace(/-/g, '');
  const time = '120000';
  const uuid = '12345678-1234-1234-1234-123456789012';
  return `C-${date}-${time}-${uuid}`;
}

function createValidPayload(): Record<string, unknown> {
  return { action: 'test', target: 'unit-test' };
}

function createValidProof(): { proofType: string; source: string; sourceVersion: string; hash: string; verdict: 'PASS' } {
  return {
    proofType: 'TEST',
    source: 'unit-test',
    sourceVersion: '1.0.0',
    hash: sha256('test-content'),
    verdict: 'PASS',
  };
}

function createValidPolicy(): PolicyRef {
  return {
    invariantId: 'INV-TEST-001',
    sourcePath: 'docs/test.md',
    sourceSha256: sha256('test-source'),
    versionTag: 'v1.0.0',
    scope: 'ALL',
    severity: 'BLOCKER',
  };
}

function createValidEvidencePack(proofs: Array<{ hash: string }>): EvidencePack {
  const sortedHashes = [...proofs.map(p => p.hash)].sort();
  return {
    inputsDigest: sha256(toCanonicalJson(sortedHashes)),
    proofs: proofs.map(p => ({
      proofType: 'TEST',
      source: 'unit-test',
      sourceVersion: '1.0.0',
      hash: p.hash,
      verdict: 'PASS' as const,
    })),
    missing: [],
  };
}

function createValidRequest(overrides: Partial<DecisionRequest> = {}): DecisionRequest {
  const payload = createValidPayload();
  const proof = createValidProof();
  const policy = createValidPolicy();
  
  const evidencePack = createValidEvidencePack([proof]);
  
  return {
    traceId: createValidTraceId(),
    submittedBy: 'unit-test',
    submittedAt: new Date().toISOString(),
    claim: {
      type: 'EVIDENCE_VALIDATION',
      payload,
      payloadHash: sha256(toCanonicalJson(payload)),
    },
    contextRefs: [],
    evidencePack,
    policyBundle: {
      bundleId: 'test-bundle',
      bundleVersion: 'v1.0.0',
      bundleSha256: sha256(toCanonicalJson([policy])),
      policies: [policy],
    },
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GATE DEFINITIONS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Gate Definitions', () => {
  it('should have 8 input gates defined', () => {
    expect(INPUT_GATES.length).toBe(8);
  });
  
  it('should have unique gate IDs', () => {
    const ids = INPUT_GATES.map(g => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  
  it('should have unique error codes', () => {
    const codes = INPUT_GATES.map(g => g.errorCode);
    expect(new Set(codes).size).toBe(codes.length);
  });
  
  it('should have correct gate ID sequence', () => {
    const expectedIds = [
      'GATE_C_01', 'GATE_C_02', 'GATE_C_03', 'GATE_C_04',
      'GATE_C_05', 'GATE_C_06', 'GATE_C_07', 'GATE_C_08',
    ];
    expect(INPUT_GATES.map(g => g.id)).toEqual(expectedIds);
  });
  
  it('should retrieve gate definition by ID', () => {
    const gate = getGateDefinition('GATE_C_01');
    expect(gate).toBeDefined();
    expect(gate?.id).toBe('GATE_C_01');
    expect(gate?.errorCode).toBe(ERROR_CODES.GATE_01);
  });
  
  it('should return undefined for unknown gate ID', () => {
    const gate = getGateDefinition('GATE_C_99');
    expect(gate).toBeUndefined();
  });
  
  it('should return all gate definitions', () => {
    const gates = getAllGateDefinitions();
    expect(gates.length).toBe(8);
    expect(gates).toEqual(INPUT_GATES);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GATE_C_01: traceId format
// ═══════════════════════════════════════════════════════════════════════════════

describe('GATE_C_01: traceId format', () => {
  it('should PASS for valid traceId', () => {
    const request = createValidRequest();
    const result = evaluateInputGates(request);
    
    const gate01Failures = result.failures.filter(f => f.gateId === 'GATE_C_01');
    expect(gate01Failures.length).toBe(0);
  });
  
  it('should FAIL for invalid traceId format', () => {
    const request = createValidRequest({ traceId: 'invalid-trace-id' });
    const result = evaluateInputGates(request);
    
    expect(result.proceed).toBe(false);
    expect(result.suggestedVerdict).toBe('REJECT');
    
    const gate01Failure = result.failures.find(f => f.gateId === 'GATE_C_01');
    expect(gate01Failure).toBeDefined();
    expect(gate01Failure?.errorCode).toBe(ERROR_CODES.GATE_01);
  });
  
  it('should FAIL for empty traceId', () => {
    const request = createValidRequest({ traceId: '' });
    const result = evaluateInputGates(request);
    
    const gate01Failure = result.failures.find(f => f.gateId === 'GATE_C_01');
    expect(gate01Failure).toBeDefined();
  });
  
  it('should FAIL for traceId without prefix', () => {
    const request = createValidRequest({ 
      traceId: '20260126-120000-12345678-1234-1234-1234-123456789012' 
    });
    const result = evaluateInputGates(request);
    
    const gate01Failure = result.failures.find(f => f.gateId === 'GATE_C_01');
    expect(gate01Failure).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GATE_C_02: payloadHash
// ═══════════════════════════════════════════════════════════════════════════════

describe('GATE_C_02: payloadHash', () => {
  it('should PASS for valid payloadHash', () => {
    const request = createValidRequest();
    const result = evaluateInputGates(request);
    
    const gate02Failures = result.failures.filter(f => f.gateId === 'GATE_C_02');
    expect(gate02Failures.length).toBe(0);
  });
  
  it('should FAIL for mismatched payloadHash', () => {
    const request = createValidRequest();
    request.claim.payloadHash = sha256('wrong-content');
    
    const result = evaluateInputGates(request);
    
    expect(result.proceed).toBe(false);
    
    const gate02Failure = result.failures.find(f => f.gateId === 'GATE_C_02');
    expect(gate02Failure).toBeDefined();
    expect(gate02Failure?.errorCode).toBe(ERROR_CODES.GATE_02);
    expect(gate02Failure?.message).toContain('Payload hash mismatch');
  });
  
  it('should FAIL for empty payloadHash', () => {
    const request = createValidRequest();
    request.claim.payloadHash = '';
    
    const result = evaluateInputGates(request);
    
    const gate02Failure = result.failures.find(f => f.gateId === 'GATE_C_02');
    expect(gate02Failure).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GATE_C_03: contextRefs sha256
// ═══════════════════════════════════════════════════════════════════════════════

describe('GATE_C_03: contextRefs sha256', () => {
  it('should PASS for empty contextRefs', () => {
    const request = createValidRequest({ contextRefs: [] });
    const result = evaluateInputGates(request);
    
    const gate03Failures = result.failures.filter(f => f.gateId === 'GATE_C_03');
    expect(gate03Failures.length).toBe(0);
  });
  
  it('should PASS for valid contextRefs', () => {
    const request = createValidRequest({
      contextRefs: [
        {
          refType: 'PHASE_A',
          path: 'docs/test.md',
          sha256: sha256('test-content'),
        },
      ],
    });
    const result = evaluateInputGates(request);
    
    const gate03Failures = result.failures.filter(f => f.gateId === 'GATE_C_03');
    expect(gate03Failures.length).toBe(0);
  });
  
  it('should FAIL for invalid sha256 in contextRef', () => {
    const request = createValidRequest({
      contextRefs: [
        {
          refType: 'PHASE_A',
          path: 'docs/test.md',
          sha256: 'invalid-hash',
        },
      ],
    });
    const result = evaluateInputGates(request);
    
    expect(result.proceed).toBe(false);
    
    const gate03Failure = result.failures.find(f => f.gateId === 'GATE_C_03');
    expect(gate03Failure).toBeDefined();
    expect(gate03Failure?.errorCode).toBe(ERROR_CODES.GATE_03);
  });
  
  it('should FAIL for uppercase sha256', () => {
    const request = createValidRequest({
      contextRefs: [
        {
          refType: 'PHASE_A',
          path: 'docs/test.md',
          sha256: sha256('test-content').toUpperCase(),
        },
      ],
    });
    const result = evaluateInputGates(request);
    
    const gate03Failure = result.failures.find(f => f.gateId === 'GATE_C_03');
    expect(gate03Failure).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GATE_C_04: inputsDigest
// ═══════════════════════════════════════════════════════════════════════════════

describe('GATE_C_04: inputsDigest', () => {
  it('should PASS for valid inputsDigest', () => {
    const request = createValidRequest();
    const result = evaluateInputGates(request);
    
    const gate04Failures = result.failures.filter(f => f.gateId === 'GATE_C_04');
    expect(gate04Failures.length).toBe(0);
  });
  
  it('should FAIL for mismatched inputsDigest', () => {
    const request = createValidRequest();
    request.evidencePack.inputsDigest = sha256('wrong-digest');
    
    const result = evaluateInputGates(request);
    
    expect(result.proceed).toBe(false);
    
    const gate04Failure = result.failures.find(f => f.gateId === 'GATE_C_04');
    expect(gate04Failure).toBeDefined();
    expect(gate04Failure?.errorCode).toBe(ERROR_CODES.GATE_04);
  });
  
  it('should PASS for empty proofs with correct digest', () => {
    const request = createValidRequest();
    request.evidencePack = {
      inputsDigest: sha256(toCanonicalJson([])),
      proofs: [],
      missing: [],
    };
    
    const result = evaluateInputGates(request);
    
    const gate04Failures = result.failures.filter(f => f.gateId === 'GATE_C_04');
    expect(gate04Failures.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GATE_C_05: policyBundle non-empty
// ═══════════════════════════════════════════════════════════════════════════════

describe('GATE_C_05: policyBundle non-empty', () => {
  it('should PASS for non-empty policies', () => {
    const request = createValidRequest();
    const result = evaluateInputGates(request);
    
    const gate05Failures = result.failures.filter(f => f.gateId === 'GATE_C_05');
    expect(gate05Failures.length).toBe(0);
  });
  
  it('should FAIL for empty policies array', () => {
    const request = createValidRequest();
    request.policyBundle.policies = [];
    
    const result = evaluateInputGates(request);
    
    expect(result.proceed).toBe(false);
    
    const gate05Failure = result.failures.find(f => f.gateId === 'GATE_C_05');
    expect(gate05Failure).toBeDefined();
    expect(gate05Failure?.errorCode).toBe(ERROR_CODES.GATE_05);
    expect(gate05Failure?.message).toContain('empty');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GATE_C_06: PolicyRef sourceSha256
// ═══════════════════════════════════════════════════════════════════════════════

describe('GATE_C_06: PolicyRef sourceSha256', () => {
  it('should PASS for valid policy sha256', () => {
    const request = createValidRequest();
    const result = evaluateInputGates(request);
    
    const gate06Failures = result.failures.filter(f => f.gateId === 'GATE_C_06');
    expect(gate06Failures.length).toBe(0);
  });
  
  it('should FAIL for invalid policy sourceSha256', () => {
    const request = createValidRequest();
    request.policyBundle.policies[0].sourceSha256 = 'invalid-hash';
    
    const result = evaluateInputGates(request);
    
    expect(result.proceed).toBe(false);
    
    const gate06Failure = result.failures.find(f => f.gateId === 'GATE_C_06');
    expect(gate06Failure).toBeDefined();
    expect(gate06Failure?.errorCode).toBe(ERROR_CODES.GATE_06);
  });
  
  it('should validate all policies', () => {
    const request = createValidRequest();
    const policy2: PolicyRef = {
      ...createValidPolicy(),
      invariantId: 'INV-TEST-002',
      sourceSha256: 'not-a-valid-hash',
    };
    request.policyBundle.policies.push(policy2);
    
    const result = evaluateInputGates(request);
    
    const gate06Failure = result.failures.find(f => f.gateId === 'GATE_C_06');
    expect(gate06Failure).toBeDefined();
    expect(gate06Failure?.message).toContain('INV-TEST-002');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GATE_C_07: magic numbers
// ═══════════════════════════════════════════════════════════════════════════════

describe('GATE_C_07: magic numbers', () => {
  it('should PASS for payload without magic numbers', () => {
    const request = createValidRequest();
    const result = evaluateInputGates(request);
    
    const gate07Failures = result.failures.filter(f => f.gateId === 'GATE_C_07');
    expect(gate07Failures.length).toBe(0);
  });
  
  it('should DEFER for payload with uncalibrated threshold', () => {
    const payload = { threshold: 0.95, action: 'test' };
    const request = createValidRequest();
    request.claim.payload = payload;
    request.claim.payloadHash = sha256(toCanonicalJson(payload));
    
    const result = evaluateInputGates(request);
    
    const gate07Failure = result.failures.find(f => f.gateId === 'GATE_C_07');
    expect(gate07Failure).toBeDefined();
    expect(gate07Failure?.suggestedVerdict).toBe('DEFER');
    expect(gate07Failure?.errorCode).toBe(ERROR_CODES.GATE_07);
  });
  
  it('should PASS for payload with calibrationRef', () => {
    const payload = { 
      threshold: 0.95, 
      action: 'test',
      calibrationRef: { symbol: 'τ_test' },
    };
    const request = createValidRequest();
    request.claim.payload = payload;
    request.claim.payloadHash = sha256(toCanonicalJson(payload));
    
    const result = evaluateInputGates(request);
    
    const gate07Failures = result.failures.filter(f => f.gateId === 'GATE_C_07');
    expect(gate07Failures.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GATE_C_08: blocking missing evidence
// ═══════════════════════════════════════════════════════════════════════════════

describe('GATE_C_08: blocking missing evidence', () => {
  it('should PASS for no missing evidence', () => {
    const request = createValidRequest();
    const result = evaluateInputGates(request);
    
    const gate08Failures = result.failures.filter(f => f.gateId === 'GATE_C_08');
    expect(gate08Failures.length).toBe(0);
  });
  
  it('should PASS for non-blocking missing evidence', () => {
    const request = createValidRequest();
    request.evidencePack.missing = [
      {
        evidenceType: 'OPTIONAL_REVIEW',
        reason: 'Not required for this claim',
        blocksVerdict: false,
      },
    ];
    
    const result = evaluateInputGates(request);
    
    const gate08Failures = result.failures.filter(f => f.gateId === 'GATE_C_08');
    expect(gate08Failures.length).toBe(0);
  });
  
  it('should DEFER for blocking missing evidence', () => {
    const request = createValidRequest();
    request.evidencePack.missing = [
      {
        evidenceType: 'REQUIRED_HASH',
        reason: 'Hash chain incomplete',
        blocksVerdict: true,
      },
    ];
    
    const result = evaluateInputGates(request);
    
    const gate08Failure = result.failures.find(f => f.gateId === 'GATE_C_08');
    expect(gate08Failure).toBeDefined();
    expect(gate08Failure?.suggestedVerdict).toBe('DEFER');
    expect(gate08Failure?.errorCode).toBe(ERROR_CODES.GATE_08);
    expect(gate08Failure?.message).toContain('REQUIRED_HASH');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// OVERALL EVALUATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Overall Gate Evaluation', () => {
  it('should PASS for valid request', () => {
    const request = createValidRequest();
    const result = evaluateInputGates(request);
    
    expect(result.proceed).toBe(true);
    expect(result.failures.length).toBe(0);
    expect(result.suggestedVerdict).toBeUndefined();
  });
  
  it('should collect multiple failures', () => {
    const request = createValidRequest({
      traceId: 'invalid',
      contextRefs: [
        { refType: 'PHASE_A', path: 'test.md', sha256: 'invalid' },
      ],
    });
    request.policyBundle.policies = [];
    
    const result = evaluateInputGates(request);
    
    expect(result.proceed).toBe(false);
    expect(result.failures.length).toBeGreaterThan(1);
  });
  
  it('should prefer REJECT over DEFER', () => {
    const request = createValidRequest({
      traceId: 'invalid',  // REJECT
    });
    request.evidencePack.missing = [
      { evidenceType: 'TEST', reason: 'test', blocksVerdict: true },  // DEFER
    ];
    
    const result = evaluateInputGates(request);
    
    expect(result.suggestedVerdict).toBe('REJECT');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MODE FLAG
// ═══════════════════════════════════════════════════════════════════════════════

describe('Evaluation Mode', () => {
  it('should accept STRICT mode', () => {
    const request = createValidRequest();
    const result = evaluateInputGates(request, 'STRICT');
    
    expect(result.proceed).toBe(true);
  });
  
  it('should accept ADVERSARIAL mode flag', () => {
    const request = createValidRequest();
    const result = evaluateInputGates(request, 'ADVERSARIAL');
    
    // ADVERSARIAL flag is recognized but no additional logic in C.1.2
    expect(result.proceed).toBe(true);
  });
  
  it('should default to STRICT mode', () => {
    const request = createValidRequest();
    const resultDefault = evaluateInputGates(request);
    const resultStrict = evaluateInputGates(request, 'STRICT');
    
    expect(resultDefault.proceed).toBe(resultStrict.proceed);
    expect(resultDefault.failures).toEqual(resultStrict.failures);
  });
});
