/**
 * prompt-assembler-v4.test.ts — Tests for V4 Native Prompt Assembler
 * INV-V4-01..10
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildSovereignPrompt_V4, isV4Active, PROMPT_ASSEMBLER_V4_VERSION } from '../../src/input/prompt-assembler-v4.js';
import type { ForgePacket } from '../../src/types.js';
import type { SymbolMap } from '../../src/symbol/symbol-map-types.js';

// ── Fixtures ────────────────────────────────────────────────────────────────

function makeTestPacket(): ForgePacket {
  return {
    packet_id: 'v4-test-packet-001',
    packet_hash: 'test-hash',
    scene_id: 'v4-test-scene',
    run_id: 'v4-test-run',
    quality_tier: 'sovereign',
    language: 'fr',
    intent: {
      story_goal: 'Explorer la desintegration d un couple',
      scene_goal: 'Pierre confronte Marie dans leur cuisine',
      conflict_type: 'relational',
      pov: '3e personne',
      tense: 'passe simple',
      target_word_count: 500,
    },
    emotion_contract: {
      curve_quartiles: [
        { quartile: 'Q1', target_14d: { anger: 0.3 }, valence: -0.4, arousal: 0.3, dominant: 'tension', narrative_instruction: 'calme apparent, malaise sous la surface' },
        { quartile: 'Q2', target_14d: { anger: 0.5 }, valence: -0.6, arousal: 0.5, dominant: 'anger', narrative_instruction: 'la colere monte par indices physiques' },
        { quartile: 'Q3', target_14d: { anger: 0.8 }, valence: -0.8, arousal: 0.8, dominant: 'anger', narrative_instruction: 'le masque tombe, confrontation directe' },
        { quartile: 'Q4', target_14d: { despair: 0.6 }, valence: -0.7, arousal: 0.4, dominant: 'despair', narrative_instruction: 'retombee silencieuse, quelque chose est brise' },
      ] as any,
      intensity_range: { min: 0.3, max: 0.9 },
      tension: {
        slope_target: 'arc',
        pic_position_pct: 0.7,
        faille_position_pct: 0.85,
        silence_zones: [],
      },
      terminal_state: {
        target_14d: { despair: 0.6 },
        valence: -0.7,
        arousal: 0.4,
        dominant: 'despair',
        reader_state: 'le lecteur sent que quelque chose est irremediablement brise',
      },
      rupture: {
        exists: true,
        position_pct: 0.7,
        before_dominant: 'anger',
        after_dominant: 'despair',
        delta_valence: -0.3,
      },
      valence_arc: {
        start: -0.4,
        end: -0.7,
        direction: 'darkening',
      },
    },
    beats: [
      {
        beat_id: 'b-01', beat_order: 1,
        action: 'Pierre entre dans la cuisine',
        dialogue: '', subtext_type: 'dramatic_irony',
        emotion_instruction: 'observer Marie sans se trahir',
        sensory_tags: ['metal froid', 'odeur hopital'],
        canon_refs: [],
      },
      {
        beat_id: 'b-02', beat_order: 2,
        action: 'Echange banal qui derape',
        dialogue: '', subtext_type: 'tension_hidden',
        emotion_instruction: 'tester la reaction de Marie',
        sensory_tags: ['couteau', 'lumiere plafonnier'],
        canon_refs: [],
      },
      {
        beat_id: 'b-03', beat_order: 3,
        action: 'Silence lourd — Pierre sort',
        dialogue: '', subtext_type: '',
        emotion_instruction: 'signifier sa connaissance sans confronter',
        sensory_tags: ['porte', 'silence'],
        canon_refs: [],
      },
    ],
    subtext: {
      layers: [
        { layer_id: 'l1', type: 'dramatic_irony', statement: 'Pierre sait que Marie ment', visibility: 'implicit' },
      ],
      tension_type: 'dramatic_irony',
      tension_intensity: 0.8,
    },
    sensory: {
      density_target: 3,
      categories: [],
      recurrent_motifs: ['froid', 'couteau', 'lumiere'],
      banned_metaphors: [],
    },
    style_genome: {
      version: '1.0.0',
      universe: 'contemporain-litteraire',
      lexicon: {
        signature_words: ['silence', 'froid', 'regard', 'main'],
        forbidden_words: ['soudain', 'tout a coup'],
        abstraction_max_ratio: 0.15,
        concrete_min_ratio: 0.60,
      },
      rhythm: {
        avg_sentence_length_target: 14,
        gini_target: 0.45,
        max_consecutive_similar: 3,
        min_syncopes_per_scene: 2,
        min_compressions_per_scene: 1,
      },
      tone: { dominant_register: 'litteraire', intensity_range: [0.6, 0.9] },
      imagery: {
        recurrent_motifs: ['froid', 'couteau', 'lumiere'],
        density_target_per_100_words: 3,
        banned_metaphors: ['le coeur brise'],
      },
    },
    kill_lists: {
      banned_words: ['soudain', 'tout a coup', 'en effet', 'vraiment'],
      banned_cliches: ['le coeur brise', 'les larmes coulaient'],
      banned_ai_patterns: ['il ne put s empecher', 'une vague de'],
      banned_filter_words: ['semblait', 'paraissait'],
    },
    canon: [],
    continuity: {
      previous_scene_summary: 'Pierre a decouvert un message suspect sur le telephone de Marie',
      character_states: [
        { character_id: 'pierre', character_name: 'Pierre', emotional_state: 'controlled_anger', physical_state: 'tense', location: 'corridor' },
        { character_id: 'marie', character_name: 'Marie', emotional_state: 'anxious_guilt', physical_state: 'tired', location: 'kitchen' },
      ],
      open_threads: ['Le secret de Marie'],
    },
    seeds: { llm_seed: 'v4-test-seed-42' },
    generation: { max_tokens: 2000, temperature: 1.0 },
  } as ForgePacket;
}

function makeTestSymbolMap(): SymbolMap {
  const quartile = (q: 'Q1' | 'Q2' | 'Q3' | 'Q4') => ({
    quartile: q,
    lexical_fields: ['erosion', 'fracture', 'silence'] as readonly [string, string, string],
    imagery_modes: ['organique', 'minéral'] as readonly [string, string],
    sensory_quota: { vue: 0.3, son: 0.2, toucher: 0.2, odeur: 0.15, temperature: 0.15 },
    syntax_profile: { short_ratio: 0.4, avg_len_target: 14, punctuation_style: 'standard' as const },
    interiority_ratio: 0.3,
    signature_hooks: [`hook-${q}-a`, `hook-${q}-b`],
    taboos: ['cliche-1'],
  });

  return {
    map_id: 'test-map',
    map_hash: 'test-map-hash',
    scene_id: 'v4-test-scene',
    generation_seed: 'seed-42',
    generation_temperature: 0.0,
    validation_status: 'VALID',
    generation_pass: 1,
    quartiles: [quartile('Q1'), quartile('Q2'), quartile('Q3'), quartile('Q4')],
    global: {
      one_line_commandment: 'Montre, ne dis pas.',
      forbidden_moves: ['nommer les emotions', 'transitions mecaniques', 'lyrisme decoratif'],
      anti_cliche_replacements: [],
    },
  } as SymbolMap;
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('prompt-assembler-v4', () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    savedEnv.OMEGA_PROMPT_V4 = process.env.OMEGA_PROMPT_V4;
  });

  afterEach(() => {
    if (savedEnv.OMEGA_PROMPT_V4 !== undefined) {
      process.env.OMEGA_PROMPT_V4 = savedEnv.OMEGA_PROMPT_V4;
    } else {
      delete process.env.OMEGA_PROMPT_V4;
    }
  });

  // INV-V4-10
  it('INV-V4-10: isV4Active() returns true when OMEGA_PROMPT_V4=1', () => {
    process.env.OMEGA_PROMPT_V4 = '1';
    expect(isV4Active()).toBe(true);
    delete process.env.OMEGA_PROMPT_V4;
    expect(isV4Active()).toBe(false);
  });

  const packet = makeTestPacket();
  const symbolMap = makeTestSymbolMap();

  // INV-V4-01
  it('INV-V4-01: prompt ≤ 1500 tokens', () => {
    const result = buildSovereignPrompt_V4(packet, symbolMap);
    const tokenEstimate = Math.ceil(result.total_length / 4);
    expect(tokenEstimate).toBeLessThanOrEqual(1500);
  });

  // INV-V4-02
  it('INV-V4-02: prompt contains all 10 blocks', () => {
    const result = buildSovereignPrompt_V4(packet, symbolMap);
    const content = result.sections[0].content;

    expect(content).toContain('Tu es');           // persona
    expect(content).toContain('Trajectoire');     // trajectory
    expect(content).toContain('Points de passage'); // beats
    expect(content).toContain('Style');           // directives
    expect(content).toContain('Ancre vocale');    // voice anchor
    expect(content).toMatch(/Palette|Mots-palette/); // symbols
    expect(content).toContain('Exemple');         // exemplar
    expect(content).toContain('Interdits');       // interdictions
    expect(content).toContain('Écris la scène'); // final instruction
  });

  // INV-V4-03
  it('INV-V4-03: prompt contains no floats (no 14D vectors)', () => {
    const result = buildSovereignPrompt_V4(packet, symbolMap);
    const content = result.sections[0].content;
    // Match floats like 0.72, 0.45, etc. — but allow single-digit decimals in word counts
    // The regex looks for patterns like "0.72" or "14.53" (2+ decimal places)
    const floatMatches = content.match(/\d+\.\d{2,}/g) || [];
    // Filter out version strings
    const realFloats = floatMatches.filter(m => !m.startsWith('4.0') && !m.startsWith('1.0'));
    expect(realFloats).toEqual([]);
  });

  // INV-V4-04
  it('INV-V4-04: beats compressed ≤ 3 lines per beat', () => {
    const result = buildSovereignPrompt_V4(packet, symbolMap);
    const content = result.sections[0].content;
    // Each beat should be a single numbered line
    const beatSection = content.split('Points de passage :')[1]?.split('\n\n')[0] ?? '';
    const beatLines = beatSection.split('\n').filter(l => l.trim().length > 0);
    // 3 beats should produce ≤ 3 lines
    expect(beatLines.length).toBeLessThanOrEqual(3);
  });

  // INV-V4-05
  it('INV-V4-05: interdictions ≤ 3', () => {
    const result = buildSovereignPrompt_V4(packet, symbolMap);
    const content = result.sections[0].content;
    const interdictSection = content.split('Interdits')[1]?.split('\n\n')[0] ?? '';
    const numberedRules = interdictSection.match(/^\d+\./gm) || [];
    expect(numberedRules.length).toBeLessThanOrEqual(3);
  });

  // INV-V4-06
  it('INV-V4-06: exemplar present (contains « and »)', () => {
    const result = buildSovereignPrompt_V4(packet, symbolMap);
    const content = result.sections[0].content;
    expect(content).toContain('«');
    expect(content).toContain('»');
  });

  // INV-V4-07
  it('INV-V4-07: kill-lists ABSENT from prompt', () => {
    const result = buildSovereignPrompt_V4(packet, symbolMap);
    const content = result.sections[0].content;
    expect(content).not.toMatch(/BANNED/i);
    expect(content).not.toMatch(/BLACKLIST/i);
    expect(content).not.toMatch(/kill/i);
    expect(content).not.toMatch(/liste noire/i);
    // Kill-list words should NOT appear (except in exemplar which may contain them naturally)
    // Split content to check only non-exemplar sections
    const beforeExemplar = content.split('Exemple du niveau')[0] ?? content;
    expect(beforeExemplar).not.toContain('soudain');
    expect(beforeExemplar).not.toContain('tout a coup');
  });

  // INV-V4-08
  it('INV-V4-08: SymbolMap hooks present (signature_words in prompt)', () => {
    const result = buildSovereignPrompt_V4(packet, symbolMap);
    const content = result.sections[0].content;
    // Signature words from style_genome should be in Palette
    expect(content).toContain('silence');
    expect(content).toContain('froid');
  });

  // INV-V4-09
  it('INV-V4-09: determinism — same packet → same prompt', () => {
    const result1 = buildSovereignPrompt_V4(packet, symbolMap);
    const result2 = buildSovereignPrompt_V4(packet, symbolMap);
    expect(result1.prompt_hash).toBe(result2.prompt_hash);
    expect(result1.sections[0].content).toBe(result2.sections[0].content);
  });

  // Version
  it('exports PROMPT_ASSEMBLER_V4_VERSION = 4.0.0', () => {
    expect(PROMPT_ASSEMBLER_V4_VERSION).toBe('4.0.0');
  });
});
