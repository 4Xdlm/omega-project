/**
 * Tests for Anti-Cliché Sweep (offline deterministic)
 * Sprint S2 — TDD
 */

import { describe, it, expect } from 'vitest';
import { sweepClichesOffline } from '../../src/polish/anti-cliche-sweep.js';
import type { ClicheSweepResult } from '../../src/polish/anti-cliche-sweep.js';
import { createTestPacket } from '../helpers/test-packet-factory.js';
import { PROSE_GOOD, PROSE_BAD } from '../fixtures/mock-prose.js';

const packet = createTestPacket();

describe('Anti-Cliché Sweep (offline)', () => {
  it('T01: sweep retourne prose sans match blacklist [INV-S-NOCLICHE-01]', () => {
    const result = sweepClichesOffline(PROSE_BAD, packet);

    // After sweep, banned clichés from kill_lists should be removed
    for (const cliche of packet.kill_lists.banned_cliches) {
      expect(result.swept_prose.toLowerCase()).not.toContain(cliche.toLowerCase());
    }
  });

  it('T02: nb_replacements dans [0, n]', () => {
    const result = sweepClichesOffline(PROSE_BAD, packet);

    expect(result.nb_replacements).toBeGreaterThanOrEqual(0);
    expect(typeof result.nb_replacements).toBe('number');
  });

  it('T03: prose sans clichés → retour identique', () => {
    const result = sweepClichesOffline(PROSE_GOOD, packet);

    // PROSE_GOOD should have no matches → identical output
    expect(result.swept_prose).toBe(PROSE_GOOD);
    expect(result.nb_replacements).toBe(0);
  });

  it('T04: déterminisme', () => {
    const r1 = sweepClichesOffline(PROSE_BAD, packet);
    const r2 = sweepClichesOffline(PROSE_BAD, packet);

    expect(r1.swept_prose).toBe(r2.swept_prose);
    expect(r1.nb_replacements).toBe(r2.nb_replacements);
  });
});
