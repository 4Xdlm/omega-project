// ═══════════════════════════════════════════════════════════════════════════════
// GENESIS FORGE v1.1.2 — Validator (PRE-GATE)
// ═══════════════════════════════════════════════════════════════════════════════
// Valide TruthBundle AVANT tout compute — FAIL-FAST obligatoire
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  TruthBundle,
  ValidationResult,
  EmotionType,
  EmotionField,
  OxygenResult,
  TimelineFrame,
  EMOTION_TYPES,
} from './types';
import { hashTruthBundle } from '../proofs/hash_utils';

const VALID_EMOTIONS: readonly EmotionType[] = [
  "joy", "fear", "anger", "sadness",
  "surprise", "disgust", "trust", "anticipation",
  "love", "guilt", "shame", "pride",
  "hope", "despair"
];

/**
 * Valide un TruthBundle complet
 * Retourne ValidationResult avec liste d'erreurs
 */
export function validateTruthBundle(bundle: TruthBundle): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Champs requis
  if (!bundle.id) {
    errors.push('Missing required field: id');
  }
  if (!bundle.timestamp) {
    errors.push('Missing required field: timestamp');
  }
  if (!bundle.sourceHash) {
    errors.push('Missing required field: sourceHash');
  }
  if (!bundle.bundleHash) {
    errors.push('Missing required field: bundleHash');
  }

  // 2. Schema ID (14D, pas 16D)
  if (bundle.vectorSchemaId !== 'OMEGA_EMOTION_14D_v1.0.0') {
    errors.push(`Invalid vectorSchemaId: expected 'OMEGA_EMOTION_14D_v1.0.0', got '${bundle.vectorSchemaId}'`);
  }

  // 3. Hash integrity
  const calculatedHash = hashTruthBundle(bundle);
  if (calculatedHash !== bundle.bundleHash) {
    errors.push(`Hash mismatch: expected ${bundle.bundleHash}, calculated ${calculatedHash}`);
  }

  // 4. Timestamp format (ISO 8601)
  if (bundle.timestamp && !isValidISODate(bundle.timestamp)) {
    errors.push(`Invalid timestamp format: ${bundle.timestamp} (expected ISO 8601)`);
  }

  // 5. EmotionField validation
  if (!bundle.targetEmotionField) {
    errors.push('Missing required field: targetEmotionField');
  } else {
    const fieldErrors = validateEmotionField(bundle.targetEmotionField);
    errors.push(...fieldErrors);
  }

  // 6. OxygenResult validation
  if (!bundle.targetOxygenResult) {
    errors.push('Missing required field: targetOxygenResult');
  } else {
    const oxygenErrors = validateOxygenResult(bundle.targetOxygenResult);
    errors.push(...oxygenErrors);
  }

  // 7. Timeline validation (if present)
  if (bundle.timeline && bundle.timeline.length > 0) {
    const timelineErrors = validateTimeline(bundle.timeline);
    errors.push(...timelineErrors);
  }

  // 8. Constraints validation (if present)
  if (bundle.constraints) {
    const constraintErrors = validateConstraints(bundle.constraints);
    errors.push(...constraintErrors);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Valide un EmotionField
 */
export function validateEmotionField(field: EmotionField): string[] {
  const errors: string[] = [];

  // States validation
  if (!field.states) {
    errors.push('EmotionField: missing states');
    return errors;
  }

  // Check all 14 emotions present
  for (const emotion of VALID_EMOTIONS) {
    if (!(emotion in field.states)) {
      errors.push(`EmotionField: missing emotion state for '${emotion}'`);
    } else {
      const state = field.states[emotion];
      // Validate state bounds
      if (state.intensity < 0 || state.intensity > 1) {
        errors.push(`EmotionField: ${emotion}.intensity out of bounds [0,1]: ${state.intensity}`);
      }
      if (state.mass < 0.1 || state.mass > 10) {
        errors.push(`EmotionField: ${emotion}.mass out of bounds [0.1,10]: ${state.mass}`);
      }
      if (state.inertia < 0 || state.inertia > 1) {
        errors.push(`EmotionField: ${emotion}.inertia out of bounds [0,1]: ${state.inertia}`);
      }
      if (state.decay_rate < 0.01 || state.decay_rate > 0.5) {
        errors.push(`EmotionField: ${emotion}.decay_rate out of bounds [0.01,0.5]: ${state.decay_rate}`);
      }
      if (state.baseline < 0 || state.baseline > 1) {
        errors.push(`EmotionField: ${emotion}.baseline out of bounds [0,1]: ${state.baseline}`);
      }
    }
  }

  // NormalizedIntensities validation
  if (!field.normalizedIntensities) {
    errors.push('EmotionField: missing normalizedIntensities');
  } else {
    let sum = 0;
    for (const emotion of VALID_EMOTIONS) {
      if (!(emotion in field.normalizedIntensities)) {
        errors.push(`EmotionField: missing normalizedIntensity for '${emotion}'`);
      } else {
        const val = field.normalizedIntensities[emotion];
        if (val < 0 || val > 1) {
          errors.push(`EmotionField: normalizedIntensities.${emotion} out of bounds [0,1]: ${val}`);
        }
        sum += val;
      }
    }
    // Sum should be ~1.0 (with tolerance for floating point)
    if (Math.abs(sum - 1.0) > 0.001) {
      errors.push(`EmotionField: normalizedIntensities sum should be 1.0, got ${sum}`);
    }
  }

  // Dominant validation
  if (!field.dominant) {
    errors.push('EmotionField: missing dominant');
  } else if (!VALID_EMOTIONS.includes(field.dominant)) {
    errors.push(`EmotionField: invalid dominant emotion '${field.dominant}'`);
  }

  // Peak validation
  if (typeof field.peak !== 'number' || field.peak < 0 || field.peak > 1) {
    errors.push(`EmotionField: peak out of bounds [0,1]: ${field.peak}`);
  }

  // Entropy validation
  if (typeof field.entropy !== 'number' || field.entropy < 0 || field.entropy > 1) {
    errors.push(`EmotionField: entropy out of bounds [0,1]: ${field.entropy}`);
  }

  // TotalEnergy validation (must be positive)
  if (typeof field.totalEnergy !== 'number' || field.totalEnergy < 0) {
    errors.push(`EmotionField: totalEnergy must be non-negative: ${field.totalEnergy}`);
  }

  return errors;
}

/**
 * Valide un OxygenResult
 */
export function validateOxygenResult(oxygen: OxygenResult): string[] {
  const errors: string[] = [];

  // Base O2 bounds [0, 1]
  if (typeof oxygen.base !== 'number' || oxygen.base < 0 || oxygen.base > 1) {
    errors.push(`OxygenResult: base out of bounds [0,1]: ${oxygen.base}`);
  }

  // Decayed O2 bounds [0, 1]
  if (typeof oxygen.decayed !== 'number' || oxygen.decayed < 0 || oxygen.decayed > 1) {
    errors.push(`OxygenResult: decayed out of bounds [0,1]: ${oxygen.decayed}`);
  }

  // Final O2 bounds [0, 1]
  if (typeof oxygen.final !== 'number' || oxygen.final < 0 || oxygen.final > 1) {
    errors.push(`OxygenResult: final out of bounds [0,1]: ${oxygen.final}`);
  }

  // Components validation
  if (!oxygen.components) {
    errors.push('OxygenResult: missing components');
  } else {
    const c = oxygen.components;
    if (typeof c.emotionScore !== 'number') {
      errors.push('OxygenResult: missing components.emotionScore');
    }
    if (typeof c.eventBoost !== 'number') {
      errors.push('OxygenResult: missing components.eventBoost');
    }
    if (typeof c.contrastScore !== 'number') {
      errors.push('OxygenResult: missing components.contrastScore');
    }
    if (typeof c.decayFactor !== 'number') {
      errors.push('OxygenResult: missing components.decayFactor');
    }
    if (typeof c.relief !== 'number') {
      errors.push('OxygenResult: missing components.relief');
    }
  }

  return errors;
}

/**
 * Valide une timeline
 */
export function validateTimeline(timeline: TimelineFrame[]): string[] {
  const errors: string[] = [];

  // Check monotonicity of t
  let prevT = -1;
  for (let i = 0; i < timeline.length; i++) {
    const frame = timeline[i];

    // t bounds [0, 1]
    if (typeof frame.t !== 'number' || frame.t < 0 || frame.t > 1) {
      errors.push(`Timeline[${i}]: t out of bounds [0,1]: ${frame.t}`);
    }

    // Monotonicity
    if (frame.t <= prevT) {
      errors.push(`Timeline[${i}]: t not monotonically increasing (${frame.t} <= ${prevT})`);
    }
    prevT = frame.t;

    // EmotionField validation
    const fieldErrors = validateEmotionField(frame.emotionField);
    for (const e of fieldErrors) {
      errors.push(`Timeline[${i}]: ${e}`);
    }

    // OxygenResult validation
    const oxygenErrors = validateOxygenResult(frame.oxygenResult);
    for (const e of oxygenErrors) {
      errors.push(`Timeline[${i}]: ${e}`);
    }
  }

  return errors;
}

/**
 * Valide les contraintes
 */
export function validateConstraints(constraints: {
  requiredEmotions?: EmotionType[];
  forbiddenEmotions?: EmotionType[];
  minOxygen?: number;
  maxOxygen?: number;
  minEntropy?: number;
  maxEntropy?: number;
}): string[] {
  const errors: string[] = [];

  // Required emotions
  if (constraints.requiredEmotions) {
    for (const e of constraints.requiredEmotions) {
      if (!VALID_EMOTIONS.includes(e)) {
        errors.push(`Constraints: invalid requiredEmotion '${e}'`);
      }
    }
  }

  // Forbidden emotions
  if (constraints.forbiddenEmotions) {
    for (const e of constraints.forbiddenEmotions) {
      if (!VALID_EMOTIONS.includes(e)) {
        errors.push(`Constraints: invalid forbiddenEmotion '${e}'`);
      }
    }
  }

  // Check for overlap
  if (constraints.requiredEmotions && constraints.forbiddenEmotions) {
    const overlap = constraints.requiredEmotions.filter(e =>
      constraints.forbiddenEmotions!.includes(e)
    );
    if (overlap.length > 0) {
      errors.push(`Constraints: emotions cannot be both required and forbidden: ${overlap.join(', ')}`);
    }
  }

  // O2 bounds
  if (constraints.minOxygen !== undefined) {
    if (constraints.minOxygen < 0 || constraints.minOxygen > 1) {
      errors.push(`Constraints: minOxygen out of bounds [0,1]: ${constraints.minOxygen}`);
    }
  }
  if (constraints.maxOxygen !== undefined) {
    if (constraints.maxOxygen < 0 || constraints.maxOxygen > 1) {
      errors.push(`Constraints: maxOxygen out of bounds [0,1]: ${constraints.maxOxygen}`);
    }
  }
  if (constraints.minOxygen !== undefined && constraints.maxOxygen !== undefined) {
    if (constraints.minOxygen > constraints.maxOxygen) {
      errors.push(`Constraints: minOxygen (${constraints.minOxygen}) > maxOxygen (${constraints.maxOxygen})`);
    }
  }

  // Entropy bounds
  if (constraints.minEntropy !== undefined) {
    if (constraints.minEntropy < 0 || constraints.minEntropy > 1) {
      errors.push(`Constraints: minEntropy out of bounds [0,1]: ${constraints.minEntropy}`);
    }
  }
  if (constraints.maxEntropy !== undefined) {
    if (constraints.maxEntropy < 0 || constraints.maxEntropy > 1) {
      errors.push(`Constraints: maxEntropy out of bounds [0,1]: ${constraints.maxEntropy}`);
    }
  }

  return errors;
}

/**
 * Helper: Check ISO 8601 date format
 */
function isValidISODate(str: string): boolean {
  const date = new Date(str);
  return !isNaN(date.getTime()) && str.includes('T');
}

export default {
  validateTruthBundle,
  validateEmotionField,
  validateOxygenResult,
  validateTimeline,
  validateConstraints,
};
