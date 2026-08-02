/**
 * OMEGA — A3 : vérification de la conformité moteur.
 *
 * Deux preuves distinctes, dans cet ordre :
 *
 *   PARTIE 1 — DÉTERMINISME DU SEED, via l'organe RÉEL (OllamaChapterGenerator).
 *   Avant A3, le chemin officiel ne transmettait aucun seed, et le « seed » de
 *   sovereign était injecté en TEXTE dans le system prompt : déterminisme
 *   apparent, jamais réel. On génère deux fois avec le MÊME seed, puis une fois
 *   avec un seed différent. Attendu : identité stricte sur la paire, divergence
 *   sur le troisième. C'est falsifiable — si le seed n'était pas transmis, les
 *   trois différeraient.
 *
 *   PARTIE 2 — RE-GEL 3×7 comparable à A0. Même prompt, même scène, même modèle
 *   qu'A0 : seuls les seeds changent (gelés). L'enveloppe obtenue se compare
 *   directement à celle d'A0 (mots 1084,3 ± 57,4 · tics 8,83 ± 1,63 · phrase
 *   max 34,9 ± 3,68). C'est ce second gel qui rendra attribuable tout delta futur.
 *
 *   cwd = packages/book-factory
 *   tsx src/c7/a3-conformity-verify.ts
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { OllamaChapterGenerator, type GenRequest } from '../chapter-generator.js';
import type { ChapterSpec } from '../book-planner.js';
import type { ChapterIntent } from '../chapter-spec-to-intent.js';
import { measureRepetition } from '../coherence/repetition-sensor.js';

const OUT = 'runs/a3_conformity';
const MODEL = process.env['A3_MODEL'] ?? 'gemma4:31b';
const SEEDS = [7, 42, 123, 2024, 31337, 8191, 65521] as const;
const RUN_SEED_OFFSET = [0, 1000, 2000] as const;

/** Scène identique à A0 (retombée réflexive) — condition de comparabilité. */
const SYSTEM_A0 =
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
const USER_A0 =
  `${FAMILY}\n\nÉCRIS un chapitre d'environ 1200 mots (développe) : ${BRIEF}\n\n` +
  `Écris UNIQUEMENT la prose du chapitre.`;

function sha(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}
function nwords(s: string): number {
  return s.split(/\s+/u).filter((w) => w.length > 0).length;
}
function sentenceLengths(t: string): readonly number[] {
  return t
    .split(/(?<=[.!?…])\s+(?=[«"'(\p{Lu}\d])/u)
    .map(nwords)
    .filter((n) => n > 0);
}
function stats(xs: readonly number[]): { min: number; max: number; mean: number; stdev: number } {
  if (xs.length === 0) return { min: 0, max: 0, mean: 0, stdev: 0 };
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const v = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length;
  return {
    min: Math.min(...xs),
    max: Math.max(...xs),
    mean: Number(mean.toFixed(2)),
    stdev: Number(Math.sqrt(v).toFixed(2)),
  };
}

async function rawGenerate(seed: number | undefined): Promise<string> {
  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_A0 },
      { role: 'user', content: USER_A0 },
    ],
    stream: false,
    think: false,
    options: {
      temperature: 0.88,
      top_p: 0.92,
      num_predict: 3200,
      ...(seed !== undefined ? { seed } : {}),
    },
  };
  const res = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}`);
  const data = (await res.json()) as { message?: { content?: string } };
  return (data.message?.content ?? '').replace(/<think>[\s\S]*?<\/think>/gu, '').trim();
}

/** Spec/intent minimaux pour exercer l'organe RÉEL de production. */
const SPEC: ChapterSpec = {
  index: 12,
  act: 2,
  objective: BRIEF,
  tension_target: 0.6,
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
const INTENT: ChapterIntent = {
  title: 'Retombee reflexive',
  premise: BRIEF,
  themes: ['culpabilite', 'devoir'],
  core_emotion: 'accablement lucide',
  target_audience: 'lecteurs de polar litteraire',
  message: 'Ce qu on apprend oblige.',
  target_word_count: 1200,
};

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });

  // ── PARTIE 1 — déterminisme du seed via l'organe réel ──────────────────────
  const gen = new OllamaChapterGenerator({ model: MODEL, maxTokens: 1400, timeoutMs: 300000 });
  const base: GenRequest = {
    intent: INTENT,
    digest: FAMILY,
    spec: SPEC,
    directives: 'Une phrase au moins doit dépasser cinquante mots, si la réflexion le porte.',
  };
  process.stdout.write('[A3] partie 1 — determinisme du seed (organe reel)\n');
  const a = await gen.generate({ ...base, seed: 4242 });
  process.stdout.write(`     seed 4242 (1) : ${a.words}w ${sha(a.prose).slice(0, 12)}\n`);
  const b = await gen.generate({ ...base, seed: 4242 });
  process.stdout.write(`     seed 4242 (2) : ${b.words}w ${sha(b.prose).slice(0, 12)}\n`);
  const c = await gen.generate({ ...base, seed: 9999 });
  process.stdout.write(`     seed 9999     : ${c.words}w ${sha(c.prose).slice(0, 12)}\n`);
  const identical = a.prose === b.prose;
  const differs = a.prose !== c.prose;
  const determinism = identical && differs;
  process.stdout.write(
    `     VERDICT : ${determinism ? 'DETERMINISME PROUVE' : 'ECHEC'} ` +
      `(meme seed identique=${String(identical)}, seed different diverge=${String(differs)})\n\n`,
  );
  writeFileSync(`${OUT}/determinism_s4242_1.md`, a.prose, 'utf8');
  writeFileSync(`${OUT}/determinism_s4242_2.md`, b.prose, 'utf8');
  writeFileSync(`${OUT}/determinism_s9999.md`, c.prose, 'utf8');

  // ── PARTIE 2 — re-gel 3×7, seeds gelés, prompt identique à A0 ─────────────
  process.stdout.write('[A3] partie 2 — re-gel 3x7 avec seeds geles (prompt A0 inchange)\n');
  const recs: Array<{
    run: number;
    seed: number;
    words: number;
    ticDensity: number;
    maxSentenceWords: number;
    sha256: string;
  }> = [];
  for (let run = 0; run < RUN_SEED_OFFSET.length; run += 1) {
    for (const s of SEEDS) {
      const seed = s + (RUN_SEED_OFFSET[run] ?? 0);
      const text = await rawGenerate(seed);
      const w = nwords(text);
      const rep = measureRepetition(text);
      const tic = w > 0 ? (rep.families.reduce((x, f) => x + f.total, 0) / w) * 1000 : 0;
      const lens = sentenceLengths(text);
      recs.push({
        run: run + 1,
        seed,
        words: w,
        ticDensity: Number(tic.toFixed(2)),
        maxSentenceWords: lens.length > 0 ? Math.max(...lens) : 0,
        sha256: sha(text),
      });
      writeFileSync(`${OUT}/r${run + 1}_s${seed}.md`, text, 'utf8');
      process.stdout.write(`     r${run + 1} seed ${String(seed).padStart(5)} : ${w}w tic=${tic.toFixed(2)}\n`);
    }
  }

  const env = {
    words: stats(recs.map((r) => r.words)),
    ticDensity: stats(recs.map((r) => r.ticDensity)),
    maxSentenceWords: stats(recs.map((r) => r.maxSentenceWords)),
    distinct: new Set(recs.map((r) => r.sha256)).size,
  };
  const A0 = {
    words: { mean: 1084.29, stdev: 57.39 },
    ticDensity: { mean: 8.83, stdev: 1.63 },
    maxSentenceWords: { mean: 34.9, stdev: 3.68 },
  };
  const manifest = {
    spec: 'A3_CONFORMITY_VERIFICATION',
    model: MODEL,
    determinism: { identicalOnSameSeed: identical, differsOnOtherSeed: differs, verdict: determinism },
    seedsUsed: recs.map((r) => r.seed),
    envelope: env,
    a0Reference: A0,
    deltas: {
      words: Number((env.words.mean - A0.words.mean).toFixed(2)),
      ticDensity: Number((env.ticDensity.mean - A0.ticDensity.mean).toFixed(2)),
      maxSentenceWords: Number((env.maxSentenceWords.mean - A0.maxSentenceWords.mean).toFixed(2)),
    },
    records: recs,
  };
  writeFileSync(`${OUT}/A3_MANIFEST.json`, JSON.stringify(manifest, null, 2), 'utf8');

  process.stdout.write('\n[A3] enveloppe A3 vs A0 (le delta doit rester DANS l ecart-type A0 :\n');
  process.stdout.write('     A3 ne touche pas la generation, seulement sa conformite)\n');
  process.stdout.write(
    `     mots        A3 ${env.words.mean} +/- ${env.words.stdev}  | A0 ${A0.words.mean} +/- ${A0.words.stdev}  | delta ${manifest.deltas.words}\n`,
  );
  process.stdout.write(
    `     tics/1000   A3 ${env.ticDensity.mean} +/- ${env.ticDensity.stdev}  | A0 ${A0.ticDensity.mean} +/- ${A0.ticDensity.stdev}  | delta ${manifest.deltas.ticDensity}\n`,
  );
  process.stdout.write(
    `     phrase max  A3 ${env.maxSentenceWords.mean} +/- ${env.maxSentenceWords.stdev}  | A0 ${A0.maxSentenceWords.mean} +/- ${A0.maxSentenceWords.stdev}  | delta ${manifest.deltas.maxSentenceWords}\n`,
  );
  process.stdout.write(`     sorties distinctes : ${env.distinct}/${recs.length}\n`);
  if (!determinism) process.exitCode = 1;
}

main().catch((e: unknown) => {
  process.stderr.write(`[A3] ECHEC : ${String(e)}\n`);
  process.exitCode = 1;
});
