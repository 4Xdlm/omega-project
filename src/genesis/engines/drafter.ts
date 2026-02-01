// ═══════════════════════════════════════════════════════════════════════════════
// GENESIS FORGE v1.1.2 — DRAFTER (Text Generation)
// ═══════════════════════════════════════════════════════════════════════════════
// Generation de N drafts avec seeds reproductibles
// STUB: Generation basique, a integrer avec LLM pour production
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  Draft,
  EmotionTrajectoryContract,
  PrismConstraints,
  GenesisConfig,
  EmotionType,
} from '../core/types';
import type { WritingConstraints } from '../core/mutator';
import { generateId } from '../proofs/hash_utils';

/**
 * Genere N drafts avec seeds reproductibles
 */
export async function generateDrafts(
  contract: EmotionTrajectoryContract,
  prismConstraints: PrismConstraints,
  constraints: WritingConstraints,
  config: GenesisConfig,
  iteration: number
): Promise<Draft[]> {
  const drafts: Draft[] = [];

  // Determiner le nombre de drafts a generer
  const nDrafts = computeDraftCount(config, iteration);

  for (let i = 0; i < nDrafts; i++) {
    const seed = computeSeed(constraints.seed, iteration, i);
    const draft = await generateOneDraft(contract, prismConstraints, constraints, seed, iteration);
    drafts.push(draft);
  }

  return drafts;
}

/**
 * Calcule le nombre de drafts a generer (varie selon l'iteration)
 */
function computeDraftCount(config: GenesisConfig, iteration: number): number {
  const { MIN_DRAFTS_PER_ITER, MAX_DRAFTS_PER_ITER } = config.loop;

  // Commencer avec plus de drafts, reduire au fil des iterations
  const decayFactor = Math.max(0.5, 1 - iteration * 0.01);
  const range = MAX_DRAFTS_PER_ITER - MIN_DRAFTS_PER_ITER;
  const count = Math.round(MIN_DRAFTS_PER_ITER + range * decayFactor);

  return Math.max(MIN_DRAFTS_PER_ITER, Math.min(MAX_DRAFTS_PER_ITER, count));
}

/**
 * Calcule un seed deterministe
 */
function computeSeed(baseSeed: number, iteration: number, draftIndex: number): number {
  // Combiner les inputs de maniere deterministe
  return (baseSeed * 31 + iteration * 17 + draftIndex * 7) & 0x7fffffff;
}

/**
 * Genere un draft unique
 * STUB: Generation basique basee sur templates + contraintes
 * LLM integration deferred to Phase D+ (GENESIS-LLM-001)
 */
async function generateOneDraft(
  contract: EmotionTrajectoryContract,
  prismConstraints: PrismConstraints,
  constraints: WritingConstraints,
  seed: number,
  iteration: number
): Promise<Draft> {
  // RNG deterministe basee sur seed
  let rng = seed;
  const nextRandom = () => {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff;
    return rng / 0x7fffffff;
  };

  // Selectionner un template basé sur l'emotion dominante
  const dominantEmotion = contract.windows[0]?.targetDominant || 'joy';
  const template = selectTemplate(dominantEmotion, constraints, nextRandom);

  // Generer le texte
  const text = generateTextFromTemplate(template, constraints, nextRandom);

  return {
    id: generateId('draft'),
    text,
    seed,
    iteration,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Templates par emotion (STUB - version minimale)
 */
const EMOTION_TEMPLATES: Record<EmotionType, string[]> = {
  joy: [
    'The {adj} light filled the room with {noun}. {pronoun} felt a warmth spreading through {possessive} chest.',
    'A {adj} smile crossed {possessive} face as {pronoun} watched the {noun} unfold before {object}.',
    '{pronoun} laughed, the sound {adj} and clear in the {adj} air.',
  ],
  sadness: [
    'The {adj} silence pressed down like a weight. {pronoun} stared at the {noun}, feeling {adj}.',
    'Rain traced {adj} lines down the window. {pronoun} remembered the {noun} that was gone.',
    'A {adj} ache settled in {possessive} chest, {adj} and persistent.',
  ],
  fear: [
    'The {adj} shadows seemed to move. {pronoun} held {possessive} breath, listening.',
    'Something {adj} lurked in the {noun}. {pronoun} could feel it watching.',
    '{possessive} heart pounded, {adj} and erratic, as the {noun} drew closer.',
  ],
  anger: [
    'The words came out {adj}, each one a {noun}. {pronoun} could feel the heat rising.',
    '{pronoun} clenched {possessive} fists, the {adj} fury building inside.',
    'The {noun} shattered against the wall. {pronoun} stood there, breathing {adj}.',
  ],
  surprise: [
    'The {noun} appeared without warning. {pronoun} stood frozen, {adj}.',
    '{pronoun} blinked. The {adj} sight before {object} defied explanation.',
    'A {adj} gasp escaped {possessive} lips as the {noun} revealed itself.',
  ],
  disgust: [
    'The {adj} smell hit {object} first. {pronoun} recoiled from the {noun}.',
    '{pronoun} turned away, {possessive} face twisting in {adj} revulsion.',
    'The {noun} was {adj} beyond description. {pronoun} fought the urge to look away.',
  ],
  trust: [
    '{pronoun} placed {possessive} hand in the other\'s, feeling {adj} and certain.',
    'The {adj} bond between them needed no words. The {noun} was enough.',
    '{pronoun} nodded, the {adj} faith in {possessive} heart unwavering.',
  ],
  anticipation: [
    'The {adj} excitement built with each passing moment. The {noun} was almost here.',
    '{pronoun} could barely contain the {adj} energy. Soon, everything would change.',
    'The {noun} approached. {pronoun} felt {adj}, ready for what was to come.',
  ],
  love: [
    '{pronoun} looked at {object} with {adj} eyes, the {noun} between them palpable.',
    'The {adj} touch sent warmth through {possessive} entire being.',
    'In that {adj} moment, {pronoun} knew. This was {noun}.',
  ],
  guilt: [
    'The {adj} weight of what {pronoun} had done pressed down relentlessly.',
    '{pronoun} couldn\'t meet {possessive} own eyes in the mirror. The {noun} was too {adj}.',
    'The {adj} memory returned, unwanted. {pronoun} had failed.',
  ],
  shame: [
    '{pronoun} wished the {noun} would swallow {object} whole. The {adj} exposure was unbearable.',
    'The {adj} heat crept up {possessive} neck. Everyone was watching.',
    '{pronoun} shrank back, the {adj} judgment in their eyes too much to bear.',
  ],
  pride: [
    '{pronoun} stood {adj}, head held high. The {noun} was earned.',
    'A {adj} satisfaction filled {possessive} chest. {pronoun} had done it.',
    'The {noun} gleamed in the light. {pronoun} had created something {adj}.',
  ],
  hope: [
    'Despite everything, a {adj} spark remained. The {noun} was not lost.',
    '{pronoun} looked toward the horizon, {adj}. Tomorrow could be different.',
    'The {adj} possibility flickered like a candle in the darkness.',
  ],
  despair: [
    'The {adj} void stretched endlessly. {pronoun} saw no way forward.',
    '{pronoun} slumped against the {noun}, the {adj} weight of it all crushing.',
    'There was nothing left. The {adj} emptiness consumed everything.',
  ],
};

/**
 * Adjectifs par niveau de vocabulaire
 */
const ADJECTIVES = {
  simple: ['warm', 'cold', 'dark', 'light', 'soft', 'hard', 'quick', 'slow', 'deep', 'high'],
  medium: ['gentle', 'fierce', 'hollow', 'vivid', 'faint', 'stark', 'subtle', 'bold', 'weary', 'eager'],
  advanced: ['ephemeral', 'luminous', 'gossamer', 'resplendent', 'ineffable', 'incandescent', 'ethereal', 'visceral', 'profound', 'transcendent'],
};

/**
 * Noms par contexte emotionnel
 */
const NOUNS = {
  positive: ['light', 'warmth', 'peace', 'joy', 'hope', 'love', 'beauty', 'harmony', 'grace', 'wonder'],
  negative: ['shadow', 'silence', 'void', 'weight', 'darkness', 'emptiness', 'loss', 'pain', 'doubt', 'fear'],
  neutral: ['moment', 'feeling', 'truth', 'memory', 'presence', 'distance', 'time', 'space', 'world', 'change'],
};

/**
 * Selectionne un template basee sur l'emotion
 */
function selectTemplate(
  emotion: EmotionType,
  constraints: WritingConstraints,
  random: () => number
): string {
  const templates = EMOTION_TEMPLATES[emotion] || EMOTION_TEMPLATES.joy;
  const index = Math.floor(random() * templates.length);
  return templates[index];
}

/**
 * Genere du texte a partir d'un template
 */
function generateTextFromTemplate(
  template: string,
  constraints: WritingConstraints,
  random: () => number
): string {
  // Selectionner le niveau de vocabulaire
  const vocabLevel = constraints.vocabularyLevel;
  let adjList: string[];
  if (vocabLevel < 0.33) {
    adjList = ADJECTIVES.simple;
  } else if (vocabLevel < 0.66) {
    adjList = ADJECTIVES.medium;
  } else {
    adjList = ADJECTIVES.advanced;
  }

  // Selectionner les noms selon le contexte
  const nounList = random() < 0.5 ? NOUNS.positive : (random() < 0.5 ? NOUNS.negative : NOUNS.neutral);

  // Pronoms (alterner pour variete)
  const pronouns = ['He', 'She'];
  const pronoun = pronouns[Math.floor(random() * pronouns.length)];
  const possessive = pronoun === 'He' ? 'his' : 'her';
  const object = pronoun === 'He' ? 'him' : 'her';

  // Remplacer les placeholders
  let text = template;

  // Remplacer {adj} avec des adjectifs differents a chaque fois
  while (text.includes('{adj}')) {
    const adj = adjList[Math.floor(random() * adjList.length)];
    text = text.replace('{adj}', adj);
  }

  // Remplacer {noun} avec des noms differents
  while (text.includes('{noun}')) {
    const noun = nounList[Math.floor(random() * nounList.length)];
    text = text.replace('{noun}', noun);
  }

  // Remplacer les pronoms
  text = text.replace(/\{pronoun\}/g, pronoun);
  text = text.replace(/\{possessive\}/g, possessive);
  text = text.replace(/\{object\}/g, object);

  // Generer des phrases additionnelles pour atteindre la longueur cible
  const targetSentences = Math.max(2, Math.floor(constraints.sentenceLengthTarget / 5));
  let sentences = [text];

  while (sentences.length < targetSentences) {
    const additionalTemplate = EMOTION_TEMPLATES.joy[Math.floor(random() * EMOTION_TEMPLATES.joy.length)];
    let additionalText = additionalTemplate;

    while (additionalText.includes('{adj}')) {
      additionalText = additionalText.replace('{adj}', adjList[Math.floor(random() * adjList.length)]);
    }
    while (additionalText.includes('{noun}')) {
      additionalText = additionalText.replace('{noun}', nounList[Math.floor(random() * nounList.length)]);
    }
    additionalText = additionalText.replace(/\{pronoun\}/g, pronoun);
    additionalText = additionalText.replace(/\{possessive\}/g, possessive);
    additionalText = additionalText.replace(/\{object\}/g, object);

    sentences.push(additionalText);
  }

  return sentences.join(' ');
}

export default {
  generateDrafts,
};
