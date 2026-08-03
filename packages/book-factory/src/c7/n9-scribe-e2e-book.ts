/**
 * OMEGA — N9 : le scribe V2 en conditions de LIVRE.
 *
 * LA FAIBLESSE QUE CE RUN ADRESSE
 * ───────────────────────────────
 * Toutes les mesures de la nuit portent sur des scènes ISOLÉES, régénérées 21
 * fois chacune. Rien ne dit ce qui se passe quand dix chapitres se suivent et
 * que le registre de têtes se remplit : le coût du refus augmente-t-il ? le
 * modèle finit-il par manquer d'ouvertures ? le gabarit revient-il ?
 *
 * DISPOSITIF
 * ──────────
 * Dix chapitres consécutifs, un seul registre, le générateur de production
 * (`OllamaScribeV2Generator`) dans sa configuration B1c. Six chapitres déclarent
 * l'opportunité de période longue, quatre non — parce qu'un livre n'en met pas
 * partout : le corpus publié n'a des périodes que dans 1,67 % de ses phrases.
 *
 * CE QU'ON MESURE
 * ───────────────
 *   • le taux de régénération réel (simulé à 1/21 en N7, jamais observé) ;
 *   • les vetos déclenchés, par code ;
 *   • les têtes refusées à mesure que le registre se remplit ;
 *   • le gabarit final sur les dix chapitres, comparé au corpus publié ;
 *   • les épuisements — le cas où aucun candidat ne passe.
 *
 * PRÉENREGISTRÉ, avant la première génération :
 *   H1 — le gate tient sur la durée : ≤2 chapitres épuisés, taux de régénération
 *        ≤0,5, gabarit final sous le seuil TEMPLATE (0,10).
 *   H0 — le registre étouffe le modèle : ≥4 épuisements ou gabarit ≥0,10.
 *
 *   cwd = packages/book-factory
 *   tsx src/c7/n9-scribe-e2e-book.ts
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { OllamaScribeV2Generator } from '../scribe/ollama-scribe-v2.js';
import { summarizeBook } from '../scribe/scribe-v2.js';
import {
  measureTemplateEmergence,
  longPeriodDensity,
  TEMPLATE_THRESHOLDS,
  PUBLISHED_LONG_PERIOD_DENSITY,
} from '../variation/long-period-template.js';
import { scanEnglishResiduals } from '../doctor/lang-purity.js';
import type { GenRequest } from '../chapter-generator.js';
import type { ChapterSpec } from '../book-planner.js';
import type { ChapterIntent } from '../chapter-spec-to-intent.js';

const OUT = 'runs/n9_scribe_book';
const MODEL = process.env['N9_MODEL'] ?? 'gemma4:31b';
const CANDIDATES = Number(process.env['N9_CANDIDATES'] ?? '5');

const FAMILY =
  "PERSONNAGES : Garcia (inspecteur). Léna Marchetti (du village, tiraillée). " +
  "Yvon Squarcioni (maire-patriarche, cerveau du meurtre). Gaspard (vieux du port, peureux). " +
  "Dubois = gardien de phare ASSASSINÉ (maître-chanteur). Marc = revenant cru mort dans le naufrage. " +
  "LIEU : Ker-Morvan, Bretagne. Naufrage du Triton (1998) = montage : cargaison détournée, " +
  "butin partagé, silence acheté.";

/** Dix scènes d'un même livre. `opportunity` : la scène ouvre-t-elle la période ? */
const SCENES: readonly { premise: string; emotion: string; opportunity: boolean }[] = [
  { premise: "Garcia arrive à Ker-Morvan sous la pluie et découvre le corps de Dubois au pied du phare.", emotion: 'malaise', opportunity: false },
  { premise: "Garcia interroge Gaspard sur le port ; le vieux ment mal et se contredit sur l'heure.", emotion: 'méfiance', opportunity: false },
  { premise: "Garcia SEUL le soir, il relit ses notes et mesure ce que le village lui cache.", emotion: 'accablement lucide', opportunity: true },
  { premise: "Léna croise Garcia au café ; échange bref, tendu, elle refuse de répondre puis part.", emotion: 'tension', opportunity: false },
  { premise: "Garcia trouve le carnet de comptes de Dubois dans la réserve du phare.", emotion: 'excitation froide', opportunity: false },
  { premise: "Garcia SEUL, il comprend l'ampleur du montage de 1998 en recoupant les chiffres.", emotion: 'vertige', opportunity: true },
  { premise: "Squarcioni reçoit Garcia chez lui, courtois, et lui explique sans le dire qu'il doit partir.", emotion: 'menace feutrée', opportunity: false },
  { premise: "Garcia SEUL après l'entretien, il pèse ce que cela coûterait d'aller au bout.", emotion: 'doute', opportunity: true },
  { premise: "Marc apparaît sur la digue à la tombée du jour et parle à Garcia pour la première fois.", emotion: 'stupeur', opportunity: true },
  { premise: "Garcia SEUL, dernière nuit, il décide et écrit le nom de Squarcioni sur son carnet.", emotion: 'résolution amère', opportunity: true },
];

function spec(i: number): ChapterSpec {
  return {
    index: i + 1,
    act: i < 3 ? 1 : i < 7 ? 2 : 3,
    objective: SCENES[i]?.premise ?? '',
    tension_target: 0.4 + i * 0.05,
    target_word_count: 1200,
    pov_character: 'Garcia',
    seeds_to_plant: [],
    seeds_to_reinforce: [],
    seeds_to_bloom: [],
    threads_to_open: [],
    threads_to_advance: [],
    threads_to_close: [],
    entering_state_requirements: [],
  };
}

function intent(i: number): ChapterIntent {
  const sc = SCENES[i];
  return {
    title: `Chapitre ${i + 1}`,
    premise: sc?.premise ?? '',
    themes: ['silence', 'complicité'],
    core_emotion: sc?.emotion ?? 'tension',
    target_audience: 'lecteurs de polar littéraire',
    message: 'Le silence se paie.',
    target_word_count: 1200,
  };
}

function tail(s: string, n: number): string {
  return s.split(/\s+/u).filter((w) => w.length > 0).slice(-n).join(' ');
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const gen = new OllamaScribeV2Generator({
    model: MODEL,
    candidates: CANDIDATES,
    maxAttempts: 3,
    timeoutMs: 300000,
  });

  for (const [i, sc] of SCENES.entries()) {
    if (sc.opportunity) {
      gen.declareScene({ chapterIndex: i + 1, longTailOpportunity: true, antiTemplateGuards: true });
    }
  }

  const proses: string[] = [];
  let previous = '';
  for (let i = 0; i < SCENES.length; i += 1) {
    const req: GenRequest = {
      intent: intent(i),
      digest: FAMILY,
      spec: spec(i),
      ...(previous.length > 0 ? { previousTail: tail(previous, 60) } : {}),
    };
    const t0 = Date.now();
    const r = await gen.generate(req);
    const log = gen.admissionLogs()[i];
    proses.push(r.prose);
    previous = r.prose;
    writeFileSync(`${OUT}/ch${String(i + 1).padStart(2, '0')}.md`, r.prose, 'utf8');
    process.stdout.write(
      `  ch${String(i + 1).padStart(2, '0')} ${SCENES[i]?.opportunity === true ? 'OPP' : '   '} ` +
        `${String(r.words).padStart(4)}w  essais=${String(log?.attempts ?? 0)}  ` +
        `vetos=${String(log?.vetoed.length ?? 0)}  repousses=${String(log?.repelledHeads ?? 0)}  ` +
        `${log?.exhausted === true ? 'EPUISE' : 'ok'}  ${((Date.now() - t0) / 1000).toFixed(0)}s\n`,
    );
  }

  const logs = gen.admissionLogs();
  const summary = summarizeBook(logs, gen.registry);
  const tmpl = measureTemplateEmergence(proses);
  const dens = longPeriodDensity(proses);
  const english = proses.reduce((a, p) => a + scanEnglishResiduals(p).length, 0);

  const hypothesis =
    summary.exhausted <= 2 && summary.regenerationRate <= 0.5 && tmpl.headRepeatRate < TEMPLATE_THRESHOLDS.template
      ? 'H1 SOUTENUE — le gate tient sur la duree du livre'
      : summary.exhausted >= 4 || tmpl.headRepeatRate >= TEMPLATE_THRESHOLDS.template
        ? 'H0 SOUTENUE — le registre etouffe le modele ou le gabarit revient'
        : 'INDECIS — entre les bornes preenregistrees';

  writeFileSync(
    `${OUT}/N9_MANIFEST.json`,
    JSON.stringify(
      {
        spec: 'N9_SCRIBE_E2E_BOOK',
        model: MODEL,
        chapters: SCENES.length,
        candidatesPerAttempt: CANDIDATES,
        opportunityScenes: SCENES.filter((s) => s.opportunity).length,
        preregistered: { H1: '<=2 epuises, regeneration <=0.5, gabarit <0.10', H0: '>=4 epuises ou gabarit >=0.10' },
        summary,
        template: tmpl,
        density: dens,
        publishedDensity: PUBLISHED_LONG_PERIOD_DENSITY,
        englishResiduals: english,
        hypothesis,
        logs,
      },
      null,
      2,
    ),
    'utf8',
  );

  process.stdout.write('\n[N9] JOURNAL D ADMISSION DU LIVRE\n');
  process.stdout.write(`  chapitres           ${summary.chapters}\n`);
  process.stdout.write(`  epuises             ${summary.exhausted}\n`);
  process.stdout.write(`  taux regeneration   ${summary.regenerationRate}\n`);
  process.stdout.write(`  vetos totaux        ${summary.totalVetoed} ${JSON.stringify(summary.vetoByCode)}\n`);
  process.stdout.write(`  tetes repoussees    ${summary.totalRepelled}\n`);
  process.stdout.write(`  tetes distinctes    ${summary.distinctHeads}\n`);
  process.stdout.write(`  gabarit final       ${tmpl.headRepeatRate} (${tmpl.verdict})\n`);
  process.stdout.write(
    `  densite periodes    ${(dens.ratio * 100).toFixed(2)}%  (publie ${(PUBLISHED_LONG_PERIOD_DENSITY * 100).toFixed(2)}%)\n`,
  );
  process.stdout.write(`  residus anglais     ${english}\n`);
  process.stdout.write(`\n  VERDICT PREENREGISTRE : ${hypothesis}\n`);
}

main().catch((e: unknown) => {
  process.stderr.write(`[N9] ECHEC : ${String(e)}\n`);
  process.exitCode = 1;
});
