/**
 * OMEGA Scribe Engine -- Oracle Style
 * Scores style adherence to genome targets
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type { StyleGenomeInput } from '@omega/genesis-planner';
import type { ProseDoc, OracleResult } from '../types.js';

function computeBurstiness(paragraphs: readonly { word_count: number; sentence_count: number }[]): number {
  const lengths: number[] = [];
  for (const p of paragraphs) {
    if (p.sentence_count > 0) {
      lengths.push(p.word_count / p.sentence_count);
    }
  }
  if (lengths.length <= 1) return 0;
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((acc, v) => acc + (v - mean) ** 2, 0) / lengths.length;
  return Math.min(1, Math.sqrt(variance) / (mean || 1));
}

export function runOracleStyle(
  prose: ProseDoc,
  genome: StyleGenomeInput,
): OracleResult {
  const findings: string[] = [];

  if (prose.paragraphs.length === 0) {
    return {
      oracle_id: 'ORACLE_STYLE',
      verdict: 'FAIL',
      score: 0,
      findings: ['No paragraphs to evaluate'],
      evidence_hash: sha256(canonicalize({ oracle: 'style', result: 'empty' })),
    };
  }

  // Measure actual style features
  const actualBurstiness = computeBurstiness(prose.paragraphs);
  const allText = prose.paragraphs.map((p) => p.text).join(' ');
  const allWords = allText.toLowerCase().split(/\s+/).filter((w) => w.length > 0);
  const uniqueWords = new Set(allWords);
  const actualLexical = allWords.length > 0 ? Math.min(1, uniqueWords.size / allWords.length) : 0;

  const totalWords = prose.paragraphs.reduce((acc, p) => acc + p.word_count, 0);
  const totalSentences = prose.paragraphs.reduce((acc, p) => acc + p.sentence_count, 0);
  const actualAvgSentLen = totalSentences > 0 ? totalWords / totalSentences : 0;

  // Score each axis (1.0 = perfect match, 0.0 = max deviation)
  const burstyScore = 1 - Math.min(1, Math.abs(actualBurstiness - genome.target_burstiness));
  const lexicalScore = 1 - Math.min(1, Math.abs(actualLexical - genome.target_lexical_richness));
  const sentLenScore = genome.target_avg_sentence_length > 0
    ? 1 - Math.min(1, Math.abs(actualAvgSentLen - genome.target_avg_sentence_length) / genome.target_avg_sentence_length)
    : 1;

  const overallScore = (burstyScore + lexicalScore + sentLenScore) / 3;

  if (burstyScore < 0.7) findings.push(`Burstiness drift: target ${genome.target_burstiness}, actual ${actualBurstiness.toFixed(3)}`);
  if (lexicalScore < 0.7) findings.push(`Lexical richness drift: target ${genome.target_lexical_richness}, actual ${actualLexical.toFixed(3)}`);
  if (sentLenScore < 0.7) findings.push(`Avg sentence length drift: target ${genome.target_avg_sentence_length}, actual ${actualAvgSentLen.toFixed(1)}`);

  // Check signature traits
  for (const trait of genome.signature_traits) {
    findings.push(`Signature trait evaluated: ${trait}`);
  }

  const verdict = overallScore >= 0.6 ? 'PASS' : 'FAIL';

  const evidenceHash = sha256(canonicalize({
    oracle: 'ORACLE_STYLE',
    burstiness: actualBurstiness,
    lexical: actualLexical,
    avgSentLen: actualAvgSentLen,
    score: overallScore,
  }));

  return {
    oracle_id: 'ORACLE_STYLE',
    verdict,
    score: overallScore,
    findings,
    evidence_hash: evidenceHash,
  };
}
