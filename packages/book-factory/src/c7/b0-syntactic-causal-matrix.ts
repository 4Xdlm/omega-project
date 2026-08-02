/**
 * OMEGA — B0_SYNTACTIC_CAUSAL_MATRIX : quel levier produit la période ample ?
 *
 * POURQUOI CETTE EXPÉRIENCE PLUTÔT QUE LA TRANCHE COMPLÈTE
 * ────────────────────────────────────────────────────────
 * Assembler d'un coup PLAN + exemplar + sélection + SURGICAL + scellement rendrait
 * toute variation ININTERPRÉTABLE. Quatre bras, deux facteurs croisés, même scène,
 * même modèle, même paramètres : la cause devient lisible.
 *
 *   bras │ PLAN (long_tail_opportunity) │ exemplar FR natif
 *   ─────┼──────────────────────────────┼──────────────────
 *   B0   │ non                          │ non   (= A3, réutilisable)
 *   B1   │ oui                          │ non
 *   B2   │ non                          │ oui
 *   B3   │ oui                          │ oui
 *
 * NI SÉLECTION SHADOW NI SURGICAL ICI : ils brouilleraient l'attribution.
 * On mesure la CAPACITÉ DE GÉNÉRATION, rien d'autre.
 *
 * CE QUI EST DÉJÀ RÉFUTÉ, À NE PAS REFAIRE
 * ────────────────────────────────────────
 *   DIRECTIVE_LONG_TAIL = FAIL. En A3, la consigne explicite « une phrase au moins
 *   doit dépasser cinquante mots » a produit ZÉRO phrase ≥50. Le PLAN de ce banc
 *   n'est donc PAS une redite numérique : c'est une OPPORTUNITÉ NARRATIVE située,
 *   sans quota (FORBID-006 v2 clause 5). Aucun nombre n'est transmis au modèle.
 *
 * BASELINE PRÉENREGISTRÉE : 0 phrase ≥50 mots sur 42 générations (A0 + A3).
 *
 *   cwd = packages/book-factory
 *   tsx src/c7/b0-syntactic-causal-matrix.ts
 *   B0_ARMS=B1,B2,B3 B0_RUNS=3 B0_CANDIDATES=7 tsx src/c7/b0-syntactic-causal-matrix.ts
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { measureRepetition } from '../coherence/repetition-sensor.js';
import { scanEnglishResiduals } from '../doctor/lang-purity.js';

const OUT = 'runs/b0_causal';
const MODEL = process.env['B0_MODEL'] ?? 'gemma4:31b';
const RUNS = Number(process.env['B0_RUNS'] ?? '3');
const CANDIDATES = Number(process.env['B0_CANDIDATES'] ?? '7');
const ARMS = (process.env['B0_ARMS'] ?? 'B1,B2,B3').split(',').map((s) => s.trim());

/* ─────────────────── scène : identique à A0/A3, condition de comparabilité ─────────────────── */

const SYSTEM =
  "Tu es un romancier français de polar littéraire (registre Simenon, Vargas maritime). " +
  "Prose sobre, tenue, concrète, sensorielle au compte-gouttes, français impeccable. " +
  "Tu écris un chapitre de SOLITUDE et d'intériorité : AUCUNE confrontation, AUCUN dialogue " +
  "d'interrogatoire, AUCUN salon. Développe la scène, ne la résume pas. " +
  "Tu n'écris QUE la prose du chapitre (ni titre, ni note, ni méta).";

const FAMILY =
  "PERSONNAGES : Garcia (inspecteur). Léna Marchetti (du village, tiraillée). " +
  "Yvon Squarcioni (maire-patriarche, cerveau du meurtre). Gaspard (vieux du port, peureux). " +
  "Dubois = gardien de phare ASSASSINÉ (maître-chanteur). Marc = revenant cru mort dans le naufrage. " +
  "LIEU : Ker-Morvan, Bretagne. Naufrage du Triton (1998) = montage : cargaison détournée, " +
  "butin partagé, silence acheté.";

const BRIEF =
  "RETOMBÉE RÉFLEXIVE. Garcia SEUL, après une révélation qui l'a ébranlé. " +
  "Ce n'est pas une scène d'action : c'est la décantation. Ce qu'il vient d'apprendre se réorganise " +
  "lentement, il mesure ce que cela coûte et ce que cela l'oblige à faire. " +
  "Aucune autre voix, aucun dialogue. Environ 1200 mots.";

/**
 * FACTEUR 1 — le PLAN. Opportunité NARRATIVE SITUÉE, jamais un quota.
 * Aucun nombre de mots, aucune obligation : la scène déclare un endroit où la
 * pensée a le droit de se déployer d'un seul tenant. FORBID-006 v2 clause 5.
 */
const PLAN_OPPORTUNITY =
  "STRUCTURE DE LA SCÈNE — une opportunité, pas une obligation :\n" +
  "dans le dernier tiers, au moment où Garcia relie enfin les faits entre eux, " +
  "sa pensée a le droit de se dérouler d'un seul tenant — une seule période portée " +
  "par ses subordonnées, qui suit le raisonnement jusqu'à son terme sans le découper. " +
  "Ailleurs dans la scène : phrases ordinaires. Si la pensée ne le porte pas à cet " +
  "endroit, n'en fais rien : une période creuse serait pire que son absence.";

/**
 * FACTEUR 2 — l'exemplar. MONTRE la forme au lieu de l'ordonner (S0-ROSETTA :
 * la directive obtient 0 %, le few-shot 0→100 %).
 *
 * ⚠ PROVENANCE : prose ORIGINALE écrite pour ce banc, dans un univers étranger au
 * livre (montagne, géologue) afin de n'apporter aucun fait au récit de Ker-Morvan.
 * Elle n'est pas tirée d'un auteur : aucun droit en jeu, aucun pastiche d'un style
 * identifiable. Sa QUALITÉ est un facteur confondant possible — un exemplar médiocre
 * ferait échouer le bras pour une mauvaise raison. À VALIDER PAR L'ARCHITECTE avant
 * toute généralisation.
 */
const EXEMPLAR =
  "Voici un exemple de la texture recherchée dans ce genre de scène — ne le recopie " +
  "pas, ne reprends ni ses personnages ni son décor, observe seulement comment la " +
  "pensée s'y déroule :\n\n" +
  "« Il resta longtemps sans bouger. Le vent tombait. Et tandis qu'il regardait la " +
  "vallée s'emplir d'ombre, il comprit que ce qu'il avait pris pendant vingt ans " +
  "pour de la patience — cette façon qu'il avait eue d'attendre, de remettre, de se " +
  "dire que le moment viendrait où les choses se dénoueraient d'elles-mêmes sans " +
  "qu'il eût à trancher — n'avait jamais été que de la peur, une peur si ancienne " +
  "et si bien installée qu'elle avait fini par prendre la forme d'une vertu, et " +
  "qu'il faudrait maintenant, à cinquante-trois ans, apprendre à vivre sans elle. " +
  "Il ramassa son sac. La pierre était froide sous ses doigts. »";

function buildUser(plan: boolean, exemplar: boolean): string {
  return (
    `${FAMILY}\n\n` +
    (exemplar ? `${EXEMPLAR}\n\n` : '') +
    `ÉCRIS un chapitre d'environ 1200 mots (développe) : ${BRIEF}\n\n` +
    (plan ? `${PLAN_OPPORTUNITY}\n\n` : '') +
    `Écris UNIQUEMENT la prose du chapitre.`
  );
}

const ARM_CONFIG: Record<string, { plan: boolean; exemplar: boolean }> = {
  B0: { plan: false, exemplar: false },
  B1: { plan: true, exemplar: false },
  B2: { plan: false, exemplar: true },
  B3: { plan: true, exemplar: true },
};

/* ───────────────────────────────── mesures ───────────────────────────────── */

const CASTING = ['garcia', 'léna', 'lena', 'marchetti', 'yvon', 'squarcioni', 'gaspard', 'dubois', 'marc',
  'ker-morvan', 'triton', 'bretagne'];

function sha(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}
function nwords(s: string): number {
  return s.split(/\s+/u).filter((w) => w.length > 0).length;
}
function splitSentences(t: string): readonly string[] {
  return t.split(/(?<=[.!?…])\s+(?=[«"'(\p{Lu}\d])/u).filter((s) => s.trim().length > 0);
}

interface Measure {
  readonly words: number;
  readonly sentences: number;
  /** Profil de longueurs : combien de phrases au-dessus de chaque seuil. */
  readonly ge30: number;
  readonly ge40: number;
  readonly ge50: number;
  readonly maxSentenceWords: number;
  /** Position relative (0..1) de la phrase la plus longue — la zone visée est le dernier tiers. */
  readonly maxPosition: number;
  /** Une période 50-90 mots existe-t-elle, et dans le dernier tiers ? */
  readonly hasAmplePeriod: boolean;
  readonly amplePeriodInZone: boolean;
  readonly amplePeriodCount: number;
  /** Complétude grossière : phrases sans aucun verbe conjugué apparent. */
  readonly verblessSentences: number;
  /** Entités capitalisées inconnues du casting = fait potentiellement ajouté. */
  readonly newEntities: readonly string[];
  readonly englishResiduals: number;
  readonly ticDensity: number;
  readonly sha256: string;
}

const VERB_HINT =
  /(?:\b(?:est|était|fut|sera|a|avait|eut|aura|sont|étaient|furent|ont|avaient|eurent)\b|\w+(?:ait|aient|era|erait|ons|ez|ent|it|irent|èrent|assent|ât|ît|ût)\b|\w+a\b)/u;

function measure(text: string): Measure {
  const words = nwords(text);
  const sents = splitSentences(text);
  const lens = sents.map(nwords);
  const maxLen = lens.length > 0 ? Math.max(...lens) : 0;
  const maxIdx = lens.indexOf(maxLen);
  const ample = lens
    .map((n, i) => ({ n, i }))
    .filter((x) => x.n >= 50 && x.n <= 90);
  const known = new Set(CASTING);
  const caps = new Set<string>();
  for (const m of text.matchAll(/(?<![.!?…]\s)(?<!^)\b(\p{Lu}\p{Ll}{2,})\b/gmu)) {
    const w = (m[1] ?? '').toLowerCase();
    if (!known.has(w)) caps.add(m[1] ?? '');
  }
  const rep = measureRepetition(text);
  return {
    words,
    sentences: sents.length,
    ge30: lens.filter((n) => n >= 30).length,
    ge40: lens.filter((n) => n >= 40).length,
    ge50: lens.filter((n) => n >= 50).length,
    maxSentenceWords: maxLen,
    maxPosition: lens.length > 0 ? Number((maxIdx / lens.length).toFixed(3)) : 0,
    hasAmplePeriod: ample.length > 0,
    amplePeriodInZone: ample.some((x) => x.i / Math.max(1, lens.length) >= 0.6),
    amplePeriodCount: ample.length,
    verblessSentences: sents.filter((s) => nwords(s) >= 5 && !VERB_HINT.test(s)).length,
    newEntities: [...caps].slice(0, 12),
    englishResiduals: scanEnglishResiduals(text).length,
    ticDensity:
      words > 0 ? Number(((rep.families.reduce((a, f) => a + f.total, 0) / words) * 1000).toFixed(2)) : 0,
    sha256: sha(text),
  };
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

/** Réutilise le bras B0 depuis A3 si les paramètres correspondent exactement. */
function loadA3AsB0(): readonly Measure[] | null {
  const dir = 'runs/a3_conformity';
  if (!existsSync(`${dir}/A3_MANIFEST.json`)) return null;
  const man = JSON.parse(readFileSync(`${dir}/A3_MANIFEST.json`, 'utf8')) as {
    records: Array<{ run: number; seed: number }>;
  };
  const out: Measure[] = [];
  for (const r of man.records) {
    const p = `${dir}/r${r.run}_s${r.seed}.md`;
    if (!existsSync(p)) return null;
    out.push(measure(readFileSync(p, 'utf8')));
  }
  return out;
}

function summarize(arm: string, ms: readonly Measure[]): Record<string, number | string> {
  const n = ms.length;
  const mean = (f: (m: Measure) => number): number =>
    n === 0 ? 0 : Number((ms.reduce((a, m) => a + f(m), 0) / n).toFixed(2));
  const withAmple = ms.filter((m) => m.hasAmplePeriod).length;
  const withAmpleInZone = ms.filter((m) => m.amplePeriodInZone).length;
  return {
    arm,
    n,
    'periodes 50-90 (sorties)': withAmple,
    'dont dans le dernier tiers': withAmpleInZone,
    'phrase max (moy)': mean((m) => m.maxSentenceWords),
    'phrase max (abs)': Math.max(...ms.map((m) => m.maxSentenceWords), 0),
    '>=30 (moy)': mean((m) => m.ge30),
    '>=40 (moy)': mean((m) => m.ge40),
    '>=50 (moy)': mean((m) => m.ge50),
    'mots (moy)': mean((m) => m.words),
    'sans verbe (moy)': mean((m) => m.verblessSentences),
    'entites nouvelles (moy)': mean((m) => m.newEntities.length),
    'anglais (total)': ms.reduce((a, m) => a + m.englishResiduals, 0),
    'tics POST_A3 (moy)': mean((m) => m.ticDensity),
  };
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const results: Record<string, Measure[]> = {};

  const reused = loadA3AsB0();
  if (reused !== null) {
    results['B0'] = [...reused];
    process.stdout.write(`[B0] bras B0 REUTILISE depuis A3 (${reused.length} sorties, parametres identiques)\n`);
  } else {
    process.stdout.write('[B0] A3 introuvable — le bras B0 devra etre genere\n');
  }

  for (const arm of ARMS) {
    const cfg = ARM_CONFIG[arm];
    if (cfg === undefined) {
      process.stdout.write(`[B0] bras inconnu ignore : ${arm}\n`);
      continue;
    }
    const user = buildUser(cfg.plan, cfg.exemplar);
    writeFileSync(`${OUT}/PROMPT_${arm}.txt`, user, 'utf8');
    const ms: Measure[] = [];
    for (let run = 1; run <= RUNS; run += 1) {
      for (let c = 1; c <= CANDIDATES; c += 1) {
        const tag = `${arm}_r${run}_c${c}`;
        try {
          const text = await generate(user);
          writeFileSync(`${OUT}/${tag}.md`, text, 'utf8');
          const m = measure(text);
          ms.push(m);
          process.stdout.write(
            `     ${tag.padEnd(12)} ${String(m.words).padStart(4)}w  max=${String(m.maxSentenceWords).padStart(3)}  ` +
              `>=50:${m.ge50}  ample=${m.hasAmplePeriod ? (m.amplePeriodInZone ? 'ZONE' : 'hors') : '-'}\n`,
          );
        } catch (e) {
          process.stdout.write(`     ${tag} ERREUR ${String(e)}\n`);
        }
      }
    }
    results[arm] = ms;
  }

  const summary = Object.entries(results).map(([arm, ms]) => summarize(arm, ms));
  writeFileSync(
    `${OUT}/B0_MANIFEST.json`,
    JSON.stringify(
      {
        spec: 'B0_SYNTACTIC_CAUSAL_MATRIX',
        model: MODEL,
        runs: RUNS,
        candidatesPerRun: CANDIDATES,
        preregisteredBaseline: '0 phrase >=50 mots sur 42 generations (A0 + A3)',
        gate:
          "PASS d'un bras : >=5 sorties sur 21 avec une periode de 50-90 mots dans le dernier " +
          'tiers, <=1 periode ample par sortie, aucune entite nouvelle, aucune phrase sans verbe ajoutee.',
        arms: ARM_CONFIG,
        summary,
        detail: results,
      },
      null,
      2,
    ),
    'utf8',
  );

  process.stdout.write('\n[B0] SYNTHESE\n');
  for (const s of summary) {
    process.stdout.write(
      `  ${String(s['arm']).padEnd(3)} n=${String(s['n']).padStart(2)}  ` +
        `periodes 50-90 : ${String(s['periodes 50-90 (sorties)']).padStart(2)}/${String(s['n'])}  ` +
        `(zone : ${String(s['dont dans le dernier tiers'])})  ` +
        `max abs=${String(s['phrase max (abs)']).padStart(3)}  ` +
        `moy>=40 : ${String(s['>=40 (moy)'])}  mots=${String(s['mots (moy)'])}\n`,
    );
  }
  process.stdout.write('\n[B0] baseline preenregistree : 0/42 sortie avec phrase >=50 (A0 + A3)\n');
}

main().catch((e: unknown) => {
  process.stderr.write(`[B0] ECHEC : ${String(e)}\n`);
  process.exitCode = 1;
});
