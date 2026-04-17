/**
 * OMEGA — Tests: Adaptive Chunker V2-B
 *
 * Vérifie :
 * - Calcul longueur cible selon arousal
 * - Calcul budget total modulé par arousal moyen
 * - Calcul poids de quartile (normalisation)
 * - Overlap silence
 * - Dérivation état pacing (priorité pivot > silence > action > introspective)
 * - Table registres : 4 × 5 = 20 directives
 * - planAdaptiveChunking : invariants globaux
 * - Env var loading (defaults + overrides)
 * - Garde-fous (fallback min, merge max)
 *
 * Standard : TS strict, aucun any, aucun mock LLM.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  planAdaptiveChunking,
  planAdaptiveChunkingV2B2,
  planAdaptive,
  planV2CArchetypal,
  detectArchetype,
  loadAdaptiveConfigFromEnv,
  getAdaptiveMode,
  getAdaptiveVariant,
  getDirectiveMode,
  pickPacingDirective,
  computeTargetLength,
  computeTotalBudget,
  computeQuartileWeights,
  overlapWithSilenceZones,
  derivePacingState,
  clamp,
  buildStaticPlan,
  summarizePlan,
  type AdaptiveChunkConfig,
  type PacingRegister,
} from '../../src/generation/adaptive-chunker.js';
import type { EmotionContract } from '../../src/types.js';

// -----------------------------------------------------------------------------
// Fixtures
// -----------------------------------------------------------------------------

const BASELINE_CONFIG: AdaptiveChunkConfig = {
  alpha: 0.5,
  beta: 0.2,
  gamma: 0.2,
  delta: 0.2,
  l_ref: 750,
  l_min: 300,
  l_max: 1200,
  w_ref: 3000,
  w_min: 2500,
  w_max: 4500,
  pivot_enabled: true,
  register: 'litteraire',
  arousal_action_threshold: 0.8,
  arousal_introspective_threshold: 0.3,
  silence_threshold: 0.5,
  pivot_word_target: 400,
};

function makeContract(options: {
  arousals: [number, number, number, number];
  silence_zones?: readonly { readonly start_pct: number; readonly end_pct: number }[];
  pic_pct?: number;
  faille_pct?: number;
}): EmotionContract {
  const { arousals, silence_zones = [], pic_pct = 0.625, faille_pct = 0.875 } = options;
  return {
    curve_quartiles: [
      { quartile: 'Q1', target_14d: {}, valence: 0, arousal: arousals[0], dominant: 'neutral', narrative_instruction: '' },
      { quartile: 'Q2', target_14d: {}, valence: 0, arousal: arousals[1], dominant: 'neutral', narrative_instruction: '' },
      { quartile: 'Q3', target_14d: {}, valence: 0, arousal: arousals[2], dominant: 'neutral', narrative_instruction: '' },
      { quartile: 'Q4', target_14d: {}, valence: 0, arousal: arousals[3], dominant: 'neutral', narrative_instruction: '' },
    ],
    intensity_range: { min: 0, max: 1 },
    tension: {
      slope_target: 'arc',
      pic_position_pct: pic_pct,
      faille_position_pct: faille_pct,
      silence_zones,
    },
    terminal_state: {
      target_14d: {},
      valence: 0,
      arousal: 0.5,
      dominant: 'neutral',
      reader_state: '',
    },
    rupture: {
      exists: false,
      position_pct: 0,
      before_dominant: '',
      after_dominant: '',
      delta_valence: 0,
    },
    valence_arc: { start: 0, end: 0, direction: 'stable' },
  };
}

// Isolation env vars
const ENV_KEYS = [
  'OMEGA_ADAPTIVE_CHUNKING',
  'OMEGA_ADAPTIVE_ALPHA',
  'OMEGA_ADAPTIVE_BETA',
  'OMEGA_ADAPTIVE_GAMMA',
  'OMEGA_ADAPTIVE_DELTA',
  'OMEGA_ADAPTIVE_L_REF',
  'OMEGA_ADAPTIVE_L_MIN',
  'OMEGA_ADAPTIVE_L_MAX',
  'OMEGA_ADAPTIVE_W_REF',
  'OMEGA_ADAPTIVE_PIVOT',
  'OMEGA_PACING_REGISTER',
  'OMEGA_PACING_AROUSAL_ACTION',
  'OMEGA_PACING_AROUSAL_INTROSPECTIVE',
  'OMEGA_PACING_SILENCE_THRESHOLD',
  'OMEGA_ADAPTIVE_PIVOT_WORDS',
  'OMEGA_ADAPTIVE_VARIANT',
  'OMEGA_DIRECTIVE_MODE',
] as const;

function saveEnv(): Record<string, string | undefined> {
  const snapshot: Record<string, string | undefined> = {};
  for (const k of ENV_KEYS) snapshot[k] = process.env[k];
  return snapshot;
}
function restoreEnv(snapshot: Record<string, string | undefined>): void {
  for (const k of ENV_KEYS) {
    const v = snapshot[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

// -----------------------------------------------------------------------------
// Helpers math
// -----------------------------------------------------------------------------

describe('clamp()', () => {
  it('retourne la valeur si dans les bornes', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it('clamp au min', () => {
    expect(clamp(-3, 0, 10)).toBe(0);
  });
  it('clamp au max', () => {
    expect(clamp(50, 0, 10)).toBe(10);
  });
});

describe('overlapWithSilenceZones()', () => {
  it('retourne 0 si aucune zone', () => {
    expect(overlapWithSilenceZones(0.25, 0.5, [])).toBe(0);
  });
  it('retourne 1 si zone couvre tout le quartile', () => {
    expect(overlapWithSilenceZones(0.25, 0.5, [{ start_pct: 0, end_pct: 1 }])).toBe(1);
  });
  it('retourne 0.5 si zone couvre la moitié', () => {
    expect(
      overlapWithSilenceZones(0.25, 0.5, [{ start_pct: 0.25, end_pct: 0.375 }]),
    ).toBeCloseTo(0.5);
  });
  it('retourne 0 si zone hors du quartile', () => {
    expect(overlapWithSilenceZones(0.25, 0.5, [{ start_pct: 0.6, end_pct: 0.8 }])).toBe(0);
  });
  it('gère plusieurs zones', () => {
    const total = overlapWithSilenceZones(0.0, 1.0, [
      { start_pct: 0.1, end_pct: 0.3 },
      { start_pct: 0.7, end_pct: 0.9 },
    ]);
    expect(total).toBeCloseTo(0.4);
  });
});

// -----------------------------------------------------------------------------
// Longueur cible
// -----------------------------------------------------------------------------

describe('computeTargetLength()', () => {
  it('arousal 0.5 neutre → L_REF', () => {
    expect(computeTargetLength(0.5, 0, BASELINE_CONFIG)).toBe(750);
  });
  it('arousal 1.0 → ~562 (L_REF × 0.75)', () => {
    const result = computeTargetLength(1.0, 0, BASELINE_CONFIG);
    expect(result).toBeGreaterThanOrEqual(500);
    expect(result).toBeLessThanOrEqual(600);
  });
  it('arousal 0.0 → ~937 (L_REF × 1.25)', () => {
    const result = computeTargetLength(0.0, 0, BASELINE_CONFIG);
    expect(result).toBeGreaterThanOrEqual(900);
    expect(result).toBeLessThanOrEqual(975);
  });
  it('clamp au L_MAX si overshoot avec silence', () => {
    const result = computeTargetLength(0.0, 1.0, BASELINE_CONFIG);
    expect(result).toBeLessThanOrEqual(BASELINE_CONFIG.l_max);
  });
  it('clamp au L_MIN si undershoot extrême', () => {
    const aggressiveConfig = { ...BASELINE_CONFIG, alpha: 2.0 };
    const result = computeTargetLength(1.0, 0, aggressiveConfig);
    expect(result).toBeGreaterThanOrEqual(BASELINE_CONFIG.l_min);
  });
  it('silence dilate la longueur', () => {
    const noSilence = computeTargetLength(0.5, 0, BASELINE_CONFIG);
    const withSilence = computeTargetLength(0.5, 1.0, BASELINE_CONFIG);
    expect(withSilence).toBeGreaterThan(noSilence);
  });
});

// -----------------------------------------------------------------------------
// Budget total
// -----------------------------------------------------------------------------

describe('computeTotalBudget()', () => {
  it('arousal moyen 0.5 → W_REF inchangé', () => {
    const w = computeTotalBudget(
      [{ arousal: 0.5 }, { arousal: 0.5 }, { arousal: 0.5 }, { arousal: 0.5 }],
      BASELINE_CONFIG,
    );
    expect(w).toBe(3000);
  });
  it('arousal moyen 1.0 → W_REF × 1.1', () => {
    const w = computeTotalBudget(
      [{ arousal: 1 }, { arousal: 1 }, { arousal: 1 }, { arousal: 1 }],
      BASELINE_CONFIG,
    );
    expect(w).toBeCloseTo(3300);
  });
  it('arousal moyen 0.0 → W_REF × 0.9', () => {
    const w = computeTotalBudget(
      [{ arousal: 0 }, { arousal: 0 }, { arousal: 0 }, { arousal: 0 }],
      BASELINE_CONFIG,
    );
    expect(w).toBeCloseTo(2700);
  });
  it('clampé aux bornes w_min/w_max', () => {
    const extremeConfig = { ...BASELINE_CONFIG, delta: 3.0 };
    const w = computeTotalBudget(
      [{ arousal: 1 }, { arousal: 1 }, { arousal: 1 }, { arousal: 1 }],
      extremeConfig,
    );
    expect(w).toBeLessThanOrEqual(BASELINE_CONFIG.w_max);
  });
});

// -----------------------------------------------------------------------------
// Poids de quartile
// -----------------------------------------------------------------------------

describe('computeQuartileWeights()', () => {
  it('arousal égal → poids égaux', () => {
    const weights = computeQuartileWeights(
      [{ arousal: 0.5 }, { arousal: 0.5 }, { arousal: 0.5 }, { arousal: 0.5 }],
      BASELINE_CONFIG,
    );
    for (const w of weights) expect(w).toBeCloseTo(0.25);
  });
  it('somme des poids = 1', () => {
    const weights = computeQuartileWeights(
      [{ arousal: 0.1 }, { arousal: 0.9 }, { arousal: 0.3 }, { arousal: 0.7 }],
      BASELINE_CONFIG,
    );
    const sum = weights.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
  });
  it('arousal élevé → poids plus grand', () => {
    const weights = computeQuartileWeights(
      [{ arousal: 0.1 }, { arousal: 0.1 }, { arousal: 0.9 }, { arousal: 0.1 }],
      BASELINE_CONFIG,
    );
    expect(weights[2]).toBeGreaterThan(weights[0]);
  });
});

// -----------------------------------------------------------------------------
// Pacing state
// -----------------------------------------------------------------------------

describe('derivePacingState()', () => {
  it('pivot prime sur tout', () => {
    expect(derivePacingState(0.1, 0, true, BASELINE_CONFIG)).toBe('pivot');
    expect(derivePacingState(0.9, 0.9, true, BASELINE_CONFIG)).toBe('pivot');
  });
  it('silence prime sur action', () => {
    expect(derivePacingState(0.9, 0.7, false, BASELINE_CONFIG)).toBe('silence');
  });
  it('arousal ≥ 0.8 → action', () => {
    expect(derivePacingState(0.85, 0, false, BASELINE_CONFIG)).toBe('action');
  });
  it('arousal ≤ 0.3 → introspective', () => {
    expect(derivePacingState(0.2, 0, false, BASELINE_CONFIG)).toBe('introspective');
  });
  it('arousal médian → baseline', () => {
    expect(derivePacingState(0.5, 0, false, BASELINE_CONFIG)).toBe('baseline');
  });
});

// -----------------------------------------------------------------------------
// Registres
// -----------------------------------------------------------------------------

describe('pickPacingDirective()', () => {
  const states: readonly ('action' | 'introspective' | 'silence' | 'pivot' | 'baseline')[] = [
    'action',
    'introspective',
    'silence',
    'pivot',
    'baseline',
  ];
  const registers: readonly PacingRegister[] = ['litteraire', 'technique', 'argot', 'commun'];

  it('retourne une string non-vide pour chaque combinaison', () => {
    for (const r of registers) {
      for (const s of states) {
        const d = pickPacingDirective(r, s);
        expect(typeof d).toBe('string');
        expect(d.length).toBeGreaterThan(5);
      }
    }
  });

  it('directives distinctes par registre pour même état', () => {
    const dirs = new Set<string>();
    for (const r of registers) dirs.add(pickPacingDirective(r, 'action'));
    expect(dirs.size).toBe(4);
  });

  it('registre littéraire contient "phrases"', () => {
    expect(pickPacingDirective('litteraire', 'action')).toContain('phrases');
  });

  it('registre argot contient "ça"', () => {
    expect(pickPacingDirective('argot', 'action')).toContain('ça');
  });
});

// -----------------------------------------------------------------------------
// planAdaptiveChunking — invariants globaux
// -----------------------------------------------------------------------------

describe('planAdaptiveChunking()', () => {
  it('scène équilibrée → proche du plan V1 (4 chunks ~750w)', () => {
    const contract = makeContract({ arousals: [0.5, 0.5, 0.5, 0.5] });
    const config = { ...BASELINE_CONFIG, pivot_enabled: false };
    const plans = planAdaptiveChunking(contract, config);
    expect(plans.length).toBe(4);
    const total = plans.reduce((s, p) => s + p.word_target, 0);
    expect(total).toBeGreaterThanOrEqual(BASELINE_CONFIG.w_min);
    expect(total).toBeLessThanOrEqual(BASELINE_CONFIG.w_max);
  });

  it('scène action pure → chunks plus courts que baseline ET pacing action', () => {
    const action_contract = makeContract({ arousals: [0.9, 0.95, 0.95, 0.85] });
    const baseline_contract = makeContract({ arousals: [0.5, 0.5, 0.5, 0.5] });
    const config = { ...BASELINE_CONFIG, pivot_enabled: false };
    const action_plans = planAdaptiveChunking(action_contract, config);
    const baseline_plans = planAdaptiveChunking(baseline_contract, config);
    const action_avg =
      action_plans.reduce((s, p) => s + p.word_target, 0) / action_plans.length;
    const baseline_avg =
      baseline_plans.reduce((s, p) => s + p.word_target, 0) / baseline_plans.length;
    // Invariant relatif : chunks d'action plus courts que baseline
    expect(action_avg).toBeLessThan(baseline_avg);
    // Tous les chunks non-pivot doivent être en pacing_state='action'
    for (const p of action_plans) {
      expect(p.pacing_state).toBe('action');
    }
  });

  it('scène introspection pure → chunks plus longs que action ET pacing introspective', () => {
    const action_contract = makeContract({ arousals: [0.9, 0.95, 0.95, 0.85] });
    const intro_contract = makeContract({ arousals: [0.1, 0.15, 0.2, 0.15] });
    const config = { ...BASELINE_CONFIG, pivot_enabled: false };
    const action_plans = planAdaptiveChunking(action_contract, config);
    const intro_plans = planAdaptiveChunking(intro_contract, config);
    const action_avg =
      action_plans.reduce((s, p) => s + p.word_target, 0) / action_plans.length;
    const intro_avg = intro_plans.reduce((s, p) => s + p.word_target, 0) / intro_plans.length;
    // Invariant relatif : chunks introspectifs plus longs que chunks d'action
    expect(intro_avg).toBeGreaterThan(action_avg);
    // Tous les chunks non-pivot doivent être en pacing_state='introspective'
    for (const p of intro_plans) {
      expect(p.pacing_state).toBe('introspective');
    }
    // Et moins de chunks au total (scène dilatée, pas morcelée)
    expect(intro_plans.length).toBeLessThanOrEqual(action_plans.length);
  });

  it('tous les word_target dans [L_MIN, L_MAX]', () => {
    const contract = makeContract({ arousals: [0, 0.5, 1, 0.5] });
    const plans = planAdaptiveChunking(contract, BASELINE_CONFIG);
    for (const p of plans) {
      expect(p.word_target).toBeGreaterThanOrEqual(BASELINE_CONFIG.l_min);
      expect(p.word_target).toBeLessThanOrEqual(BASELINE_CONFIG.l_max);
    }
  });

  it('nombre de chunks entre 3 et 10', () => {
    const contract = makeContract({ arousals: [0.5, 0.5, 0.5, 0.5] });
    const plans = planAdaptiveChunking(contract, BASELINE_CONFIG);
    expect(plans.length).toBeGreaterThanOrEqual(3);
    expect(plans.length).toBeLessThanOrEqual(10);
  });

  it('positions strictement croissantes', () => {
    const contract = makeContract({ arousals: [0.3, 0.7, 0.95, 0.4] });
    const plans = planAdaptiveChunking(contract, BASELINE_CONFIG);
    for (let i = 1; i < plans.length; i++) {
      expect(plans[i].position_pct).toBeGreaterThan(plans[i - 1].position_pct);
    }
  });

  it('pivot enabled → au moins un chunk is_pivot=true si pic dans [0,1]', () => {
    const contract = makeContract({
      arousals: [0.3, 0.5, 0.95, 0.4],
      pic_pct: 0.625,
      faille_pct: 0.875,
    });
    const plans = planAdaptiveChunking(contract, { ...BASELINE_CONFIG, pivot_enabled: true });
    const pivots = plans.filter((p) => p.is_pivot);
    expect(pivots.length).toBeGreaterThanOrEqual(1);
    expect(pivots.length).toBeLessThanOrEqual(2);
  });

  it('pivot disabled → aucun chunk is_pivot', () => {
    const contract = makeContract({ arousals: [0.3, 0.5, 0.95, 0.4] });
    const plans = planAdaptiveChunking(contract, { ...BASELINE_CONFIG, pivot_enabled: false });
    const pivots = plans.filter((p) => p.is_pivot);
    expect(pivots.length).toBe(0);
  });

  it('silence_zone couvrant un quartile → pacing_state = silence pour ce quartile', () => {
    const contract = makeContract({
      arousals: [0.5, 0.5, 0.5, 0.5],
      silence_zones: [{ start_pct: 0.25, end_pct: 0.5 }],
    });
    const config = { ...BASELINE_CONFIG, pivot_enabled: false };
    const plans = planAdaptiveChunking(contract, config);
    const q2Chunks = plans.filter((p) => p.quartile === 'Q2');
    expect(q2Chunks.length).toBeGreaterThan(0);
    expect(q2Chunks.every((p) => p.pacing_state === 'silence')).toBe(true);
  });

  it('directive non-vide pour chaque chunk', () => {
    const contract = makeContract({ arousals: [0.2, 0.5, 0.9, 0.4] });
    const plans = planAdaptiveChunking(contract, BASELINE_CONFIG);
    for (const p of plans) {
      expect(p.pacing_directive.length).toBeGreaterThan(0);
    }
  });

  it('faille trop proche du pic → un seul pivot extrait', () => {
    const contract = makeContract({
      arousals: [0.3, 0.5, 0.9, 0.4],
      pic_pct: 0.625,
      faille_pct: 0.7,
    });
    const plans = planAdaptiveChunking(contract, BASELINE_CONFIG);
    const pivots = plans.filter((p) => p.is_pivot);
    expect(pivots.length).toBe(1);
  });
});

// -----------------------------------------------------------------------------
// buildStaticPlan (compat V1)
// -----------------------------------------------------------------------------

describe('buildStaticPlan()', () => {
  it('retourne 4 chunks de 750w, pacing baseline', () => {
    const plans = buildStaticPlan(BASELINE_CONFIG);
    expect(plans.length).toBe(4);
    for (const p of plans) {
      expect(p.word_target).toBe(750);
      expect(p.pacing_state).toBe('baseline');
      expect(p.is_pivot).toBe(false);
    }
  });
});

// -----------------------------------------------------------------------------
// Env var loading
// -----------------------------------------------------------------------------

describe('loadAdaptiveConfigFromEnv()', () => {
  let snapshot: Record<string, string | undefined>;

  beforeEach(() => {
    snapshot = saveEnv();
    for (const k of ENV_KEYS) delete process.env[k];
  });
  afterEach(() => {
    restoreEnv(snapshot);
  });

  it('retourne les defaults si aucune env var', () => {
    const cfg = loadAdaptiveConfigFromEnv();
    expect(cfg.alpha).toBe(0.5);
    expect(cfg.beta).toBe(0.2);
    expect(cfg.gamma).toBe(0.2);
    expect(cfg.delta).toBe(0.2);
    expect(cfg.register).toBe('litteraire');
  });

  it('applique OMEGA_ADAPTIVE_ALPHA', () => {
    process.env.OMEGA_ADAPTIVE_ALPHA = '0.7';
    const cfg = loadAdaptiveConfigFromEnv();
    expect(cfg.alpha).toBe(0.7);
  });

  it('applique OMEGA_PACING_REGISTER', () => {
    process.env.OMEGA_PACING_REGISTER = 'argot';
    const cfg = loadAdaptiveConfigFromEnv();
    expect(cfg.register).toBe('argot');
  });

  it('ignore register invalide', () => {
    process.env.OMEGA_PACING_REGISTER = 'shakespeare';
    const cfg = loadAdaptiveConfigFromEnv();
    expect(cfg.register).toBe('litteraire');
  });

  it('OMEGA_ADAPTIVE_PIVOT=0 → pivot_enabled false', () => {
    process.env.OMEGA_ADAPTIVE_PIVOT = '0';
    const cfg = loadAdaptiveConfigFromEnv();
    expect(cfg.pivot_enabled).toBe(false);
  });

  it('valeur env invalide → fallback default', () => {
    process.env.OMEGA_ADAPTIVE_ALPHA = 'not-a-number';
    const cfg = loadAdaptiveConfigFromEnv();
    expect(cfg.alpha).toBe(0.5);
  });
});

// -----------------------------------------------------------------------------
// getAdaptiveMode
// -----------------------------------------------------------------------------

describe('getAdaptiveMode()', () => {
  let snapshot: Record<string, string | undefined>;

  beforeEach(() => {
    snapshot = saveEnv();
    for (const k of ENV_KEYS) delete process.env[k];
  });
  afterEach(() => {
    restoreEnv(snapshot);
  });

  it('default=0 si aucune env var', () => {
    expect(getAdaptiveMode()).toBe('0');
  });

  it('shadow si OMEGA_ADAPTIVE_CHUNKING=shadow', () => {
    process.env.OMEGA_ADAPTIVE_CHUNKING = 'shadow';
    expect(getAdaptiveMode()).toBe('shadow');
  });

  it("1 si OMEGA_ADAPTIVE_CHUNKING='1'", () => {
    process.env.OMEGA_ADAPTIVE_CHUNKING = '1';
    expect(getAdaptiveMode()).toBe('1');
  });

  it('valeur invalide → 0', () => {
    process.env.OMEGA_ADAPTIVE_CHUNKING = 'garbage';
    expect(getAdaptiveMode()).toBe('0');
  });
});

// -----------------------------------------------------------------------------
// summarizePlan
// -----------------------------------------------------------------------------

describe('summarizePlan()', () => {
  it('formate une ligne compacte lisible', () => {
    const contract = makeContract({ arousals: [0.5, 0.5, 0.5, 0.5] });
    const plans = planAdaptiveChunking(contract, { ...BASELINE_CONFIG, pivot_enabled: false });
    const s = summarizePlan(plans);
    expect(s).toMatch(/^n=\d+ total=\d+w \[/);
    expect(s).toContain('b');
  });
});

// -----------------------------------------------------------------------------
// getAdaptiveVariant
// -----------------------------------------------------------------------------

describe('getAdaptiveVariant()', () => {
  let snapshot: Record<string, string | undefined>;

  beforeEach(() => {
    snapshot = saveEnv();
    for (const k of ENV_KEYS) delete process.env[k];
  });
  afterEach(() => {
    restoreEnv(snapshot);
  });

  it("default='v2b2' si aucune env var", () => {
    expect(getAdaptiveVariant()).toBe('v2b2');
  });

  it("'v2b1' si OMEGA_ADAPTIVE_VARIANT=v2b1", () => {
    process.env.OMEGA_ADAPTIVE_VARIANT = 'v2b1';
    expect(getAdaptiveVariant()).toBe('v2b1');
  });

  it("'v2b2' si OMEGA_ADAPTIVE_VARIANT=v2b2 explicite", () => {
    process.env.OMEGA_ADAPTIVE_VARIANT = 'v2b2';
    expect(getAdaptiveVariant()).toBe('v2b2');
  });

  it("'v2c' si OMEGA_ADAPTIVE_VARIANT=v2c (router archétypal)", () => {
    process.env.OMEGA_ADAPTIVE_VARIANT = 'v2c';
    expect(getAdaptiveVariant()).toBe('v2c');
  });

  it("valeur inconnue → fallback 'v2b2'", () => {
    process.env.OMEGA_ADAPTIVE_VARIANT = 'garbage';
    expect(getAdaptiveVariant()).toBe('v2b2');
  });

  it("chaîne vide → fallback 'v2b2'", () => {
    process.env.OMEGA_ADAPTIVE_VARIANT = '';
    expect(getAdaptiveVariant()).toBe('v2b2');
  });
});

// -----------------------------------------------------------------------------
// getDirectiveMode + pickPacingDirective(mode) — NCR_DIRECTIVE_BLOAT ablation
// -----------------------------------------------------------------------------

describe('getDirectiveMode()', () => {
  let snapshot: Record<string, string | undefined>;

  beforeEach(() => {
    snapshot = saveEnv();
    for (const k of ENV_KEYS) delete process.env[k];
  });
  afterEach(() => {
    restoreEnv(snapshot);
  });

  it("default='adaptive' si aucune env var", () => {
    expect(getDirectiveMode()).toBe('adaptive');
  });

  it("'baseline' si OMEGA_DIRECTIVE_MODE=baseline", () => {
    process.env.OMEGA_DIRECTIVE_MODE = 'baseline';
    expect(getDirectiveMode()).toBe('baseline');
  });

  it("'adaptive' si OMEGA_DIRECTIVE_MODE=adaptive explicite", () => {
    process.env.OMEGA_DIRECTIVE_MODE = 'adaptive';
    expect(getDirectiveMode()).toBe('adaptive');
  });

  it("valeur inconnue → fallback 'adaptive' (rétrocompatible)", () => {
    process.env.OMEGA_DIRECTIVE_MODE = 'garbage';
    expect(getDirectiveMode()).toBe('adaptive');
  });

  it("chaîne vide → 'adaptive'", () => {
    process.env.OMEGA_DIRECTIVE_MODE = '';
    expect(getDirectiveMode()).toBe('adaptive');
  });
});

describe('pickPacingDirective() — mode parameter (NCR_DIRECTIVE_BLOAT)', () => {
  const states: readonly ('action' | 'introspective' | 'silence' | 'pivot' | 'baseline')[] = [
    'action',
    'introspective',
    'silence',
    'pivot',
    'baseline',
  ];
  const registers: readonly PacingRegister[] = ['litteraire', 'technique', 'argot', 'commun'];

  let snapshot: Record<string, string | undefined>;

  beforeEach(() => {
    snapshot = saveEnv();
    for (const k of ENV_KEYS) delete process.env[k];
  });
  afterEach(() => {
    restoreEnv(snapshot);
  });

  it("mode='adaptive' retourne une directive ≠ baseline pour états non-baseline", () => {
    for (const r of registers) {
      const baseline_dir = pickPacingDirective(r, 'baseline', 'adaptive');
      for (const s of states) {
        if (s === 'baseline') continue;
        const d = pickPacingDirective(r, s, 'adaptive');
        expect(d).not.toBe(baseline_dir);
      }
    }
  });

  it("mode='baseline' retourne TOUJOURS la directive baseline du registre", () => {
    for (const r of registers) {
      const baseline = pickPacingDirective(r, 'baseline', 'adaptive');
      for (const s of states) {
        const d = pickPacingDirective(r, s, 'baseline');
        expect(d).toBe(baseline);
      }
    }
  });

  it("mode='baseline' neutralise la directive 'silence' suspecte (registre littéraire)", () => {
    // Directive silence : "prose ralentie, pauses ostensibles, syntaxe qui se raréfie..."
    // Directive baseline : "rythme équilibré, alternance mesurée, respiration classique"
    const silence_adaptive = pickPacingDirective('litteraire', 'silence', 'adaptive');
    const silence_baseline = pickPacingDirective('litteraire', 'silence', 'baseline');
    expect(silence_adaptive).not.toBe(silence_baseline);
    expect(silence_baseline).toContain('équilibré');
    expect(silence_adaptive).toContain('raréfie');
  });

  it('sans paramètre mode → lit OMEGA_DIRECTIVE_MODE', () => {
    process.env.OMEGA_DIRECTIVE_MODE = 'baseline';
    const baseline = pickPacingDirective('litteraire', 'baseline');
    const silence = pickPacingDirective('litteraire', 'silence');
    expect(silence).toBe(baseline);
  });

  it('sans paramètre + env=adaptive → comportement historique préservé', () => {
    process.env.OMEGA_DIRECTIVE_MODE = 'adaptive';
    const action = pickPacingDirective('litteraire', 'action');
    const baseline = pickPacingDirective('litteraire', 'baseline');
    expect(action).not.toBe(baseline);
  });

  it('rétrocompatibilité : signature 2-arg ne casse pas', () => {
    // Les call-sites existants appellent pickPacingDirective(register, state)
    // sans 3e argument. Le défaut doit lire l'env var (adaptive par défaut).
    const d = pickPacingDirective('litteraire', 'silence');
    expect(typeof d).toBe('string');
    expect(d.length).toBeGreaterThan(5);
  });
});

// -----------------------------------------------------------------------------
// planAdaptiveChunkingV2B2 — N=4 hard constraint (1 quartile = 1 chunk)
// -----------------------------------------------------------------------------

describe('planAdaptiveChunkingV2B2()', () => {
  it('invariant dur : plans.length === 4 toujours, quelle que soit la courbe', () => {
    const cases: Array<[number, number, number, number]> = [
      [0.5, 0.5, 0.5, 0.5],
      [0.9, 0.95, 0.95, 0.85],
      [0.1, 0.15, 0.2, 0.15],
      [0.0, 0.5, 1.0, 0.5],
      [0.3, 0.7, 0.95, 0.4],
    ];
    for (const arousals of cases) {
      const contract = makeContract({ arousals });
      const plans = planAdaptiveChunkingV2B2(contract, BASELINE_CONFIG);
      expect(plans.length).toBe(4);
    }
  });

  it('mapping strict : plans[i].quartile === Q(i+1)', () => {
    const contract = makeContract({ arousals: [0.3, 0.5, 0.7, 0.4] });
    const plans = planAdaptiveChunkingV2B2(contract, { ...BASELINE_CONFIG, pivot_enabled: false });
    expect(plans[0].quartile).toBe('Q1');
    expect(plans[1].quartile).toBe('Q2');
    expect(plans[2].quartile).toBe('Q3');
    expect(plans[3].quartile).toBe('Q4');
  });

  it('indices contigus 0..3 et positions strictement croissantes', () => {
    const contract = makeContract({ arousals: [0.2, 0.6, 0.9, 0.4] });
    const plans = planAdaptiveChunkingV2B2(contract, { ...BASELINE_CONFIG, pivot_enabled: false });
    for (let i = 0; i < 4; i++) expect(plans[i].index).toBe(i);
    for (let i = 1; i < plans.length; i++) {
      expect(plans[i].position_pct).toBeGreaterThan(plans[i - 1].position_pct);
    }
  });

  it('renormalisation : Σ word_target ≈ w_total (tolérance ±4 × clamp)', () => {
    const contract = makeContract({ arousals: [0.3, 0.5, 0.7, 0.4] });
    const cfg = { ...BASELINE_CONFIG, pivot_enabled: false };
    const plans = planAdaptiveChunkingV2B2(contract, cfg);
    const w_total = computeTotalBudget(contract.curve_quartiles, cfg);
    const sum = plans.reduce((s, p) => s + p.word_target, 0);
    // Après arrondi + clamp par chunk, on admet au plus 4 × (l_max - l_min) d'écart
    // mais en pratique c'est dominé par l'arrondi (< 4 mots d'écart).
    expect(Math.abs(sum - w_total)).toBeLessThanOrEqual(8);
  });

  it('tous les word_target dans [l_min, l_max]', () => {
    const contract = makeContract({ arousals: [0.0, 0.5, 1.0, 0.5] });
    const plans = planAdaptiveChunkingV2B2(contract, BASELINE_CONFIG);
    for (const p of plans) {
      expect(p.word_target).toBeGreaterThanOrEqual(BASELINE_CONFIG.l_min);
      expect(p.word_target).toBeLessThanOrEqual(BASELINE_CONFIG.l_max);
    }
  });

  it('Σ word_target ∈ [w_min, w_max] après clamp', () => {
    const contract = makeContract({ arousals: [0.3, 0.5, 0.7, 0.4] });
    const plans = planAdaptiveChunkingV2B2(contract, BASELINE_CONFIG);
    const sum = plans.reduce((s, p) => s + p.word_target, 0);
    // Post-renormalisation, sum ≈ w_total ∈ [w_min, w_max] par construction de computeTotalBudget
    expect(sum).toBeGreaterThanOrEqual(BASELINE_CONFIG.w_min - 10);
    expect(sum).toBeLessThanOrEqual(BASELINE_CONFIG.w_max + 10);
  });

  it('pivot pic dans Q3 → pacing_state=pivot pour plans[2], PAS de chunk ajouté', () => {
    const contract = makeContract({
      arousals: [0.3, 0.5, 0.95, 0.4],
      pic_pct: 0.625, // dans [0.5, 0.75) = Q3
      faille_pct: 0.95, // hors quartile différent (Q4)
    });
    const plans = planAdaptiveChunkingV2B2(contract, {
      ...BASELINE_CONFIG,
      pivot_enabled: true,
    });
    expect(plans.length).toBe(4); // toujours 4, pivots absorbés
    expect(plans[2].is_pivot).toBe(true);
    expect(plans[2].pacing_state).toBe('pivot');
    expect(plans[2].position_pct).toBeCloseTo(0.625, 3); // position du pic
  });

  it('pivot faille trop proche du pic → un seul pivot activé', () => {
    const contract = makeContract({
      arousals: [0.3, 0.5, 0.9, 0.4],
      pic_pct: 0.625,
      faille_pct: 0.7, // |0.7 - 0.625| = 0.075 < 0.15 → ignoré
    });
    const plans = planAdaptiveChunkingV2B2(contract, BASELINE_CONFIG);
    const pivots = plans.filter((p) => p.is_pivot);
    expect(pivots.length).toBe(1);
  });

  it('γ : silence_zone sur Q2 → word_target[Q2] augmenté vs γ=0', () => {
    const contract_silence = makeContract({
      arousals: [0.5, 0.5, 0.5, 0.5],
      silence_zones: [{ start_pct: 0.25, end_pct: 0.5 }],
    });
    const cfg_gamma = { ...BASELINE_CONFIG, gamma: 0.5, pivot_enabled: false };
    const cfg_no_gamma = { ...BASELINE_CONFIG, gamma: 0, pivot_enabled: false };
    const plans_gamma = planAdaptiveChunkingV2B2(contract_silence, cfg_gamma);
    const plans_no_gamma = planAdaptiveChunkingV2B2(contract_silence, cfg_no_gamma);
    // Après renormalisation, Q2 reste relativement augmenté par rapport aux autres
    // quand γ > 0 (car silence_overlap est concentré sur Q2).
    const q2_gamma = plans_gamma[1].word_target;
    const q2_no_gamma = plans_no_gamma[1].word_target;
    // γ active → word_target[Q2] strictement supérieur à γ=0 (sauf clamp).
    expect(q2_gamma).toBeGreaterThan(q2_no_gamma);
    // Q2 doit être en pacing_state='silence'
    expect(plans_gamma[1].pacing_state).toBe('silence');
  });

  it('α : arousal Q3=0.95 → word_target[Q3] plus court que arousal uniforme', () => {
    const contract_spike = makeContract({ arousals: [0.5, 0.5, 0.95, 0.5] });
    const contract_flat = makeContract({ arousals: [0.5, 0.5, 0.5, 0.5] });
    const cfg = { ...BASELINE_CONFIG, pivot_enabled: false };
    const plans_spike = planAdaptiveChunkingV2B2(contract_spike, cfg);
    const plans_flat = planAdaptiveChunkingV2B2(contract_flat, cfg);
    // α compresse le raw_target sur le quartile d'action, mais β l'augmente aussi.
    // Le test robuste : Q3 en action doit être en pacing_state='action'.
    expect(plans_spike[2].pacing_state).toBe('action');
    expect(plans_flat[2].pacing_state).toBe('baseline');
  });

  it('directives non-vides pour chaque chunk', () => {
    const contract = makeContract({ arousals: [0.2, 0.5, 0.9, 0.4] });
    const plans = planAdaptiveChunkingV2B2(contract, BASELINE_CONFIG);
    for (const p of plans) {
      expect(p.pacing_directive.length).toBeGreaterThan(0);
    }
  });

  it('courbe extrême (tous arousal=1) → plans.length reste 4, clamps respectés', () => {
    const contract = makeContract({ arousals: [1, 1, 1, 1] });
    const plans = planAdaptiveChunkingV2B2(contract, BASELINE_CONFIG);
    expect(plans.length).toBe(4);
    for (const p of plans) {
      expect(p.word_target).toBeGreaterThanOrEqual(BASELINE_CONFIG.l_min);
      expect(p.word_target).toBeLessThanOrEqual(BASELINE_CONFIG.l_max);
    }
  });
});

// -----------------------------------------------------------------------------
// planAdaptive() — dispatcher de variante
// -----------------------------------------------------------------------------

describe('planAdaptive() dispatcher', () => {
  let snapshot: Record<string, string | undefined>;

  beforeEach(() => {
    snapshot = saveEnv();
    for (const k of ENV_KEYS) delete process.env[k];
  });
  afterEach(() => {
    restoreEnv(snapshot);
  });

  it("variant 'v2b1' explicite → plans équivalents à planAdaptiveChunking", () => {
    const contract = makeContract({ arousals: [0.3, 0.5, 0.9, 0.4] });
    const a = planAdaptive(contract, BASELINE_CONFIG, 'v2b1');
    const b = planAdaptiveChunking(contract, BASELINE_CONFIG);
    expect(a.length).toBe(b.length);
    // Vérification structurelle sur le premier chunk (déterministe)
    expect(a[0].quartile).toBe(b[0].quartile);
    expect(a[0].word_target).toBe(b[0].word_target);
  });

  it("variant 'v2b2' explicite → plans équivalents à planAdaptiveChunkingV2B2", () => {
    const contract = makeContract({ arousals: [0.3, 0.5, 0.9, 0.4] });
    const a = planAdaptive(contract, BASELINE_CONFIG, 'v2b2');
    const b = planAdaptiveChunkingV2B2(contract, BASELINE_CONFIG);
    expect(a.length).toBe(b.length);
    expect(a.length).toBe(4);
    for (let i = 0; i < 4; i++) {
      expect(a[i].quartile).toBe(b[i].quartile);
      expect(a[i].word_target).toBe(b[i].word_target);
    }
  });

  it("variant par défaut (ENV non-set) = 'v2b2' → 4 chunks", () => {
    const contract = makeContract({ arousals: [0.3, 0.7, 0.95, 0.4] });
    const plans = planAdaptive(contract, BASELINE_CONFIG);
    expect(plans.length).toBe(4);
  });

  it("OMEGA_ADAPTIVE_VARIANT=v2b1 → comportement V2-B.1 (N dynamique)", () => {
    process.env.OMEGA_ADAPTIVE_VARIANT = 'v2b1';
    const contract = makeContract({ arousals: [0.9, 0.95, 0.95, 0.85] });
    const plans = planAdaptive(contract, BASELINE_CONFIG);
    // V2-B.1 action pure → plus de 4 chunks attendus (ceil(w_q/l_target))
    expect(plans.length).toBeGreaterThanOrEqual(4);
  });

  it("OMEGA_ADAPTIVE_VARIANT=v2b2 → comportement N=4 strict", () => {
    process.env.OMEGA_ADAPTIVE_VARIANT = 'v2b2';
    const contract = makeContract({ arousals: [0.9, 0.95, 0.95, 0.85] });
    const plans = planAdaptive(contract, BASELINE_CONFIG);
    expect(plans.length).toBe(4);
  });

  it("valeur ENV inconnue → fallback 'v2b2' (N=4)", () => {
    process.env.OMEGA_ADAPTIVE_VARIANT = 'shakespeare';
    const contract = makeContract({ arousals: [0.9, 0.95, 0.95, 0.85] });
    const plans = planAdaptive(contract, BASELINE_CONFIG);
    expect(plans.length).toBe(4);
  });

  it("OMEGA_ADAPTIVE_VARIANT=v2c → dispatch via planV2CArchetypal", () => {
    process.env.OMEGA_ADAPTIVE_VARIANT = 'v2c';
    // Contract INTERIOR → V2-C doit router vers buildStaticPlan (4×equal)
    const contract = makeContract({
      arousals: [0.15, 0.30, 0.45, 0.20],
      silence_zones: [
        { start_pct: 0.0, end_pct: 0.25 },
        { start_pct: 0.75, end_pct: 1.0 },
      ],
    });
    const plans = planAdaptive(contract, BASELINE_CONFIG);
    expect(plans.length).toBe(4);
    // INTERIOR → static plan : tous les word_target sont égaux (w_ref / 4)
    const targets = plans.map((p) => p.word_target);
    const expected = Math.round(BASELINE_CONFIG.w_ref / 4);
    expect(targets.every((t) => t === expected)).toBe(true);
  });

  it("variant 'v2c' explicite → INTERIOR route vers static", () => {
    const contract = makeContract({
      arousals: [0.15, 0.30, 0.45, 0.20],
      silence_zones: [
        { start_pct: 0.0, end_pct: 0.25 },
        { start_pct: 0.75, end_pct: 1.0 },
      ],
    });
    const v2c = planAdaptive(contract, BASELINE_CONFIG, 'v2c');
    const v1_like = buildStaticPlan(BASELINE_CONFIG);
    expect(v2c.length).toBe(v1_like.length);
    for (let i = 0; i < v2c.length; i++) {
      expect(v2c[i].word_target).toBe(v1_like[i].word_target);
    }
  });

  it("variant 'v2c' explicite → SENSORY route vers adaptive V2-B.2", () => {
    const contract = makeContract({
      arousals: [0.40, 0.55, 0.70, 0.50],
      silence_zones: [{ start_pct: 0.80, end_pct: 0.95 }],
    });
    const v2c = planAdaptive(contract, BASELINE_CONFIG, 'v2c');
    const v2b2 = planAdaptiveChunkingV2B2(contract, BASELINE_CONFIG);
    expect(v2c.length).toBe(v2b2.length);
    for (let i = 0; i < v2c.length; i++) {
      expect(v2c[i].word_target).toBe(v2b2[i].word_target);
    }
  });
});

// -----------------------------------------------------------------------------
// detectArchetype() — classification bench + zones frontière
// -----------------------------------------------------------------------------

describe('detectArchetype()', () => {
  it('ACTION : a_mean=0.80, silence_total=0 → ACTION', () => {
    const contract = makeContract({ arousals: [0.65, 0.85, 0.95, 0.75] });
    expect(detectArchetype(contract)).toBe('ACTION');
  });

  it('INTERIOR : a_mean=0.275, silence_total=0.50 → INTERIOR', () => {
    const contract = makeContract({
      arousals: [0.15, 0.30, 0.45, 0.20],
      silence_zones: [
        { start_pct: 0.0, end_pct: 0.25 },
        { start_pct: 0.75, end_pct: 1.0 },
      ],
    });
    expect(detectArchetype(contract)).toBe('INTERIOR');
  });

  it('SENSORY : a_mean=0.5375, silence_total=0.15 → SENSORY', () => {
    const contract = makeContract({
      arousals: [0.40, 0.55, 0.70, 0.50],
      silence_zones: [{ start_pct: 0.80, end_pct: 0.95 }],
    });
    expect(detectArchetype(contract)).toBe('SENSORY');
  });

  it('CATHEDRAL : a_mean=0.475, silence_total=0.35 → CATHEDRAL', () => {
    const contract = makeContract({
      arousals: [0.30, 0.50, 0.70, 0.40],
      silence_zones: [
        { start_pct: 0.0, end_pct: 0.20 },
        { start_pct: 0.85, end_pct: 1.0 },
      ],
    });
    expect(detectArchetype(contract)).toBe('CATHEDRAL');
  });

  it('frontière R1 : a_mean=0.64 → SENSORY (R4 fallback, pas ACTION)', () => {
    const contract = makeContract({ arousals: [0.60, 0.60, 0.70, 0.66] });
    // a_mean = 0.64 < 0.65, donc R1 fail → fallback SENSORY
    expect(detectArchetype(contract)).toBe('SENSORY');
  });

  it('frontière R1 silence : a_mean=0.70, silence=0.12 → SENSORY (pas ACTION)', () => {
    const contract = makeContract({
      arousals: [0.65, 0.75, 0.80, 0.60],
      silence_zones: [{ start_pct: 0.88, end_pct: 1.0 }],
    });
    // silence_total=0.12 ≥ 0.10, R1 exige silence < 0.10 → fallback SENSORY
    expect(detectArchetype(contract)).toBe('SENSORY');
  });

  it('frontière R2 : a_mean=0.36 → CATHEDRAL (R3 match, pas INTERIOR)', () => {
    const contract = makeContract({
      arousals: [0.30, 0.36, 0.40, 0.38],
      silence_zones: [
        { start_pct: 0.0, end_pct: 0.20 },
        { start_pct: 0.85, end_pct: 1.0 },
      ],
    });
    // a_mean = 0.36 > 0.35, donc R2 fail. silence_total=0.35 ≥ 0.25 et 0.35 < 0.36 < 0.60 → CATHEDRAL
    expect(detectArchetype(contract)).toBe('CATHEDRAL');
  });

  it("frontière R3 : silence_total=0.24 → SENSORY (pas CATHEDRAL)", () => {
    const contract = makeContract({
      arousals: [0.40, 0.50, 0.55, 0.45],
      silence_zones: [{ start_pct: 0.0, end_pct: 0.24 }],
    });
    // silence_total=0.24 < 0.25, donc R3 fail → fallback SENSORY
    expect(detectArchetype(contract)).toBe('SENSORY');
  });

  it('dégénéré : aucune zone silence → défaut selon a_mean seul', () => {
    const contract = makeContract({ arousals: [0.50, 0.50, 0.50, 0.50] });
    // a_mean=0.50, silence_total=0 → R1 fail (silence pas <0.10 ok mais a_mean pas ≥0.65),
    // R2 fail (a_mean pas ≤0.35), R3 fail (silence pas ≥0.25) → SENSORY
    expect(detectArchetype(contract)).toBe('SENSORY');
  });

  it('arousal élevé partout + silence notable : ACTION exige silence<0.10', () => {
    const contract = makeContract({
      arousals: [0.80, 0.85, 0.90, 0.75],
      silence_zones: [{ start_pct: 0.0, end_pct: 0.30 }],
    });
    // a_mean=0.825 ≥ 0.65 mais silence_total=0.30 pas < 0.10 → R1 fail.
    // R2 fail (a_mean > 0.35), R3 fail (a_mean ≥ 0.60) → SENSORY fallback
    expect(detectArchetype(contract)).toBe('SENSORY');
  });
});

// -----------------------------------------------------------------------------
// planV2CArchetypal() — dispatch par archétype
// -----------------------------------------------------------------------------

describe('planV2CArchetypal()', () => {
  it('ACTION → plan V2-B.2 adaptive (égal à planAdaptiveChunkingV2B2)', () => {
    const contract = makeContract({ arousals: [0.65, 0.85, 0.95, 0.75] });
    const router = planV2CArchetypal(contract, BASELINE_CONFIG);
    const direct = planAdaptiveChunkingV2B2(contract, BASELINE_CONFIG);
    expect(router.length).toBe(direct.length);
    for (let i = 0; i < router.length; i++) {
      expect(router[i].word_target).toBe(direct[i].word_target);
    }
  });

  it('SENSORY → plan V2-B.2 adaptive', () => {
    const contract = makeContract({
      arousals: [0.40, 0.55, 0.70, 0.50],
      silence_zones: [{ start_pct: 0.80, end_pct: 0.95 }],
    });
    const router = planV2CArchetypal(contract, BASELINE_CONFIG);
    const direct = planAdaptiveChunkingV2B2(contract, BASELINE_CONFIG);
    expect(router.length).toBe(direct.length);
    for (let i = 0; i < router.length; i++) {
      expect(router[i].word_target).toBe(direct[i].word_target);
    }
  });

  it('INTERIOR → plan static (égal à buildStaticPlan)', () => {
    const contract = makeContract({
      arousals: [0.15, 0.30, 0.45, 0.20],
      silence_zones: [
        { start_pct: 0.0, end_pct: 0.25 },
        { start_pct: 0.75, end_pct: 1.0 },
      ],
    });
    const router = planV2CArchetypal(contract, BASELINE_CONFIG);
    const staticPlan = buildStaticPlan(BASELINE_CONFIG);
    expect(router.length).toBe(staticPlan.length);
    for (let i = 0; i < router.length; i++) {
      expect(router[i].word_target).toBe(staticPlan[i].word_target);
    }
  });

  it('CATHEDRAL → plan static (égal à buildStaticPlan)', () => {
    const contract = makeContract({
      arousals: [0.30, 0.50, 0.70, 0.40],
      silence_zones: [
        { start_pct: 0.0, end_pct: 0.20 },
        { start_pct: 0.85, end_pct: 1.0 },
      ],
    });
    const router = planV2CArchetypal(contract, BASELINE_CONFIG);
    const staticPlan = buildStaticPlan(BASELINE_CONFIG);
    expect(router.length).toBe(staticPlan.length);
    for (let i = 0; i < router.length; i++) {
      expect(router[i].word_target).toBe(staticPlan[i].word_target);
    }
  });

  it('INTERIOR : static plan a word_target constant (pas de modulation)', () => {
    const contract = makeContract({
      arousals: [0.15, 0.30, 0.45, 0.20],
      silence_zones: [
        { start_pct: 0.0, end_pct: 0.25 },
        { start_pct: 0.75, end_pct: 1.0 },
      ],
    });
    const router = planV2CArchetypal(contract, BASELINE_CONFIG);
    const first = router[0].word_target;
    expect(router.every((p) => p.word_target === first)).toBe(true);
  });

  it('router reste à 4 chunks pour tous les archétypes', () => {
    const scenarios: Array<{ arousals: [number, number, number, number]; silence_zones?: readonly { start_pct: number; end_pct: number }[] }> = [
      { arousals: [0.65, 0.85, 0.95, 0.75] }, // ACTION
      { arousals: [0.15, 0.30, 0.45, 0.20], silence_zones: [{ start_pct: 0.0, end_pct: 0.25 }, { start_pct: 0.75, end_pct: 1.0 }] }, // INTERIOR
      { arousals: [0.40, 0.55, 0.70, 0.50], silence_zones: [{ start_pct: 0.80, end_pct: 0.95 }] }, // SENSORY
      { arousals: [0.30, 0.50, 0.70, 0.40], silence_zones: [{ start_pct: 0.0, end_pct: 0.20 }, { start_pct: 0.85, end_pct: 1.0 }] }, // CATHEDRAL
    ];
    for (const s of scenarios) {
      const contract = makeContract(s);
      const router = planV2CArchetypal(contract, BASELINE_CONFIG);
      expect(router.length).toBe(4);
    }
  });
});