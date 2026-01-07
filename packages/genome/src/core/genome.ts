/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/genome — GENOME EXTRACTION
 * Version: 1.2.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { 
  EmotionAxis, 
  StyleAxis, 
  StructureAxis, 
  TempoAxis,
  Emotion14,
  EmotionTransition,
} from "../api/types.js";
import { 
  EMOTION14_ORDERED, 
  createEmptyDistribution, 
  normalizeDistribution,
} from "./emotion14.js";
import { TENSION_CURVE_POINTS, MAX_DOMINANT_TRANSITIONS } from "./version.js";

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXTRACTORS
// ═══════════════════════════════════════════════════════════════════════════════

export function extractEmotionAxis(
  emotionData: unknown,
  _seed: number
): EmotionAxis {
  const data = emotionData as Record<string, unknown> | undefined;
  
  let distribution = createEmptyDistribution();
  if (data?.distribution && typeof data.distribution === "object") {
    const rawDist = data.distribution as Record<string, number>;
    for (const emotion of EMOTION14_ORDERED) {
      if (typeof rawDist[emotion] === "number") {
        distribution[emotion] = Math.max(0, Math.min(1, rawDist[emotion]));
      }
    }
  }
  distribution = normalizeDistribution(distribution);
  
  let dominantTransitions: EmotionTransition[] = [];
  if (data?.transitions && Array.isArray(data.transitions)) {
    dominantTransitions = (data.transitions as EmotionTransition[])
      .slice(0, MAX_DOMINANT_TRANSITIONS)
      .map(t => ({
        from: t.from,
        to: t.to,
        frequency: Math.max(0, Math.min(1, t.frequency)),
      }));
  }
  
  let tensionCurve: number[] = [];
  if (data?.tensionCurve && Array.isArray(data.tensionCurve)) {
    tensionCurve = (data.tensionCurve as number[])
      .slice(0, TENSION_CURVE_POINTS)
      .map(v => Math.max(0, Math.min(1, v)));
  }
  while (tensionCurve.length < TENSION_CURVE_POINTS) {
    tensionCurve.push(0.5);
  }
  
  let averageValence = 0;
  if (typeof data?.valence === "number") {
    averageValence = Math.max(-1, Math.min(1, data.valence));
  }
  
  return {
    distribution,
    dominantTransitions,
    tensionCurve,
    averageValence,
  };
}

export function extractStyleAxis(
  styleData: unknown,
  _seed: number
): StyleAxis {
  const data = styleData as Record<string, number> | undefined;
  
  return {
    burstiness: clamp01(data?.burstiness ?? 0.5),
    perplexity: clamp01(data?.perplexity ?? 0.5),
    humanTouch: clamp01(data?.humanTouch ?? 0.5),
    lexicalRichness: clamp01(data?.lexicalRichness ?? 0.5),
    averageSentenceLength: clamp01(data?.averageSentenceLength ?? 0.5),
    dialogueRatio: clamp01(data?.dialogueRatio ?? 0.3),
  };
}

export function extractStructureAxis(
  structureData: unknown,
  _seed: number
): StructureAxis {
  const data = structureData as Record<string, number> | undefined;
  
  return {
    chapterCount: clamp01(data?.chapterCount ?? 0.5),
    averageChapterLength: clamp01(data?.averageChapterLength ?? 0.5),
    incitingIncident: clamp01(data?.incitingIncident ?? 0.12),
    midpoint: clamp01(data?.midpoint ?? 0.50),
    climax: clamp01(data?.climax ?? 0.85),
    povCount: clamp01(data?.povCount ?? 0.2),
    timelineComplexity: clamp01(data?.timelineComplexity ?? 0.3),
  };
}

export function extractTempoAxis(
  tempoData: unknown,
  _seed: number
): TempoAxis {
  const data = tempoData as Record<string, number> | undefined;
  
  return {
    averagePace: clamp01(data?.averagePace ?? 0.5),
    paceVariance: clamp01(data?.paceVariance ?? 0.3),
    actionDensity: clamp01(data?.actionDensity ?? 0.3),
    dialogueDensity: clamp01(data?.dialogueDensity ?? 0.4),
    descriptionDensity: clamp01(data?.descriptionDensity ?? 0.3),
    breathingCycles: clamp01(data?.breathingCycles ?? 0.5),
  };
}
