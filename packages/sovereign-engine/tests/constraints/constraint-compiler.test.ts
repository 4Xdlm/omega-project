import { describe, it, expect } from 'vitest';
import { compilePhysicsSection } from '../../src/constraints/constraint-compiler.js';
import { countTokens } from '../../src/constraints/token-counter.js';
import { computeForgeEmotionBrief, DEFAULT_CANONICAL_TABLE } from '@omega/omega-forge';
import { SOVEREIGN_CONFIG } from '../../src/config.js';
import type { PhysicsCompilerConfig } from '../../src/constraints/types.js';

const BRIEF_PARAMS = {
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
  producerBuildHash: 'test-sprint2',
};

const CFG: PhysicsCompilerConfig = {
  physics_prompt_budget_tokens: SOVEREIGN_CONFIG.PHYSICS_PROMPT_BUDGET_TOKENS,
  physics_prompt_tokenizer_id: SOVEREIGN_CONFIG.PHYSICS_PROMPT_TOKENIZER_ID,
  top_k_emotions: SOVEREIGN_CONFIG.PHYSICS_TOP_K_EMOTIONS,
  top_k_transitions: SOVEREIGN_CONFIG.PHYSICS_TOP_K_TRANSITIONS,
  top_k_prescriptions: SOVEREIGN_CONFIG.PHYSICS_TOP_K_PRESCRIPTIONS,
};

describe('constraint-compiler', () => {
  const brief = computeForgeEmotionBrief(BRIEF_PARAMS);

  it('produces valid CompiledPhysicsSection', () => {
    const c = compilePhysicsSection(brief, CFG);
    expect(c.text).toContain('PHYSICS (COMPILED)');
    expect(c.token_count).toBeGreaterThan(0);
    expect(c.section_hash.length).toBe(64);
    expect(c.constraints.length).toBeGreaterThan(0);
    expect(c.used_signal_ids.length).toBeGreaterThan(0);
  });

  it('COMPILE-01: budget respected', () => {
    const c = compilePhysicsSection(brief, CFG);
    expect(c.token_count).toBeLessThanOrEqual(CFG.physics_prompt_budget_tokens);
  });

  it('COMPILE-02: determinism (same brief → same hash)', () => {
    const a = compilePhysicsSection(brief, CFG);
    const b = compilePhysicsSection(brief, CFG);
    expect(a.section_hash).toBe(b.section_hash);
    expect(a.text).toBe(b.text);
  });

  it('no raw vectors in output', () => {
    const c = compilePhysicsSection(brief, CFG);
    expect(c.text).not.toMatch(/target_14d/);
    expect(c.text).not.toMatch(/target_omega/);
    expect(c.text).not.toMatch(/\bXYZ\b/);
    expect(c.text).not.toMatch(/\b14D\b/);
    expect(c.text).not.toMatch(/\[\s*0\.\d+\s*,/);
  });

  it('throws if budget <= 0', () => {
    expect(() => compilePhysicsSection(brief, { ...CFG, physics_prompt_budget_tokens: 0 }))
      .toThrow('COMPILE FAIL');
  });

  it('throws if tokenizer_id empty', () => {
    expect(() => compilePhysicsSection(brief, { ...CFG, physics_prompt_tokenizer_id: '' }))
      .toThrow('COMPILE FAIL');
  });

  it('throws if CRITICAL exceeds tiny budget', () => {
    expect(() => compilePhysicsSection(brief, { ...CFG, physics_prompt_budget_tokens: 10 }))
      .toThrow('CRITICAL constraints alone exceed budget');
  });

  it('tight budget: CRITICAL always included first', () => {
    const c = compilePhysicsSection(brief, { ...CFG, physics_prompt_budget_tokens: 300 });
    const hasCritical = c.constraints.some((x) => x.priority === 'CRITICAL');
    expect(hasCritical).toBe(true);
    expect(c.token_count).toBeLessThanOrEqual(300);
  });

  it('every constraint has source_signal_ids', () => {
    const c = compilePhysicsSection(brief, CFG);
    for (const x of c.constraints) expect(x.source_signal_ids.length).toBeGreaterThan(0);
  });
});

describe('token-counter', () => {
  it('returns positive for non-empty', () => {
    expect(countTokens('hello', 'chars_div_4')).toBeGreaterThan(0);
  });
  it('is deterministic', () => {
    const t = 'Le gardien scruta la mer.';
    expect(countTokens(t, 'chars_div_4')).toBe(countTokens(t, 'chars_div_4'));
  });
  it('throws on empty tokenizerId', () => {
    expect(() => countTokens('x', '')).toThrow();
  });
  it('throws on unknown tokenizerId', () => {
    expect(() => countTokens('x', 'gpt-4o')).toThrow();
  });
});
