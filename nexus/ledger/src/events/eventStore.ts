/**
 * Event Store - Append-only guarantee
 * Standard: NASA-Grade L4
 *
 * CORRECTION #3: clear() renamed to __clearForTests() with @internal
 */

import type { Event } from '../types.js';

const events: Event[] = [];

export function append(event: Event): void {
  // Append-only: no modification, no deletion
  events.push(Object.freeze(event));
}

export function getAll(): readonly Event[] {
  return Object.freeze([...events]);
}

export function getCount(): number {
  return events.length;
}

/**
 * @internal TEST ONLY
 * Violates append-only intentionally for test isolation
 */
export function __clearForTests(): void {
  events.length = 0;
}
