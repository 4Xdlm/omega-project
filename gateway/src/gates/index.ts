/**
 * OMEGA GATES — Public Exports
 * Module: gateway/src/gates/index.ts
 * Phase: 7A + 7B
 */

export * from "./types";
export { createTruthGate, GATE_NAME, GATE_VERSION } from "./truth_gate";
export { createCanonEngine, CanonError, ENGINE_NAME, ENGINE_VERSION } from "./canon_engine";
export type { CanonEngine, CanonHistoryEntry, CanonErrorCode } from "./canon_engine";
