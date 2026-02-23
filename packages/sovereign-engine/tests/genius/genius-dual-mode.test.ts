/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * GENIUS SCORER MODE — Tests post-purge legacy
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Phase 4f bascule : legacy/dual PURGÉS — omegaP0 ONLY
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * COVERAGE:
 *   T1: any scorerMode → uses omegaP0 axes, no layer2_dual
 *   T6: omegaP0 mode → G = calibrated weighted sum
 *   T7: AS REJECT → works in omegaP0 mode
 *   T8: default scorerMode → 'omegaP0' (post-bascule)
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';
import { computeGeniusMetrics, type GeniusMetricsInput } from '../../src/genius/genius-metrics.js';

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

describe('Genius Scorer Mode — post-purge legacy/dual', () => {

  // ─── T1: scorerMode field is preserved in output ─────────────────────
  it('T1: scorerMode is preserved in scorer_mode output, no layer2_dual', () => {
    const result = computeGeniusMetrics({ ...BASE_INPUT, scorerMode: 'omegaP0' });

    expect(result.scorer_mode).toBe('omegaP0');
    expect(result.layer2_genius.G).toBeGreaterThan(0);
    expect(result.layer0_gate.AS_GATE_PASS).toBe(true);
    // layer2_dual removed post-purge
    expect((result as Record<string, unknown>)['layer2_dual']).toBeUndefined();
  });

  // ─── T6: omegaP0 mode — G uses calibrated weighted sum ──────────────
  it('T6: omegaP0 mode → G = 0.25D+0.15S+0.05I+0.35R+0.20V', () => {
    const result = computeGeniusMetrics({ ...BASE_INPUT, scorerMode: 'omegaP0' });

    expect(result.scorer_mode).toBe('omegaP0');
    const { D, S, I, R, V } = result.layer2_genius.axes;
    const expectedG = 0.25 * D + 0.15 * S + 0.05 * I + 0.35 * R + 0.20 * V;
    expect(result.layer2_genius.G).toBeCloseTo(expectedG, 5);
  });

  // ─── T7: AS REJECT — works in omegaP0 mode ──────────────────────────
  it('T7: AS REJECT works in omegaP0 mode', () => {
    const result = computeGeniusMetrics({
      text: IA_SMELL_PROSE,
      mode: 'original',
      scorerMode: 'omegaP0',
    });

    expect(result.layer0_gate.AS_GATE_PASS).toBe(false);
    expect(result.layer3_verdict.verdict).toBe('REJECT');
    expect(result.layer2_genius.G).toBe(0);
    expect(result.scorer_mode).toBe('omegaP0');
  });

  // ─── T8: Default scorerMode → omegaP0 (post-bascule) ───────────────
  it('T8: omitting scorerMode defaults to omegaP0', () => {
    const result = computeGeniusMetrics({
      text: CLEAN_PROSE,
      mode: 'original',
    });

    expect(result.scorer_mode).toBe('omegaP0');
    expect(result.layer2_genius.G).toBeGreaterThan(0);
  });
});
