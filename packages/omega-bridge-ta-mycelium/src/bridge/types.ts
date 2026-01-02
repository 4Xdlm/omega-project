// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA MYCELIUM — BRIDGE TYPES
// Version: 1.0.0
// Standard: NASA-Grade L4
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from 'zod';

/**
 * 14 émotions OMEGA officielles (alignées emotion_engine.ts)
 * Source de vérité unique - aucune émotion inventée
 */
export const OMEGA_EMOTIONS_14D = [
  // 8 Plutchik primaires
  'joy', 'fear', 'anger', 'sadness', 
  'surprise', 'disgust', 'trust', 'anticipation',
  // 6 dérivées OMEGA
  'love', 'guilt', 'shame', 'pride', 
  'hope', 'despair'
] as const;

export type OmegaEmotion14D = typeof OMEGA_EMOTIONS_14D[number];

// ─────────────────────────────────────────────────────────────────────────────
// ANALYZE RESULT (Input du bridge)
// Structure exacte du JSON produit par dump_analysis Tauri/Rust
// ─────────────────────────────────────────────────────────────────────────────

export const KeywordCountSchema = z.object({
  word: z.string(),
  count: z.number().int().nonnegative()
});

export type KeywordCount = z.infer<typeof KeywordCountSchema>;

export const EmotionHitSchema = z.object({
  emotion: z.string(),
  intensity: z.number().min(0).max(1),
  occurrences: z.number().int().nonnegative(),
  keywords: z.array(z.string()),
  keyword_counts: z.array(KeywordCountSchema)
});

export type EmotionHit = z.infer<typeof EmotionHitSchema>;

export const AnalysisMetaSchema = z.object({
  mode: z.string(),
  provider: z.string().nullable(),
  ai_calls: z.number().int().nonnegative(),
  deterministic: z.boolean(),
  fallback_used: z.boolean()
});

export type AnalysisMeta = z.infer<typeof AnalysisMetaSchema>;

export const AnalyzeResultSchema = z.object({
  run_id: z.string(),
  timestamp: z.string(),
  duration_ms: z.number().nonnegative(),
  source: z.string(),
  word_count: z.number().int().nonnegative(),
  char_count: z.number().int().nonnegative(),
  line_count: z.number().int().nonnegative(),
  total_emotion_hits: z.number().int().nonnegative(),
  emotions: z.array(EmotionHitSchema),
  dominant_emotion: z.string(),
  version: z.string(),
  segmentation: z.any().nullable(),
  segments: z.any().nullable(),
  analysis_meta: AnalysisMetaSchema
});

export type AnalyzeResult = z.infer<typeof AnalyzeResultSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Vérifie si une émotion est dans les 14 officielles OMEGA
 */
export function isOmegaEmotion(emotion: string): emotion is OmegaEmotion14D {
  return OMEGA_EMOTIONS_14D.includes(emotion as OmegaEmotion14D);
}

/**
 * Parse et valide un AnalyzeResult
 * @throws ZodError si invalide
 */
export function parseAnalyzeResult(data: unknown): AnalyzeResult {
  return AnalyzeResultSchema.parse(data);
}

/**
 * Parse un AnalyzeResult sans throw (retourne null si invalide)
 */
export function safeParseAnalyzeResult(data: unknown): AnalyzeResult | null {
  const result = AnalyzeResultSchema.safeParse(data);
  return result.success ? result.data : null;
}
