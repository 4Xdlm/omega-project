// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — ID FACTORY INJECTABLE
// Version: 1.0.0
// Date: 06 janvier 2026
// Standard: NASA-Grade L4 / DO-178C / MIL-STD
// ═══════════════════════════════════════════════════════════════════════════════
//
// @invariant INV-ADP-07: UUID via factory, pas crypto.randomUUID() direct
//
// ═══════════════════════════════════════════════════════════════════════════════

import type { IdFactory } from './types.js';
import { createHash } from 'crypto';

/**
 * IdFactory système — Production
 * Génère des UUIDs uniques via crypto
 */
export class SystemIdFactory implements IdFactory {
  newId(): string {
    // UUID v4 standard
    return crypto.randomUUID();
  }
}

/**
 * IdFactory fixe — Tests déterministes
 * Retourne toujours le même ID
 */
export class FixedIdFactory implements IdFactory {
  constructor(private readonly fixedId: string) {
    if (!fixedId || typeof fixedId !== 'string' || fixedId.trim().length === 0) {
      throw new Error('FixedIdFactory requires a non-empty string');
    }
  }

  newId(): string {
    return this.fixedId;
  }
}

/**
 * IdFactory séquentielle — Tests avec IDs prévisibles
 * Génère des IDs avec préfixe et compteur
 */
export class SequentialIdFactory implements IdFactory {
  private counter: number;

  constructor(
    private readonly prefix: string = 'id',
    startAt: number = 1
  ) {
    if (!Number.isFinite(startAt) || startAt < 0) {
      throw new Error('SequentialIdFactory requires a non-negative start');
    }
    this.counter = startAt;
  }

  newId(): string {
    const id = `${this.prefix}-${this.counter.toString().padStart(6, '0')}`;
    this.counter++;
    return id;
  }

  /** Reset pour tests */
  reset(startAt: number = 1): void {
    this.counter = startAt;
  }
}

/**
 * IdFactory déterministe basée sur hash
 * Génère un ID basé sur un seed + compteur
 * Utile pour replay déterministe
 */
export class DeterministicIdFactory implements IdFactory {
  private counter: number = 0;

  constructor(private readonly seed: string) {
    if (!seed || typeof seed !== 'string' || seed.trim().length === 0) {
      throw new Error('DeterministicIdFactory requires a non-empty seed');
    }
  }

  newId(): string {
    const input = `${this.seed}:${this.counter}`;
    this.counter++;
    return createHash('sha256').update(input).digest('hex').substring(0, 32);
  }

  /** Reset pour tests */
  reset(): void {
    this.counter = 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crée un IdFactory système (production)
 */
export function createSystemIdFactory(): IdFactory {
  return new SystemIdFactory();
}

/**
 * Crée un IdFactory fixe (tests déterministes)
 */
export function createFixedIdFactory(fixedId: string): IdFactory {
  return new FixedIdFactory(fixedId);
}

/**
 * Crée un IdFactory séquentielle (tests prévisibles)
 */
export function createSequentialIdFactory(
  prefix: string = 'id',
  startAt: number = 1
): SequentialIdFactory {
  return new SequentialIdFactory(prefix, startAt);
}

/**
 * Crée un IdFactory déterministe (replay)
 */
export function createDeterministicIdFactory(seed: string): DeterministicIdFactory {
  return new DeterministicIdFactory(seed);
}
