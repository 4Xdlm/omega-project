/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — SEAL LOCK PARSER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: proofpack/seal-lock.ts
 * Rule: RULE-SEAL-01
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Parses and validates SEAL_LOCK.json — the SSOT for seal verification.
 * Fail-closed: any structural issue → throws.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SealTarget {
  readonly kind: 'sprint' | 'release';
  readonly id: string;
  readonly tag: string;
  readonly commit: string;
}

export interface MinimalMarkers {
  readonly seal_report: string;
  readonly npm_test: string;
}

export interface SealLock {
  readonly rule: string;
  readonly version: string;
  readonly description: string;
  readonly fail_mode: 'fail-closed';
  readonly seal_target: SealTarget;
  readonly release_target: SealTarget;
  readonly required_paths: readonly string[];
  readonly minimal_markers: MinimalMarkers;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARSER (fail-closed)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse and validate SEAL_LOCK.json content.
 * Throws on any structural issue (fail-closed).
 */
export function parseSealLock(json: string): SealLock {
  let raw: Record<string, unknown>;

  try {
    raw = JSON.parse(json) as Record<string, unknown>;
  } catch {
    throw new Error('SEAL_LOCK: invalid JSON');
  }

  // Validate required fields
  if (raw.fail_mode !== 'fail-closed') {
    throw new Error('SEAL_LOCK: fail_mode must be "fail-closed"');
  }

  if (typeof raw.rule !== 'string' || raw.rule.length === 0) {
    throw new Error('SEAL_LOCK: rule is required');
  }

  if (typeof raw.version !== 'string' || raw.version.length === 0) {
    throw new Error('SEAL_LOCK: version is required');
  }

  // Validate seal_target
  const sealTarget = validateSealTarget(raw.seal_target, 'seal_target');

  // Validate release_target
  const releaseTarget = validateSealTarget(raw.release_target, 'release_target');

  // Validate required_paths
  if (!Array.isArray(raw.required_paths) || raw.required_paths.length === 0) {
    throw new Error('SEAL_LOCK: required_paths must be non-empty array');
  }

  for (let i = 0; i < raw.required_paths.length; i++) {
    if (typeof raw.required_paths[i] !== 'string' || (raw.required_paths[i] as string).length === 0) {
      throw new Error(`SEAL_LOCK: required_paths[${i}] must be non-empty string`);
    }
  }

  // Validate minimal_markers
  const markers = raw.minimal_markers as Record<string, unknown> | undefined;
  if (!markers || typeof markers.seal_report !== 'string' || typeof markers.npm_test !== 'string') {
    throw new Error('SEAL_LOCK: minimal_markers must have seal_report and npm_test strings');
  }

  return {
    rule: raw.rule as string,
    version: raw.version as string,
    description: (raw.description as string) ?? '',
    fail_mode: 'fail-closed',
    seal_target: sealTarget,
    release_target: releaseTarget,
    required_paths: raw.required_paths as string[],
    minimal_markers: {
      seal_report: markers.seal_report as string,
      npm_test: markers.npm_test as string,
    },
  };
}

function validateSealTarget(obj: unknown, label: string): SealTarget {
  const target = obj as Record<string, unknown> | undefined;

  if (!target) {
    throw new Error(`SEAL_LOCK: ${label} is required`);
  }

  if (target.kind !== 'sprint' && target.kind !== 'release') {
    throw new Error(`SEAL_LOCK: ${label}.kind must be "sprint" or "release"`);
  }

  if (typeof target.id !== 'string' || (target.id as string).length === 0) {
    throw new Error(`SEAL_LOCK: ${label}.id is required`);
  }

  if (typeof target.tag !== 'string' || (target.tag as string).length === 0) {
    throw new Error(`SEAL_LOCK: ${label}.tag is required`);
  }

  if (typeof target.commit !== 'string' || (target.commit as string).length === 0) {
    throw new Error(`SEAL_LOCK: ${label}.commit is required`);
  }

  return {
    kind: target.kind as 'sprint' | 'release',
    id: target.id as string,
    tag: target.tag as string,
    commit: target.commit as string,
  };
}
