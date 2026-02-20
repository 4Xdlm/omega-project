/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14.4 — MUSE PRNG
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Deterministic pseudo-random number generator.
 * Mulberry32: fast, simple, reproducible.
 * 
 * RULE: NO Math.random() ANYWHERE IN MUSE.
 * Same seed = same sequence, always.
 * 
 * INV-MUSE-04: Reproducibility
 * 
 * @version 1.0.0
 * @phase 14.4
 */

/**
 * Mulberry32 PRNG state
 */
export interface PRNGState {
  seed: number;
  calls: number;
}

/**
 * Create a new PRNG instance from seed
 */
export function createPRNG(seed: number): PRNGState {
  // Ensure seed is a 32-bit integer
  const normalizedSeed = seed >>> 0;
  return {
    seed: normalizedSeed,
    calls: 0,
  };
}

/**
 * Mulberry32 algorithm — produces 32-bit output
 * Fast, passes BigCrush, perfect for our needs
 */
function mulberry32(state: PRNGState): number {
  let t = (state.seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Get next random float [0, 1)
 */
export function nextFloat(state: PRNGState): number {
  state.calls++;
  return mulberry32(state);
}

/**
 * Get next random integer in range [min, max] (inclusive)
 */
export function nextInt(state: PRNGState, min: number, max: number): number {
  const range = max - min + 1;
  return Math.floor(nextFloat(state) * range) + min;
}

/**
 * Get next random boolean with given probability of true
 */
export function nextBool(state: PRNGState, probability: number = 0.5): boolean {
  return nextFloat(state) < probability;
}

/**
 * Shuffle array in place (Fisher-Yates) — deterministic
 */
export function shuffle<T>(state: PRNGState, array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = nextInt(state, 0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Pick N random items from array — deterministic
 */
export function pickN<T>(state: PRNGState, array: T[], n: number): T[] {
  const shuffled = shuffle(state, array);
  return shuffled.slice(0, Math.min(n, array.length));
}

/**
 * Pick one random item from array — deterministic
 */
export function pickOne<T>(state: PRNGState, array: T[]): T | undefined {
  if (array.length === 0) return undefined;
  const index = nextInt(state, 0, array.length - 1);
  return array[index];
}

/**
 * Generate gaussian-distributed random number (Box-Muller)
 * mean = 0, stddev = 1 by default
 */
export function nextGaussian(
  state: PRNGState,
  mean: number = 0,
  stddev: number = 1
): number {
  const u1 = nextFloat(state);
  const u2 = nextFloat(state);
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stddev + mean;
}

/**
 * Generate a deterministic UUID-like string from seed
 */
export function generateId(state: PRNGState): string {
  const hex = () => nextInt(state, 0, 15).toString(16);
  const segment = (len: number) => Array.from({ length: len }, hex).join('');
  return `${segment(8)}-${segment(4)}-${segment(4)}-${segment(4)}-${segment(12)}`;
}

/**
 * Clone PRNG state (for branching)
 */
export function clonePRNG(state: PRNGState): PRNGState {
  return { ...state };
}

/**
 * Reset PRNG to initial state
 */
export function resetPRNG(state: PRNGState, newSeed?: number): void {
  state.seed = (newSeed ?? state.seed) >>> 0;
  state.calls = 0;
}

/**
 * Get deterministic hash from state (for verification)
 */
export function getPRNGFingerprint(state: PRNGState): string {
  return `prng:${state.seed.toString(16)}:${state.calls}`;
}
