/**
 * OMEGA — N8 : casser le MOULE DE RAISONNEMENT (pas seulement sa tête).
 *
 * LE DÉFAUT
 * ─────────
 * B1a a ramené le gabarit d'OUVERTURE dans l'enveloppe humaine (0,38 → 0,08).
 * Mais la lecture — et les deux relecteurs externes — pointent le même défaut
 * plus profond : la période longue n'est pas une pensée, c'est un RÉSUMÉ DE
 * DOSSIER déguisé en intériorité. Garcia n'y découvre rien, il récapitule
 * l'intrigue pour le lecteur.
 *
 * LA BASELINE QUI REND LE DÉFAUT MESURABLE
 * ────────────────────────────────────────
 * Connecteurs de récapitulation causale (« car si… », « ce qui signifiait que »,
 * « transformant ainsi », « n'était pas X mais Y »…) comptés dans les périodes
 * de 50 mots et plus :
 *
 *   source                n periodes   moyenne   % a zero   % avec >=2
 *   PUBLIÉ (18 romans)        1384       0,01      99,2 %      0,0 %
 *   B1  (PLAN nu)               21       1,62      14,3 %     57,1 %
 *   B1b (PLAN + pool)           22       1,73       9,1 %     59,1 %
 *   B1a (PLAN + interdit tête)  26       0,69      57,7 %     19,2 %
 *   N6plan (autre scène)        23       0,35      65,2 %      0,0 %
 *
 * Une période à deux connecteurs ou plus n'existe pas dans le corpus publié :
 * 0 sur 1384. C'est le discriminant le plus net mesuré sur ce projet.
 * (Effet secondaire notable : l'interdiction de tête réduit DÉJÀ le moule de
 * moitié — les deux gabarits sont liés.)
 *
 * DEUX REMÈDES, TESTÉS SÉPARÉMENT
 * ───────────────────────────────
 *   B1c — INTERDICTION de la chaîne déductive. Denylist, comme B1a. N6 a montré
 *         qu'une denylist ne se généralise pas d'une scène à l'autre ; mais ici
 *         la cible est le TYPE DE CONTENU, pas une formule d'ouverture.
 *
 *   B1d — EXIGENCE DE NOUVEAUTÉ COGNITIVE. « À la fin de la période, il doit
 *         savoir ou sentir quelque chose qu'il ne savait pas au début. » C'est
 *         une contrainte STRUCTURELLE sur le contenu, pas une liste de mots.
 *         B1b a montré qu'une contrainte positive de FORME fabrique un gabarit ;
 *         reste à voir si une contrainte positive de FOND fait de même.
 *
 * Les deux partent de B1a (PLAN + interdiction de tête), qui reste le socle.
 *
 *   cwd = packages/book-factory
 *   tsx src/c7/n8-antirecap-bench.ts
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import {
  measureTemplateEmergence,
  longPeriodDensity,
  extractLongPeriods,
} from '../variation/long-period-template.js';
import { countWordsFr } from '../../../omega-p0/src/phonetic/sentence-splitter-fr.js';
import { scanEnglishResiduals } from '../doctor/lang-purity.js';

const OUT = 'runs/n8_antirecap';
const MODEL = process.env['N8_MODEL'] ?? 'gemma4:31b';
const RUNS = Number(process.env['N8_RUNS'] ?? '3');
const CANDIDATES = Number(process.env['N8_CANDIDATES'] ?? '7');
const ARMS = (process.env['N8_ARMS'] ?? 'B1c,B1d').split(',').map((s) => s.trim());

/** Connecteurs de récapitulation causale — 0/1384 périodes publiées en ont ≥2. */
const RECAP_RE =
  /\b(car si|ce qui signifiait|ce qui voulait dire|transformant ainsi|faisant de|obligeant|par conséquent|dès lors que|autrement dit|signifiait que|impliquait que|prouvait que|n'était pas\s+\w+\s+mais|non pas\s+\w+\s+mais)\b/giu;

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

const PLAN_OPPORTUNITY =
  "STRUCTURE DE LA SCÈNE — une opportunité, pas une obligation :\n" +
  "dans le dernier tiers, au moment où Garcia relie enfin les faits entre eux, " +
  "sa pensée a le droit de se dérouler d'un seul tenant — une seule période portée " +
  "par ses subordonnées, qui suit le raisonnement jusqu'à son terme sans le découper. " +
  "Ailleurs dans la scène : phrases ordinaires. Si la pensée ne le porte pas à cet " +
  "endroit, n'en fais rien : une période creuse serait pire que son absence.";

const ANTI_HEAD =
  "OUVERTURE DE CETTE PÉRIODE — interdits :\n" +
  "n'ouvre pas par une formule de bascule (« c'est alors que… », « il comprit que… », " +
  "« tout devint limpide », « les pièces du puzzle », « sa pensée s'accéléra »). " +
  "Ces tournures annoncent la pensée au lieu de la faire.";

/** B1c — interdiction de la chaîne déductive (denylist de contenu). */
const ANTI_RECAP_DENY =
  "CONTENU DE CETTE PÉRIODE — interdits :\n" +
  "elle ne récapitule pas l'enquête. Pas de chaîne de déductions, pas de « si… alors », " +
  "pas de « ce qui signifiait que », pas de « transformant ainsi », pas de bilan des faits " +
  "déjà connus du lecteur. Le lecteur sait déjà ce qui s'est passé ; le lui réexpliquer " +
  "dans la tête du personnage, c'est écrire une fiche de synthèse.";

/** B1d — exigence de nouveauté cognitive (contrainte structurelle de fond). */
const ANTI_RECAP_NEW =
  "CONTENU DE CETTE PÉRIODE — ce qu'elle doit produire :\n" +
  "à la fin, Garcia doit savoir ou sentir quelque chose qu'il ne savait pas au début " +
  "de la phrase — une contradiction, un souvenir précis qui remonte, un scrupule, " +
  "le prix personnel de ce qu'il va faire. S'il ne fait que réordonner ce qu'il sait " +
  "déjà, la période n'a pas lieu d'être : écris une phrase ordinaire à la place.";

interface ArmConfig {
  readonly extra: string | null;
  readonly note: string;
}
const ARM_CONFIG: Record<string, ArmConfig> = {
  B1c: { extra: ANTI_RECAP_DENY, note: 'B1a + interdiction de la chaine deductive' },
  B1d: { extra: ANTI_RECAP_NEW, note: 'B1a + exigence de nouveaute cognitive' },
};

function buildUser(extra: string | null): string {
  return (
    `${FAMILY}\n\n` +
    `ÉCRIS un chapitre d'environ 1200 mots (développe) : ${BRIEF}\n\n` +
    `${PLAN_OPPORTUNITY}\n\n` +
    `${ANTI_HEAD}\n\n` +
    (extra !== null ? `${extra}\n\n` : '') +
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

function recapCount(period: string): number {
  return (period.match(RECAP_RE) ?? []).length;
}

interface ArmResult {
  readonly arm: string;
  readonly note: string;
  readonly n: number;
  readonly outputsWithPeriod: number;
  readonly periods: number;
  readonly recapMean: number;
  readonly pctZeroRecap: number;
  readonly pctTwoPlusRecap: number;
  readonly headRepeatRate: number;
  readonly templateVerdict: string;
  readonly density: number;
  readonly maxPeriodWords: number;
  readonly englishResiduals: number;
}

function analyse(arm: string, note: string, texts: readonly string[]): ArmResult {
  const t = measureTemplateEmergence(texts);
  const d = longPeriodDensity(texts);
  const periods: string[] = [];
  let withP = 0;
  let maxW = 0;
  for (const x of texts) {
    const ps = extractLongPeriods(x);
    if (ps.length > 0) withP += 1;
    for (const p of ps) {
      periods.push(p);
      maxW = Math.max(maxW, countWordsFr(p));
    }
  }
  const counts = periods.map(recapCount);
  const n = counts.length;
  return {
    arm,
    note,
    n: texts.length,
    outputsWithPeriod: withP,
    periods: n,
    recapMean: n === 0 ? 0 : Number((counts.reduce((a, b) => a + b, 0) / n).toFixed(2)),
    pctZeroRecap: n === 0 ? 0 : Number(((counts.filter((c) => c === 0).length / n) * 100).toFixed(1)),
    pctTwoPlusRecap: n === 0 ? 0 : Number(((counts.filter((c) => c >= 2).length / n) * 100).toFixed(1)),
    headRepeatRate: t.headRepeatRate,
    templateVerdict: t.verdict,
    density: d.ratio,
    maxPeriodWords: maxW,
    englishResiduals: texts.reduce((a, x) => a + scanEnglishResiduals(x).length, 0),
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

  for (const [dir, ref, note] of [
    ['runs/b0_causal', 'B1', 'PLAN nu (controle)'],
    ['runs/b1p_antitemplate', 'B1a', 'PLAN + interdiction de tete (socle)'],
  ] as const) {
    const texts = loadArm(dir, ref);
    if (texts.length > 0) {
      results.push(analyse(ref, note, texts));
      process.stdout.write(`[N8] ${ref} repris (${texts.length} sorties)\n`);
    }
  }

  for (const arm of ARMS) {
    const cfg = ARM_CONFIG[arm];
    if (cfg === undefined) continue;
    const user = buildUser(cfg.extra);
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
          const rc = ps.reduce((a, p) => a + recapCount(p), 0);
          process.stdout.write(
            `     ${tag.padEnd(13)} ${String(countWordsFr(text)).padStart(4)}w  ` +
              `periodes=${ps.length}  recap=${rc}  max=${ps.length > 0 ? Math.max(...ps.map(countWordsFr)) : 0}\n`,
          );
        } catch (e) {
          process.stdout.write(`     ${tag} ERREUR ${String(e)}\n`);
        }
      }
    }
    results.push(analyse(arm, cfg.note, texts));
  }

  writeFileSync(
    `${OUT}/N8_MANIFEST.json`,
    JSON.stringify(
      {
        spec: 'N8_ANTIRECAP',
        model: MODEL,
        publishedBaseline: {
          periods: 1384,
          recapMean: 0.01,
          pctZeroRecap: 99.2,
          pctTwoPlusRecap: 0.0,
        },
        gate:
          "PASS d'un remede : conserve >=19/21 sorties avec periode, ramene % de periodes " +
          'a >=2 connecteurs sous 5 %, sans faire remonter la repetition de tete au-dessus de 0,10.',
        results,
      },
      null,
      2,
    ),
    'utf8',
  );

  process.stdout.write("\n[N8] SYNTHESE — le moule de raisonnement\n");
  process.stdout.write(
    `  ${'bras'.padEnd(5)} ${'periodes'.padEnd(9)} ${'recap moy'.padEnd(10)} ${'% a zero'.padEnd(9)} ${'% >=2'.padEnd(7)} ${'tete'.padEnd(8)} densite\n`,
  );
  for (const r of results) {
    process.stdout.write(
      `  ${r.arm.padEnd(5)} ${`${r.outputsWithPeriod}/${r.n}`.padEnd(9)} ${String(r.recapMean).padEnd(10)} ` +
        `${`${r.pctZeroRecap}%`.padEnd(9)} ${`${r.pctTwoPlusRecap}%`.padEnd(7)} ${String(r.headRepeatRate).padEnd(8)} ` +
        `${(r.density * 100).toFixed(2)}%\n`,
    );
  }
  process.stdout.write('\n  PUBLIE (1384 periodes) : recap moy 0.01 · 99.2 % a zero · 0.0 % avec >=2\n');
}

main().catch((e: unknown) => {
  process.stderr.write(`[N8] ECHEC : ${String(e)}\n`);
  process.exitCode = 1;
});
