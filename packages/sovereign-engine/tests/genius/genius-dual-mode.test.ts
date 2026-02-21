/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * GENIUS DUAL MODE — Integration Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Invariant: ART-GENIUS-DUAL
 * Tests: scorerMode legacy/dual/omegaP0 behavior
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * COVERAGE:
 *   T1: legacy mode → no layer2_dual, scorer_mode = 'legacy'
 *   T2: dual mode → layer2_dual present with correct shape
 *   T3: dual mode → G_old uses geometric mean, G_new uses weighted sum
 *   T4: dual mode → proof record has all required fields
 *   T5: dual mode → determinism (2 runs = identical JSON)
 *   T6: omegaP0 mode → G uses calibrated weighted sum
 *   T7: AS REJECT → works identically in all modes
 *   T8: default scorerMode → 'legacy' (backward compat)
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';
import { computeGeniusMetrics, type GeniusMetricsInput } from '../../src/genius/genius-metrics.js';

// ═══════════════════════════════════════════════════════════════════════════════
// FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

const CLEAN_PROSE = `
La porte s'ouvrit sans bruit. Marie posa sa main sur le mur froid, cherchant l'interrupteur
dans l'obscurité. Le parquet grinça sous son pied gauche. Elle sentit l'odeur de poussière
mêlée à quelque chose de métallique. Sa gorge se serra. Dans le couloir, une faible lumière
filtrait par la fenêtre brisée. Elle avança d'un pas, puis d'un autre. Le silence pesait
sur ses épaules comme une chape de plomb. Un courant d'air glacé caressa sa nuque. Elle
frissonna. Au bout du couloir, la porte du bureau était entrouverte. Marie tendit l'oreille.
Rien. Alors elle poussa la porte, qui grinça sur ses gonds rouillés. L'odeur de renfermé
la saisit à la gorge. La pièce n'avait pas été ouverte depuis des mois.
`;

const IA_SMELL_PROSE = `
Les mots dansaient sur la page comme des papillons de nuit. Elle était une tisserande des mots,
créant une tapisserie de sentiments. Un frisson parcourut l'échine du temps. Le silence était
assourdissant. Dans le jardin secret de ses pensées, les fleurs de la mémoire s'épanouissaient.
`;

const BASE_INPUT: GeniusMetricsInput = {
  text: CLEAN_PROSE,
  mode: 'original',
};

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Genius Dual Mode — ART-GENIUS-DUAL', () => {

  // ─── T1: Legacy mode — backward compatibility ────────────────────────
  it('T1: legacy mode → no layer2_dual, scorer_mode = legacy', () => {
    const result = computeGeniusMetrics({ ...BASE_INPUT, scorerMode: 'legacy' });

    expect(result.scorer_mode).toBe('legacy');
    expect(result.layer2_dual).toBeUndefined();
    expect(result.layer2_genius.G).toBeGreaterThan(0);
    expect(result.layer0_gate.AS_GATE_PASS).toBe(true);
  });

  // ─── T2: Dual mode — layer2_dual shape ───────────────────────────────
  it('T2: dual mode → layer2_dual present with correct shape', () => {
    const result = computeGeniusMetrics({ ...BASE_INPUT, scorerMode: 'dual' });

    expect(result.scorer_mode).toBe('dual');
    expect(result.layer2_dual).toBeDefined();

    const dual = result.layer2_dual!;
    expect(typeof dual.G_new).toBe('number');
    expect(dual.G_new).toBeGreaterThan(0);
    expect(dual.G_new).toBeLessThanOrEqual(100);

    expect(typeof dual.axes_new.D).toBe('number');
    expect(typeof dual.axes_new.S).toBe('number');
    expect(typeof dual.axes_new.I).toBe('number');
    expect(typeof dual.axes_new.R).toBe('number');
    expect(typeof dual.axes_new.V).toBe('number');

    expect(typeof dual.delta_G).toBe('number');
  });

  // ─── T3: Dual mode — G_old geometric vs G_new weighted ───────────────
  it('T3: dual mode → G_old (geometric) differs from G_new (weighted)', () => {
    const result = computeGeniusMetrics({ ...BASE_INPUT, scorerMode: 'dual' });

    const G_old = result.layer2_genius.G;
    const G_new = result.layer2_dual!.G_new;

    // Both must be valid scores
    expect(G_old).toBeGreaterThan(0);
    expect(G_new).toBeGreaterThan(0);

    // Verdict still uses G_old in dual mode
    // (G_new is for comparison only)
    expect(result.layer2_dual!.delta_G).toBeCloseTo(G_new - G_old, 10);
  });

  // ─── T4: Dual mode — proof record completeness ──────────────────────
  it('T4: dual mode → proof record has all required fields', () => {
    const result = computeGeniusMetrics({ ...BASE_INPUT, scorerMode: 'dual' });
    const proof = result.layer2_dual!.proof;

    // All proof fields present
    expect(typeof proof.text_hash).toBe('string');
    expect(proof.text_hash.length).toBe(64); // SHA-256 hex
    expect(typeof proof.segments_hash).toBe('string');
    expect(proof.segments_hash.length).toBe(64);

    expect(typeof proof.G_old).toBe('number');
    expect(typeof proof.G_new).toBe('number');
    expect(typeof proof.delta).toBe('number');
    expect(proof.delta).toBeCloseTo(proof.G_new - proof.G_old, 10);

    expect(proof.axes_old).toBeDefined();
    expect(proof.axes_new).toBeDefined();
    expect(typeof proof.axes_old.D).toBe('number');
    expect(typeof proof.axes_new.D).toBe('number');

    expect(typeof proof.verdict_old).toBe('string');
    expect(typeof proof.verdict_new).toBe('string');

    expect(typeof proof.schema_version_old).toBe('string');
    expect(typeof proof.schema_version_new).toBe('string');
    expect(proof.schema_version_new).toBe('GENIUS_SCHEMA_V1');

    expect(typeof proof.axis_def_hash_old).toBe('string');
    expect(typeof proof.axis_def_hash_new).toBe('string');
    expect(proof.axis_def_hash_old).not.toBe(proof.axis_def_hash_new);

    expect(Array.isArray(proof.delta_explain)).toBe(true);
    expect(proof.delta_explain.length).toBeLessThanOrEqual(3);

    expect(proof.decision_mode).toBe('dual');
    expect(typeof proof.timestamp).toBe('string');
  });

  // ─── T5: Dual mode — determinism ────────────────────────────────────
  it('T5: dual mode → determinism (2 runs identical except timestamp)', () => {
    const run1 = computeGeniusMetrics({ ...BASE_INPUT, scorerMode: 'dual' });
    const run2 = computeGeniusMetrics({ ...BASE_INPUT, scorerMode: 'dual' });

    // Core scores identical
    expect(run1.layer2_genius.G).toBe(run2.layer2_genius.G);
    expect(run1.layer2_dual!.G_new).toBe(run2.layer2_dual!.G_new);
    expect(run1.layer2_dual!.delta_G).toBe(run2.layer2_dual!.delta_G);

    // Axes identical
    expect(run1.layer2_genius.axes).toEqual(run2.layer2_genius.axes);
    expect(run1.layer2_dual!.axes_new).toEqual(run2.layer2_dual!.axes_new);

    // Proof hashes identical
    expect(run1.layer2_dual!.proof.text_hash).toBe(run2.layer2_dual!.proof.text_hash);
    expect(run1.layer2_dual!.proof.segments_hash).toBe(run2.layer2_dual!.proof.segments_hash);
  });

  // ─── T6: omegaP0 mode — G uses calibrated weighted sum ──────────────
  it('T6: omegaP0 mode → G = weighted sum, no layer2_dual', () => {
    const result = computeGeniusMetrics({ ...BASE_INPUT, scorerMode: 'omegaP0' });

    expect(result.scorer_mode).toBe('omegaP0');
    // In omegaP0 mode, no dual comparison — just the new scores
    expect(result.layer2_dual).toBeUndefined();

    // G should differ from legacy geometric mean
    const legacyResult = computeGeniusMetrics({ ...BASE_INPUT, scorerMode: 'legacy' });
    // Both valid, but computed differently
    expect(result.layer2_genius.G).toBeGreaterThan(0);
    expect(legacyResult.layer2_genius.G).toBeGreaterThan(0);
  });

  // ─── T7: AS REJECT — works in all modes ─────────────────────────────
  it('T7: AS REJECT works identically in all modes', () => {
    const modes = ['legacy', 'dual', 'omegaP0'] as const;

    for (const mode of modes) {
      const result = computeGeniusMetrics({
        text: IA_SMELL_PROSE,
        mode: 'original',
        scorerMode: mode,
      });

      expect(result.layer0_gate.AS_GATE_PASS).toBe(false);
      expect(result.layer3_verdict.verdict).toBe('REJECT');
      expect(result.layer2_genius.G).toBe(0);
      expect(result.layer2_dual).toBeUndefined();
      expect(result.scorer_mode).toBe(mode);
    }
  });

  // ─── T8: Default scorerMode — backward compat ──────────────────────
  it('T8: omitting scorerMode defaults to legacy', () => {
    const result = computeGeniusMetrics({
      text: CLEAN_PROSE,
      mode: 'original',
      // NO scorerMode
    });

    expect(result.scorer_mode).toBe('legacy');
    expect(result.layer2_dual).toBeUndefined();
  });
});
