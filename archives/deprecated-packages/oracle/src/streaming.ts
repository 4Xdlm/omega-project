/**
 * Oracle Streaming System
 * @module @omega/oracle/streaming
 * @description Streaming responses for Oracle analysis
 */

import type { OracleResponse, EmotionalInsight, NarrativeAnalysis } from './types';

/**
 * Streaming chunk types
 */
export type StreamChunkType =
  | 'start'
  | 'text'
  | 'insight'
  | 'narrative'
  | 'summary'
  | 'progress'
  | 'complete'
  | 'error';

/**
 * Base streaming chunk
 */
export interface StreamChunk {
  type: StreamChunkType;
  timestamp: number;
  sequence: number;
}

/**
 * Start chunk - beginning of stream
 */
export interface StartChunk extends StreamChunk {
  type: 'start';
  requestId: string;
  totalEstimatedChunks: number;
}

/**
 * Text chunk - partial text content
 */
export interface TextChunk extends StreamChunk {
  type: 'text';
  content: string;
  offset: number;
  length: number;
}

/**
 * Insight chunk - single emotional insight
 */
export interface InsightChunk extends StreamChunk {
  type: 'insight';
  insight: EmotionalInsight;
  index: number;
}

/**
 * Narrative chunk - narrative analysis
 */
export interface NarrativeChunk extends StreamChunk {
  type: 'narrative';
  narrative: NarrativeAnalysis;
}

/**
 * Summary chunk - final summary
 */
export interface SummaryChunk extends StreamChunk {
  type: 'summary';
  summary: string;
}

/**
 * Progress chunk - progress update
 */
export interface ProgressChunk extends StreamChunk {
  type: 'progress';
  percent: number;
  stage: string;
  message: string;
}

/**
 * Complete chunk - stream finished
 */
export interface CompleteChunk extends StreamChunk {
  type: 'complete';
  response: OracleResponse;
  duration: number;
}

/**
 * Error chunk - stream error
 */
export interface ErrorChunk extends StreamChunk {
  type: 'error';
  code: string;
  message: string;
  recoverable: boolean;
}

/**
 * Union type for all chunks
 */
export type OracleStreamChunk =
  | StartChunk
  | TextChunk
  | InsightChunk
  | NarrativeChunk
  | SummaryChunk
  | ProgressChunk
  | CompleteChunk
  | ErrorChunk;

/**
 * Streaming configuration
 */
export interface StreamConfig {
  /** Chunk size for text processing */
  chunkSize: number;
  /** Delay between chunks in ms */
  chunkDelay: number;
  /** Enable progress updates */
  progressUpdates: boolean;
  /** Progress update interval in ms */
  progressInterval: number;
  /** Buffer size for backpressure */
  bufferSize: number;
}

/**
 * Default streaming configuration
 */
export const DEFAULT_STREAM_CONFIG: StreamConfig = {
  chunkSize: 100,
  chunkDelay: 10,
  progressUpdates: true,
  progressInterval: 100,
  bufferSize: 10,
};

/**
 * Stream state
 */
export interface StreamState {
  isActive: boolean;
  isPaused: boolean;
  isCancelled: boolean;
  chunksEmitted: number;
  bytesProcessed: number;
  startTime: number;
  lastChunkTime: number;
}

/**
 * Stream event callbacks
 */
export interface StreamCallbacks {
  onStart?: (chunk: StartChunk) => void;
  onChunk?: (chunk: OracleStreamChunk) => void;
  onProgress?: (chunk: ProgressChunk) => void;
  onComplete?: (chunk: CompleteChunk) => void;
  onError?: (chunk: ErrorChunk) => void;
}

/**
 * Oracle streaming controller
 */
export class StreamController {
  private aborted = false;
  private pausePromise: Promise<void> | null = null;
  private pauseResolve: (() => void) | null = null;

  /**
   * Abort the stream
   */
  abort(): void {
    this.aborted = true;
    if (this.pauseResolve) {
      this.pauseResolve();
    }
  }

  /**
   * Check if aborted
   */
  isAborted(): boolean {
    return this.aborted;
  }

  /**
   * Pause the stream
   */
  pause(): void {
    if (!this.pausePromise) {
      this.pausePromise = new Promise((resolve) => {
        this.pauseResolve = resolve;
      });
    }
  }

  /**
   * Resume the stream
   */
  resume(): void {
    if (this.pauseResolve) {
      this.pauseResolve();
      this.pausePromise = null;
      this.pauseResolve = null;
    }
  }

  /**
   * Wait if paused
   */
  async waitIfPaused(): Promise<void> {
    if (this.pausePromise) {
      await this.pausePromise;
    }
  }

  /**
   * Check if paused
   */
  isPaused(): boolean {
    return this.pausePromise !== null;
  }
}

/**
 * Streaming Oracle for chunked responses
 */
export class StreamingOracle {
  private config: StreamConfig;
  private state: StreamState;
  private callbacks: StreamCallbacks;
  private controller: StreamController | null = null;

  constructor(config: Partial<StreamConfig> = {}) {
    this.config = { ...DEFAULT_STREAM_CONFIG, ...config };
    this.state = this.createInitialState();
    this.callbacks = {};
  }

  /**
   * Create initial state
   */
  private createInitialState(): StreamState {
    return {
      isActive: false,
      isPaused: false,
      isCancelled: false,
      chunksEmitted: 0,
      bytesProcessed: 0,
      startTime: 0,
      lastChunkTime: 0,
    };
  }

  /**
   * Set callbacks
   */
  setCallbacks(callbacks: StreamCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Get current state
   */
  getState(): StreamState {
    return { ...this.state };
  }

  /**
   * Get controller for current stream
   */
  getController(): StreamController | null {
    return this.controller;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `stream-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Create a chunk with common fields
   */
  private createChunk<T extends StreamChunkType>(type: T): StreamChunk & { type: T } {
    const now = Date.now();
    this.state.lastChunkTime = now;
    return {
      type,
      timestamp: now,
      sequence: this.state.chunksEmitted++,
    };
  }

  /**
   * Emit chunk to callbacks
   */
  private emitChunk(chunk: OracleStreamChunk): void {
    this.callbacks.onChunk?.(chunk);

    switch (chunk.type) {
      case 'start':
        this.callbacks.onStart?.(chunk);
        break;
      case 'progress':
        this.callbacks.onProgress?.(chunk);
        break;
      case 'complete':
        this.callbacks.onComplete?.(chunk);
        break;
      case 'error':
        this.callbacks.onError?.(chunk);
        break;
    }
  }

  /**
   * Stream analysis as async generator
   */
  async *streamAnalysis(
    text: string,
    depth: 'quick' | 'standard' | 'deep' = 'standard',
    controller?: StreamController
  ): AsyncGenerator<OracleStreamChunk> {
    this.controller = controller || new StreamController();
    this.state = this.createInitialState();
    this.state.isActive = true;
    this.state.startTime = Date.now();

    const requestId = this.generateRequestId();
    const chunks = this.splitText(text);
    const totalChunks = chunks.length + 4; // text chunks + start + insights + narrative + complete

    try {
      // Start chunk
      const startChunk: StartChunk = {
        ...this.createChunk('start'),
        requestId,
        totalEstimatedChunks: totalChunks,
      };
      this.emitChunk(startChunk);
      yield startChunk;

      // Process text chunks
      let processedText = '';
      for (let i = 0; i < chunks.length; i++) {
        await this.controller.waitIfPaused();
        if (this.controller.isAborted()) {
          this.state.isCancelled = true;
          break;
        }

        const textChunk: TextChunk = {
          ...this.createChunk('text'),
          content: chunks[i],
          offset: processedText.length,
          length: chunks[i].length,
        };
        processedText += chunks[i];
        this.state.bytesProcessed += chunks[i].length;
        this.emitChunk(textChunk);
        yield textChunk;

        // Progress update
        if (this.config.progressUpdates && i % 5 === 0) {
          const progressChunk: ProgressChunk = {
            ...this.createChunk('progress'),
            percent: Math.round((i / chunks.length) * 50),
            stage: 'processing',
            message: `Processing text chunk ${i + 1}/${chunks.length}`,
          };
          this.emitChunk(progressChunk);
          yield progressChunk;
        }

        if (this.config.chunkDelay > 0) {
          await this.delay(this.config.chunkDelay);
        }
      }

      if (this.state.isCancelled) {
        const errorChunk: ErrorChunk = {
          ...this.createChunk('error'),
          code: 'STREAM_CANCELLED',
          message: 'Stream was cancelled by user',
          recoverable: false,
        };
        this.emitChunk(errorChunk);
        yield errorChunk;
        return;
      }

      // Generate insights
      const insights = this.generateInsights(processedText, depth);
      for (let i = 0; i < insights.length; i++) {
        await this.controller.waitIfPaused();
        if (this.controller.isAborted()) {
          this.state.isCancelled = true;
          break;
        }

        const insightChunk: InsightChunk = {
          ...this.createChunk('insight'),
          insight: insights[i],
          index: i,
        };
        this.emitChunk(insightChunk);
        yield insightChunk;

        if (this.config.chunkDelay > 0) {
          await this.delay(this.config.chunkDelay);
        }
      }

      // Progress update
      const progressChunk: ProgressChunk = {
        ...this.createChunk('progress'),
        percent: 75,
        stage: 'analysis',
        message: 'Generating narrative analysis',
      };
      this.emitChunk(progressChunk);
      yield progressChunk;

      // Generate narrative
      const narrative = this.generateNarrative(processedText);
      const narrativeChunk: NarrativeChunk = {
        ...this.createChunk('narrative'),
        narrative,
      };
      this.emitChunk(narrativeChunk);
      yield narrativeChunk;

      // Generate summary
      const summary = this.generateSummary(insights);
      const summaryChunk: SummaryChunk = {
        ...this.createChunk('summary'),
        summary,
      };
      this.emitChunk(summaryChunk);
      yield summaryChunk;

      // Complete
      const response: OracleResponse = {
        id: requestId,
        text: processedText,
        insights,
        summary,
        metadata: {
          model: 'streaming-oracle',
          tokensUsed: processedText.length,
          processingTime: Date.now() - this.state.startTime,
          cached: false,
          timestamp: Date.now(),
        },
      };

      const completeChunk: CompleteChunk = {
        ...this.createChunk('complete'),
        response,
        duration: Date.now() - this.state.startTime,
      };
      this.emitChunk(completeChunk);
      yield completeChunk;
    } catch (error) {
      const errorChunk: ErrorChunk = {
        ...this.createChunk('error'),
        code: 'STREAM_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        recoverable: false,
      };
      this.emitChunk(errorChunk);
      yield errorChunk;
    } finally {
      this.state.isActive = false;
      this.controller = null;
    }
  }

  /**
   * Split text into chunks
   */
  private splitText(text: string): string[] {
    const chunks: string[] = [];
    const words = text.split(/(\s+)/);
    let current = '';

    for (const word of words) {
      if (current.length + word.length > this.config.chunkSize) {
        if (current) chunks.push(current);
        current = word;
      } else {
        current += word;
      }
    }

    if (current) chunks.push(current);
    return chunks;
  }

  /**
   * Generate insights from text
   */
  private generateInsights(text: string, depth: string): EmotionalInsight[] {
    const wordCount = text.split(/\s+/).length;
    const insights: EmotionalInsight[] = [];

    // Detect emotions based on keywords
    const emotionKeywords: Record<string, string[]> = {
      joy: ['happy', 'joy', 'wonderful', 'great', 'amazing', 'love', 'beautiful'],
      sadness: ['sad', 'unhappy', 'depressed', 'grief', 'sorrow', 'cry', 'tears'],
      anger: ['angry', 'furious', 'rage', 'hate', 'frustrated', 'annoyed'],
      fear: ['afraid', 'scared', 'terrified', 'anxious', 'worried', 'nervous'],
      surprise: ['surprised', 'shocked', 'amazed', 'unexpected', 'astonished'],
      trust: ['trust', 'believe', 'faith', 'confident', 'reliable', 'honest'],
      anticipation: ['expect', 'hope', 'wait', 'looking forward', 'anticipate'],
      disgust: ['disgusted', 'revolted', 'sick', 'repulsed', 'awful'],
    };

    const lowerText = text.toLowerCase();
    const numInsights = depth === 'quick' ? 2 : depth === 'deep' ? 5 : 3;

    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
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

    // Default insight if none detected
    if (insights.length === 0) {
      insights.push({
        primaryEmotion: 'neutral',
        confidence: 0.7,
        evidence: [`${wordCount} words analyzed`],
        intensity: 0.3,
      });
    }

    return insights.slice(0, numInsights);
  }

  /**
   * Generate narrative analysis
   */
  private generateNarrative(text: string): NarrativeAnalysis {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim());
    const words = text.split(/\s+/);

    return {
      structure: {
        introduction: sentences.length > 0 ? sentences[0].trim() : '',
        development: sentences.slice(1, -1).map((s) => s.trim()),
        conclusion: sentences.length > 1 ? sentences[sentences.length - 1].trim() : '',
      },
      style: {
        tone: this.detectTone(text),
        complexity: words.length > 100 ? 'complex' : 'simple',
        readabilityScore: Math.min(100, Math.max(0, 100 - words.length / 10)),
      },
      themes: this.extractThemes(text),
    };
  }

  /**
   * Detect tone from text
   */
  private detectTone(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes('!') || lower.includes('amazing') || lower.includes('great')) {
      return 'enthusiastic';
    }
    if (lower.includes('must') || lower.includes('should') || lower.includes('important')) {
      return 'authoritative';
    }
    if (lower.includes('perhaps') || lower.includes('maybe') || lower.includes('might')) {
      return 'tentative';
    }
    return 'neutral';
  }

  /**
   * Extract themes from text
   */
  private extractThemes(text: string): string[] {
    const themes: string[] = [];
    const lower = text.toLowerCase();

    const themeKeywords: Record<string, string[]> = {
      love: ['love', 'heart', 'romance', 'passion'],
      adventure: ['journey', 'quest', 'adventure', 'explore'],
      conflict: ['fight', 'battle', 'war', 'struggle'],
      growth: ['learn', 'grow', 'change', 'develop'],
      nature: ['forest', 'ocean', 'mountain', 'nature'],
    };

    for (const [theme, keywords] of Object.entries(themeKeywords)) {
      if (keywords.some((kw) => lower.includes(kw))) {
        themes.push(theme);
      }
    }

    return themes.length > 0 ? themes : ['general'];
  }

  /**
   * Generate summary from insights
   */
  private generateSummary(insights: EmotionalInsight[]): string {
    if (insights.length === 0) {
      return 'No significant emotional patterns detected.';
    }

    const primaryEmotions = insights.map((i) => i.primaryEmotion).join(', ');
    const avgConfidence = insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length;

    return `Analysis detected ${insights.length} emotional pattern(s): ${primaryEmotions}. Average confidence: ${(avgConfidence * 100).toFixed(1)}%.`;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Collect all chunks into array
   */
  async collectChunks(
    text: string,
    depth: 'quick' | 'standard' | 'deep' = 'standard',
    controller?: StreamController
  ): Promise<OracleStreamChunk[]> {
    const chunks: OracleStreamChunk[] = [];
    for await (const chunk of this.streamAnalysis(text, depth, controller)) {
      chunks.push(chunk);
    }
    return chunks;
  }

  /**
   * Get final response from stream
   */
  async getResponse(
    text: string,
    depth: 'quick' | 'standard' | 'deep' = 'standard'
  ): Promise<OracleResponse | null> {
    for await (const chunk of this.streamAnalysis(text, depth)) {
      if (chunk.type === 'complete') {
        return chunk.response;
      }
      if (chunk.type === 'error') {
        throw new Error(chunk.message);
      }
    }
    return null;
  }
}

/**
 * Create streaming oracle instance
 */
export function createStreamingOracle(config?: Partial<StreamConfig>): StreamingOracle {
  return new StreamingOracle(config);
}
