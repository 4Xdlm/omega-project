/**
 * OMEGA Scribe Engine -- Style Gate
 * Deviation on each axis <= 0.3 (avg_sentence_length, burstiness, dialogue_ratio, lexical_richness)
 */

import type { StyleGenomeInput } from '@omega/genesis-planner';
import type { ProseDoc, GateResult, GateViolation, SConfig } from '../types.js';

function computeActualBurstiness(paragraphs: readonly { word_count: number; sentence_count: number }[]): number {
  if (paragraphs.length === 0) return 0;
  const sentenceLengths: number[] = [];
  for (const p of paragraphs) {
    if (p.sentence_count > 0) {
      sentenceLengths.push(p.word_count / p.sentence_count);
    }
  }
  if (sentenceLengths.length <= 1) return 0;
  const mean = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
  const variance = sentenceLengths.reduce((acc, val) => acc + (val - mean) ** 2, 0) / sentenceLengths.length;
  const stdDev = Math.sqrt(variance);
  // Normalize to 0-1 range (cap at 1)
  return Math.min(1, stdDev / (mean || 1));
}

function computeActualLexicalRichness(paragraphs: readonly { text: string }[]): number {
  const allText = paragraphs.map((p) => p.text).join(' ');
  const words = allText.toLowerCase().split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return 0;
  const unique = new Set(words);
  return Math.min(1, unique.size / words.length);
}

function computeActualDialogueRatio(paragraphs: readonly { text: string }[]): number {
  let dialogueWords = 0;
  let totalWords = 0;
  for (const p of paragraphs) {
    const words = p.text.split(/\s+/).filter((w) => w.length > 0);
    totalWords += words.length;
    // Dialogue detection: text between quotes
    const dialogueMatches = p.text.match(/"[^"]*"/g) || [];
    for (const dm of dialogueMatches) {
      dialogueWords += dm.split(/\s+/).length;
    }
  }
  if (totalWords === 0) return 0;
  return dialogueWords / totalWords;
}

function computeActualAvgSentenceLength(paragraphs: readonly { word_count: number; sentence_count: number }[]): number {
  let totalWords = 0;
  let totalSentences = 0;
  for (const p of paragraphs) {
    totalWords += p.word_count;
    totalSentences += p.sentence_count;
  }
  return totalSentences > 0 ? totalWords / totalSentences : 0;
}

export function runStyleGate(
  prose: ProseDoc,
  genome: StyleGenomeInput,
  config: SConfig,
  timestamp: string,
): GateResult {
  const violations: GateViolation[] = [];
  const maxDeviation = config.STYLE_DEVIATION_MAX.value as number;

  const actualBurstiness = computeActualBurstiness(prose.paragraphs);
  const actualLexical = computeActualLexicalRichness(prose.paragraphs);
  const actualDialogue = computeActualDialogueRatio(prose.paragraphs);
  const actualAvgSentLen = computeActualAvgSentenceLength(prose.paragraphs);

  // Normalize avg sentence length deviation: compare relative to target
  const sentLenDev = genome.target_avg_sentence_length > 0
    ? Math.abs(actualAvgSentLen - genome.target_avg_sentence_length) / genome.target_avg_sentence_length
    : 0;
  const burstyDev = Math.abs(actualBurstiness - genome.target_burstiness);
  const lexicalDev = Math.abs(actualLexical - genome.target_lexical_richness);
  const dialogueDev = Math.abs(actualDialogue - genome.target_dialogue_ratio);

  const axes: { name: string; deviation: number; target: number; actual: number }[] = [
    { name: 'avg_sentence_length', deviation: sentLenDev, target: genome.target_avg_sentence_length, actual: actualAvgSentLen },
    { name: 'burstiness', deviation: burstyDev, target: genome.target_burstiness, actual: actualBurstiness },
    { name: 'lexical_richness', deviation: lexicalDev, target: genome.target_lexical_richness, actual: actualLexical },
    { name: 'dialogue_ratio', deviation: dialogueDev, target: genome.target_dialogue_ratio, actual: actualDialogue },
  ];

  for (const axis of axes) {
    if (axis.deviation > maxDeviation) {
      violations.push({
        gate_id: 'STYLE_GATE',
        invariant: 'S-INV-07' as 'S-INV-07',
        paragraph_id: 'GLOBAL',
        message: `Style axis ${axis.name} deviation ${axis.deviation.toFixed(3)} exceeds max ${maxDeviation}`,
        severity: 'ERROR',
        details: `target: ${axis.target}, actual: ${axis.actual.toFixed(3)}`,
      });
    }
  }

  const verdict = violations.length === 0 ? 'PASS' : 'FAIL';

  return {
    gate_id: 'STYLE_GATE',
    verdict,
    violations,
    metrics: {
      avg_sentence_length_deviation: sentLenDev,
      burstiness_deviation: burstyDev,
      lexical_richness_deviation: lexicalDev,
      dialogue_ratio_deviation: dialogueDev,
      max_deviation: Math.max(sentLenDev, burstyDev, lexicalDev, dialogueDev),
    },
    timestamp_deterministic: timestamp,
  };
}
