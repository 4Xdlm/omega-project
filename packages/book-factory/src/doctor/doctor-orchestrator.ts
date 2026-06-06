/**
 * OMEGA Book-Factory — C11.2 DOCTOR ORCHESTRATOR (BF-08) — le mode produit
 * REWRITE_DOCTOR assemblé : import → cast → audit C9 → plan → exécution sûre
 * → ré-assemblage → RE-AUDIT → rapport avant/après.
 *
 * Réutilise les instruments EXISTANTS (zéro doublon — Concept Ledger) :
 * sentence-physics, chapter-coherence, arc-coherence (+ rôles GÉO pour les
 * lieux doubles), tics-gate, import C11.1, planner/executor C11.2.
 * Heuristique protagonistes (prouvée 88k) : top-K du cast = protagonistes
 * probables ⇒ exclus de la dérive de rôle (bruit de co-occurrence).
 */

import type { ChapterSlice, DoctorAudit, DoctorAuditSummary, DoctorReport, DoctorResult } from './doctor-types.js';
import { importManuscript } from './manuscript-import.js';
import type { ImportOptions } from './manuscript-import.js';
import { buildRepairPlan } from './repair-planner.js';
import type { PlannerOverrides } from './repair-planner.js';
import { executeRepairs } from './repair-executor.js';
import type { ExecutorOptions } from './repair-executor.js';
import { scanSentencePhysics } from '../coherence/sentence-physics.js';
import { scanChapterCoherence } from '../coherence/chapter-coherence.js';
import { analyzeArcCoherence, DEFAULT_ROLE_LEXICON } from '../coherence/arc-coherence.js';
import { measureTics } from '../coherence/tics-gate.js';
import { err, ok } from '../identity/identity-types.js';

const GEO_ROLES: readonly string[] = ['village', 'île', 'port', 'ville'];

export interface DoctorOptions {
  readonly import?: ImportOptions;
  readonly overrides?: PlannerOverrides;
  readonly executor?: ExecutorOptions;
  /** Seeds à suivre dans le ledger (inconnues pour un manuscrit externe → []). */
  readonly seeds?: readonly string[];
  /** Nombre de têtes d'affiche exclues de la dérive de rôle. EXPERIMENTAL. */
  readonly protagonistTopK?: number;
}

export function runDoctorAudit(
  chapters: readonly ChapterSlice[],
  protagonists: readonly string[],
  seeds: readonly string[],
): DoctorResult<DoctorAudit> {
  const physics = chapters.flatMap((c) => {
    const r = scanSentencePhysics(c.prose, c.chapter);
    return r.ok ? [...r.value] : [];
  });
  const chapterSignals = chapters.flatMap((c) => {
    const r = scanChapterCoherence(c.prose, c.chapter);
    return r.ok ? [...r.value] : [];
  });
  const roles = [...DEFAULT_ROLE_LEXICON, ...GEO_ROLES];
  const legit = new Map(roles.map((role) => [role, protagonists] as const));
  const arcR = analyzeArcCoherence(
    chapters.map((c) => ({ chapter: c.chapter, prose: c.prose })),
    { roles, legitimateNames: legit, seeds },
  );
  if (!arcR.ok) return err({ code: 'AUDIT_FAILED', detail: arcR.error.code });
  const ticsR = measureTics(chapters.map((c) => ({ chapter: c.chapter, prose: c.prose })));
  if (!ticsR.ok) return err({ code: 'AUDIT_FAILED', detail: ticsR.error.code });
  return ok({ physics, chapterSignals, arc: arcR.value, tics: ticsR.value });
}

function summarize(audit: DoctorAudit): DoctorAuditSummary {
  return {
    identityDrifts: audit.arc.identityDrifts.length,
    physicsSignals: audit.physics.length,
    chapterSignals: audit.chapterSignals.length,
    ticsFailShadow: audit.tics.rows.filter((r) => r.level === 'FAIL_SHADOW').length,
    seedsUnpaid: audit.arc.seedLedger.filter((s) => s.payoffChapter === 'UNPAID' && s.plantedChapter !== 'ABSENT').length,
  };
}

/** Ré-assemble le manuscrit réparé en conservant le format d'origine au mieux. */
function reassemble(original: string, chapters: readonly ChapterSlice[], repairedFull: string): string {
  // V1 : la réparation opère sur le TEXTE COMPLET (les actions sont globales) —
  // le ré-assemblage est donc l'identité. Gardé comme point d'extension
  // (réparations par chapitre en V2). `original`/`chapters` documentent l'intention.
  void original; void chapters;
  return repairedFull;
}

export async function runDoctor(manuscript: string, opts: DoctorOptions = {}): Promise<DoctorResult<DoctorReport>> {
  const imp = importManuscript(manuscript, opts.import ?? {});
  if (!imp.ok) return imp;
  const { chapters, strategy, totalWords, castProposal } = imp.value;

  const topK = opts.protagonistTopK ?? 4; // EXPERIMENTAL — validé sur 88k
  const protagonists = castProposal.slice(0, topK).map((c) => c.name);
  const seeds = opts.seeds ?? [];

  const before = runDoctorAudit(chapters, protagonists, seeds);
  if (!before.ok) return before;

  const plan = buildRepairPlan(before.value, chapters, opts.overrides ?? {});
  const fullText = manuscript;
  // Plomberie : les remplacements littéraux décidés au niveau ÉDITORIAL
  // (PlannerOverrides) sont transmis à l'executor — une seule source de vérité.
  const execOpts = {
    ...(opts.executor ?? {}),
    literalReplacements: new Map([
      ...(opts.overrides?.literalReplacements ?? new Map<string, string>()),
      ...(opts.executor?.literalReplacements ?? new Map<string, string>()),
    ]),
  };
  const { repaired, applied } = await executeRepairs(fullText, plan, execOpts);

  // RE-AUDIT sur le texte réparé (re-import même stratégie).
  const reImp = importManuscript(repaired, opts.import ?? {});
  if (!reImp.ok) return reImp;
  const after = runDoctorAudit(reImp.value.chapters, protagonists, seeds);
  if (!after.ok) return after;

  return ok({
    import: { strategy, chapters: chapters.length, words: totalWords },
    auditBefore: summarize(before.value),
    plan,
    applied,
    auditAfter: summarize(after.value),
    repairedProse: reassemble(manuscript, chapters, repaired),
  });
}
