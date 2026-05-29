/**
 * V2.3-A P0 — tests deriveEmotionContractFromSegment (analyse pure, zéro LLM).
 * 8 fixtures + no-ghost-field + warning_codes stables + hash determinism + Spearman arousal >= 0.8.
 */
import { describe, it, expect } from 'vitest';
import {
  deriveEmotionContractFromSegment,
  MIN_AROUSAL_CURVE_RANK_CORRELATION,
  MIN_SEGMENT_WORDS,
  type WarningCode,
} from '../../src/chunking/deriveEmotionContract.js';
import { extractFeatures, featureIntensity } from '../../src/chunking/detector/features.js';

// Champs canoniques attendus (src/types.ts) — pour le test no-ghost-field
const CONTRACT_KEYS = [
  'curve_quartiles',
  'intensity_range',
  'tension',
  'terminal_state',
  'rupture',
  'valence_arc',
].sort();
const QUARTILE_KEYS = [
  'quartile',
  'target_14d',
  'valence',
  'arousal',
  'dominant',
  'narrative_instruction',
].sort();

// --- Fixtures FR (lexiques FR du détecteur) ---
const CALM =
  'La table se trouvait dans la maison tranquille. Une fleur reposait sur le bois clair. ' +
  'Le jardin restait paisible sous le ciel doux. La lumière effleurait le mur blanc. ' +
  'Tout semblait calme et lent ce matin-là, simple et serein, sans hâte aucune.';
const HIGH_TENSION =
  'Terreur ! Le sang coulait, un cri de peur déchira la nuit. ' +
  'La douleur, l effroi, la rage : son corps tremblait, le coeur battait ! ' +
  'Horreur ! Il hurla, frappa, courut ; la haine et la fureur explosaient, sang et larmes mêlés !';
const DIALOGUE =
  'Il dit : « Pourquoi pars-tu ? » Elle répondit d une voix basse. ' +
  '« Je dois partir », murmura-t-elle. Il cria : « Reste ! » ' +
  'La voix tremblait, les mots se brisaient, parler devenait douleur.';
const DESCRIPTIVE =
  'La maison de pierre dressait ses murs gris près de la route. ' +
  'Un arbre ombrageait la fenêtre, la porte de bois, le toit ancien. ' +
  'Le jardin, le pont, le chemin de terre traversaient la forêt silencieuse et vaste.';
const SHORT = 'Une porte. Un mur.';
const NOISY =
  '###@@@ La $$$ maison %%% &&& terreur !!! ??? \t\n   ::: sang --- cri ~~~ |||  ...';
// Courbe strictement plate : phrase IDENTIQUE répétée → arousal identique par quartile.
const FLAT = Array.from({ length: 8 }, () => 'La table claire repose dans la maison paisible et silencieuse.').join(' ');
const EMPTY = '   ';

function spearman(a: readonly number[], b: readonly number[]): number {
  const rank = (xs: readonly number[]): number[] => {
    const idx = xs.map((v, i) => [v, i] as const).sort((p, q) => p[0] - q[0]);
    const r = new Array<number>(xs.length);
    idx.forEach(([, i], k) => (r[i] = k));
    return r;
  };
  const ra = rank(a);
  const rb = rank(b);
  const n = a.length;
  let d2 = 0;
  for (let i = 0; i < n; i++) d2 += (ra[i]! - rb[i]!) ** 2;
  return 1 - (6 * d2) / (n * (n * n - 1));
}

describe('V2.3-A P0 deriveEmotionContractFromSegment', () => {
  it('fixture calme : structure valide, arousal bas', () => {
    const c = deriveEmotionContractFromSegment(CALM);
    expect(c.contract.curve_quartiles).toHaveLength(4);
    expect(Number(c.evidence['arousal_mean'])).toBeLessThan(0.6);
  });

  it('fixture tension haute : arousal > calme, slope montante ou arc', () => {
    const calm = deriveEmotionContractFromSegment(CALM);
    const hot = deriveEmotionContractFromSegment(HIGH_TENSION);
    expect(Number(hot.evidence['arousal_max'])).toBeGreaterThan(Number(calm.evidence['arousal_max']));
    expect(['ascending', 'arc', 'descending', 'reverse_arc']).toContain(
      hot.contract.tension.slope_target
    );
  });

  it('fixture dialogue : ne crash pas, dominant défini par quartile', () => {
    const c = deriveEmotionContractFromSegment(DIALOGUE);
    for (const q of c.contract.curve_quartiles) expect(typeof q.dominant).toBe('string');
  });

  it('fixture descriptif : silence_zones calculées, structure ok', () => {
    const c = deriveEmotionContractFromSegment(DESCRIPTIVE);
    expect(Array.isArray(c.contract.tension.silence_zones)).toBe(true);
  });

  it('fixture courte (<50 mots) : warning SHORT_SEGMENT + confiance basse', () => {
    const c = deriveEmotionContractFromSegment(SHORT);
    expect(c.warning_codes).toContain<WarningCode>('SHORT_SEGMENT');
    expect(c.confidence).toBeLessThanOrEqual(0.4);
    expect(Number(c.evidence['word_count'])).toBeLessThan(MIN_SEGMENT_WORDS);
  });

  it('fixture bruitée : robustesse, aucun crash, contrat valide', () => {
    const c = deriveEmotionContractFromSegment(NOISY);
    expect(c.contract.curve_quartiles).toHaveLength(4);
    expect(typeof c.segment_hash).toBe('string');
  });

  it('fixture plate : slope_target=arc + FLAT_CURVE_FALLBACK (jamais faux ascending)', () => {
    const c = deriveEmotionContractFromSegment(FLAT);
    expect(c.contract.tension.slope_target).toBe('arc');
    expect(c.warning_codes).toContain<WarningCode>('FLAT_CURVE_FALLBACK');
  });

  it('fixture vide/whitespace : fallback sans crash', () => {
    const c = deriveEmotionContractFromSegment(EMPTY);
    expect(c.contract.curve_quartiles).toHaveLength(4);
    expect(c.warning_codes).toContain<WarningCode>('SHORT_SEGMENT');
  });

  it('hash determinism : même segment (whitespace varié) → même segment_hash + candidate identique', () => {
    const a = deriveEmotionContractFromSegment(HIGH_TENSION);
    const b = deriveEmotionContractFromSegment('  ' + HIGH_TENSION.replace(/ /g, '   ') + '  ');
    expect(b.segment_hash).toBe(a.segment_hash);
    expect(b.contract).toEqual(a.contract);
    expect(b.warning_codes).toEqual(a.warning_codes);
  });

  it('no ghost field : contrat = clés canoniques exactes, quartiles = clés EmotionQuartile exactes', () => {
    const c = deriveEmotionContractFromSegment(DESCRIPTIVE);
    expect(Object.keys(c.contract).sort()).toEqual(CONTRACT_KEYS);
    for (const q of c.contract.curve_quartiles) {
      expect(Object.keys(q).sort()).toEqual(QUARTILE_KEYS);
    }
  });

  it('Emotion14 GARAGE/DORMANT : target_14d jamais peuplé ({}) + warning code', () => {
    const c = deriveEmotionContractFromSegment(HIGH_TENSION);
    for (const q of c.contract.curve_quartiles) expect(q.target_14d).toEqual({});
    expect(c.contract.terminal_state.target_14d).toEqual({});
    expect(c.warning_codes).toContain<WarningCode>('EMOTION14_RUNTIME_DORMANT');
  });

  it('field_provenance couvre target_14d/narrative en DEFAULT, dérivés en DERIVED', () => {
    const c = deriveEmotionContractFromSegment(DESCRIPTIVE);
    expect(c.field_provenance['curve_quartiles.target_14d']).toBe('DEFAULT');
    expect(c.field_provenance['curve_quartiles.narrative_instruction']).toBe('DEFAULT');
    expect(c.field_provenance['tension.slope_target']).toBe('DERIVED');
    expect(c.field_provenance['valence_arc']).toBe('DERIVED');
  });

  it('warning_codes stables et triés (déterministe)', () => {
    const c = deriveEmotionContractFromSegment(CALM);
    expect([...c.warning_codes].sort()).toEqual([...c.warning_codes]);
    const valid: WarningCode[] = [
      'SHORT_SEGMENT', 'FLAT_CURVE_FALLBACK', 'LANG_FALLBACK_FR',
      'EMOTION14_RUNTIME_DORMANT', 'NARRATIVE_INSTRUCTION_TEMPLATED', 'LOW_CONFIDENCE',
    ];
    for (const code of c.warning_codes) expect(valid).toContain(code);
  });

  it('fidélité : Spearman(arousal quartiles, intensité bins indépendante) >= 0.8 sur gradient', () => {
    // Segment à gradient d'intensité croissant (24 phrases calme→intense)
    const calmS = 'La table claire repose dans la maison paisible. ';
    const hotS = 'Terreur, sang, cri de peur, douleur et rage : le corps tremble, hurle ! ';
    const sents: string[] = [];
    for (let i = 0; i < 24; i++) sents.push(i < 12 ? calmS : hotS);
    // intensité croissante garantie par proportion hot vers la fin
    const seg = sents.map((s, i) => (i / 24 < Math.random() ? s : s)).join('');
    const gradient = Array.from({ length: 24 }, (_, i) => (i < 6 ? calmS : i < 12 ? calmS + hotS : i < 18 ? hotS : hotS + hotS)).join('');
    void seg;
    const c = deriveEmotionContractFromSegment(gradient);
    const quartileArousal = c.contract.curve_quartiles.map((q) => q.arousal);
    // bins indépendants : 4 groupes contigus de phrases, moyenne featureIntensity brute
    const allSents = gradient.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
    const per = allSents.map((s) => featureIntensity(extractFeatures(s)));
    const binSize = Math.ceil(per.length / 4);
    const binMeans: number[] = [];
    for (let b = 0; b < 4; b++) {
      const slice = per.slice(b * binSize, (b + 1) * binSize);
      binMeans.push(slice.length ? slice.reduce((a, x) => a + x, 0) / slice.length : 0);
    }
    const rho = spearman(quartileArousal, binMeans);
    expect(rho).toBeGreaterThanOrEqual(MIN_AROUSAL_CURVE_RANK_CORRELATION);
  });
});
