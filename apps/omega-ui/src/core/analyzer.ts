/**
 * Text Analyzer Module for OMEGA UI
 * @module core/analyzer
 * @description Bridges UI to core text analysis engine
 */

import type {
  Emotion14,
  EmotionVector,
  TextSegment,
  TextAnalysisResult,
  Valence,
} from './types';

/**
 * Generate unique ID
 * @returns Unique identifier string
 */
function generateId(): string {
  return `ana-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Get current ISO timestamp
 * @returns ISO date string
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Emotion14 canonical list
 */
export const EMOTION14_LIST: Emotion14[] = [
  'joy',
  'sadness',
  'anger',
  'fear',
  'surprise',
  'disgust',
  'trust',
  'anticipation',
  'love',
  'guilt',
  'shame',
  'pride',
  'envy',
  'contempt',
];

/**
 * Analyze a single text segment
 * @param text - Text to analyze
 * @param startIndex - Start position in original text
 * @returns TextSegment with analysis results
 */
export function analyzeSegment(text: string, startIndex: number): TextSegment {
  const id = generateId();
  const emotions = detectEmotions(text);
  const dominant = findDominantEmotion(emotions);
  const valence = calculateValence(emotions);

  return {
    id,
    text,
    startIndex,
    endIndex: startIndex + text.length,
    emotions,
    dominantEmotion: dominant,
    valence,
    confidence: calculateConfidence(emotions),
  };
}

/**
 * Detect emotions in text using keyword matching
 * @param text - Text to analyze
 * @returns Emotion vector with detected intensities
 */
export function detectEmotions(text: string): EmotionVector {
  const lower = text.toLowerCase();
  const result: EmotionVector = {};

  const emotionKeywords: Record<Emotion14, string[]> = {
    joy: ['happy', 'joy', 'glad', 'delighted', 'pleased', 'cheerful'],
    sadness: ['sad', 'unhappy', 'sorrow', 'grief', 'melancholy', 'depressed'],
    anger: ['angry', 'furious', 'rage', 'mad', 'irritated', 'annoyed'],
    fear: ['afraid', 'scared', 'terrified', 'anxious', 'worried', 'nervous'],
    surprise: ['surprised', 'amazed', 'astonished', 'shocked', 'startled'],
    disgust: ['disgusted', 'revolted', 'repulsed', 'sick', 'nauseated'],
    trust: ['trust', 'believe', 'faith', 'confident', 'reliable'],
    anticipation: ['expect', 'anticipate', 'await', 'hope', 'eager'],
    love: ['love', 'adore', 'cherish', 'affection', 'devoted'],
    guilt: ['guilty', 'remorse', 'regret', 'sorry', 'ashamed'],
    shame: ['shame', 'embarrassed', 'humiliated', 'mortified'],
    pride: ['proud', 'pride', 'accomplished', 'triumphant'],
    envy: ['envious', 'jealous', 'covet', 'resentful'],
    contempt: ['contempt', 'disdain', 'scorn', 'disrespect'],
  };

  for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
    const matchCount = keywords.filter(kw => lower.includes(kw)).length;
    if (matchCount > 0) {
      result[emotion as Emotion14] = Math.min(matchCount * 0.3, 1);
    }
  }

  return result;
}

/**
 * Find the dominant emotion from a vector
 * @param emotions - Emotion vector
 * @returns The emotion with highest intensity or null
 */
export function findDominantEmotion(emotions: EmotionVector): Emotion14 | null {
  let maxIntensity = 0;
  let dominant: Emotion14 | null = null;

  for (const [emotion, intensity] of Object.entries(emotions)) {
    if (intensity && intensity > maxIntensity) {
      maxIntensity = intensity;
      dominant = emotion as Emotion14;
    }
  }

  return dominant;
}

/**
 * Calculate valence from emotion vector
 * @param emotions - Emotion vector
 * @returns Valence value between -1 and 1
 */
export function calculateValence(emotions: EmotionVector): Valence {
  const positiveEmotions: Emotion14[] = ['joy', 'trust', 'anticipation', 'love', 'pride'];
  const negativeEmotions: Emotion14[] = ['sadness', 'anger', 'fear', 'disgust', 'guilt', 'shame', 'envy', 'contempt'];

  let positive = 0;
  let negative = 0;

  for (const [emotion, intensity] of Object.entries(emotions)) {
    if (positiveEmotions.includes(emotion as Emotion14)) {
      positive += intensity ?? 0;
    } else if (negativeEmotions.includes(emotion as Emotion14)) {
      negative += intensity ?? 0;
    }
  }

  const total = positive + negative;
  if (total === 0) return 0;
  return (positive - negative) / total;
}

/**
 * Calculate confidence score for analysis
 * @param emotions - Emotion vector
 * @returns Confidence value between 0 and 1
 */
export function calculateConfidence(emotions: EmotionVector): number {
  const values = Object.values(emotions).filter((v): v is number => v !== undefined);
  if (values.length === 0) return 0.5;

  const maxIntensity = Math.max(...values);
  const avgIntensity = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.min((maxIntensity + avgIntensity) / 2 + 0.3, 1);
}

/**
 * Aggregate emotions from multiple segments
 * @param segments - Array of text segments
 * @returns Aggregated emotion vector
 */
export function aggregateEmotions(segments: TextSegment[]): EmotionVector {
  const result: EmotionVector = {};

  for (const segment of segments) {
    for (const [emotion, intensity] of Object.entries(segment.emotions)) {
      const current = result[emotion as Emotion14] ?? 0;
      result[emotion as Emotion14] = current + (intensity ?? 0);
    }
  }

  const count = segments.length || 1;
  for (const emotion of Object.keys(result)) {
    result[emotion as Emotion14] = (result[emotion as Emotion14] ?? 0) / count;
  }

  return result;
}

/**
 * Segment text into analyzable chunks
 * @param text - Full text to segment
 * @returns Array of text strings
 */
export function segmentText(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Perform full text analysis
 * @param text - Text to analyze
 * @returns Complete analysis result
 */
export function analyzeText(text: string): TextAnalysisResult {
  const id = generateId();
  const timestamp = getTimestamp();
  const textSegments = segmentText(text);

  let currentIndex = 0;
  const segments: TextSegment[] = textSegments.map(segmentText => {
    const segment = analyzeSegment(segmentText, currentIndex);
    currentIndex = text.indexOf(segmentText, currentIndex) + segmentText.length;
    return segment;
  });

  const aggregateEmotionsResult = aggregateEmotions(segments);
  const dominantEmotion = findDominantEmotion(aggregateEmotionsResult);
  const overallValence = calculateValence(aggregateEmotionsResult);

  const confidences = segments.map(s => s.confidence);
  const averageConfidence = confidences.length > 0
    ? confidences.reduce((a, b) => a + b, 0) / confidences.length
    : 0.5;

  return {
    id,
    originalText: text,
    timestamp,
    segments,
    aggregateEmotions: aggregateEmotionsResult,
    dominantEmotion,
    overallValence,
    averageConfidence,
    wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
    segmentCount: segments.length,
  };
}
