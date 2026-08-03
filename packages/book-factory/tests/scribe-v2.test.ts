/**
 * INV-SCRIBE2-01..06 — la chaîne complète assemblée.
 * Générateur INJECTÉ : la boucle est testable hors LLM, déterministe, sans réseau.
 */
import { describe, it, expect } from 'vitest';
import {
  writeChapter,
  summarizeBook,
  buildDirectiveBlock,
  PLAN_LONG_TAIL_OPPORTUNITY,
  GUARD_NO_PIVOT_FORMULA,
  GUARD_NO_PLOT_RECAP,
  type AdmissionLog,
} from '../src/scribe/scribe-v2.js';
import { PeriodHeadRegistry } from '../src/scribe/scribe-gate.js';

function cleanPeriod(head: string): string {
  return (
    `${head} et le froid montait du sol par les jointures du plancher tandis que la ` +
    'pluie continuait de battre contre les carreaux sans qu il songeat a fermer le ' +
    'volet ni meme a se lever de ce fauteuil ou il avait passe la moitie de la nuit ' +
    'a regarder le port vide et les cordages luisants sous la lumiere du quai.'
  );
}
function recapPeriod(head: string): string {
  return (
    `${head} car si Dubois avait ete tue pour son chantage ce qui signifiait que le ` +
    'pacte etait rompu alors le retour de Marc transformant ainsi un fait divers en ' +
    'menace pour le village obligeant le maire a proteger un systeme entier bati sur ' +
    'le silence achete et paye depuis vingt annees entieres et sans partage aucun.'
  );
}
/** Générateur figé : rend toujours la même liste, quel que soit l'essai. */
const fixed =
  (...proses: readonly string[]) =>
  async (): Promise<readonly string[]> =>
    proses;

describe('INV-SCRIBE2-01 — bloc de directives', () => {
  it("vide si la scene n'ouvre aucune opportunite", () => {
    expect(buildDirectiveBlock({ longTailOpportunity: false, antiTemplateGuards: true })).toBe('');
  });

  it("l'opportunite seule ne pose aucune garde", () => {
    const b = buildDirectiveBlock({ longTailOpportunity: true, antiTemplateGuards: false });
    expect(b).toContain(PLAN_LONG_TAIL_OPPORTUNITY);
    expect(b).not.toContain(GUARD_NO_PIVOT_FORMULA);
  });

  it('les deux gardes accompagnent l opportunite', () => {
    const b = buildDirectiveBlock({ longTailOpportunity: true, antiTemplateGuards: true });
    expect(b).toContain(GUARD_NO_PIVOT_FORMULA);
    expect(b).toContain(GUARD_NO_PLOT_RECAP);
  });

  it('aucun nombre n est transmis au modele (opportunite, pas quota)', () => {
    const b = buildDirectiveBlock({ longTailOpportunity: true, antiTemplateGuards: true });
    expect(b).not.toMatch(/\d+\s*mots/u);
    expect(b).not.toMatch(/cinquante|soixante|quatre-vingt/u);
  });
});

describe('INV-SCRIBE2-02 — la boucle choisit un candidat admissible', () => {
  it('retient le premier propre et enregistre sa tete', async () => {
    const reg = new PeriodHeadRegistry();
    const r = await writeChapter(fixed(cleanPeriod('Le vent tomba doucement')), reg);
    expect(r.log.exhausted).toBe(false);
    expect(r.log.chosenHead).toBe('le vent tomba doucement');
    expect(reg.size).toBe(1);
    expect(r.log.words).toBeGreaterThan(50);
  });

  it('ecarte un candidat vetote et prend le suivant', async () => {
    const reg = new PeriodHeadRegistry();
    const r = await writeChapter(
      fixed(recapPeriod('Il comprit alors'), cleanPeriod('Alpha beta gamma delta')),
      reg,
    );
    expect(r.log.chosenHead).toBe('alpha beta gamma delta');
    expect(r.log.vetoed).toHaveLength(1);
    expect(r.log.vetoed[0]?.vetos[0]?.code).toBe('PLOT_RECAP');
  });

  it('un mot anglais suffit a ecarter un candidat', async () => {
    const reg = new PeriodHeadRegistry();
    const r = await writeChapter(
      fixed(`${cleanPeriod('Tete neuve ici')} Il partit during la nuit.`, cleanPeriod('Autre tete propre ici')),
      reg,
    );
    expect(r.log.vetoed[0]?.vetos[0]?.code).toBe('LANG_RESIDUAL');
    expect(r.log.chosenHead).toBe('autre tete propre ici');
  });
});

describe('INV-SCRIBE2-03 — scellement typographique', () => {
  it("applique la typo et compte les regles", async () => {
    const reg = new PeriodHeadRegistry();
    const r = await writeChapter(fixed(`${cleanPeriod("L'homme n'a rien dit")} Quoi ?`), reg);
    expect(r.prose).toContain('’');
    expect(r.prose).not.toMatch(/\bn'a\b/u);
    expect(r.log.typoRulesApplied).toBeGreaterThan(0);
  });

  it('peut etre desactive', async () => {
    const reg = new PeriodHeadRegistry();
    const r = await writeChapter(fixed(cleanPeriod("L'homme n'a rien dit")), reg, { seal: false });
    expect(r.log.typoRulesApplied).toBe(0);
    expect(r.prose).toContain("'");
  });
});

describe('INV-SCRIBE2-04 — epuisement : fallback A, drapeau leve', () => {
  it('rend le meilleur disponible avec exhausted quand tout est vetote', async () => {
    const reg = new PeriodHeadRegistry();
    const r = await writeChapter(fixed(recapPeriod('Il comprit'), recapPeriod('Il saisit')), reg, {
      maxAttempts: 2,
    });
    expect(r.log.exhausted).toBe(true);
    expect(r.prose.length).toBeGreaterThan(0); // jamais de trou silencieux
    expect(r.log.attempts).toBe(2);
    expect(reg.size).toBe(0); // aucune tete enregistree sur un echec
  });

  it('respecte le budget de tentatives', async () => {
    let calls = 0;
    const reg = new PeriodHeadRegistry();
    await writeChapter(
      async () => {
        calls += 1;
        return [recapPeriod('Toujours pareil')];
      },
      reg,
      { maxAttempts: 3 },
    );
    expect(calls).toBe(3);
  });

  it('la regeneration s arrete des qu un candidat passe', async () => {
    let calls = 0;
    const reg = new PeriodHeadRegistry();
    const r = await writeChapter(
      async (attempt) => {
        calls += 1;
        return attempt === 1 ? [recapPeriod('Sale')] : [cleanPeriod('Propre enfin arrive ici')];
      },
      reg,
      { maxAttempts: 3 },
    );
    expect(calls).toBe(2);
    expect(r.log.exhausted).toBe(false);
  });
});

describe('INV-SCRIBE2-05 — repulsion sur la duree du livre', () => {
  it('refuse une tete deja servie au chapitre precedent', async () => {
    const reg = new PeriodHeadRegistry();
    await writeChapter(fixed(cleanPeriod('Le vent tomba doucement')), reg);
    const r2 = await writeChapter(
      fixed(cleanPeriod('Le vent tomba doucement'), cleanPeriod('Une autre tete neuve')),
      reg,
    );
    expect(r2.log.repelledHeads).toBe(1);
    expect(r2.log.chosenHead).toBe('une autre tete neuve');
    expect(reg.size).toBe(2);
  });
});

describe('INV-SCRIBE2-06 — journal de livre', () => {
  it('agrege vetos, repulsions et taux de regeneration', async () => {
    const reg = new PeriodHeadRegistry();
    const logs: AdmissionLog[] = [];
    logs.push((await writeChapter(fixed(cleanPeriod('Premiere tete propre')), reg)).log);
    logs.push(
      (
        await writeChapter(
          fixed(recapPeriod('Sale ici'), cleanPeriod('Deuxieme tete propre')),
          reg,
        )
      ).log,
    );
    const s = summarizeBook(logs, reg);
    expect(s.chapters).toBe(2);
    expect(s.exhausted).toBe(0);
    expect(s.totalVetoed).toBe(1);
    expect(s.vetoByCode['PLOT_RECAP']).toBe(1);
    expect(s.distinctHeads).toBe(2);
    expect(s.regenerationRate).toBe(0);
  });

  it('un livre vide ne casse pas le resume', () => {
    const s = summarizeBook([], new PeriodHeadRegistry());
    expect(s.chapters).toBe(0);
    expect(s.regenerationRate).toBe(0);
  });
});

describe('INV-SCRIBE2-07 — auditabilite : « 0 veto » doit etre verifiable', () => {
  it('trace chaque candidat ecarte : hash, mots, extrait, raison', async () => {
    const reg = new PeriodHeadRegistry();
    const r = await writeChapter(
      fixed(recapPeriod('Il comprit alors'), cleanPeriod('Tete propre et neuve')),
      reg,
    );
    expect(r.log.rejected).toHaveLength(1);
    const t = r.log.rejected[0];
    expect(t?.sha256).toMatch(/^[0-9a-f]{64}$/u);
    expect(t?.words).toBeGreaterThan(50);
    expect(t?.excerpt.length).toBeGreaterThan(0);
    expect(t?.vetos[0]?.code).toBe('PLOT_RECAP');
    expect(t?.candidateIndex).toBe(0);
  });

  it('trace aussi les candidats ecartes par REPULSION, distincts des vetos', async () => {
    const reg = new PeriodHeadRegistry();
    await writeChapter(fixed(cleanPeriod('Le vent tomba doucement')), reg);
    const r2 = await writeChapter(
      fixed(cleanPeriod('Le vent tomba doucement'), cleanPeriod('Une autre tete neuve')),
      reg,
    );
    const rep = r2.log.rejected.find((x) => x.repelledHead !== undefined);
    expect(rep?.repelledHead).toBe('le vent tomba doucement');
    expect(rep?.vetos).toHaveLength(0);
  });

  it('un run sans rejet a une trace VIDE, pas absente — la difference compte', async () => {
    const reg = new PeriodHeadRegistry();
    const r = await writeChapter(fixed(cleanPeriod('Tout propre du premier coup')), reg);
    expect(r.log.rejected).toEqual([]);
    expect(Array.isArray(r.log.rejected)).toBe(true);
  });
});

describe('INV-SCRIBE2-08 — mode SHADOW : observer sans decider', () => {
  it('la production garde son choix, le gate archive le sien', async () => {
    const reg = new PeriodHeadRegistry();
    const r = await writeChapter(
      fixed(recapPeriod('Choix production'), cleanPeriod('Choix du gate ici')),
      reg,
      { shadow: true, productionPick: () => 0 },
    );
    // La production a choisi le candidat 0 (recapitulatif) : il est retenu.
    expect(r.prose).toContain('Choix production');
    // Le gate aurait pris le 1 : c'est archive, et la divergence est signalee.
    expect(r.log.shadowChoice?.candidateIndex).toBe(1);
    expect(r.log.shadowDiverged).toBe(true);
  });

  it('aucune divergence signalee quand les deux tombent d accord', async () => {
    const reg = new PeriodHeadRegistry();
    const r = await writeChapter(
      fixed(cleanPeriod('Les deux sont d accord'), recapPeriod('Second candidat')),
      reg,
      { shadow: true, productionPick: () => 0 },
    );
    expect(r.log.shadowDiverged).toBe(false);
  });

  it('MEME en shadow, un residu anglais ne peut pas gagner — faute objective', async () => {
    const reg = new PeriodHeadRegistry();
    const r = await writeChapter(
      fixed(
        `${cleanPeriod('Candidat production')} Il partit during la nuit.`,
        cleanPeriod('Candidat sans faute ici'),
      ),
      reg,
      { shadow: true, productionPick: () => 0 },
    );
    expect(r.prose).not.toContain('during');
    expect(r.prose).toContain('Candidat sans faute');
  });

  it('hors shadow, aucun champ shadow n est renseigne', async () => {
    const reg = new PeriodHeadRegistry();
    const r = await writeChapter(fixed(cleanPeriod('Mode dur normal ici')), reg);
    expect(r.log.shadowChoice).toBeUndefined();
    expect(r.log.shadowDiverged).toBeUndefined();
  });
});
