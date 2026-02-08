/**
 * OMEGA Style Emergence Engine -- Syntactic Analyzer
 * Phase C.3 -- Sentence structure classification and diversity
 */

import type { ProseParagraph, SyntacticStructure, SyntacticProfile } from '../types.js';

const ALL_STRUCTURES: readonly SyntacticStructure[] = [
  'SVO', 'inversion', 'fragment', 'question', 'exclamation',
  'compound', 'complex', 'imperative', 'passive',
];

const SUBORDINATE_MARKERS = [
  'because', 'although', 'though', 'while', 'when', 'where',
  'if', 'unless', 'since', 'after', 'before', 'until', 'whereas',
  'whenever', 'wherever', 'whether', 'as',
];

const COORDINATING_CONJUNCTIONS = ['and', 'but', 'or', 'nor', 'for', 'yet', 'so'];

const IMPERATIVE_VERBS = [
  'look', 'listen', 'watch', 'wait', 'stop', 'go', 'come', 'run',
  'take', 'give', 'let', 'make', 'keep', 'hold', 'turn', 'open',
  'close', 'move', 'stand', 'sit', 'stay', 'leave', 'find', 'help',
  'tell', 'show', 'bring', 'think', 'try', 'remember', 'forget',
  'consider', 'imagine', 'notice', 'see', 'hear', 'feel', 'follow',
];

function extractSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
}

function classifySentence(sentence: string): SyntacticStructure {
  const trimmed = sentence.trim();
  const lower = trimmed.toLowerCase();
  const words = lower.split(/\s+/).filter((w) => w.length > 0);

  if (words.length === 0) return 'fragment';

  if (trimmed.endsWith('?')) return 'question';
  if (trimmed.endsWith('!')) return 'exclamation';

  if (words.length < 3 || !words.some((w) => /^(is|are|was|were|has|had|have|do|does|did|will|would|could|should|can|may|might|shall|goes|makes|takes|comes|gives|says|knows|thinks|sees|gets|finds|keeps|tells|shows|runs|moves|stands|sits|walks|turns|opens|falls|holds|brings|puts|sets|lets|leaves|goes|looks|plays|lives|feels|hears|speaks|writes|reads|works|grows|leads|learns|begins|seems|helps|follows|watches|creates|allows|includes|means)/.test(w))) {
    if (words.length <= 4) return 'fragment';
  }

  if (/\b(was|were|is|are|been|being)\s+\w+ed\b/.test(lower) ||
      /\b(was|were|is|are|been|being)\s+\w+en\b/.test(lower)) {
    return 'passive';
  }

  const firstWord = words[0].replace(/[^a-z]/g, '');
  if (IMPERATIVE_VERBS.includes(firstWord)) return 'imperative';

  if (trimmed.includes(';') || words.some((w) => COORDINATING_CONJUNCTIONS.includes(w.replace(/[^a-z]/g, '')))) {
    return 'compound';
  }

  if (words.some((w) => SUBORDINATE_MARKERS.includes(w.replace(/[^a-z]/g, '')))) {
    return 'complex';
  }

  const verbPatterns = /^(the|a|an|this|that|his|her|its|their|my|your|our|one|each|every|some|no|all)\b/;
  if (verbPatterns.test(lower) || /^[a-z]+\s/.test(lower)) {
    if (!verbPatterns.test(lower) && !SUBORDINATE_MARKERS.includes(firstWord)) {
      return 'inversion';
    }
  }

  return 'SVO';
}

function shannonEntropy(distribution: Readonly<Record<string, number>>, total: number): number {
  if (total === 0) return 0;
  let entropy = 0;
  for (const count of Object.values(distribution)) {
    if (count > 0) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
  }
  return entropy;
}

export function analyzeSyntactic(paragraphs: readonly ProseParagraph[]): SyntacticProfile {
  const distribution: Record<SyntacticStructure, number> = {
    SVO: 0, inversion: 0, fragment: 0, question: 0, exclamation: 0,
    compound: 0, complex: 0, imperative: 0, passive: 0,
  };

  let totalSentences = 0;

  for (const para of paragraphs) {
    const sentences = extractSentences(para.text);
    for (const s of sentences) {
      const struct = classifySentence(s);
      distribution[struct]++;
      totalSentences++;
    }
  }

  if (totalSentences === 0) {
    return {
      structure_distribution: { ...distribution },
      unique_structures: 0,
      dominant_structure: 'SVO',
      dominant_ratio: 0,
      diversity_index: 0,
    };
  }

  let dominant: SyntacticStructure = 'SVO';
  let maxCount = 0;
  let uniqueCount = 0;

  for (const s of ALL_STRUCTURES) {
    if (distribution[s] > 0) uniqueCount++;
    if (distribution[s] > maxCount) {
      maxCount = distribution[s];
      dominant = s;
    }
  }

  const diversityIndex = shannonEntropy(distribution, totalSentences);

  return {
    structure_distribution: { ...distribution },
    unique_structures: uniqueCount,
    dominant_structure: dominant,
    dominant_ratio: maxCount / totalSentences,
    diversity_index: diversityIndex,
  };
}
