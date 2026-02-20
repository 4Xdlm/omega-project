/**
 * OMEGA Canon ID Factory v1.0
 * Phase E - NASA-Grade L4 / DO-178C
 *
 * INVARIANTS:
 * - INV-E-ID-01: IDs branded + opaques
 * - INV-E-ID-DET-01: Même (clock, rng, seed) = même ID
 * - INV-E-ID-VALID-01: Validation regex stricte via ConfigSymbol
 *
 * RÈGLE INT-E-06: 0 Math.random/Date.now
 * SPEC: CANON_SCHEMA_SPEC v1.2 §3.2
 */

import type { Clock } from '../shared/clock';
import { createTestClock } from '../shared/clock';
import type { ConfigResolver } from './config-symbol';
import {
  ID_RNG_HEX_LEN,
  ID_FORMAT_REGEX_CLM,
  ID_FORMAT_REGEX_ENT,
  ID_FORMAT_REGEX_EVD,
  createTestConfigResolver,
} from './config-symbol';
import type { ClaimId, EntityId, EvidenceId, MonoNs } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// DETERMINISTIC RNG (INV-E-ID-DET-01)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Interface for deterministic random number generation.
 */
export interface DeterministicRng {
  /**
   * Generate a deterministic random number in [0, 1).
   */
  next(): number;

  /**
   * Generate a deterministic hex string of given length.
   */
  nextHex(length: number): string;
}

/**
 * Linear Congruential Generator (LCG) implementation.
 * Same parameters as Java's java.util.Random for reproducibility.
 *
 * INV-E-ID-DET-01: Same seed → same sequence
 */
export class SeededRng implements DeterministicRng {
  private state: number;

  constructor(seed: number) {
    // Ensure seed is a valid 32-bit integer
    this.state = seed >>> 0;
  }

  /**
   * LCG next value.
   * Parameters: a=1103515245, c=12345, m=2^31
   */
  next(): number {
    this.state = ((this.state * 1103515245 + 12345) & 0x7fffffff) >>> 0;
    return this.state / 0x7fffffff;
  }

  /**
   * Generate hex string of specified length.
   */
  nextHex(length: number): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      const nibble = Math.floor(this.next() * 16);
      result += nibble.toString(16);
    }
    return result;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ID FACTORY INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Factory interface for creating and validating IDs.
 */
export interface IdFactory {
  /**
   * Create a new ClaimId.
   * Format: CLM-{mono_ns_hex}-{random_hex}
   */
  createClaimId(): ClaimId;

  /**
   * Create a new EntityId.
   * Format: ENT-{mono_ns_hex}-{random_hex}
   */
  createEntityId(): EntityId;

  /**
   * Create a new EvidenceId.
   * Format: EVD-{mono_ns_hex}-{random_hex}
   */
  createEvidenceId(): EvidenceId;

  /**
   * Get the current monotonic timestamp.
   */
  getCurrentMonoNs(): MonoNs;

  /**
   * Validate a ClaimId against the configured regex.
   */
  validateClaimId(id: string): id is ClaimId;

  /**
   * Validate an EntityId against the configured regex.
   */
  validateEntityId(id: string): id is EntityId;

  /**
   * Validate an EvidenceId against the configured regex.
   */
  validateEvidenceId(id: string): id is EvidenceId;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETERMINISTIC ID FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Deterministic ID factory using injected Clock and RNG.
 *
 * INV-E-ID-DET-01: Same (clock, rng, seed) = same ID
 * INV-E-ID-VALID-01: Validation via ConfigSymbol regex
 */
export class DeterministicIdFactory implements IdFactory {
  private readonly clock: Clock;
  private readonly rng: DeterministicRng;
  private readonly hexLen: number;
  private readonly clmRegex: RegExp;
  private readonly entRegex: RegExp;
  private readonly evdRegex: RegExp;

  constructor(clock: Clock, rng: DeterministicRng, config: ConfigResolver) {
    this.clock = clock;
    this.rng = rng;

    // Resolve from ConfigSymbol (INV-E-CONFIG-01)
    this.hexLen = config.resolveNumber(ID_RNG_HEX_LEN);
    this.clmRegex = new RegExp(config.resolveString(ID_FORMAT_REGEX_CLM));
    this.entRegex = new RegExp(config.resolveString(ID_FORMAT_REGEX_ENT));
    this.evdRegex = new RegExp(config.resolveString(ID_FORMAT_REGEX_EVD));
  }

  createClaimId(): ClaimId {
    const monoNs = this.clock.nowMonoNs();
    const randomHex = this.rng.nextHex(this.hexLen);
    return `CLM-${monoNs.toString(16)}-${randomHex}` as ClaimId;
  }

  createEntityId(): EntityId {
    const monoNs = this.clock.nowMonoNs();
    const randomHex = this.rng.nextHex(this.hexLen);
    return `ENT-${monoNs.toString(16)}-${randomHex}` as EntityId;
  }

  createEvidenceId(): EvidenceId {
    const monoNs = this.clock.nowMonoNs();
    const randomHex = this.rng.nextHex(this.hexLen);
    return `EVD-${monoNs.toString(16)}-${randomHex}` as EvidenceId;
  }

  getCurrentMonoNs(): MonoNs {
    return this.clock.nowMonoNs() as MonoNs;
  }

  validateClaimId(id: string): id is ClaimId {
    return this.clmRegex.test(id);
  }

  validateEntityId(id: string): id is EntityId {
    return this.entRegex.test(id);
  }

  validateEvidenceId(id: string): id is EvidenceId {
    return this.evdRegex.test(id);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default test config values for ID factory.
 */
export const TEST_ID_CONFIG = {
  ID_RNG_HEX_LEN: 8,
  ID_FORMAT_REGEX_CLM: '^CLM-[0-9a-f]+-[0-9a-f]{8}$',
  ID_FORMAT_REGEX_ENT: '^ENT-[0-9a-f]+-[0-9a-f]{8}$',
  ID_FORMAT_REGEX_EVD: '^EVD-[0-9a-f]+-[0-9a-f]{8}$',
};

/**
 * Creates a test ID factory with deterministic clock and RNG.
 *
 * @param clockSeed - Starting value for monotonic clock (default: 1000000000000000000n)
 * @param rngSeed - Seed for RNG (default: 12345)
 */
export function createTestIdFactory(
  clockSeed: bigint = 1_000_000_000_000_000_000n,
  rngSeed: number = 12345
): IdFactory {
  const clock = createTestClock(clockSeed);
  const rng = new SeededRng(rngSeed);
  const config = createTestConfigResolver(TEST_ID_CONFIG);

  return new DeterministicIdFactory(clock, rng, config);
}

/**
 * Creates IDs for testing with explicit values.
 * Useful for creating known IDs in tests.
 */
export function createTestClaimId(monoNsHex: string, randomHex: string): ClaimId {
  return `CLM-${monoNsHex}-${randomHex}` as ClaimId;
}

export function createTestEntityId(monoNsHex: string, randomHex: string): EntityId {
  return `ENT-${monoNsHex}-${randomHex}` as EntityId;
}

export function createTestEvidenceId(monoNsHex: string, randomHex: string): EvidenceId {
  return `EVD-${monoNsHex}-${randomHex}` as EvidenceId;
}
