/**
 * OMEGA — CP1 Étape 1 : GÉNÉRATION DU CANDIDATE PACK.
 * Protocole : runs/cp_pack/CP1_PROTOCOL_PREREGISTERED.md (gelé 2026-08-03).
 *
 * CE QUE CE RUN EST : la SEULE dépense de génération de la campagne CP-1.
 * 10 scènes × 7 candidats × 1 tentative = 70 candidats BRUTS, tous gelés
 * (packSink), y compris les mauvais — le rejeu contrefactuel a besoin des
 * refusés autant que des admis.
 *
 * CE QUE CE RUN N'EST PAS : un bench. Aucune hypothèse ici — les gates sont
 * dans le protocole et se jugent au REJEU (étapes 2-4), pas à la génération.
 *
 * SCÈNES : copie EXACTE de N9 (src/c7/n9-scribe-e2e-book.ts). La duplication
 * est un GEL volontaire : le protocole exige ces scènes-là, même si N9 évolue.
 * La chaîne de continuité (previousTail) suit le candidat CHOISI par le gate
 * actuel — c'est la production réelle, les sélecteurs alternatifs rejoueront
 * chapitre par chapitre sur le même contexte.
 *
 *   cwd = packages/book-factory
 *   npx tsx src/c7/cp1-generate-pack.ts
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { OllamaScribeV2Generator } from '../scribe/ollama-scribe-v2.js';
import { jsonlFileSink, type FrozenCandidate } from '../scribe/candidate-pack.js';
import type { GenRequest } from '../chapter-generator.js';
import type { ChapterSpec } from '../book-planner.js';
import type { ChapterIntent } from '../chapter-spec-to-intent.js';
import { createHash } from 'node:crypto';

const OUT = 'runs/cp_pack';
const PACK_ID = 'CP1';
const MODEL = process.env['CP1_MODEL'] ?? 'gemma4:31b';
const CANDIDATES = Number(process.env['CP1_CANDIDATES'] ?? '7');
const BASE_SEED = Number(process.env['CP1_SEED'] ?? '20260803');

const FAMILY =
  "PERSONNAGES : Garcia (inspecteur). Léna Marchetti (du village, tiraillée). " +
  "Yvon Squarcioni (maire-patriarche, cerveau du meurtre). Gaspard (vieux du port, peureux). " +
  "Dubois = gardien de phare ASSASSINÉ (maître-chanteur). Marc = revenant cru mort dans le naufrage. " +
  "LIEU : Ker-Morvan, Bretagne. Naufrage du Triton (1998) = montage : cargaison détournée, " +
  "butin partagé, silence acheté.";

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
  const frozen: FrozenCandidate[] = [];
  const fileSink = jsonlFileSink(OUT);
  const gen = new OllamaScribeV2Generator({
    model: MODEL,
    candidates: CANDIDATES,
    maxAttempts: 1, // pas de régénération : on veut les bruts, y compris les mauvais
    timeoutMs: 300000,
    packId: PACK_ID,
    packSink: (c) => {
      frozen.push(c);
      fileSink(c);
    },
  });

  for (const [i, sc] of SCENES.entries()) {
    if (sc.opportunity) {
      gen.declareScene({ chapterIndex: i + 1, longTailOpportunity: true, antiTemplateGuards: true });
    }
  }

  process.stdout.write(`CP1 pack — ${MODEL}, ${CANDIDATES} candidats × ${SCENES.length} scènes\n`);
  let previous = '';
  for (let i = 0; i < SCENES.length; i += 1) {
    const req: GenRequest = {
      intent: intent(i),
      digest: FAMILY,
      spec: spec(i),
      seed: BASE_SEED + i * 100,
      ...(previous.length > 0 ? { previousTail: tail(previous, 60) } : {}),
    };
    const t0 = Date.now();
    const r = await gen.generate(req);
    previous = r.prose;
    writeFileSync(`${OUT}/CP1_chosen_ch${String(i + 1).padStart(2, '0')}.md`, r.prose, 'utf8');
    const nCh = frozen.filter((c) => c.chapterIndex === i + 1).length;
    process.stdout.write(
      `  ch${String(i + 1).padStart(2, '0')} ${SCENES[i]?.opportunity === true ? 'OPP' : '   '} ` +
        `geles=${String(nCh)}  choisi=${String(r.words)}w  ${((Date.now() - t0) / 1000).toFixed(0)}s\n`,
    );
  }

  // Scellement : manifest avec le hash de CHAQUE candidat + hash du fichier pack.
  const packRaw = readFileSync(`${OUT}/${PACK_ID}.jsonl`, 'utf8');
  const manifest = {
    spec: 'CP1_CANDIDATE_PACK',
    protocol: 'CP1_PROTOCOL_PREREGISTERED.md',
    date: new Date().toISOString(),
    model: MODEL,
    baseSeed: BASE_SEED,
    candidatesPerScene: CANDIDATES,
    scenes: SCENES.length,
    frozenTotal: frozen.length,
    packSha256: createHash('sha256').update(packRaw, 'utf8').digest('hex'),
    candidates: frozen.map((c) => ({
      ch: c.chapterIndex,
      i: c.candidateIndex,
      sha256: c.sha256,
      words: c.words,
      seed: c.seed,
    })),
  };
  writeFileSync(`${OUT}/CP1_MANIFEST.json`, JSON.stringify(manifest, null, 1), 'utf8');
  process.stdout.write(
    `SCELLE — ${String(frozen.length)} candidats, pack sha256=${manifest.packSha256.slice(0, 16)}…\n`,
  );
}

main().catch((e: unknown) => {
  process.stderr.write(`CP1 FAIL: ${String(e)}\n`);
  process.exit(1);
});
