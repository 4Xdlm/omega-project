/**
 * Oracle Core Module
 * @module @omega/oracle/oracle
 * @description Main Oracle AI analysis engine
 */

import {
  type OracleConfig,
  type OracleRequest,
  type OracleResponse,
  type OracleStatus,
  type EmotionalInsight,
  DEFAULT_CONFIG,
  OracleError,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════
// THRESHOLDS (internal, not exported)
// ═══════════════════════════════════════════════════════════════════════════

/** Below this intensity, emotional expression is considered weak */
const LOW_INTENSITY_THRESHOLD = 0.3;

/** Below this intensity, overall emotional impact is considered mild */
const MILD_INTENSITY_THRESHOLD = 0.5;

/** Above this confidence, emotion detection is considered high confidence */
const HIGH_CONFIDENCE_THRESHOLD = 0.8;

/**
 * Generate unique response ID
 */
function generateId(): string {
  return `oracle-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Oracle AI Analysis Engine
 */
export class Oracle {
  private config: OracleConfig;
  private cache: Map<string, { response: OracleResponse; expires: number }>;
  private stats: {
    totalRequests: number;
    totalErrors: number;
    totalTime: number;
  };
  private initialized: boolean;

  constructor(config: Partial<OracleConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cache = new Map();
    this.stats = { totalRequests: 0, totalErrors: 0, totalTime: 0 };
    this.initialized = false;
  }

  /**
   * Initialize Oracle
   */
  async initialize(): Promise<void> {
    // Validate configuration
    if (this.config.maxTokens < 100 || this.config.maxTokens > 16384) {
      throw new OracleError('INVALID_INPUT', 'maxTokens must be between 100 and 16384');
    }
    if (this.config.temperature < 0 || this.config.temperature > 1) {
      throw new OracleError('INVALID_INPUT', 'temperature must be between 0 and 1');
    }

    this.initialized = true;
  }

  /**
   * Analyze text with Oracle
   */
  async analyze(request: OracleRequest): Promise<OracleResponse> {
    if (!this.initialized) {
      throw new OracleError('INVALID_INPUT', 'Oracle not initialized');
    }

    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      // Validate input
      if (!request.text || request.text.trim().length < 10) {
        throw new OracleError('INVALID_INPUT', 'Text must be at least 10 characters');
      }

      // Check cache
      const cacheKey = this.getCacheKey(request);
      if (this.config.cacheEnabled) {
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          return { ...cached, metadata: { ...cached.metadata, cached: true } };
        }
      }

      // Perform analysis
      const response = await this.performAnalysis(request, startTime);

      // Store in cache
      if (this.config.cacheEnabled) {
        this.setCache(cacheKey, response);
      }

      const processingTime = Date.now() - startTime;
      this.stats.totalTime += processingTime;

      return response;
    } catch (error) {
      this.stats.totalErrors++;
      if (error instanceof OracleError) {
        throw error;
      }
      throw new OracleError('UNKNOWN', 'Analysis failed', error);
    }
  }

  /**
   * Perform actual analysis
   */
  private async performAnalysis(
    request: OracleRequest,
    startTime: number
  ): Promise<OracleResponse> {
    // Simulate AI analysis (in production, this would call actual AI API)
    const insights = this.extractInsights(request.text, request.depth);
    const narrative = request.includeNarrative
      ? this.analyzeNarrative(request.text)
      : undefined;
    const recommendations = request.includeRecommendations
      ? this.generateRecommendations(insights)
      : undefined;

    const processingTime = Date.now() - startTime;

    return {
      id: generateId(),
      text: request.text,
      insights,
      narrative,
      summary: this.generateSummary(insights, narrative),
      recommendations,
      metadata: {
        model: this.config.model,
        tokensUsed: Math.ceil(request.text.length / 4),
        processingTime,
        cached: false,
        timestamp: Date.now(),
      },
    };
  }

  /**
   * Extract emotional insights from text
   */
  private extractInsights(text: string, depth: string): EmotionalInsight[] {
    const insights: EmotionalInsight[] = [];
    const words = text.toLowerCase().split(/\s+/);

    // Emotion keyword mapping
    const emotionKeywords: Record<string, string[]> = {
      joy: ['happy', 'joy', 'delight', 'wonderful', 'great', 'amazing', 'love', 'excited'],
      sadness: ['sad', 'sorrow', 'grief', 'unhappy', 'depressed', 'melancholy', 'lonely'],
      anger: ['angry', 'furious', 'rage', 'mad', 'frustrated', 'annoyed', 'irritated'],
      fear: ['afraid', 'scared', 'terrified', 'anxious', 'worried', 'nervous', 'panic'],
      surprise: ['surprised', 'amazed', 'shocked', 'astonished', 'unexpected'],
      trust: ['trust', 'believe', 'faith', 'confident', 'reliable', 'honest'],
    };

    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      const matches = words.filter((w) => keywords.some((k) => w.includes(k)));
      if (matches.length > 0) {
        const intensity = Math.min(matches.length / words.length * 10, 1);
        insights.push({
          primaryEmotion: emotion,
          confidence: 0.5 + intensity * 0.4,
          evidence: matches.slice(0, 3),
          intensity,
        });
      }
    }

    // Sort by confidence
    insights.sort((a, b) => b.confidence - a.confidence);

    // Limit based on depth
    const maxInsights = depth === 'quick' ? 3 : depth === 'standard' ? 5 : 8;
    return insights.slice(0, maxInsights);
  }

  /**
   * Analyze narrative structure
   */
  private analyzeNarrative(text: string): OracleResponse['narrative'] {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const wordCount = text.split(/\s+/).length;

    // Determine narrative arc
    let arc: 'rising' | 'falling' | 'stable' | 'mixed' = 'stable';
    if (sentences.length > 3) {
      const firstHalf = sentences.slice(0, Math.floor(sentences.length / 2)).join(' ');
      const secondHalf = sentences.slice(Math.floor(sentences.length / 2)).join(' ');
      const positiveWords = ['good', 'great', 'happy', 'success', 'win', 'achieve'];
      const negativeWords = ['bad', 'sad', 'fail', 'lose', 'wrong', 'problem'];

      const firstPositive = positiveWords.filter((w) => firstHalf.includes(w)).length;
      const secondPositive = positiveWords.filter((w) => secondHalf.includes(w)).length;
      const firstNegative = negativeWords.filter((w) => firstHalf.includes(w)).length;
      const secondNegative = negativeWords.filter((w) => secondHalf.includes(w)).length;

      const firstScore = firstPositive - firstNegative;
      const secondScore = secondPositive - secondNegative;

      if (secondScore > firstScore + 1) arc = 'rising';
      else if (firstScore > secondScore + 1) arc = 'falling';
      else if (Math.abs(firstScore - secondScore) <= 1) arc = 'stable';
      else arc = 'mixed';
    }

    // Extract themes
    const themes: string[] = [];
    const themeKeywords: Record<string, string[]> = {
      'personal growth': ['learn', 'grow', 'improve', 'change', 'develop'],
      'relationships': ['friend', 'family', 'love', 'together', 'connect'],
      'challenges': ['problem', 'challenge', 'difficult', 'overcome', 'struggle'],
      'success': ['achieve', 'accomplish', 'success', 'win', 'complete'],
    };

    for (const [theme, keywords] of Object.entries(themeKeywords)) {
      if (keywords.some((k) => text.toLowerCase().includes(k))) {
        themes.push(theme);
      }
    }

    // Determine voice
    const voice = text.includes('I ') || text.includes("I'm") || text.includes('my')
      ? 'first-person narrative'
      : text.includes('you') || text.includes('your')
      ? 'second-person address'
      : 'third-person observation';

    return {
      tone: themes.length > 0 ? `Reflective with themes of ${themes.slice(0, 2).join(' and ')}` : 'Neutral',
      arc,
      themes: themes.slice(0, 4),
      voice,
    };
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(insights: EmotionalInsight[]): string[] {
    const recommendations: string[] = [];

    if (insights.length === 0) {
      recommendations.push('Consider adding more emotionally expressive language');
      return recommendations;
    }

    const dominant = insights[0];
    if (dominant.intensity < LOW_INTENSITY_THRESHOLD) {
      recommendations.push('The emotional expression could be stronger');
    }

    if (insights.length < 3) {
      recommendations.push('Consider exploring a wider range of emotions');
    }

    if (dominant.primaryEmotion === 'sadness' || dominant.primaryEmotion === 'anger') {
      recommendations.push('Balance negative emotions with contrasting positive elements');
    }

    if (insights.every((i) => i.intensity < MILD_INTENSITY_THRESHOLD)) {
      recommendations.push('Increase emotional intensity through specific details and imagery');
    }

    return recommendations.slice(0, 3);
  }

  /**
   * Generate summary
   */
  private generateSummary(
    insights: EmotionalInsight[],
    narrative?: OracleResponse['narrative']
  ): string {
    if (insights.length === 0) {
      return 'The text has minimal emotional content.';
    }

    const dominant = insights[0];
    let summary = `The text primarily conveys ${dominant.primaryEmotion}`;

    if (dominant.confidence > HIGH_CONFIDENCE_THRESHOLD) {
      summary += ' with high confidence';
    }

    if (insights.length > 1) {
      summary += `, accompanied by ${insights[1].primaryEmotion}`;
    }

    if (narrative) {
      summary += `. The narrative follows a ${narrative.arc} arc`;
      if (narrative.themes.length > 0) {
        summary += ` with themes of ${narrative.themes.slice(0, 2).join(' and ')}`;
      }
    }

    return summary + '.';
  }

  /**
   * Get cache key for request
   */
  private getCacheKey(request: OracleRequest): string {
    return `${request.depth}:${request.includeNarrative}:${request.includeRecommendations}:${request.text.slice(0, 100)}`;
  }

  /**
   * Get from cache
   */
  private getFromCache(key: string): OracleResponse | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    if (Date.now() > cached.expires) {
      this.cache.delete(key);
      return null;
    }
    return cached.response;
  }

  /**
   * Set cache entry
   */
  private setCache(key: string, response: OracleResponse): void {
    this.cache.set(key, {
      response,
      expires: Date.now() + this.config.cacheTTL,
    });

    // Limit cache size
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get Oracle status
   */
  getStatus(): OracleStatus {
    return {
      initialized: this.initialized,
      ready: this.initialized,
      model: this.config.model,
      cacheSize: this.cache.size,
      totalRequests: this.stats.totalRequests,
      totalErrors: this.stats.totalErrors,
      avgResponseTime:
        this.stats.totalRequests > 0
          ? this.stats.totalTime / this.stats.totalRequests
          : 0,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<OracleConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Create Oracle instance
 */
export function createOracle(config?: Partial<OracleConfig>): Oracle {
  return new Oracle(config);
}
