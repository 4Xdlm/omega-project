/**
 * INV-LPT-01..06 — capteur de gabarit de période longue.
 * Seuils dérivés du corpus publié (18 romans FR, bootstrap 2000×21) :
 * répétition de tête moyenne 0,0009, maximum observé 0,0952.
 */
import { describe, it, expect } from 'vitest';
import {
  selectDistinctPeriodHead,
  extractLongPeriods,
  periodHead,
  measureTemplateEmergence,
  longPeriodDensity,
  splitSentences,
  TEMPLATE_THRESHOLDS,
  LONG_PERIOD_MIN_WORDS,
  situateDensity,
  PUBLISHED_LONG_PERIOD_DENSITY_ENVELOPE,
} from '../src/variation/long-period-template.js';

/** Fabrique une phrase d'au moins n mots, commençant par `head`.
 *  ATTENTION (bug trouvé par ce test) : `periodHead` filtre les tokens SANS
 *  lettre, donc un indice numérique dans la tête disparaît et rend toutes les
 *  fixtures identiques. Les têtes distinctes doivent l'être par des MOTS. */
function sentence(head: string, n: number): string {
  const headWords = head.trim().split(/\s+/u).length;
  const rest = Math.max(0, n - headWords);
  return `${head} ${Array.from({ length: rest }, () => 'mot').join(' ')}.`;
}
const NAMES = ['alpha','beta','gamma','delta','epsilon','zeta','eta','theta','iota','kappa',
  'lambda','mu','nu','xi','omicron','pi','rho','sigma','tau','upsilon','phi','chi','psi','omega'];
/** Tête distincte n° i, garantie unique après filtrage des non-lettres. */
function distinctHead(i: number): string {
  return `${NAMES[i % NAMES.length]} ${NAMES[(i + 7) % NAMES.length]} ouverture propre`;
}

describe('INV-LPT-01 — extraction des périodes', () => {
  it('ne retient que les phrases au-dessus du seuil', () => {
    const t = `${sentence('Il partit', 10)} ${sentence('Or il comprit alors', 60)} ${sentence('Fin', 5)}`;
    const p = extractLongPeriods(t);
    expect(p).toHaveLength(1);
    expect(p[0]).toContain('Or il comprit alors');
  });

  it('respecte un seuil personnalisé', () => {
    const t = `${sentence('Une phrase', 30)} ${sentence('Autre phrase', 12)}`;
    expect(extractLongPeriods(t, 25)).toHaveLength(1);
    expect(extractLongPeriods(t, 100)).toHaveLength(0);
  });

  it('découpe correctement sur terminateur + amorce', () => {
    expect(splitSentences('Un. Deux. Trois.')).toHaveLength(3);
    expect(splitSentences('M. Dupont est venu.')).toHaveLength(1);
  });

  it('le seuil par défaut est 50 mots', () => {
    expect(LONG_PERIOD_MIN_WORDS).toBe(50);
  });
});

describe('INV-LPT-02 — tête de période', () => {
  it('normalise sur 4 tokens en minuscules', () => {
    expect(periodHead("C'est alors que tout bascula pour lui.")).toBe("c'est alors que tout");
  });

  it('ignore les tokens sans lettre (tiret de dialogue, chevron)', () => {
    expect(periodHead('— Il comprit que Dubois mentait.')).toBe('il comprit que dubois');
  });
});

describe('INV-LPT-03 — le gabarit est une propriété de population', () => {
  it('un texte unique ne peut pas révéler un gabarit', () => {
    const r = measureTemplateEmergence([sentence('Il comprit que tout', 60)]);
    expect(r.periods).toBe(1);
    expect(r.headRepeatRate).toBe(0);
    expect(r.verdict).toBe('CLEAN');
  });

  it('des têtes toutes distinctes donnent CLEAN', () => {
    const texts = ['Alpha beta gamma delta', 'Zeta eta theta iota', 'Kappa lambda mu nu'].map((h) =>
      sentence(h, 60),
    );
    const r = measureTemplateEmergence(texts);
    expect(r.periods).toBe(3);
    expect(r.headRepeatRate).toBe(0);
    expect(r.verdict).toBe('CLEAN');
  });
});

describe('INV-LPT-04 — détection du gabarit réel', () => {
  it('reproduit le cas B1 : 4 têtes identiques sur 21 → TEMPLATE_DETECTED', () => {
    const texts: string[] = [];
    for (let i = 0; i < 4; i += 1) texts.push(sentence("C'est alors que tout", 60));
    for (let i = 0; i < 17; i += 1) texts.push(sentence(distinctHead(i), 60));
    const r = measureTemplateEmergence(texts);
    expect(r.periods).toBe(21);
    expect(r.headRepeatRate).toBeCloseTo(4 / 21, 3);
    expect(r.verdict).toBe('TEMPLATE_DETECTED');
    expect(r.repeatedHeads[0]?.motif).toBe("c'est alors que tout");
    expect(r.repeatedHeads[0]?.count).toBe(4);
  });

  it('deux têtes identiques sur 21 donnent WATCH, pas TEMPLATE — c est le maximum publié', () => {
    // 2/21 = 0,0952 = EXACTEMENT le maximum observe sur 2000 tirages de corpus
    // publie. Un auteur peut le produire ; ce n'est donc pas un gabarit etabli.
    // (Mon assertion initiale disait TEMPLATE_DETECTED : le test avait tort, pas le code.)
    const texts: string[] = [
      sentence('Tete partagee ici presente', 60),
      sentence('Tete partagee ici presente', 60),
    ];
    for (let i = 0; i < 19; i += 1) texts.push(sentence(distinctHead(i), 60));
    const r = measureTemplateEmergence(texts);
    expect(r.headRepeatRate).toBeCloseTo(2 / 21, 3);
    expect(r.headRepeatRate).toBeLessThanOrEqual(TEMPLATE_THRESHOLDS.publishedMaxObserved);
    expect(r.verdict).toBe('WATCH');
  });

  it('rapporte le multiple de la baseline publiée', () => {
    const texts = [sentence('Meme tete deux fois', 60), sentence('Meme tete deux fois', 60)];
    const r = measureTemplateEmergence(texts);
    expect(r.timesAbovePublished).toBeGreaterThan(100);
  });
});

describe('INV-LPT-05 — n-grammes internes (le moule, pas la tête)', () => {
  it("repère un moule récurrent même quand les têtes diffèrent", () => {
    const mould =
      'ce qui signifiait que le pacte avait ete rompu depuis longtemps deja sans que ' +
      'personne dans ce village ne l ait jamais dit a voix haute ni meme ose se le ' +
      'formuler interieurement pendant toutes ces annees de silence acquis et paye ' +
      'par ceux qui avaient choisi de se taire plutot que de perdre ce qu ils avaient';
    const texts = Array.from({ length: 6 }, (_, i) => `${distinctHead(i)} ${mould}.`);
    const r = measureTemplateEmergence(texts);
    expect(r.headRepeatRate).toBe(0); // têtes toutes différentes
    expect(r.repeatedNgrams.length).toBeGreaterThan(0);
    expect(r.repeatedNgrams.some((g) => g.motif.includes('signifiait que le'))).toBe(true);
  });
});

describe('INV-LPT-06 — densité et seuils gelés', () => {
  it('mesure la densité de périodes longues', () => {
    const t = `${sentence('Longue une', 60)} ${sentence('Courte', 5)} ${sentence('Courte encore', 6)}`;
    const d = longPeriodDensity([t]);
    expect(d.sentences).toBe(3);
    expect(d.long).toBe(1);
    expect(d.ratio).toBeCloseTo(1 / 3, 2);
  });

  it('les seuils publiés sont gelés et ordonnés', () => {
    expect(TEMPLATE_THRESHOLDS.publishedMean).toBeLessThan(TEMPLATE_THRESHOLDS.watch);
    expect(TEMPLATE_THRESHOLDS.watch).toBeLessThan(TEMPLATE_THRESHOLDS.template);
    expect(TEMPLATE_THRESHOLDS.template).toBeGreaterThan(TEMPLATE_THRESHOLDS.publishedMaxObserved);
  });

  it('un corpus vide ne casse pas la mesure', () => {
    const r = measureTemplateEmergence([]);
    expect(r.periods).toBe(0);
    expect(r.headRepeatRate).toBe(0);
    expect(r.verdict).toBe('CLEAN');
    expect(longPeriodDensity([]).ratio).toBe(0);
  });
});

describe('INV-LPT-07 — refus a la selection (filet complementaire du prompt)', () => {
  const prose = (x: { readonly t: string }): string => x.t;

  it('retient le premier candidat dont la tete de periode est neuve', () => {
    const cands = [
      { t: sentence("C'est alors que tout", 60) },
      { t: sentence('Alpha beta gamma delta', 60) },
    ];
    const r = selectDistinctPeriodHead(cands, prose, new Set(["c'est alors que tout"]));
    expect(r.chosen).toBe(cands[1]);
    expect(r.rejected).toHaveLength(1);
    expect(r.head).toBe('alpha beta gamma delta');
  });

  it('un candidat SANS periode longue est admissible et ne consomme aucune tete', () => {
    const cands = [{ t: 'Trois phrases courtes. Rien de long. Fin.' }];
    const r = selectDistinctPeriodHead(cands, prose, new Set());
    expect(r.chosen).toBe(cands[0]);
    expect(r.head).toBeNull();
  });

  it('rend null quand tous les candidats sont des clones', () => {
    const cands = [{ t: sentence('Tete deja vue ici', 60) }, { t: sentence('Tete deja vue ici', 60) }];
    const r = selectDistinctPeriodHead(cands, prose, new Set(['tete deja vue ici']));
    expect(r.chosen).toBeNull();
    expect(r.rejected).toHaveLength(2);
  });

  it('ne refuse rien quand le registre est vide', () => {
    const cands = [{ t: sentence('Premiere tete du livre', 60) }];
    const r = selectDistinctPeriodHead(cands, prose, new Set());
    expect(r.chosen).toBe(cands[0]);
    expect(r.rejected).toHaveLength(0);
  });
});

describe('INV-LPT-08 — l enveloppe publiee, et le piege de la moyenne', () => {
  it('la distribution est asymetrique : la moyenne agregee depasse Q3', () => {
    const e = PUBLISHED_LONG_PERIOD_DENSITY_ENVELOPE;
    expect(e.aggregateMeanMisleading).toBeGreaterThan(e.q3);
    expect(e.median).toBeLessThan(e.aggregateMeanMisleading / 3);
  });

  it('0,80 % — la densite du run de livre — est DANS l enveloppe, au-dessus de la mediane', () => {
    const r = situateDensity(0.008);
    expect(r.verdict).toBe('IN_ENVELOPE');
    expect(r.vsMedian).toBeGreaterThan(1);
    expect(r.quartile).toBe('mediane-Q3');
  });

  it('reconnait un sous-dosage reel et un sur-dosage reel', () => {
    expect(situateDensity(0.0001).verdict).toBe('UNDER');
    expect(situateDensity(0.09).verdict).toBe('OVER');
  });

  it('la mediane elle-meme est evidemment dans l enveloppe', () => {
    expect(situateDensity(PUBLISHED_LONG_PERIOD_DENSITY_ENVELOPE.median).verdict).toBe('IN_ENVELOPE');
  });
});
