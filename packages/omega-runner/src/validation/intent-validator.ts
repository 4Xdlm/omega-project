/**
 * OMEGA Runner — Intent Validator
 * Hardening Sprint H1 — NCR-G1B-001 + Sprint S-HARDEN TF-2
 *
 * Validates intent objects before pipeline execution.
 * SYNCHRONOUS. DETERMINISTIC. No I/O. No external dependencies.
 *
 * Rules:
 *   V-06     — Simplified format explicitly rejected (TF-2 fix)
 *   V-F1..F3 — Formal IntentPack structural validation
 *   V-00     — Unknown format / non-object guard
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IntentValidationError {
  readonly rule: string;
  readonly field: string;
  readonly message: string;
  readonly severity: 'REJECT';
}

export interface IntentValidationResult {
  readonly valid: boolean;
  readonly format: 'simplified' | 'formal' | 'unknown';
  readonly errors: readonly IntentValidationError[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function err(rule: string, field: string, message: string): IntentValidationError {
  return { rule, field, message, severity: 'REJECT' };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

// ─── Format detection ─────────────────────────────────────────────────────────

function detectFormat(obj: Record<string, unknown>): 'simplified' | 'formal' | 'unknown' {
  const hasFormalKeys = 'intent' in obj && 'canon' in obj && 'constraints' in obj
    && 'genome' in obj && 'emotion' in obj && 'metadata' in obj;
  if (hasFormalKeys) return 'formal';

  const hasSimplifiedKeys = 'title' in obj || 'premise' in obj || 'themes' in obj
    || 'core_emotion' in obj || 'paragraphs' in obj;
  if (hasSimplifiedKeys) return 'simplified';

  return 'unknown';
}

// ─── Formal format validation ────────────────────────────────────────────────

function validateFormal(obj: Record<string, unknown>, errors: IntentValidationError[]): void {
  const metadata = obj['metadata'];
  if (!isObject(metadata)) {
    errors.push(err('V-F1', 'metadata', 'Must be an object'));
    return;
  }
  if (typeof metadata['pack_id'] !== 'string' || metadata['pack_id'].length === 0) {
    errors.push(err('V-F1', 'metadata.pack_id', 'Must be a non-empty string'));
  }
  if (typeof metadata['pack_version'] !== 'string' || metadata['pack_version'].length === 0) {
    errors.push(err('V-F2', 'metadata.pack_version', 'Must be a non-empty string'));
  }
  const intent = obj['intent'];
  if (!isObject(intent)) {
    errors.push(err('V-F3', 'intent', 'Must be a non-null object'));
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Validate an intent object parsed from JSON.
 * Returns a validation result with errors if invalid.
 * SYNCHRONOUS. DETERMINISTIC. No I/O.
 */
export function validateIntent(parsed: unknown): IntentValidationResult {
  // Non-object guard
  if (!isObject(parsed)) {
    const what = parsed === null ? 'null'
      : parsed === undefined ? 'undefined'
      : Array.isArray(parsed) ? 'array'
      : typeof parsed;
    return {
      valid: false,
      format: 'unknown',
      errors: [err('V-00', '(root)', `Expected an object, got ${what}`)],
    };
  }

  const format = detectFormat(parsed);
  const errors: IntentValidationError[] = [];

  if (format === 'simplified') {
    // TF-2 fix: Simplified format passes validation but fails silently in creation-pipeline.
    // Reject it explicitly and direct users to formal IntentPack format.
    errors.push(err('V-06', '(root)',
      'Simplified intent format is not supported. Use formal IntentPack with {intent, canon, constraints, genome, emotion, metadata}'));
  } else if (format === 'formal') {
    validateFormal(parsed, errors);
  } else {
    // unknown — no recognized keys
    errors.push(err('V-00', '(root)', 'Object has no recognized intent fields (simplified or formal)'));
  }

  return {
    valid: errors.length === 0,
    format,
    errors,
  };
}
