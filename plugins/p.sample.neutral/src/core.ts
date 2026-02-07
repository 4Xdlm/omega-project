/**
 * p.sample.neutral — Core v1.0
 * DR-2: Pure core. L6: Deterministic. L10: Non-actuation.
 */

import { MAX_TAGS, HIGH_VOCAB_RATIO, LONG_WORD_THRESHOLD } from './constants.js';

export interface AnalysisResult {
  readonly summary: string;
  readonly word_count: number;
  readonly char_count: number;
  readonly language_hint: string;
  readonly tags: readonly string[];
  readonly complexity_score: number;
}

export function analyzeText(content: string): AnalysisResult {
  const char_count = content.length;
  const words = content.split(/\s+/).filter(w => w.length > 0);
  const word_count = words.length;
  const language_hint = detectLanguageHint(content);
  const tags = extractTags(content, words, word_count, char_count);
  const complexity_score = computeComplexity(words, word_count);

  const summaryWords = words.slice(0, 10);
  const summary = summaryWords.length > 0
    ? `Text fragment: "${summaryWords.join(' ')}${words.length > 10 ? '…' : ''}"`
    : 'Empty text fragment';

  return { summary, word_count, char_count, language_hint, tags, complexity_score };
}

function detectLanguageHint(content: string): string {
  let latin = 0, accentedLatin = 0, cjk = 0, cyrillic = 0, arabic = 0, letterTotal = 0;
  for (const char of content) {
    const code = char.codePointAt(0);
    if (code === undefined) continue;
    // Only count script-identifiable characters (letters), skip spaces/punctuation/digits
    if (code >= 0x0041 && code <= 0x005A) { latin++; letterTotal++; }        // A-Z
    else if (code >= 0x0061 && code <= 0x007A) { latin++; letterTotal++; }    // a-z
    else if (code >= 0x00C0 && code <= 0x024F) { accentedLatin++; letterTotal++; }
    else if (code >= 0x4E00 && code <= 0x9FFF) { cjk++; letterTotal++; }
    else if (code >= 0x0400 && code <= 0x04FF) { cyrillic++; letterTotal++; }
    else if (code >= 0x0600 && code <= 0x06FF) { arabic++; letterTotal++; }
    // spaces, digits, punctuation: not counted
  }
  if (letterTotal === 0) return 'und';
  if (cjk / letterTotal > 0.3) return 'zh';
  if (cyrillic / letterTotal > 0.3) return 'ru';
  if (arabic / letterTotal > 0.3) return 'ar';
  if (accentedLatin > 0 && accentedLatin / letterTotal > 0.01) {
    if (/[ñ¿¡]/.test(content)) return 'es';
    return 'fr';
  }
  return 'en';
}

function extractTags(content: string, words: string[], wordCount: number, charCount: number): readonly string[] {
  const tags: string[] = [];

  if (wordCount <= 10) tags.push('short');
  else if (wordCount <= 100) tags.push('medium');
  else tags.push('long');

  const sentenceEnders = (content.match(/[.!?]+/g) ?? []).length;
  tags.push(sentenceEnders > 1 ? 'multi-sentence' : 'single-sentence');

  const punctuation = (content.match(/[,;:!?.'"\-()[\]{}]/g) ?? []).length;
  if (charCount > 0 && punctuation / charCount > 0.05) tags.push('punctuation-heavy');

  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  if (wordCount > 0 && uniqueWords.size / wordCount > HIGH_VOCAB_RATIO) tags.push('rich-vocabulary');

  if (content.includes('?')) tags.push('interrogative');
  if (content.includes('!')) tags.push('exclamatory');
  if (/\d/.test(content)) tags.push('contains-numbers');

  const uppercase = (content.match(/[A-Z]/g) ?? []).length;
  const letters = (content.match(/[a-zA-Z]/g) ?? []).length;
  if (letters > 0 && uppercase / letters > 0.5) tags.push('high-uppercase');

  const lowerWords = words.map(w => w.toLowerCase().replace(/[^a-zàâéèêëîïôùûüÿçœæ]/g, ''));
  const natureWords = new Set(['sun', 'moon', 'sea', 'sky', 'wind', 'rain', 'tree', 'flower', 'river', 'mountain', 'soleil', 'mer', 'ciel', 'vent', 'pluie', 'arbre', 'fleur']);
  if (lowerWords.some(w => natureWords.has(w))) tags.push('nature');

  const emotionWords = new Set(['love', 'hate', 'fear', 'joy', 'sad', 'happy', 'angry', 'calm', 'amour', 'joie', 'peur', 'triste', 'calme', 'colère']);
  if (lowerWords.some(w => emotionWords.has(w))) tags.push('emotional');

  const descriptiveWords = new Set(['beautiful', 'dark', 'bright', 'quiet', 'loud', 'beau', 'sombre', 'brillant', 'fort']);
  if (lowerWords.some(w => descriptiveWords.has(w))) tags.push('descriptive');

  return tags.slice(0, MAX_TAGS);
}

function computeComplexity(words: string[], wordCount: number): number {
  if (wordCount === 0) return 0;
  const avgLen = words.reduce((sum, w) => sum + w.length, 0) / wordCount;
  const normalizedAvgLen = Math.min(1, Math.max(0, (avgLen - 1) / 11));
  const longWords = words.filter(w => w.length > LONG_WORD_THRESHOLD).length;
  const longWordRatio = longWords / wordCount;
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  const vocabRichness = uniqueWords.size / wordCount;
  const raw = 0.4 * normalizedAvgLen + 0.3 * longWordRatio + 0.3 * vocabRichness;
  return Math.round(raw * 10000) / 10000;
}
