/**
 * OMEGA Phase C — Input Gates
 * 
 * Version: 1.2.1
 * Date: 2026-01-26
 * Standard: NASA-Grade L4
 * 
 * Purpose:
 * - Validate DecisionRequest structure and integrity
 * - Gate GATE_C_01 → GATE_C_08 (STRICT mode only)
 * - ADVERSARIAL mode flag present but no additional logic
 */

import {
  DecisionRequest,
  GateDefinition,
  GateResult,
  GateFailure,
  InputGatesResult,
  Verdict,
  PolicyRef,
  ContextRef,
  EvidencePack,
  Claim,
  PATTERNS,
  ERROR_CODES,
  createGateResult,
  createInputGatesResult,
} from '../types.js';
import { sha256 } from '../digest.js';
import { toCanonicalJson } from '../canonical_json.js';

// ═══════════════════════════════════════════════════════════════════════════════
// GATE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * All input gate definitions for STRICT mode
 */
export const INPUT_GATES: readonly GateDefinition[] = [
  {
    gateId: 'GATE_C_01',
    description: 'Validate traceId format (C-{YYYYMMDD}-{HHMMSS}-{uuid4})',
    gateClass: 'REQUIRED',
    failPolicy: 'REJECT',
    errorCode: ERROR_CODES.GATE_01,
  },
  {
    gateId: 'GATE_C_02',
    description: 'Validate claim.payloadHash matches computed hash',
    gateClass: 'REQUIRED',
    failPolicy: 'REJECT',
    errorCode: ERROR_CODES.GATE_02,
  },
  {
    gateId: 'GATE_C_03',
    description: 'Validate contextRefs sha256 format',
    gateClass: 'REQUIRED',
    failPolicy: 'REJECT',
    errorCode: ERROR_CODES.GATE_03,
  },
  {
    gateId: 'GATE_C_04',
    description: 'Validate evidencePack.inputsDigest matches computed digest',
    gateClass: 'REQUIRED',
    failPolicy: 'REJECT',
    errorCode: ERROR_CODES.GATE_04,
  },
  {
    gateId: 'GATE_C_05',
    description: 'Validate policyBundle is non-empty',
    gateClass: 'REQUIRED',
    failPolicy: 'REJECT',
    errorCode: ERROR_CODES.GATE_05,
  },
  {
    gateId: 'GATE_C_06',
    description: 'Validate PolicyRef.sourceSha256 format for all policies',
    gateClass: 'REQUIRED',
    failPolicy: 'REJECT',
    errorCode: ERROR_CODES.GATE_06,
  },
  {
    gateId: 'GATE_C_07',
    description: 'Detect magic numbers in payload',
    gateClass: 'REQUIRED',
    failPolicy: 'DEFER',
    errorCode: ERROR_CODES.GATE_07,
  },
  {
    gateId: 'GATE_C_08',
    description: 'Check for blocking missing evidence',
    gateClass: 'REQUIRED',
    failPolicy: 'DEFER',
    errorCode: ERROR_CODES.GATE_08,
  },
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// GATE EVALUATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GATE_C_01: Validate traceId format
 */
function evaluateGate01(request: DecisionRequest): GateResult {
  if (!PATTERNS.TRACE_ID.test(request.traceId)) {
    return createGateResult(
      'GATE_C_01',
      'REJECT',
      `Invalid traceId format: "${request.traceId}". Expected: C-{YYYYMMDD}-{HHMMSS}-{uuid4}`,
      ERROR_CODES.GATE_01
    );
  }
  return createGateResult('GATE_C_01', 'PASS');
}

/**
 * GATE_C_02: Validate claim.payloadHash matches computed hash
 */
function evaluateGate02(claim: Claim): GateResult {
  const computedHash = sha256(toCanonicalJson(claim.payload));
  if (claim.payloadHash !== computedHash) {
    return createGateResult(
      'GATE_C_02',
      'REJECT',
      `Payload hash mismatch. Expected: ${computedHash}, Got: ${claim.payloadHash}`,
      ERROR_CODES.GATE_02
    );
  }
  return createGateResult('GATE_C_02', 'PASS');
}

/**
 * GATE_C_03: Validate contextRefs sha256 format
 */
function evaluateGate03(contextRefs: readonly ContextRef[]): GateResult {
  for (const ref of contextRefs) {
    if (!PATTERNS.SHA256.test(ref.sha256)) {
      return createGateResult(
        'GATE_C_03',
        'REJECT',
        `Invalid sha256 in contextRef for path "${ref.path}": "${ref.sha256}"`,
        ERROR_CODES.GATE_03
      );
    }
  }
  return createGateResult('GATE_C_03', 'PASS');
}

/**
 * GATE_C_04: Validate evidencePack.inputsDigest
 * 
 * The inputsDigest is computed from sorted proofs hashes
 */
function evaluateGate04(evidencePack: EvidencePack | undefined): GateResult {
  if (!evidencePack) {
    return createGateResult('GATE_C_04', 'PASS'); // No evidencePack to validate
  }
  
  // Sort proof hashes alphabetically
  const sortedHashes = [...evidencePack.proofs.map(p => p.hash)].sort();
  const computedDigest = sha256(toCanonicalJson(sortedHashes));
  
  if (evidencePack.inputsDigest !== computedDigest) {
    return createGateResult(
      'GATE_C_04',
      'REJECT',
      `inputsDigest mismatch. Expected: ${computedDigest}, Got: ${evidencePack.inputsDigest}`,
      ERROR_CODES.GATE_04
    );
  }
  return createGateResult('GATE_C_04', 'PASS');
}

/**
 * GATE_C_05: Validate policyBundle is non-empty
 */
function evaluateGate05(policies: readonly PolicyRef[] | undefined): GateResult {
  if (!policies || policies.length === 0) {
    return createGateResult(
      'GATE_C_05',
      'REJECT',
      'policyBundle.policies is empty. At least one policy required.',
      ERROR_CODES.GATE_05
    );
  }
  return createGateResult('GATE_C_05', 'PASS');
}

/**
 * GATE_C_06: Validate PolicyRef.sourceSha256 format
 */
function evaluateGate06(policies: readonly PolicyRef[] | undefined): GateResult {
  if (!policies) {
    return createGateResult('GATE_C_06', 'PASS');
  }
  for (const policy of policies) {
    if (!PATTERNS.SHA256.test(policy.sourceSha256)) {
      return createGateResult(
        'GATE_C_06',
        'REJECT',
        `Invalid sourceSha256 for invariant "${policy.invariantId}": "${policy.sourceSha256}"`,
        ERROR_CODES.GATE_06
      );
    }
  }
  return createGateResult('GATE_C_06', 'PASS');
}

/**
 * GATE_C_07: Detect magic numbers in payload
 * 
 * Magic numbers are numeric literals that should be calibration symbols.
 * This gate checks for common threshold values that should be parameterized.
 */
function evaluateGate07(claim: Claim): GateResult {
  // Known magic number patterns to detect
  const magicNumberPatterns = [
    // Threshold-like values
    /\b0\.\d{2,}\b/,  // Decimal values like 0.95, 0.85
    // Common uncalibrated constants
  ];
  
  const payloadStr = JSON.stringify(claim.payload);
  
  for (const pattern of magicNumberPatterns) {
    const match = payloadStr.match(pattern);
    if (match) {
      // Check if this is inside a calibration reference
      const hasCalibrationRef = payloadStr.includes('"calibrationRef"') || 
                                payloadStr.includes('"τ_') ||
                                payloadStr.includes('"threshold_symbol"');
      
      // Only flag if it looks like an uncalibrated threshold
      if (!hasCalibrationRef && 
          (payloadStr.includes('"threshold"') || 
           payloadStr.includes('"score"') ||
           payloadStr.includes('"limit"'))) {
        return createGateResult(
          'GATE_C_07',
          'DEFER',
          `Potential magic number detected: "${match[0]}". Use calibration symbol instead.`,
          ERROR_CODES.GATE_07
        );
      }
    }
  }
  return createGateResult('GATE_C_07', 'PASS');
}

/**
 * GATE_C_08: Check for blocking missing evidence
 */
function evaluateGate08(evidencePack: EvidencePack | undefined): GateResult {
  if (!evidencePack) {
    return createGateResult('GATE_C_08', 'PASS');
  }
  
  const blockingMissing = evidencePack.missing.filter(m => m.blocksVerdict);
  
  if (blockingMissing.length > 0) {
    const types = blockingMissing.map(m => m.evidenceType).join(', ');
    return createGateResult(
      'GATE_C_08',
      'DEFER',
      `Blocking evidence missing: ${types}`,
      ERROR_CODES.GATE_08
    );
  }
  return createGateResult('GATE_C_08', 'PASS');
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODE FLAG
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Evaluation mode
 * - STRICT: Standard validation (implemented)
 * - ADVERSARIAL: Enhanced checks (flag only, no additional logic in C.1.2)
 */
export type EvaluationMode = 'STRICT' | 'ADVERSARIAL';

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EVALUATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Evaluate all input gates for a DecisionRequest
 * 
 * @param request - The DecisionRequest to validate
 * @param mode - Evaluation mode (STRICT or ADVERSARIAL flag)
 * @returns InputGatesResult with overall verdict and all gate results
 */
export function evaluateInputGates(
  request: DecisionRequest,
  mode: EvaluationMode = 'STRICT'
): InputGatesResult {
  const gateResults: GateResult[] = [];
  
  // GATE_C_01: traceId format
  gateResults.push(evaluateGate01(request));
  
  // GATE_C_02: payloadHash
  gateResults.push(evaluateGate02(request.claim));
  
  // GATE_C_03: contextRefs sha256
  gateResults.push(evaluateGate03(request.contextRefs));
  
  // GATE_C_04: inputsDigest
  gateResults.push(evaluateGate04(request.evidencePack));
  
  // GATE_C_05: policyBundle non-empty
  gateResults.push(evaluateGate05(request.policyBundle?.policies));
  
  // GATE_C_06: PolicyRef sha256
  gateResults.push(evaluateGate06(request.policyBundle?.policies));
  
  // GATE_C_07: magic numbers
  gateResults.push(evaluateGate07(request.claim));
  
  // GATE_C_08: blocking missing evidence
  gateResults.push(evaluateGate08(request.evidencePack));
  
  // ADVERSARIAL mode: flag is recognized but no additional logic in C.1.2
  // Future: Add enhanced checks here
  if (mode === 'ADVERSARIAL') {
    // Placeholder for future adversarial-specific checks
    // console.debug('[ADVERSARIAL] Mode enabled - no additional checks in C.1.2');
  }
  
  return createInputGatesResult(gateResults, mode);
}

/**
 * Get a gate definition by ID
 */
export function getGateDefinition(gateId: string): GateDefinition | undefined {
  return INPUT_GATES.find(g => g.gateId === gateId);
}

/**
 * Get all gate definitions
 */
export function getAllGateDefinitions(): readonly GateDefinition[] {
  return INPUT_GATES;
}
