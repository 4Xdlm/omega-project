/**
 * @fileoverview SENTINEL utility functions.
 * @module @omega/decision-engine/sentinel/utils
 */

import { hashJson } from '../util/hash.js';
import type { BuildVerdict, RuntimeEvent, RuntimeEventMetadata } from '../types/index.js';

/**
 * Generates a unique event ID.
 * @param prefix - Optional prefix
 * @param clock - Clock function
 * @returns Unique event ID
 */
export function generateEventId(prefix: string = 'evt', clock: () => number = Date.now): string {
  const timestamp = clock();
  const random = Math.floor(Math.random() * 1e9).toString(36);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Computes hash of event metadata.
 * @param event - The runtime event
 * @returns SHA-256 hash
 */
export function computeEventHash(event: Omit<RuntimeEvent, 'metadata'> & { metadata: Omit<RuntimeEventMetadata, 'hash'> }): string {
  const hashInput = {
    id: event.id,
    timestamp: event.timestamp,
    type: event.type,
    verdict: event.verdict,
    observedAt: event.metadata.observedAt,
  };
  return hashJson(hashInput);
}

/**
 * Validates a build verdict structure.
 * @param verdict - Verdict to validate
 * @returns True if valid
 */
export function isValidBuildVerdict(verdict: unknown): verdict is BuildVerdict {
  if (typeof verdict !== 'object' || verdict === null) {
    return false;
  }

  const v = verdict as Record<string, unknown>;

  return (
    typeof v['id'] === 'string' &&
    typeof v['timestamp'] === 'number' &&
    (v['source'] === 'ORACLE' || v['source'] === 'DECISION_ENGINE') &&
    (v['verdict'] === 'ACCEPT' || v['verdict'] === 'REJECT' || v['verdict'] === 'CONDITIONAL') &&
    typeof v['hash'] === 'string'
  );
}

/**
 * Validates that a verdict hash is preserved in an event.
 * INV-SENTINEL-03: Hash preservation check.
 * @param verdict - Original verdict
 * @param event - Generated event
 * @returns True if hash preserved
 */
export function isHashPreserved(verdict: BuildVerdict, event: RuntimeEvent): boolean {
  return event.verdict.hash === verdict.hash;
}

/**
 * Computes observation latency.
 * @param verdictTimestamp - Verdict timestamp
 * @param observedAt - Observation timestamp
 * @returns Latency in ms
 */
export function computeLatency(verdictTimestamp: number, observedAt: number): number {
  return Math.max(0, observedAt - verdictTimestamp);
}

/**
 * Deep freezes an object to ensure immutability.
 * @param obj - Object to freeze
 * @returns Frozen object
 */
export function deepFreeze<T extends object>(obj: T): Readonly<T> {
  Object.freeze(obj);

  for (const key of Object.keys(obj)) {
    const value = (obj as Record<string, unknown>)[key];
    if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
      deepFreeze(value as object);
    }
  }

  return obj;
}
