/**
 * partition-profiles.test.ts — Tests S1 : Partition Profiles
 * Sprint S1 — SCRIBE ORCHESTRÉ v3.1.0
 *
 * INV-PROF-01 : compilePartition() is NEVER modified — only wrapped
 * INV-PROF-02 : N1 (laws) identical across all profiles
 * INV-PROF-03 : N3 (decor) identical across all profiles
 * INV-PROF-04 : Each profile filters PDB instructions by target_axes overlap
 * INV-PROF-05 : Custom attention contract per profile
 *
 * 8 tests — 100% CALC — 0 appel LLM.
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  compileWithProfile,
  filterInstructionsForProfile,
  PROFILE_DRAMATURGE,
  PROFILE_MUSICIEN,
  DRAMATURGE_AXES,
  MUSICIEN_AXES,
} from '../../src/compiler/partition-profiles.js';
import { LOT1_INSTRUCTIONS } from '../../src/prose-directive/lot1-instructions.js';
import { LOT2_INSTRUCTIONS } from '../../src/prose-directive/lot2-instructions.js';
import { LOT3_INSTRUCTIONS } from '../../src/prose-directive/lot3-instructions.js';
import { MINIMAL_FORGE_PACKET } from '../input/__fixtures__/minimal-forge-packet.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

const ALL_INSTRUCTIONS = [
  ...LOT1_INSTRUCTIONS,
  ...LOT2_INSTRUCTIONS,
  ...LOT3_INSTRUCTIONS,
];

beforeEach(() => {
  process.env.OMEGA_PROMPT_COMPILER_V3 = '1';
});

afterEach(() => {
  delete process.env.OMEGA_PROMPT_COMPILER_V3;
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 1 — INSTRUCTION FILTERING (INV-PROF-04)
// ═══════════════════════════════════════════════════════════════════════════════

describe('S1 — Partition Profiles — Instruction Filtering', () => {

  it('INV-PROF-04: DRAMATURGE keeps instructions with emotion axes', () => {
    const filtered = filterInstructionsForProfile(ALL_INSTRUCTIONS, PROFILE_DRAMATURGE);
    const ids = filtered.map(i => i.id);

    // LOT1-01: tension_14d, densite_sensorielle, interiorite → DRAM ✓
    expect(ids).toContain('LOT1-01');
    // LOT1-04: tension_14d, interiorite → DRAM ✓
    expect(ids).toContain('LOT1-04');
    // LOT3-03: interiorite, impact_ouverture_cloture, coherence_emotionnelle → DRAM ✓
    expect(ids).toContain('LOT3-03');
  });

  it('INV-PROF-04: DRAMATURGE excludes purely craft instructions', () => {
    const filtered = filterInstructionsForProfile(ALL_INSTRUCTIONS, PROFILE_DRAMATURGE);
    const ids = filtered.map(i => i.id);

    // LOT1-03: rythme_musical, anti_cliche, necessite_m8 → no DRAM axes
    expect(ids).not.toContain('LOT1-03');
  });

  it('INV-PROF-04: MUSICIEN keeps instructions with craft axes', () => {
    const filtered = filterInstructionsForProfile(ALL_INSTRUCTIONS, PROFILE_MUSICIEN);
    const ids = filtered.map(i => i.id);

    // LOT1-03: rythme_musical, anti_cliche, necessite_m8 → MUSIC ✓
    expect(ids).toContain('LOT1-03');
    // LOT3-01: signature, densite_sensorielle, anti_cliche → MUSIC(signature+anti_cliche) ✓
    expect(ids).toContain('LOT3-01');
  });

  it('INV-PROF-04: MUSICIEN excludes purely emotion instructions', () => {
    const filtered = filterInstructionsForProfile(ALL_INSTRUCTIONS, PROFILE_MUSICIEN);
    const ids = filtered.map(i => i.id);

    // LOT1-01: tension_14d, densite_sensorielle, interiorite → no MUSIC axes
    expect(ids).not.toContain('LOT1-01');
    // LOT1-04: tension_14d, interiorite → no MUSIC axes
    expect(ids).not.toContain('LOT1-04');
  });

  it('INV-PROF-04: shared instructions appear in both profiles', () => {
    const dramFiltered = filterInstructionsForProfile(ALL_INSTRUCTIONS, PROFILE_DRAMATURGE);
    const musicFiltered = filterInstructionsForProfile(ALL_INSTRUCTIONS, PROFILE_MUSICIEN);
    const dramIds = new Set(dramFiltered.map(i => i.id));
    const musicIds = new Set(musicFiltered.map(i => i.id));

    // LOT1-02: anti_cliche(MUSIC) + tension_14d(DRAM) → both
    expect(dramIds.has('LOT1-02')).toBe(true);
    expect(musicIds.has('LOT1-02')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 2 — PROFILE COMPILATION (INV-PROF-01/02/03/05)
// ═══════════════════════════════════════════════════════════════════════════════

describe('S1 — Partition Profiles — Compilation', () => {

  it('INV-PROF-05: DRAMATURGE contract contains FOCUS ÉMOTION', () => {
    const partition = compileWithProfile(
      PROFILE_DRAMATURGE, MINIMAL_FORGE_PACKET, null, ALL_INSTRUCTIONS,
    );
    expect(partition.attention_contract).toContain('FOCUS ÉMOTION');
    expect(partition.attention_contract).toContain('CONTRAT D\'EXÉCUTION');
    expect(partition.attention_contract).toContain('NIVEAU 1');
  });

  it('INV-PROF-05: MUSICIEN contract contains FOCUS CRAFT', () => {
    const partition = compileWithProfile(
      PROFILE_MUSICIEN, MINIMAL_FORGE_PACKET, null, ALL_INSTRUCTIONS,
    );
    expect(partition.attention_contract).toContain('FOCUS CRAFT');
    expect(partition.attention_contract).toContain('CONTRAT D\'EXÉCUTION');
  });

  it('INV-PROF-02/03: N1 and N3 identical across profiles', () => {
    const dram = compileWithProfile(
      PROFILE_DRAMATURGE, MINIMAL_FORGE_PACKET, null, ALL_INSTRUCTIONS,
    );
    const music = compileWithProfile(
      PROFILE_MUSICIEN, MINIMAL_FORGE_PACKET, null, ALL_INSTRUCTIONS,
    );

    // INV-PROF-02: N1 laws identical (same packet → same kill_lists, canon, etc.)
    expect(dram.level1_laws).toBe(music.level1_laws);

    // INV-PROF-03: N3 decor identical (same budget_l3, same packet)
    expect(dram.level3_decor).toBe(music.level3_decor);
  });
});
