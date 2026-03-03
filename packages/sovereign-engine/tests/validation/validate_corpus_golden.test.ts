/**
 * validate_corpus_golden.test.ts
 * U-W1 — Tests du validateur Corpus Golden
 *
 * INV-U-02: human_ratio >= 0.70
 * Couverture: 9 règles × happy path + edge cases
 * Standard: NASA-Grade L4 / DO-178C — PASS ou FAIL
 */

import { describe, it, expect } from 'vitest';
import {
  validateCorpusGolden,
  validateCorpusFromJson,
  CorpusValidationError,
  type CorpusGolden,
  type CorpusItem,
  type ValidationResult,
} from '../../src/validation/phase-u/corpus/validate_corpus_golden';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeItem(overrides: Partial<CorpusItem> = {}): CorpusItem {
  return {
    id:             'CG-001',
    category:       'human_top',
    human_authored: true,
    title:          'La Route des Flandres',
    author:         'Claude Simon',
    language:       'fr',
    corpus:         'FR-ORIG',
    source_file:    'La_Route_des_Flandres.pdf',
    ranking_v4: {
      F22_index_litteraire: 0.560,
      F24_contrast_budget:  0.919,
      F25_image_mentale:    0.546,
      F29_TTR:              0.759,
      ranking_v4_rejected:  false,
    },
    human_scored: false,
    scores: {
      D1_prose:      null,
      D2_impact:     null,
      D3_originalite: null,
      scorer_id:     null,
      scored_at:     null,
    },
    ...overrides,
  };
}

/** Génère N items humains distincts */
function makeHumanItems(n: number, catOverride?: CorpusItem['category'], offset = 0): CorpusItem[] {
  return Array.from({ length: n }, (_, i) =>
    makeItem({ id: `CG-H${String(i + 1 + offset).padStart(3, '0')}`, category: catOverride ?? 'human_top' })
  );
}

/** Génère N items anti_ia (human_authored=false) */
function makeAntiIaItems(n: number): CorpusItem[] {
  return Array.from({ length: n }, (_, i) =>
    makeItem({
      id:             `CG-AI${String(i + 1).padStart(3, '0')}`,
      category:       'anti_ia',
      human_authored: false,
      title:          `[IA_GENERIC] Anti example ${i + 1}`,
      author:         'IA_GENERATED',
      ranking_v4: { F22_index_litteraire: null, F24_contrast_budget: null, F25_image_mentale: null, F29_TTR: null, ranking_v4_rejected: false },
    })
  );
}

function makeValidCorpus(): CorpusGolden {
  // 75 human + 10 anti_ia = 85 items, ratio 88.2% ≥ 70%
  const items: CorpusItem[] = [
    ...makeHumanItems(25, 'human_top',    0),
    ...makeHumanItems(25, 'human_public', 25),
    ...makeHumanItems(25, 'omega_top25',  50),
    ...makeAntiIaItems(10),
  ];
  return {
    version:        '1.0.0',
    created_utc:    '2026-03-03T18:00:00Z',
    ranking_v4_sha: '5ec58de15537a9c19252dca723c74d3f547dff49828ac2a6d943f530617ab775',
    rules: {
      min_human_ratio:  0.70,
      target_items:     85,
      score_dimensions: ['D1_prose', 'D2_impact', 'D3_originalite'],
      scale:            [0, 100],
    },
    stats: {},
    items,
  };
}

// ── Helpers d'assertion ───────────────────────────────────────────────────────

function expectPass(result: ValidationResult): void {
  expect(result.verdict).toBe('PASS');
  expect(result.violations).toHaveLength(0);
}

function expectFail(result: ValidationResult, rulePrefix: string): void {
  expect(result.verdict).toBe('FAIL');
  const match = result.violations.some(v => v.rule.startsWith(rulePrefix));
  expect(match, `Expected violation starting with "${rulePrefix}", got: ${JSON.stringify(result.violations)}`).toBe(true);
}

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 1 — Happy path (corpus valide)
// ══════════════════════════════════════════════════════════════════════════════

describe('U-W1 validateCorpusGolden — happy path', () => {
  it('CG-HP-01: corpus valide → PASS, 0 violations', () => {
    const result = validateCorpusGolden(makeValidCorpus());
    expectPass(result);
    expect(result.stats.total).toBe(85);
    expect(result.stats.human_authored).toBe(75);
    expect(result.stats.inv_u02_pass).toBe(true);
  });

  it('CG-HP-02: stats by_category correctes', () => {
    const result = validateCorpusGolden(makeValidCorpus());
    expect(result.stats.by_category.human_top).toBe(25);
    expect(result.stats.by_category.human_public).toBe(25);
    expect(result.stats.by_category.omega_top25).toBe(25);
    expect(result.stats.by_category.anti_ia).toBe(10);
  });

  it('CG-HP-03: human_ratio = 0.8824 (75/85)', () => {
    const result = validateCorpusGolden(makeValidCorpus());
    expect(result.stats.human_ratio).toBe(0.8824);
  });

  it('CG-HP-04: corpus minimal valide — exactement 70% human', () => {
    // 70 human + 30 anti_ia = 100 items, ratio exactement 0.70
    const items: CorpusItem[] = [
      ...makeHumanItems(70, 'human_top'),
      ...makeAntiIaItems(30),
    ];
    const corpus: CorpusGolden = {
      ...makeValidCorpus(),
      rules: { ...makeValidCorpus().rules, target_items: 100 },
      items,
    };
    const result = validateCorpusGolden(corpus);
    expectPass(result);
    expect(result.stats.human_ratio).toBe(0.7);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 2 — RULE-CG-01: total_items
// ══════════════════════════════════════════════════════════════════════════════

describe('U-W1 RULE-CG-01 — total_items', () => {
  it('CG-01-01: 84 items au lieu de 85 → FAIL RULE-CG-01', () => {
    const corpus = makeValidCorpus();
    corpus.items.pop();
    expectFail(validateCorpusGolden(corpus), 'RULE-CG-01');
  });

  it('CG-01-02: 86 items au lieu de 85 → FAIL RULE-CG-01', () => {
    const corpus = makeValidCorpus();
    corpus.items.push(makeItem({ id: 'CG-EXTRA' }));
    expectFail(validateCorpusGolden(corpus), 'RULE-CG-01');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 3 — RULE-CG-02: INV-U-02 human_ratio
// ══════════════════════════════════════════════════════════════════════════════

describe('U-W1 RULE-CG-02 [INV-U-02] — human_ratio', () => {
  it('CG-02-01: ratio < 0.70 → FAIL RULE-CG-02', () => {
    // 50 human + 50 anti_ia → ratio 50% < 70%
    const items: CorpusItem[] = [
      ...makeHumanItems(50, 'human_top'),
      ...makeAntiIaItems(35),
    ];
    // pad jusqu'à 85 avec anti_ia
    items.push(
      ...Array.from({ length: 0 }, () => makeAntiIaItems(1)[0])
    );
    // override: 50 human / 85 items = 58.8%
    const corpus: CorpusGolden = {
      ...makeValidCorpus(),
      items: [...makeHumanItems(50, 'human_top'), ...makeAntiIaItems(35)],
      rules: { ...makeValidCorpus().rules, target_items: 85 },
    };
    // 50+35=85, 50/85=58.8% → CG-01 PASS, CG-02 FAIL
    const result = validateCorpusGolden(corpus);
    expect(result.verdict).toBe('FAIL');
    expect(result.violations.some(v => v.rule.startsWith('RULE-CG-02'))).toBe(true);
  });

  it('CG-02-02: ratio exactement 70% → PASS INV-U-02', () => {
    const items = [...makeHumanItems(70, 'human_top'), ...makeAntiIaItems(30)];
    const corpus: CorpusGolden = { ...makeValidCorpus(), items, rules: { ...makeValidCorpus().rules, target_items: 100 } };
    const result = validateCorpusGolden(corpus);
    expect(result.stats.inv_u02_pass).toBe(true);
    expect(result.violations.some(v => v.rule.startsWith('RULE-CG-02'))).toBe(false);
  });

  it('CG-02-03: ratio 69.9% → FAIL INV-U-02', () => {
    // 69 human + 31 anti_ia = 100, 69% < 70%
    const items = [...makeHumanItems(69, 'human_top'), ...makeAntiIaItems(31)];
    const corpus: CorpusGolden = { ...makeValidCorpus(), items, rules: { ...makeValidCorpus().rules, target_items: 100 } };
    const result = validateCorpusGolden(corpus);
    expect(result.violations.some(v => v.rule.startsWith('RULE-CG-02'))).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 4 — RULE-CG-03: IDs uniques
// ══════════════════════════════════════════════════════════════════════════════

describe('U-W1 RULE-CG-03 — IDs uniques', () => {
  it('CG-03-01: ID dupliqué → FAIL RULE-CG-03', () => {
    const corpus = makeValidCorpus();
    // dupliquer le premier item avec même ID
    corpus.items[1] = { ...corpus.items[0] };
    expectFail(validateCorpusGolden(corpus), 'RULE-CG-03');
  });

  it('CG-03-02: tous IDs distincts → pas de violation CG-03', () => {
    const result = validateCorpusGolden(makeValidCorpus());
    expect(result.violations.filter(v => v.rule === 'RULE-CG-03')).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 5 — RULE-CG-04: champs obligatoires
// ══════════════════════════════════════════════════════════════════════════════

describe('U-W1 RULE-CG-04 — champs obligatoires', () => {
  it('CG-04-01: title vide → FAIL RULE-CG-04', () => {
    const corpus = makeValidCorpus();
    corpus.items[0] = makeItem({ id: 'CG-H001', title: '' });
    expectFail(validateCorpusGolden(corpus), 'RULE-CG-04');
  });

  it('CG-04-02: author manquant (empty) → FAIL RULE-CG-04', () => {
    const corpus = makeValidCorpus();
    corpus.items[0] = makeItem({ id: 'CG-H001', author: '' });
    expectFail(validateCorpusGolden(corpus), 'RULE-CG-04');
  });

  it('CG-04-03: category invalide → FAIL RULE-CG-04b', () => {
    const corpus = makeValidCorpus();
    corpus.items[0] = makeItem({ id: 'CG-H001', category: 'unknown' as never });
    expectFail(validateCorpusGolden(corpus), 'RULE-CG-04b');
  });

  it('CG-04-04: language invalide → FAIL RULE-CG-04c', () => {
    const corpus = makeValidCorpus();
    corpus.items[0] = makeItem({ id: 'CG-H001', language: 'de' as never });
    expectFail(validateCorpusGolden(corpus), 'RULE-CG-04c');
  });

  it('CG-04-05: source_file vide → FAIL RULE-CG-04', () => {
    const corpus = makeValidCorpus();
    corpus.items[0] = makeItem({ id: 'CG-H001', source_file: '' });
    expectFail(validateCorpusGolden(corpus), 'RULE-CG-04');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 6 — RULE-CG-05: scores [0, 100]
// ══════════════════════════════════════════════════════════════════════════════

describe('U-W1 RULE-CG-05 — scores dans [0, 100]', () => {
  it('CG-05-01: D1_prose=101 → FAIL RULE-CG-05', () => {
    const corpus = makeValidCorpus();
    corpus.items[0] = makeItem({ id: 'CG-H001', scores: { D1_prose: 101, D2_impact: null, D3_originalite: null, scorer_id: null, scored_at: null } });
    expectFail(validateCorpusGolden(corpus), 'RULE-CG-05');
  });

  it('CG-05-02: D2_impact=-1 → FAIL RULE-CG-05', () => {
    const corpus = makeValidCorpus();
    corpus.items[0] = makeItem({ id: 'CG-H001', scores: { D1_prose: null, D2_impact: -1, D3_originalite: null, scorer_id: null, scored_at: null } });
    expectFail(validateCorpusGolden(corpus), 'RULE-CG-05');
  });

  it('CG-05-03: scores NaN → FAIL RULE-CG-05', () => {
    const corpus = makeValidCorpus();
    corpus.items[0] = makeItem({ id: 'CG-H001', scores: { D1_prose: NaN, D2_impact: null, D3_originalite: null, scorer_id: null, scored_at: null } });
    expectFail(validateCorpusGolden(corpus), 'RULE-CG-05');
  });

  it('CG-05-04: scores null → PASS (non renseigné = autorisé)', () => {
    const result = validateCorpusGolden(makeValidCorpus());
    expect(result.violations.filter(v => v.rule === 'RULE-CG-05')).toHaveLength(0);
  });

  it('CG-05-05: scores 0 et 100 → PASS (bornes incluses)', () => {
    const corpus = makeValidCorpus();
    corpus.items[0] = makeItem({ id: 'CG-H001', scores: { D1_prose: 0, D2_impact: 100, D3_originalite: 50, scorer_id: 'scorer-1', scored_at: '2026-03-03T00:00:00Z' } });
    const result = validateCorpusGolden(corpus);
    expect(result.violations.filter(v => v.rule === 'RULE-CG-05')).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 7 — RULE-CG-06/07: invariants catégorie ↔ human_authored
// ══════════════════════════════════════════════════════════════════════════════

describe('U-W1 RULE-CG-06/07 — invariants catégorie × human_authored', () => {
  it('CG-06-01: anti_ia avec human_authored=true → FAIL RULE-CG-06', () => {
    const corpus = makeValidCorpus();
    const aiIdx = corpus.items.findIndex(i => i.category === 'anti_ia');
    corpus.items[aiIdx] = { ...corpus.items[aiIdx], human_authored: true };
    expectFail(validateCorpusGolden(corpus), 'RULE-CG-06');
  });

  it('CG-06-02: anti_ia avec human_authored=false → pas de violation CG-06', () => {
    const result = validateCorpusGolden(makeValidCorpus());
    expect(result.violations.filter(v => v.rule === 'RULE-CG-06')).toHaveLength(0);
  });

  it('CG-07-01: omega_top25 avec human_authored=false → FAIL RULE-CG-07', () => {
    const corpus = makeValidCorpus();
    const idx = corpus.items.findIndex(i => i.category === 'omega_top25');
    corpus.items[idx] = { ...corpus.items[idx], human_authored: false };
    expectFail(validateCorpusGolden(corpus), 'RULE-CG-07');
  });

  it('CG-07-02: omega_top25 avec human_authored=true → pas de violation CG-07', () => {
    const result = validateCorpusGolden(makeValidCorpus());
    expect(result.violations.filter(v => v.rule === 'RULE-CG-07')).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 8 — RULE-CG-08/09: métadonnées corpus
// ══════════════════════════════════════════════════════════════════════════════

describe('U-W1 RULE-CG-08/09 — métadonnées corpus', () => {
  it('CG-08-01: ranking_v4_sha vide → FAIL RULE-CG-08', () => {
    const corpus = { ...makeValidCorpus(), ranking_v4_sha: '' };
    expectFail(validateCorpusGolden(corpus), 'RULE-CG-08');
  });

  it('CG-08-02: ranking_v4_sha trop court (<10 chars) → FAIL RULE-CG-08', () => {
    const corpus = { ...makeValidCorpus(), ranking_v4_sha: 'abc' };
    expectFail(validateCorpusGolden(corpus), 'RULE-CG-08');
  });

  it('CG-08-03: ranking_v4_sha valide → pas de violation CG-08', () => {
    const result = validateCorpusGolden(makeValidCorpus());
    expect(result.violations.filter(v => v.rule === 'RULE-CG-08')).toHaveLength(0);
  });

  it('CG-09-01: version absente → FAIL RULE-CG-09', () => {
    const corpus = { ...makeValidCorpus(), version: '' };
    expectFail(validateCorpusGolden(corpus), 'RULE-CG-09');
  });

  it('CG-09-02: version présente → pas de violation CG-09', () => {
    const result = validateCorpusGolden(makeValidCorpus());
    expect(result.violations.filter(v => v.rule === 'RULE-CG-09')).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 9 — validateCorpusFromJson
// ══════════════════════════════════════════════════════════════════════════════

describe('U-W1 validateCorpusFromJson', () => {
  it('CG-JSON-01: JSON valide → PASS', () => {
    const json = JSON.stringify(makeValidCorpus());
    const result = validateCorpusFromJson(json);
    expectPass(result);
  });

  it('CG-JSON-02: JSON malformé → CorpusValidationError PARSE_ERROR', () => {
    expect(() => validateCorpusFromJson('{ invalid json')).toThrow(CorpusValidationError);
    expect(() => validateCorpusFromJson('{ invalid json')).toThrow('PARSE_ERROR');
  });

  it('CG-JSON-03: items absent → CorpusValidationError SCHEMA_ERROR', () => {
    const badCorpus = { version: '1.0.0', rules: { min_human_ratio: 0.7, target_items: 0, score_dimensions: [], scale: [0, 100] }, ranking_v4_sha: 'abc123def456' };
    expect(() => validateCorpusFromJson(JSON.stringify(badCorpus))).toThrow(CorpusValidationError);
  });

  it('CG-JSON-04: rules absent → CorpusValidationError SCHEMA_ERROR', () => {
    const badCorpus = { version: '1.0.0', items: [], ranking_v4_sha: 'abc123def456' };
    expect(() => validateCorpusFromJson(JSON.stringify(badCorpus))).toThrow(CorpusValidationError);
  });

  it('CG-JSON-05: parse du corpus_golden_v1 réel → PASS', () => {
    // Corpus réel simplifié avec 3 items représentatifs
    const realLike: CorpusGolden = {
      ...makeValidCorpus(),
      ranking_v4_sha: '5ec58de15537a9c19252dca723c74d3f547dff49828ac2a6d943f530617ab775',
    };
    const result = validateCorpusFromJson(JSON.stringify(realLike));
    expectPass(result);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 10 — Accumulation de violations
// ══════════════════════════════════════════════════════════════════════════════

describe('U-W1 accumulation violations', () => {
  it('CG-ACC-01: corpus vide → violations CG-01 + CG-08 + CG-09 (multiples)', () => {
    const corpus: CorpusGolden = {
      version:        '',
      created_utc:    '2026-01-01T00:00:00Z',
      ranking_v4_sha: '',
      rules: { min_human_ratio: 0.70, target_items: 85, score_dimensions: [], scale: [0, 100] },
      stats: {},
      items: [],
    };
    const result = validateCorpusGolden(corpus);
    expect(result.verdict).toBe('FAIL');
    expect(result.violations.length).toBeGreaterThanOrEqual(3);
  });

  it('CG-ACC-02: verdict PASS uniquement si 0 violation', () => {
    const good = validateCorpusGolden(makeValidCorpus());
    expect(good.verdict).toBe('PASS');
    expect(good.violations).toHaveLength(0);

    // Moindre violation → FAIL
    const corpus = makeValidCorpus();
    corpus.items[0] = makeItem({ id: 'CG-H001', title: '' });
    const bad = validateCorpusGolden(corpus);
    expect(bad.verdict).toBe('FAIL');
  });
});
