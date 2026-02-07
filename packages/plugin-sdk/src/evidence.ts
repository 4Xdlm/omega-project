/**
 * OMEGA Plugin SDK — Evidence Helpers v1.0
 * INV-PNP-07: Traceability. INV-PNP-03: Determinism via canonical JSON + SHA-256.
 */

import { createHash } from 'node:crypto';
import stableStringify from 'fast-json-stable-stringify';
import type { PluginPayload } from './types.js';

export function hashPayload(payload: PluginPayload): string {
  return createHash('sha256').update(stableStringify(payload)).digest('hex');
}

export function hashData(data: unknown): string {
  return createHash('sha256').update(stableStringify(data)).digest('hex');
}

export function computeEvidenceHashes(
  input: PluginPayload,
  output: PluginPayload | null,
): { readonly input_hash: string; readonly output_hash: string } {
  return {
    input_hash: hashPayload(input),
    output_hash: output !== null ? hashPayload(output) : '',
  };
}

export function generateRequestId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
