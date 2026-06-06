/**
 * OMEGA Book-Factory — C7 RUNNER (script BF-08) — bench R6 réel + livre complet.
 * Modes (env C7_MODE) : 'bench' = 3 chapitres, R6-Lite N=3 + baseline directe,
 * comparaison MÉCANIQUE (gates/violations/repeat — le juge LLM calibré est BLOQUÉ :
 * gemma4:31b désinstallé, constat 2026-06-06, cf. NCR_GEMMA4_ABSENT) ;
 * 'book' = 30 chapitres, R6-Core N=7, crash-safe (sortie incrémentale par chapitre).
 * Générateur : env C7_MODEL (défaut qwen3.5:35b-a3b — génération ≠ jugement : l'admission
 * est 100% CALC, aucun couple de calibration requis côté générateur ; aucune coupling Rosetta).
 *
 * Monde : « Le Silence du Phare » (intent P2) — registre C1 (mint par NONCE), packs C2,
 * verrous de rôle/lieu, Bible plan-driven (deltas du plan, approche P2 prouvée).
 */

import { planBook } from '../book-planner.js';
import type { BookIntent, BookPlan, ChapterSpec } from '../book-planner.js';
import { chapterSpecToIntent } from '../chapter-spec-to-intent.js';
import { buildContextDigest } from '../context-manager.js';
import { OllamaChapterGenerator } from '../chapter-generator.js';
import type { GenRequest } from '../chapter-generator.js';
import { projectStoryState, StoryStateLog } from '../story-state.js';
import type { NarrativeEvent } from '../story-state.js';
import { CharacterRegistry, buildMintEvents } from '../identity/character-registry.js';
import type { CharacterId, IdentityDeterminism, Seed } from '../identity/identity-types.js';
import { asAliasSurface, asChapterRef, asConfidence01 } from '../identity/identity-types.js';
import { buildRecallPack, estimateTokens } from '../recall/recall-pack.js';
import type { DriftRule, Librarians, RecallPack } from '../recall/recall-types.js';
import type { PassContext } from '../extraction/extraction-types.js';
import { runLiteChapter } from '../loop/r6-lite.js';
import type { LiteDeps } from '../loop/r6-lite.js';
import { runCoreChapterFull } from '../loop/r6-core.js';
import type { CoreDeps } from '../loop/r6-core.js';
import { persistLiteResult, MemFs } from '../loop/persistence.js';
import { NodeFs, appendLine } from './node-fs.js';

/* ───────────────────────────── monde « Le Silence du Phare » ─────────────────────── */
const BOOK: BookIntent = {
  title: 'Le Silence du Phare',
  premise: "Léna Marchetti, enquêtrice, revient à Ker-Morvan élucider la mort du gardien de phare.",
  genre: 'polar',
  core_question: 'Qui a tué le gardien, et pourquoi le village se tait-il ?',
  protagonist: { id: 'lena', name: 'Léna Marchetti', role: 'enquêtrice' },
  cast: [
    { id: 'gaspard', name: 'Gaspard', role: 'gardien de phare (victime)' },
    { id: 'le_maire', name: 'Yvon Squarcioni', role: 'maire' },
    { id: 'garcia', name: 'Garcia', role: 'notaire' },
  ],
  setting: 'Ker-Morvan, village breton, novembre',
  tone: 'sobre, tendu, sensoriel',
  target_word_count: 18_000, // run C7 : volume PILOTE (plafond BB-02 ≈ 550 w/chap constaté P2)
  target_chapters: 30,
  pov: 'third_limited',
  tense: 'past',
  seeds: [
    { seed_id: 'seed-lettre', desc: 'une lettre cachée dans le phare' },
    { seed_id: 'seed-dette', desc: 'une dette que le maire veut enterrer' },
    { seed_id: 'seed-naufrage', desc: 'le naufrage jamais élucidé de 1998' },
    { seed_id: 'seed-identite', desc: "la véritable identité de l'homme du môle" },
  ],
};

const DET: IdentityDeterminism = { mintSeed: 'C7-PHARE-2026-06-06' as Seed };

function surf(s: string) {
  const r = asAliasSurface(s);
  if (!r.ok) throw new Error(`surface invalide ${s}`);
  return r.value;
}
function conf(n: number) {
  const r = asConfidence01(n);
  if (!r.ok) throw new Error(`conf invalide ${n}`);
  return r.value;
}

interface World {
  readonly registry: CharacterRegistry;
  readonly ids: ReadonlyMap<string, CharacterId>; // brief.id → CharacterId
  readonly surfaces: ReadonlySet<string>;
}

function buildWorld(): World {
  let reg = CharacterRegistry.empty(DET);
  const ids = new Map<string, CharacterId>();
  const surfaces = new Set<string>();
  const briefs = [BOOK.protagonist, ...BOOK.cast];
  briefs.forEach((b, i) => {
    const events = buildMintEvents(
      DET,
      { nonce: b.id as never, displayName: b.name, introducedAt: asChapterRef(1), createdBy: 'planner', evidence: `E-mint-${b.id}` as never },
      surf(b.name),
      conf(1),
      i * 2,
    );
    for (const e of events) {
      const r = reg.apply(e);
      if (!r.ok) throw new Error(`mint ${b.id}: ${r.error.code}`);
      reg = r.value;
      if (e.kind === 'ALIAS') ids.set(b.id, e.alias.characterId);
    }
    surfaces.add(b.name.normalize('NFC').toLowerCase());
  });
  return { registry: reg, ids, surfaces };
}

/** Deltas plan-driven (approche P2 prouvée) : la Bible avance par le PLAN, la prose est jugée. */
function plannedDelta(plan: BookPlan, c: number, spec: ChapterSpec): NarrativeEvent[] {
  const ev: NarrativeEvent[] = [];
  if (c === 1) {
    ev.push({ kind: 'CHARACTER_INTRODUCE', chapter: 1, id: 'lena', name: BOOK.protagonist.name });
    for (const m of BOOK.cast) ev.push({ kind: 'CHARACTER_INTRODUCE', chapter: 1, id: m.id, name: m.name });
    ev.push({ kind: 'CHARACTER_MOVE', chapter: 1, id: 'lena', location: 'Ker-Morvan' });
    ev.push({ kind: 'THREAD_OPEN', chapter: 1, id: 'th-mort', question: 'Qui a tué le gardien ?' });
  }
  for (const s of spec.seeds_to_plant) {
    const brief = BOOK.seeds?.find((x) => x.seed_id === s);
    ev.push({ kind: 'SEED_PLANT', chapter: c, seed_id: s, desc: brief?.desc ?? s, bloom_target_chapter: plan.seed_schedule.find((e) => e.seed_id === s)?.bloom_target_chapter ?? c + 5 });
  }
  for (const s of spec.seeds_to_reinforce) ev.push({ kind: 'SEED_REINFORCE', chapter: c, seed_id: s });
  for (const s of spec.seeds_to_bloom) ev.push({ kind: 'SEED_BLOOM', chapter: c, seed_id: s });
  ev.push({ kind: 'TIMELINE', chapter: c, event: spec.objective });
  return ev;
}

function chapterDeps(world: World, log: StoryStateLog, spec: ChapterSpec) {
  const story = log.project();
  const lib: Librarians = {
    registry: world.registry,
    story,
    storyIdOf: (id) => [...world.ids.entries()].find(([, v]) => v === id)?.[0] ?? String(id),
    driftRulesOf: (id) => (id === world.ids.get('lena') ? ([{ field: 'role', expected: 'enquêtrice' }] as readonly DriftRule[]) : []),
  };
  const packs: RecallPack[] = [];
  for (const [, cid] of world.ids) {
    const p = buildRecallPack(cid, asChapterRef(spec.index), lib, estimateTokens(700));
    if (p.ok) packs.push(p.value);
  }
  const pctx: PassContext = {
    chapter: spec.index,
    registry: world.registry,
    knownSurfaces: world.surfaces,
    maxSurfaceWords: 3,
    seedLexicon: new Map((BOOK.seeds ?? []).map((s) => [s.seed_id, s.desc.split(/\s+/u).filter((w) => w.length > 5)])),
    storyIdOf: (id) => [...world.ids.entries()].find(([, v]) => v === id)?.[0] ?? String(id),
  };
  const locks = new Map<string, readonly DriftRule[]>([['lena', [{ field: 'role', expected: 'enquêtrice' }]]]);
  return { story, packs, pctx, locks };
}

/* ─────────────────────────────────── modes ───────────────────────────────────────── */
async function main(): Promise<void> {
  const mode = process.env['C7_MODE'] ?? 'bench';
  const model = process.env['C7_MODEL'] ?? 'qwen3.5:35b-a3b';
  const outRoot = process.env['C7_OUT'] ?? `runs/c7_${mode}`;
  const maxCh = Number(process.env['C7_MAX_CH'] ?? (mode === 'bench' ? 3 : 30));
  const fs = new NodeFs();
  fs.mkdirp(outRoot);
  const progress = `${outRoot}/progress.log`;
  appendLine(progress, `[${new Date().toISOString()}] start mode=${mode} model=${model} maxCh=${maxCh}`);

  const world = buildWorld();
  const plan = planBook(BOOK);
  const log = new StoryStateLog();
  const generator = new OllamaChapterGenerator({ model, maxTokens: 900, timeoutMs: 180_000 });

  for (const spec of plan.chapters.slice(0, maxCh)) {
    const { packs, pctx, locks } = chapterDeps(world, log, spec);
    const digest = buildContextDigest(log.project(), spec, plan, BOOK);
    const base: GenRequest = { intent: chapterSpecToIntent(spec, BOOK), digest, spec };
    const resolution = { chapter: asChapterRef(spec.index) };
    const common = {
      registry: world.registry,
      knownSurfaces: world.surfaces,
      maxSurfaceWords: 3,
      packs,
      locksByStoryId: locks,
      passContext: pctx,
      resolution,
    };

    if (mode === 'bench') {
      // baseline DIRECTE (sans R6) puis R6-Lite N=3 — comparaison mécanique persistée
      const direct = await generator.generate(base);
      const lite = await runLiteChapter(spec, base, { ...common, generator } as LiteDeps);
      const mem = new MemFs();
      persistLiteResult(`${outRoot}/lite`, lite, mem);
      for (const [p, c] of mem.files) {
        fs.mkdirp(p.slice(0, p.lastIndexOf('/')));
        fs.writeFile(p, c);
      }
      fs.writeFile(`${outRoot}/chap_${spec.index}_direct.txt`, direct.prose);
      const winner = lite.candidates.find((c) => lite.winner.kind === 'WINNER' && c.profile === lite.winner.profile);
      appendLine(progress, `[bench ch.${spec.index}] direct_words=${direct.words} winner=${JSON.stringify(lite.winner)} eligible=${lite.candidates.filter((c) => c.eligible).length}/3 winner_words=${winner?.words ?? 0}`);
    } else {
      const { record, full } = await runCoreChapterFull(spec, base, {
        ...common,
        generator,
        realState: log.project(),
        weekdayByChapter: new Map(),
        mode: 'BOOST',
      } as CoreDeps);
      const dir = `${outRoot}/chap_${String(spec.index).padStart(3, '0')}`;
      fs.mkdirp(dir);
      fs.writeFile(`${dir}/admission.json`, JSON.stringify(record, null, 2));
      for (const c of full) fs.writeFile(`${dir}/candidate_${c.profile}.txt`, c.prose); // FORBID-007
      const win = record.winner.kind === 'WINNER' ? record.winner.profile : record.winner.bestUnderGates;
      const winnerProse = full.find((c) => c.profile === win)?.prose ?? '';
      appendLine(`${outRoot}/MANUSCRIT.md`, `\n\n## Chapitre ${spec.index} — ${spec.objective} [${win}${record.winner.kind === 'WINNER' ? '' : ' ; FLAGGED'}]\n\n${winnerProse}`);
      appendLine(progress, `[book ch.${spec.index}] winner=${win}${record.winner.kind === 'WINNER' ? '' : ' (FLAGGED)'} eligible=${record.candidates.filter((c) => c.eligible).length}/7 hash=${String(record.admissionHash).slice(0, 12)}`);
    }
    log.appendAll(plannedDelta(plan, spec.index, spec));
  }
  appendLine(progress, `[${new Date().toISOString()}] done.`);
}

main().catch((e: unknown) => {
  appendLine(process.env['C7_OUT'] ? `${process.env['C7_OUT']}/progress.log` : 'runs/c7_err.log', `FATAL: ${String(e)}`);
  process.exitCode = 1;
});
