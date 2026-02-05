/**
 * EMOTIONAL DNA IR VALIDATOR v1.0
 *
 * Validates Emotional DNA Intermediate Representation instances
 * against the official JSON Schema.
 *
 * @module EmotionalDNA/Validator
 * @version 1.0.0
 */

import { z } from 'zod';

// === SCHEMAS ===

const IdentitySchema = z.object({
  id: z.string().regex(/^[a-f0-9]{64}$/),
  title: z.string().min(1).max(500),
  language: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/),
  work_version: z.string().optional()
});

const EmotionalAxesSchema = z.object({
  dimensions: z.number().int().min(1).max(128),
  values: z.array(z.number().min(-1.0).max(1.0)),
  labels: z.array(z.string()).optional(),
  confidence: z.number().min(0.0).max(1.0).optional()
}).refine(data => data.values.length === data.dimensions, {
  message: 'values array length must equal dimensions'
});

const StyleSignaturesSchema = z.object({
  rhythm: z.object({
    avg_sentence_length: z.number().min(0).optional(),
    variance: z.number().min(0).optional()
  }).optional(),
  density: z.object({
    lexical_density: z.number().min(0).max(1).optional(),
    word_frequency_profile: z.string().optional()
  }).optional(),
  register: z.enum(['formal', 'neutral', 'informal', 'mixed']).optional()
}).optional();

const ConstraintsSchema = z.object({
  taboos: z.array(z.string()).optional(),
  intensity_bounds: z.object({
    min: z.number().min(0).max(1).optional(),
    max: z.number().min(0).max(1).optional()
  }).optional(),
  arc_constraints: z.array(z.object({
    type: z.string(),
    value: z.string()
  })).optional()
}).optional();

const ProvenanceSchema = z.object({
  source_hash: z.string().regex(/^[a-f0-9]{64}$/),
  analyzer_version: z.string(),
  timestamp: z.string().datetime(),
  license: z.string().optional(),
  consent: z.boolean().optional()
});

const CompatibilitySchema = z.object({
  min_version: z.string().regex(/^[0-9]+\.[0-9]+\.[0-9]+$/).optional(),
  max_version: z.string().regex(/^[0-9]+\.[0-9]+\.[0-9]+$/).optional()
}).optional();

const ProofsSchema = z.object({
  input_hashes: z.array(z.string().regex(/^[a-f0-9]{64}$/)).optional(),
  merkle_root: z.string().regex(/^[a-f0-9]{64}$/).optional()
}).optional();

export const EmotionalDNA_IR_Schema = z.object({
  version: z.string().regex(/^1\.0\.[0-9]+$/),
  identity: IdentitySchema,
  emotional_axes: EmotionalAxesSchema,
  style_signatures: StyleSignaturesSchema,
  constraints: ConstraintsSchema,
  provenance: ProvenanceSchema,
  compatibility: CompatibilitySchema,
  proofs: ProofsSchema
});

export type EmotionalDNA_IR = z.infer<typeof EmotionalDNA_IR_Schema>;

// === VALIDATION ===

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate an Emotional DNA IR instance
 */
export function validate(data: unknown): ValidationResult {
  const result: ValidationResult = {
    valid: false,
    errors: [],
    warnings: []
  };

  try {
    EmotionalDNA_IR_Schema.parse(data);
    result.valid = true;
  } catch (error) {
    if (error instanceof z.ZodError) {
      result.errors = error.errors.map(e =>
        `${e.path.join('.')}: ${e.message}`
      );
    } else {
      result.errors = ['Unknown validation error'];
    }
  }

  // Additional semantic checks
  if (result.valid && typeof data === 'object' && data !== null) {
    const ir = data as EmotionalDNA_IR;

    // Check version compatibility
    if (ir.compatibility) {
      const current = parseVersion(ir.version);
      if (ir.compatibility.min_version) {
        const min = parseVersion(ir.compatibility.min_version);
        if (compareVersions(current, min) < 0) {
          result.warnings.push('IR version below minimum compatibility');
        }
      }
    }

    // Check confidence threshold
    if (ir.emotional_axes.confidence !== undefined &&
        ir.emotional_axes.confidence < 0.5) {
      result.warnings.push('Low confidence score (<0.5)');
    }
  }

  return result;
}

// === CANONICALIZATION ===

/**
 * Canonicalize IR for deterministic hashing
 */
export function canonicalize(ir: EmotionalDNA_IR): string {
  const cleaned = removeNulls(ir);
  const sorted = sortKeysDeep(cleaned);
  return JSON.stringify(sorted);
}

function removeNulls(obj: unknown): unknown {
  if (obj === null || obj === undefined) return undefined;
  if (Array.isArray(obj)) {
    return obj.map(removeNulls).filter(v => v !== undefined);
  }
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleaned = removeNulls(value);
      if (cleaned !== undefined) {
        result[key] = cleaned;
      }
    }
    return result;
  }
  return obj;
}

function sortKeysDeep(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(sortKeysDeep);
  }
  if (typeof obj === 'object') {
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(obj as object).sort();
    for (const key of keys) {
      sorted[key] = sortKeysDeep((obj as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return obj;
}

// === VERSION UTILITIES ===

interface SemVer {
  major: number;
  minor: number;
  patch: number;
}

function parseVersion(version: string): SemVer {
  const [major, minor, patch] = version.split('.').map(Number);
  return { major, minor, patch };
}

function compareVersions(a: SemVer, b: SemVer): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

// === EXPORTS ===

export default {
  validate,
  canonicalize,
  EmotionalDNA_IR_Schema
};
