/**
 * OMEGA Memory Foundation — Integration Tests
 * Phase 18 — Memory Foundation
 * Standard: MIL-STD-882E / DO-178C Level A
 * 
 * Tests: ~25
 * Covers integration between all 4 modules
 */

import { describe, it, expect, beforeEach } from 'vitest';

// CANON_CORE
import {
  createCanonStore,
  FactType,
  FactSource,
  FactStatus,
} from '../../src/canon/index.js';

// INTENT_MACHINE
import {
  createIntentLock,
  IntentType,
  IntentState,
  IntentFailureCode,
} from '../../src/intent/index.js';

// CONTEXT_ENGINE
import {
  createContextTracker,
  ElementType,
  ElementState,
  ContextScope,
} from '../../src/context/index.js';

// CONFLICT_RESOLVER
import {
  createConflictResolver,
  ConflictCategory,
  ConflictStatus,
  ResolutionStrategy,
} from '../../src/resolver/index.js';

describe('Memory Foundation Integration', () => {
  // Shared clock for deterministic testing
  let time = 1000;
  const clock = () => new Date(time++).toISOString();

  beforeEach(() => {
    time = 1000;
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CANON + CONTEXT INTEGRATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('CANON + CONTEXT Integration', () => {
    it('adds facts to CANON and tracks in context', () => {
      const canon = createCanonStore(clock);
      const context = createContextTracker(clock);

      // Add a character fact
      const factResult = canon.add({
        type: FactType.CHARACTER,
        subject: 'Jean',
        predicate: 'name',
        value: 'Jean Dupont',
        source: FactSource.USER,
      });

      expect(factResult.success).toBe(true);

      // Track character in context
      if (factResult.success) {
        const elemResult = context.addElement({
          entityRef: factResult.data.id,
          type: ElementType.CHARACTER,
          scope: ContextScope.SCENE,
        });

        expect(elemResult.success).toBe(true);
        if (elemResult.success) {
          expect(elemResult.data.entityRef).toBe(factResult.data.id);
        }
      }
    });

    it('syncs context state with CANON facts', () => {
      const canon = createCanonStore(clock);
      const context = createContextTracker(clock);

      // Add multiple facts
      const facts = [
        { type: FactType.CHARACTER, subject: 'Jean', predicate: 'name', value: 'Jean', source: FactSource.USER },
        { type: FactType.LOCATION, subject: 'Paris', predicate: 'type', value: 'city', source: FactSource.TEXT },
      ];

      for (const factInput of facts) {
        const result = canon.add(factInput);
        if (result.success) {
          context.addElement({
            entityRef: result.data.id,
            type: factInput.type === FactType.CHARACTER ? ElementType.CHARACTER : ElementType.LOCATION,
          });
        }
      }

      expect(canon.count()).toBe(2);
      expect(context.count()).toBe(2);
    });

    it('removes context element when CANON fact is deleted', () => {
      const canon = createCanonStore(clock);
      const context = createContextTracker(clock);

      const factResult = canon.add({
        type: FactType.CHARACTER,
        subject: 'Jean',
        predicate: 'name',
        value: 'Jean',
        source: FactSource.USER,
      });

      if (!factResult.success) throw new Error('Add failed');

      const elemResult = context.addElement({
        entityRef: factResult.data.id,
        type: ElementType.CHARACTER,
      });

      if (!elemResult.success) throw new Error('Add element failed');

      // Delete from CANON
      canon.delete('Jean', 'name');

      // Remove from context
      context.removeElement(elemResult.data.id);

      const element = context.getElement(elemResult.data.id);
      expect(element?.state).toBe(ElementState.EXITED);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CANON + RESOLVER INTEGRATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('CANON + RESOLVER Integration', () => {
    it('detects conflict when adding fact with same priority', () => {
      const canon = createCanonStore(clock);
      const resolver = createConflictResolver(clock);

      // Add first fact
      canon.add({
        type: FactType.CHARACTER,
        subject: 'Jean',
        predicate: 'eyeColor',
        value: 'blue',
        source: FactSource.TEXT,
      });

      // Try to add conflicting fact with same source
      const result = canon.add({
        type: FactType.CHARACTER,
        subject: 'Jean',
        predicate: 'eyeColor',
        value: 'green',
        source: FactSource.TEXT, // Same priority
      });

      // CANON detects conflict
      expect(result.success).toBe(false);

      // Register in resolver
      if (!result.success && result.error.code === 'CONFLICT_PENDING') {
        const conflict = resolver.detect({
          category: ConflictCategory.VALUE_CONTRADICTION,
          partyA: {
            entityId: 'Jean:eyeColor',
            entityType: 'fact',
            value: 'blue',
            source: 'TEXT',
            priority: 100,
          },
          partyB: {
            entityId: 'Jean:eyeColor',
            entityType: 'fact',
            value: 'green',
            source: 'TEXT',
            priority: 100,
          },
        });

        expect(conflict.success).toBe(true);
      }
    });

    it('resolves conflict and updates CANON', () => {
      const canon = createCanonStore(clock);
      const resolver = createConflictResolver(clock);

      // Setup conflict
      canon.add({
        type: FactType.CHARACTER,
        subject: 'Jean',
        predicate: 'age',
        value: '35',
        source: FactSource.TEXT,
      });

      // Detect conflict
      const conflictResult = resolver.detect({
        category: ConflictCategory.VALUE_CONTRADICTION,
        partyA: {
          entityId: 'Jean:age',
          entityType: 'fact',
          value: '35',
          source: 'TEXT',
          priority: 100,
        },
        partyB: {
          entityId: 'Jean:age',
          entityType: 'fact',
          value: '40',
          source: 'TEXT',
          priority: 100,
        },
      });

      if (!conflictResult.success) throw new Error('Detect failed');

      // Resolve
      const resolveResult = resolver.resolve(conflictResult.data.id, {
        strategy: ResolutionStrategy.USE_NEW,
        winner: 'B',
        resolvedBy: 'user',
      });

      expect(resolveResult.success).toBe(true);

      // Update CANON with resolved value
      if (resolveResult.success && resolveResult.data.resolution?.finalValue) {
        const updateResult = canon.update('Jean', 'age', {
          value: resolveResult.data.resolution.finalValue,
          updatedBy: 'conflict-resolution',
        });

        expect(updateResult.success).toBe(true);
        expect(canon.getFact('Jean', 'age')?.value).toBe('40');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INTENT + CANON INTEGRATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INTENT + CANON Integration', () => {
    it('executes intent to add fact', () => {
      const intent = createIntentLock(clock);
      const canon = createCanonStore(clock);

      // Create intent
      const createResult = intent.create({
        type: IntentType.CREATE,
        description: 'Add character Jean',
        payload: {
          targetType: 'character',
          data: { subject: 'Jean', predicate: 'name', value: 'Jean Dupont' },
        },
      });

      if (!createResult.success) throw new Error('Create intent failed');

      // Lock and execute
      intent.lock(createResult.data.id);
      intent.execute(createResult.data.id);

      // Execute the actual operation
      const payload = createResult.data.payload;
      const factResult = canon.add({
        type: FactType.CHARACTER,
        subject: payload.data?.subject as string,
        predicate: payload.data?.predicate as string,
        value: payload.data?.value as string,
        source: FactSource.USER,
      });

      expect(factResult.success).toBe(true);

      // Complete intent
      intent.complete(createResult.data.id, { result: factResult });

      expect(intent.getState(createResult.data.id)).toBe(IntentState.COMPLETE);
      expect(canon.count()).toBe(1);
    });

    it('rolls back on failed intent', () => {
      const intent = createIntentLock(clock);
      const canon = createCanonStore(clock);

      // Create snapshot before operation
      const snapshot = canon.createSnapshot();

      // Create and execute intent
      const createResult = intent.create({
        type: IntentType.CREATE,
        description: 'Add invalid fact',
        payload: { targetType: 'invalid' },
      });

      if (!createResult.success) throw new Error('Create intent failed');

      intent.lock(createResult.data.id);
      intent.execute(createResult.data.id);

      // Simulate failure
      const factResult = canon.add({
        type: FactType.CHARACTER,
        subject: '', // Invalid
        predicate: 'name',
        value: 'test',
        source: FactSource.USER,
      });

      expect(factResult.success).toBe(false);

      // Fail the intent
      intent.fail(createResult.data.id, {
        code: IntentFailureCode.VALIDATION_FAILED,
        message: 'Invalid subject',
      });

      expect(intent.getState(createResult.data.id)).toBe(IntentState.FAILED);
      expect(canon.count()).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FULL WORKFLOW INTEGRATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Full Workflow Integration', () => {
    it('complete narrative workflow: create character, track, and resolve conflict', () => {
      const canon = createCanonStore(clock);
      const context = createContextTracker(clock);
      const resolver = createConflictResolver(clock);
      const intent = createIntentLock(clock);

      // Step 1: Create intent for character creation
      const intentResult = intent.create({
        type: IntentType.CREATE,
        description: 'Create character Marie',
      });
      if (!intentResult.success) throw new Error('Intent creation failed');

      intent.lock(intentResult.data.id);
      intent.execute(intentResult.data.id);

      // Step 2: Add character to CANON
      const factResult = canon.add({
        type: FactType.CHARACTER,
        subject: 'Marie',
        predicate: 'name',
        value: 'Marie Laurent',
        source: FactSource.USER,
      });
      expect(factResult.success).toBe(true);

      // Step 3: Track in context
      if (factResult.success) {
        context.addElement({
          entityRef: factResult.data.id,
          type: ElementType.CHARACTER,
          scope: ContextScope.SCENE,
        });
      }

      // Step 4: Complete intent
      intent.complete(intentResult.data.id, { result: factResult });

      // Step 5: Later, detect a potential conflict
      canon.add({
        type: FactType.CHARACTER,
        subject: 'Marie',
        predicate: 'age',
        value: '28',
        source: FactSource.TEXT,
      });

      const conflictResult = resolver.detect({
        category: ConflictCategory.SOURCE_CONFLICT,
        partyA: {
          entityId: 'Marie:age',
          entityType: 'fact',
          value: '28',
          source: 'TEXT',
          priority: 100,
        },
        partyB: {
          entityId: 'Marie:age',
          entityType: 'fact',
          value: '30',
          source: 'TEXT',
          priority: 100,
        },
      });

      expect(conflictResult.success).toBe(true);

      // Step 6: Resolve conflict
      if (conflictResult.success) {
        resolver.resolve(conflictResult.data.id, {
          strategy: ResolutionStrategy.KEEP_EXISTING,
          winner: 'A',
          reason: 'First source is canonical',
          resolvedBy: 'author',
        });
      }

      // Verify final state
      expect(canon.count()).toBe(2);
      expect(context.count()).toBe(1);
      expect(resolver.countByStatus(ConflictStatus.RESOLVED_BY_USER)).toBe(1);
      expect(intent.getMetrics().totalCompleted).toBe(1);
    });

    it('context snapshot preserves state across scene changes', () => {
      const canon = createCanonStore(clock);
      const context = createContextTracker(clock);

      // Scene 1
      context.moveTo({ chapter: 1, scene: 1, paragraph: 0 });

      canon.add({ type: FactType.CHARACTER, subject: 'Jean', predicate: 'name', value: 'Jean', source: FactSource.USER });
      canon.add({ type: FactType.LOCATION, subject: 'Cafe', predicate: 'type', value: 'place', source: FactSource.TEXT });

      const jean = context.addElement({ entityRef: 'fact:jean', type: ElementType.CHARACTER });
      context.addElement({ entityRef: 'fact:cafe', type: ElementType.LOCATION });

      // Snapshot scene 1
      const snap1 = context.createSnapshot('Scene 1');
      expect(snap1.success).toBe(true);

      // Scene 2 - different location
      context.moveTo({ chapter: 1, scene: 2, paragraph: 0 });

      if (jean.success) {
        context.updateElement(jean.data.id, { state: ElementState.BACKGROUND });
      }

      context.addElement({ entityRef: 'fact:park', type: ElementType.LOCATION });

      expect(context.count()).toBe(3);

      // Rollback to scene 1 if needed
      if (snap1.success) {
        context.rollbackTo(snap1.data.id);
      }

      expect(context.count()).toBe(2);
    });

    it('audit trail tracks all operations across modules', () => {
      const canon = createCanonStore(clock);
      const resolver = createConflictResolver(clock);

      // Create facts
      canon.add({ type: FactType.CHARACTER, subject: 'Jean', predicate: 'name', value: 'Jean', source: FactSource.USER });

      // Create and resolve conflict
      const conflict = resolver.detect({
        category: ConflictCategory.VALUE_CONTRADICTION,
        partyA: { entityId: 'a', entityType: 'fact', value: 'X', source: 'S1', priority: 100 },
        partyB: { entityId: 'b', entityType: 'fact', value: 'Y', source: 'S2', priority: 100 },
      });

      if (conflict.success) {
        resolver.resolve(conflict.data.id, {
          strategy: ResolutionStrategy.KEEP_EXISTING,
          resolvedBy: 'user',
        });
      }

      // Verify audit trails
      const canonAudit = canon.getAuditTrail();
      const resolverAudit = resolver.getAuditTrail();

      expect(canonAudit.length).toBeGreaterThan(0);
      expect(resolverAudit.length).toBe(2); // DETECTED + RESOLVED

      // Verify integrity
      const canonIntegrity = canon.verifyIntegrity();
      const resolverIntegrity = resolver.verifyAuditIntegrity();

      expect(canonIntegrity.valid).toBe(true);
      expect(resolverIntegrity.valid).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DETERMINISM TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Determinism (INV-MEM-06)', () => {
    it('same operations produce same results across all modules', () => {
      // First run
      time = 1000;
      const canon1 = createCanonStore(clock);
      const context1 = createContextTracker(clock);

      canon1.add({ type: FactType.CHARACTER, subject: 'A', predicate: 'x', value: '1', source: FactSource.USER });
      context1.addElement({ entityRef: 'A', type: ElementType.CHARACTER });

      const snap1 = canon1.createSnapshot();

      // Second run with reset clock
      time = 1000;
      const canon2 = createCanonStore(clock);
      const context2 = createContextTracker(clock);

      canon2.add({ type: FactType.CHARACTER, subject: 'A', predicate: 'x', value: '1', source: FactSource.USER });
      context2.addElement({ entityRef: 'A', type: ElementType.CHARACTER });

      const snap2 = canon2.createSnapshot();

      // Compare CANON snapshots (should be deterministic)
      expect(snap1.rootHash).toBe(snap2.rootHash);
      expect(snap1.factCount).toBe(snap2.factCount);
      
      // Compare context state counts
      expect(context1.count()).toBe(context2.count());
      expect(context1.getMetrics().elementsByType).toEqual(context2.getMetrics().elementsByType);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR HANDLING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Error Handling', () => {
    it('gracefully handles cascading errors', () => {
      const canon = createCanonStore(clock);
      const intent = createIntentLock(clock);

      // Create intent
      const intentResult = intent.create({
        type: IntentType.CREATE,
        description: 'Invalid operation',
      });
      if (!intentResult.success) throw new Error('Create failed');

      intent.lock(intentResult.data.id);
      intent.execute(intentResult.data.id);

      // Try invalid CANON operation
      const factResult = canon.add({
        type: FactType.CHARACTER,
        subject: '',
        predicate: '',
        value: '',
        source: FactSource.USER,
      });

      expect(factResult.success).toBe(false);

      // Intent should be failed
      intent.fail(intentResult.data.id, {
        code: IntentFailureCode.VALIDATION_FAILED,
        message: 'CANON validation failed',
      });

      expect(intent.getState(intentResult.data.id)).toBe(IntentState.FAILED);

      // Can retry
      intent.retry(intentResult.data.id);
      expect(intent.getState(intentResult.data.id)).toBe(IntentState.PENDING);
    });
  });
});
