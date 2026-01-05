/**
 * OMEGA GATEWAY — Public API
 * Phase 17 — Unified Security Gateway Facade
 */

// Core class
export { Gateway, createGateway, createContext } from './gateway.js';

// Types
export type {
  GatewayConfig,
  GatewayContext,
  GatewayInput,
  GatewayResult,
  GatewayMetrics,
  Threat,
  RateLimitReport,
  ValidationReport,
  QuarantineReport,
  StageReport,
  BeforeHook,
  AfterHook,
  ErrorHook,
} from './types.js';

// Constants
export {
  GatewayStatus,
  GatewayStage,
  ThreatSeverity,
  ThreatCategory,
  DEFAULT_RATE_LIMIT,
  DEFAULT_RATE_WINDOW_MS,
  DEFAULT_QUARANTINE_TTL_MS,
  AUTO_QUARANTINE_SEVERITY,
  DEFAULT_CONFIG,
  GATEWAY_VERSION,
} from './constants.js';
