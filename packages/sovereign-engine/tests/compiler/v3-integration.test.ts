/**
 * v3-integration.test.ts — Tests P4-PREP : V3 Pipeline Integration
 * Sprint P4-PREP — V-PARTITION v3.0.0
 *
 * Verifies that the V3 compiler is properly wired into the real pipeline.
 * Tests the full chain: assembleForgePacket → compilePartition → buildSovereignPrompt
 * 100% CALC — 0 appel LLM.
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import { describe, it, expect, afterEach } from 'vitest';
import { assembleForgePacket } from '../../src/input/forge-packet-assembler.js';
import { buildSovereignPrompt, getV3AbsorbedSectionIds } from '../../src/input/prompt-assembler-v2.js';
import { compilePartition, isV3Active } from '../../src/compiler/prompt-compiler.js';
import { analyzePreFlight, dumpPartition } from '../../src/compiler/static-analyzer.js';
import { DEFAULT_COMPILER_CONFIG } from '../../src/compiler/types.js';
import { LOT1_INSTRUCTIONS } from '../../src/prose-directive/lot1-instructions.js';
import { LOT2_INSTRUCTIONS } from '../../src/prose-directive/lot2-instructions.js';
import { LOT3_INSTRUCTIONS } from '../../src/prose-directive/lot3-instructions.js';
import { MINIMAL_FORGE_PACKET } from '../input/__fixtures__/minimal-forge-packet.js';
import {
  PATHOLOGICAL_SCENE_1,
  REALISTIC_SCENE_GREEN,
} from '../bench/pathological-scenes.test.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

afterEach(() => {
  delete process.env.OMEGA_PROMPT_COMPILER_V3;
});

function compileForTest(cdeInput: import('../../src/cde/types.js').CDEInput | null = null) {
  const allInstructions = [
    ...LOT1_INSTRUCTIONS,
    ...LOT2_INSTRUCTIONS,
    ...LOT3_INSTRUCTIONS,
  ];
  return compilePartition(
    MINIMAL_FORGE_PACKET,
    cdeInput,
    {
      ...DEFAULT_COMPILER_CONFIG,
      shape: MINIMAL_FORGE_PACKET.intent?.conflict_type ?? 'Confrontation',
    },
    allInstructions,
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 1 — V3 PIPELINE WIRING
// ═══════════════════════════════════════════════════════════════════════════════

describe('P4-PREP — V3 Pipeline Integration', () => {

  it('V3 actif → prompt contient le contrat d\'attention', () => {
    process.env.OMEGA_PROMPT_COMPILER_V3 = '1';
    const partition = compileForTest();
    const prompt = buildSovereignPrompt(MINIMAL_FORGE_PACKET, undefined, undefined, partition);
    const fullText = prompt.sections.map(s => s.content).join('\n\n');

    expect(fullText).toContain('CONTRAT D\'EXÉCUTION');
    expect(fullText).toContain('NIVEAU 1');
    expect(fullText).toContain('NIVEAU 2');
    expect(fullText).toContain('NIVEAU 3');
  });

  it('V3 actif → sections absorbées absentes du prompt', () => {
    process.env.OMEGA_PROMPT_COMPILER_V3 = '1';
    const partition = compileForTest();
    const prompt = buildSovereignPrompt(MINIMAL_FORGE_PACKET, undefined, undefined, partition);
    const sectionIds = new Set(prompt.sections.map(s => s.section_id));
    const absorbed = getV3AbsorbedSectionIds();

    for (const id of absorbed) {
      expect(sectionIds.has(id), `Section '${id}' should be absorbed by V3`).toBe(false);
    }
  });

  it('V3 actif → V3 sections présentes (contrat, N1, N2, N3, rappel)', () => {
    process.env.OMEGA_PROMPT_COMPILER_V3 = '1';
    const partition = compileForTest();
    const prompt = buildSovereignPrompt(MINIMAL_FORGE_PACKET, undefined, undefined, partition);
    const sectionIds = new Set(prompt.sections.map(s => s.section_id));

    expect(sectionIds.has('v3_attention_contract')).toBe(true);
    expect(sectionIds.has('v3_level1_laws')).toBe(true);
    expect(sectionIds.has('v3_level2_trajectory')).toBe(true);
    expect(sectionIds.has('v3_level3_decor')).toBe(true);
    expect(sectionIds.has('v3_recency_reminder')).toBe(true);
  });

  it('V3 inactif → prompt NE contient PAS le contrat d\'attention', () => {
    delete process.env.OMEGA_PROMPT_COMPILER_V3;
    const prompt = buildSovereignPrompt(MINIMAL_FORGE_PACKET);
    const fullText = prompt.sections.map(s => s.content).join('\n\n');

    expect(fullText).not.toContain('CONTRAT D\'EXÉCUTION');
    // V2 sections should be present
    const sectionIds = prompt.sections.map(s => s.section_id);
    expect(sectionIds).toContain('emotion_contract');
    expect(sectionIds).toContain('beats');
    expect(sectionIds).toContain('intent');
  });

  it('V3 actif avec CDEInput → brief pas injecté monolithiquement', () => {
    process.env.OMEGA_PROMPT_COMPILER_V3 = '1';
    const partition = compileForTest(PATHOLOGICAL_SCENE_1);
    const prompt = buildSovereignPrompt(MINIMAL_FORGE_PACKET, undefined, undefined, partition);
    const fullText = prompt.sections.map(s => s.content).join('\n\n');

    // No monolithic brief injection markers
    expect(fullText).not.toContain('[CDE BRIEF]');
    expect(fullText).not.toMatch(/RESTE VRAI:/);
    // But V3 contract should be present
    expect(fullText).toContain('CONTRAT D\'EXÉCUTION');
  });

  it('INV-COMP-08 intégration — zéro doublon V3/V2', () => {
    process.env.OMEGA_PROMPT_COMPILER_V3 = '1';
    const partition = compileForTest();
    const prompt = buildSovereignPrompt(MINIMAL_FORGE_PACKET, undefined, undefined, partition);
    const sectionIds = prompt.sections.map(s => s.section_id);
    const absorbed = getV3AbsorbedSectionIds();

    // V3 sections present
    expect(sectionIds).toContain('v3_attention_contract');
    expect(sectionIds).toContain('v3_level1_laws');

    // Absorbed V2 sections absent
    for (const id of absorbed) {
      expect(sectionIds).not.toContain(id);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 2 — DRY-RUN COMPLET (Action 5)
// ═══════════════════════════════════════════════════════════════════════════════

describe('P4-PREP — Dry-Run V3 Pipeline', () => {

  it('full chain: assembleForgePacket → compilePartition → buildSovereignPrompt', () => {
    process.env.OMEGA_PROMPT_COMPILER_V3 = '1';

    // 1. Compile partition with realistic CDE input
    const partition = compileForTest(REALISTIC_SCENE_GREEN);

    // 2. Build prompt
    const prompt = buildSovereignPrompt(MINIMAL_FORGE_PACKET, undefined, undefined, partition);
    const fullText = prompt.sections.map(s => s.content).join('\n\n');

    // 3. Verify structure
    expect(fullText).toContain('CONTRAT D\'EXÉCUTION');
    expect(fullText).toContain('NIVEAU 1');
    expect(fullText).toContain('NIVEAU 2');
    expect(fullText).toContain('NIVEAU 3');
    expect(fullText).not.toContain('[CDE BRIEF]');
    expect(fullText).not.toMatch(/RESTE VRAI:/);

    // 4. Token count reasonable
    expect(prompt.total_length).toBeGreaterThan(0);
    expect(prompt.total_length).toBeLessThan(100000);
  });

  it('PreFlight verdict NOT RED for realistic scene', () => {
    process.env.OMEGA_PROMPT_COMPILER_V3 = '1';
    const partition = compileForTest(REALISTIC_SCENE_GREEN);
    const preflight = analyzePreFlight(partition);

    expect(preflight.verdict).not.toBe('RED');
    expect(['GREEN', 'YELLOW']).toContain(preflight.verdict);
  });

  it('Partition dump is JSON-serializable', () => {
    process.env.OMEGA_PROMPT_COMPILER_V3 = '1';
    const partition = compileForTest(REALISTIC_SCENE_GREEN);
    const dump = dumpPartition(partition);

    const json = JSON.stringify(dump, null, 2);
    expect(json.length).toBeGreaterThan(0);
    const parsed = JSON.parse(json);
    expect(parsed.partition_hash).toBe(partition.partition_hash);
    expect(parsed.preflight_report.verdict).toBeDefined();
  });

  it('V3 prompt contains RAPPEL near end', () => {
    process.env.OMEGA_PROMPT_COMPILER_V3 = '1';
    const partition = compileForTest();
    const prompt = buildSovereignPrompt(MINIMAL_FORGE_PACKET, undefined, undefined, partition);
    const sections = prompt.sections;
    const reminderSection = sections.find(s => s.section_id === 'v3_recency_reminder');

    expect(reminderSection).toBeDefined();
    expect(reminderSection!.content).toContain('RAPPEL');
    expect(reminderSection!.content).toContain('N1 inviolable');
  });
});
