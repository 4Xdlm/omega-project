/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — DÉDALE v0.55 — ORACLE TESTS (ADR-005 r2 COMPOSITE)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Couverture :
 *   - computeTrigramRatio (C1) : prose saine, prose loop, texte trop court
 *   - computeRepetitionScore (C2) : prose saine, bigrammes répétés (info-tag r2)
 *   - computeUniqueRatio (C4) : diversité lexicale
 *   - resolveDefaultOracleThresholds : c1, c1_high, c2, c4 defaults + env override
 *   - createOracle.evaluate (ADR-005 r2) :
 *       * no_loop sur prose saine
 *       * hard_fail avec 'c1_trigram_ratio' quand C1 > c1_high_threshold
 *       * hard_fail avec 'c1_c4_composite' quand C1 > c1_threshold AND C4 < c4_threshold
 *       * no_loop quand C4 seul bas (ADR-005 r2 : C4 alone ne déclenche plus)
 *       * no_loop quand C2 seul élevé (ADR-005 r2 : C2 info-tag uniquement)
 *       * metrics.c2_info_elevated tagué correctement (true si C2 > seuil)
 *   - thresholds override complet
 *   - C3 est RETIRÉ (non testable par design)
 *
 * ADR-005 r2 (2026-04-22) : règle composite
 *   hard_fail ⇔ (C1 > c1_high) OR (C1 > c1_low AND C4 < c4)
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
  it('returns canonical defaults when env vars absent (ADR-005 r2)', () => {
    const previous = {
      c1: process.env.OMEGA_DEDALE_C1_THRESHOLD,
      c1h: process.env.OMEGA_DEDALE_C1_HIGH_THRESHOLD,
      c2: process.env.OMEGA_DEDALE_C2_THRESHOLD,
      c4: process.env.OMEGA_DEDALE_C4_THRESHOLD,
    };
    delete process.env.OMEGA_DEDALE_C1_THRESHOLD;
    delete process.env.OMEGA_DEDALE_C1_HIGH_THRESHOLD;
    delete process.env.OMEGA_DEDALE_C2_THRESHOLD;
    delete process.env.OMEGA_DEDALE_C4_THRESHOLD;
    try {
      const t = resolveDefaultOracleThresholds();
      expect(t.c1_threshold).toBeCloseTo(0.15);
      expect(t.c1_high_threshold).toBeCloseTo(0.20);
      expect(t.c2_threshold).toBeCloseTo(0.60);
      expect(t.c4_threshold).toBeCloseTo(0.30);
    } finally {
      if (previous.c1 !== undefined) process.env.OMEGA_DEDALE_C1_THRESHOLD = previous.c1;
      if (previous.c1h !== undefined) process.env.OMEGA_DEDALE_C1_HIGH_THRESHOLD = previous.c1h;
      if (previous.c2 !== undefined) process.env.OMEGA_DEDALE_C2_THRESHOLD = previous.c2;
      if (previous.c4 !== undefined) process.env.OMEGA_DEDALE_C4_THRESHOLD = previous.c4;
    }
  });

  it('honors OMEGA_DEDALE_C1_HIGH_THRESHOLD env override', () => {
    const previous = process.env.OMEGA_DEDALE_C1_HIGH_THRESHOLD;
    process.env.OMEGA_DEDALE_C1_HIGH_THRESHOLD = '0.25';
    try {
      const t = resolveDefaultOracleThresholds();
      expect(t.c1_high_threshold).toBeCloseTo(0.25);
    } finally {
      if (previous !== undefined) process.env.OMEGA_DEDALE_C1_HIGH_THRESHOLD = previous;
      else delete process.env.OMEGA_DEDALE_C1_HIGH_THRESHOLD;
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// ORACLE — evaluate()
// ──────────────────────────────────────────────────────────────────────────────

describe('createOracle.evaluate (ADR-005 r2)', () => {
  it('returns no_loop on healthy prose', () => {
    const oracle = createOracle(minimalDeps());
    const result = oracle.evaluate(PROSE_SAINE);
    expect(result.verdict).toBe('no_loop');
    expect(result.reason).toBeUndefined();
    expect(result.metrics.c1_trigram_ratio).toBeGreaterThanOrEqual(0);
    expect(result.metrics.c2_repetition_score).toBeGreaterThanOrEqual(0);
    expect(result.metrics.c4_unique_ratio).toBeGreaterThan(0);
    // ADR-005 r2 : c2_info_elevated calculé (boolean, typiquement false sur prose saine)
    expect(typeof result.metrics.c2_info_elevated).toBe('boolean');
  });

  it('returns hard_fail with c1_trigram_ratio when C1 exceeds c1_high_threshold', () => {
    // PROSE_LOOP_TRIGRAMS a C1 très élevé (>0.20) → déclenche seuil haut seul
    const oracle = createOracle(minimalDeps());
    const result = oracle.evaluate(PROSE_LOOP_TRIGRAMS);
    expect(result.verdict).toBe('hard_fail');
    expect(result.reason).toBe('c1_trigram_ratio');
    expect(result.metrics.c1_trigram_ratio).toBeGreaterThan(result.thresholds_used.c1_high_threshold);
  });

  it('ADR-005 r2 : returns hard_fail with c1_c4_composite when C1>low AND C4<c4 (without C1>high)', () => {
    // Forcer la règle composite : C1 dans (c1_low, c1_high] AND C4 < c4
    // Texte répétitif "mot mot mot..." : C4 très bas, C1 en zone intermédiaire selon seuils
    const oracle = createOracle(minimalDeps());
    const text = Array.from({ length: 30 }, () => 'mot').join(' ') + '.';
    // Override : c1_high élevé (pour éviter route "c1_trigram_ratio"), c1_low bas pour toucher composite
    const result = oracle.evaluate(text, {
      c1_threshold: 0.05,        // seuil bas très permissif → C1 > bas quasi certain
      c1_high_threshold: 0.99,   // seuil haut inatteignable
      c2_threshold: 0.99,
      c4_threshold: 0.30,
    });
    expect(result.verdict).toBe('hard_fail');
    expect(result.reason).toBe('c1_c4_composite');
    expect(result.metrics.c1_trigram_ratio).toBeGreaterThan(0.05);
    expect(result.metrics.c1_trigram_ratio).toBeLessThanOrEqual(0.99);
    expect(result.metrics.c4_unique_ratio).toBeLessThan(0.30);
  });

  it('ADR-005 r2 : C4 seul bas ne déclenche plus hard_fail (C1 normal)', () => {
    // Texte avec C4 bas mais C1 dans zone normale (<c1_threshold)
    // PROSE_SAINE a C1 < 0.15. Si on force c4_threshold haut pour que C4 < ce seuil,
    // mais sans toucher C1, on ne doit PAS avoir hard_fail.
    const oracle = createOracle(minimalDeps());
    const result = oracle.evaluate(PROSE_SAINE, {
      c1_threshold: 0.50,       // seuil bas très haut → C1 < bas (prose saine ~0.05)
      c1_high_threshold: 0.99,  // inatteignable
      c2_threshold: 0.99,
      c4_threshold: 0.99,       // force c4_unique_ratio < c4_threshold (C4~0.45 < 0.99)
    });
    // C4 < c4_threshold mais C1 < c1_threshold → pas de composite, pas de hard_fail
    expect(result.verdict).toBe('no_loop');
    expect(result.reason).toBeUndefined();
    expect(result.metrics.c4_unique_ratio).toBeLessThan(0.99);
    expect(result.metrics.c1_trigram_ratio).toBeLessThan(0.50);
  });

  it('ADR-005 r2 : C2 seul élevé ne déclenche plus hard_fail (info-tag only)', () => {
    const oracle = createOracle(minimalDeps());
    const bigramRepeatText =
      'Le chat noir mange la souris. Le chat noir chasse la souris. ' +
      'Le chat noir dort sur le lit. Le chat noir ronronne doucement.';
    const result = oracle.evaluate(bigramRepeatText, {
      c1_threshold: 0.99,        // C1 inatteignable
      c1_high_threshold: 0.99,
      c2_threshold: 0.01,        // C2 quasi-certain au-dessus → info-tag true
      c4_threshold: 0.01,        // C4 sous ce seuil impossible → pas de composite
    });
    // C2 élevé mais sans C1 → pas de hard_fail
    expect(result.verdict).toBe('no_loop');
    expect(result.reason).toBeUndefined();
    expect(result.metrics.c2_info_elevated).toBe(true);
  });

  it('respects thresholds override (forcing hard_fail via composite route)', () => {
    // Texte avec C1 > 0 (trigrammes répétés) et C4 bas (mots peu uniques)
    // → route 'c1_c4_composite' garantie dès c1_low bas et c4 haut
    const oracle = createOracle(minimalDeps());
    const text = Array.from({ length: 30 }, () => 'mot').join(' ') + '.';
    const result = oracle.evaluate(text, {
      c1_threshold: 0.001,       // trivial à franchir (C1 très élevé sur ce texte)
      c1_high_threshold: 0.99,   // inatteignable → route composite
      c2_threshold: 0.001,
      c4_threshold: 0.99,        // C4 ≈ 0.03 < 0.99 → composite OK
    });
    expect(result.verdict).toBe('hard_fail');
    expect(result.reason).toBe('c1_c4_composite');
  });

  it('records evaluated_at_ms from deps.clock', () => {
    const oracle = createOracle({
      clock: () => 42,
      logger: silentLogger(),
    });
    const result = oracle.evaluate(PROSE_SAINE);
    expect(result.evaluated_at_ms).toBe(42);
  });

  it('ADR-005 r2 : C1>c1_high prime sur composite (ordre d\'évaluation)', () => {
    // PROSE_LOOP_TRIGRAMS : C1 très élevé. Avec c1_high=0.15 et c4 très permissif,
    // la route doit être 'c1_trigram_ratio' (seuil haut déclenche seul, prime sur composite).
    const oracle = createOracle(minimalDeps());
    const result = oracle.evaluate(PROSE_LOOP_TRIGRAMS, {
      c1_threshold: 0.05,
      c1_high_threshold: 0.15,
      c2_threshold: 0.99,
      c4_threshold: 0.99,        // condition composite aussi vraie potentiellement
    });
    expect(result.verdict).toBe('hard_fail');
    expect(result.reason).toBe('c1_trigram_ratio');
  });

  it('includes the complete thresholds used in the result (ADR-005 r2)', () => {
    const oracle = createOracle(minimalDeps());
    const result = oracle.evaluate(PROSE_SAINE, {
      c1_threshold: 0.5,
      c1_high_threshold: 0.7,
      c2_threshold: 0.5,
      c4_threshold: 0.1,
    });
    expect(result.thresholds_used.c1_threshold).toBeCloseTo(0.5);
    expect(result.thresholds_used.c1_high_threshold).toBeCloseTo(0.7);
    expect(result.thresholds_used.c2_threshold).toBeCloseTo(0.5);
    expect(result.thresholds_used.c4_threshold).toBeCloseTo(0.1);
  });
});
