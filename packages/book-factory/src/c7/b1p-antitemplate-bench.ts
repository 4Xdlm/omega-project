/**
 * OMEGA — B1' : soigner le GABARIT sans perdre la PÉRIODE.
 *
 * ÉTAT DU PROBLÈME (B0, 2026-08-02)
 * ─────────────────────────────────
 * L'opportunité PLAN fait tomber le plafond syntaxique — 0/21 → 21/21 périodes
 * ≥50 mots, à la bonne dose (1,55 % contre 1,67 % au corpus publié). Mais les
 * périodes s'ouvrent toutes pareil :
 *
 *     taux de répétition de tête   B1 0,4286   B3 0,7273
 *     baseline publiée (2000 tirages de 21)     0,0009   max observé 0,0952
 *
 * Un romancier ne répète jamais l'ouverture de ses phrases longues. OMEGA le fait
 * une fois sur deux. C'est le pattern AP-9 : on troque un défaut contre un gabarit.
 *
 * DEUX REMÈDES, TESTÉS SÉPARÉMENT (sinon la cause reste illisible)
 * ───────────────────────────────────────────────────────────────
 *   B1a — INTERDICTION de la formule de bascule. Même nature que la denylist de
 *         tics déjà en service (`BANNED` de gen-v4-all) et que la contrainte
 *         « n'ouvre jamais comme un autre chapitre » d'incipitPolicy. Ce n'est pas
 *         un quota lexical (FORBID-006 clause 3 vise l'obligation d'employer, pas
 *         l'interdiction d'un tic).
 *         RISQUE : déplacer le gabarit au lieu de le supprimer.
 *
 *   B1b — POOL DE PORTES D'ENTRÉE, sans nommer aucune formule. Transposition
 *         directe d'`incipitPolicy` (pool de 10 types d'ouverture de chapitre,
 *         déjà validé) à l'ouverture de période.
 *         RISQUE : trop indirect pour mordre.
 *
 * Le bras de contrôle B1 est REPRIS TEL QUEL depuis B0 : même prompt, mêmes
 * paramètres, aucune régénération — la comparaison est donc exacte.
 *
 *   cwd = packages/book-factory
 *   tsx src/c7/b1p-antitemplate-bench.ts
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  measureTemplateEmergence,
  longPeriodDensity,
  extractLongPeriods,
  periodHead,
  TEMPLATE_THRESHOLDS,
  PUBLISHED_LONG_PERIOD_DENSITY,
} from '../variation/long-period-template.js';
import { countWordsFr } from '../../../omega-p0/src/phonetic/sentence-splitter-fr.js';

const OUT = 'runs/b1p_antitemplate';
const MODEL = process.env['B1P_MODEL'] ?? 'gemma4:31b';
const RUNS = Number(process.env['B1P_RUNS'] ?? '3');
const CANDIDATES = Number(process.env['B1P_CANDIDATES'] ?? '7');
const ARMS = (process.env['B1P_ARMS'] ?? 'B1a,B1b').split(',').map((s) => s.trim());

/* ── scène : strictement identique à B0, condition de comparabilité ── */

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

/** Le PLAN de B1, inchangé — c'est lui qui produit la période. */
const PLAN_OPPORTUNITY =
  "STRUCTURE DE LA SCÈNE — une opportunité, pas une obligation :\n" +
  "dans le dernier tiers, au moment où Garcia relie enfin les faits entre eux, " +
  "sa pensée a le droit de se dérouler d'un seul tenant — une seule période portée " +
  "par ses subordonnées, qui suit le raisonnement jusqu'à son terme sans le découper. " +
  "Ailleurs dans la scène : phrases ordinaires. Si la pensée ne le porte pas à cet " +
  "endroit, n'en fais rien : une période creuse serait pire que son absence.";

/** B1a — interdiction de la formule de bascule (denylist, précédent : BANNED). */
const ANTI_TEMPLATE_DENY =
  "OUVERTURE DE CETTE PÉRIODE — interdits :\n" +
  "n'ouvre pas par une formule de bascule (« c'est alors que… », « il comprit que… », " +
  "« tout devint limpide », « les pièces du puzzle », « sa pensée s'accéléra »). " +
  "Ces tournures annoncent la pensée au lieu de la faire.";

/** B1b — pool de portes d'entrée, sans nommer aucune formule (patron : incipitPolicy). */
const ANTI_TEMPLATE_POOL =
  "OUVERTURE DE CETTE PÉRIODE — entre dedans par le concret :\n" +
  "commence-la par ce que Garcia fait, voit, touche ou entend à cet instant précis " +
  "(un geste, un objet, une sensation, un bruit, un détail du lieu), et laisse le " +
  "raisonnement naître de là. La pensée s'attache à une chose du monde avant de " +
  "se déployer.";

interface ArmConfig {
  readonly plan: boolean;
  readonly extra: string | null;
  readonly note: string;
}
const ARM_CONFIG: Record<string, ArmConfig> = {
  B1: { plan: true, extra: null, note: 'contrôle, repris de B0 sans régénération' },
  B1a: { plan: true, extra: ANTI_TEMPLATE_DENY, note: 'interdiction de formule de bascule' },
  B1b: { plan: true, extra: ANTI_TEMPLATE_POOL, note: "pool de portes d'entrée concrètes" },
};

function buildUser(cfg: ArmConfig): string {
  return (
    `${FAMILY}\n\n` +
    `ÉCRIS un chapitre d'environ 1200 mots (développe) : ${BRIEF}\n\n` +
    (cfg.plan ? `${PLAN_OPPORTUNITY}\n\n` : '') +
    (cfg.extra !== null ? `${cfg.extra}\n\n` : '') +
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

interface ArmResult {
  readonly arm: string;
  readonly note: string;
  readonly n: number;
  readonly outputsWithPeriod: number;
  readonly periods: number;
  readonly headRepeatRate: number;
  readonly verdict: string;
  readonly timesAbovePublished: number;
  readonly density: number;
  readonly maxPeriodWords: number;
  readonly topHeads: readonly { motif: string; count: number }[];
  readonly topNgrams: readonly { motif: string; count: number }[];
}

function analyse(arm: string, note: string, texts: readonly string[]): ArmResult {
  const t = measureTemplateEmergence(texts);
  const d = longPeriodDensity(texts);
  let maxWords = 0;
  let withPeriod = 0;
  for (const x of texts) {
    const ps = extractLongPeriods(x);
    if (ps.length > 0) withPeriod += 1;
    for (const p of ps) maxWords = Math.max(maxWords, countWordsFr(p));
  }
  return {
    arm,
    note,
    n: texts.length,
    outputsWithPeriod: withPeriod,
    periods: t.periods,
    headRepeatRate: t.headRepeatRate,
    verdict: t.verdict,
    timesAbovePublished: t.timesAbovePublished,
    density: d.ratio,
    maxPeriodWords: maxWords,
    topHeads: t.repeatedHeads.slice(0, 5),
    topNgrams: t.repeatedNgrams.slice(0, 5),
  };
}

function loadArm(dir: string, prefix: string): readonly string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.startsWith(`${prefix}_`) && f.endsWith('.md'))
    .sort()
    .map((f) => readFileSync(`${dir}/${f}`, 'utf8'));
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const results: ArmResult[] = [];

  // Contrôles repris de B0 — aucune régénération, comparaison exacte.
  for (const ref of ['B0', 'B1', 'B3']) {
    const texts = loadArm('runs/b0_causal', ref);
    if (texts.length > 0) {
      const cfgNote = ref === 'B1' ? ARM_CONFIG['B1']?.note ?? '' : 'référence B0';
      results.push(analyse(ref, cfgNote, texts));
      process.stdout.write(`[B1'] ${ref} repris de B0 (${texts.length} sorties)\n`);
    }
  }

  for (const arm of ARMS) {
    const cfg = ARM_CONFIG[arm];
    if (cfg === undefined) {
      process.stdout.write(`[B1'] bras inconnu ignoré : ${arm}\n`);
      continue;
    }
    const user = buildUser(cfg);
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
          const head = ps[0] !== undefined ? periodHead(ps[0]) : '—';
          process.stdout.write(
            `     ${tag.padEnd(13)} ${String(countWordsFr(text)).padStart(4)}w  ` +
              `periodes=${ps.length}  tete="${head}"\n`,
          );
        } catch (e) {
          process.stdout.write(`     ${tag} ERREUR ${String(e)}\n`);
        }
      }
    }
    results.push(analyse(arm, cfg.note, texts));
  }

  writeFileSync(
    `${OUT}/B1P_MANIFEST.json`,
    JSON.stringify(
      {
        spec: 'B1_PRIME_ANTITEMPLATE',
        model: MODEL,
        thresholds: TEMPLATE_THRESHOLDS,
        publishedDensity: PUBLISHED_LONG_PERIOD_DENSITY,
        gate:
          "PASS d'un remede : conserve >=19/21 sorties avec periode ET ramene le taux de " +
          'repetition de tete sous 0,10 (seuil TEMPLATE), sans faire chuter la densite ' +
          'sous 1,0 % ni exploser au-dessus de 2,5 %.',
        results,
      },
      null,
      2,
    ),
    'utf8',
  );

  process.stdout.write('\n[B1\'] SYNTHESE — gabarit vs periode\n');
  process.stdout.write(
    `  ${'bras'.padEnd(5)} ${'sorties'.padEnd(8)} ${'periodes'.padEnd(9)} ${'repet.tete'.padEnd(11)} ${'verdict'.padEnd(19)} densite  max\n`,
  );
  for (const r of results) {
    process.stdout.write(
      `  ${r.arm.padEnd(5)} ${`${r.outputsWithPeriod}/${r.n}`.padEnd(8)} ${String(r.periods).padEnd(9)} ` +
        `${r.headRepeatRate.toFixed(4).padEnd(11)} ${r.verdict.padEnd(19)} ` +
        `${(r.density * 100).toFixed(2)}%   ${r.maxPeriodWords}\n`,
    );
  }
  process.stdout.write(
    `\n  reference publiee : repetition ${TEMPLATE_THRESHOLDS.publishedMean} ` +
      `(max observe ${TEMPLATE_THRESHOLDS.publishedMaxObserved}) · densite ${(PUBLISHED_LONG_PERIOD_DENSITY * 100).toFixed(2)}%\n`,
  );
  for (const r of results) {
    if (r.topHeads.length > 0) {
      process.stdout.write(`\n  [${r.arm}] tetes repetees : `);
      process.stdout.write(r.topHeads.map((h) => `"${h.motif}" x${h.count}`).join(' · '));
      process.stdout.write('\n');
    }
  }
  void createHash;
}

main().catch((e: unknown) => {
  process.stderr.write(`[B1'] ECHEC : ${String(e)}\n`);
  process.exitCode = 1;
});
