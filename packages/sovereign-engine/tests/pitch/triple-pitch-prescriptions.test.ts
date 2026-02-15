/**
 * Tests for triple-pitch with prescriptions — Sprint 4.3
 * Invariant: PITCH-PRESC-01 (prescriptions → surgical pitch items)
 */

import { describe, it, expect } from 'vitest';
import { generateTriplePitch } from '../../src/pitch/triple-pitch.js';
import { MOCK_PACKET } from '../fixtures/mock-packet.js';
import { generateDeltaReport } from '../../src/delta/delta-report.js';
import type { Prescription } from '../../src/prescriptions/types.js';

// Generate a real delta from mock data (use longer prose to avoid NaN/Infinity)
function makeDelta() {
  const prose = `
    La peur monte, lente et sourde. Elle s'infiltre dans chaque recoin.
    Le souffle se coupe, la gorge se noue. Le cœur tambourine.
    Puis la terreur explose, brutale et dévastatrice.
    Tout s'effondre dans un vertige noir. Les mains tremblent.
    Lentement, la tristesse prend la place. Le silence revient, lourd.
    Un poids écrase la poitrine. Plus rien ne bouge.
  `;
  return generateDeltaReport(MOCK_PACKET, prose);
}

function makePrescriptions(): Prescription[] {
  return [
    {
      prescription_id: 'PRESC-0001',
      segment_index: 2,
      severity: 'critical',
      type: 'forced_transition',
      diagnosis: '2 forced transitions detected',
      action: 'Ajouter un événement catalyseur concret.',
      expected_gain: 85,
    },
    {
      prescription_id: 'PRESC-0002',
      segment_index: 5,
      severity: 'high',
      type: 'dead_zone',
      diagnosis: 'Dead zone paragraphs 3-5',
      action: 'Introduire un stimulus émotionnel.',
      expected_gain: 75,
    },
  ];
}

describe('triple-pitch with prescriptions', () => {
  it('PITCH-PRESC-01: no prescriptions → same as before', () => {
    const delta = makeDelta();
    const [a, b, c] = generateTriplePitch(delta);
    const [a2, b2, c2] = generateTriplePitch(delta, undefined);

    expect(a.items.length).toBe(a2.items.length);
    expect(b.items.length).toBe(b2.items.length);
    expect(c.items.length).toBe(c2.items.length);
  });

  it('PITCH-PRESC-02: prescriptions inject surgical items', () => {
    const delta = makeDelta();
    const prescs = makePrescriptions();

    const [a, b, _c] = generateTriplePitch(delta, prescs);

    // forced_transition → Pitch B
    const surgicalB = b.items.filter(i => i.id.startsWith('surgical_'));
    expect(surgicalB.length).toBeGreaterThan(0);
    expect(surgicalB[0].reason).toContain('[PHYSICS]');

    // dead_zone → Pitch A
    const surgicalA = a.items.filter(i => i.id.startsWith('surgical_'));
    expect(surgicalA.length).toBeGreaterThan(0);
  });

  it('PITCH-PRESC-03: respects MAX_PITCH_ITEMS', () => {
    const delta = makeDelta();
    // Generate many prescriptions
    const many: Prescription[] = Array.from({ length: 20 }, (_, i) => ({
      prescription_id: `PRESC-${String(i + 1).padStart(4, '0')}`,
      segment_index: i,
      severity: 'medium' as const,
      type: 'dead_zone' as const,
      diagnosis: `Dead zone ${i}`,
      action: 'Stimulus.',
      expected_gain: 50,
    }));

    const [a, _b, _c] = generateTriplePitch(delta, many);
    // Should not exceed MAX_PITCH_ITEMS
    expect(a.items.length).toBeLessThanOrEqual(8); // SOVEREIGN_CONFIG.MAX_PITCH_ITEMS
  });

  it('PITCH-PRESC-04: surgical items have correct structure', () => {
    const delta = makeDelta();
    const prescs = makePrescriptions();
    const [a, b, _c] = generateTriplePitch(delta, prescs);

    const allSurgical = [...a.items, ...b.items].filter(i => i.id.startsWith('surgical_'));
    for (const item of allSurgical) {
      expect(item.id).toMatch(/^surgical_PRESC-\d{4}$/);
      expect(item.reason).toMatch(/^\[PHYSICS\]/);
      expect(item.instruction.length).toBeGreaterThan(0);
      expect(item.expected_gain.delta).toBeGreaterThan(0);
    }
  });
});
