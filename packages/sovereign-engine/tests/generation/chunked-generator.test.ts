/**
 * OMEGA — Tests: Chunked Generator K2 (Moteur v4)
 *
 * Verifies:
 * - Activation flag behavior
 * - Prompt structure (personas, rappels, chunks 1-4)
 * - Lore-coding L3 (zero prescriptive numbers)
 * - INV-PROMPT-01 (no system identifiers in prompts)
 * - ForgePacket to SceneBrief conversion
 * - Fail-closed behavior on empty prose
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateChunkedDraft,
  isChunkedV4Active,
  PF_PERSONA,
  RAPPEL_CHUNKS12,
  RAPPEL_CHUNKS34_V4,
  PF_PERSONA_V2,
  RAPPEL_CHUNKS12_V2,
  RAPPEL_CHUNKS34_V2,
  DEAD_METAPHOR_PROMPT,
  type ChunkedGenerationInput,
} from '../../src/generation/chunked-generator.js';
import { forgePacketToSceneBrief } from '../../src/generation/forge-to-brief.js';
import type { SovereignProvider } from '../../src/types.js';

// ═══════════════════════════════════════════════════════════════════════════
// MOCK PROVIDER — captures prompts for verification
// ═══════════════════════════════════════════════════════════════════════════

function createMockProvider(responses?: string[]): SovereignProvider & { capturedPrompts: string[] } {
  const capturedPrompts: string[] = [];
  let callIndex = 0;
  const defaultResponse = '<prose>Il marchait dans la rue. Les murs étaient gris. La lumière tombait.</prose>';

  return {
    capturedPrompts,
    generateDraft: vi.fn(async (prompt: string) => {
      capturedPrompts.push(prompt);
      return responses?.[callIndex++] ?? defaultResponse;
    }),
    scoreInteriority: vi.fn(async () => 80),
    scoreSensoryDensity: vi.fn(async () => 80),
    scoreNecessity: vi.fn(async () => 80),
    scoreImpact: vi.fn(async () => 80),
    applyPatch: vi.fn(async (_p, _pi, _c) => ''),
    generateStructuredJSON: vi.fn(async () => ({})),
    rewriteSentence: vi.fn(async () => ''),
  };
}

const TEST_INPUT: ChunkedGenerationInput = {
  sceneBrief: 'Un homme entre dans un bar vide. Il cherche quelqu\'un.',
  signatureWords: ['ombre', 'silence', 'fracture'],
  language: 'fr',
  seed: 'test-seed-42',
};

// ═══════════════════════════════════════════════════════════════════════════
// ACTIVATION FLAG
// ═══════════════════════════════════════════════════════════════════════════

describe('isChunkedV4Active', () => {
  const originalEnv = process.env.OMEGA_CHUNKED_V4;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.OMEGA_CHUNKED_V4;
    } else {
      process.env.OMEGA_CHUNKED_V4 = originalEnv;
    }
  });

  it('returns false by default', () => {
    delete process.env.OMEGA_CHUNKED_V4;
    expect(isChunkedV4Active()).toBe(false);
  });

  it('returns true when OMEGA_CHUNKED_V4=1', () => {
    process.env.OMEGA_CHUNKED_V4 = '1';
    expect(isChunkedV4Active()).toBe(true);
  });

  it('returns false when OMEGA_CHUNKED_V4=0', () => {
    process.env.OMEGA_CHUNKED_V4 = '0';
    expect(isChunkedV4Active()).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// LOI L3 — ZERO PRESCRIPTIVE NUMBERS
// ═══════════════════════════════════════════════════════════════════════════

describe('Loi L3 — zero prescriptive numbers', () => {
  // Prescriptive patterns: "60-80 mots", "3 à 6 mots", "X mots par phrase"
  const prescriptivePattern = /\d+[\s-]+(?:à|\-)[\s-]+\d+\s+mots|\d+\s+mots\s+(?:par|en\s+moyenne)/i;

  it('PF_PERSONA contains no prescriptive number patterns', () => {
    expect(PF_PERSONA).not.toMatch(prescriptivePattern);
  });

  it('PF_PERSONA_V2 contains no prescriptive number patterns', () => {
    expect(PF_PERSONA_V2).not.toMatch(prescriptivePattern);
  });

  it('RAPPEL_CHUNKS12 contains no prescriptive number patterns', () => {
    expect(RAPPEL_CHUNKS12).not.toMatch(prescriptivePattern);
  });

  it('RAPPEL_CHUNKS12_V2 contains no prescriptive number patterns', () => {
    expect(RAPPEL_CHUNKS12_V2).not.toMatch(prescriptivePattern);
  });

  it('RAPPEL_CHUNKS34_V4 contains no prescriptive number patterns', () => {
    expect(RAPPEL_CHUNKS34_V4).not.toMatch(prescriptivePattern);
  });

  it('RAPPEL_CHUNKS34_V2 contains no prescriptive number patterns', () => {
    expect(RAPPEL_CHUNKS34_V2).not.toMatch(prescriptivePattern);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// P4 — DEAD METAPHOR + NECESSITY ANCHOR IN ALL CHUNKS
// ═══════════════════════════════════════════════════════════════════════════

describe('P4 — dead metaphor blacklist + necessity anchor', () => {
  it('all 4 chunks contain DEAD_METAPHOR_PROMPT', async () => {
    const provider = createMockProvider();
    await generateChunkedDraft(TEST_INPUT, provider);
    for (let i = 0; i < 4; i++) {
      expect(provider.capturedPrompts[i]).toContain('MÉTAPHORES INTERDITES');
      expect(provider.capturedPrompts[i]).toContain('le cœur serré');
    }
  });

  it('all 4 chunks contain necessity anchor', async () => {
    const provider = createMockProvider();
    await generateChunkedDraft(TEST_INPUT, provider);
    for (let i = 0; i < 4; i++) {
      expect(provider.capturedPrompts[i]).toContain('Zéro filler');
    }
  });

  it('personaOverride replaces PF_PERSONA_V2', async () => {
    const provider = createMockProvider();
    const input: ChunkedGenerationInput = {
      ...TEST_INPUT,
      personaOverride: 'PERSONA CUSTOM TEST',
    };
    await generateChunkedDraft(input, provider);
    expect(provider.capturedPrompts[0]).toContain('PERSONA CUSTOM TEST');
    expect(provider.capturedPrompts[0]).not.toContain('nécessité et du contraste');
  });

  it('rappelOverride replaces V2 rappels', async () => {
    const provider = createMockProvider();
    const input: ChunkedGenerationInput = {
      ...TEST_INPUT,
      rappelOverride: 'RAPPEL CUSTOM TEST',
    };
    await generateChunkedDraft(input, provider);
    for (let i = 0; i < 4; i++) {
      expect(provider.capturedPrompts[i]).toContain('RAPPEL CUSTOM TEST');
      expect(provider.capturedPrompts[i]).not.toContain('ANTI-RECYCLAGE');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// INV-PROMPT-01 — NO SYSTEM IDENTIFIERS
// ═══════════════════════════════════════════════════════════════════════════

describe('INV-PROMPT-01 — no system identifiers', () => {
  it('no prompt contains open_threads', async () => {
    const provider = createMockProvider();
    await generateChunkedDraft(TEST_INPUT, provider);
    for (const prompt of provider.capturedPrompts) {
      expect(prompt).not.toContain('open_threads');
    }
  });

  it('no prompt contains charStates', async () => {
    const provider = createMockProvider();
    await generateChunkedDraft(TEST_INPUT, provider);
    for (const prompt of provider.capturedPrompts) {
      expect(prompt).not.toContain('charStates');
    }
  });

  it('no prompt contains canon IDs (cf-*, canon-*)', async () => {
    const provider = createMockProvider();
    await generateChunkedDraft(TEST_INPUT, provider);
    for (const prompt of provider.capturedPrompts) {
      expect(prompt).not.toMatch(/cf-[a-z]|canon-\d/);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CHUNK PROMPT STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════

describe('Chunk prompt structure', () => {
  it('generates exactly 4 chunks', async () => {
    const provider = createMockProvider();
    const result = await generateChunkedDraft(TEST_INPUT, provider);
    expect(result.chunks).toHaveLength(4);
    expect(result.api_calls).toBe(4);
    expect(provider.capturedPrompts).toHaveLength(4);
  });

  it('chunk 1 contains PF_PERSONA_V2 + RAPPEL_CHUNKS12_V2 + sceneBrief + DEAD_METAPHOR', async () => {
    const provider = createMockProvider();
    await generateChunkedDraft(TEST_INPUT, provider);
    const p = provider.capturedPrompts[0];
    // P4C: PF_PERSONA_V2 (nécessité + contraste)
    expect(p).toContain('nécessité');
    expect(p).toContain('contraste');
    // P4D: RAPPEL V2
    expect(p).toContain('NÉCESSITÉ');
    // P4B: Dead metaphor blacklist
    expect(p).toContain('MÉTAPHORES INTERDITES');
    // P4A: Necessity anchor
    expect(p).toContain('Zéro filler');
    expect(p).toContain(TEST_INPUT.sceneBrief);
  });

  it('chunk 1 contains signature words', async () => {
    const provider = createMockProvider();
    await generateChunkedDraft(TEST_INPUT, provider);
    const p = provider.capturedPrompts[0];
    expect(p).toContain('ombre');
    expect(p).toContain('silence');
    expect(p).toContain('fracture');
  });

  it('chunks 2-3 contain last 200 words', async () => {
    const provider = createMockProvider();
    await generateChunkedDraft(TEST_INPUT, provider);
    // Chunks 2 and 3 should have "200 derniers mots" context
    expect(provider.capturedPrompts[1]).toContain('200 derniers mots');
    expect(provider.capturedPrompts[2]).toContain('200 derniers mots');
  });

  it('chunks 1-2 use RAPPEL_CHUNKS12_V2 (P4D)', async () => {
    const provider = createMockProvider();
    await generateChunkedDraft(TEST_INPUT, provider);
    // V2 rappels: NÉCESSITÉ + CONTRASTE + ANCRAGE SENSORIEL
    expect(provider.capturedPrompts[0]).toContain('NÉCESSITÉ');
    expect(provider.capturedPrompts[1]).toContain('NÉCESSITÉ');
    expect(provider.capturedPrompts[0]).toContain('ANCRAGE SENSORIEL');
    expect(provider.capturedPrompts[1]).toContain('ANCRAGE SENSORIEL');
    // Should NOT contain V1 rappels
    expect(provider.capturedPrompts[0]).not.toContain('CORRECTEUR DE RYTHME EXTERNE');
    expect(provider.capturedPrompts[1]).not.toContain('CORRECTEUR DE RYTHME EXTERNE');
  });

  it('chunks 3-4 use RAPPEL_CHUNKS34_V2 (P4D)', async () => {
    const provider = createMockProvider();
    await generateChunkedDraft(TEST_INPUT, provider);
    // V2 rappels: ANTI-RECYCLAGE + COHÉRENCE
    expect(provider.capturedPrompts[2]).toContain('ANTI-RECYCLAGE');
    expect(provider.capturedPrompts[3]).toContain('ANTI-RECYCLAGE');
    expect(provider.capturedPrompts[2]).toContain('COHÉRENCE');
    expect(provider.capturedPrompts[3]).toContain('COHÉRENCE');
    // Should NOT contain V1 rappels
    expect(provider.capturedPrompts[2]).not.toContain('ANCRE DE TENUE');
    expect(provider.capturedPrompts[3]).not.toContain('ANCRE DE TENUE');
  });

  it('chunk 4 contains TERMINE', async () => {
    const provider = createMockProvider();
    await generateChunkedDraft(TEST_INPUT, provider);
    expect(provider.capturedPrompts[3]).toContain('TERMINE');
  });

  it('seed includes chunk index', async () => {
    const provider = createMockProvider();
    await generateChunkedDraft(TEST_INPUT, provider);
    const generateDraft = provider.generateDraft as ReturnType<typeof vi.fn>;
    expect(generateDraft).toHaveBeenCalledWith(expect.any(String), 'chunked_k2', 'test-seed-42_c1');
    expect(generateDraft).toHaveBeenCalledWith(expect.any(String), 'chunked_k2', 'test-seed-42_c4');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FAIL-CLOSED
// ═══════════════════════════════════════════════════════════════════════════

describe('Fail-closed behavior', () => {
  it('throws on empty prose response', async () => {
    const provider = createMockProvider(['', '', '', '']);
    await expect(generateChunkedDraft(TEST_INPUT, provider)).rejects.toThrow('empty prose');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FORGE-TO-BRIEF
// ═══════════════════════════════════════════════════════════════════════════

describe('forgePacketToSceneBrief', () => {
  const minimalPacket = {
    packet_id: 'test-001',
    packet_hash: 'abc123',
    scene_id: 'scene-001',
    run_id: 'run-001',
    quality_tier: 'premium' as const,
    language: 'fr' as const,
    intent: {
      story_goal: 'Un homme cherche la vérité.',
      scene_goal: 'Il entre dans un bar et attend son contact.',
      conflict_type: 'internal',
      pov: '3p',
      tense: 'past',
      target_word_count: 3000,
    },
    emotion_contract: {
      curve_quartiles: [
        { quartile: 'Q1' as const, target_14d: {}, valence: -0.3, arousal: 0.4, dominant: 'attente', narrative_instruction: '' },
        { quartile: 'Q2' as const, target_14d: {}, valence: -0.5, arousal: 0.6, dominant: 'tension', narrative_instruction: '' },
        { quartile: 'Q3' as const, target_14d: {}, valence: -0.7, arousal: 0.8, dominant: 'colère', narrative_instruction: '' },
        { quartile: 'Q4' as const, target_14d: {}, valence: -0.2, arousal: 0.3, dominant: 'résignation', narrative_instruction: '' },
      ],
      intensity_range: { min: 0.3, max: 0.8 },
      tension: {} as any,
      terminal_state: {} as any,
      rupture: {} as any,
      valence_arc: {} as any,
    },
    beats: [
      { beat_id: 'b1', beat_order: 1, action: 'Il pousse la porte du bar.', dialogue: '', subtext_type: '', emotion_instruction: '', sensory_tags: [], canon_refs: [] },
      { beat_id: 'b2', beat_order: 2, action: 'Il s\'assoit au comptoir.', dialogue: '', subtext_type: '', emotion_instruction: '', sensory_tags: [], canon_refs: [] },
    ],
    subtext: {} as any,
    sensory: {} as any,
    style_genome: {
      version: '1.0',
      universe: 'noir',
      lexicon: { signature_words: ['ombre'], forbidden_words: [], abstraction_max_ratio: 0.3, concrete_min_ratio: 0.5 },
      rhythm: {} as any,
      tone: {} as any,
      imagery: {} as any,
    },
    kill_lists: {} as any,
    canon: [],
    continuity: {} as any,
    seeds: { llm_seed: 'seed-42', determinism_level: 'high' as const },
    generation: {} as any,
  };

  it('contains the scene_goal', () => {
    const brief = forgePacketToSceneBrief(minimalPacket as any);
    expect(brief).toContain('Il entre dans un bar');
  });

  it('contains beat actions', () => {
    const brief = forgePacketToSceneBrief(minimalPacket as any);
    expect(brief).toContain('pousse la porte');
  });

  it('contains emotional arc (Q1 → Q4)', () => {
    const brief = forgePacketToSceneBrief(minimalPacket as any);
    expect(brief).toContain('attente');
    expect(brief).toContain('résignation');
  });

  it('contains no system IDs', () => {
    const brief = forgePacketToSceneBrief(minimalPacket as any);
    expect(brief).not.toContain('test-001');
    expect(brief).not.toContain('scene-001');
    expect(brief).not.toContain('beat_id');
    expect(brief).not.toMatch(/cf-|canon-/);
  });

  it('contains no JSON syntax', () => {
    const brief = forgePacketToSceneBrief(minimalPacket as any);
    expect(brief).not.toMatch(/[{}[\]]/);
  });

  it('output ≤ 600 chars (INV-CDE-01 proxy)', () => {
    const brief = forgePacketToSceneBrief(minimalPacket as any);
    expect(brief.length).toBeLessThanOrEqual(600);
  });
});
