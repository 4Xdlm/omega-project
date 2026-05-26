/**
 * OMEGA V2.2 — Embeddings Module Index
 *
 * Sprint V2.2 implementation 2026-05-26
 * PIVOT: Ollama nomic-embed-text (vs @xenova/transformers original plan)
 */

export * from './types.js';
export { cosineSimilarity, crossChunkContinuity, l2Norm, normalize } from './similarity.js';
export { SentenceEmbedder } from './embedder.js';
export { OllamaEmbedder, DEFAULT_OLLAMA_CONFIG } from './ollamaEmbedder.js';
export type { OllamaEmbedderConfig } from './ollamaEmbedder.js';
