/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PRE-WRITE VALIDATOR — Tests Sprint S0-A
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Invariants couverts:
 * - INV-S-PACKET-01: FORGE_PACKET validé et hashé avant tout appel LLM
 * - INV-S-PACKET-02: emotion_contract.curve_quartiles obligatoire (4×14D)
 * - INV-S-PACKET-03: Pre-Write Validator FAIL → 0 token dépensé
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';
import { validateForgePacket } from '../../src/input/pre-write-validator.js';
import type { ForgePacket, ValidationResult } from '../../src/types.js';
import { MINIMAL_FORGE_PACKET, UNIFORM_14D, FEAR_DOMINANT_14D } from './__fixtures__/minimal-forge-packet.js';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function withOverride(overrides: Partial<ForgePacket>): ForgePacket {
  return { ...MINIMAL_FORGE_PACKET, ...overrides } as ForgePacket;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Pre-Write Validator — INV-S-PACKET-01/02/03', () => {

  // ─── T01: Packet minimal valide → PASS ───────────────────────────────
  it('T01: minimal valid packet → valid=true, 0 FATAL errors [INV-S-PACKET-01]', () => {
    const result = validateForgePacket(MINIMAL_FORGE_PACKET);

    expect(result.valid).toBe(true);
    const fatals = result.errors.filter(e => e.severity === 'FATAL');
    expect(fatals).toHaveLength(0);
  });

  // ─── T02: packet_hash manquant → FATAL ──────────────────────────────
  it('T02: missing packet_hash → FATAL [INV-S-PACKET-01]', () => {
    const packet = withOverride({ packet_hash: '' });
    const result = validateForgePacket(packet);

    expect(result.valid).toBe(false);
    const fatal = result.errors.find(e => e.field === 'packet_hash');
    expect(fatal).toBeDefined();
    expect(fatal!.severity).toBe('FATAL');
  });

  // ─── T03: packet_hash trop court → FATAL ────────────────────────────
  it('T03: packet_hash < 64 chars → FATAL [INV-S-PACKET-01]', () => {
    const packet = withOverride({ packet_hash: 'abc123' });
    const result = validateForgePacket(packet);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'packet_hash' && e.severity === 'FATAL')).toBe(true);
  });

  // ─── T04: packet_id manquant → FATAL ────────────────────────────────
  it('T04: missing packet_id → FATAL [INV-S-PACKET-01]', () => {
    const packet = withOverride({ packet_id: '' });
    const result = validateForgePacket(packet);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'packet_id' && e.severity === 'FATAL')).toBe(true);
  });

  // ─── T05: scene_id manquant → FATAL ─────────────────────────────────
  it('T05: missing scene_id → FATAL [INV-S-PACKET-01]', () => {
    const packet = withOverride({ scene_id: '' });
    const result = validateForgePacket(packet);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'scene_id' && e.severity === 'FATAL')).toBe(true);
  });

  // ─── T06: curve_quartiles obligatoire 4 entrées [INV-S-PACKET-02] ───
  it('T06: emotion_contract with 4 quartiles → PASS [INV-S-PACKET-02]', () => {
    const result = validateForgePacket(MINIMAL_FORGE_PACKET);

    expect(result.valid).toBe(true);
    expect(MINIMAL_FORGE_PACKET.emotion_contract.curve_quartiles).toHaveLength(4);
  });

  // ─── T07: quartile Q1 invalide 14D → ERROR ──────────────────────────
  it('T07: invalid 14D distribution in Q1 → validation error [INV-S-PACKET-02]', () => {
    // 14D summing to 2.0 (invalid)
    const invalid14D: Record<string, number> = Object.fromEntries(
      Object.keys(UNIFORM_14D).map(k => [k, 2 / 14])
    );

    const packet = withOverride({
      emotion_contract: {
        ...MINIMAL_FORGE_PACKET.emotion_contract,
        curve_quartiles: [
          { ...MINIMAL_FORGE_PACKET.emotion_contract.curve_quartiles[0], target_14d: invalid14D },
          ...MINIMAL_FORGE_PACKET.emotion_contract.curve_quartiles.slice(1),
        ],
      },
    } as unknown as Partial<ForgePacket>);

    const result = validateForgePacket(packet);
    // Invalid 14D should produce an error (may not be FATAL but must be reported)
    expect(result.errors.some(e => e.field.includes('curve_quartiles[0]') || e.field.includes('target_14d'))).toBe(true);
  });

  // ─── T08: beats vides → FATAL (INV-S-PACKET-03: Validator FAIL) ─────
  it('T08: empty beats → FATAL — validator blocks LLM [INV-S-PACKET-03]', () => {
    const packet = withOverride({ beats: [] });
    const result = validateForgePacket(packet);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'beats' && e.severity === 'FATAL')).toBe(true);
  });

  // ─── T09: beat_order incorrect → ERROR ──────────────────────────────
  it('T09: beat with wrong beat_order → ERROR', () => {
    const packet = withOverride({
      beats: [
        { ...MINIMAL_FORGE_PACKET.beats[0], beat_order: 99 },
      ],
    });
    const result = validateForgePacket(packet);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field.includes('beat_order'))).toBe(true);
  });

  // ─── T10: beat sans action → ERROR ──────────────────────────────────
  it('T10: beat with empty action → ERROR', () => {
    const packet = withOverride({
      beats: [
        { ...MINIMAL_FORGE_PACKET.beats[0], action: '' },
      ],
    });
    const result = validateForgePacket(packet);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field.includes('action'))).toBe(true);
  });

  // ─── T11: valence hors bornes [-1, 1] → ERROR ───────────────────────
  it('T11: quartile valence > 1 → ERROR', () => {
    const packet = withOverride({
      emotion_contract: {
        ...MINIMAL_FORGE_PACKET.emotion_contract,
        curve_quartiles: [
          { ...MINIMAL_FORGE_PACKET.emotion_contract.curve_quartiles[0], valence: 1.5 },
          ...MINIMAL_FORGE_PACKET.emotion_contract.curve_quartiles.slice(1),
        ],
      },
    } as unknown as Partial<ForgePacket>);

    const result = validateForgePacket(packet);
    expect(result.errors.some(e => e.field.includes('valence'))).toBe(true);
  });

  // ─── T12: arousal hors bornes [0, 1] → ERROR ────────────────────────
  it('T12: quartile arousal < 0 → ERROR', () => {
    const packet = withOverride({
      emotion_contract: {
        ...MINIMAL_FORGE_PACKET.emotion_contract,
        curve_quartiles: [
          { ...MINIMAL_FORGE_PACKET.emotion_contract.curve_quartiles[0], arousal: -0.1 },
          ...MINIMAL_FORGE_PACKET.emotion_contract.curve_quartiles.slice(1),
        ],
      },
    } as unknown as Partial<ForgePacket>);

    const result = validateForgePacket(packet);
    expect(result.errors.some(e => e.field.includes('arousal'))).toBe(true);
  });

  // ─── T13: style_genome sans signature_words → ERROR ─────────────────
  it('T13: empty signature_words → ERROR', () => {
    const packet = withOverride({
      style_genome: {
        ...MINIMAL_FORGE_PACKET.style_genome,
        lexicon: {
          ...MINIMAL_FORGE_PACKET.style_genome.lexicon,
          signature_words: [],
        },
      },
    });
    const result = validateForgePacket(packet);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field.includes('signature_words'))).toBe(true);
  });

  // ─── T14: intensity_range min > max → ERROR ──────────────────────────
  it('T14: intensity_range min > max → ERROR', () => {
    const packet = withOverride({
      emotion_contract: {
        ...MINIMAL_FORGE_PACKET.emotion_contract,
        intensity_range: { min: 0.8, max: 0.3 },
      },
    });
    const result = validateForgePacket(packet);

    expect(result.errors.some(e => e.field.includes('intensity_range'))).toBe(true);
  });

  // ─── T15: warnings kill_lists vides ──────────────────────────────────
  it('T15: empty kill_lists → warnings (not FATAL, still valid)', () => {
    const packet = withOverride({
      kill_lists: {
        banned_words: [],
        banned_cliches: [],
        banned_ai_patterns: [],
        banned_filter_words: [],
      },
    });
    const result = validateForgePacket(packet);

    // Should still be valid (warnings, not errors)
    expect(result.valid).toBe(true);
    expect(result.warnings.some(w => w.includes('banned_cliches'))).toBe(true);
    expect(result.warnings.some(w => w.includes('banned_ai_patterns'))).toBe(true);
  });

  // ─── T16: determinisme — meme input = meme resultat ──────────────────
  it('T16: determinism — same packet → identical results [INV-S-ORACLE-01]', () => {
    const r1 = validateForgePacket(MINIMAL_FORGE_PACKET);
    const r2 = validateForgePacket(MINIMAL_FORGE_PACKET);

    expect(r1.valid).toBe(r2.valid);
    expect(r1.errors).toHaveLength(r2.errors.length);
    expect(r1.warnings).toHaveLength(r2.warnings.length);
  });

  // ─── T17: result shape (ValidationResult) ────────────────────────────
  it('T17: result conforms to ValidationResult schema', () => {
    const result: ValidationResult = validateForgePacket(MINIMAL_FORGE_PACKET);

    expect(typeof result.valid).toBe('boolean');
    expect(Array.isArray(result.errors)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);

    for (const error of result.errors) {
      expect(typeof error.field).toBe('string');
      expect(typeof error.message).toBe('string');
      expect(['FATAL', 'ERROR', 'WARNING']).toContain(error.severity);
    }
  });

  // ─── T18: wrong slope_target → ERROR ─────────────────────────────────
  it('T18: invalid slope_target → ERROR', () => {
    const packet = withOverride({
      emotion_contract: {
        ...MINIMAL_FORGE_PACKET.emotion_contract,
        tension: {
          ...MINIMAL_FORGE_PACKET.emotion_contract.tension,
          slope_target: 'invalid_slope' as never,
        },
      },
    });
    const result = validateForgePacket(packet);

    expect(result.errors.some(e => e.field.includes('slope_target'))).toBe(true);
  });

  // ─── T19: rupture position hors bornes → ERROR ───────────────────────
  it('T19: rupture exists + position_pct > 1 → ERROR', () => {
    const packet = withOverride({
      emotion_contract: {
        ...MINIMAL_FORGE_PACKET.emotion_contract,
        rupture: {
          exists: true,
          position_pct: 1.5,
          before_dominant: 'fear',
          after_dominant: 'sadness',
          delta_valence: -0.8,
        },
      },
    });
    const result = validateForgePacket(packet);

    expect(result.errors.some(e => e.field.includes('rupture.position_pct'))).toBe(true);
  });
});
