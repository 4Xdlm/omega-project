/**
 * @fileoverview Regression tests to ensure baseline compatibility.
 * Target: 10 tests
 */

import { describe, it, expect } from 'vitest';
import {
  // Types
  BuildVerdict,
  RuntimeEvent,
  ClassificationResult,
  QueueEntry,
  IncidentEntry,
  TraceEntry,
  ReviewDecision,

  // Factories
  createSentinel,
  createClassifier,
  createEscalationQueue,
  createIncidentLog,
  createDecisionTrace,
  createReviewInterface,
  createDefaultRules,

  // Utilities
  outcomeFromClassification,
  classificationFromOutcome,
  isValidBuildVerdict,
  normalizeScore,
  PRIORITY_LEVELS,
} from '../../src/index.js';

describe('Regression Tests', () => {
  describe('API compatibility', () => {
    it('createSentinel returns expected interface', () => {
      const sentinel = createSentinel();

      expect(typeof sentinel.observeVerdict).toBe('function');
      expect(typeof sentinel.getSnapshot).toBe('function');
      expect(typeof sentinel.getStats).toBe('function');
      expect(typeof sentinel.reset).toBe('function');
    });

    it('createClassifier returns expected interface', () => {
      const classifier = createClassifier();

      expect(typeof classifier.classify).toBe('function');
      expect(typeof classifier.addRule).toBe('function');
      expect(typeof classifier.removeRule).toBe('function');
      expect(typeof classifier.getRules).toBe('function');
      expect(typeof classifier.clearRules).toBe('function');
    });

    it('createEscalationQueue returns expected interface', () => {
      const queue = createEscalationQueue();

      expect(typeof queue.enqueue).toBe('function');
      expect(typeof queue.dequeue).toBe('function');
      expect(typeof queue.peek).toBe('function');
      expect(typeof queue.size).toBe('function');
      expect(typeof queue.isEmpty).toBe('function');
      expect(typeof queue.clear).toBe('function');
      expect(typeof queue.getAll).toBe('function');
    });

    it('createIncidentLog returns expected interface', () => {
      const log = createIncidentLog();

      expect(typeof log.logIncident).toBe('function');
      expect(typeof log.getIncident).toBe('function');
      expect(typeof log.getIncidents).toBe('function');
      expect(typeof log.count).toBe('function');
      expect(typeof log.getAll).toBe('function');
      expect(typeof log.verifyIntegrity).toBe('function');
    });

    it('createDecisionTrace returns expected interface', () => {
      const trace = createDecisionTrace();

      expect(typeof trace.trace).toBe('function');
      expect(typeof trace.getTrace).toBe('function');
      expect(typeof trace.getTraces).toBe('function');
      expect(typeof trace.exportTraces).toBe('function');
      expect(typeof trace.getAll).toBe('function');
      expect(typeof trace.verifyChain).toBe('function');
      expect(typeof trace.size).toBe('function');
    });

    it('createReviewInterface returns expected interface', () => {
      const queue = createEscalationQueue();
      const review = createReviewInterface({ queue });

      expect(typeof review.approve).toBe('function');
      expect(typeof review.reject).toBe('function');
      expect(typeof review.defer).toBe('function');
      expect(typeof review.getPendingReviews).toBe('function');
      expect(typeof review.getReviewHistory).toBe('function');
      expect(typeof review.getAllDecisions).toBe('function');
      expect(typeof review.verifyDecision).toBe('function');
    });
  });

  describe('Type structure', () => {
    it('BuildVerdict has required fields', () => {
      const verdict: BuildVerdict = {
        id: 'v-1',
        timestamp: 1000,
        source: 'ORACLE',
        verdict: 'ACCEPT',
        payload: {},
        hash: 'hash',
      };

      expect(isValidBuildVerdict(verdict)).toBe(true);
    });

    it('RuntimeEvent has required fields', () => {
      const sentinel = createSentinel();
      const verdict: BuildVerdict = {
        id: 'v-1',
        timestamp: 1000,
        source: 'ORACLE',
        verdict: 'ACCEPT',
        payload: {},
        hash: 'hash',
      };

      const event = sentinel.observeVerdict(verdict);

      expect(event.id).toBeDefined();
      expect(event.timestamp).toBeDefined();
      expect(event.type).toBe('VERDICT_OBSERVED');
      expect(event.verdict).toBeDefined();
      expect(event.metadata).toBeDefined();
      expect(event.metadata.observedAt).toBeDefined();
      expect(event.metadata.hash).toBeDefined();
    });

    it('ClassificationResult has required fields', () => {
      const sentinel = createSentinel();
      const classifier = createClassifier({ rules: createDefaultRules() });

      const verdict: BuildVerdict = {
        id: 'v-1',
        timestamp: 1000,
        source: 'ORACLE',
        verdict: 'ACCEPT',
        payload: {},
        hash: 'hash',
      };

      const event = sentinel.observeVerdict(verdict);
      const result = classifier.classify(event);

      expect(result.event).toBeDefined();
      expect(result.classification).toBeDefined();
      expect(result.score).toBeDefined();
      expect(result.matchedRules).toBeDefined();
      expect(result.reasoning).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('Utility functions', () => {
    it('outcomeFromClassification maps correctly', () => {
      expect(outcomeFromClassification('ACCEPT')).toBe('ACCEPTED');
      expect(outcomeFromClassification('ALERT')).toBe('ALERTED');
      expect(outcomeFromClassification('BLOCK')).toBe('BLOCKED');
    });

    it('classificationFromOutcome maps correctly', () => {
      expect(classificationFromOutcome('ACCEPTED')).toBe('ACCEPT');
      expect(classificationFromOutcome('ALERTED')).toBe('ALERT');
      expect(classificationFromOutcome('BLOCKED')).toBe('BLOCK');
    });

    it('normalizeScore clamps values', () => {
      expect(normalizeScore(-1)).toBe(0);
      expect(normalizeScore(2)).toBe(1);
      expect(normalizeScore(0.5)).toBe(0.5);
    });

    it('PRIORITY_LEVELS has expected values', () => {
      expect(PRIORITY_LEVELS.CRITICAL).toBe(100);
      expect(PRIORITY_LEVELS.HIGH).toBe(75);
      expect(PRIORITY_LEVELS.MEDIUM).toBe(50);
      expect(PRIORITY_LEVELS.LOW).toBe(25);
      expect(PRIORITY_LEVELS.MINIMAL).toBe(0);
    });
  });

  describe('Default rules', () => {
    it('createDefaultRules returns non-empty array', () => {
      const rules = createDefaultRules();
      expect(rules.length).toBeGreaterThan(0);
    });

    it('default rules classify REJECT as BLOCK', () => {
      const sentinel = createSentinel();
      const classifier = createClassifier({ rules: createDefaultRules() });

      const verdict: BuildVerdict = {
        id: 'v-1',
        timestamp: 1000,
        source: 'ORACLE',
        verdict: 'REJECT',
        payload: {},
        hash: 'hash',
      };

      const event = sentinel.observeVerdict(verdict);
      const result = classifier.classify(event);

      expect(result.classification).toBe('BLOCK');
    });

    it('default rules classify ACCEPT as ACCEPT', () => {
      const sentinel = createSentinel();
      const classifier = createClassifier({ rules: createDefaultRules() });

      const verdict: BuildVerdict = {
        id: 'v-1',
        timestamp: 1000,
        source: 'ORACLE',
        verdict: 'ACCEPT',
        payload: {},
        hash: 'hash',
      };

      const event = sentinel.observeVerdict(verdict);
      const result = classifier.classify(event);

      expect(result.classification).toBe('ACCEPT');
    });
  });
});
