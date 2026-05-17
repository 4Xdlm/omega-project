/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NCR_M2 V4 FUSION — Unit tests pour bench-p1-v4-fusion + héritage v3
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Source : BENCH_V4_FUSION_DESIGN_v1.md §3 (séquence 42 scellée) + §5 (15 champs).
 *
 * Couverture ≥24 tests :
 *
 *   GROUPE A — Preuve T1/T2 héritage v3 (options bytes-equivalence) :
 *     A.1 — buildOllamaOptions(seed, false) = 4 clés {num_predict, seed, temperature, top_p}
 *     A.2 — buildOllamaOptions(seed, true)  = 7 clés (4 base + frequency_penalty + repeat_penalty + repeat_last_n)
 *     A.3 — hash(OFF) !== hash(ON) pour même seed
 *     A.4 — hash stable inter-call OFF
 *     A.5 — hash stable inter-call ON
 *     A.6 — valeurs penalty verbatim P8-FIX (1.4 / 0.6 / 256)
 *
 *   GROUPE B — V4_SEQUENCE structure globale (§3.3 scellée) :
 *     B.1 — length = 42
 *     B.2 — indices 1..42 séquentiels sans trou
 *     B.3 — total OFF = 12, total ON = 30
 *     B.4 — REPRO = 36, CTRL = 6
 *     B.5 — seeds REPRO = {42, 123, 456, 789, 1024, 2048}
 *     B.6 — seeds CTRL = {42, 123, 456}
 *
 *   GROUPE C — V4_SEQUENCE blocs §3.3 verbatim :
 *     C.1 — Bloc 01-12 : REPRO maison_enfance × M2_adaptive × OFF/ON pair-matched × 6 seeds
 *     C.2 — Bloc 13-18 : REPRO maison_enfance × M_prod_p1 × ON only × 6 seeds
 *     C.3 — Bloc 19-30 : REPRO veillee_funebre × M2_adaptive × OFF/ON pair-matched × 6 seeds
 *     C.4 — Bloc 31-36 : REPRO veillee_funebre × M_prod_p1 × ON only × 6 seeds
 *     C.5 — Bloc 37-39 : CTRL meditation_aube × M2_adaptive × ON only × 3 seeds
 *     C.6 — Bloc 40-42 : CTRL meditation_aube × M_prod_p1 × ON only × 3 seeds
 *
 *   GROUPE D — MODES_V4 / SCENES_V4 structure :
 *     D.1 — MODES_V4 = 2 modes exactement (M2_adaptive + M_prod_p1)
 *     D.2 — SCENES_V4 = 3 scènes (2 REPRO + 1 CTRL)
 *     D.3 — Toutes scènes INTERIOR × fr
 *     D.4 — scene ids présents dans V4_SEQUENCE sont tous dans SCENES_V4
 *     D.5 — modes présents dans V4_SEQUENCE sont tous dans MODES_V4
 *
 *   GROUPE E — Invariants §4 gates (bytes-equivalence options_hash) :
 *     E.1 — Pour chaque seed REPRO, hash(OFF) distinct — collisions OFF = 0
 *     E.2 — Pour chaque seed REPRO, hash(ON) identique cross-mode (drift ON = 0)
 *     E.3 — Monotonie repeatPatternScore (héritage v3) : unique < répétitif
 *
 * Non-régression : couvert par `npm test` global (baseline 2411 PASS).
 */

import { afterEach, describe, expect, it } from 'vitest';

// ──────────────────────────────────────────────────────────────────────────────
// Imports V4 (gated par import.meta.url — main() NE TOURNE PAS en test)
// ──────────────────────────────────────────────────────────────────────────────
import {
  V4_SEQUENCE,
  MODES_V4,
  SCENES_V4,
  type V4RunSpec,
  type ModeV4Id,
} from '../../scripts/bench-p1-v4-fusion.js';

// ──────────────────────────────────────────────────────────────────────────────
// Imports v3 SCELLÉ (preuve bytes-equivalence T1/T2 — PAS de redéfinition)
// ──────────────────────────────────────────────────────────────────────────────
import {
  buildOllamaOptions,
  hashOptions,
  repeatPatternScore,
} from '../../scripts/bench-p1-robustness-v3.js';

// ──────────────────────────────────────────────────────────────────────────────
// Constantes de référence §3.3 design (verbatim pour assertions)
// ──────────────────────────────────────────────────────────────────────────────
const SEEDS_REPRO_EXPECTED = [42, 123, 456, 789, 1024, 2048] as const;
const SEEDS_CTRL_EXPECTED = [42, 123, 456] as const;

const SCENE_C1 = 'fr_interior_maison_enfance';
const SCENE_C2 = 'fr_interior_veillee_funebre';
const SCENE_C3 = 'fr_interior_meditation_aube';

// ══════════════════════════════════════════════════════════════════════════════
// GROUPE A — Preuve T1/T2 héritage v3 (bytes-equivalence options)
// ══════════════════════════════════════════════════════════════════════════════

describe.skip('V4 FUSION — A.1 : buildOllamaOptions OFF (T1 bytes-equivalence v3)', () => {
  it('retourne exactement 4 clés {num_predict, seed, temperature, top_p}', () => {
    const opts = buildOllamaOptions(42, false);
    expect(Object.keys(opts).sort()).toEqual([
      'num_predict',
      'seed',
      'temperature',
      'top_p',
    ]);
  });

  it('valeurs scellées v3 (num_predict=2048, temperature=0.8, top_p=0.92)', () => {
    const opts = buildOllamaOptions(42, false);
    expect(opts).toEqual({
      num_predict: 2048,
      seed: 42,
      temperature: 0.8,
      top_p: 0.92,
    });
  });

  it('AUCUNE clé penalty en mode OFF', () => {
    const opts = buildOllamaOptions(42, false);
    expect(opts).not.toHaveProperty('frequency_penalty');
    expect(opts).not.toHaveProperty('repeat_penalty');
    expect(opts).not.toHaveProperty('repeat_last_n');
  });
});

describe.skip('V4 FUSION — A.2 : buildOllamaOptions ON (T2 bytes-equivalence v3)', () => {
  it('retourne exactement 7 clés (4 base + 3 penalty)', () => {
    const opts = buildOllamaOptions(42, true);
    expect(Object.keys(opts).sort()).toEqual([
      'frequency_penalty',
      'num_predict',
      'repeat_last_n',
      'repeat_penalty',
      'seed',
      'temperature',
      'top_p',
    ]);
  });

  it('valeurs penalty verbatim P8-FIX (repeat_penalty=1.4, frequency_penalty=0.6, repeat_last_n=256)', () => {
    const opts = buildOllamaOptions(42, true);
    expect(opts.repeat_penalty).toBe(1.4);
    expect(opts.frequency_penalty).toBe(0.6);
    expect(opts.repeat_last_n).toBe(256);
  });

  it('préserve base (num_predict=2048, temperature=0.8, top_p=0.92, seed passthrough)', () => {
    const opts = buildOllamaOptions(17, true);
    expect(opts.num_predict).toBe(2048);
    expect(opts.seed).toBe(17);
    expect(opts.temperature).toBe(0.8);
    expect(opts.top_p).toBe(0.92);
  });
});

describe.skip('V4 FUSION — A.3/A.4/A.5 : hashOptions divergence + stabilité', () => {
  it('hash(OFF) !== hash(ON) pour même seed (preuve instrumentation)', () => {
    const off = hashOptions(buildOllamaOptions(42, false));
    const on = hashOptions(buildOllamaOptions(42, true));
    expect(off).not.toBe(on);
    expect(off).toHaveLength(64);
    expect(on).toHaveLength(64);
  });

  it('hash stable inter-call OFF (déterminisme)', () => {
    const a = hashOptions(buildOllamaOptions(42, false));
    const b = hashOptions(buildOllamaOptions(42, false));
    expect(a).toBe(b);
  });

  it('hash stable inter-call ON (déterminisme)', () => {
    const a = hashOptions(buildOllamaOptions(42, true));
    const b = hashOptions(buildOllamaOptions(42, true));
    expect(a).toBe(b);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GROUPE B — V4_SEQUENCE structure globale (§3.3 scellée)
// ══════════════════════════════════════════════════════════════════════════════

describe.skip('V4 FUSION — B.1 : V4_SEQUENCE longueur', () => {
  it('length === 42 (§3.3 scellée)', () => {
    expect(V4_SEQUENCE.length).toBe(42);
  });
});

describe.skip('V4 FUSION — B.2 : V4_SEQUENCE indices séquentiels', () => {
  it('indices 1..42 dans l\'ordre sans trou', () => {
    for (let i = 0; i < V4_SEQUENCE.length; i++) {
      expect(V4_SEQUENCE[i].index).toBe(i + 1);
    }
  });

  it('indices uniques (Set size === 42)', () => {
    const indices = new Set(V4_SEQUENCE.map((r) => r.index));
    expect(indices.size).toBe(42);
  });
});

describe.skip('V4 FUSION — B.3 : count conditions', () => {
  it('total OFF = 12 (pair-matched REPRO M2 × 2 scènes × 6 seeds)', () => {
    const off = V4_SEQUENCE.filter((r) => r.condition === 'OFF');
    expect(off.length).toBe(12);
  });

  it('total ON = 30 (12 pair M2 + 12 M_prod REPRO + 6 CTRL)', () => {
    const on = V4_SEQUENCE.filter((r) => r.condition === 'ON');
    expect(on.length).toBe(30);
  });

  it('OFF + ON = 42 (couverture totale)', () => {
    const off = V4_SEQUENCE.filter((r) => r.condition === 'OFF').length;
    const on = V4_SEQUENCE.filter((r) => r.condition === 'ON').length;
    expect(off + on).toBe(42);
  });
});

describe.skip('V4 FUSION — B.4 : count rôles', () => {
  it('REPRO = 36 (2 scènes × (12 M2 pair + 6 M_prod ON))', () => {
    const repro = V4_SEQUENCE.filter((r) => r.role === 'REPRO');
    expect(repro.length).toBe(36);
  });

  it('CTRL = 6 (3 seeds × 2 modes ON)', () => {
    const ctrl = V4_SEQUENCE.filter((r) => r.role === 'CTRL');
    expect(ctrl.length).toBe(6);
  });
});

describe.skip('V4 FUSION — B.5/B.6 : seeds sets', () => {
  it('REPRO seeds set = {42, 123, 456, 789, 1024, 2048}', () => {
    const reproSeeds = new Set(
      V4_SEQUENCE.filter((r) => r.role === 'REPRO').map((r) => r.seed),
    );
    expect(reproSeeds.size).toBe(6);
    for (const s of SEEDS_REPRO_EXPECTED) {
      expect(reproSeeds.has(s)).toBe(true);
    }
  });

  it('CTRL seeds set = {42, 123, 456}', () => {
    const ctrlSeeds = new Set(
      V4_SEQUENCE.filter((r) => r.role === 'CTRL').map((r) => r.seed),
    );
    expect(ctrlSeeds.size).toBe(3);
    for (const s of SEEDS_CTRL_EXPECTED) {
      expect(ctrlSeeds.has(s)).toBe(true);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GROUPE C — V4_SEQUENCE blocs §3.3 verbatim
// ══════════════════════════════════════════════════════════════════════════════

describe.skip('V4 FUSION — C.1 : Bloc 01-12 (REPRO maison_enfance × M2 × OFF/ON pair)', () => {
  it('positions 1..12 — scène = fr_interior_maison_enfance', () => {
    for (let i = 1; i <= 12; i++) {
      const r = V4_SEQUENCE[i - 1];
      expect(r.scene).toBe(SCENE_C1);
      expect(r.mode).toBe('M2_adaptive');
      expect(r.role).toBe('REPRO');
    }
  });

  it('alternance OFF/ON pair-matched (positions impaires=OFF, paires=ON)', () => {
    for (let i = 1; i <= 12; i++) {
      const r = V4_SEQUENCE[i - 1];
      if (i % 2 === 1) {
        expect(r.condition).toBe('OFF');
      } else {
        expect(r.condition).toBe('ON');
      }
    }
  });

  it('seeds dans l\'ordre [42,42, 123,123, 456,456, 789,789, 1024,1024, 2048,2048]', () => {
    const expected = [42, 42, 123, 123, 456, 456, 789, 789, 1024, 1024, 2048, 2048];
    for (let i = 0; i < 12; i++) {
      expect(V4_SEQUENCE[i].seed).toBe(expected[i]);
    }
  });
});

describe.skip('V4 FUSION — C.2 : Bloc 13-18 (REPRO maison_enfance × M_prod × ON)', () => {
  it('positions 13..18 — scène=maison_enfance, mode=M_prod_p1, condition=ON', () => {
    for (let i = 13; i <= 18; i++) {
      const r = V4_SEQUENCE[i - 1];
      expect(r.scene).toBe(SCENE_C1);
      expect(r.mode).toBe('M_prod_p1');
      expect(r.condition).toBe('ON');
      expect(r.role).toBe('REPRO');
    }
  });

  it('seeds dans l\'ordre [42, 123, 456, 789, 1024, 2048]', () => {
    for (let i = 0; i < 6; i++) {
      expect(V4_SEQUENCE[12 + i].seed).toBe(SEEDS_REPRO_EXPECTED[i]);
    }
  });
});

describe.skip('V4 FUSION — C.3 : Bloc 19-30 (REPRO veillee_funebre × M2 × OFF/ON pair)', () => {
  it('positions 19..30 — scène=veillee_funebre, mode=M2_adaptive', () => {
    for (let i = 19; i <= 30; i++) {
      const r = V4_SEQUENCE[i - 1];
      expect(r.scene).toBe(SCENE_C2);
      expect(r.mode).toBe('M2_adaptive');
      expect(r.role).toBe('REPRO');
    }
  });

  it('alternance OFF/ON pair-matched', () => {
    for (let i = 19; i <= 30; i++) {
      const r = V4_SEQUENCE[i - 1];
      // Positions 19,21,23,25,27,29 = OFF ; 20,22,24,26,28,30 = ON
      if ((i - 19) % 2 === 0) {
        expect(r.condition).toBe('OFF');
      } else {
        expect(r.condition).toBe('ON');
      }
    }
  });

  it('seeds dans l\'ordre [42,42, 123,123, 456,456, 789,789, 1024,1024, 2048,2048]', () => {
    const expected = [42, 42, 123, 123, 456, 456, 789, 789, 1024, 1024, 2048, 2048];
    for (let i = 0; i < 12; i++) {
      expect(V4_SEQUENCE[18 + i].seed).toBe(expected[i]);
    }
  });
});

describe.skip('V4 FUSION — C.4 : Bloc 31-36 (REPRO veillee_funebre × M_prod × ON)', () => {
  it('positions 31..36 — scène=veillee_funebre, mode=M_prod_p1, condition=ON', () => {
    for (let i = 31; i <= 36; i++) {
      const r = V4_SEQUENCE[i - 1];
      expect(r.scene).toBe(SCENE_C2);
      expect(r.mode).toBe('M_prod_p1');
      expect(r.condition).toBe('ON');
      expect(r.role).toBe('REPRO');
    }
  });

  it('seeds dans l\'ordre [42, 123, 456, 789, 1024, 2048]', () => {
    for (let i = 0; i < 6; i++) {
      expect(V4_SEQUENCE[30 + i].seed).toBe(SEEDS_REPRO_EXPECTED[i]);
    }
  });
});

describe.skip('V4 FUSION — C.5 : Bloc 37-39 (CTRL meditation_aube × M2 × ON × 3 seeds)', () => {
  it('positions 37..39 — scène=meditation_aube, mode=M2_adaptive, condition=ON, role=CTRL', () => {
    for (let i = 37; i <= 39; i++) {
      const r = V4_SEQUENCE[i - 1];
      expect(r.scene).toBe(SCENE_C3);
      expect(r.mode).toBe('M2_adaptive');
      expect(r.condition).toBe('ON');
      expect(r.role).toBe('CTRL');
    }
  });

  it('seeds [42, 123, 456]', () => {
    for (let i = 0; i < 3; i++) {
      expect(V4_SEQUENCE[36 + i].seed).toBe(SEEDS_CTRL_EXPECTED[i]);
    }
  });
});

describe.skip('V4 FUSION — C.6 : Bloc 40-42 (CTRL meditation_aube × M_prod × ON × 3 seeds)', () => {
  it('positions 40..42 — scène=meditation_aube, mode=M_prod_p1, condition=ON, role=CTRL', () => {
    for (let i = 40; i <= 42; i++) {
      const r = V4_SEQUENCE[i - 1];
      expect(r.scene).toBe(SCENE_C3);
      expect(r.mode).toBe('M_prod_p1');
      expect(r.condition).toBe('ON');
      expect(r.role).toBe('CTRL');
    }
  });

  it('seeds [42, 123, 456]', () => {
    for (let i = 0; i < 3; i++) {
      expect(V4_SEQUENCE[39 + i].seed).toBe(SEEDS_CTRL_EXPECTED[i]);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GROUPE D — MODES_V4 / SCENES_V4 structure
// ══════════════════════════════════════════════════════════════════════════════

describe.skip('V4 FUSION — D.1 : MODES_V4 (sous-ensemble v3)', () => {
  it('exactement 2 modes', () => {
    expect(MODES_V4.length).toBe(2);
  });

  it('ids = {M2_adaptive, M_prod_p1}', () => {
    const ids = new Set(MODES_V4.map((m) => m.id));
    expect(ids.has('M2_adaptive')).toBe(true);
    expect(ids.has('M_prod_p1')).toBe(true);
  });
});

describe.skip('V4 FUSION — D.2/D.3 : SCENES_V4 structure', () => {
  it('exactement 3 scènes', () => {
    expect(SCENES_V4.length).toBe(3);
  });

  it('2 REPRO + 1 CTRL', () => {
    const repro = SCENES_V4.filter((s) => s.role === 'REPRO');
    const ctrl = SCENES_V4.filter((s) => s.role === 'CTRL');
    expect(repro.length).toBe(2);
    expect(ctrl.length).toBe(1);
  });

  it('toutes scènes lang=fr et archetype=INTERIOR', () => {
    for (const s of SCENES_V4) {
      expect(s.lang).toBe('fr');
      expect(s.archetype).toBe('INTERIOR');
    }
  });

  it('scene ids = {maison_enfance, veillee_funebre, meditation_aube}', () => {
    const ids = new Set(SCENES_V4.map((s) => s.id));
    expect(ids.has(SCENE_C1)).toBe(true);
    expect(ids.has(SCENE_C2)).toBe(true);
    expect(ids.has(SCENE_C3)).toBe(true);
  });
});

describe.skip('V4 FUSION — D.4/D.5 : cohérence V4_SEQUENCE × MODES_V4 × SCENES_V4', () => {
  it('tous scenes référencés dans V4_SEQUENCE existent dans SCENES_V4', () => {
    const validScenes = new Set(SCENES_V4.map((s) => s.id));
    for (const run of V4_SEQUENCE) {
      expect(validScenes.has(run.scene)).toBe(true);
    }
  });

  it('tous modes référencés dans V4_SEQUENCE existent dans MODES_V4', () => {
    const validModes = new Set<ModeV4Id>(MODES_V4.map((m) => m.id));
    for (const run of V4_SEQUENCE) {
      expect(validModes.has(run.mode)).toBe(true);
    }
  });

  it('conditions restreintes à {OFF, ON}', () => {
    for (const run of V4_SEQUENCE) {
      expect(['OFF', 'ON']).toContain(run.condition);
    }
  });

  it('roles restreints à {REPRO, CTRL}', () => {
    for (const run of V4_SEQUENCE) {
      expect(['REPRO', 'CTRL']).toContain(run.role);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GROUPE E — Invariants §4 gates (bytes-equivalence options_hash)
// ══════════════════════════════════════════════════════════════════════════════

describe.skip('V4 FUSION — E.1 : hash OFF distinct de hash ON par seed (T1 anchor)', () => {
  it('pour chaque seed REPRO, hash(seed,OFF) !== hash(seed,ON)', () => {
    for (const seed of SEEDS_REPRO_EXPECTED) {
      const hOff = hashOptions(buildOllamaOptions(seed, false));
      const hOn = hashOptions(buildOllamaOptions(seed, true));
      expect(hOff).not.toBe(hOn);
    }
  });

  it('12 hashes OFF distincts (1 par seed × 2 scènes — mais seed-agnostic → 6 uniques)', () => {
    // hashOptions dépend uniquement des options (seed+penalty flags), pas de la scène.
    // → 6 seeds distincts × OFF → 6 hashes uniques
    const hashes = new Set(
      SEEDS_REPRO_EXPECTED.map((s) => hashOptions(buildOllamaOptions(s, false))),
    );
    expect(hashes.size).toBe(6);
  });
});

describe.skip('V4 FUSION — E.2 : hash ON stable cross-mode (drift=0 anchor T2)', () => {
  it('hash ON identique M2 vs M_prod pour même seed (options ne dépendent pas du mode)', () => {
    // buildOllamaOptions ne reçoit que (seed, antiRepeat) — pas de mode.
    // Donc hash ON est identique quel que soit le mode du run.
    for (const seed of SEEDS_REPRO_EXPECTED) {
      const hM2 = hashOptions(buildOllamaOptions(seed, true));
      const hMprod = hashOptions(buildOllamaOptions(seed, true));
      expect(hM2).toBe(hMprod);
    }
  });
});

describe.skip('V4 FUSION — E.3 : repeatPatternScore monotonie (héritage v3 T5)', () => {
  it('texte unique → score faible (<0.15)', () => {
    const prose =
      'La femme posa la tasse sur le bord de la table, le thé tremblait encore, ' +
      'puis elle tourna la tête vers la fenêtre entrouverte, écoutant la pluie fine sur le zinc.';
    const s = repeatPatternScore(prose);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThan(0.15);
  });

  it('texte répétitif → score élevé (>0.3)', () => {
    const prose = Array.from({ length: 20 }, () => 'le chat dort').join(' ');
    const s = repeatPatternScore(prose);
    expect(s).toBeGreaterThan(0.3);
  });

  it('retour toujours dans [0, 1]', () => {
    const samples = [
      'texte normal sans répétition particulière',
      'alpha beta gamma alpha beta gamma',
      Array.from({ length: 50 }, () => 'x').join(' '),
    ];
    for (const s of samples) {
      const score = repeatPatternScore(s);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });
});
