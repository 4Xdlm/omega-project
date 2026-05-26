/**
 * OMEGA RESILIENCE PROOF SYSTEM
 * Main Index
 *
 * Phase 23
 * 2026-05-26 : namespace re-exports to resolve cross-module ambiguities (TS2308 fix)
 *
 * Each sub-module exposed under its namespace to prevent name collisions
 * (e.g. ALL_RESPONSES exists in chaos AND adversarial with different semantics).
 *
 * Usage:
 *   import { Chaos, Adversarial, Temporal, Stress, Proof } from '@omega/resilience';
 *   const cell: Adversarial.CoverageCell = ...;
 */

export * as Chaos from './chaos/index.js';
export * as Adversarial from './adversarial/index.js';
export * as Temporal from './temporal/index.js';
export * as Stress from './stress/index.js';
export * as Proof from './proof/index.js';
