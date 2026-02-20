// ═══════════════════════════════════════════════════════════════════════════
// OMEGA SCRIBE v1.0 — TYPE DEFINITIONS
// Version: 1.0.0
// Date: 01 janvier 2026
// Certification: NASA-GRADE AS9100D / DO-178C
// ═══════════════════════════════════════════════════════════════════════════

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export const SCRIBE_SCHEMA_VERSION = 'SCRIBE_SCENESPEC_v1' as const;
export const SCRIBE_MODULE_VERSION = '1.0.0' as const;

// Directories
export const SCRIBE_REPLAY_DIR = 'tests/replay/SCRIBE' as const;
export const SCRIBE_EXPORT_DIR = 'exports/scribe' as const;

// ─────────────────────────────────────────────────────────────────────────────
// PRIMITIVE SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SHA-256 hash schema (64 hex characters)
 * @invariant SCRIBE-I02: Hash format strict
 */
export const HashHexSchema = z.string().regex(/^[a-f0-9]{64}$/i, 'Invalid SHA-256 hash format');

/**
 * ISO 8601 datetime schema
 */
export const ISODateTimeSchema = z.string().datetime();

/**
 * Entity ID schema (format TYPE:ID)
 * @invariant SCRIBE-I03: Canon read scope explicit
 */
export const EntityIdSchema = z.string().regex(
  /^[A-Z_]+:[A-Z0-9_]+$/i,
  'EntityId must have format TYPE:ID (e.g., CHAR:VICK, LOC:PARIS)'
);

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Narrative tense
 */
export const TenseSchema = z.enum(['PAST', 'PRESENT']);
export type Tense = z.infer<typeof TenseSchema>;

/**
 * Length enforcement mode
 * @invariant SCRIBE-I14: v1 = SOFT only
 */
export const LengthModeSchema = z.enum(['SOFT']);
export type LengthMode = z.infer<typeof LengthModeSchema>;

/**
 * SCRIBE execution mode
 */
export const ScribeModeSchema = z.enum(['DRAFT', 'RECORD', 'REPLAY']);
export type ScribeMode = z.infer<typeof ScribeModeSchema>;

/**
 * Staged fact classification
 * @invariant SCRIBE-I13: Staging only, never auto-commit
 */
export const FactClassSchema = z.enum(['SAFE', 'CONFLICT', 'NEEDS_HUMAN']);
export type FactClass = z.infer<typeof FactClassSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Point of View
 * @invariant SCRIBE-I01: POV is REQUIRED (no default)
 */
export const PovSchema = z.object({
  entity_id: EntityIdSchema
});
export type Pov = z.infer<typeof PovSchema>;

/**
 * Length specification
 * @invariant SCRIBE-I14: SOFT mode only in v1
 */
export const LengthSpecSchema = z.object({
  min_words: z.number().int().nonnegative(),
  max_words: z.number().int().positive(),
  mode: LengthModeSchema
}).refine(
  data => data.min_words <= data.max_words,
  { message: 'min_words must be <= max_words' }
);
export type LengthSpec = z.infer<typeof LengthSpecSchema>;

/**
 * Continuity claim (fact assertion)
 * @invariant SCRIBE-I04: All assertions must be structured
 */
export const ClaimSchema = z.object({
  subject: EntityIdSchema,
  predicate: z.string().min(1),
  object: z.unknown()
});
export type Claim = z.infer<typeof ClaimSchema>;

/**
 * Generic constraint
 */
export const ConstraintSchema = z.object({
  key: z.string().min(1),
  value: z.unknown()
});
export type Constraint = z.infer<typeof ConstraintSchema>;

/**
 * Scene metadata (audit trail)
 */
export const SceneMetaSchema = z.object({
  schema_version: z.literal(SCRIBE_SCHEMA_VERSION),
  created_utc: ISODateTimeSchema,
  author: z.string().min(1),
  toolchain: z.string().min(1)
});
export type SceneMeta = z.infer<typeof SceneMetaSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// SCENE SPEC (MAIN CONTRACT)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SceneSpec — The main contract for SCRIBE generation
 * 
 * @invariant SCRIBE-I01: No critical field is optional
 * @invariant SCRIBE-I02: Hash must be deterministic (NFKC)
 * @invariant SCRIBE-I03: Canon read scope must be explicit
 * @invariant SCRIBE-I04: All assertions via continuity_claims
 */
export const SceneSpecSchema = z.object({
  // Identity
  scene_id: z.string().min(1),
  
  // Narrative requirements (REQUIRED - no defaults)
  pov: PovSchema,
  tense: TenseSchema,
  
  // Length (SOFT in v1)
  target_length: LengthSpecSchema,
  
  // CANON governance
  canon_read_scope: z.array(EntityIdSchema).min(1, 'canon_read_scope must have at least one entity'),
  continuity_claims: z.array(ClaimSchema),
  forbidden_facts: z.array(ClaimSchema),
  
  // VOICE reference (read-only)
  voice_profile_ref: HashHexSchema,
  
  // Additional constraints
  constraints: z.array(ConstraintSchema),
  
  // Audit
  metadata: SceneMetaSchema
});
export type SceneSpec = z.infer<typeof SceneSpecSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// SCRIBE REQUEST
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ScribeRequest — Input for SCRIBE execution
 */
export const ScribeRequestSchema = z.object({
  mode: ScribeModeSchema,
  seed: z.number().int().nonnegative(),
  run_id: z.string().min(1),
  scene_spec: SceneSpecSchema,
  canon_snapshot: z.record(z.unknown()),
  voice_guidance: z.record(z.unknown()),
  provider_id: z.string().optional()
}).refine(
  data => {
    // In REPLAY mode, provider_id must be absent
    if (data.mode === 'REPLAY' && data.provider_id !== undefined) {
      return false;
    }
    // In RECORD mode, provider_id must be present
    if (data.mode === 'RECORD' && !data.provider_id) {
      return false;
    }
    return true;
  },
  { message: 'provider_id must be absent in REPLAY mode and present in RECORD mode' }
);
export type ScribeRequest = z.infer<typeof ScribeRequestSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// SCRIBE PROOF
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ScribeProof — Cryptographic proof of execution
 * 
 * @invariant SCRIBE-I06: All hashes must be present
 * @invariant SCRIBE-I07: Replay must produce identical proof
 * @invariant SCRIBE-I08: Tamper detection 100%
 */
export const ScribeProofSchema = z.object({
  run_id: z.string().min(1),
  scene_spec_hash: HashHexSchema,
  canon_snapshot_hash: HashHexSchema,
  guidance_hash: HashHexSchema,
  constraint_hash: HashHexSchema,
  prompt_hash: HashHexSchema,
  record_hash: HashHexSchema.optional(),
  output_hash: HashHexSchema,
  mode: ScribeModeSchema,
  provider_id: z.string().min(1)
});
export type ScribeProof = z.infer<typeof ScribeProofSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// VIOLATIONS & WARNINGS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Violation — Critical issue that must be addressed
 */
export const ViolationSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  details: z.record(z.string())
});
export type Violation = z.infer<typeof ViolationSchema>;

/**
 * Warning — Non-critical issue for review
 */
export const WarningSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  details: z.record(z.string())
});
export type Warning = z.infer<typeof WarningSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// STAGED FACT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * StagedFact — Proposed fact for CANON (never auto-written)
 * 
 * @invariant SCRIBE-I12: CANON is read-only
 * @invariant SCRIBE-I13: Staging only, human validation required
 */
export const StagedFactSchema = z.object({
  subject: EntityIdSchema,
  key: z.string().min(1),
  value: z.unknown(),
  classification: FactClassSchema
});
export type StagedFact = z.infer<typeof StagedFactSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// SCRIBE RESULT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ScribeResult — Output of SCRIBE execution
 * 
 * @invariant SCRIBE-I10: Score bounded [0,1]
 * @invariant SCRIBE-I11: Score is deterministic
 */
export const ScribeResultSchema = z.object({
  text: z.string(),
  compliance_score: z.number().min(0).max(1),
  violations: z.array(ViolationSchema),
  warnings: z.array(WarningSchema),
  staged_facts: z.array(StagedFactSchema),
  proof: ScribeProofSchema
});
export type ScribeResult = z.infer<typeof ScribeResultSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// RECORD FILE (for replay)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ScribeRecordFile — Stored record for replay
 */
export const ScribeRecordFileSchema = z.object({
  request_hash: HashHexSchema,
  prompt_hash: HashHexSchema,
  provider_id: z.string().min(1),
  raw_output: z.string(),
  canonical_output: z.string(),
  record_hash: HashHexSchema,
  created_at: ISODateTimeSchema
});
export type ScribeRecordFile = z.infer<typeof ScribeRecordFileSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// TYPE EXPORTS (for external use)
// ─────────────────────────────────────────────────────────────────────────────

export type HashHex = z.infer<typeof HashHexSchema>;
export type EntityId = z.infer<typeof EntityIdSchema>;
