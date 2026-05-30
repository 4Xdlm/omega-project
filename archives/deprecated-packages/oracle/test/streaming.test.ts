/**
 * Oracle Streaming Tests
 * @module @omega/oracle/test/streaming
 * @description Unit tests for Phase 142 - Oracle Streaming
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  StreamingOracle,
  StreamController,
  createStreamingOracle,
  DEFAULT_STREAM_CONFIG,
  type OracleStreamChunk,
  type StartChunk,
  type TextChunk,
  type InsightChunk,
  type ProgressChunk,
  type CompleteChunk,
  type ErrorChunk,
} from '../src/streaming';

describe('OMEGA Oracle - Phase 142: Oracle Streaming', () => {
  let streaming: StreamingOracle;

  const sampleText = 'The happy fox jumped over the amazing fence with great joy and excitement.';

  beforeEach(() => {
    streaming = createStreamingOracle({ chunkDelay: 0 }); // Disable delay for tests
  });

  describe('Stream Configuration', () => {
    it('should use default configuration', () => {
      expect(DEFAULT_STREAM_CONFIG.chunkSize).toBe(100);
      expect(DEFAULT_STREAM_CONFIG.chunkDelay).toBe(10);
      expect(DEFAULT_STREAM_CONFIG.progressUpdates).toBe(true);
      expect(DEFAULT_STREAM_CONFIG.bufferSize).toBe(10);
    });

    it('should accept custom configuration', () => {
      const custom = createStreamingOracle({ chunkSize: 50, chunkDelay: 5 });
      expect(custom).toBeDefined();
    });
  });

  describe('StreamController', () => {
    it('should create controller', () => {
      const controller = new StreamController();
      expect(controller.isAborted()).toBe(false);
      expect(controller.isPaused()).toBe(false);
    });

    it('should abort stream', () => {
      const controller = new StreamController();
      controller.abort();
      expect(controller.isAborted()).toBe(true);
    });

    it('should pause and resume stream', () => {
      const controller = new StreamController();
      controller.pause();
      expect(controller.isPaused()).toBe(true);
      controller.resume();
      expect(controller.isPaused()).toBe(false);
    });

    it('should wait if paused', async () => {
      const controller = new StreamController();
      const waitPromise = controller.waitIfPaused();
      await waitPromise; // Should resolve immediately if not paused
    });
  });

  describe('Streaming Analysis', () => {
    it('should emit start chunk first', async () => {
      const chunks: OracleStreamChunk[] = [];
      for await (const chunk of streaming.streamAnalysis(sampleText)) {
        chunks.push(chunk);
        if (chunks.length >= 1) break;
      }

      expect(chunks[0].type).toBe('start');
      const startChunk = chunks[0] as StartChunk;
      expect(startChunk.requestId).toMatch(/^stream-/);
      expect(startChunk.totalEstimatedChunks).toBeGreaterThan(0);
    });

    it('should emit text chunks', async () => {
      const textChunks: TextChunk[] = [];
      for await (const chunk of streaming.streamAnalysis(sampleText)) {
        if (chunk.type === 'text') {
          textChunks.push(chunk);
        }
      }

      expect(textChunks.length).toBeGreaterThan(0);
      expect(textChunks[0].content).toBeTruthy();
      expect(textChunks[0].offset).toBe(0);
    });

    it('should emit insight chunks', async () => {
      const insightChunks: InsightChunk[] = [];
      for await (const chunk of streaming.streamAnalysis(sampleText)) {
        if (chunk.type === 'insight') {
          insightChunks.push(chunk);
        }
      }

      expect(insightChunks.length).toBeGreaterThan(0);
      expect(insightChunks[0].insight).toBeDefined();
      expect(insightChunks[0].insight.primaryEmotion).toBeTruthy();
    });

    it('should emit narrative chunk', async () => {
      let narrativeChunk = null;
      for await (const chunk of streaming.streamAnalysis(sampleText)) {
        if (chunk.type === 'narrative') {
          narrativeChunk = chunk;
          break;
        }
      }

      expect(narrativeChunk).not.toBeNull();
      expect(narrativeChunk!.narrative.style).toBeDefined();
    });

    it('should emit summary chunk', async () => {
      let summaryChunk = null;
      for await (const chunk of streaming.streamAnalysis(sampleText)) {
        if (chunk.type === 'summary') {
          summaryChunk = chunk;
          break;
        }
      }

      expect(summaryChunk).not.toBeNull();
      expect(summaryChunk!.summary).toContain('Analysis detected');
    });

    it('should emit complete chunk last', async () => {
      const chunks: OracleStreamChunk[] = [];
      for await (const chunk of streaming.streamAnalysis(sampleText)) {
        chunks.push(chunk);
      }

      const lastChunk = chunks[chunks.length - 1];
      expect(lastChunk.type).toBe('complete');
      const completeChunk = lastChunk as CompleteChunk;
      expect(completeChunk.response).toBeDefined();
      expect(completeChunk.duration).toBeGreaterThanOrEqual(0);
    });

    it('should include progress chunks', async () => {
      const longText = 'word '.repeat(100); // Force multiple chunks
      const progressChunks: ProgressChunk[] = [];
      const streamingWithProgress = createStreamingOracle({
        chunkDelay: 0,
        chunkSize: 20,
        progressUpdates: true
      });

      for await (const chunk of streamingWithProgress.streamAnalysis(longText)) {
        if (chunk.type === 'progress') {
          progressChunks.push(chunk);
        }
      }

      expect(progressChunks.length).toBeGreaterThan(0);
      expect(progressChunks[0].percent).toBeGreaterThanOrEqual(0);
      expect(progressChunks[0].stage).toBeTruthy();
    });
  });

  describe('Chunk Sequencing', () => {
    it('should have sequential sequence numbers', async () => {
      const chunks: OracleStreamChunk[] = [];
      for await (const chunk of streaming.streamAnalysis(sampleText)) {
        chunks.push(chunk);
      }

      for (let i = 0; i < chunks.length; i++) {
        expect(chunks[i].sequence).toBe(i);
      }
    });

    it('should have increasing timestamps', async () => {
      const chunks: OracleStreamChunk[] = [];
      for await (const chunk of streaming.streamAnalysis(sampleText)) {
        chunks.push(chunk);
      }

      for (let i = 1; i < chunks.length; i++) {
        expect(chunks[i].timestamp).toBeGreaterThanOrEqual(chunks[i - 1].timestamp);
      }
    });
  });

  describe('Stream Cancellation', () => {
    it('should cancel stream when aborted', async () => {
      const controller = new StreamController();
      const chunks: OracleStreamChunk[] = [];
      const longText = 'word '.repeat(200); // Long text to ensure cancellation has time
      const slowStreaming = createStreamingOracle({ chunkDelay: 0, chunkSize: 20 });

      for await (const chunk of slowStreaming.streamAnalysis(longText, 'standard', controller)) {
        chunks.push(chunk);
        // Abort after receiving start chunk
        if (chunk.type === 'start') {
          controller.abort();
        }
      }

      const lastChunk = chunks[chunks.length - 1];
      expect(lastChunk.type).toBe('error');
      expect((lastChunk as ErrorChunk).code).toBe('STREAM_CANCELLED');
    });

    it('should update state on cancellation', async () => {
      const controller = new StreamController();
      const longText = 'word '.repeat(200);
      const slowStreaming = createStreamingOracle({ chunkDelay: 0, chunkSize: 20 });

      for await (const chunk of slowStreaming.streamAnalysis(longText, 'standard', controller)) {
        if (chunk.type === 'start') {
          controller.abort();
        }
      }

      const state = slowStreaming.getState();
      expect(state.isCancelled).toBe(true);
    });
  });

  describe('Analysis Depth', () => {
    it('should produce fewer insights for quick depth', async () => {
      const quickInsights: InsightChunk[] = [];
      for await (const chunk of streaming.streamAnalysis(sampleText, 'quick')) {
        if (chunk.type === 'insight') {
          quickInsights.push(chunk);
        }
      }
      expect(quickInsights.length).toBeLessThanOrEqual(2);
    });

    it('should produce more insights for deep depth', async () => {
      const deepText = 'The happy and joyful experience was wonderful and great. But then came sadness and fear, making everyone angry and disgusted.';
      const deepInsights: InsightChunk[] = [];
      for await (const chunk of streaming.streamAnalysis(deepText, 'deep')) {
        if (chunk.type === 'insight') {
          deepInsights.push(chunk);
        }
      }
      expect(deepInsights.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Callbacks', () => {
    it('should call onStart callback', async () => {
      const onStart = vi.fn();
      streaming.setCallbacks({ onStart });

      for await (const chunk of streaming.streamAnalysis(sampleText)) {
        // Iterate through
      }

      expect(onStart).toHaveBeenCalledOnce();
    });

    it('should call onChunk callback for each chunk', async () => {
      const onChunk = vi.fn();
      streaming.setCallbacks({ onChunk });

      const chunks: OracleStreamChunk[] = [];
      for await (const chunk of streaming.streamAnalysis(sampleText)) {
        chunks.push(chunk);
      }

      expect(onChunk).toHaveBeenCalledTimes(chunks.length);
    });

    it('should call onComplete callback', async () => {
      const onComplete = vi.fn();
      streaming.setCallbacks({ onComplete });

      for await (const chunk of streaming.streamAnalysis(sampleText)) {
        // Iterate through
      }

      expect(onComplete).toHaveBeenCalledOnce();
    });

    it('should call onError callback on abort', async () => {
      const controller = new StreamController();
      const onError = vi.fn();
      const longText = 'word '.repeat(200);
      const abortStreaming = createStreamingOracle({ chunkDelay: 0, chunkSize: 20 });
      abortStreaming.setCallbacks({ onError });

      for await (const chunk of abortStreaming.streamAnalysis(longText, 'standard', controller)) {
        if (chunk.type === 'start') {
          controller.abort();
        }
      }

      expect(onError).toHaveBeenCalled();
    });
  });

  describe('Collect and Get Methods', () => {
    it('should collect all chunks', async () => {
      const chunks = await streaming.collectChunks(sampleText);
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].type).toBe('start');
      expect(chunks[chunks.length - 1].type).toBe('complete');
    });

    it('should get final response', async () => {
      const response = await streaming.getResponse(sampleText);
      expect(response).not.toBeNull();
      expect(response!.id).toMatch(/^stream-/);
      expect(response!.insights.length).toBeGreaterThan(0);
    });
  });

  describe('State Management', () => {
    it('should track active state', async () => {
      const initialState = streaming.getState();
      expect(initialState.isActive).toBe(false);

      // During streaming, state should be active
      for await (const chunk of streaming.streamAnalysis(sampleText)) {
        if (chunk.type === 'text') {
          const state = streaming.getState();
          expect(state.isActive).toBe(true);
          break;
        }
      }
    });

    it('should track bytes processed', async () => {
      for await (const chunk of streaming.streamAnalysis(sampleText)) {
        // Iterate through
      }

      const state = streaming.getState();
      expect(state.bytesProcessed).toBeGreaterThan(0);
    });

    it('should track chunks emitted', async () => {
      const chunks = await streaming.collectChunks(sampleText);
      const state = streaming.getState();
      expect(state.chunksEmitted).toBe(chunks.length);
    });
  });

  describe('Emotion Detection', () => {
    it('should detect joy emotion', async () => {
      const text = 'What a wonderful and happy day! I am so joyful and excited!';
      const response = await streaming.getResponse(text);
      const joyInsight = response!.insights.find(i => i.primaryEmotion === 'joy');
      expect(joyInsight).toBeDefined();
    });

    it('should detect fear emotion', async () => {
      const text = 'I am so scared and afraid. The terrifying situation made me anxious.';
      const response = await streaming.getResponse(text);
      const fearInsight = response!.insights.find(i => i.primaryEmotion === 'fear');
      expect(fearInsight).toBeDefined();
    });

    it('should detect anger emotion', async () => {
      const text = 'I am so angry and furious! This is frustrating and annoying!';
      const response = await streaming.getResponse(text);
      const angerInsight = response!.insights.find(i => i.primaryEmotion === 'anger');
      expect(angerInsight).toBeDefined();
    });

    it('should detect neutral when no emotions present', async () => {
      const text = 'The document contains text.';
      const response = await streaming.getResponse(text);
      const neutralInsight = response!.insights.find(i => i.primaryEmotion === 'neutral');
      expect(neutralInsight).toBeDefined();
    });
  });

  describe('Narrative Analysis', () => {
    it('should detect enthusiastic tone', async () => {
      const text = 'This is amazing! What a great day!';
      let narrative = null;
      for await (const chunk of streaming.streamAnalysis(text)) {
        if (chunk.type === 'narrative') {
          narrative = chunk.narrative;
        }
      }
      expect(narrative!.style.tone).toBe('enthusiastic');
    });

    it('should detect authoritative tone', async () => {
      const text = 'You must follow these important rules. You should always comply.';
      let narrative = null;
      for await (const chunk of streaming.streamAnalysis(text)) {
        if (chunk.type === 'narrative') {
          narrative = chunk.narrative;
        }
      }
      expect(narrative!.style.tone).toBe('authoritative');
    });

    it('should extract themes', async () => {
      const text = 'The journey through the forest was an adventure. Love blossomed during the quest.';
      let narrative = null;
      for await (const chunk of streaming.streamAnalysis(text)) {
        if (chunk.type === 'narrative') {
          narrative = chunk.narrative;
        }
      }
      expect(narrative!.themes).toContain('adventure');
      expect(narrative!.themes).toContain('nature');
      expect(narrative!.themes).toContain('love');
    });
  });

  describe('Invariants', () => {
    it('INV-STREAM-001: Start chunk must be first', async () => {
      const chunks = await streaming.collectChunks(sampleText);
      expect(chunks[0].type).toBe('start');
    });

    it('INV-STREAM-002: Complete or error chunk must be last', async () => {
      const chunks = await streaming.collectChunks(sampleText);
      const lastType = chunks[chunks.length - 1].type;
      expect(['complete', 'error']).toContain(lastType);
    });

    it('INV-STREAM-003: Sequence numbers must be consecutive', async () => {
      const chunks = await streaming.collectChunks(sampleText);
      for (let i = 0; i < chunks.length; i++) {
        expect(chunks[i].sequence).toBe(i);
      }
    });

    it('INV-STREAM-004: All chunks must have timestamp', async () => {
      const chunks = await streaming.collectChunks(sampleText);
      for (const chunk of chunks) {
        expect(chunk.timestamp).toBeGreaterThan(0);
      }
    });

    it('INV-STREAM-005: Response in complete chunk must be valid', async () => {
      const chunks = await streaming.collectChunks(sampleText);
      const completeChunk = chunks.find(c => c.type === 'complete') as CompleteChunk;
      expect(completeChunk).toBeDefined();
      expect(completeChunk.response.id).toBeTruthy();
      expect(completeChunk.response.insights).toBeDefined();
      expect(completeChunk.response.metadata).toBeDefined();
    });

    it('INV-STREAM-006: Progress percent must be 0-100', async () => {
      const longText = 'word '.repeat(50);
      const streamingWithProgress = createStreamingOracle({
        chunkDelay: 0,
        chunkSize: 10
      });

      for await (const chunk of streamingWithProgress.streamAnalysis(longText)) {
        if (chunk.type === 'progress') {
          expect(chunk.percent).toBeGreaterThanOrEqual(0);
          expect(chunk.percent).toBeLessThanOrEqual(100);
        }
      }
    });
  });
});
