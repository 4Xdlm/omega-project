/**
 * OMEGA Runner Pipeline Tests v1.0
 * Phase I - NASA-Grade L4 / DO-178C
 *
 * Tests for execution pipeline.
 */

import { describe, it, expect } from 'vitest';
import {
  computeHash,
  computeChainHash,
  validateIntent,
  mockGenerate,
  mockTruthGate,
  mockDelivery,
  createContext,
  addFile,
  computeRunHash,
  executePipeline,
  getPipelineFiles,
} from '../../src/runner/pipeline';
import type { IntentData, PipelineContext } from '../../src/runner/pipeline';
import { ExitCode, RUN_FILES, HASHABLE_FILES } from '../../src/runner/types';

const FIXED_TIMESTAMP = '2025-01-15T10:30:00.000Z';

// Helper to create valid intent JSON
function createIntentJson(intentId: string, content: string): string {
  return JSON.stringify({ intentId, content });
}

describe('Pipeline — Phase I', () => {
  describe('computeHash', () => {
    it('produces valid SHA256', () => {
      const hash = computeHash('test');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('is deterministic', () => {
      const hash1 = computeHash('deterministic');
      const hash2 = computeHash('deterministic');
      expect(hash1).toBe(hash2);
    });

    it('different inputs produce different hashes', () => {
      const hash1 = computeHash('input1');
      const hash2 = computeHash('input2');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('computeChainHash', () => {
    it('hashes joined hashes', () => {
      const hashes = ['abc', 'def'];
      const result = computeChainHash(hashes);
      expect(result).toBe(computeHash('abc\ndef'));
    });

    it('is deterministic', () => {
      const hashes = ['a', 'b', 'c'];
      expect(computeChainHash(hashes)).toBe(computeChainHash(hashes));
    });

    it('order matters', () => {
      const result1 = computeChainHash(['a', 'b']);
      const result2 = computeChainHash(['b', 'a']);
      expect(result1).not.toBe(result2);
    });
  });

  describe('validateIntent', () => {
    it('validates correct intent', () => {
      const json = createIntentJson('test-123', 'Hello world');
      const result = validateIntent(json);

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(ExitCode.PASS);
      expect(result.data?.intentId).toBe('test-123');
      expect(result.data?.content).toBe('Hello world');
    });

    it('fails for invalid JSON', () => {
      const result = validateIntent('not json');

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(ExitCode.INTENT_INVALID);
      expect(result.error).toContain('Invalid JSON');
    });

    it('fails for missing intentId', () => {
      const result = validateIntent(JSON.stringify({ content: 'hello' }));

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(ExitCode.INTENT_INVALID);
      expect(result.error).toContain('intentId');
    });

    it('fails for missing content', () => {
      const result = validateIntent(JSON.stringify({ intentId: 'test' }));

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(ExitCode.INTENT_INVALID);
      expect(result.error).toContain('content');
    });

    it('accepts text field as content', () => {
      const json = JSON.stringify({ intentId: 'test', text: 'Hello' });
      const result = validateIntent(json);

      expect(result.success).toBe(true);
      expect(result.data?.content).toBe('Hello');
    });

    it('accepts body field as content', () => {
      const json = JSON.stringify({ intentId: 'test', body: 'Hello' });
      const result = validateIntent(json);

      expect(result.success).toBe(true);
      expect(result.data?.content).toBe('Hello');
    });

    it('preserves metadata', () => {
      const json = JSON.stringify({
        intentId: 'test',
        content: 'hello',
        metadata: { key: 'value' },
      });
      const result = validateIntent(json);

      expect(result.data?.metadata).toEqual({ key: 'value' });
    });
  });

  describe('mockGenerate', () => {
    it('generates text from intent', () => {
      const intent: IntentData = {
        intentId: 'test',
        content: 'Hello world',
      };

      const result = mockGenerate(intent, FIXED_TIMESTAMP);

      expect(result.success).toBe(true);
      expect(result.data?.generatedText).toBe('Hello world');
      expect(result.data?.intentId).toBe('test');
      expect(result.data?.timestamp).toBe(FIXED_TIMESTAMP);
    });

    it('is deterministic', () => {
      const intent: IntentData = {
        intentId: 'test',
        content: 'Deterministic',
      };

      const result1 = mockGenerate(intent, FIXED_TIMESTAMP);
      const result2 = mockGenerate(intent, FIXED_TIMESTAMP);

      expect(result1.data?.generatedText).toBe(result2.data?.generatedText);
    });
  });

  describe('mockTruthGate', () => {
    it('validates text', () => {
      const result = mockTruthGate('Valid text', FIXED_TIMESTAMP);

      expect(result.success).toBe(true);
      expect(result.data?.verdict.passed).toBe(true);
      expect(result.data?.verdict.validatedText).toBe('Valid text');
      expect(result.data?.verdict.violations).toHaveLength(0);
    });

    it('produces proof', () => {
      const result = mockTruthGate('text', FIXED_TIMESTAMP);

      expect(result.data?.proof.hash).toBe(computeHash('text'));
      expect(result.data?.proof.timestamp).toBe(FIXED_TIMESTAMP);
      expect(result.data?.proof.gateId).toBe('MOCK_GATE_v1');
    });

    it('is deterministic', () => {
      const result1 = mockTruthGate('text', FIXED_TIMESTAMP);
      const result2 = mockTruthGate('text', FIXED_TIMESTAMP);

      expect(result1.data?.proof.hash).toBe(result2.data?.proof.hash);
    });
  });

  describe('mockDelivery', () => {
    it('creates delivery output', () => {
      const result = mockDelivery('content', 'OMEGA_STD', FIXED_TIMESTAMP);

      expect(result.success).toBe(true);
      expect(result.data?.artifacts).toHaveLength(1);
      expect(result.data?.artifacts[0].content).toBe('content');
    });

    it('creates manifest', () => {
      const result = mockDelivery('content', 'PROF-test', FIXED_TIMESTAMP);

      expect(result.data?.manifest).toBeDefined();
      expect((result.data?.manifest as any).profile).toBe('PROF-test');
    });

    it('computes artifact hash', () => {
      const result = mockDelivery('content', 'OMEGA_STD', FIXED_TIMESTAMP);

      expect(result.data?.artifacts[0].hash).toBe(computeHash('content'));
    });

    it('is deterministic', () => {
      const result1 = mockDelivery('text', 'OMEGA_STD', FIXED_TIMESTAMP);
      const result2 = mockDelivery('text', 'OMEGA_STD', FIXED_TIMESTAMP);

      expect(result1.data?.artifacts[0].hash).toBe(result2.data?.artifacts[0].hash);
    });
  });

  describe('createContext', () => {
    it('creates context with run ID', () => {
      const ctx = createContext('test-intent', '/base', FIXED_TIMESTAMP);

      expect(ctx.runId).toMatch(/^run_test-intent_\d+$/);
      expect(ctx.timestamp).toBe(FIXED_TIMESTAMP);
    });

    it('creates empty file maps', () => {
      const ctx = createContext('test', '/base', FIXED_TIMESTAMP);

      expect(ctx.files.size).toBe(0);
      expect(ctx.hashes.size).toBe(0);
    });
  });

  describe('addFile', () => {
    it('adds file and computes hash', () => {
      const ctx = createContext('test', '/base', FIXED_TIMESTAMP);

      addFile(ctx, 'test.txt', 'content');

      expect(ctx.files.get('test.txt')).toBe('content');
      expect(ctx.hashes.get('test.txt')).toBe(computeHash('content'));
    });

    it('overwrites existing file', () => {
      const ctx = createContext('test', '/base', FIXED_TIMESTAMP);

      addFile(ctx, 'test.txt', 'first');
      addFile(ctx, 'test.txt', 'second');

      expect(ctx.files.get('test.txt')).toBe('second');
    });
  });

  describe('computeRunHash', () => {
    it('computes hash from context', () => {
      const ctx = createContext('test', '/base', FIXED_TIMESTAMP);

      addFile(ctx, RUN_FILES.INTENT, '{"test": true}');
      addFile(ctx, RUN_FILES.HASHES, 'hash1  file1');

      const hash = computeRunHash(ctx);

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('is deterministic', () => {
      const createTestContext = () => {
        const ctx = createContext('test', '/base', FIXED_TIMESTAMP);
        addFile(ctx, RUN_FILES.INTENT, '{"intentId": "test"}');
        addFile(ctx, RUN_FILES.HASHES, 'abc  file1');
        return computeRunHash(ctx);
      };

      expect(createTestContext()).toBe(createTestContext());
    });

    it('excludes report from hash', () => {
      const ctx1 = createContext('test', '/base', FIXED_TIMESTAMP);
      const ctx2 = createContext('test', '/base', FIXED_TIMESTAMP);

      addFile(ctx1, RUN_FILES.INTENT, '{}');
      addFile(ctx2, RUN_FILES.INTENT, '{}');
      addFile(ctx1, RUN_FILES.HASHES, 'h  f');
      addFile(ctx2, RUN_FILES.HASHES, 'h  f');

      // Add different reports
      addFile(ctx1, RUN_FILES.REPORT, 'report 1');
      addFile(ctx2, RUN_FILES.REPORT, 'report 2 different');

      expect(computeRunHash(ctx1)).toBe(computeRunHash(ctx2));
    });
  });

  describe('executePipeline', () => {
    it('executes full pipeline', () => {
      const intentJson = createIntentJson('test-run', 'Hello world');

      const result = executePipeline(intentJson, {
        profile: 'OMEGA_STD',
        timestamp: FIXED_TIMESTAMP,
      });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(ExitCode.PASS);
      expect(result.runId).toMatch(/^run_test-run_\d+$/);
      expect(result.runHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('fails for invalid intent', () => {
      const result = executePipeline('not json', {
        profile: 'OMEGA_STD',
      });

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(ExitCode.INTENT_INVALID);
    });

    it('is deterministic (I-INV-01)', () => {
      const intentJson = createIntentJson('determinism', 'Same content');

      const results = Array.from({ length: 10 }, () =>
        executePipeline(intentJson, {
          profile: 'OMEGA_STD',
          timestamp: FIXED_TIMESTAMP,
        })
      );

      const hashes = new Set(results.map(r => r.runHash));
      expect(hashes.size).toBe(1);
    });

    it('includes timestamp', () => {
      const intentJson = createIntentJson('test', 'content');

      const result = executePipeline(intentJson, {
        profile: 'OMEGA_STD',
        timestamp: FIXED_TIMESTAMP,
      });

      expect(result.timestamp).toBe(FIXED_TIMESTAMP);
    });
  });

  describe('getPipelineFiles', () => {
    it('returns all pipeline files', () => {
      const intentJson = createIntentJson('test', 'content');

      const { files, result } = getPipelineFiles(intentJson, {
        profile: 'OMEGA_STD',
        timestamp: FIXED_TIMESTAMP,
      });

      expect(result.success).toBe(true);
      expect(files.has(RUN_FILES.INTENT)).toBe(true);
      expect(files.has(RUN_FILES.CONTRACT)).toBe(true);
      expect(files.has(RUN_FILES.TRUTHGATE_VERDICT)).toBe(true);
      expect(files.has(RUN_FILES.TRUTHGATE_PROOF)).toBe(true);
      expect(files.has(RUN_FILES.DELIVERY_MANIFEST)).toBe(true);
      expect(files.has(RUN_FILES.HASHES)).toBe(true);
      expect(files.has(RUN_FILES.RUN_HASH)).toBe(true);
      expect(files.has(RUN_FILES.REPORT)).toBe(true);
    });

    it('includes artifacts', () => {
      const intentJson = createIntentJson('test', 'content');

      const { files } = getPipelineFiles(intentJson, {
        profile: 'OMEGA_STD',
        timestamp: FIXED_TIMESTAMP,
      });

      expect(files.has(`${RUN_FILES.ARTIFACTS_DIR}/output.txt`)).toBe(true);
    });

    it('run hash matches result', () => {
      const intentJson = createIntentJson('test', 'content');

      const { files, result } = getPipelineFiles(intentJson, {
        profile: 'OMEGA_STD',
        timestamp: FIXED_TIMESTAMP,
      });

      expect(files.get(RUN_FILES.RUN_HASH)).toBe(result.runHash);
    });

    it('returns empty files for invalid intent', () => {
      const { files, result } = getPipelineFiles('invalid', {
        profile: 'OMEGA_STD',
      });

      expect(result.success).toBe(false);
      expect(files.size).toBe(0);
    });
  });

  describe('Determinism (I-INV-01)', () => {
    it('same intent produces same run hash across 50 runs', () => {
      const intentJson = createIntentJson('fifty-runs', 'Consistent content');
      const options = { profile: 'OMEGA_STD', timestamp: FIXED_TIMESTAMP };

      const results = Array.from({ length: 50 }, () =>
        executePipeline(intentJson, options)
      );

      const hashes = new Set(results.map(r => r.runHash));
      expect(hashes.size).toBe(1);
    });

    it('different intent produces different run hash', () => {
      const intent1 = createIntentJson('intent-1', 'Content A');
      const intent2 = createIntentJson('intent-2', 'Content B');
      const options = { profile: 'OMEGA_STD', timestamp: FIXED_TIMESTAMP };

      const result1 = executePipeline(intent1, options);
      const result2 = executePipeline(intent2, options);

      expect(result1.runHash).not.toBe(result2.runHash);
    });

    it('different timestamp produces different run hash', () => {
      const intentJson = createIntentJson('test', 'content');

      const result1 = executePipeline(intentJson, {
        profile: 'OMEGA_STD',
        timestamp: '2025-01-01T00:00:00.000Z',
      });
      const result2 = executePipeline(intentJson, {
        profile: 'OMEGA_STD',
        timestamp: '2025-01-02T00:00:00.000Z',
      });

      expect(result1.runHash).not.toBe(result2.runHash);
    });
  });
});
