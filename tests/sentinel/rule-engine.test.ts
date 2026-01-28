/**
 * OMEGA Sentinel Rule Engine Tests
 * Phase C - NASA-Grade L4
 */

import { describe, it, expect } from 'vitest';
import { RuleEngine } from '../../src/sentinel/rule-engine.js';
import { SentinelContext } from '../../src/sentinel/types.js';

describe('RuleEngine', () => {
  const engine = new RuleEngine();

  const ctx = (
    phase: string,
    actor = 'test',
    reason = 'valid reason for test'
  ): SentinelContext => ({
    phase,
    actor_id: actor,
    reason,
    source: 'test',
    timestamp_mono_ns: 0n,
  });

  describe('INV-C-01: Default DENY', () => {
    it('denies when no rule matches', () => {
      const r = engine.evaluate('APPEND_FACT', { x: 1 }, ctx('UNKNOWN'));
      expect(r.match.verdict).toBe('DENY');
      expect(r.rule_id).toBe('RULE-C-DEFAULT');
    });
  });

  describe('RULE-C-001: Block Phase C', () => {
    it('denies writes during Phase C', () => {
      const r = engine.evaluate('APPEND_FACT', { x: 1 }, ctx('C'));
      expect(r.match.verdict).toBe('DENY');
      expect(r.rule_id).toBe('RULE-C-001');
    });

    it('denies APPEND_DECISION during Phase C', () => {
      const r = engine.evaluate('APPEND_DECISION', { d: true }, ctx('C'));
      expect(r.match.verdict).toBe('DENY');
      expect(r.rule_id).toBe('RULE-C-001');
    });

    it('denies APPEND_NOTE during Phase C', () => {
      const r = engine.evaluate('APPEND_NOTE', { note: 'test' }, ctx('C'));
      expect(r.match.verdict).toBe('DENY');
      expect(r.rule_id).toBe('RULE-C-001');
    });
  });

  describe('RULE-C-002: Allow Phase CD', () => {
    it('allows writes during CD with valid context', () => {
      const r = engine.evaluate('APPEND_FACT', { x: 1 }, ctx('CD', 'actor', 'valid reason min 10'));
      expect(r.match.verdict).toBe('ALLOW');
      expect(r.rule_id).toBe('RULE-C-002');
    });

    it('denies if actor_id empty', () => {
      const r = engine.evaluate('APPEND_FACT', { x: 1 }, ctx('CD', '', 'valid reason'));
      expect(r.match.verdict).toBe('DENY');
      expect(r.rule_id).toBe('RULE-C-002');
    });

    it('denies if reason too short', () => {
      const r = engine.evaluate('APPEND_FACT', { x: 1 }, ctx('CD', 'actor', 'short'));
      expect(r.match.verdict).toBe('DENY');
      expect(r.rule_id).toBe('RULE-C-002');
    });

    it('allows exactly 10 character reason', () => {
      const r = engine.evaluate('APPEND_FACT', { x: 1 }, ctx('CD', 'actor', '1234567890'));
      expect(r.match.verdict).toBe('ALLOW');
    });
  });

  describe('RULE-C-003: Empty payloads', () => {
    it('denies null payload', () => {
      const r = engine.evaluate('APPEND_FACT', null, ctx('CD'));
      expect(r.match.verdict).toBe('DENY');
      expect(r.rule_id).toBe('RULE-C-003');
    });

    it('denies undefined payload', () => {
      const r = engine.evaluate('APPEND_FACT', undefined, ctx('CD'));
      expect(r.match.verdict).toBe('DENY');
      expect(r.rule_id).toBe('RULE-C-003');
    });

    it('denies empty object payload', () => {
      const r = engine.evaluate('APPEND_FACT', {}, ctx('CD'));
      expect(r.match.verdict).toBe('DENY');
      expect(r.rule_id).toBe('RULE-C-003');
    });

    it('allows non-empty object payload', () => {
      const r = engine.evaluate('APPEND_FACT', { data: 1 }, ctx('CD', 'actor', 'valid reason min'));
      expect(r.match.verdict).toBe('ALLOW');
    });
  });

  describe('Rule priority', () => {
    it('first matching rule wins', () => {
      // Phase C rule should match before CD rule
      const r = engine.evaluate('APPEND_FACT', { x: 1 }, ctx('C'));
      expect(r.rule_id).toBe('RULE-C-001');
    });
  });

  describe('INV-C-02: rule_id always present', () => {
    it('result always has rule_id', () => {
      const r1 = engine.evaluate('APPEND_FACT', { x: 1 }, ctx('C'));
      const r2 = engine.evaluate('APPEND_FACT', { x: 1 }, ctx('CD'));
      const r3 = engine.evaluate('APPEND_FACT', { x: 1 }, ctx('UNKNOWN'));

      expect(r1.rule_id).toBeDefined();
      expect(r2.rule_id).toBeDefined();
      expect(r3.rule_id).toBeDefined();
    });
  });
});
