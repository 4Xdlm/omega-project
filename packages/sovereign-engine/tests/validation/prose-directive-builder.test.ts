/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — ProseDirectiveBuilder Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Phase VALIDATION — CalibV4: ProseDirectiveBuilder
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Tests:
 * - T01: buildProseDirective returns valid ProseDirective
 * - T02: same packet → same prose_directive_hash [determinism]
 * - T03: packet Q3 fear=0.9 → vital_stakes non-null
 * - T04: packet Q3 fear=0.3 → vital_stakes null
 * - T05: tension_level mapping: 0.90 → 'INSOUTENABLE'
 * - T06: tension_level mapping: 0.44 → 'LEGERE'
 * - T07: instruction contains keyword of dominant emotion
 * - T08: buildFinalPrompt contains Q1/Q2/Q3/Q4 sections
 * - T09: necessity_rules has exactly 6 entries
 * - T10: prose_directive_hash = SHA256(canonicalize sans hash)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { sha256, canonicalize } from '@omega/canon-kernel';
import { createTestPacket } from '../helpers/test-packet-factory.js';
import {
  buildProseDirective,
  buildFinalPrompt,
  computeTensionLevel,
} from '../../src/validation/prose-directive-builder.js';
import type { ForgePacket } from '../../src/types.js';

// Helper: create a packet variant with custom Q3 target_14d
function createPacketWithQ3(overrides: Record<string, number>): ForgePacket {
  const base = createTestPacket();
  const baseQ3 = base.emotion_contract.curve_quartiles[2];
  const target14d: Record<string, number> = {
    joy: 0, trust: 0, fear: 0, surprise: 0, sadness: 0, disgust: 0,
    anger: 0, anticipation: 0, love: 0, submission: 0, awe: 0,
    disapproval: 0, remorse: 0, contempt: 0,
    ...overrides,
  };
  // Normalize to sum ~1.0
  const sum = Object.values(target14d).reduce((a, b) => a + b, 0);
  if (sum > 0) {
    for (const k of Object.keys(target14d)) {
      target14d[k] /= sum;
    }
  }
  // Apply overrides back (not normalized — keep exact values for test assertions)
  for (const [k, v] of Object.entries(overrides)) {
    target14d[k] = v;
  }

  const newQ3 = { ...baseQ3, target_14d: target14d, dominant: Object.entries(overrides).sort((a, b) => b[1] - a[1])[0][0] };
  const newQuartiles = [
    base.emotion_contract.curve_quartiles[0],
    base.emotion_contract.curve_quartiles[1],
    newQ3,
    base.emotion_contract.curve_quartiles[3],
  ] as unknown as readonly [typeof newQ3, typeof newQ3, typeof newQ3, typeof newQ3];

  return {
    ...base,
    emotion_contract: {
      ...base.emotion_contract,
      curve_quartiles: newQuartiles,
    },
  } as ForgePacket;
}

describe('ProseDirectiveBuilder — CalibV4', () => {
  const packet = createTestPacket();

  // T01: buildProseDirective returns valid ProseDirective
  it('T01: buildProseDirective returns valid ProseDirective', () => {
    const directive = buildProseDirective(packet);
    expect(directive.scene_context).toBeTruthy();
    expect(directive.structure).toHaveLength(4);
    expect(directive.structure[0].quartile).toBe('Q1');
    expect(directive.structure[1].quartile).toBe('Q2');
    expect(directive.structure[2].quartile).toBe('Q3');
    expect(directive.structure[3].quartile).toBe('Q4');
    expect(directive.necessity_rules.length).toBeGreaterThan(0);
    expect(directive.dominant_emotion).toBeTruthy();
    expect(directive.prose_directive_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  // T02: same packet → same prose_directive_hash [determinism]
  it('T02: same packet → same prose_directive_hash [determinism]', () => {
    const d1 = buildProseDirective(packet);
    const d2 = buildProseDirective(packet);
    expect(d1.prose_directive_hash).toBe(d2.prose_directive_hash);
  });

  // T03: packet Q3 fear=0.9 → vital_stakes non-null
  it('T03: Q3 fear=0.9 → vital_stakes non-null', () => {
    const highFearPacket = createPacketWithQ3({ fear: 0.9, sadness: 0.1 });
    const directive = buildProseDirective(highFearPacket);
    expect(directive.vital_stakes).not.toBeNull();
    expect(directive.vital_stakes).toContain('ENJEU VITAL');
  });

  // T04: packet Q3 fear=0.3 → vital_stakes null
  it('T04: Q3 fear=0.3 anticipation=0.2 → vital_stakes null', () => {
    const lowFearPacket = createPacketWithQ3({ fear: 0.3, sadness: 0.4, anticipation: 0.2, remorse: 0.1 });
    const directive = buildProseDirective(lowFearPacket);
    expect(directive.vital_stakes).toBeNull();
  });

  // T05: tension_level mapping: 0.90 → 'INSOUTENABLE'
  it('T05: tension_level 0.90 → INSOUTENABLE', () => {
    expect(computeTensionLevel(0.90)).toBe('INSOUTENABLE');
  });

  // T06: tension_level mapping: 0.44 → 'LEGERE'
  it('T06: tension_level 0.44 → LEGERE', () => {
    expect(computeTensionLevel(0.44)).toBe('LEGERE');
  });

  // T07: instruction contains structural constraint for fear (V6 mechanical template)
  it('T07: instruction contains structural constraint for dominant fear', () => {
    // Default test packet has Q1 dominant=fear with fear=0.7
    const directive = buildProseDirective(packet);
    const q1 = directive.structure[0];
    expect(q1.dominant_emotion).toBe('fear');
    // V6: fear >= 0.7 triggers CONTRAINTE STRUCTURELLE OBLIGATOIRE with [1][2][3]
    expect(q1.instruction).toContain('CONTRAINTE STRUCTURELLE OBLIGATOIRE');
    expect(q1.instruction).toContain('[1]');
    expect(q1.instruction).toContain('[2]');
    expect(q1.instruction).toContain('[3]');
  });

  // T08: buildFinalPrompt contains Q1/Q2/Q3/Q4 sections
  it('T08: buildFinalPrompt contains Q1/Q2/Q3/Q4 sections', () => {
    const directive = buildProseDirective(packet);
    const prompt = buildFinalPrompt(directive);
    expect(prompt).toContain('Q1');
    expect(prompt).toContain('Q2');
    expect(prompt).toContain('Q3');
    expect(prompt).toContain('Q4');
    expect(prompt).toContain('CONTRAT NARRATIF');
    expect(prompt).toContain('INSTRUCTION FINALE');
  });

  // T09: necessity_rules has exactly 6 entries
  it('T09: necessity_rules has exactly 6 entries', () => {
    const directive = buildProseDirective(packet);
    expect(directive.necessity_rules).toHaveLength(6);
  });

  // T10: prose_directive_hash = SHA256(canonicalize sans hash)
  it('T10: prose_directive_hash = SHA256(canonicalize sans hash)', () => {
    const directive = buildProseDirective(packet);
    // Reconstruct without hash
    const { prose_directive_hash, ...withoutHash } = directive;
    const expectedHash = sha256(canonicalize(withoutHash));
    expect(directive.prose_directive_hash).toBe(expectedHash);
  });

  // T11: packet with signature_words → prompt contains those words in EMPREINTE section
  it('T11: signature_words present → prompt contains EMPREINTE STYLISTIQUE + words', () => {
    // Default test packet has signature_words: ['ombre', 'cendre', 'fer', 'pierre', 'flamme']
    const directive = buildProseDirective(packet);
    expect(directive.signature_injection).not.toBeNull();
    expect(directive.signature_injection).toContain('ombre');
    expect(directive.signature_injection).toContain('cendre');
    const prompt = buildFinalPrompt(directive);
    expect(prompt).toContain('EMPREINTE STYLISTIQUE');
    expect(prompt).toContain('ombre');
  });

  // T12: packet with empty signature_words → no EMPREINTE section in prompt
  it('T12: empty signature_words → no EMPREINTE section in prompt', () => {
    const emptySignaturePacket = {
      ...packet,
      style_genome: {
        ...packet.style_genome,
        lexicon: {
          ...packet.style_genome.lexicon,
          signature_words: [] as readonly string[],
        },
      },
    } as ForgePacket;
    const directive = buildProseDirective(emptySignaturePacket);
    expect(directive.signature_injection).toBeNull();
    const prompt = buildFinalPrompt(directive);
    expect(prompt).not.toContain('EMPREINTE STYLISTIQUE');
  });
});
