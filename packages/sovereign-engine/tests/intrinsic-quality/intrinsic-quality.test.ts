/**
 * DEC-017 — Tests unitaires IntrinsicQuality (logique PURE + orchestration via mock provider).
 * Déterministes, hors Ollama. Couvre bornes, cas dégénérés, amendements A1/A2/A3.
 */
import { describe, it, expect, afterEach } from 'vitest';
import {
  granularityOk, countWords, aggregateQuality, parseScore, parseWinner,
  tallyWins, indexOfMax, scoreIntrinsicQuality, pickBestPairwise, shadowLogIntrinsicQuality,
  QUALITY_MIN_WORDS, QUALITY_MAX_WORDS, type QualityProvider,
} from '../../src/oracle/intrinsic-quality/intrinsic-quality.js';

describe('granularityOk (A2 — granularité scène)', () => {
  it('borne basse', () => { expect(granularityOk(QUALITY_MIN_WORDS - 1)).toBe(false); expect(granularityOk(QUALITY_MIN_WORDS)).toBe(true); });
  it('borne haute', () => { expect(granularityOk(QUALITY_MAX_WORDS)).toBe(true); expect(granularityOk(QUALITY_MAX_WORDS + 1)).toBe(false); });
  it('milieu', () => { expect(granularityOk(1500)).toBe(true); });
});

describe('countWords', () => {
  it('compte robuste', () => { expect(countWords('  un   deux\ntrois ')).toBe(3); expect(countWords('')).toBe(0); });
});

describe('aggregateQuality', () => {
  it('moyenne arrondie', () => { expect(aggregateQuality(60, 70, 80)).toBe(70); expect(aggregateQuality(71, 72, 70)).toBe(71); });
});

describe('parseScore', () => {
  it('valide', () => { expect(parseScore({ score: 73 })).toBe(73); });
  it('clamp', () => { expect(parseScore({ score: 130 })).toBe(100); expect(parseScore({ score: -5 })).toBe(0); });
  it('string numérique', () => { expect(parseScore({ score: '64' })).toBe(64); });
  it('invalide -> NaN', () => { expect(Number.isNaN(parseScore({}))).toBe(true); expect(Number.isNaN(parseScore(null))).toBe(true); expect(Number.isNaN(parseScore({ score: 'x' }))).toBe(true); });
});

describe('parseWinner', () => {
  it('A/B', () => { expect(parseWinner({ winner: 'A' })).toBe('A'); expect(parseWinner({ winner: 'b' })).toBe('B'); });
  it('invalide -> null', () => { expect(parseWinner({ winner: 'C' })).toBeNull(); expect(parseWinner({})).toBeNull(); expect(parseWinner(null)).toBeNull(); });
});

describe('tallyWins / indexOfMax', () => {
  it('comptage', () => { expect(tallyWins(3, [{ winner: 0 }, { winner: 2 }, { winner: 0 }])).toEqual([2, 0, 1]); });
  it('ignore hors borne', () => { expect(tallyWins(2, [{ winner: 5 }, { winner: 1 }])).toEqual([0, 1]); });
  it('indexOfMax premier max', () => { expect(indexOfMax([1, 3, 3])).toBe(1); expect(indexOfMax([0, 0, 0])).toBe(0); });
});

// Mock provider déterministe : {score:70} pour l'absolu ; pour le pairwise, gagne l'extrait contenant 'GOOD'.
const mockProvider: QualityProvider = {
  async generateStructuredJSON(prompt: string): Promise<unknown> {
    if (prompt.includes('winner')) {
      const sa = prompt.search(/=== (EXTRAIT|EXCERPT) A ===/);
      const sb = prompt.search(/=== (EXTRAIT|EXCERPT) B ===/);
      const blockA = prompt.slice(sa, sb);
      return { winner: blockA.includes('GOOD') ? 'A' : 'B' };
    }
    return { score: 70 };
  },
};

describe('scoreIntrinsicQuality (orchestration)', () => {
  it('3 dimensions + mean + granularité', async () => {
    const prose = Array.from({ length: 1500 }, () => 'mot').join(' ');
    const r = await scoreIntrinsicQuality(prose, 'fr', mockProvider);
    expect(r.profondeur).toBe(70); expect(r.style).toBe(70); expect(r.voix).toBe(70);
    expect(r.mean).toBe(70); expect(r.words).toBe(1500); expect(r.granularity_ok).toBe(true);
  });
  it('hors granularité flag false', async () => {
    const r = await scoreIntrinsicQuality('mot mot mot', 'fr', mockProvider);
    expect(r.granularity_ok).toBe(false);
  });
});

describe('pickBestPairwise (A1 — 2 ordres, sélection)', () => {
  it('choisit le candidat GOOD, n_comparisons = paires×2', async () => {
    const cands = ['bad one', 'GOOD two', 'bad three'];
    const r = await pickBestPairwise(cands, 'fr', mockProvider);
    expect(r.winner).toBe(1);
    expect(r.n_comparisons).toBe(3 * 2);
    expect(r.wins[1]).toBeGreaterThan(r.wins[0]!);
    expect(r.wins[1]).toBeGreaterThan(r.wins[2]!);
  });
});

describe('shadowLogIntrinsicQuality (câblage shadow, non-régression)', () => {
  const prev = process.env.OMEGA_INTRINSIC_QUALITY;
  afterEach(() => {
    if (prev === undefined) delete process.env.OMEGA_INTRINSIC_QUALITY;
    else process.env.OMEGA_INTRINSIC_QUALITY = prev;
  });
  it("flag '0' (défaut) : ZÉRO appel LLM (comportement identique)", async () => {
    delete process.env.OMEGA_INTRINSIC_QUALITY;
    let calls = 0;
    const p: QualityProvider = { async generateStructuredJSON() { calls++; return { score: 70 }; } };
    await expect(shadowLogIntrinsicQuality('x x x', 'fr', 's1', p)).resolves.toBeUndefined();
    expect(calls).toBe(0);
  });
  it("flag 'shadow' : 3 appels (profondeur/style/voix), ne lève pas", async () => {
    process.env.OMEGA_INTRINSIC_QUALITY = 'shadow';
    let calls = 0;
    const p: QualityProvider = { async generateStructuredJSON() { calls++; return { score: 70 }; } };
    await expect(shadowLogIntrinsicQuality('mot', 'fr', 's2', p)).resolves.toBeUndefined();
    expect(calls).toBe(3);
  });
  it("flag 'shadow' + provider qui lève : ne propage JAMAIS", async () => {
    process.env.OMEGA_INTRINSIC_QUALITY = 'shadow';
    const p: QualityProvider = { async generateStructuredJSON() { throw new Error('boom'); } };
    await expect(shadowLogIntrinsicQuality('mot', 'fr', 's3', p)).resolves.toBeUndefined();
  });
});
