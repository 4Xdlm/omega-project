/**
 * OMEGA — N6 : le levier PLAN tient-il sur une AUTRE scène ?
 *
 * CE QUI EST ÉTABLI, ET SA LIMITE
 * ───────────────────────────────
 * B0 puis B1' ont montré, sur UNE scène (retombée réflexive, fn TRANSITION) :
 *   • l'opportunité PLAN fait passer de 0/21 à 21/21 périodes ≥50 mots ;
 *   • l'exemplar seul ne fait rien (0/21) ;
 *   • l'interdiction de formule de bascule ramène le gabarit de 0,38 à 0,08.
 *
 * Tout cela vaut pour une scène de solitude réflexive. Rien ne dit que le PLAN
 * mordra sur une scène d'une autre nature — ni que le gabarit y prendra la même
 * forme. EMP-16 demande une troisième preuve sur une DIMENSION CHANGÉE, pas une
 * troisième répétition du même dispositif.
 *
 * CE QUI CHANGE ICI (une seule chose à la fois)
 * ─────────────────────────────────────────────
 * La SCÈNE. Fonction dramatique REVELATION au lieu de TRANSITION : deux
 * personnages, du dialogue, de la tension — le contraire d'une décantation
 * solitaire. Le PLAN et l'interdiction sont recopiés MOT POUR MOT depuis B1a,
 * seule la description de scène diffère. Modèle, paramètres, effectifs : identiques.
 *
 * PRÉENREGISTREMENT (avant toute génération)
 * ──────────────────────────────────────────
 *   H1 — le PLAN est un levier de FORME, indépendant de la scène :
 *        N6-plan produira ≥15/21 sorties avec période ≥50 mots.
 *   H0 — le PLAN ne marchait que parce que la scène s'y prêtait :
 *        N6-plan restera sous 5/21, comme la baseline.
 *   Contrôle N6-nu (sans PLAN) : attendu proche de 0/21, comme B0.
 *   Gabarit : si le PLAN mord, le taux de répétition de tête de N6-plan est
 *        comparé au seuil TEMPLATE (0,10) et à B1a (0,08).
 *
 *   cwd = packages/book-factory
 *   tsx src/c7/n6-replication-other-scene.ts
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import {
  measureTemplateEmergence,
  longPeriodDensity,
  extractLongPeriods,
  TEMPLATE_THRESHOLDS,
} from '../variation/long-period-template.js';
import { countWordsFr } from '../../../omega-p0/src/phonetic/sentence-splitter-fr.js';
import { scanEnglishResiduals } from '../doctor/lang-purity.js';

const OUT = 'runs/n6_replication';
const MODEL = process.env['N6_MODEL'] ?? 'gemma4:31b';
const RUNS = Number(process.env['N6_RUNS'] ?? '3');
const CANDIDATES = Number(process.env['N6_CANDIDATES'] ?? '7');
const ARMS = (process.env['N6_ARMS'] ?? 'N6nu,N6plan').split(',').map((s) => s.trim());

const SYSTEM =
  "Tu es un romancier français de polar littéraire (registre Simenon, Vargas maritime). " +
  "Prose sobre, tenue, concrète, sensorielle au compte-gouttes, français impeccable. " +
  "Tu n'écris QUE la prose du chapitre (ni titre, ni note, ni méta).";

const FAMILY =
  "PERSONNAGES : Garcia (inspecteur). Léna Marchetti (du village, tiraillée). " +
  "Yvon Squarcioni (maire-patriarche, cerveau du meurtre). Gaspard (vieux du port, peureux). " +
  "Dubois = gardien de phare ASSASSINÉ (maître-chanteur). Marc = revenant cru mort dans le naufrage. " +
  "LIEU : Ker-Morvan, Bretagne. Naufrage du Triton (1998) = montage : cargaison détournée, " +
  "butin partagé, silence acheté.";

/** SCÈNE DIFFÉRENTE — REVELATION à deux, dialogue, tension. Pas une décantation. */
const BRIEF_N6 =
  "RÉVÉLATION. Léna vient trouver Garcia et lui dit ce qu'elle sait : son propre père " +
  "figurait parmi ceux qui ont partagé le butin du Triton. Elle le dit mal, par à-coups, " +
  "en se contredisant. Garcia doit décider s'il la croit. DIALOGUE PRÉSENT, tendu, sec — " +
  "deux personnes dans la même pièce, pas de monologue intérieur prolongé. Environ 1200 mots.";

/** PLAN — recopié MOT POUR MOT depuis B1a, seul le repère de scène est adapté. */
const PLAN_OPPORTUNITY =
  "STRUCTURE DE LA SCÈNE — une opportunité, pas une obligation :\n" +
  "dans le dernier tiers, au moment où Garcia relie enfin les faits entre eux, " +
  "sa pensée a le droit de se dérouler d'un seul tenant — une seule période portée " +
  "par ses subordonnées, qui suit le raisonnement jusqu'à son terme sans le découper. " +
  "Ailleurs dans la scène : phrases ordinaires. Si la pensée ne le porte pas à cet " +
  "endroit, n'en fais rien : une période creuse serait pire que son absence.";

/** Interdiction — recopiée MOT POUR MOT depuis B1a. */
const ANTI_TEMPLATE_DENY =
  "OUVERTURE DE CETTE PÉRIODE — interdits :\n" +
  "n'ouvre pas par une formule de bascule (« c'est alors que… », « il comprit que… », " +
  "« tout devint limpide », « les pièces du puzzle », « sa pensée s'accéléra »). " +
  "Ces tournures annoncent la pensée au lieu de la faire.";

const ARM_CONFIG: Record<string, { plan: boolean; deny: boolean }> = {
  N6nu: { plan: false, deny: false },
  N6plan: { plan: true, deny: true },
};

function buildUser(plan: boolean, deny: boolean): string {
  return (
    `${FAMILY}\n\n` +
    `ÉCRIS un chapitre d'environ 1200 mots (développe) : ${BRIEF_N6}\n\n` +
    (plan ? `${PLAN_OPPORTUNITY}\n\n` : '') +
    (deny ? `${ANTI_TEMPLATE_DENY}\n\n` : '') +
    `Écris UNIQUEMENT la prose du chapitre.`
  );
}

async function generate(user: string): Promise<string> {
  const res = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: user },
      ],
      stream: false,
      think: false,
      options: { temperature: 0.88, top_p: 0.92, num_predict: 3200 },
    }),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}`);
  const data = (await res.json()) as { message?: { content?: string } };
  return (data.message?.content ?? '').replace(/<think>[\s\S]*?<\/think>/gu, '').trim();
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const summary: Array<Record<string, string | number>> = [];

  for (const arm of ARMS) {
    const cfg = ARM_CONFIG[arm];
    if (cfg === undefined) continue;
    const user = buildUser(cfg.plan, cfg.deny);
    writeFileSync(`${OUT}/PROMPT_${arm}.txt`, user, 'utf8');
    const texts: string[] = [];
    for (let run = 1; run <= RUNS; run += 1) {
      for (let c = 1; c <= CANDIDATES; c += 1) {
        const tag = `${arm}_r${run}_c${c}`;
        try {
          const text = await generate(user);
          writeFileSync(`${OUT}/${tag}.md`, text, 'utf8');
          texts.push(text);
          const ps = extractLongPeriods(text);
          process.stdout.write(
            `     ${tag.padEnd(14)} ${String(countWordsFr(text)).padStart(4)}w  periodes=${ps.length}` +
              `  max=${ps.length > 0 ? Math.max(...ps.map(countWordsFr)) : 0}\n`,
          );
        } catch (e) {
          process.stdout.write(`     ${tag} ERREUR ${String(e)}\n`);
        }
      }
    }
    const t = measureTemplateEmergence(texts);
    const d = longPeriodDensity(texts);
    const withP = texts.filter((x) => extractLongPeriods(x).length > 0).length;
    const en = texts.reduce((a, x) => a + scanEnglishResiduals(x).length, 0);
    summary.push({
      arm,
      n: texts.length,
      sortiesAvecPeriode: withP,
      periodes: t.periods,
      repetitionTete: t.headRepeatRate,
      verdict: t.verdict,
      densite: d.ratio,
      residusAnglais: en,
    });
  }

  const plan = summary.find((s) => s.arm === 'N6plan');
  const withP = typeof plan?.['sortiesAvecPeriode'] === 'number' ? plan['sortiesAvecPeriode'] : 0;
  const hypothesis =
    withP >= 15 ? 'H1 SOUTENUE — le PLAN est un levier de FORME, independant de la scene'
      : withP < 5 ? 'H0 SOUTENUE — le PLAN ne marchait que sur la scene reflexive'
        : 'INDECIS — entre les deux bornes preenregistrees';

  writeFileSync(
    `${OUT}/N6_MANIFEST.json`,
    JSON.stringify(
      {
        spec: 'N6_REPLICATION_OTHER_SCENE',
        model: MODEL,
        sceneChanged: 'REVELATION a deux avec dialogue (au lieu de TRANSITION solitaire)',
        planCopiedVerbatimFrom: 'B1a',
        preregistered: { H1: '>=15/21 sorties avec periode', H0: '<5/21' },
        thresholds: TEMPLATE_THRESHOLDS,
        summary,
        hypothesis,
      },
      null,
      2,
    ),
    'utf8',
  );

  process.stdout.write('\n[N6] SYNTHESE — meme PLAN, scene differente\n');
  for (const s of summary) {
    process.stdout.write(
      `  ${String(s['arm']).padEnd(7)} periodes ${String(s['sortiesAvecPeriode'])}/${String(s['n'])}  ` +
        `repet.tete ${String(s['repetitionTete'])}  ${String(s['verdict']).padEnd(18)} ` +
        `densite ${(Number(s['densite']) * 100).toFixed(2)}%  anglais ${String(s['residusAnglais'])}\n`,
    );
  }
  process.stdout.write(`\n  reference : B1a sur la scene reflexive = 21/21, repetition 0.0800\n`);
  process.stdout.write(`  VERDICT PREENREGISTRE : ${hypothesis}\n`);
}

main().catch((e: unknown) => {
  process.stderr.write(`[N6] ECHEC : ${String(e)}\n`);
  process.exitCode = 1;
});
