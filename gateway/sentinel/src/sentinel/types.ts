/**
 * OMEGA SENTINEL — Types
 * Phase 16.1 — Security Watchdog
 * 
 * Type definitions for SENTINEL validation system.
 */

import { SentinelStatus, BlockReason } from './constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * SENTINEL configuration options
 */
export interface SentinelConfig {
  /** Maximum payload size in bytes */
  maxPayloadSize: number;
  /** Maximum string length */
  maxStringLength: number;
  /** Maximum array length */
  maxArrayLength: number;
  /** Maximum object nesting depth */
  maxDepth: number;
  /** Maximum number of keys in object */
  maxObjectKeys: number;
  /** Enable XSS pattern checking */
  enableXssCheck: boolean;
  /** Enable SQL injection checking */
  enableSqlCheck: boolean;
  /** Enable command injection checking */
  enableCommandCheck: boolean;
  /** Enable NoSQL injection checking */
  enableNoSqlCheck: boolean;
  /** Enable template injection checking */
  enableTemplateCheck: boolean;
  /** Enable prototype pollution checking */
  enablePrototypeCheck: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK RESULTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Pattern match details
 */
export interface PatternMatch {
  /** Category of the matched pattern */
  category: string;
  /** Index of the pattern in the category */
  patternIndex: number;
  /** The matched content (truncated for safety) */
  matchedContent: string;
  /** Path to the field containing the match */
  path: string;
}

/**
 * Structure violation details
 */
export interface StructureViolation {
  /** Type of violation */
  type: BlockReason;
  /** Path to the violating field */
  path: string;
  /** Actual value */
  actual: number;
  /** Maximum allowed value */
  limit: number;
}

/**
 * Result of a single check operation
 */
export interface CheckResult {
  /** Check status */
  status: SentinelStatus;
  /** Reason for blocking (if blocked) */
  reason?: BlockReason;
  /** Detailed message */
  message: string;
  /** Timestamp of the check */
  timestamp: string;
  /** Duration of check in milliseconds */
  durationMs: number;
  /** Pattern matches found (if any) */
  patternMatches?: PatternMatch[];
  /** Structure violations found (if any) */
  structureViolations?: StructureViolation[];
  /** Payload size in bytes */
  payloadSize?: number;
}

/**
 * Full SENTINEL check result
 */
export interface SentinelResult {
  /** Overall status */
  status: SentinelStatus;
  /** All checks passed */
  passed: boolean;
  /** Timestamp of the validation */
  timestamp: string;
  /** Total duration in milliseconds */
  durationMs: number;
  /** Individual check results */
  checks: {
    payloadSize: CheckResult;
    patterns: CheckResult;
    structure: CheckResult;
  };
  /** Summary message */
  summary: string;
  /** Input hash for determinism verification */
  inputHash: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATISTICS & REPORTING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Statistics for a single category
 */
export interface CategoryStats {
  /** Total checks performed */
  total: number;
  /** Checks that passed */
  passed: number;
  /** Checks that were blocked */
  blocked: number;
  /** Checks that generated warnings */
  warned: number;
}

/**
 * SENTINEL report with statistics
 */
export interface SentinelReport {
  /** Report generation timestamp */
  timestamp: string;
  /** SENTINEL version */
  version: string;
  /** Time since SENTINEL initialization */
  uptimeMs: number;
  /** Overall statistics */
  overall: CategoryStats;
  /** Statistics by check type */
  byCheckType: {
    payloadSize: CategoryStats;
    patterns: CategoryStats;
    structure: CategoryStats;
  };
  /** Statistics by block reason */
  byBlockReason: Record<BlockReason, number>;
  /** Statistics by pattern category */
  byPatternCategory: Record<string, number>;
  /** Last N blocked inputs (hashes only for privacy) */
  recentBlocks: {
    timestamp: string;
    reason: BlockReason;
    inputHash: string;
  }[];
  /** Current configuration */
  config: SentinelConfig;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Any JSON-serializable value
 */
export type JsonValue = 
  | string 
  | number 
  | boolean 
  | null 
  | JsonValue[] 
  | { [key: string]: JsonValue };

/**
 * Input that can be validated by SENTINEL
 */
export type SentinelInput = JsonValue | undefined;
