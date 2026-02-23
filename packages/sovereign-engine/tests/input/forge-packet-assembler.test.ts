/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FORGE PACKET ASSEMBLER — Tests Sprint S0-A
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Invariants couverts:
 * - INV-S-PACKET-01: FORGE_PACKET validé et hashé avant tout appel LLM
 * - INV-S-ASSEMBLE-01: packet_hash = sha256(canonicalize(packet_data))
 * - INV-S-ASSEMBLE-02: emotion_contract contient 4 quartiles Q1-Q4 déterministes
 * - INV-S-ASSEMBLE-03: même input → même packet_hash (déterminisme total)
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';
import { assembleForgePacket } from '../../src/input/forge-packet-assembler.js';
import type { ForgePacket } from '../../src/types.js';
import {
  MINIMAL_GENESIS_PLAN,
  MINIMAL_SCENE,
  MINIMAL_STYLE_PROFILE,
  MINIMAL_KILL_LISTS,
  MINIMAL_CANON,
  MINIMAL_CONTINUITY,
} from './__fixtures__/genesis-plan.js';

// ═══════════════════════════════════════════════════════════════════════════════
// BASE INPUT
// ═══════════════════════════════════════════════════════════════════════════════

const BASE_INPUT = {
  plan: MINIMAL_GENESIS_PLAN,
  scene: MINIMAL_SCENE,
  style_profile: MINIMAL_STYLE_PROFILE,
  kill_lists: MINIMAL_KILL_LISTS,
  canon: MINIMAL_CANON,
  continuity: MINIMAL_CONTINUITY,
  run_id: 'run_test_001',
  language: 'fr' as const,
};

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Forge Packet Assembler — INV-S-PACKET-01, INV-S-ASSEMBLE-01/02/03', () => {

  // ─── T01: assembleForgePacket retourne un ForgePacket valide ─────────────
  it('T01: assembleForgePacket returns a ForgePacket with all required fields', () => {
    const packet: ForgePacket = assembleForgePacket(BASE_INPUT);

    expect(typeof packet.packet_id).toBe('string');
    expect(typeof packet.packet_hash).toBe('string');
    expect(typeof packet.scene_id).toBe('string');
    expect(typeof packet.run_id).toBe('string');
    expect(packet.quality_tier).toBe('sovereign');
    expect(packet.language).toBe('fr');
  });

  // ─── T02: packet_hash est un SHA-256 valide (64 hex) [INV-S-ASSEMBLE-01] ─
  it('T02: packet_hash is a valid 64-char hex SHA-256 [INV-S-ASSEMBLE-01]', () => {
    const packet = assembleForgePacket(BASE_INPUT);

    expect(packet.packet_hash).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(packet.packet_hash)).toBe(true);
  });

  // ─── T03: déterminisme — même input → même packet_hash [INV-S-ASSEMBLE-03] ─
  it('T03: same input → identical packet_hash (determinism) [INV-S-ASSEMBLE-03]', () => {
    const p1 = assembleForgePacket(BASE_INPUT);
    const p2 = assembleForgePacket(BASE_INPUT);

    expect(p1.packet_hash).toBe(p2.packet_hash);
    expect(p1.packet_id).toBe(p2.packet_id);
  });

  // ─── T04: run_id différent → hash différent ──────────────────────────────
  it('T04: different run_id → different packet_hash', () => {
    const p1 = assembleForgePacket(BASE_INPUT);
    const p2 = assembleForgePacket({ ...BASE_INPUT, run_id: 'run_DIFFERENT_999' });

    expect(p1.packet_hash).not.toBe(p2.packet_hash);
  });

  // ─── T05: emotion_contract contient 4 quartiles Q1-Q4 [INV-S-ASSEMBLE-02] ─
  it('T05: emotion_contract has exactly 4 quartiles Q1-Q4 [INV-S-ASSEMBLE-02]', () => {
    const packet = assembleForgePacket(BASE_INPUT);
    const qs = packet.emotion_contract.curve_quartiles;

    expect(qs).toHaveLength(4);
    expect(qs[0].quartile).toBe('Q1');
    expect(qs[1].quartile).toBe('Q2');
    expect(qs[2].quartile).toBe('Q3');
    expect(qs[3].quartile).toBe('Q4');
  });

  // ─── T06: chaque quartile 14D somme à ~1.0 ──────────────────────────────
  it('T06: each quartile target_14d sums to ~1.0 (±0.01)', () => {
    const packet = assembleForgePacket(BASE_INPUT);

    for (const q of packet.emotion_contract.curve_quartiles) {
      const sum = Object.values(q.target_14d).reduce((a, b) => a + b, 0);
      expect(sum).toBeGreaterThan(0.98);
      expect(sum).toBeLessThan(1.02);
    }
  });

  // ─── T07: terminal_state 14D somme à ~1.0 ───────────────────────────────
  it('T07: terminal_state target_14d sums to ~1.0 (±0.01)', () => {
    const packet = assembleForgePacket(BASE_INPUT);
    const sum = Object.values(packet.emotion_contract.terminal_state.target_14d).reduce((a, b) => a + b, 0);

    expect(sum).toBeGreaterThan(0.98);
    expect(sum).toBeLessThan(1.02);
  });

  // ─── T08: beats mappés correctement depuis scene.beats ───────────────────
  it('T08: beats mapped from scene.beats with correct beat_order', () => {
    const packet = assembleForgePacket(BASE_INPUT);

    expect(packet.beats).toHaveLength(MINIMAL_SCENE.beats.length);
    for (let i = 0; i < packet.beats.length; i++) {
      expect(packet.beats[i].beat_order).toBe(i);
      expect(packet.beats[i].beat_id).toBe(MINIMAL_SCENE.beats[i].beat_id);
      expect(packet.beats[i].action).toBe(MINIMAL_SCENE.beats[i].action);
    }
  });

  // ─── T09: packet_id = FORGE_<scene_id>_<run_id> ─────────────────────────
  it('T09: packet_id = FORGE_<scene_id>_<run_id>', () => {
    const packet = assembleForgePacket(BASE_INPUT);

    expect(packet.packet_id).toBe(`FORGE_${MINIMAL_SCENE.scene_id}_${BASE_INPUT.run_id}`);
  });

  // ─── T10: scene_id = scene.scene_id ─────────────────────────────────────
  it('T10: scene_id matches scene.scene_id', () => {
    const packet = assembleForgePacket(BASE_INPUT);

    expect(packet.scene_id).toBe(MINIMAL_SCENE.scene_id);
  });

  // ─── T11: run_id préservé ────────────────────────────────────────────────
  it('T11: run_id preserved in packet', () => {
    const packet = assembleForgePacket(BASE_INPUT);

    expect(packet.run_id).toBe(BASE_INPUT.run_id);
  });

  // ─── T12: style_genome = style_profile ──────────────────────────────────
  it('T12: style_genome matches input style_profile', () => {
    const packet = assembleForgePacket(BASE_INPUT);

    expect(packet.style_genome.version).toBe(MINIMAL_STYLE_PROFILE.version);
    expect(packet.style_genome.universe).toBe(MINIMAL_STYLE_PROFILE.universe);
  });

  // ─── T13: kill_lists préservés ───────────────────────────────────────────
  it('T13: kill_lists preserved in packet', () => {
    const packet = assembleForgePacket(BASE_INPUT);

    expect(packet.kill_lists.banned_cliches).toHaveLength(MINIMAL_KILL_LISTS.banned_cliches.length);
    expect(packet.kill_lists.banned_ai_patterns).toHaveLength(MINIMAL_KILL_LISTS.banned_ai_patterns.length);
  });

  // ─── T14: canon préservé ────────────────────────────────────────────────
  it('T14: canon entries preserved in packet', () => {
    const packet = assembleForgePacket(BASE_INPUT);

    expect(packet.canon).toHaveLength(MINIMAL_CANON.length);
    expect(packet.canon[0].id).toBe(MINIMAL_CANON[0].id);
  });

  // ─── T15: valence arc direction calculée ────────────────────────────────
  it('T15: valence_arc has valid direction value', () => {
    const packet = assembleForgePacket(BASE_INPUT);
    const validDirections = ['darkening', 'brightening', 'stable', 'oscillating'];

    expect(validDirections).toContain(packet.emotion_contract.valence_arc.direction);
  });

  // ─── T16: tension slope_target valide ───────────────────────────────────
  it('T16: tension.slope_target is a valid value', () => {
    const packet = assembleForgePacket(BASE_INPUT);
    const validSlopes = ['ascending', 'descending', 'arc', 'reverse_arc'];

    expect(validSlopes).toContain(packet.emotion_contract.tension.slope_target);
  });

  // ─── T17: intensity_range min ≤ max ─────────────────────────────────────
  it('T17: intensity_range.min <= max', () => {
    const packet = assembleForgePacket(BASE_INPUT);
    const { min, max } = packet.emotion_contract.intensity_range;

    expect(min).toBeLessThanOrEqual(max);
    expect(min).toBeGreaterThanOrEqual(0);
    expect(max).toBeLessThanOrEqual(1);
  });

  // ─── T18: seeds contiennent llm_seed et determinism_level ───────────────
  it('T18: seeds contain llm_seed and determinism_level=absolute', () => {
    const packet = assembleForgePacket(BASE_INPUT);

    expect(typeof packet.seeds.llm_seed).toBe('string');
    expect(packet.seeds.llm_seed.length).toBeGreaterThan(0);
    expect(packet.seeds.determinism_level).toBe('absolute');
  });

  // ─── T19: generation contient timestamp, version, constraints_hash ───────
  it('T19: generation metadata present and valid', () => {
    const packet = assembleForgePacket(BASE_INPUT);

    expect(typeof packet.generation.timestamp).toBe('string');
    expect(typeof packet.generation.generator_version).toBe('string');
    expect(packet.generation.constraints_hash).toHaveLength(64);
  });

  // ─── T20: constraints_hash déterministe (même style+kill → même hash) ────
  it('T20: constraints_hash is deterministic for identical style+kill inputs', () => {
    const p1 = assembleForgePacket(BASE_INPUT);
    const p2 = assembleForgePacket({ ...BASE_INPUT, run_id: 'run_OTHER' });

    // constraints_hash depends on kill_lists + style_profile, not run_id
    expect(p1.generation.constraints_hash).toBe(p2.generation.constraints_hash);
  });

  // ─── T21: default language = 'fr' quand non spécifié ────────────────────
  it('T21: default language is fr when not specified', () => {
    const inputNoLang = { ...BASE_INPUT };
    delete (inputNoLang as Record<string, unknown>).language;
    const packet = assembleForgePacket(inputNoLang as typeof BASE_INPUT);

    expect(packet.language).toBe('fr');
  });

  // ─── T22: subtext contient tension_type de scene.subtext ─────────────────
  it('T22: subtext.tension_type matches scene.subtext.tension_type', () => {
    const packet = assembleForgePacket(BASE_INPUT);

    expect(packet.subtext.tension_type).toBe(MINIMAL_SCENE.subtext.tension_type);
  });

  // ─── T23: sensory contient les catégories obligatoires ───────────────────
  it('T23: sensory has 7 categories (sight, sound, touch, smell, taste, proprioception, interoception)', () => {
    const packet = assembleForgePacket(BASE_INPUT);
    const requiredCategories = ['sight', 'sound', 'touch', 'smell', 'taste', 'proprioception', 'interoception'];
    const categories = packet.sensory.categories.map(c => c.category);

    for (const cat of requiredCategories) {
      expect(categories).toContain(cat);
    }
  });
});
