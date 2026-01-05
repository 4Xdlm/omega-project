/**
 * OMEGA CONTEXT_ENGINE — Unit Tests
 * Phase 18 — Memory Foundation
 * Standard: MIL-STD-882E / DO-178C Level A
 * 
 * Tests: ~55
 * Invariants covered:
 * - INV-MEM-03: Contexte jamais perdu
 * - INV-MEM-06: Déterminisme total
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ContextTracker,
  createContextTracker,
  ContextScope,
  ElementType,
  ElementState,
  ContextAction,
  CONTEXT_LIMITS,
  DEFAULT_WEIGHTS,
  DECAY_RATES,
  ContextErrorCode,
  comparePositions,
} from '../../src/context/index.js';

describe('CONTEXT_ENGINE', () => {
  let tracker: ContextTracker;

  beforeEach(() => {
    tracker = createContextTracker();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POSITION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Position Management', () => {
    it('starts at paragraph 0', () => {
      const pos = tracker.getPosition();
      expect(pos.paragraph).toBe(0);
    });

    it('moveTo updates position', () => {
      const result = tracker.moveTo({ paragraph: 5, chapter: 1 });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.paragraph).toBe(5);
        expect(result.data.chapter).toBe(1);
      }
    });

    it('advance increments paragraph', () => {
      tracker.moveTo({ paragraph: 10 });
      const result = tracker.advance();
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.paragraph).toBe(11);
      }
    });

    it('rejects negative paragraph', () => {
      const result = tracker.moveTo({ paragraph: -1 });
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(ContextErrorCode.INVALID_POSITION);
      }
    });

    it('rejects negative chapter', () => {
      const result = tracker.moveTo({ paragraph: 0, chapter: -1 });
      
      expect(result.success).toBe(false);
    });

    it('preserves all position fields', () => {
      const fullPos = {
        part: 1,
        chapter: 2,
        scene: 3,
        paragraph: 4,
        sentence: 5,
      };
      
      tracker.moveTo(fullPos);
      const pos = tracker.getPosition();
      
      expect(pos.part).toBe(1);
      expect(pos.chapter).toBe(2);
      expect(pos.scene).toBe(3);
      expect(pos.paragraph).toBe(4);
      expect(pos.sentence).toBe(5);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ELEMENT MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Element Management', () => {
    it('addElement creates new element', () => {
      const result = tracker.addElement({
        entityRef: 'character:jean',
        type: ElementType.CHARACTER,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.entityRef).toBe('character:jean');
        expect(result.data.type).toBe(ElementType.CHARACTER);
        expect(result.data.state).toBe(ElementState.ACTIVE);
      }
    });

    it('sets default weight based on state', () => {
      const result = tracker.addElement({
        entityRef: 'location:paris',
        type: ElementType.LOCATION,
        state: ElementState.BACKGROUND,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.weight).toBe(DEFAULT_WEIGHTS[ElementState.BACKGROUND]);
      }
    });

    it('allows custom weight', () => {
      const result = tracker.addElement({
        entityRef: 'object:sword',
        type: ElementType.OBJECT,
        weight: 0.75,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.weight).toBe(0.75);
      }
    });

    it('records entry position', () => {
      tracker.moveTo({ paragraph: 10, chapter: 2 });
      
      const result = tracker.addElement({
        entityRef: 'event:battle',
        type: ElementType.EVENT,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.enteredAt.paragraph).toBe(10);
        expect(result.data.enteredAt.chapter).toBe(2);
      }
    });

    it('updates existing element instead of duplicating', () => {
      tracker.addElement({
        entityRef: 'character:jean',
        type: ElementType.CHARACTER,
        state: ElementState.BACKGROUND,
      });

      const result = tracker.addElement({
        entityRef: 'character:jean',
        type: ElementType.CHARACTER,
        state: ElementState.ACTIVE,
      });

      expect(result.success).toBe(true);
      expect(tracker.count()).toBe(1);
      if (result.success) {
        expect(result.data.state).toBe(ElementState.ACTIVE);
      }
    });

    it('getElement returns element by ID', () => {
      const addResult = tracker.addElement({
        entityRef: 'character:marie',
        type: ElementType.CHARACTER,
      });

      if (!addResult.success) throw new Error('Add failed');

      const element = tracker.getElement(addResult.data.id);
      expect(element?.entityRef).toBe('character:marie');
    });

    it('getByEntityRef returns element by ref', () => {
      tracker.addElement({
        entityRef: 'location:london',
        type: ElementType.LOCATION,
      });

      const element = tracker.getByEntityRef('location:london');
      expect(element?.type).toBe(ElementType.LOCATION);
    });

    it('updateElement modifies element', () => {
      const addResult = tracker.addElement({
        entityRef: 'character:paul',
        type: ElementType.CHARACTER,
      });

      if (!addResult.success) throw new Error('Add failed');

      const updateResult = tracker.updateElement(addResult.data.id, {
        state: ElementState.BACKGROUND,
        weight: 0.3,
      });

      expect(updateResult.success).toBe(true);
      if (updateResult.success) {
        expect(updateResult.data.state).toBe(ElementState.BACKGROUND);
        expect(updateResult.data.weight).toBe(0.3);
      }
    });

    it('removeElement sets EXITED state', () => {
      const addResult = tracker.addElement({
        entityRef: 'object:key',
        type: ElementType.OBJECT,
      });

      if (!addResult.success) throw new Error('Add failed');

      const removeResult = tracker.removeElement(addResult.data.id);

      expect(removeResult.success).toBe(true);
      if (removeResult.success) {
        expect(removeResult.data.state).toBe(ElementState.EXITED);
        expect(removeResult.data.weight).toBe(0);
      }
    });

    it('enforces max elements per scope', () => {
      // Add max elements
      for (let i = 0; i < CONTEXT_LIMITS.MAX_ACTIVE_ELEMENTS_PER_SCOPE; i++) {
        tracker.addElement({
          entityRef: `char:${i}`,
          type: ElementType.CHARACTER,
          scope: ContextScope.LOCAL,
        });
      }

      // One more should fail
      const result = tracker.addElement({
        entityRef: 'char:overflow',
        type: ElementType.CHARACTER,
        scope: ContextScope.LOCAL,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(ContextErrorCode.MAX_ELEMENTS_EXCEEDED);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Queries', () => {
    beforeEach(() => {
      tracker.addElement({ entityRef: 'char:a', type: ElementType.CHARACTER, state: ElementState.ACTIVE });
      tracker.addElement({ entityRef: 'char:b', type: ElementType.CHARACTER, state: ElementState.BACKGROUND });
      tracker.addElement({ entityRef: 'loc:x', type: ElementType.LOCATION, state: ElementState.ACTIVE });
    });

    it('queryElements filters by type', () => {
      const results = tracker.queryElements({ type: ElementType.CHARACTER });
      expect(results.length).toBe(2);
    });

    it('queryElements filters by state', () => {
      const results = tracker.queryElements({ state: ElementState.ACTIVE });
      expect(results.length).toBe(2);
    });

    it('queryElements filters by minWeight', () => {
      const results = tracker.queryElements({ minWeight: 0.6 });
      expect(results.length).toBe(2); // Active elements have weight 1.0
    });

    it('queryElements applies limit', () => {
      const results = tracker.queryElements({ limit: 1 });
      expect(results.length).toBe(1);
    });

    it('queryElements sorts by weight descending', () => {
      const results = tracker.queryElements({});
      expect(results[0]?.weight).toBeGreaterThanOrEqual(results[1]?.weight ?? 0);
    });

    it('getActiveElements returns only active', () => {
      const active = tracker.getActiveElements();
      expect(active.length).toBe(2);
      for (const elem of active) {
        expect(elem.state).toBe(ElementState.ACTIVE);
      }
    });

    it('getElementsByScope filters by scope', () => {
      tracker.addElement({
        entityRef: 'global:theme',
        type: ElementType.CONCEPT,
        scope: ContextScope.GLOBAL,
      });

      const global = tracker.getElementsByScope(ContextScope.GLOBAL);
      expect(global.length).toBe(1);
      expect(global[0]?.entityRef).toBe('global:theme');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-MEM-03: CONTEXT NEVER LOST
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-MEM-03: Context Never Lost', () => {
    it('createSnapshot captures current state', () => {
      tracker.moveTo({ paragraph: 10 });
      tracker.addElement({ entityRef: 'char:test', type: ElementType.CHARACTER });

      const result = tracker.createSnapshot('test-snapshot');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.position.paragraph).toBe(10);
        expect(result.data.elements.length).toBe(1);
        expect(result.data.label).toBe('test-snapshot');
        expect(result.data.hash.length).toBe(64);
      }
    });

    it('rollbackTo restores from snapshot', () => {
      tracker.addElement({ entityRef: 'char:original', type: ElementType.CHARACTER });
      
      const snapResult = tracker.createSnapshot();
      if (!snapResult.success) throw new Error('Snapshot failed');

      // Make changes
      tracker.moveTo({ paragraph: 100 });
      tracker.addElement({ entityRef: 'char:new', type: ElementType.CHARACTER });

      // Rollback
      const rollbackResult = tracker.rollbackTo(snapResult.data.id);

      expect(rollbackResult.success).toBe(true);
      expect(tracker.getPosition().paragraph).toBe(0);
      expect(tracker.count()).toBe(1);
      expect(tracker.getByEntityRef('char:original')).not.toBeNull();
      expect(tracker.getByEntityRef('char:new')).toBeNull();
    });

    it('listSnapshots returns all snapshots', () => {
      tracker.createSnapshot('snap1');
      tracker.createSnapshot('snap2');
      tracker.createSnapshot('snap3');

      const snapshots = tracker.listSnapshots();
      expect(snapshots.length).toBe(3);
    });

    it('getSnapshot returns by ID', () => {
      const result = tracker.createSnapshot('findme');
      if (!result.success) throw new Error('Snapshot failed');

      const found = tracker.getSnapshot(result.data.id);
      expect(found?.label).toBe('findme');
    });

    it('enforces max snapshots', () => {
      for (let i = 0; i < CONTEXT_LIMITS.MAX_SNAPSHOTS; i++) {
        tracker.createSnapshot(`snap${i}`);
      }

      const result = tracker.createSnapshot('overflow');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(ContextErrorCode.MAX_SNAPSHOTS_EXCEEDED);
      }
    });

    it('history records all actions', () => {
      tracker.moveTo({ paragraph: 1 });
      tracker.addElement({ entityRef: 'test', type: ElementType.CHARACTER });
      tracker.createSnapshot();

      const history = tracker.getHistory();
      expect(history.length).toBeGreaterThanOrEqual(3);
      
      const actions = history.map(h => h.action);
      expect(actions).toContain(ContextAction.MOVE);
      expect(actions).toContain(ContextAction.ADD_ELEMENT);
      expect(actions).toContain(ContextAction.SNAPSHOT);
    });

    it('history respects limit', () => {
      const history = tracker.getHistory(2);
      expect(history.length).toBeLessThanOrEqual(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DECAY (INV-MEM-06: Determinism)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Decay', () => {
    it('applies decay on position change', () => {
      const result = tracker.addElement({
        entityRef: 'char:decaying',
        type: ElementType.CHARACTER,
        scope: ContextScope.LOCAL,
        weight: 1.0,
      });

      if (!result.success) throw new Error('Add failed');
      const initialWeight = result.data.weight;

      // Move several paragraphs
      tracker.moveTo({ paragraph: 10 });

      const element = tracker.getElement(result.data.id);
      expect(element?.weight).toBeLessThan(initialWeight);
    });

    it('GLOBAL scope never decays', () => {
      const result = tracker.addElement({
        entityRef: 'theme:main',
        type: ElementType.CONCEPT,
        scope: ContextScope.GLOBAL,
        weight: 1.0,
      });

      if (!result.success) throw new Error('Add failed');

      tracker.moveTo({ paragraph: 100 });

      const element = tracker.getElement(result.data.id);
      expect(element?.weight).toBe(1.0);
    });

    it('LOCAL scope decays fastest', () => {
      tracker.addElement({
        entityRef: 'local:item',
        type: ElementType.OBJECT,
        scope: ContextScope.LOCAL,
        weight: 1.0,
      });

      tracker.addElement({
        entityRef: 'chapter:item',
        type: ElementType.OBJECT,
        scope: ContextScope.CHAPTER,
        weight: 1.0,
      });

      // Small movement to avoid full decay
      tracker.moveTo({ paragraph: 2 });

      const local = tracker.getByEntityRef('local:item');
      const chapter = tracker.getByEntityRef('chapter:item');

      // Local decays faster than chapter (higher decay rate)
      // Both should still exist with local having lower weight
      expect(local).not.toBeNull();
      expect(chapter).not.toBeNull();
      expect(local!.weight).toBeLessThan(chapter!.weight);
    });

    it('transitions to BACKGROUND when weight drops below threshold', () => {
      const result = tracker.addElement({
        entityRef: 'char:fading',
        type: ElementType.CHARACTER,
        scope: ContextScope.LOCAL,
        weight: 0.2,
        state: ElementState.ACTIVE,
      });

      if (!result.success) throw new Error('Add failed');

      // Move enough to trigger decay below threshold
      tracker.moveTo({ paragraph: 10 });

      const element = tracker.getElement(result.data.id);
      expect(element?.state).not.toBe(ElementState.ACTIVE);
    });

    it('reactivate boosts element weight', () => {
      const result = tracker.addElement({
        entityRef: 'char:boost',
        type: ElementType.CHARACTER,
        scope: ContextScope.LOCAL,
        weight: 0.1,
        state: ElementState.BACKGROUND,
      });

      if (!result.success) throw new Error('Add failed');

      const reactivateResult = tracker.reactivate(result.data.id);

      expect(reactivateResult.success).toBe(true);
      if (reactivateResult.success) {
        expect(reactivateResult.data.state).toBe(ElementState.ACTIVE);
        expect(reactivateResult.data.weight).toBe(DEFAULT_WEIGHTS[ElementState.ACTIVE]);
      }
    });

    it('decay is deterministic', () => {
      // Two trackers with same operations should have same result
      const clock1Counter = { value: 0 };
      const clock1 = () => `2026-01-01T00:00:00.${String(clock1Counter.value++).padStart(3, '0')}Z`;
      
      const clock2Counter = { value: 0 };
      const clock2 = () => `2026-01-01T00:00:00.${String(clock2Counter.value++).padStart(3, '0')}Z`;

      const t1 = createContextTracker(clock1);
      const t2 = createContextTracker(clock2);

      // Same operations
      t1.addElement({ entityRef: 'char:test', type: ElementType.CHARACTER, scope: ContextScope.LOCAL, weight: 1.0 });
      t2.addElement({ entityRef: 'char:test', type: ElementType.CHARACTER, scope: ContextScope.LOCAL, weight: 1.0 });

      t1.moveTo({ paragraph: 5 });
      t2.moveTo({ paragraph: 5 });

      const e1 = t1.getByEntityRef('char:test');
      const e2 = t2.getByEntityRef('char:test');

      expect(e1?.weight).toBe(e2?.weight);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('State', () => {
    it('getState returns complete state', () => {
      tracker.moveTo({ paragraph: 5 });
      tracker.addElement({ entityRef: 'test', type: ElementType.CHARACTER });

      const state = tracker.getState();

      expect(state.position.paragraph).toBe(5);
      expect(state.elements.size).toBe(1);
      expect(state.hash.length).toBe(64);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // METRICS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Metrics', () => {
    it('returns accurate metrics', () => {
      tracker.moveTo({ paragraph: 10 });
      tracker.addElement({ entityRef: 'char:a', type: ElementType.CHARACTER, state: ElementState.ACTIVE });
      tracker.addElement({ entityRef: 'char:b', type: ElementType.CHARACTER, state: ElementState.BACKGROUND });
      tracker.addElement({ entityRef: 'loc:x', type: ElementType.LOCATION, state: ElementState.ACTIVE });
      tracker.createSnapshot();

      const metrics = tracker.getMetrics();

      expect(metrics.currentPosition.paragraph).toBe(10);
      expect(metrics.elementsByState[ElementState.ACTIVE]).toBe(2);
      expect(metrics.elementsByState[ElementState.BACKGROUND]).toBe(1);
      expect(metrics.elementsByType[ElementType.CHARACTER]).toBe(2);
      expect(metrics.elementsByType[ElementType.LOCATION]).toBe(1);
      expect(metrics.snapshotCount).toBe(1);
      expect(metrics.avgActiveWeight).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Utilities', () => {
    it('clear resets all state', () => {
      tracker.moveTo({ paragraph: 100 });
      tracker.addElement({ entityRef: 'test', type: ElementType.CHARACTER });
      tracker.createSnapshot();

      tracker.clear();

      expect(tracker.getPosition().paragraph).toBe(0);
      expect(tracker.count()).toBe(0);
      expect(tracker.listSnapshots().length).toBe(0);
    });

    it('count returns element count', () => {
      expect(tracker.count()).toBe(0);
      tracker.addElement({ entityRef: 'a', type: ElementType.CHARACTER });
      expect(tracker.count()).toBe(1);
      tracker.addElement({ entityRef: 'b', type: ElementType.CHARACTER });
      expect(tracker.count()).toBe(2);
    });

    it('hasElement returns correct boolean', () => {
      const result = tracker.addElement({ entityRef: 'test', type: ElementType.CHARACTER });
      if (!result.success) throw new Error('Add failed');

      expect(tracker.hasElement(result.data.id)).toBe(true);
      expect(tracker.hasElement('nonexistent')).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POSITION COMPARISON
  // ═══════════════════════════════════════════════════════════════════════════

  describe('comparePositions', () => {
    it('compares paragraphs correctly', () => {
      expect(comparePositions({ paragraph: 1 }, { paragraph: 2 })).toBeLessThan(0);
      expect(comparePositions({ paragraph: 2 }, { paragraph: 1 })).toBeGreaterThan(0);
      expect(comparePositions({ paragraph: 1 }, { paragraph: 1 })).toBe(0);
    });

    it('compares chapters before paragraphs', () => {
      const a = { chapter: 1, paragraph: 10 };
      const b = { chapter: 2, paragraph: 1 };
      expect(comparePositions(a, b)).toBeLessThan(0);
    });

    it('compares scenes correctly', () => {
      const a = { chapter: 1, scene: 1, paragraph: 1 };
      const b = { chapter: 1, scene: 2, paragraph: 1 };
      expect(comparePositions(a, b)).toBeLessThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FACTORY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Factory', () => {
    it('createContextTracker returns new instance', () => {
      const t1 = createContextTracker();
      const t2 = createContextTracker();

      t1.addElement({ entityRef: 'test', type: ElementType.CHARACTER });

      expect(t1.count()).toBe(1);
      expect(t2.count()).toBe(0);
    });

    it('accepts custom clock', () => {
      const fixedClock = () => '2026-01-01T12:00:00.000Z';
      const customTracker = createContextTracker(fixedClock);

      const result = customTracker.addElement({ entityRef: 'test', type: ElementType.CHARACTER });
      if (!result.success) throw new Error('Add failed');

      expect(result.data.metadata.createdAt).toBe('2026-01-01T12:00:00.000Z');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DECAY RATES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Decay Rates', () => {
    it('GLOBAL has zero decay', () => {
      expect(DECAY_RATES[ContextScope.GLOBAL]).toBe(0);
    });

    it('decay increases from GLOBAL to LOCAL', () => {
      expect(DECAY_RATES[ContextScope.PART]).toBeGreaterThan(DECAY_RATES[ContextScope.GLOBAL]);
      expect(DECAY_RATES[ContextScope.CHAPTER]).toBeGreaterThan(DECAY_RATES[ContextScope.PART]);
      expect(DECAY_RATES[ContextScope.SCENE]).toBeGreaterThan(DECAY_RATES[ContextScope.CHAPTER]);
      expect(DECAY_RATES[ContextScope.LOCAL]).toBeGreaterThan(DECAY_RATES[ContextScope.SCENE]);
    });
  });
});
