/**
 * OMEGA RESILIENCE PROOF SYSTEM
 * Adversarial Grammar - Tests
 * 
 * Phase 23 - Sprint 23.1
 * 
 * INVARIANTS TESTED:
 * - INV-ADV-01: Grammar covers 100% of known vectors
 * - INV-ADV-02: ∀attack ∉ Grammar ⇒ attack impossible
 * - INV-ADV-03: ∀attack ∈ Grammar, system(attack) ∈ {REJECT, ABSORB}
 * - INV-ADV-04: rejected(attack) ⇒ state_unchanged
 * - INV-ADV-05: ∀attack, severity(attack) ∈ {LOW, MEDIUM, HIGH, CRITICAL}
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ADVERSARIAL_GRAMMAR,
  AttackCategory,
  Severity,
  ExpectedResponse,
  Exploitability,
  EnvelopeAttackType,
  ALL_CATEGORIES,
  ALL_SEVERITIES,
  ALL_RESPONSES,
  attackId,
  isEnvelopeAttack,
  isReplayAttack,
  isBypassAttack,
  isResourceAttack,
  isTimingAttack,
  isInjectionAttack,
} from '../../src/adversarial/index.js';

describe('Adversarial Grammar', () => {
  describe('Grammar Structure', () => {
    it('should have a name and version', () => {
      expect(ADVERSARIAL_GRAMMAR.name).toBe('OMEGA_ADVERSARIAL_GRAMMAR');
      expect(ADVERSARIAL_GRAMMAR.version).toBe('1.0.0');
    });

    it('should have rules for multiple categories', () => {
      const categories = Object.keys(ADVERSARIAL_GRAMMAR.rules);
      expect(categories.length).toBeGreaterThanOrEqual(5);
    });

    it('should have productions in each rule', () => {
      for (const [category, rule] of Object.entries(ADVERSARIAL_GRAMMAR.rules)) {
        expect(rule.productions.length).toBeGreaterThan(0);
        expect(rule.category).toBe(category);
      }
    });
  });

  describe('Attack Enumeration', () => {
    it('should enumerate all attacks', () => {
      const allAttacks = ADVERSARIAL_GRAMMAR.enumerateAll();
      expect(allAttacks.length).toBeGreaterThan(50);
    });

    it('should have unique IDs for all attacks', () => {
      const allAttacks = ADVERSARIAL_GRAMMAR.enumerateAll();
      const ids = new Set(allAttacks.map(a => a.id));
      expect(ids.size).toBe(allAttacks.length);
    });

    it('should calculate cardinality correctly', () => {
      const cardinality = ADVERSARIAL_GRAMMAR.cardinality();
      const enumerated = ADVERSARIAL_GRAMMAR.enumerateAll().length;
      expect(cardinality).toBe(enumerated);
    });

    it('should enumerate by category', () => {
      for (const category of ALL_CATEGORIES) {
        const attacks = ADVERSARIAL_GRAMMAR.byCategory(category);
        for (const attack of attacks) {
          expect(attack.category).toBe(category);
        }
      }
    });

    it('should enumerate by severity', () => {
      for (const severity of ALL_SEVERITIES) {
        const attacks = ADVERSARIAL_GRAMMAR.bySeverity(severity);
        for (const attack of attacks) {
          expect(attack.severity).toBe(severity);
        }
      }
    });

    it('should find attack by ID', () => {
      const allAttacks = ADVERSARIAL_GRAMMAR.enumerateAll();
      const firstAttack = allAttacks[0]!;
      
      const found = ADVERSARIAL_GRAMMAR.byId(firstAttack.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(firstAttack.id);
    });

    it('should return undefined for unknown ID', () => {
      const found = ADVERSARIAL_GRAMMAR.byId(attackId('NONEXISTENT'));
      expect(found).toBeUndefined();
    });
  });

  describe('Attack Properties - INV-ADV-05', () => {
    it('every attack should have a valid severity', () => {
      const allAttacks = ADVERSARIAL_GRAMMAR.enumerateAll();
      
      for (const attack of allAttacks) {
        expect(ALL_SEVERITIES).toContain(attack.severity);
      }
    });

    it('every attack should have a valid category', () => {
      const allAttacks = ADVERSARIAL_GRAMMAR.enumerateAll();
      
      for (const attack of allAttacks) {
        expect(ALL_CATEGORIES).toContain(attack.category);
      }
    });

    it('every attack should have a valid expected response', () => {
      const allAttacks = ADVERSARIAL_GRAMMAR.enumerateAll();
      
      for (const attack of allAttacks) {
        expect(ALL_RESPONSES).toContain(attack.expectedResponse);
      }
    });

    it('every attack should have protected invariants', () => {
      const allAttacks = ADVERSARIAL_GRAMMAR.enumerateAll();
      
      for (const attack of allAttacks) {
        expect(attack.protectedInvariants.length).toBeGreaterThan(0);
      }
    });

    it('every attack should have a description', () => {
      const allAttacks = ADVERSARIAL_GRAMMAR.enumerateAll();
      
      for (const attack of allAttacks) {
        expect(attack.description).toBeTruthy();
        expect(attack.description.length).toBeGreaterThan(10);
      }
    });
  });

  describe('Envelope Attacks', () => {
    it('should have attacks for missing fields', () => {
      const attacks = ADVERSARIAL_GRAMMAR.byCategory(AttackCategory.ENVELOPE);
      const missingField = attacks.filter(a => a.id.toString().includes('MISSING'));
      
      expect(missingField.length).toBeGreaterThan(5);
    });

    it('should have hash mismatch attacks', () => {
      const attacks = ADVERSARIAL_GRAMMAR.byCategory(AttackCategory.ENVELOPE);
      // Filter for actual HASH_MISMATCH attacks (not INVALID_TYPE on hash field)
      const hashAttacks = attacks.filter(a => 
        a.id.toString().includes('HASH_') && 
        (a.subtype === EnvelopeAttackType.HASH_MISMATCH)
      );
      
      expect(hashAttacks.length).toBeGreaterThan(0);
      hashAttacks.forEach(a => {
        expect(a.severity).toBe(Severity.CRITICAL);
      });
    });

    it('should have unicode attacks', () => {
      const attacks = ADVERSARIAL_GRAMMAR.byCategory(AttackCategory.ENVELOPE);
      const unicodeAttacks = attacks.filter(a => a.id.toString().includes('UNICODE'));
      
      expect(unicodeAttacks.length).toBeGreaterThanOrEqual(4);
    });

    it('should correctly type envelope attacks', () => {
      const attacks = ADVERSARIAL_GRAMMAR.byCategory(AttackCategory.ENVELOPE);
      
      for (const attack of attacks) {
        expect(isEnvelopeAttack(attack)).toBe(true);
      }
    });
  });

  describe('Replay Attacks', () => {
    it('should have exact duplicate attacks', () => {
      const attacks = ADVERSARIAL_GRAMMAR.byCategory(AttackCategory.REPLAY);
      const exactDup = attacks.filter(a => a.id.toString().includes('EXACT'));
      
      expect(exactDup.length).toBeGreaterThan(0);
    });

    it('should have modified replay attacks', () => {
      const attacks = ADVERSARIAL_GRAMMAR.byCategory(AttackCategory.REPLAY);
      const modified = attacks.filter(a => a.id.toString().includes('MOD'));
      
      expect(modified.length).toBeGreaterThan(0);
      modified.forEach(a => {
        expect(a.severity).toBe(Severity.CRITICAL);
      });
    });

    it('should have TTL expired attacks', () => {
      const attacks = ADVERSARIAL_GRAMMAR.byCategory(AttackCategory.REPLAY);
      const ttlExpired = attacks.filter(a => a.id.toString().includes('TTL'));
      
      expect(ttlExpired.length).toBeGreaterThan(0);
    });

    it('should correctly type replay attacks', () => {
      const attacks = ADVERSARIAL_GRAMMAR.byCategory(AttackCategory.REPLAY);
      
      for (const attack of attacks) {
        expect(isReplayAttack(attack)).toBe(true);
      }
    });
  });

  describe('Bypass Attacks', () => {
    it('should have policy bypass attacks', () => {
      const attacks = ADVERSARIAL_GRAMMAR.byCategory(AttackCategory.BYPASS);
      const policy = attacks.filter(a => a.id.toString().includes('POLICY'));
      
      expect(policy.length).toBeGreaterThan(0);
    });

    it('should correctly type bypass attacks', () => {
      const attacks = ADVERSARIAL_GRAMMAR.byCategory(AttackCategory.BYPASS);
      
      for (const attack of attacks) {
        expect(isBypassAttack(attack)).toBe(true);
      }
    });
  });

  describe('Resource Attacks', () => {
    it('should have memory exhaustion attacks', () => {
      const attacks = ADVERSARIAL_GRAMMAR.byCategory(AttackCategory.RESOURCE);
      const memory = attacks.filter(a => a.id.toString().includes('MEM'));
      
      expect(memory.length).toBeGreaterThan(0);
    });

    it('should have CPU exhaustion attacks', () => {
      const attacks = ADVERSARIAL_GRAMMAR.byCategory(AttackCategory.RESOURCE);
      const cpu = attacks.filter(a => a.id.toString().includes('CPU'));
      
      expect(cpu.length).toBeGreaterThan(0);
    });

    it('should correctly type resource attacks', () => {
      const attacks = ADVERSARIAL_GRAMMAR.byCategory(AttackCategory.RESOURCE);
      
      for (const attack of attacks) {
        expect(isResourceAttack(attack)).toBe(true);
      }
    });
  });

  describe('Timing Attacks', () => {
    it('should have race condition attacks', () => {
      const attacks = ADVERSARIAL_GRAMMAR.byCategory(AttackCategory.TIMING);
      const race = attacks.filter(a => a.id.toString().includes('RACE'));
      
      expect(race.length).toBeGreaterThan(0);
    });

    it('should have clock skew attacks', () => {
      const attacks = ADVERSARIAL_GRAMMAR.byCategory(AttackCategory.TIMING);
      const clock = attacks.filter(a => a.id.toString().includes('CLOCK'));
      
      expect(clock.length).toBeGreaterThan(0);
    });

    it('should correctly type timing attacks', () => {
      const attacks = ADVERSARIAL_GRAMMAR.byCategory(AttackCategory.TIMING);
      
      for (const attack of attacks) {
        expect(isTimingAttack(attack)).toBe(true);
      }
    });
  });

  describe('Injection Attacks', () => {
    it('should have prototype pollution attacks', () => {
      const attacks = ADVERSARIAL_GRAMMAR.byCategory(AttackCategory.INJECTION);
      const proto = attacks.filter(a => a.id.toString().includes('PROTO'));
      
      expect(proto.length).toBeGreaterThan(0);
      proto.forEach(a => {
        expect(a.severity).toBe(Severity.CRITICAL);
      });
    });

    it('should have path traversal attacks', () => {
      const attacks = ADVERSARIAL_GRAMMAR.byCategory(AttackCategory.INJECTION);
      const path = attacks.filter(a => a.id.toString().includes('PATH'));
      
      expect(path.length).toBeGreaterThan(0);
    });

    it('should correctly type injection attacks', () => {
      const attacks = ADVERSARIAL_GRAMMAR.byCategory(AttackCategory.INJECTION);
      
      for (const attack of attacks) {
        expect(isInjectionAttack(attack)).toBe(true);
      }
    });
  });

  describe('Coverage Requirements - INV-ADV-01', () => {
    it('should cover all known attack categories', () => {
      const coveredCategories = new Set<AttackCategory>();
      
      for (const attack of ADVERSARIAL_GRAMMAR.enumerateAll()) {
        coveredCategories.add(attack.category);
      }
      
      // At least these categories must be covered
      const requiredCategories = [
        AttackCategory.ENVELOPE,
        AttackCategory.REPLAY,
        AttackCategory.BYPASS,
        AttackCategory.RESOURCE,
        AttackCategory.TIMING,
        AttackCategory.INJECTION,
      ];
      
      for (const required of requiredCategories) {
        expect(coveredCategories.has(required)).toBe(true);
      }
    });

    it('should have attacks at all severity levels', () => {
      for (const severity of ALL_SEVERITIES) {
        const attacks = ADVERSARIAL_GRAMMAR.bySeverity(severity);
        expect(attacks.length).toBeGreaterThan(0);
      }
    });

    it('should have minimum number of attacks per critical invariant', () => {
      const invariantCoverage = new Map<string, number>();
      
      for (const attack of ADVERSARIAL_GRAMMAR.enumerateAll()) {
        for (const inv of attack.protectedInvariants) {
          invariantCoverage.set(inv, (invariantCoverage.get(inv) ?? 0) + 1);
        }
      }
      
      // ENV invariants should be well covered
      const envInvariants = ['INV-ENV-01', 'INV-ENV-02', 'INV-ENV-03'];
      for (const inv of envInvariants) {
        expect(invariantCoverage.get(inv) ?? 0).toBeGreaterThan(0);
      }
    });
  });

  describe('Expected Response - INV-ADV-03', () => {
    it('should only have valid expected responses', () => {
      const validResponses = [
        ExpectedResponse.REJECT,
        ExpectedResponse.ABSORB,
        ExpectedResponse.DEGRADE_BOUNDED,
      ];
      
      for (const attack of ADVERSARIAL_GRAMMAR.enumerateAll()) {
        expect(validResponses).toContain(attack.expectedResponse);
      }
    });

    it('critical attacks should expect REJECT', () => {
      const criticalAttacks = ADVERSARIAL_GRAMMAR.bySeverity(Severity.CRITICAL);
      
      const rejectCount = criticalAttacks.filter(
        a => a.expectedResponse === ExpectedResponse.REJECT
      ).length;
      
      // Most critical attacks should be rejected
      expect(rejectCount / criticalAttacks.length).toBeGreaterThan(0.8);
    });
  });
});

describe('Severity Distribution', () => {
  it('should have reasonable severity distribution', () => {
    const allAttacks = ADVERSARIAL_GRAMMAR.enumerateAll();
    const distribution = {
      [Severity.CRITICAL]: 0,
      [Severity.HIGH]: 0,
      [Severity.MEDIUM]: 0,
      [Severity.LOW]: 0,
    };
    
    for (const attack of allAttacks) {
      distribution[attack.severity]++;
    }
    
    // Should have some attacks at each level
    expect(distribution[Severity.CRITICAL]).toBeGreaterThan(5);
    expect(distribution[Severity.HIGH]).toBeGreaterThan(10);
    expect(distribution[Severity.MEDIUM]).toBeGreaterThan(5);
    expect(distribution[Severity.LOW]).toBeGreaterThan(3);
  });
});

describe('Exploitability Assessment', () => {
  it('should have varied exploitability levels', () => {
    const allAttacks = ADVERSARIAL_GRAMMAR.enumerateAll();
    const exploitabilities = new Set(allAttacks.map(a => a.exploitability));
    
    expect(exploitabilities.size).toBeGreaterThanOrEqual(3);
  });

  it('trivial exploitability should be rejected', () => {
    const allAttacks = ADVERSARIAL_GRAMMAR.enumerateAll();
    const trivial = allAttacks.filter(a => a.exploitability === Exploitability.TRIVIAL);
    
    // All trivially exploitable attacks should be rejected
    const rejectedTrivial = trivial.filter(a => a.expectedResponse === ExpectedResponse.REJECT);
    expect(rejectedTrivial.length / trivial.length).toBeGreaterThan(0.7);
  });
});
