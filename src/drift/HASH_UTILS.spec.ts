/**
 * HASH UTILITIES SPECIFICATIONS
 * Phase E-SPEC — Hash computation contracts (no implementation)
 *
 * INV-DRIFT-003: Detection MUST be deterministic
 */

// ─────────────────────────────────────────────────────────────
// HASH COMPUTATION INTERFACE
// ─────────────────────────────────────────────────────────────

export interface IHashUtils {
  /**
   * Compute SHA256 hash of file content
   * Returns uppercase hex string (64 chars)
   * INV-DRIFT-003: Deterministic - same content = same hash
   */
  computeFileHash(filePath: string): Promise<string>;

  /**
   * Compute SHA256 hash of string content
   * Returns uppercase hex string (64 chars)
   */
  computeStringHash(content: string): string;

  /**
   * Compute SHA256 hash of object (sorted keys for determinism)
   * Returns uppercase hex string (64 chars)
   */
  computeObjectHash(obj: Record<string, unknown>): string;

  /**
   * Compare two hashes (case-insensitive)
   */
  compareHashes(hash1: string, hash2: string): boolean;

  /**
   * Validate hash format (64 hex characters)
   */
  isValidHash(hash: string): boolean;
}

// ─────────────────────────────────────────────────────────────
// HASH CHAIN INTERFACE
// ─────────────────────────────────────────────────────────────

export interface IHashChain {
  /**
   * Get the hash of the previous event in chain
   * First event has null prev_hash
   */
  getPrevHash(events: Array<{ log_chain_prev_hash: string | null }>, index: number): string | null;

  /**
   * Verify chain integrity from start to end
   * Returns index of first break, or -1 if valid
   */
  verifyChain(
    events: Array<{ log_chain_prev_hash: string | null }>,
    computeHash: (event: Record<string, unknown>) => string
  ): number;
}

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

export const HASH_LENGTH = 64;
export const HASH_ALGORITHM = 'sha256';
export const HASH_ENCODING = 'hex';
