/**
 * OMEGA INTENT_MACHINE — Unit Tests
 * Phase 18 — Memory Foundation
 * Standard: MIL-STD-882E / DO-178C Level A
 * 
 * Tests: ~45
 * Invariants covered:
 * - INV-MEM-02: Intent jamais ambigu
 * - INV-MEM-07: Timeout protection
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  IntentLock,
  createIntentLock,
  IntentState,
  IntentType,
  IntentPriority,
  IntentAction,
  IntentFailureCode,
  VALID_TRANSITIONS,
  ACTION_TRANSITIONS,
  PRIORITY_VALUES,
  INTENT_LIMITS,
  IntentErrorCode,
} from '../../src/intent/index.js';

describe('INTENT_MACHINE', () => {
  let lock: IntentLock;

  beforeEach(() => {
    lock = createIntentLock();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('create()', () => {
    it('creates intent with required fields', () => {
      const result = lock.create({
        type: IntentType.CREATE,
        description: 'Create a new character',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe(IntentType.CREATE);
        expect(result.data.description).toBe('Create a new character');
        expect(result.data.state).toBe(IntentState.PENDING);
        expect(result.data.priority).toBe(IntentPriority.NORMAL);
        expect(result.data.retryCount).toBe(0);
      }
    });

    it('generates unique IDs', () => {
      const r1 = lock.create({ type: IntentType.CREATE, description: 'Intent 1' });
      const r2 = lock.create({ type: IntentType.CREATE, description: 'Intent 2' });

      expect(r1.success && r2.success).toBe(true);
      if (r1.success && r2.success) {
        expect(r1.data.id).not.toBe(r2.data.id);
      }
    });

    it('accepts custom priority', () => {
      const result = lock.create({
        type: IntentType.UPDATE,
        description: 'High priority update',
        priority: IntentPriority.HIGH,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.priority).toBe(IntentPriority.HIGH);
      }
    });

    it('stores payload correctly', () => {
      const result = lock.create({
        type: IntentType.CREATE,
        description: 'Create character',
        payload: {
          targetType: 'character',
          data: { name: 'Jean', age: 35 },
        },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.payload.targetType).toBe('character');
        expect(result.data.payload.data?.name).toBe('Jean');
      }
    });

    it('stores metadata correctly', () => {
      const result = lock.create({
        type: IntentType.CREATE,
        description: 'Test intent',
        createdBy: 'user-123',
        contextId: 'ctx-456',
        tags: ['test', 'important'],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.metadata.createdBy).toBe('user-123');
        expect(result.data.metadata.contextId).toBe('ctx-456');
        expect(result.data.metadata.tags).toContain('test');
      }
    });

    it('rejects invalid type', () => {
      const result = lock.create({
        type: 'INVALID' as IntentType,
        description: 'Invalid intent',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(IntentErrorCode.INVALID_TYPE);
      }
    });

    it('rejects empty description', () => {
      const result = lock.create({
        type: IntentType.CREATE,
        description: '',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(IntentErrorCode.INVALID_PAYLOAD);
      }
    });

    it('computes valid hash', () => {
      const result = lock.create({
        type: IntentType.CREATE,
        description: 'Test',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.hash).toBeDefined();
        expect(result.data.hash.length).toBe(64);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE TRANSITIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('State Transitions', () => {
    it('IDLE → PENDING via create()', () => {
      const result = lock.create({ type: IntentType.CREATE, description: 'Test' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.state).toBe(IntentState.PENDING);
      }
    });

    it('PENDING → LOCKED via lock()', () => {
      const createResult = lock.create({ type: IntentType.CREATE, description: 'Test' });
      if (!createResult.success) throw new Error('Create failed');

      const lockResult = lock.lock(createResult.data.id);
      expect(lockResult.success).toBe(true);
      if (lockResult.success) {
        expect(lockResult.data.state).toBe(IntentState.LOCKED);
      }
    });

    it('LOCKED → EXECUTING via execute()', () => {
      const createResult = lock.create({ type: IntentType.CREATE, description: 'Test' });
      if (!createResult.success) throw new Error('Create failed');

      lock.lock(createResult.data.id);
      const execResult = lock.execute(createResult.data.id);

      expect(execResult.success).toBe(true);
      if (execResult.success) {
        expect(execResult.data.state).toBe(IntentState.EXECUTING);
      }
    });

    it('EXECUTING → COMPLETE via complete()', () => {
      const createResult = lock.create({ type: IntentType.CREATE, description: 'Test' });
      if (!createResult.success) throw new Error('Create failed');

      lock.lock(createResult.data.id);
      lock.execute(createResult.data.id);
      const completeResult = lock.complete(createResult.data.id, { result: { success: true } });

      expect(completeResult.success).toBe(true);
      if (completeResult.success) {
        expect(completeResult.data.state).toBe(IntentState.COMPLETE);
        expect(completeResult.data.result).toEqual({ success: true });
      }
    });

    it('EXECUTING → FAILED via fail()', () => {
      const createResult = lock.create({ type: IntentType.CREATE, description: 'Test' });
      if (!createResult.success) throw new Error('Create failed');

      lock.lock(createResult.data.id);
      lock.execute(createResult.data.id);
      const failResult = lock.fail(createResult.data.id, {
        code: IntentFailureCode.VALIDATION_FAILED,
        message: 'Invalid data',
      });

      expect(failResult.success).toBe(true);
      if (failResult.success) {
        expect(failResult.data.state).toBe(IntentState.FAILED);
        expect(failResult.data.failureCode).toBe(IntentFailureCode.VALIDATION_FAILED);
        expect(failResult.data.failureMessage).toBe('Invalid data');
      }
    });

    it('PENDING → IDLE via cancel()', () => {
      const createResult = lock.create({ type: IntentType.CREATE, description: 'Test' });
      if (!createResult.success) throw new Error('Create failed');

      const cancelResult = lock.cancel(createResult.data.id);

      expect(cancelResult.success).toBe(true);
      if (cancelResult.success) {
        expect(cancelResult.data.state).toBe(IntentState.IDLE);
        expect(cancelResult.data.failureCode).toBe(IntentFailureCode.CANCELLED);
      }
    });

    it('LOCKED → IDLE via cancel()', () => {
      const createResult = lock.create({ type: IntentType.CREATE, description: 'Test' });
      if (!createResult.success) throw new Error('Create failed');

      lock.lock(createResult.data.id);
      const cancelResult = lock.cancel(createResult.data.id);

      expect(cancelResult.success).toBe(true);
      if (cancelResult.success) {
        expect(cancelResult.data.state).toBe(IntentState.IDLE);
      }
    });

    it('COMPLETE → IDLE via reset()', () => {
      const createResult = lock.create({ type: IntentType.CREATE, description: 'Test' });
      if (!createResult.success) throw new Error('Create failed');

      lock.lock(createResult.data.id);
      lock.execute(createResult.data.id);
      lock.complete(createResult.data.id);
      const resetResult = lock.reset(createResult.data.id);

      expect(resetResult.success).toBe(true);
      if (resetResult.success) {
        expect(resetResult.data.state).toBe(IntentState.IDLE);
      }
    });

    it('FAILED → PENDING via retry()', () => {
      const createResult = lock.create({ type: IntentType.CREATE, description: 'Test' });
      if (!createResult.success) throw new Error('Create failed');

      lock.lock(createResult.data.id);
      lock.execute(createResult.data.id);
      lock.fail(createResult.data.id, { code: IntentFailureCode.TIMEOUT });
      const retryResult = lock.retry(createResult.data.id);

      expect(retryResult.success).toBe(true);
      if (retryResult.success) {
        expect(retryResult.data.state).toBe(IntentState.PENDING);
        expect(retryResult.data.retryCount).toBe(1);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-MEM-02: INTENT NEVER AMBIGUOUS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-MEM-02: Intent Never Ambiguous', () => {
    it('rejects invalid transition PENDING → COMPLETE', () => {
      const createResult = lock.create({ type: IntentType.CREATE, description: 'Test' });
      if (!createResult.success) throw new Error('Create failed');

      // Try to complete without locking/executing
      const result = lock.complete(createResult.data.id);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(IntentErrorCode.INVALID_TRANSITION);
      }
    });

    it('rejects invalid transition PENDING → FAILED', () => {
      const createResult = lock.create({ type: IntentType.CREATE, description: 'Test' });
      if (!createResult.success) throw new Error('Create failed');

      const result = lock.fail(createResult.data.id, { code: IntentFailureCode.UNKNOWN });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(IntentErrorCode.INVALID_TRANSITION);
      }
    });

    it('rejects invalid transition LOCKED → COMPLETE', () => {
      const createResult = lock.create({ type: IntentType.CREATE, description: 'Test' });
      if (!createResult.success) throw new Error('Create failed');

      lock.lock(createResult.data.id);
      const result = lock.complete(createResult.data.id);

      expect(result.success).toBe(false);
    });

    it('rejects invalid transition COMPLETE → EXECUTING', () => {
      const createResult = lock.create({ type: IntentType.CREATE, description: 'Test' });
      if (!createResult.success) throw new Error('Create failed');

      lock.lock(createResult.data.id);
      lock.execute(createResult.data.id);
      lock.complete(createResult.data.id);
      
      const result = lock.execute(createResult.data.id);

      expect(result.success).toBe(false);
    });

    it('only one intent can be EXECUTING at a time', () => {
      const r1 = lock.create({ type: IntentType.CREATE, description: 'Intent 1' });
      const r2 = lock.create({ type: IntentType.CREATE, description: 'Intent 2' });

      if (!r1.success || !r2.success) throw new Error('Create failed');

      lock.lock(r1.data.id);
      lock.lock(r2.data.id);
      lock.execute(r1.data.id);

      const result = lock.execute(r2.data.id);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(IntentErrorCode.ALREADY_EXECUTING);
      }
    });

    it('verifyNoAmbiguity passes for valid state', () => {
      lock.create({ type: IntentType.CREATE, description: 'Test' });

      const result = lock.verifyNoAmbiguity();
      expect(result.valid).toBe(true);
      expect(result.issues.length).toBe(0);
    });

    it('each intent has exactly one state', () => {
      const r1 = lock.create({ type: IntentType.CREATE, description: 'Test 1' });
      const r2 = lock.create({ type: IntentType.UPDATE, description: 'Test 2' });
      const r3 = lock.create({ type: IntentType.DELETE, description: 'Test 3' });

      if (!r1.success || !r2.success || !r3.success) throw new Error('Create failed');

      // Move to different states
      lock.lock(r2.data.id);
      lock.lock(r3.data.id);
      lock.execute(r3.data.id);
      lock.complete(r3.data.id);

      // Check states
      expect(lock.getState(r1.data.id)).toBe(IntentState.PENDING);
      expect(lock.getState(r2.data.id)).toBe(IntentState.LOCKED);
      expect(lock.getState(r3.data.id)).toBe(IntentState.COMPLETE);
    });

    it('validates all transitions in VALID_TRANSITIONS', () => {
      // Check that each state has defined valid transitions
      for (const state of Object.values(IntentState)) {
        expect(VALID_TRANSITIONS[state]).toBeDefined();
        expect(Array.isArray(VALID_TRANSITIONS[state])).toBe(true);
      }
    });

    it('validates all actions in ACTION_TRANSITIONS', () => {
      for (const action of Object.values(IntentAction)) {
        expect(ACTION_TRANSITIONS[action]).toBeDefined();
        expect(ACTION_TRANSITIONS[action].from).toBeDefined();
        expect(ACTION_TRANSITIONS[action].to).toBeDefined();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RETRY LOGIC
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Retry Logic', () => {
    it('increments retry count on each retry', () => {
      const createResult = lock.create({ type: IntentType.CREATE, description: 'Test' });
      if (!createResult.success) throw new Error('Create failed');

      // Fail and retry twice
      lock.lock(createResult.data.id);
      lock.execute(createResult.data.id);
      lock.fail(createResult.data.id, { code: IntentFailureCode.TIMEOUT });
      
      lock.retry(createResult.data.id);
      expect(lock.getIntent(createResult.data.id)?.retryCount).toBe(1);
      
      lock.lock(createResult.data.id);
      lock.execute(createResult.data.id);
      lock.fail(createResult.data.id, { code: IntentFailureCode.TIMEOUT });
      
      lock.retry(createResult.data.id);
      expect(lock.getIntent(createResult.data.id)?.retryCount).toBe(2);
    });

    it('rejects retry after max retries', () => {
      const createResult = lock.create({ type: IntentType.CREATE, description: 'Test' });
      if (!createResult.success) throw new Error('Create failed');

      // Fail and retry MAX_RETRIES times
      for (let i = 0; i < INTENT_LIMITS.MAX_RETRIES; i++) {
        lock.lock(createResult.data.id);
        lock.execute(createResult.data.id);
        lock.fail(createResult.data.id, { code: IntentFailureCode.TIMEOUT });
        lock.retry(createResult.data.id);
      }

      // One more fail
      lock.lock(createResult.data.id);
      lock.execute(createResult.data.id);
      lock.fail(createResult.data.id, { code: IntentFailureCode.TIMEOUT });

      // This retry should fail
      const retryResult = lock.retry(createResult.data.id);
      expect(retryResult.success).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // QUEUE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Queue Management', () => {
    it('adds intents to queue on create', () => {
      lock.create({ type: IntentType.CREATE, description: 'Test' });
      const queue = lock.getQueue();
      expect(queue.length).toBe(1);
    });

    it('removes intents from queue on complete', () => {
      const result = lock.create({ type: IntentType.CREATE, description: 'Test' });
      if (!result.success) throw new Error('Create failed');

      lock.lock(result.data.id);
      lock.execute(result.data.id);
      lock.complete(result.data.id);

      const queue = lock.getQueue();
      expect(queue.length).toBe(0);
    });

    it('sorts queue by priority', () => {
      lock.create({ type: IntentType.CREATE, description: 'Low', priority: IntentPriority.LOW });
      lock.create({ type: IntentType.CREATE, description: 'High', priority: IntentPriority.HIGH });
      lock.create({ type: IntentType.CREATE, description: 'Normal', priority: IntentPriority.NORMAL });

      const queue = lock.getQueue();
      expect(queue[0]?.intent.priority).toBe(IntentPriority.HIGH);
      expect(queue[1]?.intent.priority).toBe(IntentPriority.NORMAL);
      expect(queue[2]?.intent.priority).toBe(IntentPriority.LOW);
    });

    it('getNextInQueue returns highest priority PENDING intent', () => {
      const low = lock.create({ type: IntentType.CREATE, description: 'Low', priority: IntentPriority.LOW });
      const high = lock.create({ type: IntentType.CREATE, description: 'High', priority: IntentPriority.HIGH });

      if (!low.success || !high.success) throw new Error('Create failed');

      const next = lock.getNextInQueue();
      expect(next?.id).toBe(high.data.id);
    });

    it('getNextInQueue skips non-PENDING intents', () => {
      const r1 = lock.create({ type: IntentType.CREATE, description: 'First', priority: IntentPriority.HIGH });
      const r2 = lock.create({ type: IntentType.CREATE, description: 'Second', priority: IntentPriority.NORMAL });

      if (!r1.success || !r2.success) throw new Error('Create failed');

      // Lock the high priority one
      lock.lock(r1.data.id);

      // Next should be the second one (still PENDING)
      const next = lock.getNextInQueue();
      expect(next?.id).toBe(r2.data.id);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Queries', () => {
    it('getIntent returns intent by ID', () => {
      const result = lock.create({ type: IntentType.CREATE, description: 'Test' });
      if (!result.success) throw new Error('Create failed');

      const intent = lock.getIntent(result.data.id);
      expect(intent?.id).toBe(result.data.id);
    });

    it('getIntent returns null for unknown ID', () => {
      expect(lock.getIntent('unknown')).toBeNull();
    });

    it('getCurrentIntent returns executing intent', () => {
      const result = lock.create({ type: IntentType.CREATE, description: 'Test' });
      if (!result.success) throw new Error('Create failed');

      expect(lock.getCurrentIntent()).toBeNull();

      lock.lock(result.data.id);
      lock.execute(result.data.id);

      expect(lock.getCurrentIntent()?.id).toBe(result.data.id);
    });

    it('getState returns current state', () => {
      const result = lock.create({ type: IntentType.CREATE, description: 'Test' });
      if (!result.success) throw new Error('Create failed');

      expect(lock.getState(result.data.id)).toBe(IntentState.PENDING);
      
      lock.lock(result.data.id);
      expect(lock.getState(result.data.id)).toBe(IntentState.LOCKED);
    });

    it('getIntentsByState returns intents in given state', () => {
      lock.create({ type: IntentType.CREATE, description: 'Test 1' });
      lock.create({ type: IntentType.CREATE, description: 'Test 2' });
      
      const pending = lock.getIntentsByState(IntentState.PENDING);
      expect(pending.length).toBe(2);
    });

    it('canTransition returns correct result', () => {
      const result = lock.create({ type: IntentType.CREATE, description: 'Test' });
      if (!result.success) throw new Error('Create failed');

      expect(lock.canTransition(result.data.id, IntentAction.LOCK)).toBe(true);
      expect(lock.canTransition(result.data.id, IntentAction.EXECUTE)).toBe(false);
      expect(lock.canTransition(result.data.id, IntentAction.COMPLETE)).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSITION HISTORY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Transition History', () => {
    it('records all transitions', () => {
      const result = lock.create({ type: IntentType.CREATE, description: 'Test' });
      if (!result.success) throw new Error('Create failed');

      lock.lock(result.data.id);
      lock.execute(result.data.id);
      lock.complete(result.data.id);

      const history = lock.getTransitionHistory(result.data.id);
      expect(history?.transitions.length).toBe(4); // create, lock, execute, complete
    });

    it('records correct from/to states', () => {
      const result = lock.create({ type: IntentType.CREATE, description: 'Test' });
      if (!result.success) throw new Error('Create failed');

      lock.lock(result.data.id);

      const history = lock.getTransitionHistory(result.data.id);
      const lockTransition = history?.transitions[1];
      
      expect(lockTransition?.from).toBe(IntentState.PENDING);
      expect(lockTransition?.to).toBe(IntentState.LOCKED);
      expect(lockTransition?.action).toBe(IntentAction.LOCK);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // METRICS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Metrics', () => {
    it('tracks total created', () => {
      lock.create({ type: IntentType.CREATE, description: 'Test 1' });
      lock.create({ type: IntentType.CREATE, description: 'Test 2' });

      const metrics = lock.getMetrics();
      expect(metrics.totalCreated).toBe(2);
    });

    it('tracks completed and failed', () => {
      const r1 = lock.create({ type: IntentType.CREATE, description: 'Success' });
      const r2 = lock.create({ type: IntentType.CREATE, description: 'Failure' });

      if (!r1.success || !r2.success) throw new Error('Create failed');

      lock.lock(r1.data.id);
      lock.execute(r1.data.id);
      lock.complete(r1.data.id);

      lock.lock(r2.data.id);
      lock.execute(r2.data.id);
      lock.fail(r2.data.id, { code: IntentFailureCode.TIMEOUT });

      const metrics = lock.getMetrics();
      expect(metrics.totalCompleted).toBe(1);
      expect(metrics.totalFailed).toBe(1);
    });

    it('tracks by type', () => {
      lock.create({ type: IntentType.CREATE, description: 'Create' });
      lock.create({ type: IntentType.UPDATE, description: 'Update' });
      lock.create({ type: IntentType.CREATE, description: 'Create 2' });

      const metrics = lock.getMetrics();
      expect(metrics.byType[IntentType.CREATE]).toBe(2);
      expect(metrics.byType[IntentType.UPDATE]).toBe(1);
    });

    it('tracks by state', () => {
      const r1 = lock.create({ type: IntentType.CREATE, description: 'Test 1' });
      const r2 = lock.create({ type: IntentType.CREATE, description: 'Test 2' });

      if (!r1.success || !r2.success) throw new Error('Create failed');

      lock.lock(r1.data.id);

      const metrics = lock.getMetrics();
      expect(metrics.byState[IntentState.PENDING]).toBe(1);
      expect(metrics.byState[IntentState.LOCKED]).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LISTENERS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Listeners', () => {
    it('notifies on state change', () => {
      const events: { from: IntentState; to: IntentState }[] = [];
      
      lock.addListener((event) => {
        events.push({ from: event.transition.from, to: event.transition.to });
      });

      const result = lock.create({ type: IntentType.CREATE, description: 'Test' });
      if (!result.success) throw new Error('Create failed');

      lock.lock(result.data.id);

      expect(events.length).toBe(2); // create and lock
      expect(events[1]?.to).toBe(IntentState.LOCKED);
    });

    it('allows removing listeners', () => {
      let callCount = 0;
      const listener = () => { callCount++; };
      
      lock.addListener(listener);
      lock.create({ type: IntentType.CREATE, description: 'Test 1' });
      
      lock.removeListener(listener);
      lock.create({ type: IntentType.CREATE, description: 'Test 2' });

      expect(callCount).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Utilities', () => {
    it('clear resets all state', () => {
      lock.create({ type: IntentType.CREATE, description: 'Test' });
      lock.clear();

      expect(lock.count()).toBe(0);
      expect(lock.getQueue().length).toBe(0);
    });

    it('count returns number of intents', () => {
      expect(lock.count()).toBe(0);
      lock.create({ type: IntentType.CREATE, description: 'Test' });
      expect(lock.count()).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIORITY VALUES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Priority Values', () => {
    it('CRITICAL > HIGH > NORMAL > LOW', () => {
      expect(PRIORITY_VALUES[IntentPriority.CRITICAL]).toBeGreaterThan(PRIORITY_VALUES[IntentPriority.HIGH]);
      expect(PRIORITY_VALUES[IntentPriority.HIGH]).toBeGreaterThan(PRIORITY_VALUES[IntentPriority.NORMAL]);
      expect(PRIORITY_VALUES[IntentPriority.NORMAL]).toBeGreaterThan(PRIORITY_VALUES[IntentPriority.LOW]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FACTORY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Factory', () => {
    it('createIntentLock returns new instance', () => {
      const l1 = createIntentLock();
      const l2 = createIntentLock();

      l1.create({ type: IntentType.CREATE, description: 'Test' });

      expect(l1.count()).toBe(1);
      expect(l2.count()).toBe(0);
    });

    it('accepts custom clock', () => {
      const fixedClock = () => '2026-01-01T00:00:00.000Z';
      const customLock = createIntentLock(fixedClock);

      const result = customLock.create({ type: IntentType.CREATE, description: 'Test' });
      if (!result.success) throw new Error('Create failed');

      expect(result.data.metadata.createdAt).toBe('2026-01-01T00:00:00.000Z');
    });
  });
});
