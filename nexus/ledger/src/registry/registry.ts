/**
 * Source Registry
 * Standard: NASA-Grade L4
 *
 * CORRECTION #3: clear() renamed to __clearForTests() with @internal
 */

import type { SourceMetadata } from '../types.js';

const registry = new Map<string, SourceMetadata>();

export function register(metadata: SourceMetadata): void {
  if (registry.has(metadata.sourceId)) {
    throw new Error(`Source already registered: ${metadata.sourceId}`);
  }
  registry.set(metadata.sourceId, Object.freeze(metadata));
}

export function get(sourceId: string): SourceMetadata | undefined {
  return registry.get(sourceId);
}

export function has(sourceId: string): boolean {
  return registry.has(sourceId);
}

/**
 * @internal TEST ONLY
 */
export function __clearForTests(): void {
  registry.clear();
}
