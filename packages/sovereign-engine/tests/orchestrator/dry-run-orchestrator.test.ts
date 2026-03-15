/**
 * dry-run-orchestrator.test.ts — Tests S3 : Dry-Run Orchestrator
 * Sprint S3 — SCRIBE ORCHESTRÉ v3.1.0
 *
 * Verifies full pipeline wiring: profiles → partitions → prompts → CALC scoring.
 * 100% CALC — mock provider for draft generation only.
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calcComposite,
  runOrchestrator,
  type OrchestratorInput,
} from '../../src/orchestrator/scribe-orchestrator.js';
import {
  compileWithProfile,
  PROFILE_DRAMATURGE,
  PROFILE_MUSICIEN,
} from '../../src/compiler/partition-profiles.js';
import { buildSovereignPrompt } from '../../src/input/prompt-assembler-v2.js';
import type { SovereignProvider } from '../../src/types.js';
import { MINIMAL_FORGE_PACKET } from '../input/__fixtures__/minimal-forge-packet.js';
import { LOT1_INSTRUCTIONS } from '../../src/prose-directive/lot1-instructions.js';
import { LOT2_INSTRUCTIONS } from '../../src/prose-directive/lot2-instructions.js';
import { LOT3_INSTRUCTIONS } from '../../src/prose-directive/lot3-instructions.js';
import {
  REALISTIC_SCENE_GREEN,
} from '../bench/pathological-scenes.test.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

const ALL_INSTRUCTIONS = [
  ...LOT1_INSTRUCTIONS,
  ...LOT2_INSTRUCTIONS,
  ...LOT3_INSTRUCTIONS,
];

const LITERARY_PROSE = `Les ombres s'étiraient sur les pavés mouillés. Chaque goutte portait la rumeur de la ville endormie. Dans le reflet d'une flaque, un visage inconnu la dévisageait — ni hostile ni familier. Ses mains trouvèrent les clés au fond de la poche, les doigts engourdis par le froid de février. La serrure céda sans bruit. Le couloir sentait le bois ciré et la poussière de livres. Au bout, la lumière d'une lampe brûlait encore, patiente. Elle ne se souvenait pas de l'avoir allumée.`;

function makeMockProvider(): SovereignProvider {
  return {
    generateDraft: vi.fn().mockResolvedValue(LITERARY_PROSE),
    generateStructuredJSON: vi.fn(),
    scoreInteriority: vi.fn(),
    scoreSensoryDensity: vi.fn(),
    scoreNecessity: vi.fn(),
    scoreImpact: vi.fn(),
    applyPatch: vi.fn(),
    rewriteSentence: vi.fn(),
  };
}

beforeEach(() => {
  process.env.OMEGA_PROMPT_COMPILER_V3 = '1';
});

afterEach(() => {
  delete process.env.OMEGA_PROMPT_COMPILER_V3;
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE — DRY-RUN COMPLET
// ═══════════════════════════════════════════════════════════════════════════════

describe('S3 — Dry-Run Orchestrator', () => {

  it('full chain: profiles → partitions → prompts → different N2 content', () => {
    const dramPartition = compileWithProfile(
      PROFILE_DRAMATURGE, MINIMAL_FORGE_PACKET, null, ALL_INSTRUCTIONS,
    );
    const musicPartition = compileWithProfile(
      PROFILE_MUSICIEN, MINIMAL_FORGE_PACKET, null, ALL_INSTRUCTIONS,
    );

    // N2 should differ (different filtered instructions)
    expect(dramPartition.level2_trajectory).not.toBe(musicPartition.level2_trajectory);

    // Both should be valid partitions
    expect(dramPartition.total_tokens).toBeGreaterThan(0);
    expect(musicPartition.total_tokens).toBeGreaterThan(0);
  });

  it('profiles produce different prompts', () => {
    const dramPartition = compileWithProfile(
      PROFILE_DRAMATURGE, MINIMAL_FORGE_PACKET, null, ALL_INSTRUCTIONS,
    );
    const musicPartition = compileWithProfile(
      PROFILE_MUSICIEN, MINIMAL_FORGE_PACKET, null, ALL_INSTRUCTIONS,
    );

    const dramPrompt = buildSovereignPrompt(MINIMAL_FORGE_PACKET, undefined, undefined, dramPartition);
    const musicPrompt = buildSovereignPrompt(MINIMAL_FORGE_PACKET, undefined, undefined, musicPartition);

    const dramText = dramPrompt.sections.map(s => s.content).join('\n');
    const musicText = musicPrompt.sections.map(s => s.content).join('\n');

    expect(dramText).toContain('FOCUS ÉMOTION');
    expect(musicText).toContain('FOCUS CRAFT');
    expect(dramText).not.toBe(musicText);
  });

  it('orchestrator with CDEInput → partitions compile without error', () => {
    const dramPartition = compileWithProfile(
      PROFILE_DRAMATURGE, MINIMAL_FORGE_PACKET, REALISTIC_SCENE_GREEN, ALL_INSTRUCTIONS,
    );
    const musicPartition = compileWithProfile(
      PROFILE_MUSICIEN, MINIMAL_FORGE_PACKET, REALISTIC_SCENE_GREEN, ALL_INSTRUCTIONS,
    );

    expect(dramPartition.partition_hash).toBeDefined();
    expect(musicPartition.partition_hash).toBeDefined();
    expect(dramPartition.partition_hash).not.toBe(musicPartition.partition_hash);
  });

  it('runOrchestrator produces valid result with all fields', async () => {
    const provider = makeMockProvider();
    const input: OrchestratorInput = {
      packet: MINIMAL_FORGE_PACKET,
      cdeInput: null,
      allInstructions: ALL_INSTRUCTIONS,
    };

    const result = await runOrchestrator(input, provider);

    expect(result.mode).toBe('SAFE');
    expect(result.selected_prose).toBe(LITERARY_PROSE);
    expect(result.selected_partition).toBeDefined();
    expect(result.scores.dramaturge.composite).toBeGreaterThanOrEqual(0);
    expect(result.scores.musicien.composite).toBeGreaterThanOrEqual(0);
    expect(result.margin).toBeGreaterThanOrEqual(0);
    expect(['CALC', 'TIEBREAK']).toContain(result.selection_method);
  });

  it('CALC composite scores are deterministic for same prose', async () => {
    const score1 = await calcComposite(MINIMAL_FORGE_PACKET, LITERARY_PROSE, 'DRAMATURGE');
    const score2 = await calcComposite(MINIMAL_FORGE_PACKET, LITERARY_PROSE, 'DRAMATURGE');

    expect(score1.composite).toBe(score2.composite);
    expect(score1.tension_14d).toBe(score2.tension_14d);
    expect(score1.rhythm).toBe(score2.rhythm);
  });

  it('orchestrator result partition hash is deterministic', async () => {
    const provider1 = makeMockProvider();
    const provider2 = makeMockProvider();
    const input: OrchestratorInput = {
      packet: MINIMAL_FORGE_PACKET,
      cdeInput: null,
      allInstructions: ALL_INSTRUCTIONS,
    };

    const result1 = await runOrchestrator(input, provider1);
    const result2 = await runOrchestrator(input, provider2);

    // Same input → same partition hash for selected profile
    expect(result1.selected_partition.partition_hash).toBe(result2.selected_partition.partition_hash);
  });
});
