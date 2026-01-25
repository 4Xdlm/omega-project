/**
 * OMEGA Canon Kernel — Identifiers
 * All IDs are deterministic and use full SHA-256 (no truncation)
 */

// RootHash: hex string, exactly 64 characters (no 0x prefix)
export type RootHash = string;
export const ROOTHASH_REGEX = /^[0-9a-fA-F]{64}$/;

export function isValidRootHash(hash: string): hash is RootHash {
  return ROOTHASH_REGEX.test(hash);
}

export function assertRootHash(value: string): asserts value is RootHash {
  if (!ROOTHASH_REGEX.test(value)) {
    const preview = value.length > 20 ? value.substring(0, 20) + '...' : value;
    throw new Error(`Invalid RootHash: expected 64 hex chars, got "${preview}"`);
  }
}

// Prefixed identifiers (full SHA-256 hash after prefix)
export type EntityId = `ent_${string}`;
export type SchemaId = `sch_${string}`;
export type OpId = `op_${string}`;
export type TxId = `tx_${string}`;

// Type guards
export function isEntityId(id: string): id is EntityId {
  if (!id.startsWith('ent_')) return false;
  return isValidRootHash(id.slice(4));
}

export function isSchemaId(id: string): id is SchemaId {
  if (!id.startsWith('sch_')) return false;
  return isValidRootHash(id.slice(4));
}

export function isOpId(id: string): id is OpId {
  if (!id.startsWith('op_')) return false;
  return isValidRootHash(id.slice(3));
}

export function isTxId(id: string): id is TxId {
  if (!id.startsWith('tx_')) return false;
  return isValidRootHash(id.slice(3));
}

// Assertion helpers
export function assertEntityId(id: string): asserts id is EntityId {
  if (!isEntityId(id)) {
    throw new Error(`Invalid EntityId: ${id}`);
  }
}

export function assertSchemaId(id: string): asserts id is SchemaId {
  if (!isSchemaId(id)) {
    throw new Error(`Invalid SchemaId: ${id}`);
  }
}

export function assertOpId(id: string): asserts id is OpId {
  if (!isOpId(id)) {
    throw new Error(`Invalid OpId: ${id}`);
  }
}

export function assertTxId(id: string): asserts id is TxId {
  if (!isTxId(id)) {
    throw new Error(`Invalid TxId: ${id}`);
  }
}
