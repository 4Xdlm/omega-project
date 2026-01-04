// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — MEMORY_LAYER — index.ts
// Phase 8 — NASA-Grade L4 / DO-178C Level A
// Version: 1.0.0-NASA
// 
// EXPORT PRINCIPAL DU MODULE
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export type {
  // Core types
  MemoryEntry,
  MemoryMetaEvent,
  MemoryWriteRequest,
  MemoryWriteResponse,
  MemorySnapshot,
  MemoryConfig,
  
  // Payload types
  MemoryPayloadType,
  RippleEventType,
  MetaEventType,
  
  // Tier types
  MemoryTier,
  TieringPolicy,
  TieringAction,
  
  // Decay types
  DecayLevel,
  DecayDecision,
  
  // Digest types
  DigestSourceRef,
  DigestPayload,
  
  // Meta event payloads
  AccessLoggedPayload,
  TierChangedPayload,
  DecayMarkedPayload,
  
  // Error handling
  MemoryErrorCode,
  Result,
} from "./types";

export {
  // Config defaults
  DEFAULT_MEMORY_CONFIG,
  DEFAULT_TIERING_POLICY,
  
  // Type guards
  isMemoryTier,
  isDecayLevel,
  isTierChangedPayload,
  isDecayMarkedPayload,
  isAccessLoggedPayload,
  
  // Result helpers
  ok,
  err,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────────
// CANONICAL ENCODE
// ─────────────────────────────────────────────────────────────────────────────────

export {
  canonicalEncode,
  sha256Hex,
  uuid,
  nowUtcIso,
  isIso8601UtcZ,
  byteLength,
  chainHashFirst,
  chainHashNext,
  CanonicalEncodeError,
} from "./canonical_encode";

// ─────────────────────────────────────────────────────────────────────────────────
// CANONICAL KEY
// ─────────────────────────────────────────────────────────────────────────────────

export {
  isValidCanonicalKey,
  validateCanonicalKey,
  parseCanonicalKey,
  buildCanonicalKey,
  getDomain,
  getEntityType,
  isInDomain,
  hasPrefix,
  CANONICAL_KEY_REGEX,
  MIN_KEY_LENGTH,
  MAX_KEY_LENGTH,
  MIN_SEGMENTS,
  MAX_SEGMENTS,
  MAX_SEGMENT_LENGTH,
} from "./canonical_key";

export type { KeyValidationResult } from "./canonical_key";

// ─────────────────────────────────────────────────────────────────────────────────
// MEMORY STORE
// ─────────────────────────────────────────────────────────────────────────────────

export { MemoryStore } from "./memory_store";

// ─────────────────────────────────────────────────────────────────────────────────
// MEMORY SNAPSHOT
// ─────────────────────────────────────────────────────────────────────────────────

export { SnapshotManager } from "./memory_snapshot";

// ─────────────────────────────────────────────────────────────────────────────────
// MEMORY HYBRID
// ─────────────────────────────────────────────────────────────────────────────────

export {
  MemoryHybrid,
  getEffectiveTier,
  getLastTierChangeTimestamp,
  splitHybridView,
} from "./memory_hybrid";

export type { HybridView, MemoryHybridOptions } from "./memory_hybrid";

// ─────────────────────────────────────────────────────────────────────────────────
// MEMORY TIERING
// ─────────────────────────────────────────────────────────────────────────────────

export {
  computeTieringActions,
  applyTieringActions,
  logAccess,
  getTieringStats,
} from "./memory_tiering";

export type { TieringResult, TieringStats } from "./memory_tiering";

// ─────────────────────────────────────────────────────────────────────────────────
// MEMORY DECAY
// ─────────────────────────────────────────────────────────────────────────────────

export { DecayManager, projectDecayState } from "./memory_decay";

// ─────────────────────────────────────────────────────────────────────────────────
// MEMORY DIGEST
// ─────────────────────────────────────────────────────────────────────────────────

export {
  DIGEST_PAYLOAD_TYPE,
  DIGEST_EVENT_TYPE,
  MAX_DIGEST_SOURCES,
  validateDigestSources,
  assertDigestableSources,
  sortSourcesDeterministic,
  buildDigestPayload,
  isDigestPayload,
  isDigestEntry,
  getDigestSourceIds,
  verifyDigestIntegrity,
} from "./memory_digest";

export type { DigestRule } from "./memory_digest";

// ─────────────────────────────────────────────────────────────────────────────────
// DIGEST RULES
// ─────────────────────────────────────────────────────────────────────────────────

export {
  DIGEST_CONTEXT_V1,
  DIGEST_FACTS_V1,
  DIGEST_TIMELINE_V1,
  DIGEST_KEYS_V1,
  DIGEST_EMOTIONS_V1,
  DIGEST_RULES,
  getDigestRule,
  listDigestRuleIds,
} from "./digest_rules";

// ─────────────────────────────────────────────────────────────────────────────────
// DIGEST WRITER
// ─────────────────────────────────────────────────────────────────────────────────

export {
  writeDigest,
  createAndWriteDigest,
  createChainedDigest,
  getDigestSources,
  isDigestComplete,
} from "./memory_digest_writer";
