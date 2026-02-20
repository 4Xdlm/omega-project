// OMEGA — TEXT ANALYZER MODULE — TYPES L4
export type UnicodeNormalization = "NFC" | "NFD" | "NFKC" | "NFKD";
export type SegmentationMode = "simple" | "nlp" | "custom";

export interface TextAnalyzerOptions {
  unicodeNormalization: UnicodeNormalization;
  stripDiacritics: boolean;
  collapseSpaces: boolean;
  preserveCase: boolean;
  segmentationMode: SegmentationMode;
  sentenceDelimiters: readonly string[];
  paragraphDelimiters: readonly string[];
  enableGraphemeIndex: boolean;
  enableWordIndex: boolean;
  enableNgrams: boolean;
  ngramSizes: readonly number[];
  enableMyceliumMetrics: boolean;
  enableGematria: boolean;
  enableStyleMetrics: boolean;
  enableStreaming: boolean;
  chunkSize: number;
  checkpointInterval: number;
  maxInputLength: number;
  strictMode: boolean;
}

export interface Position {
  offset: number;
  charIndex: number;
  graphemeIndex: number;
  line: number;
  column: number;
}

export type CharCategory = "letter" | "digit" | "whitespace" | "punctuation" | "symbol" | "control" | "other";
export type ScriptType = "Latin" | "Cyrillic" | "Greek" | "Arabic" | "Hebrew" | "CJK" | "Emoji" | "Unknown";
export type GraphemeCategory = "letter" | "digit" | "emoji" | "symbol" | "whitespace" | "punctuation" | "other";
export type SentenceType = "declarative" | "interrogative" | "exclamatory" | "ellipsis" | "fragment";

export interface CharUnit {
  char: string;
  codePoint: number;
  category: CharCategory;
  position: Position;
  isAscii: boolean;
  isLatin: boolean;
  script: ScriptType;
  unicodeBlock: string;
  upper?: string;
  lower?: string;
  normalized?: string;
  letterRank?: number;
  isVowel?: boolean;
  isConsonant?: boolean;
}

export interface GraphemeUnit {
  grapheme: string;
  graphemeIndex: number;
  charIndexStart: number;
  charIndexEnd: number;
  codePoints: readonly number[];
  category: GraphemeCategory;
  displayWidth: 1 | 2;
  isEmoji: boolean;
  emojiSequence?: string;
}

export interface LetterUnit {
  letterIndex: number;
  normalizedLetter: string;
  letterRank: number;
  charIndex: number;
  graphemeIndex: number;
  wordIndex: number | null;
  sentenceIndex: number | null;
  paragraphIndex: number | null;
  position: Position;
  isVowel: boolean;
  isConsonant: boolean;
  originalChar: string;
  script: ScriptType;
}

export interface WordUnit {
  wordIndex: number;
  word: string;
  normalizedWord: string;
  charIndexStart: number;
  charIndexEnd: number;
  letterIndices: readonly number[];
  sentenceIndex: number;
  paragraphIndex: number;
  positionStart: Position;
  positionEnd: Position;
  charCount: number;
  letterCount: number;
  gematriaValue: number;
  isCapitalized: boolean;
  isAllCaps: boolean;
  isAllLower: boolean;
  containsDigits: boolean;
  containsHyphen: boolean;
  isContraction: boolean;
  syllableCount: number;
  frequency: number;
  isStopWord: boolean;
}

export interface SentenceUnit {
  sentenceIndex: number;
  text: string;
  charIndexStart: number;
  charIndexEnd: number;
  wordIndices: readonly number[];
  paragraphIndex: number;
  positionStart: Position;
  positionEnd: Position;
  charCount: number;
  wordCount: number;
  letterCount: number;
  sentenceType: SentenceType;
  endingPunctuation: string | null;
  hash: string;
  avgWordLength: number;
  commaCount: number;
  semicolonCount: number;
  clauseCount: number;
  branchWeight: number;
}

export interface ParagraphUnit {
  paragraphIndex: number;
  text: string;
  charIndexStart: number;
  charIndexEnd: number;
  sentenceIndices: readonly number[];
  wordIndices: readonly number[];
  positionStart: Position;
  positionEnd: Position;
  charCount: number;
  wordCount: number;
  letterCount: number;
  sentenceCount: number;
  hash: string;
  avgSentenceLength: number;
  dialogueRatio: number;
  branchWeight: number;
}

export interface BasicStats {
  charCount: number;
  byteCount: number;
  graphemeCount: number;
  letterCount: number;
  digitCount: number;
  whitespaceCount: number;
  punctuationCount: number;
  symbolCount: number;
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  lineCount: number;
  lettersPerWord: number;
  wordsPerSentence: number;
  sentencesPerParagraph: number;
}

export interface LinguisticStats {
  uniqueWordCount: number;
  lexicalDiversity: number;
  hapaxLegomena: number;
  hapaxRatio: number;
  vocabularyRichness: number;
  avgWordLength: number;
  avgSentenceLength: number;
  avgParagraphLength: number;
  shortSentenceRatio: number;
  mediumSentenceRatio: number;
  longSentenceRatio: number;
  shortWordRatio: number;
  mediumWordRatio: number;
  longWordRatio: number;
  commasPerSentence: number;
  periodsPerParagraph: number;
  exclamationRatio: number;
  questionRatio: number;
  avgClausesPerSentence: number;
  subordinationDepth: number;
  stopWordRatio: number;
  readabilityScore: number;
  gradeLevel: number;
}

export interface MyceliumStats {
  totalGematriaValue: number;
  avgWordGematria: number;
  maxWordGematria: number;
  minWordGematria: number;
  gematriaDistribution: Record<number, number>;
  avgSentenceBranchWeight: number;
  avgParagraphBranchWeight: number;
  level1Count: number;
  level2Count: number;
  level3Count: number;
  level2PerLevel1: number;
  level3PerLevel2: number;
  branchDensity: number;
}

export interface StyleStats {
  lexicalDiversity: number;
  vocabularyRichness: number;
  rareWordRatio: number;
  avgSentenceLength: number;
  sentenceLengthVariance: number;
  subordinationFrequency: number;
  rhythmPattern: string;
  pauseFrequency: number;
  cadenceScore: number;
  formalityScore: number;
  toneIndicator: string;
  dialogueRatio: number;
  sensoryDensity: number;
  firstPersonRatio: number;
  activeVoiceRatio: number;
}

export interface PerformanceStats {
  totalProcessingMs: number;
  validationMs: number;
  canonicalizationMs: number;
  charIndexingMs: number;
  graphemeIndexingMs: number;
  letterIndexingMs: number;
  wordIndexingMs: number;
  segmentationMs: number;
  statsComputationMs: number;
  hashingMs: number;
  peakMemoryBytes: number;
  inputSizeBytes: number;
  outputSizeBytes: number;
  compressionRatio: number;
  charsPerSecond: number;
  wordsPerSecond: number;
}

export interface ReverseIndex {
  charToGrapheme: readonly number[];
  charToLetter: readonly (number | null)[];
  charToWord: readonly (number | null)[];
  charToSentence: readonly (number | null)[];
  charToParagraph: readonly (number | null)[];
  letterToChar: readonly number[];
  wordToChars: readonly [number, number][];
  sentenceToChars: readonly [number, number][];
  paragraphToChars: readonly [number, number][];
  wordToSentence: readonly number[];
  wordToParagraph: readonly number[];
  sentenceToParagraph: readonly number[];
  lineStarts: readonly number[];
  charToLine: readonly number[];
}

export type InvariantId = "INV-TA-01" | "INV-TA-02" | "INV-TA-03" | "INV-TA-04" | "INV-TA-05" | "INV-TA-06" | "INV-TA-09" | "INV-TA-10";

export interface InvariantCheck {
  id: InvariantId;
  name: string;
  description: string;
  passed: boolean;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  actual?: unknown;
  expected?: unknown;
  message?: string;
  checkDurationMs: number;
}

export interface Proof {
  inputHash: string;
  canonicalHash: string;
  optionsHash: string;
  structureHash: string;
  analysisHash: string;
  invariants: readonly InvariantCheck[];
  passedCount: number;
  failedCount: number;
  allPassed: boolean;
  version: string;
  timestamp: string;
  seed: number;
  processingId: string;
}

export interface TextAnalysisResult {
  original: string;
  canonical: string;
  chars: readonly CharUnit[];
  graphemes: readonly GraphemeUnit[];
  letters: readonly LetterUnit[];
  words: readonly WordUnit[];
  sentences: readonly SentenceUnit[];
  paragraphs: readonly ParagraphUnit[];
  ngrams: null;
  reverseIndex: ReverseIndex;
  basicStats: BasicStats;
  linguisticStats: LinguisticStats;
  myceliumStats: MyceliumStats;
  styleStats: StyleStats;
  performanceStats: PerformanceStats;
  proof: Proof;
  options: TextAnalyzerOptions;
  version: string;
  timestamp: string;
}

export type ValidationErrorLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface ValidationIssue {
  code: string;
  level: ValidationErrorLevel;
  message: string;
  position?: Position;
  context?: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  errors: readonly ValidationIssue[];
  warnings: readonly ValidationIssue[];
  info: readonly ValidationIssue[];
  validationDurationMs: number;
}

export type TextAnalyzerErrorCode =
  | "INPUT_NULL" | "INPUT_UNDEFINED" | "INPUT_NOT_STRING" | "INPUT_TOO_LARGE"
  | "INPUT_INVALID_ENCODING" | "INPUT_CONTAINS_NULL_BYTE" | "NORMALIZATION_FAILED"
  | "SEGMENTATION_FAILED" | "INDEXING_FAILED" | "INVARIANT_VIOLATION"
  | "HASH_MISMATCH" | "INTERNAL_ERROR" | "TIMEOUT";

export class TextAnalyzerError extends Error {
  public readonly code: TextAnalyzerErrorCode;
  public readonly context: Record<string, unknown>;
  public readonly timestamp: string;
  
  constructor(code: TextAnalyzerErrorCode, message: string, context: Record<string, unknown> = {}) {
    super(`[${code}] ${message}`);
    this.name = "TextAnalyzerError";
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }
}
