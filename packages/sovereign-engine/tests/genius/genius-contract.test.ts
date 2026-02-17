/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA GENIUS ENGINE — PROMPT CONTRACT COMPILER TESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Sprint: GENIUS-01
 * Tests: TEST-G01-01 to TEST-G01-12
 * Invariants: GENIUS-13 (priority order in output)
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * ANTI-DOUBLON: These tests verify the compiler only. No M scores consumed.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import {
  compileGeniusContract,
  getAntiPatternVersion,
  getPriorityOrder,
  type GeniusContractInput,
  type AuthorFingerprint,
  type Exemplar,
  type NarrativeShape,
} from '../../src/genius/genius-contract-compiler.js';
import type { ForgePacket } from '../../src/types.js';
import type { VoiceGenome } from '../../src/voice/voice-genome.js';

// ═══════════════════════════════════════════════════════════════════════════════
// FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

function makeForgePacket(overrides?: Partial<ForgePacket>): ForgePacket {
  return {
    packet_id: 'test-packet-001',
    packet_hash: 'abc123',
    scene_id: 'scene-test-01',
    run_id: 'run-test-01',
    quality_tier: 'sovereign',
    language: 'fr',
    intent: {
      story_goal: 'Test story goal',
      scene_goal: 'Test scene goal',
      conflict_type: 'internal',
      pov: 'third-limited',
      tense: 'past',
      target_word_count: 2000,
    },
    emotion_contract: {
      curve_quartiles: [
        { quartile: 'Q1', target_14d: { fear: 0.3 }, valence: -0.2, arousal: 0.4, dominant: 'apprehension', narrative_instruction: 'Install tension subtly' },
        { quartile: 'Q2', target_14d: { fear: 0.5 }, valence: -0.4, arousal: 0.6, dominant: 'anxiety', narrative_instruction: 'Increase pressure' },
        { quartile: 'Q3', target_14d: { fear: 0.8 }, valence: -0.7, arousal: 0.9, dominant: 'terror', narrative_instruction: 'Peak emotional intensity' },
        { quartile: 'Q4', target_14d: { fear: 0.2 }, valence: -0.1, arousal: 0.3, dominant: 'relief', narrative_instruction: 'Release and resolve' },
      ],
      intensity_range: { min: 0.3, max: 0.9 },
      tension: {
        slope_target: 'ascending',
        pic_position_pct: 0.75,
        faille_position_pct: 0.85,
        silence_zones: [],
      },
      terminal_state: {
        target_14d: { relief: 0.6 },
        valence: 0.1,
        arousal: 0.3,
        dominant: 'relief',
        reader_state: 'exhausted but hopeful',
      },
      rupture: {
        exists: true,
        position_pct: 0.7,
        before_dominant: 'anxiety',
        after_dominant: 'terror',
        delta_valence: -0.3,
      },
      valence_arc: {
        start: -0.2,
        end: 0.1,
        direction: 'darkening',
      },
    },
    beats: [
      { beat_id: 'beat-1', beat_order: 0, action: 'Enter room', dialogue: '', subtext_type: 'tension', emotion_instruction: 'Build unease', sensory_tags: ['visual', 'sound'], canon_refs: [] },
      { beat_id: 'beat-2', beat_order: 1, action: 'Discover evidence', dialogue: '', subtext_type: 'revelation', emotion_instruction: 'Shock', sensory_tags: ['touch'], canon_refs: ['CANON-01'] },
    ],
    subtext: {
      layers: [{ layer_id: 'sub-1', type: 'irony', statement: 'Character thinks they are safe', visibility: 'buried' }],
      tension_type: 'dramatic_irony',
      tension_intensity: 0.7,
    },
    sensory: {
      density_target: 3,
      categories: [
        { category: 'sight', min_count: 5, signature_words: ['ombre', 'lumière'] },
        { category: 'sound', min_count: 3, signature_words: ['silence', 'écho'] },
        { category: 'touch', min_count: 2, signature_words: ['froid', 'rugueux'] },
      ],
      recurrent_motifs: ['ombre', 'miroir'],
      banned_metaphors: ['comme un ange'],
    },
    style_genome: {
      version: '1.0.0',
      universe: 'omega-test',
      lexicon: {
        signature_words: ['abîme', 'fracture', 'incandescent'],
        forbidden_words: ['magnifique', 'incroyable'],
        abstraction_max_ratio: 0.25,
        concrete_min_ratio: 0.6,
      },
      rhythm: {
        avg_sentence_length_target: 15,
        gini_target: 0.45,
        max_consecutive_similar: 2,
        min_syncopes_per_scene: 2,
        min_compressions_per_scene: 1,
      },
      tone: {
        dominant_register: 'soutenu',
        intensity_range: [0.4, 0.8],
      },
      imagery: {
        recurrent_motifs: ['ombre', 'miroir', 'fissure'],
        density_target_per_100_words: 3,
        banned_metaphors: ['comme un ange'],
      },
    },
    kill_lists: {
      banned_words: ['magnifique'],
      banned_cliches: ['au crépuscule de sa vie'],
      banned_ai_patterns: ['il est important de noter'],
      banned_filter_words: ['très', 'vraiment', 'littéralement'],
    },
    canon: [
      { id: 'CANON-01', statement: 'The protagonist is left-handed' },
    ],
    continuity: {
      previous_scene_summary: 'Character arrived at the mansion',
      character_states: [
        { character_id: 'char-1', character_name: 'Marc', emotional_state: 'tense', physical_state: 'tired', location: 'entrance hall' },
      ],
      open_threads: ['Missing letter'],
    },
    seeds: {
      llm_seed: 'seed-42',
      determinism_level: 'high',
    },
    generation: {
      timestamp: '2026-02-17T22:00:00Z',
      generator_version: '3.155.0',
      constraints_hash: 'hash-xyz',
    },
    ...overrides,
  } as ForgePacket;
}

function makeVoiceGenome(): VoiceGenome {
  return {
    phrase_length_mean: 0.5,
    dialogue_ratio: 0.3,
    metaphor_density: 0.4,
    language_register: 0.7,
    irony_level: 0.2,
    ellipsis_rate: 0.3,
    abstraction_ratio: 0.4,
    punctuation_style: 0.5,
    paragraph_rhythm: 0.6,
    opening_variety: 0.7,
  };
}

function makeAuthorFingerprint(): AuthorFingerprint {
  return {
    author_id: 'camus-albert',
    rhythm_distribution: {
      bucket_lt5: 10,
      bucket_5_10: 25,
      bucket_10_15: 30,
      bucket_15_20: 20,
      bucket_20_25: 10,
      bucket_gt25: 5,
    },
    signature_words: ['absurde', 'soleil', 'indifférence', 'mer', 'lumière'],
    register: 'littéraire',
    dialogue_silence_ratio: 0.2,
    avg_sentence_length: 14,
  };
}

function makeOriginalInput(overrides?: Partial<GeniusContractInput>): GeniusContractInput {
  return {
    forgePacket: makeForgePacket(),
    mode: 'original',
    antiPatternVersion: getAntiPatternVersion(),
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('GENIUS-01 — Prompt Contract Compiler', () => {
  // ─── TEST-G01-01 ─────────────────────────────────────────────────────
  it('TEST-G01-01: Prompt contient 8 sections dans l\'ordre [0]→[7]', () => {
    const result = compileGeniusContract(makeOriginalInput());

    // 8 sections + priority hierarchy + noncompliance = 10 total
    expect(result.sections.length).toBe(10);

    // Verify section IDs in order
    const expectedIds = [
      'genius_anti_pattern',     // [0]
      'genius_structure',        // [1]
      'genius_lexical',          // [2]
      'genius_rhythm',           // [3]
      'genius_emotion',          // [4]
      'genius_voice',            // [5]
      'genius_soft',             // [6]
      'genius_freedom',          // [7]
      'genius_priority_hierarchy',
      'genius_noncompliance',
    ];

    for (let i = 0; i < expectedIds.length; i++) {
      expect(result.sections[i].section_id).toBe(expectedIds[i]);
    }
  });

  // ─── TEST-G01-02 ─────────────────────────────────────────────────────
  it('TEST-G01-02: Hiérarchie de résolution présente (texte exact)', () => {
    const result = compileGeniusContract(makeOriginalInput());
    const hierarchySection = result.sections.find(s => s.section_id === 'genius_priority_hierarchy');

    expect(hierarchySection).toBeDefined();
    expect(hierarchySection!.content).toContain('Authenticité');
    expect(hierarchySection!.content).toContain('Émotion');
    expect(hierarchySection!.content).toContain('Structure');
    expect(hierarchySection!.content).toContain('Rythme');
    expect(hierarchySection!.content).toContain('Lexique');

    // Verify order in the priority list
    const content = hierarchySection!.content;
    const authIdx = content.indexOf('Authenticité');
    const emotIdx = content.indexOf('Émotion');
    const structIdx = content.indexOf('Structure');
    const rhythmIdx = content.indexOf('Rythme');
    const lexIdx = content.indexOf('Lexique');

    expect(authIdx).toBeLessThan(emotIdx);
    expect(emotIdx).toBeLessThan(structIdx);
    expect(structIdx).toBeLessThan(rhythmIdx);
    expect(rhythmIdx).toBeLessThan(lexIdx);
  });

  // ─── TEST-G01-03 ─────────────────────────────────────────────────────
  it('TEST-G01-03: Escape hatch NONCOMPLIANCE injecté', () => {
    const result = compileGeniusContract(makeOriginalInput());
    const ncSection = result.sections.find(s => s.section_id === 'genius_noncompliance');

    expect(ncSection).toBeDefined();
    expect(ncSection!.content).toContain('NONCOMPLIANCE:');
    expect(ncSection!.content).toContain('[section]');
    expect(ncSection!.content).toContain('[raison]');
    expect(result.prompt).toContain('NONCOMPLIANCE');
  });

  // ─── TEST-G01-04 ─────────────────────────────────────────────────────
  it('TEST-G01-04: Mode original → contraintes rythme universelles', () => {
    const result = compileGeniusContract(makeOriginalInput());
    const rhythmSection = result.sections.find(s => s.section_id === 'genius_rhythm');

    expect(rhythmSection).toBeDefined();
    expect(rhythmSection!.content).toContain('25-35%');
    expect(rhythmSection!.content).toContain('15-25%');
    expect(rhythmSection!.content).toContain('universelles');
    // Must NOT contain author fingerprint
    expect(rhythmSection!.content).not.toContain('calqué sur l\'auteur');
  });

  // ─── TEST-G01-05 ─────────────────────────────────────────────────────
  it('TEST-G01-05: Mode continuation → rythme = fingerprint auteur ±10%', () => {
    const input = makeOriginalInput({
      mode: 'continuation',
      voiceGenome: makeVoiceGenome(),
      authorFingerprint: makeAuthorFingerprint(),
    });

    const result = compileGeniusContract(input);
    const rhythmSection = result.sections.find(s => s.section_id === 'genius_rhythm');

    expect(rhythmSection).toBeDefined();
    expect(rhythmSection!.content).toContain('±10%');
    expect(rhythmSection!.content).toContain('camus-albert');
    expect(rhythmSection!.content).toContain('CONTINUATION');
    // Should contain author's actual distribution values
    expect(rhythmSection!.content).toContain('10%'); // bucket_lt5
    expect(rhythmSection!.content).toContain('25%'); // bucket_5_10
    // Must NOT contain universal constraints
    expect(rhythmSection!.content).not.toContain('25-35%');
  });

  // ─── TEST-G01-06 ─────────────────────────────────────────────────────
  it('TEST-G01-06: Mode continuation sans fingerprint → throw Error', () => {
    const input = makeOriginalInput({
      mode: 'continuation',
      voiceGenome: makeVoiceGenome(),
      // authorFingerprint intentionally omitted
    });

    expect(() => compileGeniusContract(input)).toThrow(
      'GENIUS-CONTRACT: mode=continuation requires authorFingerprint'
    );
  });

  // ─── TEST-G01-07 ─────────────────────────────────────────────────────
  it('TEST-G01-07: Mode continuation sans voiceGenome → throw Error', () => {
    const input = makeOriginalInput({
      mode: 'continuation',
      authorFingerprint: makeAuthorFingerprint(),
      // voiceGenome intentionally omitted
    });

    expect(() => compileGeniusContract(input)).toThrow(
      'GENIUS-CONTRACT: mode=continuation requires voiceGenome'
    );
  });

  // ─── TEST-G01-08 ─────────────────────────────────────────────────────
  it('TEST-G01-08: Anti-pattern blacklist versionnée et injectée', () => {
    const result = compileGeniusContract(makeOriginalInput());
    const apSection = result.sections.find(s => s.section_id === 'genius_anti_pattern');

    expect(apSection).toBeDefined();
    // Version present
    expect(apSection!.content).toContain('AS_PATTERNS_V1');
    // Patterns injected
    expect(apSection!.content).toContain('tisserande des mots');
    expect(apSection!.content).toContain('INTERDIT');
    expect(apSection!.content).toContain('REJECT immédiat');
    // ForgePacket kill_lists merged
    expect(apSection!.content).toContain('il est important de noter');
    // Output has correct version
    expect(result.antiPatternVersion).toBe('AS_PATTERNS_V1');
  });

  // ─── TEST-G01-09 ─────────────────────────────────────────────────────
  it('TEST-G01-09: NarrativeShape injecté si spécifié', () => {
    const input = makeOriginalInput({
      narrativeShape: 'ThreatReveal',
    });

    const result = compileGeniusContract(input);
    const structSection = result.sections.find(s => s.section_id === 'genius_structure');

    expect(structSection).toBeDefined();
    expect(structSection!.content).toContain('ThreatReveal');
    expect(structSection!.content).toContain('Installation + fausse sécurité');
    expect(structSection!.content).toContain('Révélation + bascule');
  });

  // ─── TEST-G01-10 ─────────────────────────────────────────────────────
  it('TEST-G01-10: NarrativeShape absent → "aligné sur courbe 14D" injecté', () => {
    const input = makeOriginalInput({
      // narrativeShape intentionally omitted
    });

    const result = compileGeniusContract(input);
    const structSection = result.sections.find(s => s.section_id === 'genius_structure');

    expect(structSection).toBeDefined();
    expect(structSection!.content).toContain('aligné sur courbe 14D');
    expect(structSection!.content).toContain('AUTO');
    // Should contain quartile instructions from emotion contract
    expect(structSection!.content).toContain('apprehension');
  });

  // ─── TEST-G01-11 ─────────────────────────────────────────────────────
  it('TEST-G01-11: Exemplars injectés dans section [7] si fournis', () => {
    const exemplars: Exemplar[] = [
      { text: 'Les ombres rampaient sur les murs comme des doigts crispés.', score: 95, source: 'golden-run-001' },
      { text: 'Le silence pesait, dense, minéral.', score: 92, source: 'golden-run-002' },
    ];

    const input = makeOriginalInput({ exemplars });
    const result = compileGeniusContract(input);
    const freedomSection = result.sections.find(s => s.section_id === 'genius_freedom');

    expect(freedomSection).toBeDefined();
    expect(freedomSection!.content).toContain('Exemplar 1');
    expect(freedomSection!.content).toContain('score: 95');
    expect(freedomSection!.content).toContain('golden-run-001');
    expect(freedomSection!.content).toContain('Les ombres rampaient');
    expect(freedomSection!.content).toContain('Exemplar 2');
  });

  // ─── TEST-G01-12 ─────────────────────────────────────────────────────
  it('TEST-G01-12: Invariant GENIUS-13 (priority order présent dans output)', () => {
    const result = compileGeniusContract(makeOriginalInput());

    // Priority order must be in the output object
    expect(result.priorityOrder).toBeDefined();
    expect(result.priorityOrder).toEqual([
      'Authenticité',
      'Émotion',
      'Structure',
      'Rythme',
      'Lexique',
    ]);

    // Cross-check with getPriorityOrder()
    expect(result.priorityOrder).toEqual(getPriorityOrder());

    // Priority order must also be in the prompt text
    expect(result.prompt).toContain('Authenticité');
    expect(result.prompt).toContain('Émotion');
    expect(result.prompt).toContain('Structure');
    expect(result.prompt).toContain('Rythme');
    expect(result.prompt).toContain('Lexique');
  });

  // ─── ADDITIONAL VALIDATION TESTS ─────────────────────────────────────
  describe('Additional validation', () => {
    it('Determinism: same input → same promptHash', () => {
      const input = makeOriginalInput({ narrativeShape: 'SlowBurn' });
      const result1 = compileGeniusContract(input);
      const result2 = compileGeniusContract(input);

      expect(result1.promptHash).toBe(result2.promptHash);
      expect(result1.prompt).toBe(result2.prompt);
    });

    it('Anti-pattern version mismatch → throw Error', () => {
      const input = makeOriginalInput({
        antiPatternVersion: 'WRONG_VERSION',
      });

      expect(() => compileGeniusContract(input)).toThrow('antiPatternVersion mismatch');
    });

    it('Exemplar score < 90 → throw Error', () => {
      const input = makeOriginalInput({
        exemplars: [{ text: 'Low quality text', score: 75, source: 'bad' }],
      });

      expect(() => compileGeniusContract(input)).toThrow('exemplar score must be >= 90');
    });

    it('Mode enhancement with voiceGenome → uses as guide', () => {
      const input = makeOriginalInput({
        mode: 'enhancement',
        voiceGenome: makeVoiceGenome(),
      });

      const result = compileGeniusContract(input);
      const voiceSection = result.sections.find(s => s.section_id === 'genius_voice');

      expect(voiceSection).toBeDefined();
      expect(voiceSection!.content).toContain('ENHANCEMENT');
      expect(voiceSection!.content).toContain('GUIDE');
      expect(voiceSection!.content).toContain('V_floor = 75');
    });

    it('All 5 NarrativeShapes compile without error', () => {
      const shapes: NarrativeShape[] = ['ThreatReveal', 'SlowBurn', 'Spiral', 'StaticPressure', 'Contemplative'];
      for (const shape of shapes) {
        const input = makeOriginalInput({ narrativeShape: shape });
        const result = compileGeniusContract(input);
        expect(result.sections.length).toBe(10);
        expect(result.prompt).toContain(shape);
      }
    });

    it('constraintsInjected > 0', () => {
      const result = compileGeniusContract(makeOriginalInput());
      expect(result.constraintsInjected).toBeGreaterThan(0);
    });

    it('Recurrent motifs from ForgePacket injected in section [7]', () => {
      const result = compileGeniusContract(makeOriginalInput());
      const freedomSection = result.sections.find(s => s.section_id === 'genius_freedom');

      expect(freedomSection).toBeDefined();
      expect(freedomSection!.content).toContain('ombre');
      expect(freedomSection!.content).toContain('miroir');
      expect(freedomSection!.content).toContain('fissure');
    });

    it('Emotion contract rupture data injected in section [4]', () => {
      const result = compileGeniusContract(makeOriginalInput());
      const emotionSection = result.sections.find(s => s.section_id === 'genius_emotion');

      expect(emotionSection).toBeDefined();
      expect(emotionSection!.content).toContain('Rupture');
      expect(emotionSection!.content).toContain('70%');
      expect(emotionSection!.content).toContain('anxiety');
      expect(emotionSection!.content).toContain('terror');
    });
  });
});
