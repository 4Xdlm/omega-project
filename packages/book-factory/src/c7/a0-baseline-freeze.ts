/**
 * OMEGA — A0 BASELINE_FREEZE (ratifié Architecte 2026-08-02, amendement ChatGPT §5).
 *
 * Gèle la référence AVANT toute modification du moteur. Sans ce gel, aucun gain futur
 * n'est attribuable : la chaîne officielle n'est PAS seedée, donc un « mieux » observé
 * pourrait n'être que l'aléa d'Ollama. On capture donc l'enveloppe de variabilité
 * naturelle : RUNS × CANDIDATES générations indépendantes sur la scène cible.
 *
 * Ne modifie AUCUN organe. Écrit uniquement dans runs/a0_baseline/.
 *
 *   cwd = packages/book-factory
 *   tsx src/c7/a0-baseline-freeze.ts
 *   A0_RUNS=3 A0_CANDIDATES=7 A0_MODEL=gemma4:31b tsx src/c7/a0-baseline-freeze.ts
 *
 * Sortie : runs/a0_baseline/{A0_MANIFEST.json, A0_MANIFEST.md, raw/*.json, candidates/*.md}
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { measureRepetition } from '../coherence/repetition-sensor.js';

const OUT = 'runs/a0_baseline';
const OLLAMA = process.env['OLLAMA_URL'] ?? 'http://localhost:11434';
const MODEL = process.env['A0_MODEL'] ?? 'gemma4:31b';
const RUNS = Number(process.env['A0_RUNS'] ?? '3');
const CANDIDATES = Number(process.env['A0_CANDIDATES'] ?? '7');

/** Paramètres de génération de la chaîne officielle — chapter-generator.ts:85-89 + gen-v4-all.ts:63.
 *  Volontairement recopiés ici en DUR : le gel doit figer ce qui était vrai le jour J,
 *  même si le code change ensuite. Toute divergence future est alors visible au diff. */
const FROZEN_GEN_PARAMS = {
  temperature: 0.88,
  top_p: 0.92,
  num_predict: 3200,
  seed: null as number | null, // ABSENT de la chaîne officielle — c'est le fait à graver
  top_k: null as number | null, // non transmis
  repeat_penalty: null as number | null, // non transmis
  stop: null as string[] | null, // non transmis
  think: false,
  stream: false,
} as const;

/** Scène cible de la tranche verticale : retombée réflexive (fn dramatique = TRANSITION, cf. P1). */
const SYSTEM_PROMPT =
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

const USER_PROMPT =
  `${FAMILY}\n\nÉCRIS un chapitre d'environ 1200 mots (développe) : ${BRIEF}\n\n` +
  `Écris UNIQUEMENT la prose du chapitre.`;

const TARGET_WORDS = 1200;

interface OllamaChatResponse {
  readonly message?: { readonly content?: string };
  readonly total_duration?: number;
  readonly eval_count?: number;
  readonly prompt_eval_count?: number;
}

interface CandidateRecord {
  readonly run: number;
  readonly candidate: number;
  readonly words: number;
  readonly sentences: number;
  readonly ticDensity: number;
  readonly meanSentenceWords: number;
  readonly maxSentenceWords: number;
  readonly apostropheTypographic: number;
  readonly apostropheStraight: number;
  readonly ms: number;
  readonly evalCount: number | null;
  readonly sha256: string;
  readonly error: string | null;
}

function sha256(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

function fileSha(path: string): string {
  try {
    return sha256(readFileSync(path, 'utf8'));
  } catch {
    return 'MISSING';
  }
}

function countWords(s: string): number {
  return s.split(/\s+/u).filter((w) => w.length > 0).length;
}

/** Découpage local minimal — le splitter canonique vit dans omega-p0 et n'est pas
 *  importable ici sans build ; A0 ne doit dépendre d'aucune brique en cours d'audit. */
function sentenceLengths(text: string): number[] {
  const out: number[] = [];
  const parts = text.split(/(?<=[.!?…])\s+(?=[«"'(\p{Lu}\d])/u);
  for (const p of parts) {
    const w = countWords(p);
    if (w > 0) out.push(w);
  }
  return out;
}

function shell(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf8', timeout: 20000 }).trim();
  } catch (e) {
    return `ERROR: ${String(e)}`;
  }
}

async function fetchJson(url: string, body?: unknown): Promise<unknown> {
  const init: RequestInit =
    body === undefined
      ? { method: 'GET' }
      : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return (await res.json()) as unknown;
}

async function generate(): Promise<{ text: string; ms: number; raw: unknown }> {
  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: USER_PROMPT },
    ],
    stream: FROZEN_GEN_PARAMS.stream,
    think: FROZEN_GEN_PARAMS.think,
    options: {
      temperature: FROZEN_GEN_PARAMS.temperature,
      top_p: FROZEN_GEN_PARAMS.top_p,
      num_predict: FROZEN_GEN_PARAMS.num_predict,
      // seed volontairement ABSENT : on reproduit la chaîne officielle telle qu'elle est
    },
  };
  const t0 = Date.now();
  const raw = await fetchJson(`${OLLAMA}/api/chat`, body);
  const ms = Date.now() - t0;
  const parsed = raw as OllamaChatResponse;
  const text = (parsed.message?.content ?? '').replace(/<think>[\s\S]*?<\/think>/gu, '').trim();
  return { text, ms, raw };
}

function measure(run: number, candidate: number, text: string, ms: number, raw: unknown): CandidateRecord {
  const words = countWords(text);
  const lens = sentenceLengths(text);
  const rep = measureRepetition(text);
  const ticTotal = rep.families.reduce((a, f) => a + f.total, 0);
  const parsed = raw as OllamaChatResponse;
  return {
    run,
    candidate,
    words,
    sentences: lens.length,
    ticDensity: words > 0 ? Number(((ticTotal / words) * 1000).toFixed(2)) : 0,
    meanSentenceWords: lens.length > 0 ? Number((words / lens.length).toFixed(2)) : 0,
    maxSentenceWords: lens.length > 0 ? Math.max(...lens) : 0,
    apostropheTypographic: (text.match(/’/gu) ?? []).length,
    apostropheStraight: (text.match(/'/gu) ?? []).length,
    ms,
    evalCount: parsed.eval_count ?? null,
    sha256: sha256(text),
    error: null,
  };
}

function stats(xs: number[]): { min: number; max: number; mean: number; stdev: number } {
  if (xs.length === 0) return { min: 0, max: 0, mean: 0, stdev: 0 };
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length;
  return {
    min: Math.min(...xs),
    max: Math.max(...xs),
    mean: Number(mean.toFixed(2)),
    stdev: Number(Math.sqrt(variance).toFixed(2)),
  };
}

async function main(): Promise<void> {
  mkdirSync(`${OUT}/raw`, { recursive: true });
  mkdirSync(`${OUT}/candidates`, { recursive: true });

  // ---- 1. Environnement -----------------------------------------------------
  let ollamaVersion = 'UNAVAILABLE';
  let modelDigest = 'UNAVAILABLE';
  let modelDetails: unknown = null;
  try {
    const v = (await fetchJson(`${OLLAMA}/api/version`)) as { version?: string };
    ollamaVersion = v.version ?? 'UNKNOWN';
  } catch (e) {
    ollamaVersion = `ERROR: ${String(e)}`;
  }
  try {
    const show = (await fetchJson(`${OLLAMA}/api/show`, { model: MODEL })) as {
      details?: unknown;
      model_info?: Record<string, unknown>;
    };
    modelDetails = show.details ?? null;
    const tags = (await fetchJson(`${OLLAMA}/api/tags`)) as {
      models?: Array<{ name?: string; digest?: string; size?: number }>;
    };
    const hit = (tags.models ?? []).find((m) => m.name === MODEL);
    modelDigest = hit?.digest ?? 'NOT_FOUND_IN_TAGS';
  } catch (e) {
    modelDigest = `ERROR: ${String(e)}`;
  }

  const env = {
    timestampUtc: new Date().toISOString(),
    os: `${process.platform} ${process.arch}`,
    node: process.version,
    ollamaVersion,
    model: MODEL,
    modelDigest,
    modelDetails,
    gitHead: shell('git rev-parse HEAD'),
    gitBranch: shell('git rev-parse --abbrev-ref HEAD'),
    gitStatusPorcelain: shell('git status --porcelain').split('\n').filter((l) => l.length > 0),
    gitDescribe: shell('git describe --tags --always'),
  };

  // ---- 2. Hashes des artefacts gelés ----------------------------------------
  const artifacts: Record<string, string> = {};
  for (const p of [
    'src/chapter-generator.ts',
    'src/rosetta/dramatic-grid.ts',
    'src/c7/c7-runner.ts',
    'src/c7/gen-v4-all.ts',
    'src/v2/v2-conductor.ts',
    'src/doctor/scribe-bridge.ts',
    'src/doctor/semantic-gate.ts',
    'src/doctor/lang-purity.ts',
    'src/coherence/repetition-sensor.ts',
    'src/loop/r6-core.ts',
    'runs/next_book/PLAN_LOCK.json',
    'runs/next_book/DIRECTIVE_PACKS.json',
    'runs/atlas/FR_THRILLER_RHYTHM.json',
    'runs/atlas/DESCRIPTION_DENSITY.json',
    'runs/atlas/MANUSCRIT_V4_COH7.md',
  ]) {
    artifacts[p] = fileSha(p);
  }

  const prompts = {
    systemPromptSha256: sha256(SYSTEM_PROMPT),
    userPromptSha256: sha256(USER_PROMPT),
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: USER_PROMPT,
    targetWords: TARGET_WORDS,
  };

  // ---- 3. Sortie témoin : RUNS × CANDIDATES ---------------------------------
  const records: CandidateRecord[] = [];
  for (let run = 1; run <= RUNS; run += 1) {
    for (let c = 1; c <= CANDIDATES; c += 1) {
      const tag = `r${run}_c${c}`;
      process.stdout.write(`[A0] ${tag} … `);
      try {
        const { text, ms, raw } = await generate();
        writeFileSync(`${OUT}/candidates/${tag}.md`, text, 'utf8');
        writeFileSync(`${OUT}/raw/${tag}.json`, JSON.stringify(raw, null, 2), 'utf8');
        const rec = measure(run, c, text, ms, raw);
        records.push(rec);
        process.stdout.write(`${rec.words}w ${(ms / 1000).toFixed(0)}s\n`);
      } catch (e) {
        records.push({
          run,
          candidate: c,
          words: 0,
          sentences: 0,
          ticDensity: 0,
          meanSentenceWords: 0,
          maxSentenceWords: 0,
          apostropheTypographic: 0,
          apostropheStraight: 0,
          ms: 0,
          evalCount: null,
          sha256: '',
          error: String(e),
        });
        process.stdout.write(`ERREUR ${String(e)}\n`);
      }
    }
  }

  const ok = records.filter((r) => r.error === null && r.words > 0);
  // Le sélecteur de production, reproduit à l'identique : le plus long (r6-core.ts:187 / gen-v4-all.ts:89).
  const winners = [];
  for (let run = 1; run <= RUNS; run += 1) {
    const pool = ok.filter((r) => r.run === run).sort((a, b) => b.words - a.words);
    if (pool[0] !== undefined) winners.push(pool[0]);
  }

  const envelope = {
    n: ok.length,
    failures: records.length - ok.length,
    words: stats(ok.map((r) => r.words)),
    ticDensity: stats(ok.map((r) => r.ticDensity)),
    meanSentenceWords: stats(ok.map((r) => r.meanSentenceWords)),
    maxSentenceWords: stats(ok.map((r) => r.maxSentenceWords)),
    winnerWords: stats(winners.map((r) => r.words)),
    distinctOutputs: new Set(ok.map((r) => r.sha256)).size,
  };

  const manifest = {
    spec: 'A0_BASELINE_FREEZE',
    ratifiedBy: 'Francky (Architecte) 2026-08-02',
    doctrine: ['EMP-11 PRE_SEAL', 'EMP-14 gate BASELINE', 'EMP-19 couple modèle+prompt+température'],
    seedPolicyObserved: 'ABSENT du chemin officiel (chapter-generator.ts:85-89). Variabilité mesurée, non éliminée.',
    env,
    frozenGenParams: FROZEN_GEN_PARAMS,
    prompts,
    artifacts,
    runs: RUNS,
    candidatesPerRun: CANDIDATES,
    records,
    winners,
    envelope,
  };

  writeFileSync(`${OUT}/A0_MANIFEST.json`, JSON.stringify(manifest, null, 2), 'utf8');

  const md = [
    '# A0 — BASELINE_FREEZE',
    '',
    `**Gelé le** : ${env.timestampUtc}`,
    `**HEAD** : \`${env.gitHead}\` (${env.gitBranch}) · working tree : ${env.gitStatusPorcelain.length} entrée(s)`,
    `**Modèle** : ${MODEL} · digest \`${modelDigest}\` · Ollama ${ollamaVersion} · Node ${env.node} · ${env.os}`,
    `**Seed** : ${FROZEN_GEN_PARAMS.seed === null ? '**ABSENTE** de la chaîne officielle' : String(FROZEN_GEN_PARAMS.seed)}`,
    '',
    '## Enveloppe de variabilité naturelle',
    '',
    `${RUNS} runs × ${CANDIDATES} candidats = ${records.length} générations · ${envelope.failures} échec(s) · ${envelope.distinctOutputs} sorties distinctes sur ${envelope.n}`,
    '',
    '| Mesure | min | max | moyenne | écart-type |',
    '|---|---|---|---|---|',
    `| mots | ${envelope.words.min} | ${envelope.words.max} | ${envelope.words.mean} | ${envelope.words.stdev} |`,
    `| densité de tics /1000 | ${envelope.ticDensity.min} | ${envelope.ticDensity.max} | ${envelope.ticDensity.mean} | ${envelope.ticDensity.stdev} |`,
    `| longueur moyenne de phrase | ${envelope.meanSentenceWords.min} | ${envelope.meanSentenceWords.max} | ${envelope.meanSentenceWords.mean} | ${envelope.meanSentenceWords.stdev} |`,
    `| phrase la plus longue | ${envelope.maxSentenceWords.min} | ${envelope.maxSentenceWords.max} | ${envelope.maxSentenceWords.mean} | ${envelope.maxSentenceWords.stdev} |`,
    `| mots du gagnant (sélecteur prod) | ${envelope.winnerWords.min} | ${envelope.winnerWords.max} | ${envelope.winnerWords.mean} | ${envelope.winnerWords.stdev} |`,
    '',
    '**Règle d\'attribution** : tout gain futur revendiqué sur la tranche verticale devra sortir de cette enveloppe.',
    'Un delta inférieur à l\'écart-type ci-dessus n\'est pas un gain, c\'est du bruit Ollama.',
    '',
    '## Artefacts gelés (SHA256)',
    '',
    '| Fichier | SHA256 |',
    '|---|---|',
    ...Object.entries(artifacts).map(([k, v]) => `| \`${k}\` | \`${v.slice(0, 32)}…\` |`),
    '',
    '## Prompts gelés',
    '',
    `- système : \`${prompts.systemPromptSha256.slice(0, 32)}…\``,
    `- utilisateur : \`${prompts.userPromptSha256.slice(0, 32)}…\``,
    '',
    'Texte intégral dans `A0_MANIFEST.json`.',
    '',
  ].join('\n');
  writeFileSync(`${OUT}/A0_MANIFEST.md`, md, 'utf8');

  process.stdout.write(`\n[A0] GEL ÉCRIT → ${OUT}/A0_MANIFEST.{json,md}\n`);
  process.stdout.write(
    `[A0] enveloppe mots : ${envelope.words.mean} ± ${envelope.words.stdev} · ` +
      `phrase max : ${envelope.maxSentenceWords.mean} ± ${envelope.maxSentenceWords.stdev}\n`,
  );
  if (!existsSync(`${OUT}/A0_MANIFEST.json`)) throw new Error('A0: manifeste non écrit');
}

main().catch((e: unknown) => {
  process.stderr.write(`[A0] ÉCHEC : ${String(e)}\n`);
  process.exitCode = 1;
});
