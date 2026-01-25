/**
 * OMEGA Emotion Gate — Validators
 *
 * All 8 Emotion Validators for emotional state validation.
 */

export * from './validator-interface.js';

// V-EMO-BOUNDS: Value bounds and format validation
export * from './v-emo-bounds.js';

// V-EMO-STABILITY: Temporal continuity validation
export * from './v-emo-stability.js';

// V-EMO-CAUSALITY: Narrative causation validation
export * from './v-emo-causality.js';

// V-EMO-AMPLIFICATION: Amplification loop detection
export * from './v-emo-amplification.js';

// V-EMO-AXIOM-COMPAT: Axiom constraint validation
export * from './v-emo-axiom-compat.js';

// V-EMO-DRIFT-VECTOR: Drift threshold validation
export * from './v-emo-drift-vector.js';

// V-EMO-TOXICITY: Toxicity pattern detection
export * from './v-emo-toxicity.js';

// V-EMO-COHERENCE: Inter-entity coherence validation
export * from './v-emo-coherence.js';

// Re-export types
export type { EmotionValidator } from './validator-interface.js';
