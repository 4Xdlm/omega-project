/**
 * OMEGA SENSOR SYSTEM V2 — Shadow-Only Experimental Module
 *
 * Activation: OMEGA_SENSOR_SHADOW=1 (env var, default=off)
 *
 * ZERO import from dispatcher, coefficients, pipeline, or text-features.
 * This module is completely isolated from the production scoring path.
 */

export { extractSensoryFeatures } from './sensor-extractor.js';
export { assertSensorResults } from './sensor-types.js';
export { DEFAULT_SENSOR_CONFIG } from './sensor-config.js';
export type { SensorConfig } from './sensor-config.js';
export type {
  SensoryModality,
  AnchorLayer,
  RarityTier,
  MarkerInfo,
  AnchorInfo,
  AnchorCandidate,
  RawDetectionV2,
  SensoryEvent,
  SensorTriplet,
  SensorResults,
  SensorAudit,
  SensorExtractionOptions,
  CollisionEntry,
  CollisionAudit,
  DeadMetaphorHit,
  WindowMetricsV2,
} from './sensor-types.js';
