/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — CACOPHONY DETECTOR
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: phonetic/cacophony-detector.ts
 * Sprint: 15.1
 * Invariant: ART-PHON-01
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Detects gross cacophonies in French prose without phonemizer.
 * Uses consonant cluster analysis and repeated consonant sounds.
 * 100% CALC — deterministic.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface CacophonyResult {
  readonly cacophonies: readonly CacophonyMatch[];
  readonly total_count: number;
  readonly severity_score: number; // 0-100 (0 = perfect euphony, 100 = extreme cacophony)
  readonly worst: readonly CacophonyMatch[]; // Top 5
}

export interface CacophonyMatch {
  readonly sentence_index: number;
  readonly sentence: string;
  readonly type: CacophonyType;
  readonly trigger: string; // The specific offending text
  readonly severity: 'critical' | 'high' | 'medium';
}

export type CacophonyType =
  | 'consonant_cluster'       // 4+ consonnes consécutives cross-word
  | 'repeated_onset'          // 3+ mots consécutifs même consonne initiale (non allitération)
  | 'sibilant_chain'          // 3+ sifflantes (s, z, ch, j) consécutives
  | 'plosive_chain'           // 3+ plosives (p, t, k, b, d, g) consécutives
  | 'hiatus'                  // Voyelle finale + voyelle initiale identique ("a à")
  | 'rhyme_proximity';        // 2 mots rimant à < 3 mots d'écart (hors intention)

// ═══════════════════════════════════════════════════════════════════════════════
// PHONETIC CLASSIFICATION (FR approximation, no phonemizer)
// ═══════════════════════════════════════════════════════════════════════════════

const CONSONANTS = new Set('bcdfghjklmnpqrstvwxz'.split(''));
const SIBILANTS = new Set(['s', 'z', 'ch', 'j']);
const PLOSIVES = new Set(['p', 't', 'k', 'b', 'd', 'g']);
const VOWELS = new Set('aeiouyàâäéèêëïîôùûüÿœæ'.split(''));

/** Normalize text: lowercase, strip non-letter except spaces */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents for consonant analysis
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Get initial consonant sound of a word (simplified) */
function getOnset(word: string): string {
  const lower = word.toLowerCase();
  // Digraphs first
  if (lower.startsWith('ch')) return 'ch';
  if (lower.startsWith('ph')) return 'f';
  if (lower.startsWith('th')) return 't';
  if (lower.startsWith('qu')) return 'k';
  if (lower.startsWith('gu')) return 'g';
  // Single consonant
  if (lower.length > 0 && CONSONANTS.has(lower[0])) return lower[0];
  return '';
}

/** Get last vowel sound of a word for rhyme detection (simplified: last 2-3 chars) */
function getRhymeEnd(word: string): string {
  const lower = word.toLowerCase().replace(/[^a-zàâäéèêëïîôùûüÿœæ]/g, '');
  if (lower.length < 2) return lower;
  return lower.slice(-3);
}

/** Get final vowel of a word (for hiatus detection) */
function getFinalVowel(word: string): string {
  const lower = word.toLowerCase();
  for (let i = lower.length - 1; i >= 0; i--) {
    if (VOWELS.has(lower[i])) return lower[i];
  }
  return '';
}

/** Get initial vowel of a word (for hiatus detection) */
function getInitialVowel(word: string): string {
  const lower = word.toLowerCase();
  for (let i = 0; i < lower.length; i++) {
    if (VOWELS.has(lower[i])) return lower[i];
    if (CONSONANTS.has(lower[i])) return ''; // starts with consonant
  }
  return '';
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPLIT SENTENCES
// ═══════════════════════════════════════════════════════════════════════════════

function splitSentences(prose: string): readonly string[] {
  const raw = prose
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?…])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (raw.length <= 1 && prose.includes('\n')) {
    return prose.split(/\n+/).map(s => s.trim()).filter(s => s.length > 0);
  }
  return raw;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/** Detect consonant clusters across word boundaries (4+ consecutive consonants) */
function detectConsonantClusters(
  sentence: string,
  sentenceIndex: number,
): readonly CacophonyMatch[] {
  const matches: CacophonyMatch[] = [];
  const normalized = normalize(sentence);
  const noSpaces = normalized.replace(/\s/g, '');

  // Scan for 4+ consecutive consonants
  let clusterStart = -1;
  let clusterLen = 0;

  for (let i = 0; i < noSpaces.length; i++) {
    if (CONSONANTS.has(noSpaces[i])) {
      if (clusterStart === -1) clusterStart = i;
      clusterLen++;
    } else {
      if (clusterLen >= 4) {
        const trigger = noSpaces.slice(clusterStart, clusterStart + clusterLen);
        matches.push({
          sentence_index: sentenceIndex,
          sentence,
          type: 'consonant_cluster',
          trigger,
          severity: clusterLen >= 5 ? 'critical' : 'high',
        });
      }
      clusterStart = -1;
      clusterLen = 0;
    }
  }
  // trailing
  if (clusterLen >= 4) {
    const trigger = noSpaces.slice(clusterStart, clusterStart + clusterLen);
    matches.push({
      sentence_index: sentenceIndex,
      sentence,
      type: 'consonant_cluster',
      trigger,
      severity: clusterLen >= 5 ? 'critical' : 'high',
    });
  }

  return matches;
}

/** Detect 3+ consecutive words starting with same consonant (non-alliterative) */
function detectRepeatedOnsets(
  sentence: string,
  sentenceIndex: number,
): readonly CacophonyMatch[] {
  const matches: CacophonyMatch[] = [];
  const words = sentence.split(/\s+/).filter(w => w.length > 1);

  let streak = 1;
  let currentOnset = getOnset(words[0] ?? '');
  let streakStart = 0;

  for (let i = 1; i < words.length; i++) {
    const onset = getOnset(words[i]);
    if (onset && onset === currentOnset) {
      streak++;
    } else {
      if (streak >= 3 && currentOnset) {
        const trigger = words.slice(streakStart, streakStart + streak).join(' ');
        matches.push({
          sentence_index: sentenceIndex,
          sentence,
          type: 'repeated_onset',
          trigger,
          severity: streak >= 4 ? 'high' : 'medium',
        });
      }
      streak = 1;
      currentOnset = onset;
      streakStart = i;
    }
  }
  if (streak >= 3 && currentOnset) {
    const trigger = words.slice(streakStart, streakStart + streak).join(' ');
    matches.push({
      sentence_index: sentenceIndex,
      sentence,
      type: 'repeated_onset',
      trigger,
      severity: streak >= 4 ? 'high' : 'medium',
    });
  }

  return matches;
}

/** Detect sibilant chains: 3+ words with s/z/ch/j sounds */
function detectSibilantChains(
  sentence: string,
  sentenceIndex: number,
): readonly CacophonyMatch[] {
  const matches: CacophonyMatch[] = [];
  const words = sentence.toLowerCase().split(/\s+/).filter(w => w.length > 1);

  const hasSibilant = (word: string): boolean => {
    return word.includes('s') || word.includes('z') || word.includes('ch') || word.includes('j');
  };

  let streak = 0;
  let streakStart = 0;

  for (let i = 0; i < words.length; i++) {
    if (hasSibilant(words[i])) {
      if (streak === 0) streakStart = i;
      streak++;
    } else {
      if (streak >= 3) {
        const trigger = words.slice(streakStart, streakStart + streak).join(' ');
        matches.push({
          sentence_index: sentenceIndex,
          sentence,
          type: 'sibilant_chain',
          trigger,
          severity: streak >= 4 ? 'high' : 'medium',
        });
      }
      streak = 0;
    }
  }
  if (streak >= 3) {
    const trigger = words.slice(streakStart, streakStart + streak).join(' ');
    matches.push({
      sentence_index: sentenceIndex,
      sentence,
      type: 'sibilant_chain',
      trigger,
      severity: streak >= 4 ? 'high' : 'medium',
    });
  }

  return matches;
}

/** Detect hiatus: identical vowel at word boundary ("a à", "eau au") */
function detectHiatus(
  sentence: string,
  sentenceIndex: number,
): readonly CacophonyMatch[] {
  const matches: CacophonyMatch[] = [];
  const words = sentence.split(/\s+/).filter(w => w.length > 0);

  for (let i = 0; i < words.length - 1; i++) {
    const finalV = getFinalVowel(words[i]);
    const initialV = getInitialVowel(words[i + 1]);

    if (finalV && initialV && finalV === initialV) {
      const trigger = `${words[i]} ${words[i + 1]}`;
      matches.push({
        sentence_index: sentenceIndex,
        sentence,
        type: 'hiatus',
        trigger,
        severity: 'medium',
      });
    }
  }

  return matches;
}

/** Detect rhyme proximity: 2 words with same ending within 3 words */
function detectRhymeProximity(
  sentence: string,
  sentenceIndex: number,
): readonly CacophonyMatch[] {
  const matches: CacophonyMatch[] = [];
  const words = sentence.split(/\s+/).filter(w => w.length > 3);

  for (let i = 0; i < words.length; i++) {
    const endI = getRhymeEnd(words[i]);
    if (endI.length < 2) continue;

    for (let j = i + 1; j <= Math.min(i + 3, words.length - 1); j++) {
      const endJ = getRhymeEnd(words[j]);
      if (endJ.length >= 2 && endI === endJ && words[i].toLowerCase() !== words[j].toLowerCase()) {
        const trigger = `${words[i]} ... ${words[j]}`;
        matches.push({
          sentence_index: sentenceIndex,
          sentence,
          type: 'rhyme_proximity',
          trigger,
          severity: j - i === 1 ? 'high' : 'medium',
        });
      }
    }
  }

  return matches;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DETECTOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect cacophonies in French prose.
 * 100% CALC, deterministic.
 *
 * @param prose - Text to analyze
 * @returns CacophonyResult
 */
export function detectCacophony(prose: string): CacophonyResult {
  const sentences = splitSentences(prose);
  const allMatches: CacophonyMatch[] = [];

  for (let i = 0; i < sentences.length; i++) {
    allMatches.push(...detectConsonantClusters(sentences[i], i));
    allMatches.push(...detectRepeatedOnsets(sentences[i], i));
    allMatches.push(...detectSibilantChains(sentences[i], i));
    allMatches.push(...detectHiatus(sentences[i], i));
    allMatches.push(...detectRhymeProximity(sentences[i], i));
  }

  // Severity score: critical=3, high=2, medium=1
  const severityWeights: Record<string, number> = { critical: 3, high: 2, medium: 1 };
  const rawSeverity = allMatches.reduce((sum, m) => sum + (severityWeights[m.severity] ?? 1), 0);
  const totalSentences = Math.max(sentences.length, 1);
  // Normalize to 0-100: more cacophonies per sentence = higher score
  const severity_score = Math.min(100, (rawSeverity / totalSentences) * 20);

  // Worst 5
  const worst = [...allMatches]
    .sort((a, b) => (severityWeights[b.severity] ?? 0) - (severityWeights[a.severity] ?? 0))
    .slice(0, 5);

  return {
    cacophonies: allMatches,
    total_count: allMatches.length,
    severity_score,
    worst,
  };
}
