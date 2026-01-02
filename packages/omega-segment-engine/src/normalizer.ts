// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — SEGMENT ENGINE v1.0.0 — NORMALIZER
// ═══════════════════════════════════════════════════════════════════════════════
// Normalisation déterministe du texte AVANT segmentation
// ═══════════════════════════════════════════════════════════════════════════════

import type { NewlinePolicy, NormalizationResult } from "./types.js";

/**
 * Normalise le texte selon la politique choisie
 * 
 * @param input Texte brut
 * @param policy Politique de normalisation
 * @returns Texte normalisé + métadonnées
 */
export function normalizeText(
  input: string,
  policy: NewlinePolicy
): NormalizationResult {
  let text = input;

  // 1. Normalisation CRLF → LF si demandé
  if (policy === "normalize_lf") {
    // Ordre important: \r\n d'abord, puis \r isolés
    text = text.replace(/\r\n/g, "\n");
    text = text.replace(/\r/g, "\n");
  }

  // 2. Normalisation ellipses: "..." → "…" (Unicode U+2026)
  // Important pour le comptage de caractères et la détection de fin de phrase
  text = text.replace(/\.{3,}/g, "…");

  // 3. Normalisation espaces multiples → espace simple (optionnel, désactivé par défaut)
  // On ne touche PAS aux espaces pour préserver les offsets
  // text = text.replace(/  +/g, " ");

  return { text };
}

/**
 * Compte les mots dans un texte (méthode FR-aware)
 * 
 * Règles:
 * - Split sur whitespace (\s+)
 * - Split sur apostrophe pour FR: "l'amour" → ["l", "amour"]
 * - Filtre les tokens vides
 * 
 * @param text Texte à analyser
 * @returns Nombre de mots/tokens
 */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;

  // Split sur whitespace
  const parts = trimmed.split(/\s+/);

  // Pour chaque part, split sur apostrophe (FR: l'amour, d'accord)
  let count = 0;
  for (const part of parts) {
    if (part.length === 0) continue;

    // Apostrophes FR: ' (U+0027) et ' (U+2019)
    const subParts = part.split(/['']/);
    for (const sub of subParts) {
      // Ne compte que si contient au moins une lettre ou chiffre
      if (/[\p{L}\p{N}]/u.test(sub)) {
        count++;
      }
    }
  }

  return count;
}

/**
 * Compte les lignes dans un texte
 * @param text Texte à analyser
 * @returns Nombre de lignes (newlines + 1, ou 0 si vide)
 */
export function countLines(text: string): number {
  if (text.length === 0) return 0;

  let count = 1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\n") count++;
  }
  return count;
}

/**
 * Vérifie si un caractère est un whitespace
 */
export function isWhitespace(ch: string): boolean {
  return ch === " " || ch === "\t" || ch === "\n" || ch === "\r";
}

/**
 * Trim un span sans déplacer les offsets au-delà du span original
 * 
 * @param input Texte source
 * @param start Début du span
 * @param end Fin du span
 * @returns Nouveau span trimé (ou vide si tout est whitespace)
 */
export function trimSpan(
  input: string,
  start: number,
  end: number
): { start: number; end: number } {
  let s = start;
  let e = end;

  // Avancer start sur whitespace
  while (s < e && isWhitespace(input[s])) {
    s++;
  }

  // Reculer end sur whitespace
  while (e > s && isWhitespace(input[e - 1])) {
    e--;
  }

  return { start: s, end: e };
}

/**
 * Avance après les whitespaces
 */
export function skipWhitespace(input: string, from: number): number {
  let i = from;
  while (i < input.length && isWhitespace(input[i])) {
    i++;
  }
  return i;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS INLINE
// ═══════════════════════════════════════════════════════════════════════════════

export function selfTest(): boolean {
  // Test CRLF normalization
  const r1 = normalizeText("a\r\nb\rc", "normalize_lf");
  if (r1.text !== "a\nb\nc") {
    console.error("FAIL: CRLF normalization");
    return false;
  }

  // Test preserve
  const r2 = normalizeText("a\r\nb", "preserve");
  if (r2.text !== "a\r\nb") {
    console.error("FAIL: preserve mode");
    return false;
  }

  // Test ellipsis
  const r3 = normalizeText("test...", "normalize_lf");
  if (r3.text !== "test…") {
    console.error("FAIL: ellipsis normalization");
    return false;
  }

  // Test word count
  if (countWords("Hello world") !== 2) {
    console.error("FAIL: basic word count");
    return false;
  }

  // Test word count FR
  if (countWords("l'amour d'accord") !== 4) {
    console.error("FAIL: FR word count (apostrophe)");
    return false;
  }

  // Test word count empty
  if (countWords("   ") !== 0) {
    console.error("FAIL: empty word count");
    return false;
  }

  // Test line count
  if (countLines("a\nb\nc") !== 3) {
    console.error("FAIL: line count");
    return false;
  }

  // Test line count empty
  if (countLines("") !== 0) {
    console.error("FAIL: empty line count");
    return false;
  }

  // Test trimSpan
  const span = trimSpan("  hello  ", 0, 9);
  if (span.start !== 2 || span.end !== 7) {
    console.error("FAIL: trimSpan", span);
    return false;
  }

  console.log("✅ normalizer.ts: All tests passed");
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  normalizeText,
  countWords,
  countLines,
  isWhitespace,
  trimSpan,
  skipWhitespace,
  selfTest,
};
