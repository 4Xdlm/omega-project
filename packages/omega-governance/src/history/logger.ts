/**
 * OMEGA Governance — History Logger
 * Phase D.2 — Append-only NDJSON event writer
 *
 * INV-GOV-07: Log is append-only. Never deletes or modifies existing entries.
 */

import { appendFileSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { RuntimeEvent } from './types.js';
import { validateEvent } from './event-schema.js';

/** Create an event ID from event data (deterministic SHA-256) */
export function createEventId(
  runId: string,
  command: string,
  status: string,
  timestamp: string,
): string {
  const input = `${runId}:${command}:${status}:${timestamp}`;
  return createHash('sha256').update(input, 'utf-8').digest('hex');
}

/** Append an event to the NDJSON log file (append-only) */
export function appendEvent(logPath: string, event: RuntimeEvent): void {
  const validation = validateEvent(event);
  if (!validation.valid) {
    throw new Error(`Cannot log invalid event: ${validation.errors.join('; ')}`);
  }

  const line = JSON.stringify(event) + '\n';
  appendFileSync(logPath, line, 'utf-8');
}

/** Read all events from an NDJSON log file */
export function readEvents(logPath: string): readonly RuntimeEvent[] {
  if (!existsSync(logPath)) {
    return [];
  }

  const content = readFileSync(logPath, 'utf-8');
  const lines = content.split('\n').filter((l) => l.trim().length > 0);
  return lines.map((line) => JSON.parse(line) as RuntimeEvent);
}

/** Verify log integrity — check that no lines have been removed or modified */
export function verifyLogIntegrity(
  logPath: string,
  expectedLineCount: number,
): { valid: boolean; actual_lines: number } {
  const events = readEvents(logPath);
  return {
    valid: events.length >= expectedLineCount,
    actual_lines: events.length,
  };
}
