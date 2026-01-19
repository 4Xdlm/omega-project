/**
 * Keyring - Key Management
 * Standard: NASA-Grade L4
 *
 * Manages encryption keys for the storage system
 */

import type { Keyring, EncryptionKey, Clock, RNG } from '../types.js';
import { systemRNG } from './encryption.js';

// ============================================================
// Key Constants
// ============================================================

const KEY_LENGTH = 32; // 256 bits
const ALGORITHM = 'aes-256-gcm' as const;

// ============================================================
// Simple Keyring Implementation
// ============================================================

export class SimpleKeyring implements Keyring {
  private readonly keys: Map<string, EncryptionKey> = new Map();
  private currentKeyId: string | null = null;
  private readonly clock: Clock;
  private readonly rng: RNG;

  constructor(clock: Clock, rng: RNG = systemRNG) {
    this.clock = clock;
    this.rng = rng;
  }

  /**
   * Creates and registers a new key, making it the current key.
   */
  rotateKey(): EncryptionKey {
    const key: EncryptionKey = Object.freeze({
      id: this.rng.randomId(),
      key: this.rng.randomBytes(KEY_LENGTH),
      createdAt: this.clock.now(),
      algorithm: ALGORITHM,
    });

    this.keys.set(key.id, key);
    this.currentKeyId = key.id;

    return key;
  }

  /**
   * Gets the current active key.
   * Creates one if none exists.
   */
  getCurrentKey(): EncryptionKey {
    if (!this.currentKeyId) {
      return this.rotateKey();
    }

    const key = this.keys.get(this.currentKeyId);
    if (!key) {
      return this.rotateKey();
    }

    return key;
  }

  /**
   * Gets a key by ID.
   */
  getKey(keyId: string): EncryptionKey | undefined {
    return this.keys.get(keyId);
  }

  /**
   * Gets all key IDs (sorted for determinism).
   */
  getAllKeyIds(): readonly string[] {
    return Object.freeze([...this.keys.keys()].sort());
  }

  /**
   * Imports an existing key.
   */
  importKey(key: EncryptionKey): void {
    this.keys.set(key.id, key);
  }

  /**
   * Sets the current key by ID.
   */
  setCurrentKey(keyId: string): boolean {
    if (!this.keys.has(keyId)) {
      return false;
    }
    this.currentKeyId = keyId;
    return true;
  }

  /**
   * Removes a key by ID.
   * Cannot remove the current key.
   */
  removeKey(keyId: string): boolean {
    if (keyId === this.currentKeyId) {
      return false;
    }
    return this.keys.delete(keyId);
  }

  /**
   * Gets the number of keys.
   */
  size(): number {
    return this.keys.size;
  }

  /**
   * Clears all keys.
   * @internal TEST ONLY
   */
  __clearForTests(): void {
    this.keys.clear();
    this.currentKeyId = null;
  }
}

// ============================================================
// Factory
// ============================================================

/**
 * Creates a new keyring instance.
 */
export function createKeyring(clock: Clock, rng?: RNG): SimpleKeyring {
  return new SimpleKeyring(clock, rng);
}
