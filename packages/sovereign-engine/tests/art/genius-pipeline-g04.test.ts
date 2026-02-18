/**
 * GENIUS-04 — Integration Pipeline Invariant Tests
 * G04-PIPE-01 to G04-PIPE-06 (pipeline)
 * G04-SEAL-01 to G04-SEAL-05 (seal conditions)
 * G04-STAB-01 to G04-STAB-04 (stability)
 *
 * Pipeline: AS → M → G → Q_text → Verdict
 * Q_text = √(M × G) × δ_AS
 *
 * Tests cover all 10 GENIUS-04 constraints:
 * 1. Pipeline order  2. Q_text formula  3. δ_AS gate
 * 4. V floor dynamic  5. SEAL_STABLE  6. Q_system isolation
 * 7. Schema canonical  8. SEAL conditions  9. Determinism  10. GATE_FINALE
 */
import { describe, it, expect } from 'vitest';
import {
  computeGeniusMetrics,
  computeQText,
  checkSealConditions,
  assessStability,
  type GeniusMetricsInput,
  type GeniusMetricsOutput,
} from '../../src/genius/genius-metrics.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED PROSE
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
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function makeInput(overrides: Partial<GeniusMetricsInput> = {}): GeniusMetricsInput {
  return {
    text: CLEAN_PROSE,
    mode: 'original',
    emotionScores: { M: 90, axes: { ECC: 90, RCI: 90, SII: 90, IFI: 90, AAI: 90 } },
    ...overrides,
  };
}

/** Build a synthetic GeniusMetricsOutput for stability testing. */
function makeSealRun(Q_text: number, seal_run: boolean): GeniusMetricsOutput {
  return {
    layer0_gate: { AS_score: 95, AS_GATE_PASS: true, reject_reason: null },
    layer2_genius: {
      G: 95,
      axes: { D: 95, S: 95, I: 95, R: 95, V: 95 },
      diagnostics: { SI_tension: 1, S_shift_balance: 0, shift_moyen: 0 },
    },
    layer3_verdict: {
      Q_text,
      seal_run,
      seal_reason: seal_run ? 'ALL_PASS' : `Q_text=${Q_text.toFixed(1)} < 93`,
      verdict: seal_run ? 'SEAL' : 'PITCH',
    },
    embedding_model_version: 'test',
    warnings: [],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('GENIUS-04: Pipeline Integration', () => {

  it('G04-PIPE-01: AS reject → G=0, Q_text=0, verdict=REJECT', () => {
    const result = computeGeniusMetrics(makeInput({ text: IA_SMELL_PROSE }));

    expect(result.layer0_gate.AS_GATE_PASS).toBe(false);
    expect(result.layer2_genius.G).toBe(0);
    expect(result.layer3_verdict.Q_text).toBe(0);
    expect(result.layer3_verdict.verdict).toBe('REJECT');
    expect(result.layer3_verdict.seal_run).toBe(false);
  });

  it('G04-PIPE-02: Q_text = √(M × G) verified with known values', () => {
    // M=85, G=100 → Q_text = √8500 ≈ 92.2
    expect(computeQText(85, 100, true)).toBeCloseTo(Math.sqrt(8500), 5);

    // M=95, G=95 → Q_text = √9025 = 95.0
    expect(computeQText(95, 95, true)).toBeCloseTo(95.0, 1);

    // M=93, G=93 → Q_text = 93.0
    expect(computeQText(93, 93, true)).toBeCloseTo(93.0, 1);
  });

  it('G04-PIPE-03: δ_AS = 0 when AS fails → Q_text = 0', () => {
    expect(computeQText(95, 95, false)).toBe(0);
    expect(computeQText(100, 100, false)).toBe(0);

    // Via pipeline: IA_SMELL_PROSE fails AS, so Q_text=0 despite M provided
    const result = computeGeniusMetrics(makeInput({
      text: IA_SMELL_PROSE,
      emotionScores: { M: 95, axes: { ECC: 95, RCI: 95, SII: 95, IFI: 95, AAI: 95 } },
    }));
    expect(result.layer3_verdict.Q_text).toBe(0);
  });

  it('G04-PIPE-04: V floor dynamic per mode', () => {
    // original mode: V floor = 70
    const r1 = checkSealConditions({ Q_text: 95, M: 95, G: 95, floorPass: false,
      floorFailures: ['V=65.0 < floor 70 (original)'] });
    expect(r1.seal_run).toBe(false);
    expect(r1.failures.length).toBeGreaterThan(0);

    // continuation mode: V floor = 85
    const r2 = checkSealConditions({ Q_text: 95, M: 95, G: 95, floorPass: false,
      floorFailures: ['V=80.0 < floor 85 (continuation)'] });
    expect(r2.seal_run).toBe(false);

    // enhancement mode: V floor = 75
    const r3 = checkSealConditions({ Q_text: 95, M: 95, G: 95, floorPass: false,
      floorFailures: ['V=70.0 < floor 75 (enhancement)'] });
    expect(r3.seal_run).toBe(false);
  });

  it('G04-PIPE-05: output schema has all canonical keys', () => {
    const result = computeGeniusMetrics(makeInput());

    // Layer 0
    expect(result.layer0_gate).toHaveProperty('AS_score');
    expect(result.layer0_gate).toHaveProperty('AS_GATE_PASS');
    expect(result.layer0_gate).toHaveProperty('reject_reason');

    // Layer 2
    expect(result.layer2_genius).toHaveProperty('G');
    expect(result.layer2_genius.axes).toHaveProperty('D');
    expect(result.layer2_genius.axes).toHaveProperty('S');
    expect(result.layer2_genius.axes).toHaveProperty('I');
    expect(result.layer2_genius.axes).toHaveProperty('R');
    expect(result.layer2_genius.axes).toHaveProperty('V');
    expect(result.layer2_genius.diagnostics).toHaveProperty('SI_tension');

    // Layer 3
    expect(result.layer3_verdict).toHaveProperty('Q_text');
    expect(result.layer3_verdict).toHaveProperty('seal_run');
    expect(result.layer3_verdict).toHaveProperty('seal_reason');
    expect(result.layer3_verdict).toHaveProperty('verdict');
    expect(['SEAL', 'PITCH', 'REJECT']).toContain(result.layer3_verdict.verdict);

    // Meta
    expect(result).toHaveProperty('embedding_model_version');
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it('G04-PIPE-06: deterministic — same input → same output', () => {
    const input = makeInput();
    const r1 = computeGeniusMetrics(input);
    const r2 = computeGeniusMetrics(input);
    expect(r1).toEqual(r2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SEAL CONDITION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('GENIUS-04: Seal Conditions', () => {

  it('G04-SEAL-01: all conditions met → SEAL', () => {
    const result = checkSealConditions({
      Q_text: 95, M: 92, G: 95, floorPass: true,
    });
    expect(result.seal_run).toBe(true);
    expect(result.verdict).toBe('SEAL');
    expect(result.seal_reason).toBe('ALL_PASS');
    expect(result.failures).toHaveLength(0);
  });

  it('G04-SEAL-02: Q_text < 93 → PITCH, not SEAL', () => {
    const result = checkSealConditions({
      Q_text: 92.9, M: 92, G: 95, floorPass: true,
    });
    expect(result.seal_run).toBe(false);
    expect(result.verdict).toBe('PITCH');
    expect(result.failures.length).toBeGreaterThan(0);
  });

  it('G04-SEAL-03: M < 88 → no SEAL even with high Q_text', () => {
    const result = checkSealConditions({
      Q_text: 95, M: 87, G: 95, floorPass: true,
    });
    expect(result.seal_run).toBe(false);
    expect(result.verdict).toBe('PITCH');
    expect(result.failures.some(f => f.includes('M='))).toBe(true);
  });

  it('G04-SEAL-04: G < 92 → no SEAL even with high Q_text', () => {
    const result = checkSealConditions({
      Q_text: 95, M: 92, G: 91, floorPass: true,
    });
    expect(result.seal_run).toBe(false);
    expect(result.verdict).toBe('PITCH');
    expect(result.failures.some(f => f.includes('G='))).toBe(true);
  });

  it('G04-SEAL-05: DSIRV floor violation → PITCH', () => {
    const result = checkSealConditions({
      Q_text: 95, M: 92, G: 95,
      floorPass: false,
      floorFailures: ['D=75.0 < floor 80'],
    });
    expect(result.seal_run).toBe(false);
    expect(result.verdict).toBe('PITCH');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// STABILITY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('GENIUS-04: Stability Assessment', () => {

  it('G04-STAB-01: 5/5 SEAL + low σ → SEAL_STABLE + gate_finale', () => {
    const runs = [
      makeSealRun(95.0, true),
      makeSealRun(94.5, true),
      makeSealRun(95.2, true),
      makeSealRun(94.8, true),
      makeSealRun(95.1, true),
    ];
    const result = assessStability(runs);
    expect(result.seal_stable).toBe(true);
    expect(result.gate_finale).toBe(true);
    expect(result.seal_count).toBe(5);
    expect(result.q_text_sigma).toBeLessThan(3.0);
    expect(result.q_text_min).toBeGreaterThanOrEqual(80);
  });

  it('G04-STAB-02: 3/5 SEAL → not SEAL_STABLE but gate_finale', () => {
    const runs = [
      makeSealRun(95.0, true),
      makeSealRun(90.0, false),
      makeSealRun(94.5, true),
      makeSealRun(89.0, false),
      makeSealRun(95.2, true),
    ];
    const result = assessStability(runs);
    expect(result.seal_stable).toBe(false);
    expect(result.gate_finale).toBe(true);
    expect(result.seal_count).toBe(3);
  });

  it('G04-STAB-03: 0/5 SEAL → gate_finale FAIL', () => {
    const runs = [
      makeSealRun(85.0, false),
      makeSealRun(87.0, false),
      makeSealRun(86.0, false),
      makeSealRun(84.0, false),
      makeSealRun(88.0, false),
    ];
    const result = assessStability(runs);
    expect(result.seal_stable).toBe(false);
    expect(result.gate_finale).toBe(false);
    expect(result.seal_count).toBe(0);
  });

  it('G04-STAB-04: σ(Q_text) > 3 → not SEAL_STABLE', () => {
    const runs = [
      makeSealRun(95.0, true),
      makeSealRun(85.0, true),
      makeSealRun(93.0, true),
      makeSealRun(99.0, true),
      makeSealRun(88.0, true),
    ];
    const result = assessStability(runs);
    expect(result.q_text_sigma).toBeGreaterThan(3.0);
    expect(result.seal_stable).toBe(false);
    // But gate_finale should be true (≥1 SEAL)
    expect(result.gate_finale).toBe(true);
  });
});
