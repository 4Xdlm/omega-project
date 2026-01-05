/**
 * OMEGA SENTINEL — Public API
 * Phase 16.1 — Security Watchdog
 */

// Core class
export { Sentinel, sentinel, check, checkPayloadSize, checkPatterns, checkStructure, getReport } from './sentinel.js';

// Types
export type {
  SentinelConfig,
  SentinelResult,
  SentinelReport,
  CheckResult,
  PatternMatch,
  StructureViolation,
  CategoryStats,
  SentinelInput,
  JsonValue,
} from './types.js';

// Constants
export {
  DEFAULT_CONFIG,
  MAX_PAYLOAD_SIZE,
  MAX_STRING_LENGTH,
  MAX_ARRAY_LENGTH,
  MAX_DEPTH,
  MAX_OBJECT_KEYS,
  MALICIOUS_PATTERNS,
  XSS_PATTERNS,
  SQL_INJECTION_PATTERNS,
  COMMAND_INJECTION_PATTERNS,
  NOSQL_INJECTION_PATTERNS,
  TEMPLATE_INJECTION_PATTERNS,
  PROTOTYPE_POLLUTION_PATTERNS,
  SentinelStatus,
  BlockReason,
  SENTINEL_VERSION,
} from './constants.js';
