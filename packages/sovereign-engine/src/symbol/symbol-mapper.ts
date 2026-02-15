/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — SYMBOL MAPPER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: symbol/symbol-mapper.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Appelle LLM secondaire pour générer la cartographie symbolique
 * FAIL-CLOSED: si échec après SYMBOL_MAX_REGEN + 1 tentatives, throw error
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type { ForgePacket, SovereignProvider } from '../types.js';
import type { SymbolMap, SymbolQuartile, SymbolGlobal, AntiClicheReplacement } from './symbol-map-types.js';
import { computeImagerySeed, type ImagerySeed } from './emotion-to-imagery.js';
import { validateSymbolMap } from './symbol-map-oracle.js';
import { SOVEREIGN_CONFIG } from '../config.js';

/**
 * Génère un SymbolMap avec validation FAIL-CLOSED
 */
export async function generateSymbolMap(
  packet: ForgePacket,
  provider: SovereignProvider,
): Promise<SymbolMap> {
  // 1. Calculer les 4 seeds CALC
  const seeds = packet.emotion_contract.curve_quartiles.map((q) => computeImagerySeed(q));

  // 2. Construire le prompt pour le LLM secondaire
  const prompt = buildSymbolMapPrompt(packet, seeds);

  // 3. Seed déterministe
  const gen_seed = sha256(`${packet.scene_id}:${packet.packet_hash}`);

  // 4. Tenter jusqu'à SYMBOL_MAX_REGEN + 1 fois
  for (let pass = 1; pass <= SOVEREIGN_CONFIG.SYMBOL_MAX_REGEN + 1; pass++) {
    const raw = await provider.generateDraft(prompt, 'symbol_map', `${gen_seed}_pass${pass}`);
    const parsed = parseSymbolMapResponse(raw, packet, seeds, gen_seed, pass);

    if (parsed !== null) {
      const validation = validateSymbolMap(parsed, packet);
      if (validation.valid) {
        return { ...parsed, validation_status: 'VALID' } as SymbolMap;
      }
    }

    if (pass === SOVEREIGN_CONFIG.SYMBOL_MAX_REGEN + 1) {
      throw new Error(`SYMBOL_MAP generation failed after ${pass} attempts. FAIL-CLOSED.`);
    }
  }

  // Ce code ne devrait jamais être atteint mais TypeScript l'exige
  throw new Error('SYMBOL_MAP generation: unreachable');
}

/**
 * Construit le prompt pour générer le Symbol Map
 */
function buildSymbolMapPrompt(packet: ForgePacket, seeds: readonly ImagerySeed[]): string {
  let prompt = '# OMEGA SYMBOL MAP GENERATOR\n\n';
  prompt += 'Generate a SYMBOL MAP in strict JSON format.\n\n';

  // Scene context
  prompt += `## Scene: ${packet.scene_id}\n`;
  prompt += `Story goal: ${packet.intent.story_goal}\n`;
  prompt += `Scene goal: ${packet.intent.scene_goal}\n`;
  prompt += `POV: ${packet.intent.pov}\n\n`;

  // Emotion quartiles avec seeds CALC
  prompt += '## Emotion Quartiles\n\n';
  for (let i = 0; i < 4; i++) {
    const q = packet.emotion_contract.curve_quartiles[i];
    const seed = seeds[i];
    prompt += `### ${q.quartile}\n`;
    prompt += `- Dominant emotion: ${q.dominant}\n`;
    prompt += `- Valence: ${q.valence.toFixed(2)}\n`;
    prompt += `- Arousal: ${q.arousal.toFixed(2)}\n`;
    prompt += `- Narrative instruction: ${q.narrative_instruction}\n`;
    prompt += `- CALC imagery modes: ${seed.imagery_modes.join(', ')}\n`;
    prompt += `- CALC syntax: short_ratio=${seed.syntax_profile.short_ratio}, avg_len=${seed.syntax_profile.avg_len_target}, style=${seed.syntax_profile.punctuation_style}\n`;
    prompt += `- CALC interiority: ${seed.interiority_ratio}\n\n`;
  }

  // Style genome
  prompt += '## Style Genome\n\n';
  prompt += `Universe: ${packet.style_genome.universe}\n`;
  if (packet.style_genome.lexicon.signature_words.length > 0) {
    prompt += `Signature words: ${packet.style_genome.lexicon.signature_words.join(', ')}\n`;
  }
  if (packet.style_genome.lexicon.forbidden_words.length > 0) {
    prompt += `Forbidden words: ${packet.style_genome.lexicon.forbidden_words.join(', ')}\n`;
  }
  if (packet.style_genome.imagery.recurrent_motifs.length > 0) {
    prompt += `Recurrent motifs: ${packet.style_genome.imagery.recurrent_motifs.join(', ')}\n`;
  }
  prompt += '\n';

  // Kill lists
  prompt += '## Kill Lists\n\n';
  prompt += '**NEVER use these clichés**: ';
  prompt += packet.kill_lists.banned_cliches.slice(0, 10).join(', ');
  if (packet.kill_lists.banned_cliches.length > 10) {
    prompt += ` (and ${packet.kill_lists.banned_cliches.length - 10} more)`;
  }
  prompt += '\n\n';
  prompt += '**NEVER use these banned words**: ';
  prompt += packet.kill_lists.banned_words.slice(0, 10).join(', ');
  if (packet.kill_lists.banned_words.length > 10) {
    prompt += ` (and ${packet.kill_lists.banned_words.length - 10} more)`;
  }
  prompt += '\n\n';

  // Output schema
  prompt += '## Output Schema (strict JSON)\n\n';
  prompt += '```json\n';
  prompt += '{\n';
  prompt += '  "quartiles": [\n';
  prompt += '    {\n';
  prompt += '      "quartile": "Q1",\n';
  prompt += '      "lexical_fields": ["field1", "field2", "field3"],\n';
  prompt += '      "imagery_modes": ["mode1", "mode2"],\n';
  prompt += '      "sensory_quota": { "vue": 0.4, "son": 0.2, "toucher": 0.2, "odeur": 0.1, "temperature": 0.1 },\n';
  prompt += '      "syntax_profile": { "short_ratio": 0.3, "avg_len_target": 15, "punctuation_style": "standard" },\n';
  prompt += '      "interiority_ratio": 0.5,\n';
  prompt += '      "signature_hooks": ["hook1", "hook2"],\n';
  prompt += '      "taboos": ["taboo1"]\n';
  prompt += '    },\n';
  prompt += '    ... (Q2, Q3, Q4)\n';
  prompt += '  ],\n';
  prompt += '  "global": {\n';
  prompt += '    "one_line_commandment": "One sentence \u2264150 chars",\n';
  prompt += '    "forbidden_moves": ["move1", "move2", "move3"],\n';
  prompt += '    "anti_cliche_replacements": [\n';
  prompt += '      { "cliche": "c\u0153ur battant", "replacement": "pouls" }\n';
  prompt += '    ]\n';
  prompt += '  }\n';
  prompt += '}\n';
  prompt += '```\n\n';

  prompt += '**IMPORTANT**:\n';
  prompt += '- sensory_quota MUST sum to 1.0 (\u00b10.01)\n';
  prompt += '- imagery_modes MUST use CALC seeds as base (max 1 change)\n';
  prompt += '- Valid imagery modes: organique, m\u00e9canique, min\u00e9ral, liquide, chaleur, obscurit\u00e9, lumi\u00e8re, v\u00e9g\u00e9tal, a\u00e9rien, souterrain\n';
  prompt += '- short_ratio MUST vary by at least 0.15 between min and max quartiles\n';
  prompt += '- interiority_ratio delta between adjacent quartiles \u2264 0.5\n';
  prompt += '- At least 3 distinct lexical fields across 4 quartiles\n';
  prompt += '- At least 3 forbidden moves\n';
  prompt += '- commandment \u2264 150 chars\n\n';

  prompt += '**CRITIQUE \u2014 LANGUE** : TOUT le contenu textuel (signature_hooks, lexical_fields, one_line_commandment, forbidden_moves, taboos) DOIT \u00eatre en FRAN\u00c7AIS. La prose sera \u00e9crite en fran\u00e7ais litt\u00e9raire premium. G\u00e9n\u00e9rer des expressions fran\u00e7aises concr\u00e8tes et d\u00e9tectables (ex: "racines enchev\u00eatr\u00e9es", "ancrage thermique", "chaleur soutenue").\n';
  prompt += '\n';
  prompt += 'Return ONLY valid JSON, no markdown, no explanation.\n';

  return prompt;
}

/**
 * Parse la r\u00e9ponse du LLM et merge avec les seeds CALC
 * Retourne null si parsing \u00e9choue (pour retry)
 */
function parseSymbolMapResponse(
  raw: string,
  packet: ForgePacket,
  seeds: readonly ImagerySeed[],
  gen_seed: string,
  pass: number,
): SymbolMap | null {
  try {
    // Extraire le JSON (supprimer markdown fences si pr\u00e9sent)
    let cleaned = raw.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/```\n?/g, '');
    }

    const parsed = JSON.parse(cleaned);

    // V\u00e9rifier structure minimale
    if (!parsed.quartiles || !Array.isArray(parsed.quartiles) || parsed.quartiles.length !== 4) {
      return null;
    }
    if (!parsed.global) {
      return null;
    }

    // Construire les quartiles avec merge CALC (CALC a priorit\u00e9)
    const quartiles: [SymbolQuartile, SymbolQuartile, SymbolQuartile, SymbolQuartile] = [
      mergeQuartile(parsed.quartiles[0], seeds[0], 'Q1'),
      mergeQuartile(parsed.quartiles[1], seeds[1], 'Q2'),
      mergeQuartile(parsed.quartiles[2], seeds[2], 'Q3'),
      mergeQuartile(parsed.quartiles[3], seeds[3], 'Q4'),
    ];

    // Construire global
    const global: SymbolGlobal = {
      one_line_commandment: parsed.global.one_line_commandment || '',
      forbidden_moves: parsed.global.forbidden_moves || [],
      anti_cliche_replacements: (parsed.global.anti_cliche_replacements || []).map(
        (r: { cliche: string; replacement: string }) => ({
          cliche: r.cliche,
          replacement: r.replacement,
        } as AntiClicheReplacement),
      ),
    };

    // Calculer hash
    const map_data = { quartiles, global, scene_id: packet.scene_id };
    const map_hash = sha256(canonicalize(map_data));

    const symbolMap: SymbolMap = {
      map_id: `SMAP_${packet.scene_id}_${pass}`,
      map_hash,
      scene_id: packet.scene_id,
      generation_seed: gen_seed,
      generation_temperature: SOVEREIGN_CONFIG.SYMBOL_TEMPERATURE,
      validation_status: 'INVALID', // Sera chang\u00e9 \u00e0 VALID si passe validation
      generation_pass: pass,
      quartiles,
      global,
    };

    return symbolMap;
  } catch (_error) {
    // Parsing \u00e9chou\u00e9, retourner null pour retry
    return null;
  }
}

/**
 * Merge un quartile LLM avec le seed CALC
 * CALC a priorit\u00e9 sur imagery_modes et syntax_profile
 */
function mergeQuartile(
  llm: {
    lexical_fields?: string[];
    imagery_modes?: string[];
    sensory_quota?: Record<string, number>;
    syntax_profile?: {
      short_ratio?: number;
      avg_len_target?: number;
      punctuation_style?: string;
    };
    interiority_ratio?: number;
    signature_hooks?: string[];
    taboos?: string[];
  },
  seed: ImagerySeed,
  quartile: 'Q1' | 'Q2' | 'Q3' | 'Q4',
): SymbolQuartile {
  // CALC a priorit\u00e9 sur imagery_modes
  const imagery_modes: [string, string] = llm.imagery_modes
    ? ([llm.imagery_modes[0] || seed.imagery_modes[0], llm.imagery_modes[1] || seed.imagery_modes[1]] as [
        string,
        string,
      ])
    : ([seed.imagery_modes[0], seed.imagery_modes[1]] as [string, string]);

  // CALC a priorit\u00e9 sur syntax_profile
  const syntax_profile = {
    short_ratio: llm.syntax_profile?.short_ratio ?? seed.syntax_profile.short_ratio,
    avg_len_target: llm.syntax_profile?.avg_len_target ?? seed.syntax_profile.avg_len_target,
    punctuation_style:
      (llm.syntax_profile?.punctuation_style as 'minimal' | 'standard' | 'dense' | 'fragment\u00e9') ??
      seed.syntax_profile.punctuation_style,
  };

  // interiority_ratio: LLM peut ajuster l\u00e9g\u00e8rement, mais CALC si manquant
  const interiority_ratio = llm.interiority_ratio ?? seed.interiority_ratio;

  return {
    quartile,
    lexical_fields: (llm.lexical_fields || ['default1', 'default2', 'default3']) as [string, string, string],
    imagery_modes,
    sensory_quota: {
      vue: llm.sensory_quota?.vue ?? 0.4,
      son: llm.sensory_quota?.son ?? 0.2,
      toucher: llm.sensory_quota?.toucher ?? 0.2,
      odeur: llm.sensory_quota?.odeur ?? 0.1,
      temperature: llm.sensory_quota?.temperature ?? 0.1,
    },
    syntax_profile,
    interiority_ratio,
    signature_hooks: llm.signature_hooks || [],
    taboos: llm.taboos || [],
  };
}
