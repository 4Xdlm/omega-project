/**
 * OMEGA Clock Abstraction v1.0
 * Phase C - NASA-Grade L4
 *
 * INVARIANTS:
 * - INV-CLOCK-01: All timestamps hash/chain use nowMonoNs()
 * - INV-CLOCK-02: Never Date.now() in critical code
 *
 * DESIGN (Francky):
 * - mono_ns: bigint -> determinism + ordering
 * - wall_ms: number | 'UNKNOWN' -> human logs only (non-normative)
 */

export interface Clock {
  /** Monotonic timestamp in nanoseconds - DETERMINISTIC */
  nowMonoNs(): bigint;

  /** Wall-clock timestamp ms - NON-NORMATIVE, may be 'UNKNOWN' in tests */
  nowWallMs(): number | 'UNKNOWN';
}

/** Production: uses process.hrtime.bigint() */
export const SystemClock: Clock = {
  nowMonoNs: () => process.hrtime.bigint(),
  nowWallMs: () => Date.now(),
};

/** Tests: deterministic with seed */
export function createTestClock(seed: bigint = 1_000_000_000_000_000_000n): Clock {
  let counter = seed;
  return {
    nowMonoNs: () => counter++,
    nowWallMs: () => 'UNKNOWN',
  };
}
