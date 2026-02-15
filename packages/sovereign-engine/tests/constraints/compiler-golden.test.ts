import { describe, it, expect } from 'vitest';
import { compilePhysicsSection } from '../../src/constraints/constraint-compiler.js';
import { computeForgeEmotionBrief, DEFAULT_CANONICAL_TABLE } from '@omega/omega-forge';
import { SOVEREIGN_CONFIG } from '../../src/config.js';
import type { PhysicsCompilerConfig } from '../../src/constraints/types.js';

const GOLDEN_BRIEF_PARAMS = {
  waypoints: [
    { position: 0.0, emotion: 'trust', intensity: 0.3 },
    { position: 0.5, emotion: 'fear', intensity: 0.8 },
    { position: 1.0, emotion: 'sadness', intensity: 0.5 },
  ],
  sceneStartPct: 0.0,
  sceneEndPct: 1.0,
  totalParagraphs: 12,
  canonicalTable: DEFAULT_CANONICAL_TABLE,
  persistenceCeiling: SOVEREIGN_CONFIG.PERSISTENCE_CEILING,
  language: 'fr' as const,
  producerBuildHash: 'golden-sprint2',
};

const GOLDEN_CONFIG: PhysicsCompilerConfig = {
  physics_prompt_budget_tokens: SOVEREIGN_CONFIG.PHYSICS_PROMPT_BUDGET_TOKENS,
  physics_prompt_tokenizer_id: SOVEREIGN_CONFIG.PHYSICS_PROMPT_TOKENIZER_ID,
  top_k_emotions: SOVEREIGN_CONFIG.PHYSICS_TOP_K_EMOTIONS,
  top_k_transitions: SOVEREIGN_CONFIG.PHYSICS_TOP_K_TRANSITIONS,
  top_k_prescriptions: SOVEREIGN_CONFIG.PHYSICS_TOP_K_PRESCRIPTIONS,
};

describe('compiler-golden', () => {
  it('golden hash is stable', () => {
    const brief = computeForgeEmotionBrief(GOLDEN_BRIEF_PARAMS);
    const compiled = compilePhysicsSection(brief, GOLDEN_CONFIG);

    // GOLDEN HASH — FROZEN (Sprint 2 — Commit 2.3)
    // This value is deterministic proof of correct constraint compilation.
    // If this hash changes, it indicates a regression in the compiler.
    const GOLDEN_HASH = '7a31ae3f4c82f1d6f46337fb878544309fd1728304c5bb2e7e6e894c608b7b0e';

    expect(compiled.section_hash).toBe(GOLDEN_HASH);
  });
});
