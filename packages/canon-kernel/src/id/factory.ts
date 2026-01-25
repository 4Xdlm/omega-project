/**
 * OMEGA Canon Kernel — Deterministic ID Factory
 *
 * CRITICAL: IDs must be deterministic. Same input → Same ID (ALWAYS).
 * Uses full SHA-256 (no truncation in kernel).
 *
 * Formula:
 *   payloadCanonical = canonicalize(payload)
 *   payloadHash = sha256(payloadCanonical)
 *   combined = `${seed}:${namespace}:${payloadHash}`
 *   idHash = sha256(combined)
 *   return `${prefix}_${idHash}`
 */

import type { EntityId, SchemaId, OpId, TxId } from '../types/identifiers';
import { canonicalize } from '../hash/canonicalize';
import { sha256 } from '../hash/sha256';

export type IdPrefix = 'ent' | 'sch' | 'op' | 'tx';

export type IdType<P extends IdPrefix> =
  P extends 'ent' ? EntityId :
  P extends 'sch' ? SchemaId :
  P extends 'op' ? OpId :
  P extends 'tx' ? TxId :
  never;

export interface IdFactory {
  create<P extends IdPrefix>(
    prefix: P,
    seed: string,
    namespace: string,
    payload: unknown
  ): IdType<P>;
}

/**
 * Create a deterministic ID.
 * Same inputs will ALWAYS produce the same ID.
 */
export function createDeterministicId<P extends IdPrefix>(
  prefix: P,
  seed: string,
  namespace: string,
  payload: unknown
): IdType<P> {
  // Step 1: Canonicalize payload
  const payloadCanonical = canonicalize(payload);

  // Step 2: Hash payload
  const payloadHash = sha256(payloadCanonical);

  // Step 3: Combine with seed and namespace
  const combined = `${seed}:${namespace}:${payloadHash}`;

  // Step 4: Final hash
  const idHash = sha256(combined);

  // Step 5: Prefix and return
  return `${prefix}_${idHash}` as IdType<P>;
}

/**
 * Default ID factory instance.
 */
export const idFactory: IdFactory = {
  create: createDeterministicId,
};

/**
 * Verify ID determinism (for tests).
 * Runs multiple iterations and verifies same output.
 */
export function verifyIdDeterminism(
  prefix: IdPrefix,
  seed: string,
  namespace: string,
  payload: unknown,
  iterations: number = 100
): boolean {
  const firstId = createDeterministicId(prefix, seed, namespace, payload);

  for (let i = 0; i < iterations; i++) {
    const id = createDeterministicId(prefix, seed, namespace, payload);
    if (id !== firstId) {
      return false;
    }
  }

  return true;
}

/**
 * Parse an ID to extract its components (for debugging).
 */
export function parseId(id: string): { prefix: string; hash: string } | null {
  const match = id.match(/^(ent|sch|op|tx)_([0-9a-f]{64})$/);
  if (!match || !match[1] || !match[2]) {
    return null;
  }
  return {
    prefix: match[1],
    hash: match[2],
  };
}

/**
 * Create multiple IDs with sequential payload modifier.
 * Useful for batch creation.
 */
export function createIdBatch<P extends IdPrefix>(
  prefix: P,
  seed: string,
  namespace: string,
  basePayload: Record<string, unknown>,
  count: number,
  sequenceKey: string = '_seq'
): IdType<P>[] {
  const ids: IdType<P>[] = [];

  for (let i = 0; i < count; i++) {
    const payload = { ...basePayload, [sequenceKey]: i };
    ids.push(createDeterministicId(prefix, seed, namespace, payload));
  }

  return ids;
}
