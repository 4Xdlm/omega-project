/**
 * OMEGA CONFLICT_RESOLVER — Unit Tests
 * Phase 18 — Memory Foundation
 * Standard: MIL-STD-882E / DO-178C Level A
 * 
 * Tests: ~35
 * Invariants covered:
 * - INV-MEM-04: Conflit = flag user (jamais silencieux)
 * - INV-MEM-08: Audit trail complet
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ConflictResolver,
  createConflictResolver,
  ConflictCategory,
  ConflictSeverity,
  ConflictStatus,
  ResolutionStrategy,
  ConflictFlag,
  RESOLVER_LIMITS,
  ResolverErrorCode,
} from '../../src/resolver/index.js';
import type { ConflictParty } from '../../src/resolver/index.js';

describe('CONFLICT_RESOLVER', () => {
  let resolver: ConflictResolver;

  const partyA: ConflictParty = {
    entityId: 'char:jean',
    entityType: 'character',
    value: 'blue',
    source: 'USER',
    priority: 1000,
  };

  const partyB: ConflictParty = {
    entityId: 'char:jean',
    entityType: 'character',
    value: 'green',
    source: 'TEXT',
    priority: 100,
  };

  const samePriorityParty: ConflictParty = {
    entityId: 'char:jean',
    entityType: 'character',
    value: 'brown',
    source: 'TEXT',
    priority: 100,
  };

  beforeEach(() => {
    resolver = createConflictResolver();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DETECTION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('detect()', () => {
    it('creates a conflict with required fields', () => {
      const result = resolver.detect({
        category: ConflictCategory.VALUE_CONTRADICTION,
        partyA,
        partyB,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.category).toBe(ConflictCategory.VALUE_CONTRADICTION);
        expect(result.data.status).toBe(ConflictStatus.PENDING);
        expect(result.data.partyA.value).toBe('blue');
        expect(result.data.partyB.value).toBe('green');
      }
    });

    it('generates unique IDs', () => {
      const r1 = resolver.detect({ category: ConflictCategory.VALUE_CONTRADICTION, partyA, partyB });
      const r2 = resolver.detect({ category: ConflictCategory.VALUE_CONTRADICTION, partyA, partyB });

      expect(r1.success && r2.success).toBe(true);
      if (r1.success && r2.success) {
        expect(r1.data.id).not.toBe(r2.data.id);
      }
    });

    it('infers severity from category', () => {
      const critical = resolver.detect({
        category: ConflictCategory.LOGICAL_CONTRADICTION,
        partyA,
        partyB,
      });

      const warning = resolver.detect({
        category: ConflictCategory.VALUE_CONTRADICTION,
        partyA,
        partyB,
      });

      if (critical.success && warning.success) {
        expect(critical.data.severity).toBe(ConflictSeverity.CRITICAL);
        expect(warning.data.severity).toBe(ConflictSeverity.WARNING);
      }
    });

    it('allows custom severity', () => {
      const result = resolver.detect({
        category: ConflictCategory.OTHER,
        partyA,
        partyB,
        severity: ConflictSeverity.ERROR,
      });

      if (result.success) {
        expect(result.data.severity).toBe(ConflictSeverity.ERROR);
      }
    });

    it('sets AUTO_RESOLVABLE flag for different priorities', () => {
      const result = resolver.detect({
        category: ConflictCategory.VALUE_CONTRADICTION,
        partyA,
        partyB, // Different priority
      });

      if (result.success) {
        expect(result.data.flags).toContain(ConflictFlag.AUTO_RESOLVABLE);
      }
    });

    it('sets REQUIRES_USER_ATTENTION flag for same priorities', () => {
      const result = resolver.detect({
        category: ConflictCategory.VALUE_CONTRADICTION,
        partyA: partyB,
        partyB: samePriorityParty, // Same priority
      });

      if (result.success) {
        expect(result.data.flags).toContain(ConflictFlag.REQUIRES_USER_ATTENTION);
      }
    });

    it('generates description automatically', () => {
      const result = resolver.detect({
        category: ConflictCategory.VALUE_CONTRADICTION,
        partyA,
        partyB,
      });

      if (result.success) {
        expect(result.data.description).toContain('VALUE_CONTRADICTION');
        expect(result.data.description).toContain('blue');
        expect(result.data.description).toContain('green');
      }
    });

    it('rejects invalid category', () => {
      const result = resolver.detect({
        category: 'INVALID' as ConflictCategory,
        partyA,
        partyB,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(ResolverErrorCode.INVALID_CATEGORY);
      }
    });

    it('rejects invalid party', () => {
      const result = resolver.detect({
        category: ConflictCategory.VALUE_CONTRADICTION,
        partyA: {} as ConflictParty,
        partyB,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(ResolverErrorCode.INVALID_PARTY);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SCAN
  // ═══════════════════════════════════════════════════════════════════════════

  describe('scan()', () => {
    it('detects conflicts between entities with different values', () => {
      const entities: ConflictParty[] = [
        { entityId: 'char:1', entityType: 'character', value: 'A', source: 'USER', priority: 100 },
        { entityId: 'char:1', entityType: 'character', value: 'B', source: 'TEXT', priority: 100 },
      ];

      const conflicts = resolver.scan(entities);
      expect(conflicts.length).toBe(1);
    });

    it('does not detect conflicts for same values', () => {
      const entities: ConflictParty[] = [
        { entityId: 'char:1', entityType: 'character', value: 'A', source: 'USER', priority: 100 },
        { entityId: 'char:1', entityType: 'character', value: 'A', source: 'TEXT', priority: 100 },
      ];

      const conflicts = resolver.scan(entities);
      expect(conflicts.length).toBe(0);
    });

    it('detects multiple conflicts', () => {
      const entities: ConflictParty[] = [
        { entityId: 'char:1', entityType: 'character', value: 'A', source: 'S1', priority: 100 },
        { entityId: 'char:1', entityType: 'character', value: 'B', source: 'S2', priority: 100 },
        { entityId: 'char:1', entityType: 'character', value: 'C', source: 'S3', priority: 100 },
      ];

      const conflicts = resolver.scan(entities);
      expect(conflicts.length).toBe(3); // A-B, A-C, B-C
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESOLUTION (INV-MEM-04)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('resolve()', () => {
    it('resolves conflict with KEEP_EXISTING', () => {
      const detectResult = resolver.detect({
        category: ConflictCategory.VALUE_CONTRADICTION,
        partyA,
        partyB,
      });
      if (!detectResult.success) throw new Error('Detect failed');

      const result = resolver.resolve(detectResult.data.id, {
        strategy: ResolutionStrategy.KEEP_EXISTING,
        winner: 'A',
        resolvedBy: 'admin',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe(ConflictStatus.RESOLVED_BY_USER);
        expect(result.data.resolution?.strategy).toBe(ResolutionStrategy.KEEP_EXISTING);
        expect(result.data.resolution?.finalValue).toBe('blue');
      }
    });

    it('resolves conflict with USE_NEW', () => {
      const detectResult = resolver.detect({
        category: ConflictCategory.VALUE_CONTRADICTION,
        partyA,
        partyB,
      });
      if (!detectResult.success) throw new Error('Detect failed');

      const result = resolver.resolve(detectResult.data.id, {
        strategy: ResolutionStrategy.USE_NEW,
        winner: 'B',
        resolvedBy: 'admin',
      });

      if (result.success) {
        expect(result.data.resolution?.finalValue).toBe('green');
      }
    });

    it('resolves conflict with CUSTOM value', () => {
      const detectResult = resolver.detect({
        category: ConflictCategory.VALUE_CONTRADICTION,
        partyA,
        partyB,
      });
      if (!detectResult.success) throw new Error('Detect failed');

      const result = resolver.resolve(detectResult.data.id, {
        strategy: ResolutionStrategy.CUSTOM,
        customValue: 'hazel',
        resolvedBy: 'admin',
      });

      if (result.success) {
        expect(result.data.resolution?.finalValue).toBe('hazel');
      }
    });

    it('records resolution metadata', () => {
      const detectResult = resolver.detect({
        category: ConflictCategory.VALUE_CONTRADICTION,
        partyA,
        partyB,
      });
      if (!detectResult.success) throw new Error('Detect failed');

      const result = resolver.resolve(detectResult.data.id, {
        strategy: ResolutionStrategy.KEEP_EXISTING,
        reason: 'User preference',
        resolvedBy: 'user-123',
      });

      if (result.success) {
        expect(result.data.metadata.resolvedBy).toBe('user-123');
        expect(result.data.metadata.resolvedAt).toBeDefined();
        expect(result.data.resolution?.reason).toContain('User preference');
      }
    });

    it('rejects resolution of unknown conflict', () => {
      const result = resolver.resolve('unknown', {
        strategy: ResolutionStrategy.KEEP_EXISTING,
        resolvedBy: 'admin',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(ResolverErrorCode.CONFLICT_NOT_FOUND);
      }
    });

    it('rejects double resolution', () => {
      const detectResult = resolver.detect({
        category: ConflictCategory.VALUE_CONTRADICTION,
        partyA,
        partyB,
      });
      if (!detectResult.success) throw new Error('Detect failed');

      resolver.resolve(detectResult.data.id, {
        strategy: ResolutionStrategy.KEEP_EXISTING,
        resolvedBy: 'admin',
      });

      const result = resolver.resolve(detectResult.data.id, {
        strategy: ResolutionStrategy.USE_NEW,
        resolvedBy: 'admin',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(ResolverErrorCode.CONFLICT_ALREADY_RESOLVED);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTO-RESOLVE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('tryAutoResolve()', () => {
    it('auto-resolves when priorities differ', () => {
      const detectResult = resolver.detect({
        category: ConflictCategory.VALUE_CONTRADICTION,
        partyA,
        partyB, // Lower priority
      });
      if (!detectResult.success) throw new Error('Detect failed');

      const result = resolver.tryAutoResolve(detectResult.data.id);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe(ConflictStatus.RESOLVED_AUTO);
        expect(result.data.resolution?.isAutomatic).toBe(true);
        expect(result.data.resolution?.finalValue).toBe('blue'); // Higher priority wins
      }
    });

    it('fails when priorities are equal', () => {
      const detectResult = resolver.detect({
        category: ConflictCategory.VALUE_CONTRADICTION,
        partyA: partyB,
        partyB: samePriorityParty,
      });
      if (!detectResult.success) throw new Error('Detect failed');

      const result = resolver.tryAutoResolve(detectResult.data.id);

      expect(result.success).toBe(false);
      if (!result.success) {
        // Cannot auto-resolve because it doesn't have the AUTO_RESOLVABLE flag
        expect(result.error.code).toBe(ResolverErrorCode.CANNOT_AUTO_RESOLVE);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // IGNORE & DEFER
  // ═══════════════════════════════════════════════════════════════════════════

  describe('ignore() & defer()', () => {
    it('ignores conflict with reason', () => {
      const detectResult = resolver.detect({
        category: ConflictCategory.VALUE_CONTRADICTION,
        partyA,
        partyB,
      });
      if (!detectResult.success) throw new Error('Detect failed');

      const result = resolver.ignore(detectResult.data.id, 'Not important', 'admin');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe(ConflictStatus.IGNORED);
        expect(result.data.metadata.notes).toBe('Not important');
      }
    });

    it('defers conflict', () => {
      const detectResult = resolver.detect({
        category: ConflictCategory.VALUE_CONTRADICTION,
        partyA,
        partyB,
      });
      if (!detectResult.success) throw new Error('Detect failed');

      const result = resolver.defer(detectResult.data.id, 'Review later', 'admin');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe(ConflictStatus.DEFERRED);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Queries', () => {
    beforeEach(() => {
      resolver.detect({ category: ConflictCategory.VALUE_CONTRADICTION, partyA, partyB });
      resolver.detect({ category: ConflictCategory.LOGICAL_CONTRADICTION, partyA, partyB });
    });

    it('getConflict returns by ID', () => {
      const detectResult = resolver.detect({
        category: ConflictCategory.VALUE_CONTRADICTION,
        partyA,
        partyB,
      });
      if (!detectResult.success) throw new Error('Detect failed');

      const conflict = resolver.getConflict(detectResult.data.id);
      expect(conflict?.id).toBe(detectResult.data.id);
    });

    it('getPendingConflicts returns PENDING only', () => {
      const pending = resolver.getPendingConflicts();
      expect(pending.length).toBe(2);
      expect(pending.every(c => c.status === ConflictStatus.PENDING)).toBe(true);
    });

    it('queryConflicts filters by category', () => {
      const results = resolver.queryConflicts({
        category: ConflictCategory.LOGICAL_CONTRADICTION,
      });
      expect(results.length).toBe(1);
    });

    it('queryConflicts filters by minSeverity', () => {
      const results = resolver.queryConflicts({
        minSeverity: ConflictSeverity.CRITICAL,
      });
      expect(results.length).toBe(1);
    });

    it('queryConflicts sorts by severity', () => {
      const results = resolver.queryConflicts({});
      // CRITICAL should come first
      expect(results[0]?.severity).toBe(ConflictSeverity.CRITICAL);
    });

    it('countByStatus returns correct count', () => {
      expect(resolver.countByStatus(ConflictStatus.PENDING)).toBe(2);
      expect(resolver.countByStatus(ConflictStatus.RESOLVED_BY_USER)).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-MEM-08: AUDIT TRAIL
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-MEM-08: Audit Trail', () => {
    it('records DETECTED action', () => {
      const result = resolver.detect({
        category: ConflictCategory.VALUE_CONTRADICTION,
        partyA,
        partyB,
      });
      if (!result.success) throw new Error('Detect failed');

      const audit = resolver.getAuditTrail(result.data.id);
      expect(audit.length).toBe(1);
      expect(audit[0]?.action).toBe('DETECTED');
    });

    it('records RESOLVED action', () => {
      const detectResult = resolver.detect({
        category: ConflictCategory.VALUE_CONTRADICTION,
        partyA,
        partyB,
      });
      if (!detectResult.success) throw new Error('Detect failed');

      resolver.resolve(detectResult.data.id, {
        strategy: ResolutionStrategy.KEEP_EXISTING,
        resolvedBy: 'admin',
      });

      const audit = resolver.getAuditTrail(detectResult.data.id);
      expect(audit.some(e => e.action === 'RESOLVED')).toBe(true);
    });

    it('records IGNORED action', () => {
      const detectResult = resolver.detect({
        category: ConflictCategory.VALUE_CONTRADICTION,
        partyA,
        partyB,
      });
      if (!detectResult.success) throw new Error('Detect failed');

      resolver.ignore(detectResult.data.id, 'test', 'admin');

      const audit = resolver.getAuditTrail(detectResult.data.id);
      expect(audit.some(e => e.action === 'IGNORED')).toBe(true);
    });

    it('audit entries have hashes', () => {
      resolver.detect({ category: ConflictCategory.VALUE_CONTRADICTION, partyA, partyB });

      const audit = resolver.getAuditTrail();
      expect(audit.every(e => e.hash && e.hash.length === 64)).toBe(true);
    });

    it('verifyAuditIntegrity passes for valid state', () => {
      resolver.detect({ category: ConflictCategory.VALUE_CONTRADICTION, partyA, partyB });

      const result = resolver.verifyAuditIntegrity();
      expect(result.valid).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // METRICS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Metrics', () => {
    it('tracks total detected', () => {
      resolver.detect({ category: ConflictCategory.VALUE_CONTRADICTION, partyA, partyB });
      resolver.detect({ category: ConflictCategory.VALUE_CONTRADICTION, partyA, partyB });

      const metrics = resolver.getMetrics();
      expect(metrics.totalDetected).toBe(2);
    });

    it('tracks total resolved', () => {
      const r = resolver.detect({ category: ConflictCategory.VALUE_CONTRADICTION, partyA, partyB });
      if (!r.success) throw new Error('Detect failed');

      resolver.resolve(r.data.id, {
        strategy: ResolutionStrategy.KEEP_EXISTING,
        resolvedBy: 'admin',
      });

      const metrics = resolver.getMetrics();
      expect(metrics.totalResolved).toBe(1);
    });

    it('tracks by category', () => {
      resolver.detect({ category: ConflictCategory.VALUE_CONTRADICTION, partyA, partyB });
      resolver.detect({ category: ConflictCategory.LOGICAL_CONTRADICTION, partyA, partyB });

      const metrics = resolver.getMetrics();
      expect(metrics.byCategory[ConflictCategory.VALUE_CONTRADICTION]).toBe(1);
      expect(metrics.byCategory[ConflictCategory.LOGICAL_CONTRADICTION]).toBe(1);
    });

    it('calculates auto resolution rate', () => {
      const r = resolver.detect({ category: ConflictCategory.VALUE_CONTRADICTION, partyA, partyB });
      if (!r.success) throw new Error('Detect failed');

      resolver.tryAutoResolve(r.data.id);

      const metrics = resolver.getMetrics();
      expect(metrics.autoResolutionRate).toBe(1.0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LISTENERS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Listeners', () => {
    it('notifies on DETECTED', () => {
      const events: string[] = [];
      resolver.addListener((e) => events.push(e.type));

      resolver.detect({ category: ConflictCategory.VALUE_CONTRADICTION, partyA, partyB });

      expect(events).toContain('DETECTED');
    });

    it('notifies on RESOLVED', () => {
      const events: string[] = [];
      resolver.addListener((e) => events.push(e.type));

      const r = resolver.detect({ category: ConflictCategory.VALUE_CONTRADICTION, partyA, partyB });
      if (!r.success) throw new Error('Detect failed');

      resolver.resolve(r.data.id, {
        strategy: ResolutionStrategy.KEEP_EXISTING,
        resolvedBy: 'admin',
      });

      expect(events).toContain('RESOLVED');
    });

    it('allows removing listeners', () => {
      let count = 0;
      const listener = () => { count++; };

      resolver.addListener(listener);
      resolver.detect({ category: ConflictCategory.VALUE_CONTRADICTION, partyA, partyB });

      resolver.removeListener(listener);
      resolver.detect({ category: ConflictCategory.VALUE_CONTRADICTION, partyA, partyB });

      expect(count).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Utilities', () => {
    it('clear resets state', () => {
      resolver.detect({ category: ConflictCategory.VALUE_CONTRADICTION, partyA, partyB });
      resolver.clear();

      expect(resolver.count()).toBe(0);
      expect(resolver.getAuditTrail().length).toBe(0);
    });

    it('count returns conflict count', () => {
      expect(resolver.count()).toBe(0);
      resolver.detect({ category: ConflictCategory.VALUE_CONTRADICTION, partyA, partyB });
      expect(resolver.count()).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FACTORY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Factory', () => {
    it('createConflictResolver returns new instance', () => {
      const r1 = createConflictResolver();
      const r2 = createConflictResolver();

      r1.detect({ category: ConflictCategory.VALUE_CONTRADICTION, partyA, partyB });

      expect(r1.count()).toBe(1);
      expect(r2.count()).toBe(0);
    });

    it('accepts custom clock', () => {
      const fixedClock = () => '2026-01-01T00:00:00.000Z';
      const customResolver = createConflictResolver(fixedClock);

      const result = customResolver.detect({
        category: ConflictCategory.VALUE_CONTRADICTION,
        partyA,
        partyB,
      });

      if (result.success) {
        expect(result.data.metadata.detectedAt).toBe('2026-01-01T00:00:00.000Z');
      }
    });
  });
});
