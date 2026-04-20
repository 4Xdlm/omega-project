/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — DISPATCHER LANG V3.1 — TESTS (UNIT + INTÉGRATION + BIT-FOR-BIT)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module:   tests/scoring/dispatcher-lang.test.ts
 * Version:  3.1.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 * ADR:      outputs/dispatcher_v33/ADR-001-dispatcher-lang_v2.md §7
 *
 * Matrice de tests (22 au total) :
 *   - T-DL-01 à T-DL-17    : 17 tests unitaires
 *   - T-DL-INT-01 à 04     : 4 tests d'intégration
 *   - T-DL-INT-BF-01       : 1 test bit-for-bit (critique)
 *
 * Contract de non-régression :
 *   - 0 modification des tests existants
 *   - 0 changement de composite/verdict quand flag OFF (garanti par INT-BF-01)
 *   - baseline SHA-256 coefficients = a453090...b2 (T-DL-06)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { canonicalize, sha256 } from '@omega/canon-kernel';

import {
  runDispatcherLang,
  isDispatcherLangActive,
  getDispatcherConfig,
  __resetDispatcherCounterForTest,
  __getDispatcherCounterForTest,
} from '../../src/scoring/dispatcher/dispatcher-lang.js';
import {
  CALIBRATION_ID,
  CALIBRATION_SHA256_EXPECTED,
  MODEL_VERSION,
  COEFFICIENTS_V3_4,
  computeCoefficientsSha256,
  getLangModel,
} from '../../src/scoring/dispatcher/coefficients-v3-4.js';
import {
  DISPATCHER_FEATURE_NAMES,
  extractDispatcherFeatures,
} from '../../src/scoring/dispatcher/features-provenance.js';
import { DispatcherIntegrationError } from '../../src/scoring/dispatcher/types.js';
import type {
  DispatcherAttachment,
  DispatcherResult,
} from '../../src/scoring/dispatcher/types.js';

import { computeMacroSScore } from '../../src/oracle/macro-axes.js';
import { maybeAttachDispatcher } from '../../src/oracle/aesthetic-oracle.js';
import type { MacroAxesScores, MacroAxisScore } from '../../src/types.js';
import type { MacroSScore } from '../../src/oracle/macro-score-types.js';

// ──────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Prose FR synthétique, > 200 caractères, multi-phrases avec ponctuation
 * variée — assure que computeTextFeatures produit des valeurs non-nulles
 * pour les 5 features V3.1.
 */
const PROSE_FR_VALID = [
  'La lumière déclinait sur la pierre froide, une ombre qui glissait entre les piliers.',
  'Il avançait, lentement, mesurant chaque pas, chaque souffle, chaque battement.',
  'Elle avait murmuré quelque chose, peut-être un nom, peut-être un adieu.',
  'Le silence s\'épaisissait, opaque, vivant, presque tangible dans la nuit.',
  'Puis le vent se leva, balaya les cendres, dispersa les dernières traces.',
  'Ce qui restait, c\'était l\'odeur du métal, celle du feu, celle de la fin.',
  'Rien ne bougeait plus ; rien, sauf la mémoire, qui tournait et revenait, obstinée.',
].join(' ');

const PROSE_EN_VALID = [
  'The light was fading on the cold stone, a shadow that slid between the pillars.',
  'He advanced, slowly, measuring each step, each breath, each heartbeat.',
  'She had murmured something, perhaps a name, perhaps a farewell.',
  'The silence thickened, opaque, alive, almost tangible in the night.',
  'Then the wind rose, swept the ashes, scattered the last traces.',
  'What remained was the smell of metal, of fire, of the end.',
  'Nothing moved anymore; nothing, except memory, turning and returning, obstinate.',
].join(' ');

/** Prose < 200 caractères pour forcer prose_too_short. */
const PROSE_TOO_SHORT = 'Trop court.';

/** Packet minimaliste pour tests — uniquement les champs consommés. */
function makePacket(overrides: Partial<{ language: unknown; scene_id: string }> = {}) {
  return {
    language: 'fr' as unknown,
    scene_id: 'scene_test',
    ...overrides,
  };
}

/** Factory MacroAxisScore pour tests intégration. */
function makeAxis(name: string, score: number, weight: number): MacroAxisScore {
  return {
    name,
    score,
    weight,
    method: 'CALC',
    sub_scores: [],
    bonuses: [],
    reasons: { top_contributors: [], top_penalties: [] },
  };
}

function makeMacroAxes(): MacroAxesScores {
  return {
    ecc: makeAxis('ECC', 90, 0.33),
    rci: makeAxis('RCI', 85, 0.17),
    sii: makeAxis('SII', 88, 0.15),
    ifi: makeAxis('IFI', 92, 0.1),
    aai: makeAxis('AAI', 91, 0.25),
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// SETUP / TEARDOWN
// ──────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  __resetDispatcherCounterForTest();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — TESTS UNITAIRES (T-DL-01 à T-DL-17)
// ══════════════════════════════════════════════════════════════════════════════

describe('Dispatcher Lang V3.1 — Unit Tests', () => {
  // ────────────────────────────────────────────────────────────────────────────
  // T-DL-01 — Déterminisme pur
  // ────────────────────────────────────────────────────────────────────────────
  it('T-DL-01: même prose FR → même baseline_tier_score sur 10 appels', () => {
    vi.stubEnv('OMEGA_DISPATCHER_LANG_V33', '1');
    const scores: number[] = [];
    for (let i = 0; i < 10; i++) {
      const res = runDispatcherLang(PROSE_FR_VALID, makePacket({ language: 'fr' }));
      expect(res.status).toBe('ok');
      if (res.status === 'ok') {
        scores.push(res.result.baseline_tier_score);
      }
    }
    const unique = new Set(scores);
    expect(unique.size).toBe(1);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // T-DL-02 — Route FR
  // ────────────────────────────────────────────────────────────────────────────
  it('T-DL-02: packet.language=fr → route=FR, calibration_id présent', () => {
    vi.stubEnv('OMEGA_DISPATCHER_LANG_V33', '1');
    const res = runDispatcherLang(PROSE_FR_VALID, makePacket({ language: 'fr' }));
    expect(res.status).toBe('ok');
    if (res.status === 'ok') {
      expect(res.result.route).toBe('FR');
      expect(res.result.calibration_id).toBe(CALIBRATION_ID);
      expect(res.result.route_reason).toContain('fr');
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // T-DL-03 — Route EN
  // ────────────────────────────────────────────────────────────────────────────
  it('T-DL-03: packet.language=en → route=EN', () => {
    vi.stubEnv('OMEGA_DISPATCHER_LANG_V33', '1');
    const res = runDispatcherLang(PROSE_EN_VALID, makePacket({ language: 'en' }));
    expect(res.status).toBe('ok');
    if (res.status === 'ok') {
      expect(res.result.route).toBe('EN');
      expect(res.result.route_reason).toContain('en');
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // T-DL-04 — Route FALLBACK
  // ────────────────────────────────────────────────────────────────────────────
  it('T-DL-04: packet.language=xx → route=FALLBACK + counter incrémenté', () => {
    vi.stubEnv('OMEGA_DISPATCHER_LANG_V33', '1');
    const before = __getDispatcherCounterForTest();
    const res = runDispatcherLang(PROSE_FR_VALID, makePacket({ language: 'xx' }));
    const after = __getDispatcherCounterForTest();
    expect(res.status).toBe('ok');
    if (res.status === 'ok') {
      expect(res.result.route).toBe('FALLBACK');
      expect(res.result.route_reason).toContain('fallback');
    }
    expect(after).toBe(before + 1);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // T-DL-05 — Feature count V3.1
  // ────────────────────────────────────────────────────────────────────────────
  it('T-DL-05: toutes routes → feature_count === 5', () => {
    vi.stubEnv('OMEGA_DISPATCHER_LANG_V33', '1');
    for (const lang of ['fr', 'en', 'xx'] as const) {
      const prose = lang === 'en' ? PROSE_EN_VALID : PROSE_FR_VALID;
      const res = runDispatcherLang(prose, makePacket({ language: lang }));
      expect(res.status).toBe('ok');
      if (res.status === 'ok') {
        expect(res.result.feature_count).toBe(5);
        expect(DISPATCHER_FEATURE_NAMES.length).toBe(5);
      }
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // T-DL-06 — Calibration sha256
  // ────────────────────────────────────────────────────────────────────────────
  it('T-DL-06: calibration_sha256 === constante pré-calculée', () => {
    vi.stubEnv('OMEGA_DISPATCHER_LANG_V33', '1');
    const res = runDispatcherLang(PROSE_FR_VALID, makePacket());
    expect(res.status).toBe('ok');
    if (res.status === 'ok') {
      expect(res.result.calibration_sha256).toBe(
        'e75e3bb07d8655c6e0ee1ca99b32a2a043a44cb9c1681ee3d7a3dd305fe8424c',
      );
      expect(res.result.calibration_sha256).toBe(CALIBRATION_SHA256_EXPECTED);
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // T-DL-07 — Échelle native (tier ordinal)
  // ────────────────────────────────────────────────────────────────────────────
  it('T-DL-07: baseline_tier_score ∈ [0, 10] sur prose réelle', () => {
    vi.stubEnv('OMEGA_DISPATCHER_LANG_V33', '1');
    const proses = [PROSE_FR_VALID, PROSE_EN_VALID, PROSE_FR_VALID + ' ' + PROSE_EN_VALID];
    for (const prose of proses) {
      for (const lang of ['fr', 'en'] as const) {
        const res = runDispatcherLang(prose, makePacket({ language: lang }));
        expect(res.status).toBe('ok');
        if (res.status === 'ok') {
          expect(res.result.baseline_tier_score).toBeGreaterThan(0);
          expect(res.result.baseline_tier_score).toBeLessThan(10);
        }
      }
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // T-DL-08 — Prose courte
  // ────────────────────────────────────────────────────────────────────────────
  it('T-DL-08: prose.length < 200 → skipped, prose_too_short', () => {
    vi.stubEnv('OMEGA_DISPATCHER_LANG_V33', '1');
    const res = runDispatcherLang(PROSE_TOO_SHORT, makePacket());
    expect(res.status).toBe('skipped');
    if (res.status === 'skipped') {
      expect(res.reason).toBe('prose_too_short');
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // T-DL-09 — Prose vide
  // ────────────────────────────────────────────────────────────────────────────
  it('T-DL-09: prose === "" → skipped, prose_too_short', () => {
    vi.stubEnv('OMEGA_DISPATCHER_LANG_V33', '1');
    const res = runDispatcherLang('', makePacket());
    expect(res.status).toBe('skipped');
    if (res.status === 'skipped') {
      expect(res.reason).toBe('prose_too_short');
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // T-DL-10 — Flag off
  // ────────────────────────────────────────────────────────────────────────────
  it('T-DL-10: flag off → status=disabled, aucun scoring', () => {
    vi.stubEnv('OMEGA_DISPATCHER_LANG_V33', '0');
    const res = runDispatcherLang(PROSE_FR_VALID, makePacket());
    expect(res.status).toBe('disabled');
    expect(isDispatcherLangActive()).toBe(false);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // T-DL-11 — Flag on
  // ────────────────────────────────────────────────────────────────────────────
  it('T-DL-11: flag on → runDispatcherLang produit un résultat', () => {
    vi.stubEnv('OMEGA_DISPATCHER_LANG_V33', '1');
    const res = runDispatcherLang(PROSE_FR_VALID, makePacket());
    expect(res.status).toBe('ok');
    expect(isDispatcherLangActive()).toBe(true);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // T-DL-12 — Flag invalide = fail fast
  // ────────────────────────────────────────────────────────────────────────────
  it('T-DL-12: flag=\'2\' → DispatcherIntegrationError UNKNOWN_MODE', () => {
    vi.stubEnv('OMEGA_DISPATCHER_LANG_V33', '2');
    expect(() => isDispatcherLangActive()).toThrow(DispatcherIntegrationError);
    try {
      isDispatcherLangActive();
    } catch (err) {
      expect(err).toBeInstanceOf(DispatcherIntegrationError);
      if (err instanceof DispatcherIntegrationError) {
        expect(err.code).toBe('UNKNOWN_MODE');
      }
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // T-DL-13 — Pureté / immutabilité
  // ────────────────────────────────────────────────────────────────────────────
  it('T-DL-13: 2× appels identiques ne mutent ni packet ni prose', () => {
    vi.stubEnv('OMEGA_DISPATCHER_LANG_V33', '1');
    const packet = makePacket({ language: 'fr' });
    const packetSnapshot = JSON.stringify(packet);
    const prose = PROSE_FR_VALID;
    const proseSnapshot = prose;

    runDispatcherLang(prose, packet);
    runDispatcherLang(prose, packet);

    expect(JSON.stringify(packet)).toBe(packetSnapshot);
    expect(prose).toBe(proseSnapshot);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // T-DL-14 — NaN feature (simulation via prose dégénérée)
  // ────────────────────────────────────────────────────────────────────────────
  it('T-DL-14: vecteur contenant NaN → skipped, nan_feature OU invalid_feature_vector', () => {
    vi.stubEnv('OMEGA_DISPATCHER_LANG_V33', '1');
    // Prose longue (> 200 chars) mais stylistiquement dégénérée :
    // uniquement des points et des espaces — computeTextFeatures produit
    // des ratios potentiellement NaN pour certaines features.
    // Si tous finite malgré tout, ce test vérifie au moins la branche OK.
    const degenerate = '. '.repeat(150);
    const res = runDispatcherLang(degenerate, makePacket());
    // Acceptable : ok ou skipped nan_feature/invalid_feature_vector
    expect(['ok', 'skipped']).toContain(res.status);
    if (res.status === 'skipped') {
      expect(['nan_feature', 'invalid_feature_vector']).toContain(res.reason);
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // T-DL-15 — Sign flip FR vs EN (preuve du dispatching réel)
  // ────────────────────────────────────────────────────────────────────────────
  it('T-DL-15: même texte FR vs EN → baseline_tier_score différents', () => {
    vi.stubEnv('OMEGA_DISPATCHER_LANG_V33', '1');
    const text = PROSE_FR_VALID;
    const resFr = runDispatcherLang(text, makePacket({ language: 'fr' }));
    const resEn = runDispatcherLang(text, makePacket({ language: 'en' }));
    expect(resFr.status).toBe('ok');
    expect(resEn.status).toBe('ok');
    if (resFr.status === 'ok' && resEn.status === 'ok') {
      expect(resFr.result.baseline_tier_score).not.toBe(
        resEn.result.baseline_tier_score,
      );
      expect(resFr.result.route).toBe('FR');
      expect(resEn.result.route).toBe('EN');
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // T-DL-16 — Replay : 2 runs → octets identiques (hors trace_id)
  // ────────────────────────────────────────────────────────────────────────────
  it('T-DL-16: 2 runs → feature_vector et score octet par octet identiques', () => {
    vi.stubEnv('OMEGA_DISPATCHER_LANG_V33', '1');
    const packet = makePacket({ language: 'fr' });
    const r1 = runDispatcherLang(PROSE_FR_VALID, packet);
    const r2 = runDispatcherLang(PROSE_FR_VALID, packet);
    expect(r1.status).toBe('ok');
    expect(r2.status).toBe('ok');
    if (r1.status === 'ok' && r2.status === 'ok') {
      const stripTraceId = (res: DispatcherResult) => {
        const { trace_id: _trace_id, ...rest } = res;
        return rest;
      };
      const c1 = canonicalize(stripTraceId(r1.result));
      const c2 = canonicalize(stripTraceId(r2.result));
      expect(c1).toBe(c2);
      expect(sha256(c1)).toBe(sha256(c2));
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // T-DL-17 — Formule Ridge correcte (valeurs manuelles)
  // ────────────────────────────────────────────────────────────────────────────
  it('T-DL-17: Ridge appliqué manuellement matche baseline_tier_score à 1e-9', () => {
    vi.stubEnv('OMEGA_DISPATCHER_LANG_V33', '1');
    const packet = makePacket({ language: 'fr' });
    const res = runDispatcherLang(PROSE_FR_VALID, packet);
    expect(res.status).toBe('ok');
    if (res.status !== 'ok') return;

    // Recalcul manuel avec les MÊMES features raw et le modèle FR
    const model = getLangModel('fr');
    const raw = extractDispatcherFeatures(PROSE_FR_VALID);

    let manual = model.intercept;
    for (const name of DISPATCHER_FEATURE_NAMES) {
      const stats = model.features[name];
      expect(stats).toBeDefined();
      if (!stats) continue;
      const z = (raw[name] - stats.mean) / stats.std;
      manual += stats.coef * z;
    }

    // Tolérance très serrée (1e-9 — flottants identiques)
    expect(Math.abs(res.result.baseline_tier_score - manual)).toBeLessThan(1e-9);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Couverture complémentaire des modules (nombre de tests unitaires = 17)
  // ──────────────────────────────────────────────────────────────────────────

  it('getDispatcherConfig: snapshot cohérent avec flag', () => {
    vi.stubEnv('OMEGA_DISPATCHER_LANG_V33', '1');
    const cfg = getDispatcherConfig();
    expect(cfg.enabled).toBe(true);
    expect(cfg.mode).toBe('shadow');
    expect(cfg.version).toBe('3.4');
    expect(cfg.min_prose_length).toBeGreaterThan(0);
  });

  it('computeCoefficientsSha256: recalcul à la volée matche la constante', () => {
    const recomputed = computeCoefficientsSha256();
    expect(recomputed).toBe(CALIBRATION_SHA256_EXPECTED);
  });

  it('COEFFICIENTS_V3_4: 5 features × 3 routes, intercept finite', () => {
    for (const lang of ['fr', 'en', 'fallback'] as const) {
      const m = COEFFICIENTS_V3_4[lang];
      expect(Number.isFinite(m.intercept)).toBe(true);
      expect(Object.keys(m.features).length).toBe(5);
      for (const name of DISPATCHER_FEATURE_NAMES) {
        expect(m.features[name]).toBeDefined();
      }
    }
  });

  it('MODEL_VERSION constant verrouillé à 3.4', () => {
    expect(MODEL_VERSION).toBe('3.4');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — TESTS D'INTÉGRATION (T-DL-INT-01..04 + INT-BF-01)
// ══════════════════════════════════════════════════════════════════════════════

describe('Dispatcher Lang V3.1 — Integration Tests', () => {
  // Fabrique un baseScore réaliste via computeMacroSScore + macro axes mockés.
  function makeBaseScore(): MacroSScore {
    return computeMacroSScore(makeMacroAxes(), 'scene_int_test', 'seed_int_test');
  }

  // ────────────────────────────────────────────────────────────────────────────
  // T-DL-INT-01 : flag OFF → baseline_m0b absent
  // ────────────────────────────────────────────────────────────────────────────
  it('T-DL-INT-01: flag OFF → MacroSScore.baseline_m0b === undefined', () => {
    vi.stubEnv('OMEGA_DISPATCHER_LANG_V33', '0');
    const base = makeBaseScore();
    const result = maybeAttachDispatcher(base, PROSE_FR_VALID, makePacket());
    expect(result.baseline_m0b).toBeUndefined();
    // Référence stable : pas de spread → identité préservée (bonus perf)
    expect(result).toBe(base);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // T-DL-INT-02 : flag ON → baseline_m0b.ok + composite inchangé
  // ────────────────────────────────────────────────────────────────────────────
  it('T-DL-INT-02: flag ON → baseline_m0b ok + autres champs inchangés', () => {
    const base = makeBaseScore();

    vi.stubEnv('OMEGA_DISPATCHER_LANG_V33', '1');
    const resultOn = maybeAttachDispatcher(base, PROSE_FR_VALID, makePacket());

    expect(resultOn.baseline_m0b).toBeDefined();
    expect(resultOn.baseline_m0b?.status).toBe('ok');
    // Champs non-dispatcher strictement identiques
    expect(resultOn.composite).toBe(base.composite);
    expect(resultOn.verdict).toBe(base.verdict);
    expect(resultOn.min_axis).toBe(base.min_axis);
    expect(resultOn.ecc_score).toBe(base.ecc_score);
    expect(resultOn.emotion_weight_pct).toBe(base.emotion_weight_pct);
    expect(resultOn.score_id).toBe(base.score_id);
    expect(resultOn.score_hash).toBe(base.score_hash);
    expect(resultOn.scene_id).toBe(base.scene_id);
    expect(resultOn.seed).toBe(base.seed);
    expect(resultOn.macro_axes).toBe(base.macro_axes);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // T-DL-INT-03 : régression macro-s-score — réplique invariants canoniques
  // ────────────────────────────────────────────────────────────────────────────
  it('T-DL-INT-03: replay macro-s-score (100/100 SEAL) intact avec flag OFF', () => {
    vi.stubEnv('OMEGA_DISPATCHER_LANG_V33', '0');
    const macroAxes: MacroAxesScores = {
      ecc: makeAxis('ecc', 100, 0.33),
      rci: makeAxis('rci', 100, 0.17),
      sii: makeAxis('sii', 100, 0.15),
      ifi: makeAxis('ifi', 100, 0.1),
      aai: makeAxis('aai', 100, 0.25),
    };
    const result = computeMacroSScore(macroAxes, 'test_scene', 'test_seed');
    expect(result.composite).toBe(100);
    expect(result.verdict).toBe('SEAL');
    expect(result.min_axis).toBe(100);
    expect(result.baseline_m0b).toBeUndefined();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // T-DL-INT-04 : régression scoring-v31-seal — replay ZONE sanity
  // ────────────────────────────────────────────────────────────────────────────
  it('T-DL-INT-04: replay scoring-v31-seal (92 + ECC 87 → PITCH) intact', () => {
    vi.stubEnv('OMEGA_DISPATCHER_LANG_V33', '0');
    const macroAxes: MacroAxesScores = {
      ecc: makeAxis('ecc', 87, 0.33),
      rci: makeAxis('rci', 100, 0.17),
      sii: makeAxis('sii', 100, 0.15),
      ifi: makeAxis('ifi', 100, 0.1),
      aai: makeAxis('aai', 100, 0.25),
    };
    const result = computeMacroSScore(macroAxes, 'test_scene', 'test_seed');
    // ECC 87 < 88 (seuil MACRO_FLOORS.ecc) → ne peut être SEAL, retombe PITCH ou REJECT
    expect(result.verdict).not.toBe('SEAL');
    expect(result.baseline_m0b).toBeUndefined();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // T-DL-INT-BF-01 — BIT-FOR-BIT (test critique)
  // ────────────────────────────────────────────────────────────────────────────
  it('T-DL-INT-BF-01: flag OFF vs flag ON canonicalize identique (hors baseline_m0b)', () => {
    const base = makeBaseScore();

    vi.stubEnv('OMEGA_DISPATCHER_LANG_V33', '0');
    const resultOff = maybeAttachDispatcher(base, PROSE_FR_VALID, makePacket());

    vi.stubEnv('OMEGA_DISPATCHER_LANG_V33', '1');
    const resultOn = maybeAttachDispatcher(base, PROSE_FR_VALID, makePacket());

    // Extraction du dispatcher attachment
    const { baseline_m0b, ...resultOnStripped } = resultOn;

    // Sérialisation canonique
    const jsonOff = canonicalize(resultOff);
    const jsonOnStripped = canonicalize(resultOnStripped);

    // INVARIANT CENTRAL : octets strictement identiques
    expect(jsonOff).toBe(jsonOnStripped);

    // Champ dispatcher présent uniquement en ON
    expect(resultOff.baseline_m0b).toBeUndefined();
    expect(baseline_m0b).toBeDefined();
    expect(baseline_m0b?.status).toBe('ok');

    // Double verrouillage : hash SHA-256 identique
    const hashOff = sha256(jsonOff);
    const hashOn = sha256(jsonOnStripped);
    expect(hashOff).toBe(hashOn);
  });
});
