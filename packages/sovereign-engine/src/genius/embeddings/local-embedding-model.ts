/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA GENIUS ENGINE — LOCAL EMBEDDING MODEL (SSOT)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: genius/embeddings/local-embedding-model.ts
 * Sprint: GENIUS-02
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * SSOT for all embedding operations in GENIUS scorers.
 * v1: Deterministic bag-of-words cosine similarity (CALC, no external API).
 * v2 (future): @xenova/transformers ONNX model.
 *
 * ANTI-DOUBLON: This module is the ONLY source of embedding operations.
 * No scorer may call external embedding APIs directly (GENIUS-25).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface EmbeddingModelInfo {
  readonly model_id: string;
  readonly version: string;
  readonly type: 'bow-cosine' | 'onnx-transformer';
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODEL INFO
// ═══════════════════════════════════════════════════════════════════════════════

const MODEL_INFO: EmbeddingModelInfo = {
  model_id: 'omega-bow-cosine-fr-v1',
  version: '1.0.0',
  type: 'bow-cosine',
};

export function getEmbeddingModelInfo(): EmbeddingModelInfo {
  return MODEL_INFO;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FRENCH STOPWORDS
// ═══════════════════════════════════════════════════════════════════════════════

const FR_STOPWORDS = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'au', 'aux',
  'et', 'ou', 'mais', 'donc', 'or', 'ni', 'car', 'que', 'qui', 'quoi',
  'ce', 'cette', 'ces', 'mon', 'ton', 'son', 'ma', 'ta', 'sa',
  'mes', 'tes', 'ses', 'notre', 'votre', 'leur', 'nos', 'vos', 'leurs',
  'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
  'me', 'te', 'se', 'lui', 'en', 'y',
  'ne', 'pas', 'plus', 'jamais', 'rien', 'aucun',
  'dans', 'sur', 'sous', 'avec', 'sans', 'pour', 'par', 'vers', 'chez',
  'est', 'sont', 'a', 'ai', 'as', 'ont', 'avait', 'avaient',
  'était', 'étaient', 'fut', 'sera', 'serait',
  'comme', 'tout', 'tous', 'toute', 'toutes', 'très', 'bien', 'peu',
  'si', 'quand', 'où', 'comment', 'pourquoi',
  'être', 'avoir', 'faire', 'aller', 'voir', 'dire',
  'même', 'aussi', 'alors', 'encore', 'déjà', 'là',
  'c', 'd', 'j', 'l', 'm', 'n', 's', 't', 'qu',
]);

// ═══════════════════════════════════════════════════════════════════════════════
// TOKENIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/** Tokenize French text, remove stopwords. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/['']/g, ' ')
    .replace(/[^\wàâäéèêëïîôùûüÿçœæ\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !FR_STOPWORDS.has(w));
}

/** Tokenize preserving all words (for density). */
export function tokenizeAll(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/['']/g, ' ')
    .replace(/[^\wàâäéèêëïîôùûüÿçœæ\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);
}

/** Get French stopwords set. */
export function getStopwords(): ReadonlySet<string> {
  return FR_STOPWORDS;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COSINE SIMILARITY
// ═══════════════════════════════════════════════════════════════════════════════

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`EMBEDDING: vector length mismatch: ${a.length} vs ${b.length}`);
  }
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return dot / denom;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEMANTIC SIMILARITY (PUBLIC API)
// ═══════════════════════════════════════════════════════════════════════════════

/** Compute semantic similarity [0,1] between two texts. Deterministic (GENIUS-25,28). */
export function semanticSimilarity(textA: string, textB: string): number {
  if (!textA.trim() || !textB.trim()) return 0;

  // Build shared vocabulary
  const vocab = new Map<string, number>();
  let idx = 0;
  for (const text of [textA, textB]) {
    for (const token of tokenize(text)) {
      if (!vocab.has(token)) vocab.set(token, idx++);
    }
  }
  if (vocab.size === 0) return 0;

  // TF vectors
  const toTF = (text: string): number[] => {
    const vec = new Array(vocab.size).fill(0);
    const tokens = tokenize(text);
    for (const t of tokens) {
      const i = vocab.get(t);
      if (i !== undefined) vec[i]++;
    }
    const total = tokens.length || 1;
    for (let i = 0; i < vec.length; i++) vec[i] /= total;
    return vec;
  };

  const sim = cosineSimilarity(toTF(textA), toTF(textB));
  return Math.max(0, Math.min(1, sim));
}

/** Compute semantic shifts between consecutive segments. */
export function computeSemanticShifts(segments: string[]): number[] {
  if (segments.length < 2) return [];
  const shifts: number[] = [];
  for (let i = 1; i < segments.length; i++) {
    shifts.push(1 - semanticSimilarity(segments[i - 1], segments[i]));
  }
  return shifts;
}

/** Compute stopword ratio of text. */
export function stopwordRatio(text: string): number {
  const allTokens = tokenizeAll(text);
  if (allTokens.length === 0) return 0;
  let count = 0;
  for (const t of allTokens) {
    if (FR_STOPWORDS.has(t)) count++;
  }
  return count / allTokens.length;
}
