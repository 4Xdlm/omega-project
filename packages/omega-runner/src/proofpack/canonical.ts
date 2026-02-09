/**
 * OMEGA Runner — Canonicalisation
 * Phase D.1 — Deterministic JSON, path, and bytes canonicalisation
 */

import { canonicalize } from '@omega/canon-kernel';

/** Canonical JSON — uses canon-kernel's sorted-keys canonicalize */
export function canonicalJSON(obj: unknown): string {
  return canonicalize(obj);
}

/** Path canonicalisation — always POSIX forward slashes */
export function canonicalPath(p: string): string {
  return p.replace(/\\/g, '/');
}

/** Bytes canonicalisation — LF only, UTF-8 */
export function canonicalBytes(content: string): string {
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}
