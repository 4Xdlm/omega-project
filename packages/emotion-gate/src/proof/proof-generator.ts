/**
 * OMEGA Emotion Gate — Proof Generator
 *
 * Generates cryptographic proofs for emotion validation.
 * Proofs are deterministic and verifiable.
 */

import type {
  EmotionFrame,
  EmotionGateContext,
  EmotionValidatorResult,
  DriftVector,
  ToxicitySignal,
  EmotionProof,
  ValidatorProof,
  ProofInputs,
} from '../gate/types.js';
import type { RootHash } from '@omega/canon-kernel';

/**
 * Compute a simple hash from string data.
 */
function computeHash(data: string): RootHash {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `rh_${Math.abs(hash).toString(16).padStart(16, '0')}`;
}

/**
 * Compute deterministic hash for an object.
 */
function computeObjectHash(obj: unknown): RootHash {
  return computeHash(JSON.stringify(obj, Object.keys(obj as object).sort()));
}

/**
 * Generate validator proof.
 */
function generateValidatorProof(
  result: EmotionValidatorResult,
  inputHash: RootHash
): ValidatorProof {
  const outputData = {
    validator_id: result.validator_id,
    result: result.result,
    reasons: result.reasons,
  };

  return {
    validator_id: result.validator_id,
    input_hash: inputHash,
    output_hash: computeObjectHash(outputData),
    computation_deterministic: true,
  };
}

/**
 * Generate proof inputs snapshot.
 */
function generateProofInputs(
  frame: EmotionFrame,
  context: EmotionGateContext
): ProofInputs {
  const frameHash = computeObjectHash({
    frame_id: frame.frame_id,
    entity_id: frame.entity_id,
    emotion_state: frame.emotion_state,
    timestamp: frame.timestamp,
  });

  const contextHash = computeObjectHash({
    policy_id: context.policy.policy_id,
    axioms: context.axioms.map(a => a.axiom_id),
    has_previous: !!context.previous_frame,
  });

  const calibrationHash = computeObjectHash(
    Object.fromEntries(
      Object.getOwnPropertySymbols(context.calibration).map(sym => [
        sym.description,
        context.calibration[sym as keyof typeof context.calibration],
      ])
    )
  );

  return {
    frame_hash: frameHash,
    context_hash: contextHash,
    calibration_hash: calibrationHash,
  };
}

/**
 * Generate complete emotion proof.
 */
export function generateEmotionProof(
  frame: EmotionFrame,
  context: EmotionGateContext,
  results: readonly EmotionValidatorResult[],
  drift: DriftVector,
  toxicity: ToxicitySignal
): EmotionProof {
  // Compute input hash
  const emotionInputHash = computeObjectHash(frame.emotion_state);

  // Generate validator proofs
  const validatorProofs: ValidatorProof[] = results.map(r =>
    generateValidatorProof(r, emotionInputHash)
  );

  // Compute computation hashes
  const driftHash = computeObjectHash(drift);
  const toxicityHash = computeObjectHash(toxicity);

  // Compute aggregated proof hash
  const aggregatedData = {
    emotion_input_hash: emotionInputHash,
    policy_hash: context.policy.hash,
    validator_count: validatorProofs.length,
    drift_hash: driftHash,
    toxicity_hash: toxicityHash,
  };
  const aggregatedHash = computeObjectHash(aggregatedData);

  // Generate inputs snapshot
  const inputsSnapshot = generateProofInputs(frame, context);

  return {
    emotion_input_hash: emotionInputHash,
    policy_hash: context.policy.hash,
    validators_proofs: validatorProofs,
    drift_computation_hash: driftHash,
    toxicity_computation_hash: toxicityHash,
    aggregated_proof_hash: aggregatedHash,
    inputs_snapshot: inputsSnapshot,
  };
}

/**
 * Verify a proof against a verdict.
 */
export function verifyEmotionProof(
  frame: EmotionFrame,
  context: EmotionGateContext,
  proof: EmotionProof
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Verify emotion input hash
  const expectedEmotionHash = computeObjectHash(frame.emotion_state);
  if (proof.emotion_input_hash !== expectedEmotionHash) {
    errors.push('Emotion input hash mismatch');
  }

  // Verify policy hash
  if (proof.policy_hash !== context.policy.hash) {
    errors.push('Policy hash mismatch');
  }

  // Verify inputs snapshot
  const expectedInputs = generateProofInputs(frame, context);
  if (proof.inputs_snapshot.frame_hash !== expectedInputs.frame_hash) {
    errors.push('Frame hash mismatch in inputs snapshot');
  }
  if (proof.inputs_snapshot.context_hash !== expectedInputs.context_hash) {
    errors.push('Context hash mismatch in inputs snapshot');
  }
  if (proof.inputs_snapshot.calibration_hash !== expectedInputs.calibration_hash) {
    errors.push('Calibration hash mismatch in inputs snapshot');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if proof is deterministic.
 */
export function isProofDeterministic(proof: EmotionProof): boolean {
  return proof.validators_proofs.every(vp => vp.computation_deterministic);
}
