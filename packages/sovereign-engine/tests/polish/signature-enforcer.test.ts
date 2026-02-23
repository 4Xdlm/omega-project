/**
 * Tests for Signature Enforcer (offline deterministic)
 * Sprint S2 — TDD
 */

import { describe, it, expect } from 'vitest';
import { enforceSignatureOffline } from '../../src/polish/signature-enforcement.js';
import type { SignatureEnforcementResult } from '../../src/polish/signature-enforcement.js';
import { createTestPacket } from '../helpers/test-packet-factory.js';
import { PROSE_GOOD, PROSE_FLAT } from '../fixtures/mock-prose.js';

const packet = createTestPacket();

describe('Signature Enforcer (offline)', () => {
  it('T01: enforceSignatureOffline ajoute/renforce marqueurs genome', () => {
    const result = enforceSignatureOffline(PROSE_FLAT, packet);

    expect(result.enforced_prose).toBeTruthy();
    expect(result.enforced_prose.length).toBeGreaterThan(0);
  });

  it('T02: genome markers présents dans output [INV-S-GENOME-01]', () => {
    const result = enforceSignatureOffline(PROSE_FLAT, packet);

    // At least 1 signature word should be present after enforcement
    const signatureWords = packet.style_genome.lexicon.signature_words;
    const hasMarker = signatureWords.some((w) =>
      result.enforced_prose.toLowerCase().includes(w.toLowerCase()),
    );
    expect(hasMarker).toBe(true);
  });

  it('T03: déterminisme', () => {
    const r1 = enforceSignatureOffline(PROSE_FLAT, packet);
    const r2 = enforceSignatureOffline(PROSE_FLAT, packet);

    expect(r1.enforced_prose).toBe(r2.enforced_prose);
    expect(r1.enforced).toBe(r2.enforced);
  });
});
