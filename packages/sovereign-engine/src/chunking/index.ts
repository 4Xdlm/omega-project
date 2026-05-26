/**
 * OMEGA V2.1 — Chunking Module Index
 *
 * Sprint V2.1 scaffolding — Public API surface
 */

export * from './types.js';
export { chunkAdaptive, isAdaptiveModeReady } from './adaptive.js';
export { EmotionalArcDetector } from './detector/emotionalArc.js';
export { ChunkBoundaryOptimizer } from './optimizer/boundary.js';
