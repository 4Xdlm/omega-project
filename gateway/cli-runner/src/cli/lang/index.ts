/**
 * OMEGA CLI — Language Support Index
 * Phase 16.1 — Multi-language Emotion Detection
 *
 * Provides language-specific emotion keywords.
 * External to FROZEN modules (genome/mycelium).
 */

import { EMOTION_KEYWORDS_EN, LANG_NAME_EN } from './en.js';
import { EMOTION_KEYWORDS_FR, LANG_NAME_FR } from './fr.js';

export type SupportedLanguage = 'en' | 'fr';

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'fr'];

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: LANG_NAME_EN,
  fr: LANG_NAME_FR,
};

export const EMOTION_KEYWORDS: Record<SupportedLanguage, Record<string, string[]>> = {
  en: EMOTION_KEYWORDS_EN,
  fr: EMOTION_KEYWORDS_FR,
};

/**
 * Get emotion keywords for a specific language.
 * Defaults to English if language not supported.
 */
export function getEmotionKeywords(lang: string): Record<string, string[]> {
  const normalizedLang = lang.toLowerCase() as SupportedLanguage;
  return EMOTION_KEYWORDS[normalizedLang] ?? EMOTION_KEYWORDS_EN;
}

/**
 * Check if a language is supported.
 */
export function isValidLanguage(lang: string): lang is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(lang.toLowerCase() as SupportedLanguage);
}

/**
 * Get language display name.
 */
export function getLanguageName(lang: string): string {
  const normalizedLang = lang.toLowerCase() as SupportedLanguage;
  return LANGUAGE_NAMES[normalizedLang] ?? 'Unknown';
}

// Re-export individual language modules
export { EMOTION_KEYWORDS_EN, LANG_NAME_EN } from './en.js';
export { EMOTION_KEYWORDS_FR, LANG_NAME_FR } from './fr.js';
