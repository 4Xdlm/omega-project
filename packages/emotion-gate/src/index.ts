/**
 * OMEGA Emotion Gate
 *
 * Emotional validation layer for the OMEGA pipeline.
 * Pipeline: EmotionV2 → EmotionGate → TruthGate → Memory
 *
 * SSOT PRINCIPLE: EmotionGate OBSERVES, MEASURES, VALIDATES, BLOCKS
 * but NEVER modifies EmotionV2.
 */

// Core types and gate engine
export * from './gate/index.js';

// All validators
export * from './validators/index.js';

// Verdict ledger
export * from './ledger/index.js';

// Policy manager
export * from './policy/index.js';

// Metrics
export * from './metrics/index.js';

// Proof generation
export * from './proof/index.js';
