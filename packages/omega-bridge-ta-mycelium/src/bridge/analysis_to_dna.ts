// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA MYCELIUM — ANALYSIS TO DNA CONNECTOR v1.0.0
// ═══════════════════════════════════════════════════════════════════════════════

import { 
  buildBridgeData, 
  EmotionVector14D,
  MyceliumBridgeData 
} from './text_analyzer_bridge';
import { AnalyzeResult, OmegaEmotion14D, OMEGA_EMOTIONS_14D } from './types';

export interface TextSegment {
  text: string;
  kind: "chapter" | "paragraph" | "sentence";
  index: number;
  parentIndex?: number;
  emotions: Partial<Record<OmegaEmotion14D, number>>;
  eventBoost?: number;
}

export interface AnalysisToDNAOptions {
  seed?: number;
  title?: string;
  segmentDurationMs?: number;
}

export interface DNABuildInput {
  segments: TextSegment[];
  options: {
    seed: number;
    title: string;
    rawText?: string;
    segmentDurationMs: number;
  };
  bridgeData: MyceliumBridgeData;
}

export function vectorToIntensityRecord(
  vector: EmotionVector14D
): Partial<Record<OmegaEmotion14D, number>> {
  const record: Partial<Record<OmegaEmotion14D, number>> = {};
  for (const emotion of OMEGA_EMOTIONS_14D) {
    const value = vector[emotion];
    if (value > 0) {
      record[emotion] = value;
    }
  }
  return record;
}

export function analyzeResultToSegments(
  analysis: AnalyzeResult,
  bridgeData: MyceliumBridgeData
): TextSegment[] {
  const segments: TextSegment[] = [];
  
  const globalSegment: TextSegment = {
    text: `[Source: ${analysis.source}]`,
    kind: "paragraph",
    index: 0,
    emotions: vectorToIntensityRecord(bridgeData.emotionVector),
    eventBoost: bridgeData.textMetrics.totalEmotionHits > 5 ? 0.3 : 0
  };
  segments.push(globalSegment);
  
  let sentenceIndex = 1;
  for (const [emotion, keywords] of bridgeData.keywordsByEmotion.entries()) {
    if (keywords.length > 0) {
      const emotionIntensity = bridgeData.emotionVector[emotion];
      const emotionSegment: TextSegment = {
        text: keywords.join(", "),
        kind: "sentence",
        index: sentenceIndex,
        parentIndex: 0,
        emotions: { [emotion]: emotionIntensity },
        eventBoost: emotionIntensity > 0.7 ? 0.2 : 0
      };
      segments.push(emotionSegment);
      sentenceIndex++;
    }
  }
  return segments;
}

export function prepareDNABuild(
  analysis: AnalyzeResult,
  options: AnalysisToDNAOptions = {}
): DNABuildInput {
  const seed = options.seed ?? 42;
  const segmentDurationMs = options.segmentDurationMs ?? 5000;
  const bridgeData = buildBridgeData(analysis);
  const segments = analyzeResultToSegments(analysis, bridgeData);
  const title = options.title ?? `Analysis-${bridgeData.meta.runId}`;
  return {
    segments,
    options: { seed, title, segmentDurationMs },
    bridgeData
  };
}

export function validateDNAInputs(inputs: DNABuildInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!inputs.segments || inputs.segments.length === 0) {
    errors.push("No segments provided");
  }
  if (inputs.options.seed < 0) {
    errors.push("Seed must be non-negative");
  }
  for (let i = 0; i < inputs.segments.length; i++) {
    const seg = inputs.segments[i];
    if (!seg.kind) errors.push(`Segment ${i}: missing kind`);
    if (seg.index < 0) errors.push(`Segment ${i}: invalid index`);
  }
  for (const seg of inputs.segments) {
    for (const emotion of Object.keys(seg.emotions)) {
      if (!OMEGA_EMOTIONS_14D.includes(emotion as OmegaEmotion14D)) {
        errors.push(`Invalid emotion: ${emotion}`);
      }
    }
  }
  return { valid: errors.length === 0, errors };
}
