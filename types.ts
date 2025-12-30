// ═══════════════════════════════════════════════════════════════════════════
// OMEGA CANON V1 — TYPE DEFINITIONS
// Version: 1.1
// Date: 18 décembre 2025
// ═══════════════════════════════════════════════════════════════════════════

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export const CURRENT_SCHEMA_VERSION = '1.0.0' as const;
export const PROJECT_FILENAME = 'omega.json' as const;
export const LOCK_FILENAME = '.omega.lock' as const;
export const BACKUP_SUFFIX = '.backup' as const;
export const TMP_SUFFIX = '.tmp' as const;

// Directories
export const EVENTS_DIR = 'events' as const;
export const QUARANTINE_DIR = '_quarantine' as const;
export const JOURNAL_DIR = 'journal' as const;

// ─────────────────────────────────────────────────────────────────────────────
// ZOD SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ISO 8601 datetime schema
 */
const ISODateTimeSchema = z.string().datetime();

/**
 * SHA-256 hash schema (64 hex characters)
 */
const SHA256Schema = z.string().regex(/^[a-f0-9]{64}$/i);

/**
 * Integrity block
 */
export const IntegritySchema = z.object({
  sha256: SHA256Schema,
  computed_at: ISODateTimeSchema
});

/**
 * Project metadata
 */
export const ProjectMetaSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  author: z.string().optional(),
  description: z.string().optional(),
  created_at: ISODateTimeSchema,
  updated_at: ISODateTimeSchema
});

/**
 * Run summary (flexible)
 */
export const RunSummarySchema = z.record(z.unknown());

/**
 * Run record
 */
export const RunRecordSchema = z.object({
  run_id: z.string().uuid(),
  timestamp: ISODateTimeSchema,
  events_path: z.string(),
  summary: RunSummarySchema
});

/**
 * Omega Project (with integrity)
 */
export const OmegaProjectSchema = z.object({
  schema_version: z.literal(CURRENT_SCHEMA_VERSION),
  integrity: IntegritySchema,
  meta: ProjectMetaSchema,
  state: z.record(z.unknown()),
  runs: z.array(RunRecordSchema)
});

/**
 * Project without integrity (for creation/modification)
 */
export const ProjectWithoutIntegritySchema = OmegaProjectSchema.omit({ integrity: true });

// ─────────────────────────────────────────────────────────────────────────────
// TYPESCRIPT TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type Integrity = z.infer<typeof IntegritySchema>;
export type ProjectMeta = z.infer<typeof ProjectMetaSchema>;
export type RunSummary = z.infer<typeof RunSummarySchema>;
export type RunRecord = z.infer<typeof RunRecordSchema>;
export type OmegaProject = z.infer<typeof OmegaProjectSchema>;
export type ProjectWithoutIntegrity = z.infer<typeof ProjectWithoutIntegritySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// LOCK FILE
// ─────────────────────────────────────────────────────────────────────────────

export const LockFileSchema = z.object({
  pid: z.number().int().positive(),
  hostname: z.string(),
  acquired_at: ISODateTimeSchema,
  ttl_seconds: z.number().int().positive()
});

export type LockFile = z.infer<typeof LockFileSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// QUARANTINE METADATA
// ─────────────────────────────────────────────────────────────────────────────

export const QuarantineMetaSchema = z.object({
  original_path: z.string(),
  quarantined_at: ISODateTimeSchema,
  reason: z.string(),
  original_size: z.number().int().nonnegative()
});

export type QuarantineMeta = z.infer<typeof QuarantineMetaSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// RESULT TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateProjectOptions {
  name: string;
  author?: string;
  description?: string;
  initialState?: Record<string, unknown>;
}
