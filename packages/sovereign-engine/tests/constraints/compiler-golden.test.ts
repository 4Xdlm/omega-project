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

    // GOLDEN HASH — UPDATED (Sprint 10 — Commit 10.5)
    // Updated to reflect emotion-to-action and contradiction integration.
    // This value is deterministic proof of correct constraint compilation.
    // If this hash changes, it indicates a regression in the compiler.
    const GOLDEN_HASH = '9cd782620de7ebab3125dd340496882ac81513a26794ec4fb4fc4ad37db2049e';

    expect(compiled.section_hash).toBe(GOLDEN_HASH);
  });
});
