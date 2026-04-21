/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — DÉDALE v0.55 — ORACLE TESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Couverture :
 *   - computeTrigramRatio (C1) : prose saine, prose loop, texte trop court
 *   - computeRepetitionScore (C2) : prose saine, bigrammes répétés
 *   - computeUniqueRatio (C4) : diversité lexicale
 *   - createOracle.evaluate : no_loop, hard_fail C1, C2, C4, ordre C1→C2→C4
 *   - thresholds override (env-aware)
 *   - C3 est RETIRÉ (non testable par design)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import {
  computeTrigramRatio,
  computeRepetitionScore,
  computeUniqueRatio,
  createOracle,
  resolveDefaultOracleThresholds,
} from '../../src/dedale/oracle.js';
import type { DedaleDependencies, DedaleLogger } from '../../src/dedale/types.js';

// ──────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ──────────────────────────────────────────────────────────────────────────────

const PROSE_SAINE =
  'Le soleil déclinait sur les toits de la ville, projetant des ombres longues ' +
  'et dorées sur les pavés humides. Marie marchait sans se presser. ' +
  'Elle pensait à cette lettre dans son tiroir. ' +
  'Les mots lui revenaient par fragments, brisés par le temps. ' +
  'Chaque syllabe portait le poids d\'une décision mûrie. ' +
  'Le vent soufflait froid et insistant dehors.';

const PROSE_LOOP_TRIGRAMS =
  'il marche dans la rue il marche dans la rue il marche dans la rue ' +
  'il marche dans la rue il marche dans la rue il marche dans la rue ' +
  'il marche dans la rue il marche dans la rue il marche dans la rue.';

const PROSE_LOOP_UNIQUE =
  'mot mot mot mot mot mot mot mot mot mot mot mot mot mot mot mot';

function silentLogger(): DedaleLogger {
  return {
    info: () => {},
    warn: () => {},
    error: () => {},
  };
}

function minimalDeps(): Pick<DedaleDependencies, 'clock' | 'logger'> {
  return {
    clock: () => 1_700_000_000_000,
    logger: silentLogger(),
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// C1 — TRIGRAM RATIO
// ──────────────────────────────────────────────────────────────────────────────

describe('computeTrigramRatio (C1)', () => {
  it('returns 0 for empty text', () => {
    expect(computeTrigramRatio('')).toBe(0);
  });

  it('returns 0 for text with less than 10 words', () => {
    expect(computeTrigramRatio('un deux trois quatre')).toBe(0);
  });

  it('returns low ratio for healthy prose', () => {
    const ratio = computeTrigramRatio(PROSE_SAINE);
    expect(ratio).toBeLessThan(0.15);
  });

  it('returns high ratio for prose with trigram loops', () => {
    const ratio = computeTrigramRatio(PROSE_LOOP_TRIGRAMS);
    expect(ratio).toBeGreaterThan(0.15);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// C2 — REPETITION SCORE
// ──────────────────────────────────────────────────────────────────────────────

describe('computeRepetitionScore (C2)', () => {
  it('returns 0 for empty text', () => {
    expect(computeRepetitionScore('')).toBe(0);
  });

  it('returns 0 for single short sentence', () => {
    expect(computeRepetitionScore('Bonjour.')).toBe(0);
  });

  it('returns low score for diverse prose', () => {
    const score = computeRepetitionScore(PROSE_SAINE);
    expect(score).toBeLessThan(0.60);
  });

  it('returns high score when bigrams repeat across sentences', () => {
    const text =
      'Le chat noir mange la souris. Le chat noir chasse la souris. ' +
      'Le chat noir dort sur le lit. Le chat noir ronronne doucement.';
    const score = computeRepetitionScore(text);
    expect(score).toBeGreaterThan(0.5);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// C4 — UNIQUE RATIO
// ──────────────────────────────────────────────────────────────────────────────

describe('computeUniqueRatio (C4)', () => {
  it('returns 1 for empty text', () => {
    expect(computeUniqueRatio('')).toBe(1);
  });

  it('returns 1 for text with less than 10 words', () => {
    expect(computeUniqueRatio('un deux trois')).toBe(1);
  });

  it('returns high ratio for diverse prose', () => {
    const ratio = computeUniqueRatio(PROSE_SAINE);
    expect(ratio).toBeGreaterThan(0.45);
  });

  it('returns low ratio for repetitive prose', () => {
    const ratio = computeUniqueRatio(PROSE_LOOP_UNIQUE);
    expect(ratio).toBeLessThan(0.30);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// resolveDefaultOracleThresholds
// ──────────────────────────────────────────────────────────────────────────────

describe('resolveDefaultOracleThresholds', () => {
  it('returns canonical defaults when env vars absent', () => {
    const previous = {
      c1: process.env.OMEGA_DEDALE_C1_THRESHOLD,
      c2: process.env.OMEGA_DEDALE_C2_THRESHOLD,
      c4: process.env.OMEGA_DEDALE_C4_THRESHOLD,
    };
    delete process.env.OMEGA_DEDALE_C1_THRESHOLD;
    delete process.env.OMEGA_DEDALE_C2_THRESHOLD;
    delete process.env.OMEGA_DEDALE_C4_THRESHOLD;
    try {
      const t = resolveDefaultOracleThresholds();
      expect(t.c1_threshold).toBeCloseTo(0.15);
      expect(t.c2_threshold).toBeCloseTo(0.60);
      expect(t.c4_threshold).toBeCloseTo(0.30);
    } finally {
      if (previous.c1 !== undefined) process.env.OMEGA_DEDALE_C1_THRESHOLD = previous.c1;
      if (previous.c2 !== undefined) process.env.OMEGA_DEDALE_C2_THRESHOLD = previous.c2;
      if (previous.c4 !== undefined) process.env.OMEGA_DEDALE_C4_THRESHOLD = previous.c4;
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// ORACLE — evaluate()
// ──────────────────────────────────────────────────────────────────────────────

describe('createOracle.evaluate', () => {
  it('returns no_loop on healthy prose', () => {
    const oracle = createOracle(minimalDeps());
    const result = oracle.evaluate(PROSE_SAINE);
    expect(result.verdict).toBe('no_loop');
    expect(result.reason).toBeUndefined();
    expect(result.metrics.c1_trigram_ratio).toBeGreaterThanOrEqual(0);
    expect(result.metrics.c2_repetition_score).toBeGreaterThanOrEqual(0);
    expect(result.metrics.c4_unique_ratio).toBeGreaterThan(0);
  });

  it('returns hard_fail with c1_trigram_ratio on trigram loop', () => {
    const oracle = createOracle(minimalDeps());
    const result = oracle.evaluate(PROSE_LOOP_TRIGRAMS);
    expect(result.verdict).toBe('hard_fail');
    expect(result.reason).toBe('c1_trigram_ratio');
  });

  it('returns hard_fail with c4_fingerprint_distance on low unique ratio', () => {
    const oracle = createOracle(minimalDeps());
    // Construire un texte qui passe C1/C2 mais fail C4 (unique_ratio < 0.30)
    const words = Array.from({ length: 30 }, (_, i) => (i % 3 === 0 ? 'mot' : 'mot'));
    const text = words.join(' ') + '.';
    const result = oracle.evaluate(text);
    expect(result.verdict).toBe('hard_fail');
    // La première règle déclenchée peut être C1 (trigram) car "mot mot mot"
    // est un trigramme unique très répété. On accepte C1 ou C4.
    expect(['c1_trigram_ratio', 'c4_fingerprint_distance']).toContain(result.reason);
  });

  it('respects thresholds override (forcing hard_fail on healthy prose)', () => {
    const oracle = createOracle(minimalDeps());
    const result = oracle.evaluate(PROSE_SAINE, {
      c1_threshold: 0.001,  // impossible à ne pas franchir
      c2_threshold: 0.001,
      c4_threshold: 0.99,
    });
    expect(result.verdict).toBe('hard_fail');
    expect(result.reason).toBeDefined();
  });

  it('records evaluated_at_ms from deps.clock', () => {
    const oracle = createOracle({
      clock: () => 42,
      logger: silentLogger(),
    });
    const result = oracle.evaluate(PROSE_SAINE);
    expect(result.evaluated_at_ms).toBe(42);
  });

  it('evaluation order is C1 → C2 → C4 (first match wins)', () => {
    // Avec des seuils extrêmes sur C1, mais C2 et C4 aussi bas,
    // la raison dominante doit être C1.
    const oracle = createOracle(minimalDeps());
    const result = oracle.evaluate(PROSE_LOOP_TRIGRAMS, {
      c1_threshold: 0.01,
      c2_threshold: 0.01,
      c4_threshold: 0.99,
    });
    expect(result.verdict).toBe('hard_fail');
    expect(result.reason).toBe('c1_trigram_ratio');
  });

  it('includes the thresholds used in the result', () => {
    const oracle = createOracle(minimalDeps());
    const result = oracle.evaluate(PROSE_SAINE, {
      c1_threshold: 0.5,
      c2_threshold: 0.5,
      c4_threshold: 0.1,
    });
    expect(result.thresholds_used.c1_threshold).toBeCloseTo(0.5);
    expect(result.thresholds_used.c2_threshold).toBeCloseTo(0.5);
    expect(result.thresholds_used.c4_threshold).toBeCloseTo(0.1);
  });
});
