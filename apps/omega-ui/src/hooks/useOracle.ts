/**
 * Oracle Integration Hook
 * @module @omega/ui/hooks/useOracle
 * @description React hook for Oracle AI analysis integration
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Emotion14Values } from '../lib/emotion14';

/**
 * Analysis depth options
 */
export type AnalysisDepth = 'quick' | 'standard' | 'deep';

/**
 * Analysis status
 */
export type AnalysisStatus = 'idle' | 'analyzing' | 'streaming' | 'complete' | 'error' | 'cancelled';

/**
 * Emotional insight from analysis
 */
export interface EmotionalInsight {
  primaryEmotion: string;
  confidence: number;
  evidence: string[];
  intensity: number;
}

/**
 * Narrative structure
 */
export interface NarrativeStructure {
  introduction: string;
  development: string[];
  conclusion: string;
}

/**
 * Narrative style
 */
export interface NarrativeStyle {
  tone: string;
  complexity: string;
  readabilityScore: number;
}

/**
 * Full narrative analysis
 */
export interface NarrativeAnalysis {
  structure: NarrativeStructure;
  style: NarrativeStyle;
  themes: string[];
}

/**
 * Analysis result
 */
export interface AnalysisResult {
  id: string;
  text: string;
  insights: EmotionalInsight[];
  emotions: Emotion14Values;
  narrative: NarrativeAnalysis | null;
  summary: string;
  timestamp: number;
  duration: number;
  depth: AnalysisDepth;
  cached: boolean;
}

/**
 * Streaming progress
 */
export interface StreamProgress {
  percent: number;
  stage: string;
  message: string;
  chunksProcessed: number;
  totalChunks: number;
}

/**
 * Oracle error
 */
export interface OracleError {
  code: string;
  message: string;
  recoverable: boolean;
}

/**
 * Oracle hook state
 */
export interface OracleState {
  status: AnalysisStatus;
  result: AnalysisResult | null;
  progress: StreamProgress | null;
  error: OracleError | null;
  isAnalyzing: boolean;
  isStreaming: boolean;
  history: AnalysisResult[];
}

/**
 * Oracle hook actions
 */
export interface OracleActions {
  analyze: (text: string, depth?: AnalysisDepth) => Promise<AnalysisResult>;
  analyzeStream: (text: string, depth?: AnalysisDepth) => Promise<AnalysisResult>;
  cancel: () => void;
  reset: () => void;
  clearHistory: () => void;
}

/**
 * Oracle hook options
 */
export interface UseOracleOptions {
  autoHistory?: boolean;
  maxHistory?: number;
  defaultDepth?: AnalysisDepth;
  onStart?: () => void;
  onProgress?: (progress: StreamProgress) => void;
  onComplete?: (result: AnalysisResult) => void;
  onError?: (error: OracleError) => void;
}

/**
 * Default emotions for analysis
 */
const DEFAULT_EMOTIONS: Emotion14Values = {
  joy: 0,
  sadness: 0,
  anger: 0,
  fear: 0,
  surprise: 0,
  disgust: 0,
  trust: 0,
  anticipation: 0,
  love: 0,
  guilt: 0,
  shame: 0,
  pride: 0,
  envy: 0,
  contempt: 0,
};

/**
 * Emotion keyword mappings for analysis
 */
const EMOTION_KEYWORDS: Record<string, string[]> = {
  joy: ['happy', 'joy', 'wonderful', 'great', 'amazing', 'love', 'beautiful', 'excited'],
  sadness: ['sad', 'unhappy', 'depressed', 'grief', 'sorrow', 'cry', 'tears', 'lonely'],
  anger: ['angry', 'furious', 'rage', 'hate', 'frustrated', 'annoyed', 'irritated'],
  fear: ['afraid', 'scared', 'terrified', 'anxious', 'worried', 'nervous', 'panic'],
  surprise: ['surprised', 'shocked', 'amazed', 'unexpected', 'astonished', 'startled'],
  disgust: ['disgusted', 'revolted', 'sick', 'repulsed', 'awful', 'gross'],
  trust: ['trust', 'believe', 'faith', 'confident', 'reliable', 'honest', 'loyal'],
  anticipation: ['expect', 'hope', 'wait', 'anticipate', 'eager', 'excited'],
  love: ['love', 'adore', 'cherish', 'affection', 'romantic', 'passion'],
  guilt: ['guilty', 'regret', 'sorry', 'ashamed', 'remorse', 'blame'],
  shame: ['shame', 'embarrassed', 'humiliated', 'disgraced', 'mortified'],
  pride: ['proud', 'accomplished', 'achievement', 'success', 'triumph'],
  envy: ['envy', 'jealous', 'covet', 'envious', 'resent'],
  contempt: ['contempt', 'disdain', 'scorn', 'despise', 'look down'],
};

/**
 * Generate unique ID
 */
function generateId(): string {
  return `analysis-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Analyze text for emotions
 */
function analyzeEmotions(text: string): Emotion14Values {
  const emotions = { ...DEFAULT_EMOTIONS };
  const lowerText = text.toLowerCase();
  const wordCount = text.split(/\s+/).length;

  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        score += 0.15;
      }
    }
    emotions[emotion as keyof Emotion14Values] = Math.min(score, 1);
  }

  // Normalize if total is too high
  const total = Object.values(emotions).reduce((sum, v) => sum + v, 0);
  if (total > 1) {
    for (const key of Object.keys(emotions)) {
      emotions[key as keyof Emotion14Values] /= total;
    }
  }

  return emotions;
}

/**
 * Generate insights from text
 */
function generateInsights(text: string, depth: AnalysisDepth): EmotionalInsight[] {
  const insights: EmotionalInsight[] = [];
  const lowerText = text.toLowerCase();
  const numInsights = depth === 'quick' ? 2 : depth === 'deep' ? 5 : 3;

  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    const matches = keywords.filter((kw) => lowerText.includes(kw));
    if (matches.length > 0) {
      insights.push({
        primaryEmotion: emotion,
        confidence: Math.min(0.5 + matches.length * 0.15, 0.95),
        evidence: matches.slice(0, 3),
        intensity: Math.min(0.4 + matches.length * 0.1, 0.9),
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      primaryEmotion: 'neutral',
      confidence: 0.7,
      evidence: ['No strong emotional indicators detected'],
      intensity: 0.3,
    });
  }

  return insights.slice(0, numInsights);
}

/**
 * Analyze narrative structure
 */
function analyzeNarrative(text: string): NarrativeAnalysis {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim());
  const words = text.split(/\s+/);
  const lowerText = text.toLowerCase();

  // Detect tone
  let tone = 'neutral';
  if (lowerText.includes('!') || lowerText.includes('amazing') || lowerText.includes('great')) {
    tone = 'enthusiastic';
  } else if (lowerText.includes('must') || lowerText.includes('should')) {
    tone = 'authoritative';
  } else if (lowerText.includes('perhaps') || lowerText.includes('maybe')) {
    tone = 'tentative';
  }

  // Extract themes
  const themes: string[] = [];
  const themeKeywords: Record<string, string[]> = {
    love: ['love', 'heart', 'romance', 'passion'],
    adventure: ['journey', 'quest', 'adventure', 'explore'],
    conflict: ['fight', 'battle', 'war', 'struggle'],
    growth: ['learn', 'grow', 'change', 'develop'],
    nature: ['forest', 'ocean', 'mountain', 'nature'],
  };

  for (const [theme, keywords] of Object.entries(themeKeywords)) {
    if (keywords.some((kw) => lowerText.includes(kw))) {
      themes.push(theme);
    }
  }

  return {
    structure: {
      introduction: sentences.length > 0 ? sentences[0].trim() : '',
      development: sentences.slice(1, -1).map((s) => s.trim()),
      conclusion: sentences.length > 1 ? sentences[sentences.length - 1].trim() : '',
    },
    style: {
      tone,
      complexity: words.length > 100 ? 'complex' : 'simple',
      readabilityScore: Math.min(100, Math.max(0, 100 - words.length / 10)),
    },
    themes: themes.length > 0 ? themes : ['general'],
  };
}

/**
 * Generate summary
 */
function generateSummary(insights: EmotionalInsight[]): string {
  if (insights.length === 0) {
    return 'No significant emotional patterns detected.';
  }

  const primaryEmotions = insights.map((i) => i.primaryEmotion).join(', ');
  const avgConfidence = insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length;

  return `Analysis detected ${insights.length} emotional pattern(s): ${primaryEmotions}. Average confidence: ${(avgConfidence * 100).toFixed(1)}%.`;
}

/**
 * Oracle integration hook
 */
export function useOracle(options: UseOracleOptions = {}): OracleState & OracleActions {
  const {
    autoHistory = true,
    maxHistory = 50,
    defaultDepth = 'standard',
    onStart,
    onProgress,
    onComplete,
    onError,
  } = options;

  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [progress, setProgress] = useState<StreamProgress | null>(null);
  const [error, setError] = useState<OracleError | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);

  const abortRef = useRef(false);
  const analysisIdRef = useRef<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current = true;
    };
  }, []);

  /**
   * Perform analysis
   */
  const analyze = useCallback(
    async (text: string, depth: AnalysisDepth = defaultDepth): Promise<AnalysisResult> => {
      const startTime = Date.now();
      const id = generateId();
      analysisIdRef.current = id;
      abortRef.current = false;

      setStatus('analyzing');
      setError(null);
      setProgress(null);
      onStart?.();

      try {
        // Simulate async processing
        await new Promise((resolve) => setTimeout(resolve, 100));

        if (abortRef.current) {
          throw { code: 'CANCELLED', message: 'Analysis was cancelled', recoverable: false };
        }

        const emotions = analyzeEmotions(text);
        const insights = generateInsights(text, depth);
        const narrative = analyzeNarrative(text);
        const summary = generateSummary(insights);

        const analysisResult: AnalysisResult = {
          id,
          text,
          insights,
          emotions,
          narrative,
          summary,
          timestamp: Date.now(),
          duration: Date.now() - startTime,
          depth,
          cached: false,
        };

        setResult(analysisResult);
        setStatus('complete');

        if (autoHistory) {
          setHistory((prev) => {
            const updated = [analysisResult, ...prev];
            return updated.slice(0, maxHistory);
          });
        }

        onComplete?.(analysisResult);
        return analysisResult;
      } catch (err) {
        const oracleError: OracleError = err as OracleError || {
          code: 'UNKNOWN',
          message: err instanceof Error ? err.message : 'Unknown error',
          recoverable: false,
        };

        setError(oracleError);
        setStatus('error');
        onError?.(oracleError);
        throw oracleError;
      }
    },
    [defaultDepth, autoHistory, maxHistory, onStart, onComplete, onError]
  );

  /**
   * Perform streaming analysis
   */
  const analyzeStream = useCallback(
    async (text: string, depth: AnalysisDepth = defaultDepth): Promise<AnalysisResult> => {
      const startTime = Date.now();
      const id = generateId();
      analysisIdRef.current = id;
      abortRef.current = false;

      setStatus('streaming');
      setError(null);
      onStart?.();

      try {
        const chunks = text.split(/\s+/);
        const totalChunks = chunks.length;
        let processedChunks = 0;

        // Simulate streaming processing
        for (let i = 0; i < totalChunks; i += 10) {
          if (abortRef.current) {
            throw { code: 'CANCELLED', message: 'Analysis was cancelled', recoverable: false };
          }

          processedChunks = Math.min(i + 10, totalChunks);
          const progressData: StreamProgress = {
            percent: Math.round((processedChunks / totalChunks) * 100),
            stage: 'processing',
            message: `Processing chunk ${processedChunks}/${totalChunks}`,
            chunksProcessed: processedChunks,
            totalChunks,
          };

          setProgress(progressData);
          onProgress?.(progressData);

          await new Promise((resolve) => setTimeout(resolve, 20));
        }

        const emotions = analyzeEmotions(text);
        const insights = generateInsights(text, depth);
        const narrative = analyzeNarrative(text);
        const summary = generateSummary(insights);

        const analysisResult: AnalysisResult = {
          id,
          text,
          insights,
          emotions,
          narrative,
          summary,
          timestamp: Date.now(),
          duration: Date.now() - startTime,
          depth,
          cached: false,
        };

        setResult(analysisResult);
        setProgress(null);
        setStatus('complete');

        if (autoHistory) {
          setHistory((prev) => {
            const updated = [analysisResult, ...prev];
            return updated.slice(0, maxHistory);
          });
        }

        onComplete?.(analysisResult);
        return analysisResult;
      } catch (err) {
        const oracleError: OracleError = err as OracleError || {
          code: 'UNKNOWN',
          message: err instanceof Error ? err.message : 'Unknown error',
          recoverable: false,
        };

        setError(oracleError);
        setStatus('error');
        setProgress(null);
        onError?.(oracleError);
        throw oracleError;
      }
    },
    [defaultDepth, autoHistory, maxHistory, onStart, onProgress, onComplete, onError]
  );

  /**
   * Cancel current analysis
   */
  const cancel = useCallback(() => {
    abortRef.current = true;
    setStatus('cancelled');
    setProgress(null);
  }, []);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    abortRef.current = true;
    setStatus('idle');
    setResult(null);
    setProgress(null);
    setError(null);
    analysisIdRef.current = null;
  }, []);

  /**
   * Clear history
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    // State
    status,
    result,
    progress,
    error,
    isAnalyzing: status === 'analyzing',
    isStreaming: status === 'streaming',
    history,

    // Actions
    analyze,
    analyzeStream,
    cancel,
    reset,
    clearHistory,
  };
}

/**
 * Default export
 */
export default useOracle;
