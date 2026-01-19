/**
 * Encryption Utilities Tests
 * Standard: NASA-Grade L4
 */

import { describe, it, expect } from 'vitest';
import {
  encrypt,
  decrypt,
  serializeEncrypted,
  deserializeEncrypted,
  seededRNG,
  systemRNG,
} from '../src/utils/encryption.js';
import { SimpleKeyring, createKeyring } from '../src/utils/keyring.js';
import { mockClock } from '../src/types.js';
import { RawCryptoDecryptError, RawCryptoKeyNotFoundError } from '../src/errors.js';

describe('Encryption Utilities', () => {
  describe('seededRNG', () => {
    it('produces deterministic output', () => {
      const rng1 = seededRNG(42);
      const rng2 = seededRNG(42);

      const bytes1 = rng1.randomBytes(16);
      const bytes2 = rng2.randomBytes(16);

      expect(bytes1.equals(bytes2)).toBe(true);
    });

    it('produces different output with different seeds', () => {
      const rng1 = seededRNG(42);
      const rng2 = seededRNG(43);

      const bytes1 = rng1.randomBytes(16);
      const bytes2 = rng2.randomBytes(16);

      expect(bytes1.equals(bytes2)).toBe(false);
    });

    it('generates deterministic IDs', () => {
      const rng1 = seededRNG(42);
      const rng2 = seededRNG(42);

      expect(rng1.randomId()).toBe(rng2.randomId());
    });
  });

  describe('encrypt/decrypt', () => {
    it('encrypts and decrypts data correctly', () => {
      const clock = mockClock(1000);
      const rng = seededRNG(42);
      const keyring = createKeyring(clock, rng);
      const key = keyring.getCurrentKey();

      const original = Buffer.from('Hello, World!');
      const encrypted = encrypt(original, key, rng);
      const decrypted = decrypt(encrypted, keyring);

      expect(decrypted.equals(original)).toBe(true);
    });

    it('produces different ciphertext each time with system RNG', () => {
      const clock = mockClock(1000);
      const keyring = createKeyring(clock, systemRNG);
      const key = keyring.getCurrentKey();

      const data = Buffer.from('Hello');
      const encrypted1 = encrypt(data, key, systemRNG);
      const encrypted2 = encrypt(data, key, systemRNG);

      // IVs should be different
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    it('produces deterministic ciphertext with seeded RNG', () => {
      const clock = mockClock(1000);
      const rng1 = seededRNG(42);
      const rng2 = seededRNG(42);

      const keyring1 = createKeyring(clock, rng1);
      const keyring2 = createKeyring(clock, rng2);

      const data = Buffer.from('Hello');

      const encrypted1 = encrypt(data, keyring1.getCurrentKey(), rng1);
      const encrypted2 = encrypt(data, keyring2.getCurrentKey(), rng2);

      expect(encrypted1.iv).toBe(encrypted2.iv);
      expect(encrypted1.data).toBe(encrypted2.data);
    });

    it('throws on wrong key', () => {
      const clock = mockClock(1000);
      const rng = seededRNG(42);
      const keyring1 = createKeyring(clock, rng);
      const keyring2 = createKeyring(clock, seededRNG(99));

      const data = Buffer.from('Hello');
      const encrypted = encrypt(data, keyring1.getCurrentKey(), rng);

      expect(() => decrypt(encrypted, keyring2)).toThrow(RawCryptoKeyNotFoundError);
    });
  });

  describe('serializeEncrypted/deserializeEncrypted', () => {
    it('round-trips encrypted data', () => {
      const clock = mockClock(1000);
      const rng = seededRNG(42);
      const keyring = createKeyring(clock, rng);
      const key = keyring.getCurrentKey();

      const data = Buffer.from('Hello');
      const encrypted = encrypt(data, key, rng);
      const serialized = serializeEncrypted(encrypted);
      const deserialized = deserializeEncrypted(serialized);

      expect(deserialized).toEqual(encrypted);
    });

    it('throws on invalid format', () => {
      expect(() => deserializeEncrypted('{}')).toThrow(RawCryptoDecryptError);
      expect(() => deserializeEncrypted('invalid')).toThrow();
    });
  });
});

describe('SimpleKeyring', () => {
  describe('rotateKey', () => {
    it('creates a new key', () => {
      const clock = mockClock(1000);
      const rng = seededRNG(42);
      const keyring = new SimpleKeyring(clock, rng);

      const key = keyring.rotateKey();

      expect(key.id).toBeDefined();
      expect(key.key.length).toBe(32);
      expect(key.createdAt).toBe(1000);
      expect(key.algorithm).toBe('aes-256-gcm');
    });

    it('creates deterministic keys with seeded RNG', () => {
      const clock = mockClock(1000);

      const keyring1 = new SimpleKeyring(clock, seededRNG(42));
      const keyring2 = new SimpleKeyring(clock, seededRNG(42));

      const key1 = keyring1.rotateKey();
      const key2 = keyring2.rotateKey();

      expect(key1.id).toBe(key2.id);
      expect(key1.key.equals(key2.key)).toBe(true);
    });
  });

  describe('getCurrentKey', () => {
    it('creates key if none exists', () => {
      const clock = mockClock(1000);
      const keyring = new SimpleKeyring(clock, seededRNG(42));

      const key = keyring.getCurrentKey();

      expect(key).toBeDefined();
      expect(keyring.size()).toBe(1);
    });

    it('returns same key on subsequent calls', () => {
      const clock = mockClock(1000);
      const keyring = new SimpleKeyring(clock, seededRNG(42));

      const key1 = keyring.getCurrentKey();
      const key2 = keyring.getCurrentKey();

      expect(key1.id).toBe(key2.id);
    });
  });

  describe('getKey', () => {
    it('retrieves key by ID', () => {
      const clock = mockClock(1000);
      const keyring = new SimpleKeyring(clock, seededRNG(42));
      const created = keyring.rotateKey();

      const retrieved = keyring.getKey(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(created.id);
    });

    it('returns undefined for unknown ID', () => {
      const clock = mockClock(1000);
      const keyring = new SimpleKeyring(clock, seededRNG(42));

      expect(keyring.getKey('unknown')).toBeUndefined();
    });
  });

  describe('getAllKeyIds', () => {
    it('returns sorted key IDs', () => {
      const clock = mockClock(1000);
      const keyring = new SimpleKeyring(clock, seededRNG(42));

      keyring.rotateKey();
      keyring.rotateKey();
      keyring.rotateKey();

      const ids = keyring.getAllKeyIds();

      expect(ids.length).toBe(3);
      expect([...ids].sort()).toEqual([...ids]);
    });
  });

  describe('setCurrentKey', () => {
    it('changes current key', () => {
      const clock = mockClock(1000);
      const keyring = new SimpleKeyring(clock, seededRNG(42));

      const key1 = keyring.rotateKey();
      const key2 = keyring.rotateKey();

      keyring.setCurrentKey(key1.id);

      expect(keyring.getCurrentKey().id).toBe(key1.id);
    });

    it('returns false for unknown key', () => {
      const clock = mockClock(1000);
      const keyring = new SimpleKeyring(clock, seededRNG(42));

      expect(keyring.setCurrentKey('unknown')).toBe(false);
    });
  });

  describe('removeKey', () => {
    it('removes non-current key', () => {
      const clock = mockClock(1000);
      const keyring = new SimpleKeyring(clock, seededRNG(42));

      const key1 = keyring.rotateKey();
      keyring.rotateKey(); // Makes this current

      const removed = keyring.removeKey(key1.id);

      expect(removed).toBe(true);
      expect(keyring.getKey(key1.id)).toBeUndefined();
    });

    it('cannot remove current key', () => {
      const clock = mockClock(1000);
      const keyring = new SimpleKeyring(clock, seededRNG(42));

      const key = keyring.getCurrentKey();

      expect(keyring.removeKey(key.id)).toBe(false);
      expect(keyring.getKey(key.id)).toBeDefined();
    });
  });
});
