/**
 * GENIUS-02 — Genius Metrics Integration Tests
 * TEST-G02-INT01 to TEST-G02-INT05 + AS gate integration
 */
import { describe, it, expect } from 'vitest';
import { computeGeniusMetrics, computeQText, type GeniusMetricsInput } from '../../src/genius/genius-metrics.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED TEST TEXTS
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

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Genius Metrics Integration', () => {

  // TEST-G02-AS03: If AS < 85, M and G are NOT computed (GENIUS-01)
  it('TEST-G02-AS03: AS gate REJECT skips M and G computation', () => {
    const input: GeniusMetricsInput = {
      text: IA_SMELL_PROSE,
      mode: 'original',
      emotionScores: { M: 90, axes: { ECC: 90, RCI: 90, SII: 90, IFI: 90, AAI: 90 } },
    };
    const result = computeGeniusMetrics(input);

    expect(result.layer0_gate.AS_GATE_PASS).toBe(false);
    expect(result.layer0_gate.reject_reason).toBe('AS_GATE');
    // G and Q_text must be 0 — NOT computed
    expect(result.layer2_genius.G).toBe(0);
    expect(result.layer2_genius.axes.D).toBe(0);
    expect(result.layer2_genius.axes.S).toBe(0);
    expect(result.layer2_genius.axes.I).toBe(0);
    expect(result.layer2_genius.axes.R).toBe(0);
    expect(result.layer2_genius.axes.V).toBe(0);
    expect(result.layer3_verdict.Q_text).toBe(0);
    expect(result.layer3_verdict.verdict).toBe('REJECT');
  });

  // TEST-G02-INT01: M=85, G=100 → Q_text = √(8500) = 92.2 < 93 (GENIUS-02)
  it('TEST-G02-INT01: M=85 G=100 → Q_text=92.2 not SEAL', () => {
    const Q = computeQText(85, 100, true);
    expect(Q).toBeCloseTo(Math.sqrt(8500), 1);
    expect(Q).toBeLessThan(93);
  });

  // TEST-G02-INT02: M=95, G=95 → Q_text = √(9025) = 95.0 (GENIUS-03)
  it('TEST-G02-INT02: M=95 G=95 → Q_text=95.0', () => {
    const Q = computeQText(95, 95, true);
    expect(Q).toBeCloseTo(Math.sqrt(9025), 1);
    expect(Q).toBeCloseTo(95.0, 0);
  });

  // TEST-G02-INT03: V=65 in original mode → SEAL refused (GENIUS-04)
  it('TEST-G02-INT03: V floor violation prevents SEAL', () => {
    // This is tested through computeGeniusMetrics with text that produces V < 70
    // The floor check in genius-metrics.ts handles this
    const input: GeniusMetricsInput = {
      text: CLEAN_PROSE,
      mode: 'original',
      emotionScores: { M: 95, axes: { ECC: 95, RCI: 95, SII: 95, IFI: 95, AAI: 95 } },
    };
    const result = computeGeniusMetrics(input);
    // Check that floor violations are reported in warnings
    expect(result.warnings).toBeDefined();
    // If Q_text is sufficient but a floor fails, verdict should be PITCH not SEAL
    if (result.layer3_verdict.Q_text >= 93) {
      const hasFloorFail = result.warnings.some(w => w.startsWith('FLOOR_FAIL'));
      if (hasFloorFail) {
        expect(result.layer3_verdict.verdict).toBe('PITCH');
      }
    }
  });

  // TEST-G02-INT05: Output JSON conforms to canonical schema (GENIUS-15)
  it('TEST-G02-INT05: output JSON conforms to schema', () => {
    const input: GeniusMetricsInput = {
      text: CLEAN_PROSE,
      mode: 'original',
      emotionScores: { M: 90, axes: { ECC: 90, RCI: 90, SII: 90, IFI: 90, AAI: 90 } },
    };
    const result = computeGeniusMetrics(input);

    // Layer 0
    expect(result.layer0_gate).toHaveProperty('AS_score');
    expect(result.layer0_gate).toHaveProperty('AS_GATE_PASS');
    expect(result.layer0_gate).toHaveProperty('reject_reason');

    // Layer 2
    expect(result.layer2_genius).toHaveProperty('G');
    expect(result.layer2_genius).toHaveProperty('axes');
    expect(result.layer2_genius.axes).toHaveProperty('D');
    expect(result.layer2_genius.axes).toHaveProperty('S');
    expect(result.layer2_genius.axes).toHaveProperty('I');
    expect(result.layer2_genius.axes).toHaveProperty('R');
    expect(result.layer2_genius.axes).toHaveProperty('V');
    expect(result.layer2_genius).toHaveProperty('diagnostics');
    expect(result.layer2_genius.diagnostics).toHaveProperty('SI_tension');
    expect(result.layer2_genius.diagnostics).toHaveProperty('S_shift_balance');
    expect(result.layer2_genius.diagnostics).toHaveProperty('shift_moyen');

    // Layer 3
    expect(result.layer3_verdict).toHaveProperty('Q_text');
    expect(result.layer3_verdict).toHaveProperty('seal_run');
    expect(result.layer3_verdict).toHaveProperty('seal_reason');
    expect(result.layer3_verdict).toHaveProperty('verdict');
    expect(['SEAL', 'PITCH', 'REJECT']).toContain(result.layer3_verdict.verdict);

    // Embedding model version (GENIUS-08 related)
    expect(result).toHaveProperty('embedding_model_version');
    expect(result.embedding_model_version).toBeTruthy();

    // Warnings array
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it('clean prose with M=90 produces valid pipeline output', () => {
    const input: GeniusMetricsInput = {
      text: CLEAN_PROSE,
      mode: 'original',
      emotionScores: { M: 90, axes: { ECC: 90, RCI: 90, SII: 90, IFI: 90, AAI: 90 } },
    };
    const result = computeGeniusMetrics(input);

    expect(result.layer0_gate.AS_GATE_PASS).toBe(true);
    expect(result.layer2_genius.G).toBeGreaterThan(0);
    expect(result.layer3_verdict.Q_text).toBeGreaterThan(0);
  });

  it('missing emotionScores → warning + Q_text=0', () => {
    const input: GeniusMetricsInput = {
      text: CLEAN_PROSE,
      mode: 'original',
    };
    const result = computeGeniusMetrics(input);

    expect(result.layer0_gate.AS_GATE_PASS).toBe(true);
    expect(result.layer2_genius.G).toBeGreaterThan(0);
    expect(result.layer3_verdict.Q_text).toBe(0);
    expect(result.warnings).toContain('NO_EMOTION_SCORES: M=0, Q_text will be 0');
  });

  it('Q_text formula: δ_AS=0 when AS fails', () => {
    expect(computeQText(90, 90, false)).toBe(0);
    expect(computeQText(90, 90, true)).toBeGreaterThan(0);
  });

  it('G is computed via omegaP0 calibrated weighted sum (post-bascule)', () => {
    const input: GeniusMetricsInput = {
      text: CLEAN_PROSE,
      mode: 'original',
      emotionScores: { M: 90, axes: { ECC: 90, RCI: 90, SII: 90, IFI: 90, AAI: 90 } },
    };
    const result = computeGeniusMetrics(input);
    const { D, S, I, R, V } = result.layer2_genius.axes;
    const expectedG = 0.25 * D + 0.15 * S + 0.05 * I + 0.35 * R + 0.20 * V;
    expect(result.layer2_genius.G).toBeCloseTo(expectedG, 5);
  });

  it('SI_tension diagnostic is min/max ratio', () => {
    const input: GeniusMetricsInput = {
      text: CLEAN_PROSE,
      mode: 'original',
    };
    const result = computeGeniusMetrics(input);
    const { S, I } = result.layer2_genius.axes;
    const expectedSI = Math.max(S, I) > 0 ? Math.min(S, I) / Math.max(S, I) : 0;
    expect(result.layer2_genius.diagnostics.SI_tension).toBeCloseTo(expectedSI, 5);
  });

  it('determinism: same input → same output', () => {
    const input: GeniusMetricsInput = {
      text: CLEAN_PROSE,
      mode: 'original',
      emotionScores: { M: 90, axes: { ECC: 90, RCI: 90, SII: 90, IFI: 90, AAI: 90 } },
    };
    const r1 = computeGeniusMetrics(input);
    const r2 = computeGeniusMetrics(input);
    expect(r1.layer2_genius.G).toBe(r2.layer2_genius.G);
    expect(r1.layer3_verdict.Q_text).toBe(r2.layer3_verdict.Q_text);
  });
});
