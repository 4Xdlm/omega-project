/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — GENOME ATTACKS TESTS
 * Sprint 28.5 — Genome Integration
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Tests for ATK-GEN-* attacks targeting INV-GEN-* invariants.
 * These attacks validate the Genome module's falsification resistance.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import {
  getAttack,
  hasAttack,
  getAllAttacks,
  getAttacksByTag,
  getCorpusStats,
  isValidAttackId,
} from '../falsification/corpus.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ATK-GEN-* REGISTRATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Genome Attacks Registration', () => {
  const GENOME_ATTACK_IDS = [
    'ATK-GEN-001',
    'ATK-GEN-002',
    'ATK-GEN-003',
    'ATK-GEN-004',
    'ATK-GEN-005',
  ];

  it('all 5 genome attacks should be registered in corpus', () => {
    for (const id of GENOME_ATTACK_IDS) {
      expect(hasAttack(id)).toBe(true);
    }
  });

  it('genome attack IDs should follow ATK-CAT-NNN format', () => {
    for (const id of GENOME_ATTACK_IDS) {
      expect(isValidAttackId(id)).toBe(true);
    }
  });

  it('each genome attack should have valid definition', () => {
    for (const id of GENOME_ATTACK_IDS) {
      const attack = getAttack(id);
      expect(attack).toBeDefined();
      expect(attack!.id).toBe(id);
      expect(attack!.name).toBeTruthy();
      expect(attack!.description).toBeTruthy();
      expect(attack!.successCriteria).toBeTruthy();
      expect(attack!.failureCriteria).toBeTruthy();
      expect(attack!.category).toBe('semantic');
      expect(attack!.mandatory).toBe(true);
    }
  });

  it('genome attacks should have genome tag', () => {
    for (const id of GENOME_ATTACK_IDS) {
      const attack = getAttack(id);
      expect(attack!.tags).toContain('genome');
    }
  });

  it('getAttacksByTag(genome) should return all genome attacks', () => {
    const genomeAttacks = getAttacksByTag('genome');
    expect(genomeAttacks.length).toBe(5);
    
    const ids = genomeAttacks.map(a => a.id);
    for (const id of GENOME_ATTACK_IDS) {
      expect(ids).toContain(id);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ATK-GEN-001: JSON KEY PERMUTATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('ATK-GEN-001: JSON Key Permutation', () => {
  const attack = getAttack('ATK-GEN-001')!;

  it('should exist and target INV-GEN-13', () => {
    expect(attack).toBeDefined();
    expect(attack.tags).toContain('INV-GEN-13');
  });

  it('should be CRITICAL severity', () => {
    expect(attack.severity).toBe('CRITICAL');
  });

  it('should be mandatory', () => {
    expect(attack.mandatory).toBe(true);
  });

  it('should target canonical serialization', () => {
    expect(attack.tags).toContain('canonical');
    expect(attack.tags).toContain('fingerprint');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ATK-GEN-002: FLOAT DRIFT
// ═══════════════════════════════════════════════════════════════════════════════

describe('ATK-GEN-002: Float Drift Attack', () => {
  const attack = getAttack('ATK-GEN-002')!;

  it('should exist and target INV-GEN-14', () => {
    expect(attack).toBeDefined();
    expect(attack.tags).toContain('INV-GEN-14');
  });

  it('should be CRITICAL severity', () => {
    expect(attack.severity).toBe('CRITICAL');
  });

  it('should target float quantization', () => {
    expect(attack.tags).toContain('float');
    expect(attack.tags).toContain('quantization');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ATK-GEN-003: METADATA INJECTION
// ═══════════════════════════════════════════════════════════════════════════════

describe('ATK-GEN-003: Metadata Injection', () => {
  const attack = getAttack('ATK-GEN-003')!;

  it('should exist and target INV-GEN-11', () => {
    expect(attack).toBeDefined();
    expect(attack.tags).toContain('INV-GEN-11');
  });

  it('should be CRITICAL severity', () => {
    expect(attack.severity).toBe('CRITICAL');
  });

  it('should target metadata exclusion', () => {
    expect(attack.tags).toContain('metadata');
    expect(attack.tags).toContain('fingerprint');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ATK-GEN-004: EMOTION14 LENGTH VIOLATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('ATK-GEN-004: Emotion14 Length Violation', () => {
  const attack = getAttack('ATK-GEN-004')!;

  it('should exist and target INV-GEN-12', () => {
    expect(attack).toBeDefined();
    expect(attack.tags).toContain('INV-GEN-12');
  });

  it('should be CRITICAL severity', () => {
    expect(attack.severity).toBe('CRITICAL');
  });

  it('should target emotion14 validation', () => {
    expect(attack.tags).toContain('emotion14');
    expect(attack.tags).toContain('validation');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ATK-GEN-005: DISTRIBUTION SUM VIOLATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('ATK-GEN-005: Distribution Sum Violation', () => {
  const attack = getAttack('ATK-GEN-005')!;

  it('should exist and target INV-GEN-04', () => {
    expect(attack).toBeDefined();
    expect(attack.tags).toContain('INV-GEN-04');
  });

  it('should be HIGH severity', () => {
    expect(attack.severity).toBe('HIGH');
  });

  it('should target distribution validation', () => {
    expect(attack.tags).toContain('distribution');
    expect(attack.tags).toContain('validation');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CORPUS STATS WITH GENOME
// ═══════════════════════════════════════════════════════════════════════════════

describe('Corpus Stats with Genome Attacks', () => {
  it('total attacks should include genome attacks', () => {
    const stats = getCorpusStats();
    // Original corpus + 5 genome attacks
    expect(stats.totalAttacks).toBeGreaterThanOrEqual(32);
  });

  it('semantic category should include genome attacks', () => {
    const stats = getCorpusStats();
    // Genome attacks are categorized as semantic
    expect(stats.byCategory.semantic).toBeGreaterThanOrEqual(8);
  });

  it('mandatory attacks should include genome attacks', () => {
    const stats = getCorpusStats();
    expect(stats.mandatoryAttacks).toBeGreaterThanOrEqual(27);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT MAPPING (Genome Attacks → Genome Invariants)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Attack-Invariant Mapping', () => {
  const MAPPING = [
    { attack: 'ATK-GEN-001', invariant: 'INV-GEN-13' },
    { attack: 'ATK-GEN-002', invariant: 'INV-GEN-14' },
    { attack: 'ATK-GEN-003', invariant: 'INV-GEN-11' },
    { attack: 'ATK-GEN-004', invariant: 'INV-GEN-12' },
    { attack: 'ATK-GEN-005', invariant: 'INV-GEN-04' },
  ];

  for (const { attack: attackId, invariant } of MAPPING) {
    it(`${attackId} should target ${invariant}`, () => {
      const attack = getAttack(attackId)!;
      expect(attack.tags).toContain(invariant);
    });
  }
});
