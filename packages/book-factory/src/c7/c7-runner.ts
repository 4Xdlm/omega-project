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
import { readFileSync as rfsEmp16, writeFileSync as wfsEmp16 } from 'node:fs';
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
import { enforceRecallOrInvalid } from '../recall/recall-invariant.js';
import { runLiteChapter } from '../loop/r6-lite.js';
import type { LiteDeps } from '../loop/r6-lite.js';
import { runCoreChapterFull } from '../loop/r6-core.js';
import { extendChapter } from '../loop/chapter-extender.js';
import type { CoreDeps } from '../loop/r6-core.js';
import { persistLiteResult, MemFs } from '../loop/persistence.js';
import { NodeFs, appendLine } from './node-fs.js';
import { V2Conductor } from '../v2/v2-conductor.js';
import { importManuscript } from '../doctor/manuscript-import.js';
import { runDoctorAudit } from '../doctor/doctor-orchestrator.js';

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
  // C8.6 — overrides de plan (cap 60k) : chapitres/mots par env, intent sinon.
  const book: BookIntent = {
    ...BOOK,
    target_chapters: Number(process.env['C7_CHAPTERS'] ?? BOOK.target_chapters ?? 30),
    target_word_count: Number(process.env['C7_WORDS'] ?? BOOK.target_word_count),
  };
  const plan = planBook(book);
  const log = new StoryStateLog();
  const generator = new OllamaChapterGenerator({ model, maxTokens: 900, timeoutMs: 180_000 });

  /* EMP-16 : PLAN_LOCK -> directives runtime (mandat tribunal). */
  const packsPath = process.env['C7_DIRECTIVE_PACKS'];
  const emp16Packs: { chapter: number; directive: string }[] = packsPath !== undefined ? (JSON.parse(rfsEmp16(packsPath, 'utf8')) as { packs: { chapter: number; directive: string }[] }).packs : [];

  /* V2 (GO tribunal 2/2 2026-06-08) : C18 mode '1' + C17 'soft' + shadows.
   * ROSETTA_GAP consigné : la matrice Rosetta traduit des cibles MÉTRIQUES
   * (contrat rosetta-bridge) — aucune entrée fonction-dramatique n'y existe ;
   * l'escalade C17 reste en français calibré (la même famille de directives
   * qui a PROUVÉ son effet : météo 48→0, TRANSITION 0.72→0.58). Étendre la
   * matrice = travail de calibration futur, pas inventable (EMP-19). */
  const v2on = process.env['C7_V2'] === '1';
  const v2PlanPath = process.env['C7_PLAN_LOCK'] ?? 'runs/next_book/PLAN_LOCK.json';
  const v2Plan: ReadonlyArray<{ chapter: number; act: number; fn: string }> = v2on ? (JSON.parse(rfsEmp16(v2PlanPath, 'utf8')) as { plan: { chapter: number; act: number; fn: string }[] }).plan : [];
  const v2 = v2on ? new V2Conductor(outRoot, [...world.surfaces], 'soft') : undefined;
  const v2Admitted: { chapter: number; prose: string }[] = [];
  const v2Winners: string[] = [];
  const V2_SEEDS = ['naufrage', 'dette', 'lettre', 'carnet', 'registre'];
  let v2PrevAct = 1;
  for (const spec of plan.chapters.slice(0, maxCh)) {
    const { packs, pctx, locks } = chapterDeps(world, log, spec);
    const digest = buildContextDigest(log.project(), spec, plan, book);
    const emp16Pack = emp16Packs.find((p) => p.chapter === spec.index);
    const digestFinal = emp16Pack !== undefined ? `${digest}\n\n=== PLAN-LOCK EMP-16 (df8d650f) — CONTRAINTES OBLIGATOIRES ===\n${emp16Pack.directive}` : digest;
    if (spec.index === 1 && emp16Pack !== undefined) wfsEmp16(`${outRoot}/INJECTION_PROOF_CH1.txt`, digestFinal, 'utf8');
    const base: GenRequest = { intent: chapterSpecToIntent(spec, book), digest: digestFinal, spec };
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
      /* FABRIQUE réutilisable (la regen C17 = un 2e appel — ADR-003 : le CALC
       * contrôle la sélection ; la regen est UNE seconde chance bornée). */
      const produce = async (req: GenRequest, tag: string): Promise<{ record: Awaited<ReturnType<typeof runCoreChapterFull>>['record']; full: Awaited<ReturnType<typeof runCoreChapterFull>>['full']; win: string; winnerProse: string }> => {
        const { record, full } = await runCoreChapterFull(spec, req, {
          ...common,
          generator,
          realState: log.project(),
          weekdayByChapter: new Map(),
          mode: 'BOOST',
        } as CoreDeps);
        const dir = `${outRoot}/chap_${String(spec.index).padStart(3, '0')}${tag}`;
        fs.mkdirp(dir);
        fs.writeFile(`${dir}/admission.json`, JSON.stringify(record, null, 2));
        for (const c of full) fs.writeFile(`${dir}/candidate_${c.profile}.txt`, c.prose); // FORBID-007
        let win = record.winner.kind === 'WINNER' ? record.winner.profile : record.winner.bestUnderGates;
        /* C18 mode '1' : la gate d'incipit choisit la candidate FINALE AVANT extension. */
        if (v2 !== undefined) {
          const eligible = new Set(record.candidates.filter((c) => c.eligible).map((c) => c.profile));
          const gated = v2.applyIncipitGate(full.map((c) => ({ profile: c.profile, prose: c.prose, eligible: eligible.has(c.profile) })), win, spec.index);
          if (gated.c18 !== 'PASS') appendLine(progress, `[v2 ch.${spec.index}${tag}] C18=${gated.c18} ${win}->${gated.profile}`);
          win = full.find((c) => c.profile === gated.profile)?.profile ?? win; // garde le type brandé à la source

        }
        let winnerProse = full.find((c) => c.profile === win)?.prose ?? '';
        // C8.6 — extension vers la cible (BB-02-aware) : continuations bornées, filet BF-02 au segment.
        if (process.env['C7_EXTEND'] === '1' && winnerProse.length > 0) {
          const ext = await extendChapter(winnerProse, req, generator, Number(process.env['C7_SEG_TARGET'] ?? 1400), (seg) =>
            enforceRecallOrInvalid(seg, packs, world.registry, world.surfaces, resolution, 3).verdict === 'PASS',
          );
          winnerProse = ext.segments.join('\n\n');
          appendLine(progress, `[extend ch.${spec.index}${tag}] segments=${ext.segments.length} words=${ext.totalWords}`);
        }
        return { record, full, win, winnerProse };
      };

      let out = await produce(base, '');
      let regenUsed = false;

      if (v2 !== undefined) {
        const planRow = v2Plan.find((p) => p.chapter === spec.index);
        const act = planRow?.act ?? 1;
        if (act !== v2PrevAct) { v2.closeAct(v2PrevAct); v2PrevAct = act; }
        const plannedFn = (planRow?.fn ?? 'ACTION') as Parameters<V2Conductor['admitChapter']>[0]['plannedFn'];
        /* Fonction RÉALISÉE — condition préfixe (PREFIX_STABLE 0.94+ prouvé). */
        const classify = (prose: string): { fn: Parameters<V2Conductor['admitChapter']>[0]['plannedFn']; unpaid: number } => {
          const text = [...v2Admitted, { chapter: spec.index, prose }].map((c) => `## Chapitre ${c.chapter}\n\n${c.prose}`).join('\n\n');
          const impV2 = importManuscript(text);
          if (!impV2.ok) return { fn: 'ACTION', unpaid: 0 };
          const auditV2 = runDoctorAudit(impV2.value.chapters, impV2.value.castProposal.slice(0, 4).map((c) => c.name), V2_SEEDS);
          if (!auditV2.ok) return { fn: 'ACTION', unpaid: 0 };
          const last = auditV2.value.arc.chapterFunctions.find((f) => f.chapter === spec.index);
          return { fn: (last?.fn ?? 'ACTION') as Parameters<V2Conductor['admitChapter']>[0]['plannedFn'], unpaid: auditV2.value.arc.seedLedger.filter((s) => s.payoffChapter === 'UNPAID').length };
        };
        let cls = classify(out.winnerProse);
        let verdict = v2.admitChapter({ chapter: spec.index, act, plannedFn, realizedFn: cls.fn, prose: out.winnerProse, originalWinner: out.win, finalWinner: out.win, c18: 'PASS', regenUsed: false, unpaidSeeds: cls.unpaid });
        if (verdict.status === 'DRIFT_REGEN_REQUESTED') {
          appendLine(progress, `[v2 ch.${spec.index}] C17=${verdict.status} (${plannedFn}->${cls.fn}) — regen 1/1`);
          const base2: GenRequest = { ...base, digest: `${base.digest}\n\n=== ESCALADE C17 (regen unique) ===\n${v2.escalationDirective(plannedFn, spec.index)}` };
          out = await produce(base2, '_regen');
          regenUsed = true;
          cls = classify(out.winnerProse);
          verdict = v2.admitChapter({ chapter: spec.index, act, plannedFn, realizedFn: cls.fn, prose: out.winnerProse, originalWinner: out.win, finalWinner: out.win, c18: 'PASS', regenUsed: true, unpaidSeeds: cls.unpaid, isRegenRound: true });
        }
        v2Admitted.push({ chapter: spec.index, prose: out.winnerProse });
        v2Winners.push(out.win);
        appendLine(progress, `[v2 ch.${spec.index}] C17=${verdict.status} realized=${cls.fn} planned=${plannedFn}${regenUsed ? ' regen=1' : ''}`);
      }

      appendLine(`${outRoot}/MANUSCRIT.md`, `\n\n## Chapitre ${spec.index} — ${spec.objective} [${out.win}${out.record.winner.kind === 'WINNER' ? '' : ' ; FLAGGED'}${regenUsed ? ' ; C17_REGEN' : ''}]\n\n${out.winnerProse}`);
      appendLine(progress, `[book ch.${spec.index}] winner=${out.win}${out.record.winner.kind === 'WINNER' ? '' : ' (FLAGGED)'} eligible=${out.record.candidates.filter((c) => c.eligible).length}/7 hash=${String(out.record.admissionHash).slice(0, 12)}`);
    }
    log.appendAll(plannedDelta(plan, spec.index, spec));
  }
  if (v2 !== undefined) {
    v2.closeAct(v2PrevAct);
    const { control } = v2.flush(v2Winners);
    appendLine(progress, `[v2 final] drifts=${control.drifts}/${control.chapters} regens=${control.regensRequested} flagged=${control.acceptedFlagged} breaches=${control.actBreaches.length}`);
  }
  appendLine(progress, `[${new Date().toISOString()}] done.`);
}

main().catch((e: unknown) => {
  appendLine(process.env['C7_OUT'] ? `${process.env['C7_OUT']}/progress.log` : 'runs/c7_err.log', `FATAL: ${String(e)}`);
  process.exitCode = 1;
});
