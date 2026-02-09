/**
 * OMEGA Runner — Hashing
 * Phase D.1 — SHA-256 stable hashing
 */

import { sha256 } from '@omega/canon-kernel';
import { canonicalJSON, canonicalBytes } from './canonical.js';

/** Hash a string with SHA-256 */
export function hashString(input: string): string {
  return sha256(canonicalBytes(input));
}

/** Hash an object by canonicalizing then SHA-256 */
export function hashObject(obj: unknown): string {
  return sha256(canonicalJSON(obj));
}

/** Hash file content (string) with canonical bytes */
export function hashFileContent(content: string): string {
  return sha256(canonicalBytes(content));
}

/** Generate deterministic RUN_ID from intent + seed + versions */
export function generateRunId(
  intentCanonical: string,
  seed: string,
  versions: Record<string, string>,
): string {
  const input = canonicalJSON({
    intent: intentCanonical,
    seed: seed,
    versions: versions,
  });
  return sha256(input).substring(0, 16);
}
