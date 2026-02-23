/**
 * Tests for Musical Engine (offline deterministic)
 * Sprint S2 — TDD
 */

import { describe, it, expect } from 'vitest';
import { applyMusicalPolishOffline } from '../../src/polish/musical-engine.js';
import type { MusicalPolishResult } from '../../src/polish/musical-engine.js';
import { createTestPacket } from '../helpers/test-packet-factory.js';
import { PROSE_GOOD, PROSE_FLAT } from '../fixtures/mock-prose.js';

const packet = createTestPacket();

describe('Musical Engine (offline)', () => {
  it('T01: applyMusicalPolishOffline retourne prose modifiée', () => {
    const result = applyMusicalPolishOffline(PROSE_FLAT, packet);

    expect(result.polished_prose).toBeTruthy();
    expect(result.polished_prose.length).toBeGreaterThan(0);
  });

  it('T02: max 1 phrase modifiée par appel [INV-S-MUSICAL-01]', () => {
    const result = applyMusicalPolishOffline(PROSE_FLAT, packet);

    expect(result.corrections_applied).toBeLessThanOrEqual(1);
  });

  it('T03: correction_log contient phrase_index + raison', () => {
    const result = applyMusicalPolishOffline(PROSE_FLAT, packet);

    if (result.corrections_applied > 0) {
      expect(result.correction_log).toHaveLength(result.corrections_applied);
      for (const entry of result.correction_log) {
        expect(entry).toHaveProperty('sentence_index');
        expect(entry).toHaveProperty('reason');
      }
    }
  });

  it('T04: déterminisme', () => {
    const r1 = applyMusicalPolishOffline(PROSE_FLAT, packet);
    const r2 = applyMusicalPolishOffline(PROSE_FLAT, packet);

    expect(r1.polished_prose).toBe(r2.polished_prose);
    expect(r1.corrections_applied).toBe(r2.corrections_applied);
  });
});
