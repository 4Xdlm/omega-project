/**
 * OMEGA Style Emergence Engine -- Lexical Analyzer
 * Phase C.3 -- Vocabulary richness and rarity analysis
 */

import type { ProseParagraph } from '../types.js';
import type { LexicalProfile } from '../types.js';

const COMMON_WORDS: ReadonlySet<string> = new Set([
  'the', 'a', 'an', 'is', 'was', 'were', 'are', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
  'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
  'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
  'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
  'because', 'but', 'and', 'or', 'if', 'while', 'although', 'though',
  'that', 'this', 'these', 'those', 'i', 'me', 'my', 'myself', 'we',
  'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself',
  'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself',
  'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves',
  'what', 'which', 'who', 'whom', 'whose', 'about', 'up', 'down',
  'said', 'one', 'two', 'like', 'also', 'back', 'first', 'last',
  'long', 'great', 'little', 'just', 'still', 'even', 'new', 'old',
  'now', 'way', 'well', 'much', 'get', 'got', 'make', 'made', 'know',
  'say', 'see', 'saw', 'come', 'came', 'go', 'went', 'gone', 'take',
  'took', 'give', 'gave', 'tell', 'told', 'think', 'thought', 'find',
  'found', 'let', 'put', 'keep', 'kept', 'begin', 'began', 'seem',
  'help', 'show', 'hear', 'heard', 'play', 'run', 'ran', 'move',
  'live', 'believe', 'hold', 'held', 'bring', 'brought', 'happen',
  'write', 'wrote', 'sit', 'sat', 'stand', 'stood', 'lose', 'lost',
  'pay', 'paid', 'meet', 'met', 'include', 'continue', 'set',
  'learn', 'change', 'lead', 'led', 'understand', 'understood', 'watch',
  'follow', 'stop', 'create', 'speak', 'spoke', 'read', 'allow',
  'add', 'spend', 'spent', 'grow', 'grew', 'open', 'walk', 'win',
  'won', 'offer', 'remember', 'love', 'consider', 'appear', 'buy',
  'bought', 'wait', 'serve', 'die', 'send', 'sent', 'expect', 'build',
  'built', 'stay', 'fall', 'fell', 'cut', 'reach', 'kill', 'remain',
  'man', 'woman', 'child', 'world', 'hand', 'part', 'place', 'case',
  'day', 'night', 'time', 'year', 'people', 'thing', 'life', 'head',
  'eye', 'face', 'room', 'door', 'house', 'home', 'water', 'light',
  'work', 'point', 'word', 'side', 'body', 'nothing', 'something',
  'right', 'left', 'never', 'always', 'often', 'away', 'enough',
]);

function extractWords(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z\s'-]/g, '').split(/\s+/).filter((w) => w.length > 0);
}

function isRareWord(word: string): boolean {
  return !COMMON_WORDS.has(word) && word.length > 2;
}

export function analyzeLexical(paragraphs: readonly ProseParagraph[]): LexicalProfile {
  const allWords: string[] = [];
  for (const para of paragraphs) {
    allWords.push(...extractWords(para.text));
  }

  if (allWords.length === 0) {
    return {
      type_token_ratio: 0,
      hapax_legomena_ratio: 0,
      rare_word_ratio: 0,
      consecutive_rare_count: 0,
      avg_word_length: 0,
      vocabulary_size: 0,
    };
  }

  const wordFreq = new Map<string, number>();
  for (const w of allWords) {
    wordFreq.set(w, (wordFreq.get(w) ?? 0) + 1);
  }

  const uniqueCount = wordFreq.size;
  const ttr = uniqueCount / allWords.length;

  let hapaxCount = 0;
  for (const count of wordFreq.values()) {
    if (count === 1) hapaxCount++;
  }
  const hapaxRatio = hapaxCount / allWords.length;

  const rareWords = allWords.filter(isRareWord);
  const rareRatio = rareWords.length / allWords.length;

  let maxConsecutiveRare = 0;
  let currentConsecutive = 0;
  for (const w of allWords) {
    if (isRareWord(w)) {
      currentConsecutive++;
      if (currentConsecutive > maxConsecutiveRare) {
        maxConsecutiveRare = currentConsecutive;
      }
    } else {
      currentConsecutive = 0;
    }
  }

  const totalLength = allWords.reduce((acc, w) => acc + w.length, 0);
  const avgWordLength = totalLength / allWords.length;

  return {
    type_token_ratio: ttr,
    hapax_legomena_ratio: hapaxRatio,
    rare_word_ratio: rareRatio,
    consecutive_rare_count: maxConsecutiveRare,
    avg_word_length: avgWordLength,
    vocabulary_size: uniqueCount,
  };
}
