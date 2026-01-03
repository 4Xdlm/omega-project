/**
 * OMEGA GATES — Public Exports
 * Module: gateway/src/gates/index.ts
 * Phase: 7A + 7B + 7C + 7D
 */

export * from "./types";
export { createTruthGate, GATE_NAME, GATE_VERSION } from "./truth_gate";
export { createCanonEngine, CanonError, ENGINE_NAME, ENGINE_VERSION } from "./canon_engine";
export type { CanonEngine, CanonHistoryEntry, CanonErrorCode } from "./canon_engine";
export { createEmotionGate, EMOTION_GATE_NAME, EMOTION_GATE_VERSION } from "./emotion_gate";
export type { EmotionGate, EmotionalState, EmotionalArc, BaseEmotion, EmotionViolation } from "./emotion_gate";
export { createRippleEngine, RIPPLE_ENGINE_NAME, RIPPLE_ENGINE_VERSION } from "./ripple_engine";
export type { RippleEngine, Ripple, RippleSource, RelationGraph, PropagationResult } from "./ripple_engine";
