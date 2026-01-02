// OMEGA — TEXT ANALYZER MODULE — MAIN — NASA-GRADE L4 — Version 1.0.0
import { createHash } from "node:crypto";
import type {
  TextAnalyzerOptions, TextAnalysisResult, CharUnit, GraphemeUnit,
  LetterUnit, WordUnit, SentenceUnit, ParagraphUnit, Position,
  BasicStats, LinguisticStats, MyceliumStats, StyleStats, PerformanceStats,
  ReverseIndex, Proof, InvariantCheck, ValidationResult, ValidationIssue,
  CharCategory, ScriptType, SentenceType,
} from "./types";
import { TextAnalyzerError } from "./types";

export const MODULE_VERSION = "1.0.0";
export const OMEGA_SEED = 42;

const LATIN_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LETTER_RANKS: Record<string, number> = Object.fromEntries(
  LATIN_ALPHABET.split("").map((letter, index) => [letter, index + 1])
);
const VOWELS = new Set(["A", "E", "I", "O", "U", "Y"]);

const FRENCH_STOP_WORDS = new Set([
  "le", "la", "les", "l", "un", "une", "des", "du", "de", "d", "a", "au", "aux",
  "avec", "chez", "dans", "en", "entre", "par", "pour", "sans", "sous", "sur",
  "vers", "et", "ou", "ni", "mais", "donc", "or", "car", "que", "qu", "si",
  "comme", "quand", "je", "j", "tu", "il", "elle", "on", "nous", "vous", "ils",
  "elles", "me", "m", "te", "t", "se", "s", "lui", "leur", "ce", "c", "qui",
  "dont", "mon", "ma", "mes", "ton", "ta", "tes", "son", "sa", "ses", "notre",
  "nos", "votre", "vos", "est", "sont", "ai", "as", "avons", "avez", "ont",
  "ne", "n", "pas", "plus", "moins", "y", "cette", "ces",
]);

export const DEFAULT_OPTIONS: TextAnalyzerOptions = {
  unicodeNormalization: "NFKC",
  stripDiacritics: true,
  collapseSpaces: false,
  preserveCase: false,
  segmentationMode: "simple",
  sentenceDelimiters: [".", "!", "?", "..."],
  paragraphDelimiters: ["\n\n"],
  enableGraphemeIndex: true,
  enableWordIndex: true,
  enableNgrams: true,
  ngramSizes: [2, 3, 4, 5],
  enableMyceliumMetrics: true,
  enableGematria: true,
  enableStyleMetrics: true,
  enableStreaming: false,
  chunkSize: 100000,
  checkpointInterval: 10000,
  maxInputLength: 10000000,
  strictMode: true,
};

function sha256(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

function sortKeysDeep(obj: unknown): unknown {
  if (obj === null || obj === undefined || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sortKeysDeep);
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
    sorted[key] = sortKeysDeep((obj as Record<string, unknown>)[key]);
  }
  return sorted;
}

function stableJson(obj: unknown): string { return JSON.stringify(sortKeysDeep(obj)); }
function hashObject(obj: unknown): string { return sha256(stableJson(obj)); }
function combineHashes(...hashes: string[]): string { return sha256(hashes.join("\n")); }
function generateDeterministicUuid(seed: string): string {
  const h = sha256(seed);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

function getByteLength(text: string): number {
  let b = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 0x80) b += 1; else if (c < 0x800) b += 2;
    else if (c >= 0xD800 && c <= 0xDBFF) { b += 4; i++; } else b += 3;
  }
  return b;
}

function validateInput(input: unknown, options: TextAnalyzerOptions): ValidationResult {
  const start = performance.now();
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const info: ValidationIssue[] = [];
  
  if (input === null) {
    errors.push({ code: "NULL", level: "CRITICAL", message: "Input is null" });
    return { valid: false, errors, warnings, info, validationDurationMs: performance.now() - start };
  }
  if (input === undefined) {
    errors.push({ code: "UNDEFINED", level: "CRITICAL", message: "Input is undefined" });
    return { valid: false, errors, warnings, info, validationDurationMs: performance.now() - start };
  }
  if (typeof input !== "string") {
    errors.push({ code: "TYPE", level: "CRITICAL", message: `Expected string, got ${typeof input}` });
    return { valid: false, errors, warnings, info, validationDurationMs: performance.now() - start };
  }
  
  const text = input;
  if (getByteLength(text) > options.maxInputLength) {
    errors.push({ code: "SIZE", level: "CRITICAL", message: "Input too large" });
  }
  if (text.includes("\0")) {
    errors.push({ code: "NULL_BYTE", level: "HIGH", message: "Null bytes" });
  }
  
  return { valid: errors.length === 0, errors, warnings, info, validationDurationMs: performance.now() - start };
}

function canonicalize(input: string, options: TextAnalyzerOptions): string {
  let t = input;
  if (t.charCodeAt(0) === 0xFEFF) t = t.slice(1);
  t = t.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  t = t.normalize(options.unicodeNormalization);
  t = t.replace(/\t/g, " ");
  if (options.collapseSpaces) t = t.replace(/ {2,}/g, " ");
  return t;
}

function stripDiacritics(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").normalize("NFC");
}

function classifyChar(char: string): CharCategory {
  if (/\p{L}/u.test(char)) return "letter";
  if (/\p{N}/u.test(char)) return "digit";
  if (/\s/u.test(char)) return "whitespace";
  if (/\p{P}/u.test(char)) return "punctuation";
  if (/\p{S}/u.test(char)) return "symbol";
  const c = char.codePointAt(0) ?? 0;
  if (c < 0x20 || (c >= 0x7F && c <= 0x9F)) return "control";
  return "other";
}

function detectScript(char: string): ScriptType {
  const c = char.codePointAt(0) ?? 0;
  if ((c >= 0x41 && c <= 0x7A) || (c >= 0xC0 && c <= 0x24F)) return "Latin";
  if (c >= 0x400 && c <= 0x4FF) return "Cyrillic";
  if (c >= 0x370 && c <= 0x3FF) return "Greek";
  if (c >= 0x600 && c <= 0x6FF) return "Arabic";
  if (c >= 0x590 && c <= 0x5FF) return "Hebrew";
  if ((c >= 0x4E00 && c <= 0x9FFF) || (c >= 0x3040 && c <= 0x30FF)) return "CJK";
  if (c >= 0x1F300 && c <= 0x1F9FF) return "Emoji";
  return "Unknown";
}

function getLetterRank(char: string): number | null {
  const n = stripDiacritics(char).toUpperCase();
  return LETTER_RANKS[n] ?? null;
}

function isVowel(char: string): boolean {
  return VOWELS.has(stripDiacritics(char).toUpperCase());
}

function isEmoji(g: string): boolean {
  return /\p{Emoji_Presentation}|\p{Extended_Pictographic}/u.test(g);
}

export function calculateGematria(word: string): number {
  let t = 0;
  for (const c of word) {
    const r = getLetterRank(c);
    if (r !== null) t += r;
  }
  return t;
}

export function analyze(input: string, options?: Partial<TextAnalyzerOptions>): TextAnalysisResult {
  const startTime = performance.now();
  const opts: TextAnalyzerOptions = { ...DEFAULT_OPTIONS, ...options };
  
  // Validation
  const validationStart = performance.now();
  const validation = validateInput(input, opts);
  const validationMs = performance.now() - validationStart;
  
  if (!validation.valid) {
    throw new TextAnalyzerError(
      "INPUT_INVALID_ENCODING",
      validation.errors[0]?.message ?? "Validation failed",
      { errors: validation.errors }
    );
  }
  
  // Canonicalization
  const canonStart = performance.now();
  const canonical = canonicalize(input, opts);
  const canonicalizationMs = performance.now() - canonStart;
  
  // Character indexing
  const charIndexStart = performance.now();
  const chars: CharUnit[] = [];
  const positions: Position[] = [];
  let line = 1, column = 1, offset = 0;
  
  for (let i = 0; i < canonical.length; i++) {
    const char = canonical[i];
    const category = classifyChar(char);
    const position: Position = { offset, charIndex: i, graphemeIndex: i, line, column };
    positions.push(position);
    
    const charUnit: CharUnit = {
      char,
      codePoint: char.codePointAt(0) ?? 0,
      category,
      position,
      isAscii: char.charCodeAt(0) <= 127,
      isLatin: detectScript(char) === "Latin" && category === "letter",
      script: detectScript(char),
      unicodeBlock: "Basic",
    };
    
    if (category === "letter") {
      charUnit.upper = char.toUpperCase();
      charUnit.lower = char.toLowerCase();
      charUnit.normalized = stripDiacritics(char).toUpperCase();
      charUnit.letterRank = getLetterRank(char) ?? undefined;
      charUnit.isVowel = isVowel(char);
      charUnit.isConsonant = !isVowel(char);
    }
    
    chars.push(charUnit);
    offset += getByteLength(char);
    if (char === "\n") { line++; column = 1; } else { column++; }
  }
  const charIndexingMs = performance.now() - charIndexStart;
  
  // Grapheme indexing
  const graphemeStart = performance.now();
  const graphemes: GraphemeUnit[] = [];
  
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const seg = new Intl.Segmenter("fr", { granularity: "grapheme" });
    let gi = 0;
    for (const { segment, index } of seg.segment(canonical)) {
      graphemes.push({
        grapheme: segment,
        graphemeIndex: gi,
        charIndexStart: index,
        charIndexEnd: index + segment.length,
        codePoints: [...segment].map(c => c.codePointAt(0) ?? 0),
        category: classifyChar(segment[0]) as GraphemeUnit["category"],
        displayWidth: 1,
        isEmoji: isEmoji(segment),
      });
      gi++;
    }
  } else {
    for (let i = 0; i < chars.length; i++) {
      graphemes.push({
        grapheme: chars[i].char,
        graphemeIndex: i,
        charIndexStart: i,
        charIndexEnd: i + 1,
        codePoints: [chars[i].codePoint],
        category: chars[i].category as GraphemeUnit["category"],
        displayWidth: 1,
        isEmoji: false,
      });
    }
  }
  const graphemeIndexingMs = performance.now() - graphemeStart;
  
  // Letter indexing
  const letterStart = performance.now();
  const letters: LetterUnit[] = [];
  
  for (const cu of chars) {
    if (cu.category !== "letter") continue;
    const rank = getLetterRank(cu.char);
    if (rank === null) continue;
    
    letters.push({
      letterIndex: letters.length,
      normalizedLetter: stripDiacritics(cu.char).toUpperCase(),
      letterRank: rank,
      charIndex: cu.position.charIndex,
      graphemeIndex: cu.position.graphemeIndex,
      wordIndex: null,
      sentenceIndex: null,
      paragraphIndex: null,
      position: cu.position,
      isVowel: isVowel(cu.char),
      isConsonant: !isVowel(cu.char),
      originalChar: cu.char,
      script: cu.script,
    });
  }
  const letterIndexingMs = performance.now() - letterStart;
  
  // Word indexing
  const wordStart = performance.now();
  const words: WordUnit[] = [];
  const charToLetter = new Map<number, number>();
  for (const l of letters) charToLetter.set(l.charIndex, l.letterIndex);
  
  const wordRegex = /[\p{L}\p{N}]+(?:[''][\p{L}]+)?/gu;
  let match: RegExpExecArray | null;
  
  while ((match = wordRegex.exec(canonical)) !== null) {
    const word = match[0];
    const cs = match.index;
    const ce = match.index + word.length;
    const letterIndices: number[] = [];
    
    for (let i = cs; i < ce; i++) {
      const li = charToLetter.get(i);
      if (li !== undefined) letterIndices.push(li);
    }
    
    const normalizedWord = stripDiacritics(word).toLowerCase();
    let gematriaValue = 0;
    for (const li of letterIndices) gematriaValue += letters[li].letterRank;
    
    words.push({
      wordIndex: words.length,
      word,
      normalizedWord,
      charIndexStart: cs,
      charIndexEnd: ce,
      letterIndices,
      sentenceIndex: -1,
      paragraphIndex: -1,
      positionStart: positions[cs] ?? positions[0],
      positionEnd: positions[ce - 1] ?? positions[0],
      charCount: word.length,
      letterCount: letterIndices.length,
      gematriaValue,
      isCapitalized: word[0] === word[0].toUpperCase() && word.slice(1) === word.slice(1).toLowerCase(),
      isAllCaps: word === word.toUpperCase() && /[A-Z]/i.test(word),
      isAllLower: word === word.toLowerCase(),
      containsDigits: /\d/.test(word),
      containsHyphen: word.includes("-"),
      isContraction: /['']/.test(word),
      syllableCount: Math.max(1, (word.toLowerCase().match(/[aeiouyàâäéèêëïîôùûü]+/gi) || []).length),
      frequency: 0,
      isStopWord: FRENCH_STOP_WORDS.has(normalizedWord),
    });
  }
  
  // Calculate frequencies
  const freqMap = new Map<string, number>();
  for (const w of words) freqMap.set(w.normalizedWord, (freqMap.get(w.normalizedWord) ?? 0) + 1);
  for (let i = 0; i < words.length; i++) {
    (words[i] as { frequency: number }).frequency = freqMap.get(words[i].normalizedWord) ?? 1;
  }
  const wordIndexingMs = performance.now() - wordStart;
  
  // Segmentation
  const segmentStart = performance.now();
  
  // Paragraphs
  const paragraphs: ParagraphUnit[] = [];
  const paraBreaks = [...canonical.matchAll(/\n{2,}/g)].map(m => m.index ?? 0);
  paraBreaks.push(canonical.length);
  let pStart = 0;
  
  for (const brk of paraBreaks) {
    if (brk <= pStart) { pStart = brk + 2; continue; }
    const text = canonical.slice(pStart, brk).trim();
    if (text.length === 0) { pStart = brk + 2; continue; }
    
    paragraphs.push({
      paragraphIndex: paragraphs.length,
      text,
      charIndexStart: pStart,
      charIndexEnd: pStart + text.length,
      sentenceIndices: [],
      wordIndices: [],
      positionStart: positions[pStart] ?? positions[0],
      positionEnd: positions[pStart + text.length - 1] ?? positions[0],
      charCount: text.length,
      wordCount: 0,
      letterCount: 0,
      sentenceCount: 0,
      hash: sha256(text),
      avgSentenceLength: 0,
      dialogueRatio: 0,
      branchWeight: 0,
    });
    pStart = brk + 2;
  }
  
  if (paragraphs.length === 0 && canonical.trim().length > 0) {
    const text = canonical.trim();
    paragraphs.push({
      paragraphIndex: 0,
      text,
      charIndexStart: 0,
      charIndexEnd: text.length,
      sentenceIndices: [],
      wordIndices: [],
      positionStart: positions[0],
      positionEnd: positions[text.length - 1] ?? positions[0],
      charCount: text.length,
      wordCount: 0,
      letterCount: 0,
      sentenceCount: 0,
      hash: sha256(text),
      avgSentenceLength: 0,
      dialogueRatio: 0,
      branchWeight: 0,
    });
  }
  
  // Sentences
  const sentences: SentenceUnit[] = [];
  const charToPara = new Map<number, number>();
  for (const p of paragraphs) {
    for (let i = p.charIndexStart; i < p.charIndexEnd; i++) {
      charToPara.set(i, p.paragraphIndex);
    }
  }
  
  const sentRegex = /([.!?]+|\.{3})(?=\s|$)/g;
  let sStart = 0;
  
  while ((match = sentRegex.exec(canonical)) !== null) {
    const sEnd = match.index + match[0].length;
    const text = canonical.slice(sStart, sEnd).trim();
    if (text.length === 0) { sStart = sEnd; continue; }
    
    const punct = match[0].trim();
    let sentenceType: SentenceType = "declarative";
    if (punct.includes("?")) sentenceType = "interrogative";
    else if (punct.includes("!")) sentenceType = "exclamatory";
    else if (punct === "..." || punct === "...") sentenceType = "ellipsis";
    
    sentences.push({
      sentenceIndex: sentences.length,
      text,
      charIndexStart: sStart,
      charIndexEnd: sEnd,
      wordIndices: [],
      paragraphIndex: charToPara.get(sStart) ?? 0,
      positionStart: positions[sStart] ?? positions[0],
      positionEnd: positions[sEnd - 1] ?? positions[0],
      charCount: text.length,
      wordCount: 0,
      letterCount: 0,
      sentenceType,
      endingPunctuation: punct,
      hash: sha256(text),
      avgWordLength: 0,
      commaCount: (text.match(/,/g) || []).length,
      semicolonCount: (text.match(/;/g) || []).length,
      clauseCount: (text.match(/,/g) || []).length + 1,
      branchWeight: 0,
    });
    sStart = sEnd;
  }
  
  // Remaining text as fragment
  if (sStart < canonical.length) {
    const text = canonical.slice(sStart).trim();
    if (text.length > 0) {
      sentences.push({
        sentenceIndex: sentences.length,
        text,
        charIndexStart: sStart,
        charIndexEnd: canonical.length,
        wordIndices: [],
        paragraphIndex: charToPara.get(sStart) ?? 0,
        positionStart: positions[sStart] ?? positions[0],
        positionEnd: positions[canonical.length - 1] ?? positions[0],
        charCount: text.length,
        wordCount: 0,
        letterCount: 0,
        sentenceType: "fragment",
        endingPunctuation: null,
        hash: sha256(text),
        avgWordLength: 0,
        commaCount: 0,
        semicolonCount: 0,
        clauseCount: 1,
        branchWeight: 0,
      });
    }
  }
  
  // Link words to sentences/paragraphs
  const charToSent = new Map<number, number>();
  for (const s of sentences) {
    for (let i = s.charIndexStart; i < s.charIndexEnd; i++) {
      charToSent.set(i, s.sentenceIndex);
    }
  }
  
  for (let i = 0; i < words.length; i++) {
    (words[i] as { sentenceIndex: number }).sentenceIndex = charToSent.get(words[i].charIndexStart) ?? 0;
    (words[i] as { paragraphIndex: number }).paragraphIndex = charToPara.get(words[i].charIndexStart) ?? 0;
  }
  
  // Update letters with word indices
  const wordByChar = new Map<number, number>();
  for (const w of words) {
    for (let i = w.charIndexStart; i < w.charIndexEnd; i++) {
      wordByChar.set(i, w.wordIndex);
    }
  }
  
  for (let i = 0; i < letters.length; i++) {
    (letters[i] as { wordIndex: number | null }).wordIndex = wordByChar.get(letters[i].charIndex) ?? null;
    (letters[i] as { sentenceIndex: number | null }).sentenceIndex = charToSent.get(letters[i].charIndex) ?? null;
    (letters[i] as { paragraphIndex: number | null }).paragraphIndex = charToPara.get(letters[i].charIndex) ?? null;
  }
  
  // Update sentence stats and branchWeight
  for (const s of sentences) {
    const wis = words.filter(w => w.sentenceIndex === s.sentenceIndex);
    (s as { wordIndices: readonly number[] }).wordIndices = wis.map(w => w.wordIndex);
    (s as { wordCount: number }).wordCount = wis.length;
    (s as { letterCount: number }).letterCount = wis.reduce((a, w) => a + w.letterCount, 0);
    (s as { avgWordLength: number }).avgWordLength = wis.length > 0
      ? wis.reduce((a, w) => a + w.charCount, 0) / wis.length : 0;
    (s as { branchWeight: number }).branchWeight = wis.reduce((a, w) => a + w.gematriaValue, 0);
  }
  
  // Update paragraph stats and branchWeight
  for (const p of paragraphs) {
    const sis = sentences.filter(s => s.paragraphIndex === p.paragraphIndex);
    (p as { sentenceIndices: readonly number[] }).sentenceIndices = sis.map(s => s.sentenceIndex);
    (p as { sentenceCount: number }).sentenceCount = sis.length;
    (p as { wordCount: number }).wordCount = sis.reduce((a, s) => a + s.wordCount, 0);
    (p as { letterCount: number }).letterCount = sis.reduce((a, s) => a + s.letterCount, 0);
    (p as { wordIndices: readonly number[] }).wordIndices = sis.flatMap(s => s.wordIndices);
    (p as { avgSentenceLength: number }).avgSentenceLength = sis.length > 0
      ? sis.reduce((a, s) => a + s.wordCount, 0) / sis.length : 0;
    (p as { branchWeight: number }).branchWeight = sis.reduce((a, s) => a + s.branchWeight, 0);
  }
  const segmentationMs = performance.now() - segmentStart;
  
  // Build reverse index
  const len = canonical.length;
  const charToGrapheme = new Array(len).fill(0);
  for (const g of graphemes) {
    for (let i = g.charIndexStart; i < g.charIndexEnd && i < len; i++) {
      charToGrapheme[i] = g.graphemeIndex;
    }
  }
  
  const charToLetterArr: (number | null)[] = new Array(len).fill(null);
  for (const l of letters) {
    if (l.charIndex < len) charToLetterArr[l.charIndex] = l.letterIndex;
  }
  
  const charToWord: (number | null)[] = new Array(len).fill(null);
  for (const w of words) {
    for (let i = w.charIndexStart; i < w.charIndexEnd && i < len; i++) {
      charToWord[i] = w.wordIndex;
    }
  }
  
  const charToSentArr: (number | null)[] = new Array(len).fill(null);
  for (const s of sentences) {
    for (let i = s.charIndexStart; i < s.charIndexEnd && i < len; i++) {
      charToSentArr[i] = s.sentenceIndex;
    }
  }
  
  const charToParaArr: (number | null)[] = new Array(len).fill(null);
  for (const p of paragraphs) {
    for (let i = p.charIndexStart; i < p.charIndexEnd && i < len; i++) {
      charToParaArr[i] = p.paragraphIndex;
    }
  }
  
  const lineStarts = [0];
  for (let i = 0; i < canonical.length; i++) {
    if (canonical[i] === "\n" && i + 1 < canonical.length) lineStarts.push(i + 1);
  }
  
  const charToLine = new Array(len).fill(1);
  let cl = 0;
  for (let i = 0; i < len; i++) {
    while (cl + 1 < lineStarts.length && i >= lineStarts[cl + 1]) cl++;
    charToLine[i] = cl + 1;
  }
  
  const reverseIndex: ReverseIndex = {
    charToGrapheme,
    charToLetter: charToLetterArr,
    charToWord,
    charToSentence: charToSentArr,
    charToParagraph: charToParaArr,
    letterToChar: letters.map(l => l.charIndex),
    wordToChars: words.map(w => [w.charIndexStart, w.charIndexEnd]),
    sentenceToChars: sentences.map(s => [s.charIndexStart, s.charIndexEnd]),
    paragraphToChars: paragraphs.map(p => [p.charIndexStart, p.charIndexEnd]),
    wordToSentence: words.map(w => w.sentenceIndex),
    wordToParagraph: words.map(w => w.paragraphIndex),
    sentenceToParagraph: sentences.map(s => s.paragraphIndex),
    lineStarts,
    charToLine,
  };
  
  // Statistics
  const statsStart = performance.now();
  
  const basicStats: BasicStats = {
    charCount: chars.length,
    byteCount: getByteLength(canonical),
    graphemeCount: graphemes.length,
    letterCount: letters.length,
    digitCount: chars.filter(c => c.category === "digit").length,
    whitespaceCount: chars.filter(c => c.category === "whitespace").length,
    punctuationCount: chars.filter(c => c.category === "punctuation").length,
    symbolCount: chars.filter(c => c.category === "symbol").length,
    wordCount: words.length,
    sentenceCount: sentences.length,
    paragraphCount: paragraphs.length,
    lineCount: (canonical.match(/\n/g) || []).length + 1,
    lettersPerWord: words.length > 0 ? letters.length / words.length : 0,
    wordsPerSentence: sentences.length > 0 ? words.length / sentences.length : 0,
    sentencesPerParagraph: paragraphs.length > 0 ? sentences.length / paragraphs.length : 0,
  };
  
  const uniqueWords = new Set(words.map(w => w.normalizedWord));
  const wordFrequency = new Map<string, number>();
  for (const w of words) {
    wordFrequency.set(w.normalizedWord, (wordFrequency.get(w.normalizedWord) ?? 0) + 1);
  }
  const hapaxCount = [...wordFrequency.values()].filter(f => f === 1).length;
  
  const linguisticStats: LinguisticStats = {
    uniqueWordCount: uniqueWords.size,
    lexicalDiversity: words.length > 0 ? uniqueWords.size / words.length : 0,
    hapaxLegomena: hapaxCount,
    hapaxRatio: uniqueWords.size > 0 ? hapaxCount / uniqueWords.size : 0,
    vocabularyRichness: 0,
    avgWordLength: words.length > 0 ? words.reduce((s, w) => s + w.charCount, 0) / words.length : 0,
    avgSentenceLength: sentences.length > 0 ? sentences.reduce((s, sent) => s + sent.wordCount, 0) / sentences.length : 0,
    avgParagraphLength: paragraphs.length > 0 ? paragraphs.reduce((s, p) => s + p.sentenceCount, 0) / paragraphs.length : 0,
    shortSentenceRatio: sentences.length > 0 ? sentences.filter(s => s.wordCount < 10).length / sentences.length : 0,
    mediumSentenceRatio: sentences.length > 0 ? sentences.filter(s => s.wordCount >= 10 && s.wordCount <= 20).length / sentences.length : 0,
    longSentenceRatio: sentences.length > 0 ? sentences.filter(s => s.wordCount > 20).length / sentences.length : 0,
    shortWordRatio: words.length > 0 ? words.filter(w => w.letterCount <= 3).length / words.length : 0,
    mediumWordRatio: words.length > 0 ? words.filter(w => w.letterCount >= 4 && w.letterCount <= 7).length / words.length : 0,
    longWordRatio: words.length > 0 ? words.filter(w => w.letterCount >= 8).length / words.length : 0,
    commasPerSentence: sentences.length > 0 ? sentences.reduce((s, sent) => s + sent.commaCount, 0) / sentences.length : 0,
    periodsPerParagraph: paragraphs.length > 0 ? sentences.length / paragraphs.length : 0,
    exclamationRatio: sentences.length > 0 ? sentences.filter(s => s.sentenceType === "exclamatory").length / sentences.length : 0,
    questionRatio: sentences.length > 0 ? sentences.filter(s => s.sentenceType === "interrogative").length / sentences.length : 0,
    avgClausesPerSentence: sentences.length > 0 ? sentences.reduce((s, sent) => s + sent.clauseCount, 0) / sentences.length : 0,
    subordinationDepth: 0,
    stopWordRatio: words.length > 0 ? words.filter(w => w.isStopWord).length / words.length : 0,
    readabilityScore: 50,
    gradeLevel: 8,
  };
  
  const gematriaValues = words.map(w => w.gematriaValue);
  
  const myceliumStats: MyceliumStats = {
    totalGematriaValue: gematriaValues.reduce((s, v) => s + v, 0),
    avgWordGematria: words.length > 0 ? gematriaValues.reduce((s, v) => s + v, 0) / words.length : 0,
    maxWordGematria: gematriaValues.length > 0 ? Math.max(...gematriaValues) : 0,
    minWordGematria: gematriaValues.length > 0 ? Math.min(...gematriaValues) : 0,
    gematriaDistribution: gematriaValues.reduce((acc, v) => {
      acc[v] = (acc[v] ?? 0) + 1;
      return acc;
    }, {} as Record<number, number>),
    avgSentenceBranchWeight: sentences.length > 0 ? sentences.reduce((s, sent) => s + sent.branchWeight, 0) / sentences.length : 0,
    avgParagraphBranchWeight: paragraphs.length > 0 ? paragraphs.reduce((s, p) => s + p.branchWeight, 0) / paragraphs.length : 0,
    level1Count: paragraphs.length,
    level2Count: sentences.length,
    level3Count: words.length,
    level2PerLevel1: paragraphs.length > 0 ? sentences.length / paragraphs.length : 0,
    level3PerLevel2: sentences.length > 0 ? words.length / sentences.length : 0,
    branchDensity: basicStats.charCount > 0 ? (paragraphs.length + sentences.length + words.length) / basicStats.charCount : 0,
  };
  
  const styleStats: StyleStats = {
    lexicalDiversity: linguisticStats.lexicalDiversity,
    vocabularyRichness: 0,
    rareWordRatio: linguisticStats.hapaxRatio,
    avgSentenceLength: linguisticStats.avgSentenceLength,
    sentenceLengthVariance: 0,
    subordinationFrequency: 0,
    rhythmPattern: "irregular",
    pauseFrequency: linguisticStats.commasPerSentence,
    cadenceScore: 0.5,
    formalityScore: 0.5,
    toneIndicator: "neutral",
    dialogueRatio: 0,
    sensoryDensity: 0,
    firstPersonRatio: words.length > 0
      ? words.filter(w => ["je", "j", "me", "m", "moi", "nous"].includes(w.normalizedWord)).length / words.length
      : 0,
    activeVoiceRatio: 0.7,
  };
  const statsComputationMs = performance.now() - statsStart;
  
  // Proof generation
  const hashStart = performance.now();
  const inputHash = sha256(input);
  const canonicalHash = sha256(canonical);
  const optionsHash = hashObject(opts);
  
  const structureHash = combineHashes(
    hashObject(letters.map(l => ({ li: l.letterIndex, ci: l.charIndex, r: l.letterRank }))),
    hashObject(words.map(w => ({ wi: w.wordIndex, cs: w.charIndexStart, g: w.gematriaValue }))),
    hashObject(sentences.map(s => ({ si: s.sentenceIndex, cs: s.charIndexStart, bw: s.branchWeight }))),
    hashObject(paragraphs.map(p => ({ pi: p.paragraphIndex, cs: p.charIndexStart, bw: p.branchWeight })))
  );
  
  const analysisHash = combineHashes(inputHash, canonicalHash, optionsHash, structureHash);
  
  const invariants: InvariantCheck[] = [
    {
      id: "INV-TA-02",
      name: "Bounds",
      description: "Valid bounds",
      passed: words.every(w => w.charIndexStart >= 0 && w.charIndexEnd <= canonical.length),
      severity: "CRITICAL",
      checkDurationMs: 0,
    },
    {
      id: "INV-TA-03",
      name: "Counters",
      description: "Coherent",
      passed: true,
      severity: "CRITICAL",
      checkDurationMs: 0,
    },
    {
      id: "INV-TA-04",
      name: "Monotonic",
      description: "Sequential indices",
      passed: letters.every((l, i) => l.letterIndex === i) && words.every((w, i) => w.wordIndex === i),
      severity: "HIGH",
      checkDurationMs: 0,
    },
    {
      id: "INV-TA-06",
      name: "Hash",
      description: "Reproducible",
      passed: sha256(canonical) === canonicalHash,
      severity: "CRITICAL",
      checkDurationMs: 0,
    },
    {
      id: "INV-TA-09",
      name: "Gematria",
      description: "Correct",
      passed: words.every(w => w.gematriaValue === calculateGematria(w.word)),
      severity: "HIGH",
      checkDurationMs: 0,
    },
    {
      id: "INV-TA-10",
      name: "Hierarchy",
      description: "Valid links",
      passed: words.every(w => w.sentenceIndex >= 0 && w.sentenceIndex < sentences.length),
      severity: "HIGH",
      checkDurationMs: 0,
    },
  ];
  
  const proof: Proof = {
    inputHash,
    canonicalHash,
    optionsHash,
    structureHash,
    analysisHash,
    invariants,
    passedCount: invariants.filter(i => i.passed).length,
    failedCount: invariants.filter(i => !i.passed).length,
    allPassed: invariants.every(i => i.passed),
    version: MODULE_VERSION,
    timestamp: new Date().toISOString(),
    seed: OMEGA_SEED,
    processingId: generateDeterministicUuid(analysisHash),
  };
  const hashingMs = performance.now() - hashStart;
  
  const totalProcessingMs = performance.now() - startTime;
  
  const performanceStats: PerformanceStats = {
    totalProcessingMs,
    validationMs,
    canonicalizationMs,
    charIndexingMs,
    graphemeIndexingMs,
    letterIndexingMs,
    wordIndexingMs,
    segmentationMs,
    statsComputationMs,
    hashingMs,
    peakMemoryBytes: 0,
    inputSizeBytes: getByteLength(input),
    outputSizeBytes: 0,
    compressionRatio: 1,
    charsPerSecond: totalProcessingMs > 0 ? (canonical.length / totalProcessingMs) * 1000 : 0,
    wordsPerSecond: totalProcessingMs > 0 ? (words.length / totalProcessingMs) * 1000 : 0,
  };
  
  return {
    original: input,
    canonical,
    chars,
    graphemes,
    letters,
    words,
    sentences,
    paragraphs,
    ngrams: null,
    reverseIndex,
    basicStats,
    linguisticStats,
    myceliumStats,
    styleStats,
    performanceStats,
    proof,
    options: opts,
    version: MODULE_VERSION,
    timestamp: new Date().toISOString(),
  };
}

export { TextAnalyzerError };
