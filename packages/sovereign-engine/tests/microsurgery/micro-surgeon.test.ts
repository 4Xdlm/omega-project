/**
 * OMEGA — MICRO-SURGEON TESTS
 * Sprint 3C — Tests for tension_14d micro-surgery diagnostic + planning.
 *
 * INV-MICRO-01: diagnoseTension14D returns 4 quartiles sorted by similarity
 * INV-MICRO-02: planInterventions only targets quartiles below threshold
 * INV-MICRO-03: max 2 interventions per run
 * INV-MICRO-04: intervention targets the least emotional sentence
 */

import { describe, it, expect } from 'vitest';
import { diagnoseTension14D, planInterventions } from '../../src/microsurgery/micro-surgeon.js';
import { createTestPacket } from '../helpers/test-packet-factory.js';

const packet = createTestPacket();

// 4 paragraphs with distinct emotional tones
const PROSE_4PARA = [
  'La rage montait dans sa gorge. Ses poings se serrèrent.',
  'Le calme revint lentement. Elle respira profondément, les yeux fermés.',
  'Soudain tout bascula. Le verre explosa contre le mur.',
  'Le silence retomba. Plus rien ne bougeait dans la pièce froide.',
].join('\n\n');

describe('diagnoseTension14D', () => {
  it('INV-MICRO-01: returns 4 quartile diagnostics sorted by similarity', () => {
    const diags = diagnoseTension14D(packet, PROSE_4PARA);
    expect(diags).toHaveLength(4);
    // Sorted by similarity ascending (worst first)
    for (let i = 1; i < diags.length; i++) {
      expect(diags[i].similarity).toBeGreaterThanOrEqual(diags[i - 1].similarity);
    }
  });

  it('each diagnostic has required fields', () => {
    const diags = diagnoseTension14D(packet, PROSE_4PARA);
    for (const d of diags) {
      expect(d.quartile).toBeGreaterThanOrEqual(0);
      expect(d.quartile).toBeLessThanOrEqual(3);
      expect(d.similarity).toBeGreaterThanOrEqual(0);
      expect(d.similarity).toBeLessThanOrEqual(1);
      expect(d.text.length).toBeGreaterThan(0);
      expect(d.target_dominant.length).toBeGreaterThan(0);
    }
  });
});

describe('planInterventions', () => {
  it('INV-MICRO-02: only targets quartiles below threshold', () => {
    const diags = diagnoseTension14D(packet, PROSE_4PARA);
    const interventions = planInterventions(packet, PROSE_4PARA, diags);

    for (const inter of interventions) {
      expect(inter.similarity_before).toBeLessThan(0.45);
    }
  });

  it('INV-MICRO-03: max 2 interventions', () => {
    const diags = diagnoseTension14D(packet, PROSE_4PARA);
    const interventions = planInterventions(packet, PROSE_4PARA, diags);

    expect(interventions.length).toBeLessThanOrEqual(2);
  });

  it('INV-MICRO-04: intervention has valid structure', () => {
    const diags = diagnoseTension14D(packet, PROSE_4PARA);
    const interventions = planInterventions(packet, PROSE_4PARA, diags);

    for (const inter of interventions) {
      expect(inter.type).toBe('TENSION_14D');
      expect(inter.target_sentence.length).toBeGreaterThan(0);
      expect(inter.target_emotion.length).toBeGreaterThan(0);
      expect(inter.physical_anchor.length).toBeGreaterThan(0);
    }
  });

  it('returns empty array when no quartile needs intervention', () => {
    // All similarities above threshold → no intervention
    const fakeDiags = [
      { quartile: 0, similarity: 0.8, text: 'test', target_dominant: 'anger' },
      { quartile: 1, similarity: 0.7, text: 'test', target_dominant: 'fear' },
      { quartile: 2, similarity: 0.6, text: 'test', target_dominant: 'sadness' },
      { quartile: 3, similarity: 0.5, text: 'test', target_dominant: 'joy' },
    ];
    const interventions = planInterventions(packet, PROSE_4PARA, fakeDiags);
    expect(interventions).toHaveLength(0);
  });
});
