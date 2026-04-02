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
  });

  it('should not be active by default', () => {
    expect(isV5Active()).toBe(false);
  });

  it('should be active when OMEGA_PROMPT_V5=1', () => {
    process.env.OMEGA_PROMPT_V5 = '1';
    expect(isV5Active()).toBe(true);
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
});
