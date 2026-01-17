/**
 * @fileoverview Phase 3.2 - Error Path Tests for Pipeline Executor
 * Tests error handling behavior in pipeline execution.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PipelineExecutor,
  createPipelineExecutor,
  createPipeline,
  createStage,
  PipelineEvent,
} from '../src/pipeline/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR PATH TESTS - Event Handler Isolation
// ═══════════════════════════════════════════════════════════════════════════════

describe('Pipeline Executor - Event Handler Error Isolation', () => {
  let executor: PipelineExecutor;

  beforeEach(() => {
    executor = createPipelineExecutor();
  });

  it('should not crash when event handler throws Error', async () => {
    executor.on(() => {
      throw new Error('Handler error');
    });

    const pipeline = createPipeline('test')
      .stage('step', async (input) => input)
      .build();

    const result = await executor.execute(pipeline, { data: 'test' });

    expect(result.status).toBe('completed');
  });

  it('should not crash when event handler throws string', async () => {
    executor.on(() => {
      throw 'string error';
    });

    const pipeline = createPipeline('test')
      .stage('step', async (input) => input)
      .build();

    const result = await executor.execute(pipeline, {});

    expect(result.status).toBe('completed');
  });

  it('should not crash when event handler throws null', async () => {
    executor.on(() => {
      throw null;
    });

    const pipeline = createPipeline('test')
      .stage('step', async (input) => input)
      .build();

    const result = await executor.execute(pipeline, {});

    expect(result.status).toBe('completed');
  });

  it('should continue calling other handlers after one throws', async () => {
    const handlersCalled: number[] = [];

    executor.on(() => {
      handlersCalled.push(1);
      throw new Error('First handler error');
    });

    executor.on(() => {
      handlersCalled.push(2);
    });

    executor.on(() => {
      handlersCalled.push(3);
    });

    const pipeline = createPipeline('test')
      .stage('step', async (input) => input)
      .build();

    await executor.execute(pipeline, {});

    expect(handlersCalled).toContain(1);
    expect(handlersCalled).toContain(2);
    expect(handlersCalled).toContain(3);
  });

  it('should emit all event types even with throwing handlers', async () => {
    const eventTypes: string[] = [];

    executor.on((event) => {
      eventTypes.push(event.type);
      if (event.type === 'stage:start') {
        throw new Error('Handler error on stage:start');
      }
    });

    const pipeline = createPipeline('test')
      .stage('step', async (input) => input)
      .build();

    await executor.execute(pipeline, {});

    expect(eventTypes).toContain('pipeline:start');
    expect(eventTypes).toContain('stage:start');
    expect(eventTypes).toContain('stage:complete');
    expect(eventTypes).toContain('pipeline:complete');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR PATH TESTS - Stage Execution Errors
// ═══════════════════════════════════════════════════════════════════════════════

describe('Pipeline Executor - Stage Error Handling', () => {
  it('should handle stage throwing Error', async () => {
    const executor = createPipelineExecutor();

    const pipeline = createPipeline('error-test')
      .stage('throws', async () => {
        throw new Error('Stage error');
      })
      .build();

    const result = await executor.execute(pipeline, {});

    expect(result.status).toBe('failed');
    expect(result.stages[0].status).toBe('failed');
    expect(result.stages[0].error).toBeDefined();
    expect(result.stages[0].error?.message).toBe('Stage error');
  });

  it('should handle stage throwing string', async () => {
    const executor = createPipelineExecutor();

    const pipeline = createPipeline('string-throw')
      .stage('throws', async () => {
        throw 'string error';
      })
      .build();

    const result = await executor.execute(pipeline, {});

    expect(result.status).toBe('failed');
    expect(result.stages[0].status).toBe('failed');
    expect(result.stages[0].error?.code).toBe('ADAPTER_ERROR');
  });

  it('should handle stage throwing number', async () => {
    const executor = createPipelineExecutor();

    const pipeline = createPipeline('number-throw')
      .stage('throws', async () => {
        throw 42;
      })
      .build();

    const result = await executor.execute(pipeline, {});

    expect(result.status).toBe('failed');
    expect(result.stages[0].error).toBeDefined();
  });

  it('should handle stage throwing null', async () => {
    const executor = createPipelineExecutor();

    const pipeline = createPipeline('null-throw')
      .stage('throws', async () => {
        throw null;
      })
      .build();

    const result = await executor.execute(pipeline, {});

    expect(result.status).toBe('failed');
  });

  it('should handle TypeError in stage', async () => {
    const executor = createPipelineExecutor();

    const pipeline = createPipeline('type-error')
      .stage('throws', async () => {
        const obj: any = null;
        return obj.method();
      })
      .build();

    const result = await executor.execute(pipeline, {});

    expect(result.status).toBe('failed');
    expect(result.stages[0].error).toBeDefined();
  });

  it('should preserve NexusError when already one', async () => {
    const executor = createPipelineExecutor();

    const pipeline = createPipeline('nexus-error')
      .addStage(
        createStage('slow', async () => {
          await new Promise((resolve) => setTimeout(resolve, 200));
          return {};
        })
          .timeout(50)
          .build()
      )
      .build();

    const result = await executor.execute(pipeline, {});

    expect(result.status).toBe('failed');
    expect(result.stages[0].error?.code).toBe('TIMEOUT');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR PATH TESTS - Dependency Validation
// ═══════════════════════════════════════════════════════════════════════════════

describe('Pipeline Executor - Dependency Errors', () => {
  it('should fail on unmet dependency', async () => {
    const executor = createPipelineExecutor();

    const pipeline = createPipeline('deps')
      .addStage(
        createStage('step2', async (input) => input)
          .dependsOn('nonexistent')
          .build()
      )
      .build();

    const result = await executor.execute(pipeline, {});

    expect(result.status).toBe('failed');
    expect(result.stages[0].error?.code).toBe('VALIDATION_FAILED');
  });

  it('should skip optional stage with unmet dependency without failing', async () => {
    const executor = createPipelineExecutor();

    const pipeline = createPipeline('optional-deps')
      .addStage(
        createStage('optional', async (input) => input)
          .dependsOn('nonexistent')
          .optional()
          .build()
      )
      .stage('final', async (input) => input)
      .build();

    const result = await executor.execute(pipeline, {});

    expect(result.status).toBe('completed');
    expect(result.stages[0].status).toBe('failed');
    expect(result.stages[1].status).toBe('completed');
  });

  it('should allow stage when dependency completed', async () => {
    const executor = createPipelineExecutor();

    const pipeline = createPipeline('valid-deps')
      .stage('step1', async () => ({ step1: true }))
      .addStage(
        createStage('step2', async (input) => ({ ...input, step2: true }))
          .dependsOn('step1')
          .build()
      )
      .build();

    const result = await executor.execute(pipeline, { initial: true });

    expect(result.status).toBe('completed');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR PATH TESTS - Retry Behavior
// ═══════════════════════════════════════════════════════════════════════════════

describe('Pipeline Executor - Retry Error Handling', () => {
  it('should emit retry events for each attempt', async () => {
    const events: PipelineEvent[] = [];
    const executor = createPipelineExecutor();
    executor.on((e) => events.push(e));

    let attempt = 0;
    const pipeline = createPipeline('retry-test')
      .addStage(
        createStage('retry', async () => {
          attempt++;
          if (attempt < 3) {
            throw new Error(`Attempt ${attempt}`);
          }
          return { success: true };
        })
          .retry(3)
          .build()
      )
      .build();

    const result = await executor.execute(pipeline, {});

    expect(result.status).toBe('completed');
    const retryEvents = events.filter((e) => e.type === 'stage:retry');
    expect(retryEvents.length).toBe(2);
  });

  it('should fail after exhausting retries', async () => {
    const executor = createPipelineExecutor();

    const pipeline = createPipeline('exhaust-retry')
      .addStage(
        createStage('always-fail', async () => {
          throw new Error('Always fails');
        })
          .retry(2)
          .build()
      )
      .build();

    const result = await executor.execute(pipeline, {});

    expect(result.status).toBe('failed');
    expect(result.stages[0].retryCount).toBe(2);
  });

  it('should track retry count correctly', async () => {
    const executor = createPipelineExecutor();
    let attempts = 0;

    const pipeline = createPipeline('retry-count')
      .addStage(
        createStage('retry', async () => {
          attempts++;
          if (attempts < 3) throw new Error('fail');
          return {};
        })
          .retry(5)
          .build()
      )
      .build();

    const result = await executor.execute(pipeline, {});

    expect(result.status).toBe('completed');
    expect(result.stages[0].retryCount).toBe(2);
    expect(attempts).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR PATH TESTS - Timeout Handling
// ═══════════════════════════════════════════════════════════════════════════════

describe('Pipeline Executor - Timeout Error Handling', () => {
  it('should fail with TIMEOUT error code', async () => {
    const executor = createPipelineExecutor();

    const pipeline = createPipeline('timeout')
      .addStage(
        createStage('slow', async () => {
          await new Promise((r) => setTimeout(r, 300));
          return {};
        })
          .timeout(50)
          .build()
      )
      .build();

    const result = await executor.execute(pipeline, {});

    expect(result.status).toBe('failed');
    expect(result.stages[0].error?.code).toBe('TIMEOUT');
  });

  it('should include timeout duration in error message', async () => {
    const executor = createPipelineExecutor();

    const pipeline = createPipeline('timeout-msg')
      .addStage(
        createStage('slow', async () => {
          await new Promise((r) => setTimeout(r, 300));
          return {};
        })
          .timeout(100)
          .build()
      )
      .build();

    const result = await executor.execute(pipeline, {});

    expect(result.stages[0].error?.message).toContain('100ms');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR PATH TESTS - Pipeline Edge Cases
// ═══════════════════════════════════════════════════════════════════════════════

describe('Pipeline Executor - Edge Cases', () => {
  it('should throw on empty pipeline', () => {
    expect(() => createPipeline('empty').build()).toThrow(
      'Pipeline must have at least one stage'
    );
  });

  it('should handle pipeline with single failing stage', async () => {
    const executor = createPipelineExecutor();

    const pipeline = createPipeline('single-fail')
      .stage('fail', async () => {
        throw new Error('Only stage fails');
      })
      .build();

    const result = await executor.execute(pipeline, {});

    expect(result.status).toBe('failed');
    expect(result.stages.length).toBe(1);
  });

  it('should include finalOutput only on success', async () => {
    const executor = createPipelineExecutor();

    const pipeline = createPipeline('output-test')
      .stage('fail', async () => {
        throw new Error('fail');
      })
      .build();

    const result = await executor.execute(pipeline, {});

    expect(result.status).toBe('failed');
    expect(result.finalOutput).toBeUndefined();
  });

  it('should have error on failed pipeline result', async () => {
    const executor = createPipelineExecutor();

    const pipeline = createPipeline('error-test')
      .stage('fail', async () => {
        throw new Error('Pipeline error');
      })
      .build();

    const result = await executor.execute(pipeline, {});

    expect(result.error).toBeDefined();
  });
});
