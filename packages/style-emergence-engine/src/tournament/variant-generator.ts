/**
 * OMEGA Style Emergence Engine -- Variant Generator
 * Phase C.3 -- Deterministic paragraph variant generation
 */

import type { ProseParagraph } from '@omega/scribe-engine';
import type { StyleGenomeInput } from '@omega/genesis-planner';
import type { StyleVariant, StyleProfile } from '../types.js';
import { profileStyle } from '../metrics/style-profiler.js';
import { detectIA } from '../detectors/ia-detector.js';
import { detectGenre } from '../detectors/genre-detector.js';
import { detectBanality } from '../detectors/banality-detector.js';
import { createDefaultEConfig } from '../config.js';

function deterministicHash(seed: number): number {
  let h = seed | 0;
  h = ((h >> 16) ^ h) * 0x45d9f3b | 0;
  h = ((h >> 16) ^ h) * 0x45d9f3b | 0;
  h = (h >> 16) ^ h;
  return Math.abs(h);
}

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
}

function joinSentences(sentences: string[]): string {
  return sentences.join(' ');
}

function modifyCadence(text: string, seed: number): string {
  const sentences = splitSentences(text);
  if (sentences.length <= 1) return text;

  const shuffleIndex = deterministicHash(seed) % sentences.length;
  const nextIndex = (shuffleIndex + 1) % sentences.length;

  if (sentences[shuffleIndex].split(/\s+/).length > 10 && sentences[nextIndex].split(/\s+/).length > 10) {
    const words1 = sentences[shuffleIndex].replace(/[.!?]$/, '').split(/\s+/);
    const mid = Math.floor(words1.length / 2);
    const firstHalf = words1.slice(0, mid).join(' ') + '.';
    const secondHalf = words1.slice(mid).join(' ');
    const endPunct = sentences[shuffleIndex].match(/[.!?]$/)?.[0] ?? '.';
    sentences[shuffleIndex] = firstHalf;
    sentences.splice(shuffleIndex + 1, 0, secondHalf + endPunct);
  }

  return joinSentences(sentences);
}

const SYNONYM_MAP: Readonly<Record<string, readonly string[]>> = {
  'big': ['large', 'vast', 'immense'],
  'small': ['tiny', 'minute', 'compact'],
  'good': ['fine', 'solid', 'worthy'],
  'bad': ['poor', 'grim', 'dire'],
  'said': ['remarked', 'noted', 'stated'],
  'walked': ['strode', 'ambled', 'paced'],
  'looked': ['gazed', 'peered', 'observed'],
  'dark': ['dim', 'shadowed', 'unlit'],
  'light': ['glow', 'radiance', 'gleam'],
  'old': ['aged', 'ancient', 'weathered'],
  'new': ['fresh', 'recent', 'novel'],
  'fast': ['swift', 'rapid', 'brisk'],
  'slow': ['gradual', 'measured', 'unhurried'],
  'cold': ['chill', 'frigid', 'icy'],
  'hot': ['scorching', 'blazing', 'searing'],
  'beautiful': ['striking', 'elegant', 'exquisite'],
  'strange': ['peculiar', 'curious', 'uncanny'],
  'quiet': ['hushed', 'muted', 'still'],
  'loud': ['thunderous', 'booming', 'resonant'],
  'strong': ['sturdy', 'robust', 'formidable'],
};

function modifyLexicon(text: string, seed: number): string {
  const words = text.split(/(\s+)/);
  let substitutions = 0;
  const maxSubs = Math.max(1, Math.floor(words.length / 15));

  for (let i = 0; i < words.length && substitutions < maxSubs; i++) {
    const cleanWord = words[i].toLowerCase().replace(/[^a-z]/g, '');
    if (SYNONYM_MAP[cleanWord]) {
      const synonyms = SYNONYM_MAP[cleanWord];
      const idx = deterministicHash(seed + i) % synonyms.length;
      const punct = words[i].match(/[^a-zA-Z]+$/)?.[0] ?? '';
      const prefix = words[i].match(/^[^a-zA-Z]+/)?.[0] ?? '';
      words[i] = prefix + synonyms[idx] + punct;
      substitutions++;
    }
  }

  return words.join('');
}

function buildVariantProfile(
  text: string, paragraphId: string, genome: StyleGenomeInput, timestamp: string,
): { profile: StyleProfile; iaScore: number; genreSpec: number; banalityCount: number } {
  const pseudoPara: ProseParagraph = {
    paragraph_id: paragraphId,
    segment_ids: [],
    text,
    word_count: text.split(/\s+/).filter((w) => w.length > 0).length,
    sentence_count: splitSentences(text).length,
    avg_sentence_length: 0,
    emotion: '',
    intensity: 0,
    rhetorical_devices: [],
    sensory_anchors: [],
    motif_refs: [],
    canon_refs: [],
  };
  pseudoPara satisfies ProseParagraph;

  const profile = profileStyle([pseudoPara], genome, timestamp);
  const config = createDefaultEConfig();
  const iaResult = detectIA([pseudoPara], config);
  const genreResult = detectGenre([pseudoPara], config);
  const banalityResult = detectBanality([pseudoPara], { pov: 'third-limited', tense: 'past', banned_words: [], banned_topics: [], max_dialogue_ratio: 1, min_sensory_anchors_per_scene: 0, max_scenes: 100, min_scenes: 1, forbidden_cliches: [] }, config);

  return {
    profile,
    iaScore: iaResult.score,
    genreSpec: genreResult.specificity,
    banalityCount: banalityResult.total_banality,
  };
}

export function generateVariants(
  paragraph: ProseParagraph,
  genome: StyleGenomeInput,
  variantCount: number,
  baseSeed: number,
  timestamp: string,
): readonly StyleVariant[] {
  const variants: StyleVariant[] = [];

  for (let k = 0; k < variantCount; k++) {
    const seed = baseSeed + k * 7919;
    let text: string;

    if (k === 0) {
      text = paragraph.text;
    } else if (k === 1) {
      text = modifyCadence(paragraph.text, seed);
    } else {
      text = modifyLexicon(modifyCadence(paragraph.text, seed), seed);
    }

    const variantId = `VAR-${paragraph.paragraph_id}-${k}`;
    const { profile, iaScore, genreSpec, banalityCount } = buildVariantProfile(
      text, variantId, genome, timestamp,
    );

    variants.push({
      variant_id: variantId,
      paragraph_id: paragraph.paragraph_id,
      text,
      variation_seed: seed,
      style_profile: profile,
      ia_score: iaScore,
      genre_specificity: genreSpec,
      banality_count: banalityCount,
    });
  }

  return variants;
}
