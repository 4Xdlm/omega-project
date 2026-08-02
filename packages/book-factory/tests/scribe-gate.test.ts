/**
 * INV-GATE-01..05 — SCRIBE_GATE : éligibilité (vetos durs) + répulsion.
 *
 * Les seuils ne sont pas choisis : ils viennent du corpus publié.
 *   • récapitulation : ZÉRO période sur 1384 atteint 2 connecteurs
 *   • résidus anglais : 9,5 % des sorties OMEGA en contiennent au moins un
 */
import { describe, it, expect } from 'vitest';
import {
  checkEligibility,
  gateSelect,
  PeriodHeadRegistry,
} from '../src/scribe/scribe-gate.js';
import {
  measurePlotRecap,
  measureTextRecap,
  RECAP_THRESHOLDS,
} from '../src/variation/long-period-template.js';

/** Période longue neutre, sans récapitulation — sert de base propre. */
function cleanPeriod(head: string): string {
  return (
    `${head} et le froid montait du sol par les jointures du plancher tandis que la ` +
    'pluie continuait de battre contre les carreaux sans qu il songeat a fermer le ' +
    'volet ni meme a se lever de ce fauteuil ou il avait passe la moitie de la nuit ' +
    'a regarder le port vide et les cordages luisants sous la lumiere jaune du quai.'
  );
}

/** La même période, saturée de connecteurs de récapitulation. */
function recapPeriod(head: string): string {
  return (
    `${head} car si Dubois avait ete tue pour son chantage ce qui signifiait que le ` +
    'pacte de 1998 etait rompu alors le retour de Marc transformant ainsi un simple ' +
    'fait divers en menace pour tout le village obligeant Squarcioni a proteger un ' +
    'systeme entier bati sur le silence achete et paye depuis vingt annees entieres.'
  );
}

describe('INV-GATE-01 — mesure de la récapitulation', () => {
  it('une période sans connecteur est CLEAN', () => {
    const r = measurePlotRecap(cleanPeriod('Il resta longtemps immobile'));
    expect(r.connectors).toBe(0);
    expect(r.verdict).toBe('CLEAN');
  });

  it('un seul connecteur reste WATCH — 0,8 % des périodes publiées en ont un', () => {
    const r = measurePlotRecap(`${cleanPeriod('Il songea')} ce qui signifiait beaucoup.`);
    expect(r.connectors).toBe(1);
    expect(r.verdict).toBe('WATCH');
  });

  it('deux connecteurs ou plus = PLOT_RECAP — zéro période publiée sur 1384', () => {
    const r = measurePlotRecap(recapPeriod('Il comprit'));
    expect(r.connectors).toBeGreaterThanOrEqual(RECAP_THRESHOLDS.reject);
    expect(r.verdict).toBe('PLOT_RECAP_AS_THOUGHT');
  });

  it('le pire verdict du texte remonte — une seule période salie suffit', () => {
    const t = `${cleanPeriod('Alpha beta gamma')} ${recapPeriod('Delta epsilon zeta')}`;
    expect(measureTextRecap(t).verdict).toBe('PLOT_RECAP_AS_THOUGHT');
  });

  it('les seuils publiés sont gelés et ordonnés', () => {
    expect(RECAP_THRESHOLDS.watch).toBeLessThan(RECAP_THRESHOLDS.reject);
    expect(RECAP_THRESHOLDS.publishedPctTwoPlus).toBe(0);
  });
});

describe('INV-GATE-02 — vetos durs', () => {
  it('un mot-outil anglais rend le candidat inéligible', () => {
    const e = checkEligibility('Il resta ainsi, immobile, during un long moment.');
    expect(e.eligible).toBe(false);
    expect(e.vetos.map((v) => v.code)).toContain('LANG_RESIDUAL');
  });

  it('le veto langue peut être rétrogradé en signal (mise en service progressive)', () => {
    const e = checkEligibility('Il resta ainsi, immobile, during un long moment.', {
      strictLang: false,
    });
    expect(e.eligible).toBe(true);
  });

  it('une période-résumé rend le candidat inéligible', () => {
    const e = checkEligibility(recapPeriod('Il comprit alors'));
    expect(e.eligible).toBe(false);
    expect(e.vetos.map((v) => v.code)).toContain('PLOT_RECAP');
  });

  it('une prose propre passe les deux vetos', () => {
    const e = checkEligibility(cleanPeriod('Le vent tomba doucement'));
    expect(e.eligible).toBe(true);
    expect(e.vetos).toHaveLength(0);
    expect(e.periodCount).toBe(1);
  });

  it("l'absence de période longue n'est pas un veto — l'opportunité n'est pas un quota", () => {
    const e = checkEligibility('Trois phrases courtes. Rien de long ici. Il sortit.');
    expect(e.eligible).toBe(true);
    expect(e.periodCount).toBe(0);
    expect(e.periodHead).toBeNull();
  });

  it('le détail du veto nomme les mots fautifs (journal d admission)', () => {
    const e = checkEligibility('Il attendit during la nuit et regarda between les volets.');
    const v = e.vetos.find((x) => x.code === 'LANG_RESIDUAL');
    expect(v?.detail).toMatch(/during|between/u);
  });
});

describe('INV-GATE-03 — sélection à deux étages', () => {
  const prose = (x: { readonly t: string }): string => x.t;

  it('un veto passe AVANT la répulsion : un inéligible ne gagne jamais', () => {
    const cands = [
      { t: `${cleanPeriod('Tete neuve ici presente')} Il partit during la nuit.` },
      { t: cleanPeriod('Autre tete tout aussi neuve') },
    ];
    const d = gateSelect(cands, prose, new Set());
    expect(d.chosen).toBe(cands[1]);
    expect(d.vetoed).toHaveLength(1);
    expect(d.vetoed[0]?.vetos[0]?.code).toBe('LANG_RESIDUAL');
  });

  it('refuse une tête déjà servie dans le livre', () => {
    const cands = [
      { t: cleanPeriod('Le vent tomba doucement') },
      { t: cleanPeriod('Alpha beta gamma delta') },
    ];
    const d = gateSelect(cands, prose, new Set(['le vent tomba doucement']));
    expect(d.chosen).toBe(cands[1]);
    expect(d.repelled).toHaveLength(1);
  });

  it('signale exhausted quand aucun candidat ne passe', () => {
    const cands = [{ t: recapPeriod('Il comprit') }, { t: recapPeriod('Il saisit') }];
    const d = gateSelect(cands, prose, new Set());
    expect(d.chosen).toBeNull();
    expect(d.exhausted).toBe(true);
    expect(d.vetoed).toHaveLength(2);
  });

  it('un candidat sans période longue passe et ne consomme aucune tête', () => {
    const cands = [{ t: 'Phrases courtes seulement. Rien de plus. Fin.' }];
    const d = gateSelect(cands, prose, new Set(['une tete quelconque']));
    expect(d.chosen).toBe(cands[0]);
    expect(d.chosenHead).toBeNull();
  });
});

describe('INV-GATE-04 — registre des têtes sur la durée du livre', () => {
  it('accumule les têtes admises et ignore les nulles', () => {
    const reg = new PeriodHeadRegistry();
    reg.record('premiere tete du livre');
    reg.record(null);
    reg.record('');
    expect(reg.size).toBe(1);
    expect(reg.has('premiere tete du livre')).toBe(true);
  });

  it('le snapshot est une copie — le registre ne fuit pas', () => {
    const reg = new PeriodHeadRegistry();
    reg.record('tete une');
    const snap = reg.snapshot();
    reg.record('tete deux');
    expect(snap.size).toBe(1);
    expect(reg.size).toBe(2);
  });

  it('boucle réaliste : 3 chapitres, la tête répétée est refusée', () => {
    const prose = (x: { readonly t: string }): string => x.t;
    const reg = new PeriodHeadRegistry();
    const chapters = [
      [{ t: cleanPeriod('Le vent tomba doucement') }],
      [{ t: cleanPeriod('Le vent tomba doucement') }, { t: cleanPeriod('Alpha beta gamma delta') }],
      [{ t: cleanPeriod('Epsilon zeta eta theta') }],
    ];
    const heads: (string | null)[] = [];
    for (const cands of chapters) {
      const d = gateSelect(cands, prose, reg.snapshot());
      reg.record(d.chosenHead);
      heads.push(d.chosenHead);
    }
    expect(heads[0]).toBe('le vent tomba doucement');
    expect(heads[1]).toBe('alpha beta gamma delta');
    expect(reg.size).toBe(3);
  });
});
