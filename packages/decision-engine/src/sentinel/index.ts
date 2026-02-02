/**
 * @fileoverview SENTINEL module public exports.
 * @module @omega/decision-engine/sentinel
 */

export type { Sentinel, SentinelOptions, ObservationRecord } from './types.js';
export { DefaultSentinel, createSentinel } from './sentinel.js';
export {
  generateEventId,
  computeEventHash,
  isValidBuildVerdict,
  isHashPreserved,
  computeLatency,
  deepFreeze,
} from './utils.js';
