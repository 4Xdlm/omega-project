/**
 * OMEGA Governance — Event Schema
 * Phase D.2 — Strict validation of RuntimeEvent objects
 */

import type { RuntimeEvent } from './types.js';

const VALID_COMMANDS = ['create', 'forge', 'full', 'compare', 'drift', 'certify', 'bench'] as const;
const VALID_STATUSES = ['SUCCESS', 'FAIL'] as const;

/** Validate a RuntimeEvent against the strict schema */
export function validateEvent(event: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof event !== 'object' || event === null) {
    return { valid: false, errors: ['Event must be a non-null object'] };
  }

  const obj = event as Record<string, unknown>;

  if (typeof obj['event_id'] !== 'string' || !/^[a-f0-9]{64}$/.test(obj['event_id'])) {
    errors.push('event_id must be a 64-char hex string');
  }
  if (typeof obj['run_id'] !== 'string' || obj['run_id'].length === 0) {
    errors.push('run_id must be a non-empty string');
  }
  if (typeof obj['command'] !== 'string' || !(VALID_COMMANDS as readonly string[]).includes(obj['command'])) {
    errors.push(`command must be one of: ${VALID_COMMANDS.join(', ')}`);
  }
  if (typeof obj['status'] !== 'string' || !(VALID_STATUSES as readonly string[]).includes(obj['status'])) {
    errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}`);
  }
  if (typeof obj['duration_ms'] !== 'number' || obj['duration_ms'] < 0) {
    errors.push('duration_ms must be a non-negative number');
  }
  if (typeof obj['manifest_hash'] !== 'string') {
    errors.push('manifest_hash must be a string');
  }
  if (typeof obj['merkle_root'] !== 'string') {
    errors.push('merkle_root must be a string');
  }
  if (typeof obj['timestamp'] !== 'string') {
    errors.push('timestamp must be a string');
  }

  return { valid: errors.length === 0, errors };
}

/** Parse an NDJSON line into a RuntimeEvent (strict) */
export function parseEventLine(line: string): RuntimeEvent {
  const parsed: unknown = JSON.parse(line);
  const validation = validateEvent(parsed);
  if (!validation.valid) {
    throw new Error(`Invalid event: ${validation.errors.join('; ')}`);
  }
  return parsed as RuntimeEvent;
}
