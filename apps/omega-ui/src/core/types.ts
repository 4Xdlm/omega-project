/**
 * Core Type Definitions for OMEGA UI
 * @module core/types
 * @description TypeScript types for OMEGA core integration
 */

/**
 * Emotion14 canonical emotions
 */
export type Emotion14 =
  | 'joy'
  | 'sadness'
  | 'anger'
  | 'fear'
  | 'surprise'
  | 'disgust'
  | 'trust'
  | 'anticipation'
  | 'love'
  | 'guilt'
  | 'shame'
  | 'pride'
  | 'envy'
  | 'contempt';

/**
 * Emotion intensity value (0-1)
 */
export type EmotionIntensity = number;

/**
 * Valence value (-1 to 1)
 */
export type Valence = number;

/**
 * Emotion vector mapping emotions to intensities
 */
export type EmotionVector = Partial<Record<Emotion14, EmotionIntensity>>;

/**
 * Text segment with emotional analysis
 */
export interface TextSegment {
  id: string;
  text: string;
  startIndex: number;
  endIndex: number;
  emotions: EmotionVector;
  dominantEmotion: Emotion14 | null;
  valence: Valence;
  confidence: number;
}

/**
 * Full text analysis result
 */
export interface TextAnalysisResult {
  id: string;
  originalText: string;
  timestamp: string;
  segments: TextSegment[];
  aggregateEmotions: EmotionVector;
  dominantEmotion: Emotion14 | null;
  overallValence: Valence;
  averageConfidence: number;
  wordCount: number;
  segmentCount: number;
}

/**
 * DNA fingerprint (128 components)
 */
export interface DNAFingerprint {
  components: number[];
  hash: string;
  timestamp: string;
}

/**
 * Genome profile result
 */
export interface GenomeProfile {
  analysisId: string;
  dna: DNAFingerprint;
  emotionalSignature: EmotionVector;
  styleMarkers: StyleMarker[];
}

/**
 * Style marker detected in text
 */
export interface StyleMarker {
  type: string;
  value: number;
  confidence: number;
}

/**
 * Analysis session containing multiple analyses
 */
export interface AnalysisSession {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  analyses: TextAnalysisResult[];
}

/**
 * OMEGA system status
 */
export interface SystemStatus {
  version: string;
  phase: number;
  modulesLoaded: string[];
  ready: boolean;
}
