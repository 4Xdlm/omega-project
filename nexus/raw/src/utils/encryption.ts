/**
 * Encryption Utilities
 * Standard: NASA-Grade L4
 *
 * Uses AES-256-GCM for authenticated encryption
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes as cryptoRandomBytes,
} from 'node:crypto';
import type {
  EncryptedData,
  EncryptionKey,
  Keyring,
  RNG,
} from '../types.js';
import {
  RawCryptoEncryptError,
  RawCryptoDecryptError,
  RawCryptoKeyNotFoundError,
} from '../errors.js';

// ============================================================
// Constants
// ============================================================

const ALGORITHM = 'aes-256-gcm' as const;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

// ============================================================
// System RNG (for production)
// ============================================================

export const systemRNG: RNG = {
  randomBytes: (length: number) => cryptoRandomBytes(length),
  randomId: () => cryptoRandomBytes(16).toString('hex'),
};

// ============================================================
// Seeded RNG (for testing/determinism)
// ============================================================

export function seededRNG(seed: number): RNG {
  let state = seed;

  function nextByte(): number {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state & 0xff;
  }

  return {
    randomBytes: (length: number) => {
      const bytes = Buffer.alloc(length);
      for (let i = 0; i < length; i++) {
        bytes[i] = nextByte();
      }
      return bytes;
    },
    randomId: () => {
      const bytes = Buffer.alloc(16);
      for (let i = 0; i < 16; i++) {
        bytes[i] = nextByte();
      }
      return bytes.toString('hex');
    },
  };
}

// ============================================================
// Encryption
// ============================================================

/**
 * Encrypts data using AES-256-GCM.
 */
export function encrypt(
  data: Buffer,
  key: EncryptionKey,
  rng: RNG = systemRNG
): EncryptedData {
  try {
    if (key.key.length !== KEY_LENGTH) {
      throw new Error(`Key must be ${KEY_LENGTH} bytes`);
    }

    const iv = rng.randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key.key, iv, {
      authTagLength: TAG_LENGTH,
    });

    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const tag = cipher.getAuthTag();

    return Object.freeze({
      keyId: key.id,
      iv: iv.toString('base64'),
      data: encrypted.toString('base64'),
      tag: tag.toString('base64'),
      algorithm: ALGORITHM,
    });
  } catch (error) {
    throw new RawCryptoEncryptError('Encryption failed', {
      keyId: key.id,
      dataSize: data.length,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Decrypts AES-256-GCM encrypted data.
 */
export function decrypt(
  encrypted: EncryptedData,
  keyring: Keyring
): Buffer {
  const key = keyring.getKey(encrypted.keyId);
  if (!key) {
    throw new RawCryptoKeyNotFoundError(
      `Encryption key not found: ${encrypted.keyId}`,
      { keyId: encrypted.keyId }
    );
  }

  try {
    const iv = Buffer.from(encrypted.iv, 'base64');
    const data = Buffer.from(encrypted.data, 'base64');
    const tag = Buffer.from(encrypted.tag, 'base64');

    const decipher = createDecipheriv(ALGORITHM, key.key, iv, {
      authTagLength: TAG_LENGTH,
    });
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(data), decipher.final()]);
  } catch (error) {
    throw new RawCryptoDecryptError('Decryption failed', {
      keyId: encrypted.keyId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Serializes encrypted data to a string.
 */
export function serializeEncrypted(encrypted: EncryptedData): string {
  return JSON.stringify(encrypted);
}

/**
 * Deserializes encrypted data from a string.
 */
export function deserializeEncrypted(serialized: string): EncryptedData {
  const parsed = JSON.parse(serialized);

  // Validate structure
  if (
    typeof parsed.keyId !== 'string' ||
    typeof parsed.iv !== 'string' ||
    typeof parsed.data !== 'string' ||
    typeof parsed.tag !== 'string' ||
    parsed.algorithm !== ALGORITHM
  ) {
    throw new RawCryptoDecryptError('Invalid encrypted data format', {});
  }

  return Object.freeze(parsed as EncryptedData);
}
