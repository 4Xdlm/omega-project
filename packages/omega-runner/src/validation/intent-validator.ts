/**
 * OMEGA Runner — Intent Validator
 * Hardening Sprint H1 — NCR-G1B-001
 *
 * Validates intent objects before pipeline execution.
 * SYNCHRONOUS. DETERMINISTIC. No I/O. No external dependencies.
 *
 * Rules:
 *   V-01..V-05 — Structural validation (simplified format)
 *   S-01..S-05 — Security validation (anti-injection)
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

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_TITLE_LENGTH = 500;
const MAX_PREMISE_LENGTH = 2000;
const MAX_THEME_LENGTH = 100;
const MAX_THEMES_COUNT = 20;
const MAX_EMOTION_LENGTH = 100;
const MIN_PARAGRAPHS = 1;
const MAX_PARAGRAPHS = 1000;

/** Zero-width and directional override characters */
const ZERO_WIDTH_CHARS = /[\u200B\u200C\u200D\uFEFF\u202E\u202D]/;

/** Control characters (U+0000–U+001F) except newline (U+000A) and carriage return (U+000D) */
const CONTROL_CHARS = /[\u0000-\u0009\u000B\u000C\u000E-\u001F]/;

/** Path traversal patterns */
const PATH_TRAVERSAL = /\.\.[/\\]/;

/** XSS script tag pattern (case-insensitive) */
const XSS_SCRIPT = /<script/i;

/** SQL injection patterns (case-insensitive) */
const SQL_INJECTION = /\b(DROP|DELETE|INSERT|UPDATE)\s/i;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function err(rule: string, field: string, message: string): IntentValidationError {
  return { rule, field, message, severity: 'REJECT' };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

// ─── Security rules (applied to every string value) ──────────────────────────

function checkSecurityRules(value: string, field: string, errors: IntentValidationError[]): void {
  if (XSS_SCRIPT.test(value)) {
    errors.push(err('S-01', field, 'Contains <script tag (XSS)'));
  }
  if (PATH_TRAVERSAL.test(value)) {
    errors.push(err('S-02', field, 'Contains path traversal sequence (../ or ..\\)'));
  }
  if (SQL_INJECTION.test(value)) {
    errors.push(err('S-03', field, 'Contains SQL injection keyword'));
  }
  if (CONTROL_CHARS.test(value)) {
    errors.push(err('S-04', field, 'Contains control character'));
  }
  if (ZERO_WIDTH_CHARS.test(value)) {
    errors.push(err('S-05', field, 'Contains zero-width or directional override character'));
  }
}

// ─── Structural rules ────────────────────────────────────────────────────────

function validateTitle(obj: Record<string, unknown>, errors: IntentValidationError[]): void {
  const title = obj['title'];
  if (title === undefined || title === null) {
    errors.push(err('V-01', 'title', 'Missing required field'));
    return;
  }
  if (typeof title !== 'string') {
    errors.push(err('V-01', 'title', 'Must be a string'));
    return;
  }
  if (title.length === 0) {
    errors.push(err('V-01', 'title', 'Must not be empty'));
    return;
  }
  if (title.length > MAX_TITLE_LENGTH) {
    errors.push(err('V-01', 'title', `Must be ≤${MAX_TITLE_LENGTH} characters (got ${title.length})`));
    return;
  }
  checkSecurityRules(title, 'title', errors);
}

function validatePremise(obj: Record<string, unknown>, errors: IntentValidationError[]): void {
  const premise = obj['premise'];
  if (premise === undefined || premise === null) {
    errors.push(err('V-02', 'premise', 'Missing required field'));
    return;
  }
  if (typeof premise !== 'string') {
    errors.push(err('V-02', 'premise', 'Must be a string'));
    return;
  }
  if (premise.length === 0) {
    errors.push(err('V-02', 'premise', 'Must not be empty'));
    return;
  }
  if (premise.length > MAX_PREMISE_LENGTH) {
    errors.push(err('V-02', 'premise', `Must be ≤${MAX_PREMISE_LENGTH} characters (got ${premise.length})`));
    return;
  }
  checkSecurityRules(premise, 'premise', errors);
}

function validateThemes(obj: Record<string, unknown>, errors: IntentValidationError[]): void {
  const themes = obj['themes'];
  if (themes === undefined || themes === null) {
    errors.push(err('V-03', 'themes', 'Missing required field'));
    return;
  }
  if (!Array.isArray(themes)) {
    errors.push(err('V-03', 'themes', 'Must be an array'));
    return;
  }
  if (themes.length === 0) {
    errors.push(err('V-03', 'themes', 'Must contain at least 1 element'));
    return;
  }
  if (themes.length > MAX_THEMES_COUNT) {
    errors.push(err('V-03', 'themes', `Must contain ≤${MAX_THEMES_COUNT} elements (got ${themes.length})`));
    return;
  }
  for (let i = 0; i < themes.length; i++) {
    const t = themes[i];
    if (typeof t !== 'string') {
      errors.push(err('V-03', `themes[${i}]`, 'Each theme must be a string'));
      continue;
    }
    if (t.length > MAX_THEME_LENGTH) {
      errors.push(err('V-03', `themes[${i}]`, `Must be ≤${MAX_THEME_LENGTH} characters (got ${t.length})`));
      continue;
    }
    checkSecurityRules(t, `themes[${i}]`, errors);
  }
}

function validateCoreEmotion(obj: Record<string, unknown>, errors: IntentValidationError[]): void {
  const emotion = obj['core_emotion'];
  if (emotion === undefined || emotion === null) {
    errors.push(err('V-04', 'core_emotion', 'Missing required field'));
    return;
  }
  if (typeof emotion !== 'string') {
    errors.push(err('V-04', 'core_emotion', 'Must be a string'));
    return;
  }
  if (emotion.length === 0) {
    errors.push(err('V-04', 'core_emotion', 'Must not be empty'));
    return;
  }
  if (emotion.length > MAX_EMOTION_LENGTH) {
    errors.push(err('V-04', 'core_emotion', `Must be ≤${MAX_EMOTION_LENGTH} characters (got ${emotion.length})`));
    return;
  }
  checkSecurityRules(emotion, 'core_emotion', errors);
}

function validateParagraphs(obj: Record<string, unknown>, errors: IntentValidationError[]): void {
  const paragraphs = obj['paragraphs'];
  if (paragraphs === undefined || paragraphs === null) {
    errors.push(err('V-05', 'paragraphs', 'Missing required field'));
    return;
  }
  if (typeof paragraphs !== 'number') {
    errors.push(err('V-05', 'paragraphs', 'Must be a number'));
    return;
  }
  if (!Number.isInteger(paragraphs)) {
    errors.push(err('V-05', 'paragraphs', 'Must be an integer'));
    return;
  }
  if (paragraphs < MIN_PARAGRAPHS || paragraphs > MAX_PARAGRAPHS) {
    errors.push(err('V-05', 'paragraphs', `Must be between ${MIN_PARAGRAPHS} and ${MAX_PARAGRAPHS} (got ${paragraphs})`));
  }
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
    validateTitle(parsed, errors);
    validatePremise(parsed, errors);
    validateThemes(parsed, errors);
    validateCoreEmotion(parsed, errors);
    validateParagraphs(parsed, errors);
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
