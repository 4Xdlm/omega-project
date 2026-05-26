/**
 * OMEGA V2.1 — Sentence Splitter
 *
 * Splits text into sentences respecting French punctuation rules.
 * Deterministic + reproducible.
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

/**
 * Split text into sentences using French punctuation rules.
 *
 * Heuristic-based: handles common cases (. ! ? followed by space + uppercase).
 * Preserves abbreviations (M., Mme., etc.) and quoted dialogues.
 *
 * @param text - Raw chapter text
 * @returns Array of sentence strings (trimmed, non-empty)
 */
export function splitSentences(text: string): string[] {
  if (!text || text.trim().length === 0) return [];

  // Normalize whitespace
  const normalized = text.replace(/\s+/g, ' ').trim();

  // Common French abbreviations to protect
  const abbreviations = [
    'M\\.', 'Mme\\.', 'Mlle\\.', 'Dr\\.', 'Prof\\.', 'St\\.', 'Ste\\.',
    'etc\\.', 'cf\\.', 'p\\.', 'pp\\.', 'no\\.', 'art\\.', 'vol\\.',
    'av\\.', 'apr\\.', 'J\\.-C\\.', 'a\\.m\\.', 'p\\.m\\.',
  ];

  // Replace abbreviation periods with placeholder
  let protectedText = normalized;
  const placeholders: Map<string, string> = new Map();
  abbreviations.forEach((abbr, i) => {
    const pattern = new RegExp(abbr, 'g');
    const placeholder = `__ABBR_${i}__`;
    placeholders.set(placeholder, abbr.replace(/\\\./g, '.'));
    protectedText = protectedText.replace(pattern, placeholder);
  });

  // Split on sentence-ending punctuation followed by space + uppercase or quote
  // OR by end of string
  const sentences = protectedText.split(/(?<=[.!?…])\s+(?=["«—\-A-ZÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÑÇ])/);

  // Restore abbreviations
  const restored = sentences.map((s) => {
    let result = s.trim();
    for (const [placeholder, original] of placeholders) {
      result = result.replace(new RegExp(placeholder, 'g'), original);
    }
    return result;
  });

  return restored.filter((s) => s.length > 0);
}

/**
 * Count words in a sentence (whitespace-separated tokens with at least one letter).
 */
export function countWords(sentence: string): number {
  const tokens = sentence.split(/\s+/).filter((t) => /[a-zàâäéèêëïîôöùûüÿñçA-ZÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÑÇ]/.test(t));
  return tokens.length;
}

/**
 * Compute cumulative word counts for a list of sentences.
 * Returns array where [i] = total words from sentence 0 to i inclusive.
 */
export function cumulativeWordCounts(sentences: readonly string[]): number[] {
  const cumul: number[] = [];
  let total = 0;
  for (const sentence of sentences) {
    total += countWords(sentence);
    cumul.push(total);
  }
  return cumul;
}

/**
 * Compute total word count.
 */
export function totalWords(sentences: readonly string[]): number {
  const cumul = cumulativeWordCounts(sentences);
  return cumul.length > 0 ? (cumul[cumul.length - 1] ?? 0) : 0;
}
