/**
 * @fileoverview Seeded Pseudo-Random Number Generator for deterministic randomness.
 * NEVER use Math.random() directly in production - use PRNG with explicit seed.
 * @module @omega/orchestrator-core/util/prng
 */

/**
 * PRNG interface for injectable random source.
 * Enables deterministic execution by controlling randomness.
 */
export interface PRNG {
  /**
   * Returns next random value in [0, 1).
   * @returns Random float [0, 1)
   */
  next(): number;

  /**
   * Generates a random ID string.
   * @param prefix - Optional prefix for the ID
   * @returns Random ID string
   */
  nextId(prefix?: string): string;

  /**
   * Resets generator to initial seed state.
   */
  reset(): void;
}

/**
 * Default seed constant (used when no seed provided).
 * NEVER use Date.now() or similar - this ensures reproducibility.
 */
export const DEFAULT_PRNG_SEED = 42;

/**
 * Seeded PRNG implementation using Linear Congruential Generator (LCG).
 * Produces deterministic sequence given the same seed.
 *
 * LCG formula: xₙ₊₁ = (a·xₙ + c) mod m
 * Using parameters from Numerical Recipes (good statistical properties).
 */
export class SeededPRNG implements PRNG {
  private readonly initialSeed: number;
  private state: number;

  // LCG parameters (Numerical Recipes)
  private static readonly A = 1664525;
  private static readonly C = 1013904223;
  private static readonly M = 2 ** 32;

  /**
   * Creates a seeded PRNG.
   * @param seed - Seed value (default: DEFAULT_PRNG_SEED)
   */
  constructor(seed: number = DEFAULT_PRNG_SEED) {
    this.initialSeed = seed;
    this.state = seed;
  }

  /**
   * Returns next random value in [0, 1).
   * @returns Random float in [0, 1)
   */
  next(): number {
    this.state = (SeededPRNG.A * this.state + SeededPRNG.C) % SeededPRNG.M;
    return this.state / SeededPRNG.M;
  }

  /**
   * Generates a random integer in [0, max).
   * @param max - Exclusive upper bound
   * @returns Random integer in [0, max)
   */
  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }

  /**
   * Generates a random ID string.
   * @param prefix - Optional prefix (default: 'id')
   * @returns Random ID like "prefix_abc123xy"
   */
  nextId(prefix: string = 'id'): string {
    const rand = Math.floor(this.next() * 1e9).toString(36);
    return `${prefix}_${rand}`;
  }

  /**
   * Resets generator to initial seed state.
   * After reset, sequence will be identical to original.
   */
  reset(): void {
    this.state = this.initialSeed;
  }

  /**
   * Gets the current seed value.
   * @returns Current seed
   */
  getSeed(): number {
    return this.initialSeed;
  }
}

/**
 * Creates a seeded PRNG instance.
 * @param seed - Seed value (default: DEFAULT_PRNG_SEED)
 * @returns SeededPRNG instance
 */
export function createPRNG(seed: number = DEFAULT_PRNG_SEED): PRNG {
  return new SeededPRNG(seed);
}

/**
 * Creates a PRNG from environment variable or default.
 * Reads OMEGA_SEED from process.env, falls back to DEFAULT_PRNG_SEED.
 * @returns SeededPRNG instance
 */
export function createPRNGFromEnv(): PRNG {
  const envSeed = process.env.OMEGA_SEED;
  const seed = envSeed ? parseInt(envSeed, 10) : DEFAULT_PRNG_SEED;
  return new SeededPRNG(isNaN(seed) ? DEFAULT_PRNG_SEED : seed);
}
