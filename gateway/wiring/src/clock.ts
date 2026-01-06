// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — CLOCK INJECTABLE
// Version: 1.0.0
// Date: 06 janvier 2026
// Standard: NASA-Grade L4 / DO-178C / MIL-STD
// ═══════════════════════════════════════════════════════════════════════════════
//
// @invariant INV-ENV-02: timestamp DOIT venir d'un Clock injectable
//
// ═══════════════════════════════════════════════════════════════════════════════

import type { Clock } from './types.js';

/**
 * Clock système réel — Production
 * Utilise Date.now() en interne mais encapsulé pour injection
 */
export class SystemClock implements Clock {
  nowMs(): number {
    return Date.now();
  }
}

/**
 * Clock fixe — Tests déterministes
 * Retourne toujours la même valeur pour garantir le déterminisme
 */
export class FixedClock implements Clock {
  constructor(private readonly fixedMs: number) {
    if (!Number.isFinite(fixedMs) || fixedMs < 0) {
      throw new Error('FixedClock requires a positive finite number');
    }
  }

  nowMs(): number {
    return this.fixedMs;
  }
}

/**
 * Clock incrémentale — Tests séquentiels
 * Incrémente à chaque appel pour simuler le passage du temps
 */
export class IncrementalClock implements Clock {
  private current: number;

  constructor(
    startMs: number = 0,
    private readonly incrementMs: number = 1
  ) {
    if (!Number.isFinite(startMs) || startMs < 0) {
      throw new Error('IncrementalClock requires a positive finite start');
    }
    if (!Number.isFinite(incrementMs) || incrementMs <= 0) {
      throw new Error('IncrementalClock requires a positive finite increment');
    }
    this.current = startMs;
  }

  nowMs(): number {
    const value = this.current;
    this.current += this.incrementMs;
    return value;
  }

  /** Reset pour tests */
  reset(startMs: number = 0): void {
    this.current = startMs;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crée un Clock système (production)
 */
export function createSystemClock(): Clock {
  return new SystemClock();
}

/**
 * Crée un Clock fixe (tests déterministes)
 */
export function createFixedClock(fixedMs: number): Clock {
  return new FixedClock(fixedMs);
}

/**
 * Crée un Clock incrémental (tests séquentiels)
 */
export function createIncrementalClock(
  startMs: number = 0,
  incrementMs: number = 1
): IncrementalClock {
  return new IncrementalClock(startMs, incrementMs);
}
