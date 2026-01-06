// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — TESTS POLICY
// Version: 1.0.0
// Date: 06 janvier 2026
// Standard: NASA-Grade L4 / DO-178C / MIL-STD
// ═══════════════════════════════════════════════════════════════════════════════
//
// INVARIANTS TESTÉS:
// @invariant INV-WIRE-06: Policy Enforcement - règles non contournables
// @invariant INV-WIRE-11: Policy rules cannot be bypassed
//
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PolicyEngine,
  PolicyCodes,
  DEFAULT_POLICY_CONFIG,
  policyAllowAll,
  policyDenyAll,
  createModuleWhitelist,
  createPolicyEngine,
  createPermissivePolicyEngine,
  createStrictPolicyEngine,
} from '../src/policy.js';
import type { NexusEnvelope } from '../src/types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function createEnvelope(overrides: Partial<NexusEnvelope> = {}): NexusEnvelope {
  return {
    message_id: 'msg-001',
    trace_id: 'trace-001',
    timestamp: 1704499200000,
    source_module: 'gateway',
    target_module: 'memory',
    kind: 'command',
    payload_schema: 'memory.write',
    payload_version: 'v1.0.0',
    module_version: 'memory@3.21.0',
    replay_protection_key: 'rpk-001',
    payload: { key: 'test', value: 42 },
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('PolicyEngine', () => {
  describe('Basic checks', () => {
    it('allows valid envelope with default config', () => {
      const engine = new PolicyEngine();
      engine.resetRateLimits();
      
      const env = createEnvelope({
        source_module: 'gateway',
        target_module: 'memory',
        kind: 'command',
        payload_schema: 'memory.write',
      });

      const decision = engine.check(env);
      expect(decision.allow).toBe(true);
    });

    it('rejects blocked source module', () => {
      const engine = new PolicyEngine({
        allowedSourceModules: new Set(['gateway']),
      });

      const env = createEnvelope({ source_module: 'unknown_module' });

      const decision = engine.check(env);
      expect(decision.allow).toBe(false);
      if (!decision.allow) {
        expect(decision.code).toBe(PolicyCodes.BLOCKED_SOURCE);
      }
    });

    it('rejects blocked target module', () => {
      const engine = new PolicyEngine({
        allowedTargetModules: new Set(['memory']),
      });

      const env = createEnvelope({ target_module: 'forbidden' });

      const decision = engine.check(env);
      expect(decision.allow).toBe(false);
      if (!decision.allow) {
        expect(decision.code).toBe(PolicyCodes.BLOCKED_TARGET);
      }
    });

    it('rejects blocked kind', () => {
      const engine = new PolicyEngine({
        allowedKinds: new Set(['query']),
      });

      const env = createEnvelope({ kind: 'command' });

      const decision = engine.check(env);
      expect(decision.allow).toBe(false);
      if (!decision.allow) {
        expect(decision.code).toBe(PolicyCodes.BLOCKED_KIND);
      }
    });

    it('rejects blocked schema for module', () => {
      const engine = new PolicyEngine({
        allowedSchemas: new Map([
          ['memory', new Set(['memory.read'])],
        ]),
      });

      const env = createEnvelope({
        target_module: 'memory',
        payload_schema: 'memory.write',
      });

      const decision = engine.check(env);
      expect(decision.allow).toBe(false);
      if (!decision.allow) {
        expect(decision.code).toBe(PolicyCodes.BLOCKED_SCHEMA);
      }
    });
  });

  describe('Payload size check', () => {
    it('allows payload within limit', () => {
      const engine = new PolicyEngine({ maxPayloadSize: 1000 });
      engine.resetRateLimits();

      const env = createEnvelope({ payload: { small: 'data' } });

      const decision = engine.check(env);
      expect(decision.allow).toBe(true);
    });

    it('rejects payload exceeding limit', () => {
      const engine = new PolicyEngine({ maxPayloadSize: 10 });

      const env = createEnvelope({ payload: { large: 'x'.repeat(100) } });

      const decision = engine.check(env);
      expect(decision.allow).toBe(false);
      if (!decision.allow) {
        expect(decision.code).toBe(PolicyCodes.PAYLOAD_TOO_LARGE);
      }
    });
  });

  describe('Rate limiting', () => {
    it('allows requests within rate limit', () => {
      const engine = new PolicyEngine({ rateLimitPerMinute: 10 });

      for (let i = 0; i < 10; i++) {
        const decision = engine.check(createEnvelope());
        expect(decision.allow).toBe(true);
      }
    });

    it('rejects requests exceeding rate limit', () => {
      const engine = new PolicyEngine({ rateLimitPerMinute: 5 });

      // First 5 should pass
      for (let i = 0; i < 5; i++) {
        engine.check(createEnvelope());
      }

      // 6th should fail
      const decision = engine.check(createEnvelope());
      expect(decision.allow).toBe(false);
      if (!decision.allow) {
        expect(decision.code).toBe(PolicyCodes.RATE_LIMITED);
      }
    });

    it('rate limit is per source module', () => {
      const engine = new PolicyEngine({ rateLimitPerMinute: 2 });

      // 2 from gateway
      engine.check(createEnvelope({ source_module: 'gateway' }));
      engine.check(createEnvelope({ source_module: 'gateway' }));

      // 3rd from gateway should fail
      const d1 = engine.check(createEnvelope({ source_module: 'gateway' }));
      expect(d1.allow).toBe(false);

      // But from different source should pass
      const d2 = engine.check(createEnvelope({ source_module: 'wiring' }));
      expect(d2.allow).toBe(true);
    });

    it('resetRateLimits clears limits', () => {
      const engine = new PolicyEngine({ rateLimitPerMinute: 2 });

      // Exhaust limit
      engine.check(createEnvelope());
      engine.check(createEnvelope());
      engine.check(createEnvelope());

      // Reset
      engine.resetRateLimits();

      // Should pass now
      const decision = engine.check(createEnvelope());
      expect(decision.allow).toBe(true);
    });
  });

  describe('Custom rules', () => {
    it('adds custom rule', () => {
      const engine = new PolicyEngine();
      engine.resetRateLimits();

      engine.addRule({
        id: 'custom:no_test',
        description: 'Block test payload',
        priority: 5,
        enabled: true,
        check: (env) => {
          if ((env.payload as any)?.key === 'forbidden') {
            return { allow: false, reason: 'Forbidden key', code: PolicyCodes.CUSTOM_RULE };
          }
          return { allow: true };
        },
      });

      const d1 = engine.check(createEnvelope({ payload: { key: 'allowed' } }));
      expect(d1.allow).toBe(true);

      const d2 = engine.check(createEnvelope({ payload: { key: 'forbidden' } }));
      expect(d2.allow).toBe(false);
    });

    it('rejects duplicate rule id', () => {
      const engine = new PolicyEngine();

      engine.addRule({
        id: 'rule-1',
        description: 'Test',
        priority: 1,
        enabled: true,
        check: () => ({ allow: true }),
      });

      expect(() => {
        engine.addRule({
          id: 'rule-1',
          description: 'Duplicate',
          priority: 2,
          enabled: true,
          check: () => ({ allow: true }),
        });
      }).toThrow();
    });

    it('removes rule by id', () => {
      const engine = new PolicyEngine();

      engine.addRule({
        id: 'removable',
        description: 'Test',
        priority: 1,
        enabled: true,
        check: () => ({ allow: false, reason: 'Block', code: 'TEST' }),
      });

      expect(engine.removeRule('removable')).toBe(true);
      expect(engine.removeRule('nonexistent')).toBe(false);
    });

    it('enables/disables rule', () => {
      const engine = new PolicyEngine();
      engine.resetRateLimits();

      engine.addRule({
        id: 'toggleable',
        description: 'Toggleable rule',
        priority: 1,
        enabled: true,
        check: () => ({ allow: false, reason: 'Blocked', code: 'TEST' }),
      });

      // Should block
      const d1 = engine.check(createEnvelope());
      expect(d1.allow).toBe(false);

      // Disable rule
      engine.setRuleEnabled('toggleable', false);

      // Should pass
      const d2 = engine.check(createEnvelope());
      expect(d2.allow).toBe(true);

      // Re-enable
      engine.setRuleEnabled('toggleable', true);

      // Should block again
      const d3 = engine.check(createEnvelope());
      expect(d3.allow).toBe(false);
    });

    it('custom rule priority is respected', () => {
      const engine = new PolicyEngine();
      engine.resetRateLimits();

      const order: string[] = [];

      engine.addRule({
        id: 'low-priority',
        description: 'Low',
        priority: 100,
        enabled: true,
        check: () => {
          order.push('low');
          return { allow: true };
        },
      });

      engine.addRule({
        id: 'high-priority',
        description: 'High',
        priority: 1,
        enabled: true,
        check: () => {
          order.push('high');
          return { allow: true };
        },
      });

      engine.check(createEnvelope());

      // High priority should be checked before builtin rules (priority 10+)
      expect(order.indexOf('high')).toBeLessThan(order.indexOf('low'));
    });
  });

  describe('INV-WIRE-06: Policy Enforcement', () => {
    it('all rules are evaluated in order', () => {
      const engine = new PolicyEngine();
      engine.resetRateLimits();

      const checked: string[] = [];

      engine.addRule({
        id: 'rule-a',
        description: 'A',
        priority: 1,
        enabled: true,
        check: () => { checked.push('a'); return { allow: true }; },
      });

      engine.addRule({
        id: 'rule-b',
        description: 'B',
        priority: 2,
        enabled: true,
        check: () => { checked.push('b'); return { allow: true }; },
      });

      engine.check(createEnvelope());

      expect(checked).toContain('a');
      expect(checked).toContain('b');
    });

    it('first failing rule stops evaluation', () => {
      const engine = new PolicyEngine();

      const checked: string[] = [];

      engine.addRule({
        id: 'blocker',
        description: 'Blocker',
        priority: 1,
        enabled: true,
        check: () => { checked.push('blocker'); return { allow: false, reason: 'Blocked', code: 'TEST' }; },
      });

      engine.addRule({
        id: 'after-blocker',
        description: 'After',
        priority: 2,
        enabled: true,
        check: () => { checked.push('after'); return { allow: true }; },
      });

      engine.check(createEnvelope());

      expect(checked).toContain('blocker');
      expect(checked).not.toContain('after');
    });
  });

  describe('getRules', () => {
    it('returns all rules', () => {
      const engine = new PolicyEngine();

      engine.addRule({
        id: 'custom-1',
        description: 'Custom',
        priority: 1,
        enabled: true,
        check: () => ({ allow: true }),
      });

      const rules = engine.getRules();

      // Built-in + custom
      expect(rules.length).toBeGreaterThan(1);
      expect(rules.some(r => r.id === 'custom-1')).toBe(true);
      expect(rules.some(r => r.id === 'builtin:source_module')).toBe(true);
    });
  });

  describe('getConfig', () => {
    it('returns config copy', () => {
      const engine = new PolicyEngine({ maxPayloadSize: 999 });
      const config = engine.getConfig();

      expect(config.maxPayloadSize).toBe(999);
    });
  });
});

describe('Simple Policy Functions', () => {
  describe('policyAllowAll', () => {
    it('always allows', () => {
      const d = policyAllowAll(createEnvelope());
      expect(d.allow).toBe(true);
    });
  });

  describe('policyDenyAll', () => {
    it('always denies', () => {
      const d = policyDenyAll(createEnvelope());
      expect(d.allow).toBe(false);
    });
  });

  describe('createModuleWhitelist', () => {
    it('allows whitelisted modules', () => {
      const check = createModuleWhitelist(['memory', 'query']);

      const d1 = check(createEnvelope({ target_module: 'memory' }));
      expect(d1.allow).toBe(true);

      const d2 = check(createEnvelope({ target_module: 'query' }));
      expect(d2.allow).toBe(true);
    });

    it('blocks non-whitelisted modules', () => {
      const check = createModuleWhitelist(['memory']);

      const d = check(createEnvelope({ target_module: 'oracle' }));
      expect(d.allow).toBe(false);
      if (!d.allow) {
        expect(d.code).toBe(PolicyCodes.BLOCKED_TARGET);
      }
    });
  });
});

describe('Factory Functions', () => {
  describe('createPolicyEngine', () => {
    it('creates engine with defaults', () => {
      const engine = createPolicyEngine();
      expect(engine).toBeInstanceOf(PolicyEngine);
    });

    it('accepts custom config', () => {
      const engine = createPolicyEngine({ maxPayloadSize: 500 });
      expect(engine.getConfig().maxPayloadSize).toBe(500);
    });
  });

  describe('createPermissivePolicyEngine', () => {
    it('creates engine without rate limiting', () => {
      const engine = createPermissivePolicyEngine();
      const rules = engine.getRules();

      const rateLimitRule = rules.find(r => r.id === 'builtin:rate_limit');
      expect(rateLimitRule?.enabled).toBe(false);
    });
  });

  describe('createStrictPolicyEngine', () => {
    it('creates engine with stricter limits', () => {
      const engine = createStrictPolicyEngine();
      const config = engine.getConfig();

      expect(config.maxPayloadSize).toBe(1024 * 1024); // 1MB
      expect(config.rateLimitPerMinute).toBe(100);
    });
  });
});

describe('DEFAULT_POLICY_CONFIG', () => {
  it('has expected values', () => {
    expect(DEFAULT_POLICY_CONFIG.maxPayloadSize).toBe(2 * 1024 * 1024);
    expect(DEFAULT_POLICY_CONFIG.rateLimitPerMinute).toBe(1000);
    expect(DEFAULT_POLICY_CONFIG.allowedKinds.has('command')).toBe(true);
    expect(DEFAULT_POLICY_CONFIG.allowedKinds.has('query')).toBe(true);
    expect(DEFAULT_POLICY_CONFIG.allowedKinds.has('event')).toBe(true);
  });
});
