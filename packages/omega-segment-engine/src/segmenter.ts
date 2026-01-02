// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — SEGMENT ENGINE v1.0.0 — SEGMENTER (CORE)
// ═══════════════════════════════════════════════════════════════════════════════
// Découpage déterministe du texte en segments
// Standard: NASA-Grade L4 / AS9100D / DO-178C Level A
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  Segment,
  SegmentMode,
  SegmentationOptions,
  SegmentationResult,
  NewlinePolicy,
  RawSpan,
} from "./types.js";
import { stableStringify, sha256Hex, shortHash } from "./canonical.js";
import { normalizeText, countWords, countLines, trimSpan, skipWhitespace, isWhitespace } from "./normalizer.js";
import { isAfterAbbreviation, isDecimalNumber, ABBREVIATIONS_DEFAULT } from "./exceptions.js";

// ═══════════════════════════════════════════════════════════════════════════════
// API PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Segmente un texte selon le mode choisi
 * 
 * GARANTIE: Déterminisme absolu
 * - Même input + même options → même résultat
 * - segmentation_hash stable
 * 
 * @param inputRaw Texte brut à segmenter
 * @param options Options de segmentation
 * @returns Résultat de segmentation avec hash
 */
export function segmentText(
  inputRaw: string,
  options: SegmentationOptions
): SegmentationResult {
  // 1. Normalisation
  const newline_policy: NewlinePolicy = options.newline_policy ?? "normalize_lf";
  const { text: input } = normalizeText(inputRaw, newline_policy);

  // 2. Récupérer les options avec défauts
  const mode = options.mode;
  const abbreviations = options.abbreviations ?? ABBREVIATIONS_DEFAULT;
  const sentenceBreakOnDoubleNewline = options.sentence_break_on_double_newline ?? true;
  const sceneSeparators = options.scene_separators ?? ["###", "***", "---", "===", "~~~"];

  // 3. Découpage selon le mode
  let spans: RawSpan[];
  switch (mode) {
    case "sentence":
      spans = sentenceSpans(input, abbreviations, sentenceBreakOnDoubleNewline);
      break;
    case "paragraph":
      spans = paragraphSpans(input);
      break;
    case "scene":
      spans = sceneSpans(input, sceneSeparators);
      break;
    default:
      throw new Error(`Unknown segment mode: ${mode}`);
  }

  // 4. Nettoyer: trim + filtrer vides
  spans = spans
    .map(s => trimSpan(input, s.start, s.end))
    .filter(s => s.end > s.start);

  // 5. Construire les Segments
  const segments: Segment[] = spans.map((s, idx) =>
    buildSegment(input, s.start, s.end, idx, mode)
  );

  // 6. Calculs finaux
  const total_segment_char_count = segments.reduce((sum, s) => sum + s.char_count, 0);
  const coverage_ratio = input.length > 0 ? total_segment_char_count / input.length : 0;

  // 7. Hash déterministe
  const segmentation_hash = computeSegmentationHash({
    mode,
    newline_policy,
    input_char_count: input.length,
    spans: spans.map(s => ({ start: s.start, end: s.end })),
  });

  return {
    mode,
    newline_policy,
    input_char_count: input.length,
    segments,
    segment_count: segments.length,
    total_segment_char_count,
    segmentation_hash,
    coverage_ratio,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SENTENCE MODE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Découpe sur ponctuation finale: . ! ? …
 * Avec gestion des abréviations et nombres décimaux
 */
function sentenceSpans(
  input: string,
  abbreviations: readonly string[],
  breakOnDoubleNewline: boolean
): RawSpan[] {
  const spans: RawSpan[] = [];
  const len = input.length;
  let start = 0;

  for (let i = 0; i < len; i++) {
    const ch = input[i];

    // Frontière forte: double newline
    if (breakOnDoubleNewline && isDoubleNewlineAt(input, i)) {
      if (i > start) {
        spans.push({ start, end: i });
      }
      // Sauter le bloc de newlines
      i = consumeNewlineBlock(input, i) - 1;
      start = i + 1;
      continue;
    }

    // Ponctuation de fin de phrase
    if (isSentenceEnd(ch)) {
      // Vérifier si c'est une vraie fin de phrase
      if (ch === ".") {
        // Cas spéciaux: abréviation ou nombre décimal
        if (isAfterAbbreviation(input, i, abbreviations)) {
          continue; // Ce n'est pas une fin de phrase
        }
        if (isDecimalNumber(input, i)) {
          continue; // Ce n'est pas une fin de phrase
        }
      }

      // C'est une vraie fin de phrase
      // Inclure la ponctuation dans le segment
      spans.push({ start, end: i + 1 });

      // CORRECTION CRITIQUE: Sauter les whitespaces après ponctuation
      // pour éviter qu'ils soient inclus au début du segment suivant
      const nextStart = skipWhitespace(input, i + 1);
      start = nextStart;
      i = nextStart - 1; // -1 car la boucle va incrémenter
    }
  }

  // Segment final (texte restant sans ponctuation finale)
  if (start < len) {
    spans.push({ start, end: len });
  }

  return spans;
}

/**
 * Caractères de fin de phrase (incluant CJK)
 */
function isSentenceEnd(ch: string): boolean {
  return (
    ch === "." ||
    ch === "!" ||
    ch === "?" ||
    ch === "…" ||
    // Ponctuation CJK
    ch === "。" ||  // U+3002 Ideographic Full Stop (Japonais/Chinois)
    ch === "！" ||  // U+FF01 Fullwidth Exclamation Mark
    ch === "？" ||  // U+FF1F Fullwidth Question Mark
    ch === "．"     // U+FF0E Fullwidth Full Stop
  );
}

/**
 * Détecte un double saut de ligne à la position i
 */
function isDoubleNewlineAt(input: string, i: number): boolean {
  const ch = input[i];

  if (ch === "\n") {
    // \n\n
    if (i + 1 < input.length && input[i + 1] === "\n") return true;
    // \n suivi d'espaces puis \n
    let j = i + 1;
    while (j < input.length && (input[j] === " " || input[j] === "\t")) j++;
    if (j < input.length && input[j] === "\n") return true;
  }

  // Cas \r\n\r\n (mode preserve)
  if (ch === "\r" && i + 3 < input.length) {
    if (input[i + 1] === "\n" && input[i + 2] === "\r" && input[i + 3] === "\n") {
      return true;
    }
  }

  return false;
}

/**
 * Consomme un bloc de newlines (pour avancer après)
 */
function consumeNewlineBlock(input: string, i: number): number {
  const len = input.length;
  let j = i;

  while (j < len) {
    const ch = input[j];
    if (ch === "\n") {
      j++;
      continue;
    }
    if (ch === "\r" && j + 1 < len && input[j + 1] === "\n") {
      j += 2;
      continue;
    }
    if (ch === " " || ch === "\t") {
      j++;
      continue;
    }
    break;
  }

  return j;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARAGRAPH MODE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Découpe sur lignes vides (≥2 newlines consécutifs)
 */
function paragraphSpans(input: string): RawSpan[] {
  const spans: RawSpan[] = [];
  const len = input.length;
  let start = 0;

  for (let i = 0; i < len; i++) {
    if (isParagraphSeparatorAt(input, i)) {
      // Fin du paragraphe courant
      if (i > start) {
        spans.push({ start, end: i });
      }
      // Avancer après le séparateur
      i = advanceParagraphSeparator(input, i) - 1;
      start = i + 1;
    }
  }

  // Paragraphe final
  if (start < len) {
    spans.push({ start, end: len });
  }

  return spans;
}

/**
 * Détecte un séparateur de paragraphe (≥2 newlines)
 */
function isParagraphSeparatorAt(input: string, i: number): boolean {
  const len = input.length;
  let j = i;
  let newlineCount = 0;

  while (j < len) {
    const ch = input[j];

    if (ch === "\r" && j + 1 < len && input[j + 1] === "\n") {
      newlineCount++;
      j += 2;
      // Consommer espaces/tabs
      while (j < len && (input[j] === " " || input[j] === "\t")) j++;
      continue;
    }

    if (ch === "\n") {
      newlineCount++;
      j++;
      // Consommer espaces/tabs
      while (j < len && (input[j] === " " || input[j] === "\t")) j++;
      continue;
    }

    break;
  }

  return newlineCount >= 2;
}

/**
 * Avance après un séparateur de paragraphe
 */
function advanceParagraphSeparator(input: string, i: number): number {
  const len = input.length;
  let j = i;

  while (j < len) {
    const ch = input[j];

    if (ch === "\r" && j + 1 < len && input[j + 1] === "\n") {
      j += 2;
      while (j < len && (input[j] === " " || input[j] === "\t")) j++;
      continue;
    }

    if (ch === "\n") {
      j++;
      while (j < len && (input[j] === " " || input[j] === "\t")) j++;
      continue;
    }

    break;
  }

  return j;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCENE MODE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Découpe sur séparateurs explicites (lignes contenant uniquement le séparateur)
 * Ex: ###, ***, ---
 */
function sceneSpans(input: string, separators: readonly string[]): RawSpan[] {
  const spans: RawSpan[] = [];
  const len = input.length;

  let lineStart = 0;
  let sceneStart = 0;

  for (let i = 0; i <= len; i++) {
    const atEnd = i === len;
    const ch = input[i];

    // Fin de ligne ou fin de texte
    if (atEnd || ch === "\n") {
      const lineEnd = i;
      const lineContent = input.slice(lineStart, lineEnd);
      const trimmed = lineContent.trim();

      // Vérifier si c'est un séparateur
      if (separators.includes(trimmed)) {
        // Fin de scène AVANT cette ligne (séparateur exclu)
        if (lineStart > sceneStart) {
          spans.push({ start: sceneStart, end: lineStart });
        }
        // Nouvelle scène après le séparateur
        sceneStart = atEnd ? len : i + 1;
      }

      lineStart = atEnd ? len : i + 1;
    }
  }

  // Scène finale
  if (sceneStart < len) {
    spans.push({ start: sceneStart, end: len });
  }

  return spans;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTRUCTION SEGMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Construit un Segment à partir d'un span
 */
function buildSegment(
  input: string,
  start: number,
  end: number,
  index: number,
  mode: SegmentMode
): Segment {
  const text = input.slice(start, end);

  // ID déterministe basé sur mode+index+start+end (PAS sur le texte)
  const idSource = `${mode}:${index}:${start}:${end}`;
  const id = `seg_${index}_${shortHash(idSource)}`;

  return {
    id,
    index,
    start,
    end,
    text,
    word_count: countWords(text),
    char_count: text.length,
    line_count: countLines(text),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HASH SEGMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hash déterministe de la segmentation
 * Basé sur: mode, policy, input_char_count, spans (start/end)
 */
function computeSegmentationHash(payload: {
  mode: SegmentMode;
  newline_policy: NewlinePolicy;
  input_char_count: number;
  spans: Array<{ start: number; end: number }>;
}): string {
  const canonical = stableStringify(payload);
  return sha256Hex(canonical);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  segmentText,
};
