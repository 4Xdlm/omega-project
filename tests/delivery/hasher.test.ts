/**
 * OMEGA Delivery Hasher Tests v1.0
 * Phase H - NASA-Grade L4 / DO-178C
 *
 * Tests for H2 SHA256 hashing and hash chain utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  hashString,
  hashBuffer,
  hashConcat,
  hashObject,
  verifyHash,
  hashesMatch,
  GENESIS_HASH,
  computeChainLink,
  createChainEntry,
  createChain,
  addToChain,
  verifyChain,
  serializeChain,
  parseChain,
  computeMerkleRoot,
} from '../../src/delivery/hasher';
import type { HashChain, HashChainEntry } from '../../src/delivery/hasher';
import type { Sha256, ISO8601 } from '../../src/delivery/types';
import { isSha256 } from '../../src/delivery/types';
import { createHash } from 'crypto';

const FIXED_TIMESTAMP = '2025-01-15T10:30:00.000Z' as ISO8601;
const FIXED_TIMESTAMP_2 = '2025-01-15T10:31:00.000Z' as ISO8601;

// Helper to compute expected hash
function expectedHash(content: string): Sha256 {
  return createHash('sha256').update(content, 'utf-8').digest('hex') as Sha256;
}

describe('Hasher — Phase H', () => {
  describe('hashString', () => {
    it('produces valid SHA256', () => {
      const hash = hashString('test content');
      expect(isSha256(hash)).toBe(true);
    });

    it('produces correct hash', () => {
      const hash = hashString('test');
      expect(hash).toBe(expectedHash('test'));
    });

    it('produces different hashes for different content', () => {
      const hash1 = hashString('content1');
      const hash2 = hashString('content2');
      expect(hash1).not.toBe(hash2);
    });

    it('is deterministic', () => {
      const hash1 = hashString('deterministic');
      const hash2 = hashString('deterministic');
      expect(hash1).toBe(hash2);
    });

    it('handles empty string', () => {
      const hash = hashString('');
      expect(isSha256(hash)).toBe(true);
    });

    it('handles UTF-8 content', () => {
      const hash = hashString('émoji 🎉 中文');
      expect(isSha256(hash)).toBe(true);
    });
  });

  describe('hashBuffer', () => {
    it('produces valid SHA256', () => {
      const buffer = Buffer.from('test', 'utf-8');
      const hash = hashBuffer(buffer);
      expect(isSha256(hash)).toBe(true);
    });

    it('matches hashString for same content', () => {
      const content = 'matching content';
      const buffer = Buffer.from(content, 'utf-8');

      expect(hashBuffer(buffer)).toBe(hashString(content));
    });

    it('handles empty buffer', () => {
      const buffer = Buffer.from('', 'utf-8');
      const hash = hashBuffer(buffer);
      expect(isSha256(hash)).toBe(true);
    });
  });

  describe('hashConcat', () => {
    it('hashes concatenated values', () => {
      const hash = hashConcat('a', 'b', 'c');
      expect(hash).toBe(hashString('abc'));
    });

    it('handles single value', () => {
      const hash = hashConcat('single');
      expect(hash).toBe(hashString('single'));
    });

    it('handles empty values', () => {
      const hash = hashConcat('', '');
      expect(hash).toBe(hashString(''));
    });

    it('order matters', () => {
      const hash1 = hashConcat('a', 'b');
      const hash2 = hashConcat('b', 'a');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('hashObject', () => {
    it('produces valid SHA256', () => {
      const hash = hashObject({ key: 'value' });
      expect(isSha256(hash)).toBe(true);
    });

    it('is deterministic regardless of key order', () => {
      const obj1 = { b: 2, a: 1 };
      const obj2 = { a: 1, b: 2 };
      expect(hashObject(obj1)).toBe(hashObject(obj2));
    });

    it('handles nested objects', () => {
      const hash = hashObject({ outer: { inner: 'value' } });
      expect(isSha256(hash)).toBe(true);
    });

    it('handles arrays', () => {
      const hash = hashObject({ arr: [1, 2, 3] });
      expect(isSha256(hash)).toBe(true);
    });
  });

  describe('verifyHash', () => {
    it('returns true for matching hash', () => {
      const content = 'verify me';
      const hash = hashString(content);
      expect(verifyHash(content, hash)).toBe(true);
    });

    it('returns false for mismatched hash', () => {
      const content = 'verify me';
      const wrongHash = 'a'.repeat(64) as Sha256;
      expect(verifyHash(content, wrongHash)).toBe(false);
    });
  });

  describe('hashesMatch', () => {
    it('returns true for identical hashes', () => {
      const hash = hashString('test');
      expect(hashesMatch(hash, hash)).toBe(true);
    });

    it('returns false for different hashes', () => {
      const hash1 = hashString('test1');
      const hash2 = hashString('test2');
      expect(hashesMatch(hash1, hash2)).toBe(false);
    });
  });

  describe('GENESIS_HASH', () => {
    it('is valid SHA256', () => {
      expect(isSha256(GENESIS_HASH)).toBe(true);
    });

    it('is deterministic', () => {
      const expected = hashString('OMEGA_GENESIS_v1.0');
      expect(GENESIS_HASH).toBe(expected);
    });
  });

  describe('computeChainLink', () => {
    it('produces valid SHA256', () => {
      const link = computeChainLink(
        GENESIS_HASH,
        hashString('content'),
        FIXED_TIMESTAMP
      );
      expect(isSha256(link)).toBe(true);
    });

    it('is deterministic', () => {
      const contentHash = hashString('content');
      const link1 = computeChainLink(GENESIS_HASH, contentHash, FIXED_TIMESTAMP);
      const link2 = computeChainLink(GENESIS_HASH, contentHash, FIXED_TIMESTAMP);
      expect(link1).toBe(link2);
    });

    it('changes with different previous hash', () => {
      const contentHash = hashString('content');
      const link1 = computeChainLink(GENESIS_HASH, contentHash, FIXED_TIMESTAMP);
      const link2 = computeChainLink(hashString('other'), contentHash, FIXED_TIMESTAMP);
      expect(link1).not.toBe(link2);
    });

    it('changes with different content hash', () => {
      const link1 = computeChainLink(GENESIS_HASH, hashString('a'), FIXED_TIMESTAMP);
      const link2 = computeChainLink(GENESIS_HASH, hashString('b'), FIXED_TIMESTAMP);
      expect(link1).not.toBe(link2);
    });

    it('changes with different timestamp', () => {
      const contentHash = hashString('content');
      const link1 = computeChainLink(GENESIS_HASH, contentHash, FIXED_TIMESTAMP);
      const link2 = computeChainLink(GENESIS_HASH, contentHash, FIXED_TIMESTAMP_2);
      expect(link1).not.toBe(link2);
    });
  });

  describe('createChainEntry', () => {
    it('creates frozen entry', () => {
      const entry = createChainEntry(
        0,
        hashString('content'),
        'TEST',
        null,
        FIXED_TIMESTAMP
      );
      expect(Object.isFrozen(entry)).toBe(true);
    });

    it('sets correct index', () => {
      const entry = createChainEntry(5, hashString('content'), 'TEST', null, FIXED_TIMESTAMP);
      expect(entry.index).toBe(5);
    });

    it('uses GENESIS_HASH for null previous', () => {
      const contentHash = hashString('content');
      const entry = createChainEntry(0, contentHash, 'TEST', null, FIXED_TIMESTAMP);

      const expectedLink = computeChainLink(GENESIS_HASH, contentHash, FIXED_TIMESTAMP);
      expect(entry.hash).toBe(expectedLink);
    });

    it('preserves previousHash reference', () => {
      const prev = hashString('previous');
      const entry = createChainEntry(1, hashString('content'), 'TEST', prev, FIXED_TIMESTAMP);
      expect(entry.previousHash).toBe(prev);
    });
  });

  describe('createChain', () => {
    it('creates empty chain', () => {
      const chain = createChain(FIXED_TIMESTAMP);
      expect(chain.entries).toHaveLength(0);
    });

    it('sets genesis hash', () => {
      const chain = createChain(FIXED_TIMESTAMP);
      expect(chain.chainHash).toBe(GENESIS_HASH);
    });

    it('sets version 1.0', () => {
      const chain = createChain(FIXED_TIMESTAMP);
      expect(chain.version).toBe('1.0');
    });

    it('sets created timestamp', () => {
      const chain = createChain(FIXED_TIMESTAMP);
      expect(chain.created).toBe(FIXED_TIMESTAMP);
    });

    it('returns frozen chain', () => {
      const chain = createChain(FIXED_TIMESTAMP);
      expect(Object.isFrozen(chain)).toBe(true);
      expect(Object.isFrozen(chain.entries)).toBe(true);
    });
  });

  describe('addToChain', () => {
    it('adds entry to empty chain', () => {
      const chain = createChain(FIXED_TIMESTAMP);
      const newChain = addToChain(chain, hashString('content'), 'TEST', FIXED_TIMESTAMP);

      expect(newChain.entries).toHaveLength(1);
    });

    it('first entry has null previousHash', () => {
      const chain = createChain(FIXED_TIMESTAMP);
      const newChain = addToChain(chain, hashString('content'), 'TEST', FIXED_TIMESTAMP);

      expect(newChain.entries[0].previousHash).toBeNull();
    });

    it('subsequent entries link to previous', () => {
      let chain = createChain(FIXED_TIMESTAMP);
      chain = addToChain(chain, hashString('first'), 'TEST', FIXED_TIMESTAMP);
      chain = addToChain(chain, hashString('second'), 'TEST', FIXED_TIMESTAMP_2);

      expect(chain.entries[1].previousHash).toBe(chain.entries[0].hash);
    });

    it('updates chainHash', () => {
      let chain = createChain(FIXED_TIMESTAMP);
      chain = addToChain(chain, hashString('content'), 'TEST', FIXED_TIMESTAMP);

      expect(chain.chainHash).toBe(chain.entries[0].hash);
      expect(chain.chainHash).not.toBe(GENESIS_HASH);
    });

    it('returns frozen chain', () => {
      const chain = createChain(FIXED_TIMESTAMP);
      const newChain = addToChain(chain, hashString('content'), 'TEST', FIXED_TIMESTAMP);

      expect(Object.isFrozen(newChain)).toBe(true);
      expect(Object.isFrozen(newChain.entries)).toBe(true);
    });

    it('does not mutate original chain', () => {
      const chain = createChain(FIXED_TIMESTAMP);
      addToChain(chain, hashString('content'), 'TEST', FIXED_TIMESTAMP);

      expect(chain.entries).toHaveLength(0);
    });
  });

  describe('verifyChain (H-INV-09)', () => {
    it('validates empty chain', () => {
      const chain = createChain(FIXED_TIMESTAMP);
      const result = verifyChain(chain);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('validates chain with entries', () => {
      let chain = createChain(FIXED_TIMESTAMP);
      chain = addToChain(chain, hashString('first'), 'TEST', FIXED_TIMESTAMP);
      chain = addToChain(chain, hashString('second'), 'TEST', FIXED_TIMESTAMP_2);

      const result = verifyChain(chain);

      expect(result.valid).toBe(true);
    });

    it('detects tampered entry hash', () => {
      let chain = createChain(FIXED_TIMESTAMP);
      chain = addToChain(chain, hashString('content'), 'TEST', FIXED_TIMESTAMP);

      // Tamper with entry
      const tamperedEntries = [
        { ...chain.entries[0], hash: 'a'.repeat(64) as Sha256 },
      ];
      const tamperedChain: HashChain = {
        ...chain,
        entries: Object.freeze(tamperedEntries),
      };

      const result = verifyChain(tamperedChain);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('hash mismatch'))).toBe(true);
    });

    it('detects broken chain link', () => {
      let chain = createChain(FIXED_TIMESTAMP);
      chain = addToChain(chain, hashString('first'), 'TEST', FIXED_TIMESTAMP);
      chain = addToChain(chain, hashString('second'), 'TEST', FIXED_TIMESTAMP_2);

      // Tamper with previousHash
      const tamperedEntries = [
        chain.entries[0],
        { ...chain.entries[1], previousHash: 'b'.repeat(64) as Sha256 },
      ];
      const tamperedChain: HashChain = {
        ...chain,
        entries: Object.freeze(tamperedEntries),
      };

      const result = verifyChain(tamperedChain);

      expect(result.valid).toBe(false);
    });

    it('detects chainHash mismatch', () => {
      let chain = createChain(FIXED_TIMESTAMP);
      chain = addToChain(chain, hashString('content'), 'TEST', FIXED_TIMESTAMP);

      const tamperedChain: HashChain = {
        ...chain,
        chainHash: 'c'.repeat(64) as Sha256,
      };

      const result = verifyChain(tamperedChain);

      expect(result.valid).toBe(false);
    });

    it('detects wrong empty chain hash', () => {
      const chain: HashChain = {
        version: '1.0',
        created: FIXED_TIMESTAMP,
        entries: Object.freeze([]),
        chainHash: 'd'.repeat(64) as Sha256,
      };

      const result = verifyChain(chain);

      expect(result.valid).toBe(false);
    });

    it('returns frozen result', () => {
      const chain = createChain(FIXED_TIMESTAMP);
      const result = verifyChain(chain);

      expect(Object.isFrozen(result)).toBe(true);
    });
  });

  describe('serializeChain', () => {
    it('serializes empty chain', () => {
      const chain = createChain(FIXED_TIMESTAMP);
      const text = serializeChain(chain);

      expect(text).toContain('# OMEGA Hash Chain v1.0');
      expect(text).toContain(`# Created: ${FIXED_TIMESTAMP}`);
      expect(text).toContain(`# Chain Hash: ${GENESIS_HASH}`);
      expect(text).toContain('# Entries: 0');
    });

    it('serializes chain with entries', () => {
      let chain = createChain(FIXED_TIMESTAMP);
      chain = addToChain(chain, hashString('content'), 'TEST', FIXED_TIMESTAMP);

      const text = serializeChain(chain);

      expect(text).toContain('[0]');
      expect(text).toContain('Hash:');
      expect(text).toContain('Previous: GENESIS');
      expect(text).toContain('Type: TEST');
    });

    it('shows previous hash for non-first entries', () => {
      let chain = createChain(FIXED_TIMESTAMP);
      chain = addToChain(chain, hashString('first'), 'TEST', FIXED_TIMESTAMP);
      chain = addToChain(chain, hashString('second'), 'TEST', FIXED_TIMESTAMP_2);

      const text = serializeChain(chain);

      expect(text).toContain(`Previous: ${chain.entries[0].hash}`);
    });
  });

  describe('parseChain', () => {
    it('parses serialized empty chain', () => {
      const chain = createChain(FIXED_TIMESTAMP);
      const text = serializeChain(chain);

      const parsed = parseChain(text);

      expect(parsed).not.toBeNull();
      expect(parsed!.version).toBe('1.0');
      expect(parsed!.created).toBe(FIXED_TIMESTAMP);
      expect(parsed!.chainHash).toBe(GENESIS_HASH);
      expect(parsed!.entries).toHaveLength(0);
    });

    it('parses serialized chain with entries', () => {
      let chain = createChain(FIXED_TIMESTAMP);
      chain = addToChain(chain, hashString('content'), 'TEST', FIXED_TIMESTAMP);

      const text = serializeChain(chain);
      const parsed = parseChain(text);

      expect(parsed).not.toBeNull();
      expect(parsed!.entries).toHaveLength(1);
      expect(parsed!.entries[0].contentType).toBe('TEST');
    });

    it('returns null for invalid format', () => {
      expect(parseChain('invalid')).toBeNull();
    });

    it('returns null for wrong version', () => {
      const text = '# OMEGA Hash Chain v2.0\n# Created: 2025-01-01\n';
      expect(parseChain(text)).toBeNull();
    });

    it('round-trips correctly', () => {
      let chain = createChain(FIXED_TIMESTAMP);
      chain = addToChain(chain, hashString('first'), 'TYPE_A', FIXED_TIMESTAMP);
      chain = addToChain(chain, hashString('second'), 'TYPE_B', FIXED_TIMESTAMP_2);

      const text = serializeChain(chain);
      const parsed = parseChain(text);

      expect(parsed).not.toBeNull();
      expect(parsed!.chainHash).toBe(chain.chainHash);
      expect(parsed!.entries.length).toBe(chain.entries.length);
    });

    it('returns frozen result', () => {
      const chain = createChain(FIXED_TIMESTAMP);
      const text = serializeChain(chain);
      const parsed = parseChain(text);

      expect(Object.isFrozen(parsed)).toBe(true);
    });
  });

  describe('computeMerkleRoot', () => {
    it('returns genesis for empty array', () => {
      const root = computeMerkleRoot([]);
      expect(root).toBe(GENESIS_HASH);
    });

    it('returns single hash for single element', () => {
      const hash = hashString('single');
      const root = computeMerkleRoot([hash]);
      expect(root).toBe(hash);
    });

    it('combines two hashes', () => {
      const hash1 = hashString('a');
      const hash2 = hashString('b');
      const root = computeMerkleRoot([hash1, hash2]);

      expect(root).toBe(hashConcat(hash1, hash2));
    });

    it('handles odd number of hashes', () => {
      const hashes = [
        hashString('a'),
        hashString('b'),
        hashString('c'),
      ];
      const root = computeMerkleRoot(hashes);

      expect(isSha256(root)).toBe(true);
    });

    it('is deterministic', () => {
      const hashes = [hashString('a'), hashString('b'), hashString('c')];
      const root1 = computeMerkleRoot(hashes);
      const root2 = computeMerkleRoot(hashes);
      expect(root1).toBe(root2);
    });

    it('changes with different order', () => {
      const hash1 = hashString('a');
      const hash2 = hashString('b');
      const root1 = computeMerkleRoot([hash1, hash2]);
      const root2 = computeMerkleRoot([hash2, hash1]);
      expect(root1).not.toBe(root2);
    });

    it('handles power-of-two array', () => {
      const hashes = [
        hashString('a'),
        hashString('b'),
        hashString('c'),
        hashString('d'),
      ];
      const root = computeMerkleRoot(hashes);
      expect(isSha256(root)).toBe(true);
    });
  });

  describe('Determinism (H-INV-05)', () => {
    it('hashString is deterministic', () => {
      const results = Array.from({ length: 10 }, () => hashString('test'));
      expect(new Set(results).size).toBe(1);
    });

    it('hash chain is deterministic', () => {
      const buildChain = () => {
        let chain = createChain(FIXED_TIMESTAMP);
        chain = addToChain(chain, hashString('a'), 'T', FIXED_TIMESTAMP);
        chain = addToChain(chain, hashString('b'), 'T', FIXED_TIMESTAMP_2);
        return chain;
      };

      const chain1 = buildChain();
      const chain2 = buildChain();

      expect(chain1.chainHash).toBe(chain2.chainHash);
    });

    it('serialization is deterministic', () => {
      let chain = createChain(FIXED_TIMESTAMP);
      chain = addToChain(chain, hashString('content'), 'TEST', FIXED_TIMESTAMP);

      const text1 = serializeChain(chain);
      const text2 = serializeChain(chain);

      expect(text1).toBe(text2);
    });
  });
});
