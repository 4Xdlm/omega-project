/**
 * OMEGA — Voice Genome Prompt Injection Tests
 * Invariant: VOICE-PROMPT-01..03
 *
 * Verifies that buildStyleGenomeSection injects voice genome targets
 * when packet.style_genome.voice is defined.
 */

import { describe, it, expect } from 'vitest';
import { buildSovereignPrompt } from '../../src/input/prompt-assembler-v2.js';
import { createTestPacket } from '../helpers/test-packet-factory.js';
import type { VoiceGenome } from '../../src/voice/voice-genome.js';

const TEST_VOICE: VoiceGenome = {
  phrase_length_mean: 0.45,
  dialogue_ratio: 0.25,
  metaphor_density: 0.60,
  language_register: 0.80,
  irony_level: 0.15,
  ellipsis_rate: 0.30,
  abstraction_ratio: 0.35,
  punctuation_style: 0.55,
  paragraph_rhythm: 0.70,
  opening_variety: 0.65,
};

describe('Voice Genome Prompt Injection', () => {
  it('VOICE-PROMPT-01: injects all 10 voice genome parameters when voice defined', () => {
    const packet = createTestPacket({
      style_genome_voice: TEST_VOICE,
    });
    const prompt = buildSovereignPrompt(packet);
    const fullText = prompt.sections.map(s => s.content).join('\n');

    // All 10 params must appear with their values
    expect(fullText).toContain('Voice Genome Target');
    expect(fullText).toContain('0.45'); // phrase_length_mean
    expect(fullText).toContain('0.25'); // dialogue_ratio
    expect(fullText).toContain('0.60'); // metaphor_density
    expect(fullText).toContain('0.80'); // language_register
    expect(fullText).toContain('0.15'); // irony_level
    expect(fullText).toContain('0.30'); // ellipsis_rate
    expect(fullText).toContain('0.35'); // abstraction_ratio
    expect(fullText).toContain('0.55'); // punctuation_style
    expect(fullText).toContain('0.70'); // paragraph_rhythm
    expect(fullText).toContain('0.65'); // opening_variety
    expect(fullText).toContain('±10%');
  });

  it('VOICE-PROMPT-02: NO voice genome section when voice is undefined', () => {
    const packet = createTestPacket(); // no voice
    const prompt = buildSovereignPrompt(packet);
    const fullText = prompt.sections.map(s => s.content).join('\n');

    expect(fullText).not.toContain('Voice Genome Target');
  });

  it('VOICE-PROMPT-03: deterministic — same voice genome = same prompt hash', () => {
    const packet = createTestPacket({
      style_genome_voice: TEST_VOICE,
    });
    const prompt1 = buildSovereignPrompt(packet);
    const prompt2 = buildSovereignPrompt(packet);

    expect(prompt1.prompt_hash).toBe(prompt2.prompt_hash);
  });
});
