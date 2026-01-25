import { describe, it, expect } from 'vitest';
import {
  createDeterministicId,
  verifyIdDeterminism,
  parseId,
  createIdBatch,
} from '../src/id/factory';
import { isEntityId, isOpId, isTxId, isSchemaId } from '../src/types/identifiers';

describe('IdFactory Determinism', () => {
  it('should produce same ID for same inputs (100 iterations)', () => {
    const result = verifyIdDeterminism('ent', 'seed123', 'test', { name: 'Alice' }, 100);
    expect(result).toBe(true);
  });

  it('should produce different IDs for different payloads', () => {
    const id1 = createDeterministicId('ent', 'seed', 'ns', { x: 1 });
    const id2 = createDeterministicId('ent', 'seed', 'ns', { x: 2 });
    expect(id1).not.toBe(id2);
  });

  it('should produce different IDs for different namespaces', () => {
    const id1 = createDeterministicId('ent', 'seed', 'ns1', { x: 1 });
    const id2 = createDeterministicId('ent', 'seed', 'ns2', { x: 1 });
    expect(id1).not.toBe(id2);
  });

  it('should produce different IDs for different seeds', () => {
    const id1 = createDeterministicId('ent', 'seed1', 'ns', { x: 1 });
    const id2 = createDeterministicId('ent', 'seed2', 'ns', { x: 1 });
    expect(id1).not.toBe(id2);
  });

  it('should use full SHA-256 (64 chars after prefix)', () => {
    const id = createDeterministicId('ent', 'seed', 'ns', { x: 1 });
    const hashPart = id.slice(4); // Remove 'ent_'
    expect(hashPart).toHaveLength(64);
    expect(hashPart).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should produce valid EntityId', () => {
    const id = createDeterministicId('ent', 'seed', 'ns', { x: 1 });
    expect(isEntityId(id)).toBe(true);
  });

  it('should produce valid OpId', () => {
    const id = createDeterministicId('op', 'seed', 'ns', { x: 1 });
    expect(isOpId(id)).toBe(true);
  });

  it('should produce valid TxId', () => {
    const id = createDeterministicId('tx', 'seed', 'ns', { x: 1 });
    expect(isTxId(id)).toBe(true);
  });

  it('should produce valid SchemaId', () => {
    const id = createDeterministicId('sch', 'seed', 'ns', { x: 1 });
    expect(isSchemaId(id)).toBe(true);
  });

  it('should handle complex nested payloads deterministically', () => {
    const payload = {
      nested: {
        deep: {
          value: [1, 2, 3],
          name: 'test',
        },
      },
      array: [{ a: 1 }, { b: 2 }],
    };
    const result = verifyIdDeterminism('ent', 'seed', 'ns', payload, 100);
    expect(result).toBe(true);
  });

  it('should produce same ID regardless of object key order', () => {
    const payload1 = { b: 2, a: 1 };
    const payload2 = { a: 1, b: 2 };
    const id1 = createDeterministicId('ent', 'seed', 'ns', payload1);
    const id2 = createDeterministicId('ent', 'seed', 'ns', payload2);
    expect(id1).toBe(id2);
  });
});

describe('parseId', () => {
  it('should parse valid entity ID', () => {
    const id = createDeterministicId('ent', 'seed', 'ns', { x: 1 });
    const parsed = parseId(id);
    expect(parsed).not.toBeNull();
    expect(parsed?.prefix).toBe('ent');
    expect(parsed?.hash).toHaveLength(64);
  });

  it('should return null for invalid ID', () => {
    expect(parseId('invalid')).toBeNull();
    expect(parseId('ent_tooshort')).toBeNull();
    expect(parseId('xyz_' + '0'.repeat(64))).toBeNull();
  });
});

describe('createIdBatch', () => {
  it('should create unique IDs for batch', () => {
    const ids = createIdBatch('ent', 'seed', 'ns', { base: true }, 10);
    expect(ids).toHaveLength(10);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(10);
  });

  it('should be deterministic', () => {
    const ids1 = createIdBatch('ent', 'seed', 'ns', { base: true }, 5);
    const ids2 = createIdBatch('ent', 'seed', 'ns', { base: true }, 5);
    expect(ids1).toEqual(ids2);
  });
});
