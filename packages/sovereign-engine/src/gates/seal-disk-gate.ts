/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — SEAL DISK GATE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: gates/seal-disk-gate.ts
 * Rule: RULE-SEAL-01
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Validates that proofpack artifacts exist on disk at exact paths.
 * Fail-closed: missing file, empty file, or missing marker → FAIL.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SealLock } from '../proofpack/seal-lock.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SealDiskResult {
  readonly ok: boolean;
  readonly missing: readonly string[];
  readonly empty: readonly string[];
  readonly marker_failures: readonly string[];
  readonly errors: readonly string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// MINIMUM FILE SIZE (bytes) — non-empty threshold
// ═══════════════════════════════════════════════════════════════════════════════

const MIN_FILE_SIZE_BYTES = 10;

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate that all proofpack artifacts exist on disk.
 * Fail-closed: any issue → ok=false.
 *
 * @param lock - Parsed SEAL_LOCK
 * @param packageRoot - Absolute path to sovereign-engine package root
 * @returns SealDiskResult
 */
export function validateSealDisk(lock: SealLock, packageRoot: string): SealDiskResult {
  const missing: string[] = [];
  const empty: string[] = [];
  const markerFailures: string[] = [];
  const errors: string[] = [];

  for (const relPath of lock.required_paths) {
    const absPath = join(packageRoot, relPath);

    // Check existence
    if (!existsSync(absPath)) {
      missing.push(relPath);
      continue;
    }

    // Check non-empty
    let content: string;
    try {
      content = readFileSync(absPath, 'utf-8');
    } catch (err) {
      errors.push(`Cannot read ${relPath}: ${String(err)}`);
      continue;
    }

    if (content.length < MIN_FILE_SIZE_BYTES) {
      empty.push(relPath);
      continue;
    }

    // Check markers
    if (relPath.includes('SEAL_REPORT') && !content.includes(lock.minimal_markers.seal_report)) {
      markerFailures.push(`${relPath}: missing marker "${lock.minimal_markers.seal_report}"`);
    }

    if (relPath.includes('npm_test') && !content.toLowerCase().includes(lock.minimal_markers.npm_test.toLowerCase())) {
      markerFailures.push(`${relPath}: missing marker "${lock.minimal_markers.npm_test}"`);
    }
  }

  const ok = missing.length === 0 && empty.length === 0 && markerFailures.length === 0 && errors.length === 0;

  return { ok, missing, empty, marker_failures: markerFailures, errors };
}
