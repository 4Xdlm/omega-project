/**
 * Tests for prompt-assembler-v5 (V5 Bridge-Driven)
 * Date: 2026-04-02
 */
import { describe, it, expect, afterEach } from 'vitest';
import { isV5Active, buildSovereignPrompt_V5 } from '../../src/input/prompt-assembler-v5.js';
import { buildSovereignPrompt_V4 } from '../../src/input/prompt-assembler-v4.js';
import { MINIMAL_FORGE_PACKET } from './__fixtures__/minimal-forge-packet.js';
import type { SymbolMap } from '../../src/symbol/symbol-map-types.js';

// Minimal SymbolMap for testing
const MOCK_SYMBOL_MAP: SymbolMap = {
  quartiles: [
    { label: 'Q1', signature_hooks: ['ombre', 'silence'], emotion: 'fear', imagery_mode: 'stark' },
    { label: 'Q2', signature_hooks: ['lueur', 'fissure'], emotion: 'sadness', imagery_mode: 'dense' },
    { label: 'Q3', signature_hooks: ['eclat', 'fracture'], emotion: 'anger', imagery_mode: 'stark' },
    { label: 'Q4', signature_hooks: ['cendres', 'aube'], emotion: 'anticipation', imagery_mode: 'sparse' },
  ],
  global: {
    palette: ['ombre', 'silence', 'lueur', 'fissure', 'eclat', 'cendres'],
    motifs: ['darkness', 'threshold'],
    anti_cliche: [],
    sensory_quotas: {
      sight: 3, sound: 2, touch: 1, smell: 0, taste: 0, proprioception: 0, interoception: 0,
    },
    syntax: { target_cv: 0.6, target_subordination: 'medium' },
  },
} as unknown as SymbolMap;

describe('prompt-assembler-v5', () => {
  afterEach(() => {
    delete process.env.OMEGA_PROMPT_V5;
    delete process.env.OMEGA_PROMPT_V4;
    delete process.env.OMEGA_PROMPT_V4_FORCE;
  });

  // ── Bridge-03: V5 default ON ──

  it('Bridge-03: V5 is active by default (production mode)', () => {
    expect(isV5Active()).toBe(true);
  });

  it('Bridge-03: V5 disabled when OMEGA_PROMPT_V5=0', () => {
    process.env.OMEGA_PROMPT_V5 = '0';
    expect(isV5Active()).toBe(false);
  });

  it('Bridge-03: V5 disabled when OMEGA_PROMPT_V4_FORCE=1 (V4 fallback)', () => {
    process.env.OMEGA_PROMPT_V4_FORCE = '1';
    expect(isV5Active()).toBe(false);
  });

  it('Bridge-03: legacy OMEGA_PROMPT_V5=1 still works', () => {
    process.env.OMEGA_PROMPT_V5 = '1';
    expect(isV5Active()).toBe(true);
  });

  it('Bridge-03: V4_FORCE takes priority over V5=1', () => {
    process.env.OMEGA_PROMPT_V5 = '1';
    process.env.OMEGA_PROMPT_V4_FORCE = '1';
    expect(isV5Active()).toBe(false);
  });

  it('should build a valid V5 prompt', () => {
    process.env.OMEGA_PROMPT_V4 = '1';
    const prompt = buildSovereignPrompt_V5(MINIMAL_FORGE_PACKET, MOCK_SYMBOL_MAP);

    expect(prompt.sections).toHaveLength(1);
    expect(prompt.sections[0].section_id).toBe('v5_bridge');
    expect(prompt.total_length).toBeGreaterThan(0);
    expect(prompt.prompt_hash).toBeTruthy();
  });

  it('should contain Rosetta Bridge directives', () => {
    process.env.OMEGA_PROMPT_V4 = '1';
    const prompt = buildSovereignPrompt_V5(MINIMAL_FORGE_PACKET, MOCK_SYMBOL_MAP);
    const content = prompt.sections[0].content;

    expect(content).toContain('Rosetta Bridge');
    expect(content).toContain('features pilot');
  });

  it('should NOT contain V4 hardcoded Rosetta constraints', () => {
    process.env.OMEGA_PROMPT_V4 = '1';
    const prompt = buildSovereignPrompt_V5(MINIMAL_FORGE_PACKET, MOCK_SYMBOL_MAP);
    const content = prompt.sections[0].content;

    // V4 hardcoded pattern should be replaced
    expect(content).not.toContain('calibr\u00e9es sur 450 tests');
  });

  it('V5 should be shorter or similar to V4 (fewer directives)', () => {
    process.env.OMEGA_PROMPT_V4 = '1';
    const v4 = buildSovereignPrompt_V4(MINIMAL_FORGE_PACKET, MOCK_SYMBOL_MAP);
    const v5 = buildSovereignPrompt_V5(MINIMAL_FORGE_PACKET, MOCK_SYMBOL_MAP);

    // V5 replaces 7 directives with ~3, should be similar or shorter
    // Allow ±20% tolerance
    const ratio = v5.total_length / v4.total_length;
    expect(ratio).toBeLessThan(1.2);
    expect(ratio).toBeGreaterThan(0.7);
  });

  it('V4 and V5 should have different hashes', () => {
    process.env.OMEGA_PROMPT_V4 = '1';
    const v4 = buildSovereignPrompt_V4(MINIMAL_FORGE_PACKET, MOCK_SYMBOL_MAP);
    const v5 = buildSovereignPrompt_V5(MINIMAL_FORGE_PACKET, MOCK_SYMBOL_MAP);

    expect(v5.prompt_hash).not.toBe(v4.prompt_hash);
  });

  // ── Bridge-02 tests (Phase 2: 5 features) ──

  describe('Bridge-02 — Phase 2 prompt injection', () => {
    it('BR02-V5-01: V5.1 version should be 5.1.0', async () => {
      const { PROMPT_ASSEMBLER_V5_VERSION } = await import('../../src/input/prompt-assembler-v5.js');
      expect(PROMPT_ASSEMBLER_V5_VERSION).toBe('5.1.0');
    });

    it('BR02-V5-02: V5 prompt should contain f29d directive (anti-repetition)', () => {
      process.env.OMEGA_PROMPT_V4 = '1';
      const prompt = buildSovereignPrompt_V5(MINIMAL_FORGE_PACKET, MOCK_SYMBOL_MAP);
      const content = prompt.sections[0].content;

      // f29d instruction should appear in the prompt
      expect(content).toMatch(/lexicale|TTR|r[ée]p[ée]tition/i);
    });

    it('BR02-V5-03: V5 prompt should contain f35c directive (hook/accroche)', () => {
      process.env.OMEGA_PROMPT_V4 = '1';
      const prompt = buildSovereignPrompt_V5(MINIMAL_FORGE_PACKET, MOCK_SYMBOL_MAP);
      const content = prompt.sections[0].content;

      // f35c instruction should appear in the prompt
      expect(content).toMatch(/accroche|tension|ouvre/i);
    });

    it('BR02-V5-04: V5 prompt must NOT contain f36c cliff directive', () => {
      process.env.OMEGA_PROMPT_V4 = '1';
      const prompt = buildSovereignPrompt_V5(MINIMAL_FORGE_PACKET, MOCK_SYMBOL_MAP);
      const content = prompt.sections[0].content;

      // f36c is token mort — must NOT be in the prompt
      expect(content).not.toContain('Suspense fin');
      expect(content).not.toMatch(/termine.*suspense/i);
    });

    it('BR02-V5-05: V5 prompt should report 5 features pilotees', () => {
      process.env.OMEGA_PROMPT_V4 = '1';
      const prompt = buildSovereignPrompt_V5(MINIMAL_FORGE_PACKET, MOCK_SYMBOL_MAP);
      const content = prompt.sections[0].content;

      expect(content).toContain('5 features pilot');
    });
  });

  // ── Phase toggle tests (isolation bench support) ──

  describe('Phase toggle — OMEGA_BRIDGE_PHASE', () => {
    afterEach(() => {
      delete process.env.OMEGA_BRIDGE_PHASE;
    });

    it('ISO-01: OMEGA_BRIDGE_PHASE=1 → 3 features (Phase 1 only)', () => {
      process.env.OMEGA_PROMPT_V4 = '1';
      process.env.OMEGA_BRIDGE_PHASE = '1';
      const prompt = buildSovereignPrompt_V5(MINIMAL_FORGE_PACKET, MOCK_SYMBOL_MAP);
      const content = prompt.sections[0].content;

      expect(content).toContain('3 features pilot');
      // f29d and f35c should NOT be present in Phase 1
      expect(content).not.toMatch(/lexicale|TTR/i);
      expect(content).not.toMatch(/accroche.*tension|ouvre.*tension/i);
    });

    it('ISO-02: OMEGA_BRIDGE_PHASE=2 → 5 features (Phase 2)', () => {
      process.env.OMEGA_PROMPT_V4 = '1';
      process.env.OMEGA_BRIDGE_PHASE = '2';
      const prompt = buildSovereignPrompt_V5(MINIMAL_FORGE_PACKET, MOCK_SYMBOL_MAP);
      const content = prompt.sections[0].content;

      expect(content).toContain('5 features pilot');
    });

    it('ISO-03: no OMEGA_BRIDGE_PHASE → defaults to Phase 2 (5 features)', () => {
      process.env.OMEGA_PROMPT_V4 = '1';
      delete process.env.OMEGA_BRIDGE_PHASE;
      const prompt = buildSovereignPrompt_V5(MINIMAL_FORGE_PACKET, MOCK_SYMBOL_MAP);
      const content = prompt.sections[0].content;

      expect(content).toContain('5 features pilot');
    });
  });
});
