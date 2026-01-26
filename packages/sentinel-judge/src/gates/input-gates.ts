/**
 * OMEGA Phase C — Input Gates
 * 
 * Version: 1.0.0
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
  Verdict,
  PolicyRef,
  ContextRef,
  EvidencePack,
  Claim,
  PATTERNS,
  ERROR_CODES,
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
    id: 'GATE_C_01',
    description: 'Validate traceId format (C-{YYYYMMDD}-{HHMMSS}-{uuid4})',
    gateClass: 'REQUIRED',
    failPolicy: 'REJECT',
    errorCode: ERROR_CODES.GATE_01,
  },
  {
    id: 'GATE_C_02',
    description: 'Validate claim.payloadHash matches computed hash',
    gateClass: 'REQUIRED',
    failPolicy: 'REJECT',
    errorCode: ERROR_CODES.GATE_02,
  },
  {
    id: 'GATE_C_03',
    description: 'Validate contextRefs sha256 format',
    gateClass: 'REQUIRED',
    failPolicy: 'REJECT',
    errorCode: ERROR_CODES.GATE_03,
  },
  {
    id: 'GATE_C_04',
    description: 'Validate evidencePack.inputsDigest matches computed digest',
    gateClass: 'REQUIRED',
    failPolicy: 'REJECT',
    errorCode: ERROR_CODES.GATE_04,
  },
  {
    id: 'GATE_C_05',
    description: 'Validate policyBundle is non-empty',
    gateClass: 'REQUIRED',
    failPolicy: 'REJECT',
    errorCode: ERROR_CODES.GATE_05,
  },
  {
    id: 'GATE_C_06',
    description: 'Validate PolicyRef.sourceSha256 format for all policies',
    gateClass: 'REQUIRED',
    failPolicy: 'REJECT',
    errorCode: ERROR_CODES.GATE_06,
  },
  {
    id: 'GATE_C_07',
    description: 'Detect magic numbers in payload',
    gateClass: 'REQUIRED',
    failPolicy: 'DEFER',
    errorCode: ERROR_CODES.GATE_07,
  },
  {
    id: 'GATE_C_08',
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
function evaluateGate01(request: DecisionRequest): GateFailure | null {
  if (!PATTERNS.TRACE_ID.test(request.traceId)) {
    return {
      gateId: 'GATE_C_01',
      errorCode: ERROR_CODES.GATE_01,
      suggestedVerdict: 'REJECT',
      message: `Invalid traceId format: "${request.traceId}". Expected: C-{YYYYMMDD}-{HHMMSS}-{uuid4}`,
    };
  }
  return null;
}

/**
 * GATE_C_02: Validate claim.payloadHash matches computed hash
 */
function evaluateGate02(claim: Claim): GateFailure | null {
  const computedHash = sha256(toCanonicalJson(claim.payload));
  if (claim.payloadHash !== computedHash) {
    return {
      gateId: 'GATE_C_02',
      errorCode: ERROR_CODES.GATE_02,
      suggestedVerdict: 'REJECT',
      message: `Payload hash mismatch. Expected: ${computedHash}, Got: ${claim.payloadHash}`,
    };
  }
  return null;
}

/**
 * GATE_C_03: Validate contextRefs sha256 format
 */
function evaluateGate03(contextRefs: readonly ContextRef[]): GateFailure | null {
  for (const ref of contextRefs) {
    if (!PATTERNS.SHA256.test(ref.sha256)) {
      return {
        gateId: 'GATE_C_03',
        errorCode: ERROR_CODES.GATE_03,
        suggestedVerdict: 'REJECT',
        message: `Invalid sha256 in contextRef for path "${ref.path}": "${ref.sha256}"`,
      };
    }
  }
  return null;
}

/**
 * GATE_C_04: Validate evidencePack.inputsDigest
 * 
 * The inputsDigest is computed from sorted proofs hashes
 */
function evaluateGate04(evidencePack: EvidencePack): GateFailure | null {
  // Sort proof hashes alphabetically
  const sortedHashes = [...evidencePack.proofs.map(p => p.hash)].sort();
  const computedDigest = sha256(toCanonicalJson(sortedHashes));
  
  if (evidencePack.inputsDigest !== computedDigest) {
    return {
      gateId: 'GATE_C_04',
      errorCode: ERROR_CODES.GATE_04,
      suggestedVerdict: 'REJECT',
      message: `inputsDigest mismatch. Expected: ${computedDigest}, Got: ${evidencePack.inputsDigest}`,
    };
  }
  return null;
}

/**
 * GATE_C_05: Validate policyBundle is non-empty
 */
function evaluateGate05(policies: readonly PolicyRef[]): GateFailure | null {
  if (policies.length === 0) {
    return {
      gateId: 'GATE_C_05',
      errorCode: ERROR_CODES.GATE_05,
      suggestedVerdict: 'REJECT',
      message: 'policyBundle.policies is empty. At least one policy required.',
    };
  }
  return null;
}

/**
 * GATE_C_06: Validate PolicyRef.sourceSha256 format
 */
function evaluateGate06(policies: readonly PolicyRef[]): GateFailure | null {
  for (const policy of policies) {
    if (!PATTERNS.SHA256.test(policy.sourceSha256)) {
      return {
        gateId: 'GATE_C_06',
        errorCode: ERROR_CODES.GATE_06,
        suggestedVerdict: 'REJECT',
        message: `Invalid sourceSha256 for invariant "${policy.invariantId}": "${policy.sourceSha256}"`,
      };
    }
  }
  return null;
}

/**
 * GATE_C_07: Detect magic numbers in payload
 * 
 * Magic numbers are numeric literals that should be calibration symbols.
 * This gate checks for common threshold values that should be parameterized.
 */
function evaluateGate07(claim: Claim): GateFailure | null {
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
        return {
          gateId: 'GATE_C_07',
          errorCode: ERROR_CODES.GATE_07,
          suggestedVerdict: 'DEFER',
          message: `Potential magic number detected: "${match[0]}". Use calibration symbol instead.`,
        };
      }
    }
  }
  return null;
}

/**
 * GATE_C_08: Check for blocking missing evidence
 */
function evaluateGate08(evidencePack: EvidencePack): GateFailure | null {
  const blockingMissing = evidencePack.missing.filter(m => m.blocksVerdict);
  
  if (blockingMissing.length > 0) {
    const types = blockingMissing.map(m => m.evidenceType).join(', ');
    return {
      gateId: 'GATE_C_08',
      errorCode: ERROR_CODES.GATE_08,
      suggestedVerdict: 'DEFER',
      message: `Blocking evidence missing: ${types}`,
    };
  }
  return null;
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
 * @returns GateResult with proceed flag and any failures
 */
export function evaluateInputGates(
  request: DecisionRequest,
  mode: EvaluationMode = 'STRICT'
): GateResult {
  const failures: GateFailure[] = [];
  
  // GATE_C_01: traceId format
  const gate01Result = evaluateGate01(request);
  if (gate01Result) failures.push(gate01Result);
  
  // GATE_C_02: payloadHash
  const gate02Result = evaluateGate02(request.claim);
  if (gate02Result) failures.push(gate02Result);
  
  // GATE_C_03: contextRefs sha256
  const gate03Result = evaluateGate03(request.contextRefs);
  if (gate03Result) failures.push(gate03Result);
  
  // GATE_C_04: inputsDigest
  const gate04Result = evaluateGate04(request.evidencePack);
  if (gate04Result) failures.push(gate04Result);
  
  // GATE_C_05: policyBundle non-empty
  const gate05Result = evaluateGate05(request.policyBundle.policies);
  if (gate05Result) failures.push(gate05Result);
  
  // GATE_C_06: PolicyRef sha256
  const gate06Result = evaluateGate06(request.policyBundle.policies);
  if (gate06Result) failures.push(gate06Result);
  
  // GATE_C_07: magic numbers
  const gate07Result = evaluateGate07(request.claim);
  if (gate07Result) failures.push(gate07Result);
  
  // GATE_C_08: blocking missing evidence
  const gate08Result = evaluateGate08(request.evidencePack);
  if (gate08Result) failures.push(gate08Result);
  
  // ADVERSARIAL mode: flag is recognized but no additional logic in C.1.2
  // Future: Add enhanced checks here
  if (mode === 'ADVERSARIAL') {
    // Placeholder for future adversarial-specific checks
    // console.debug('[ADVERSARIAL] Mode enabled - no additional checks in C.1.2');
  }
  
  // Determine overall result
  if (failures.length === 0) {
    return {
      proceed: true,
      failures: [],
    };
  }
  
  // Determine suggested verdict based on failures
  // REJECT takes precedence over DEFER
  const hasReject = failures.some(f => f.suggestedVerdict === 'REJECT');
  const suggestedVerdict: Verdict = hasReject ? 'REJECT' : 'DEFER';
  
  return {
    proceed: false,
    suggestedVerdict,
    failures,
  };
}

/**
 * Get a gate definition by ID
 */
export function getGateDefinition(gateId: string): GateDefinition | undefined {
  return INPUT_GATES.find(g => g.id === gateId);
}

/**
 * Get all gate definitions
 */
export function getAllGateDefinitions(): readonly GateDefinition[] {
  return INPUT_GATES;
}
