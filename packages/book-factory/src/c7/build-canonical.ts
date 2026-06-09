/**
 * OMEGA — P0-B : buildCanonical(v0, opts) — LE pipeline canonique en FONCTION
 * testable E2E (GO tribunal 2/2). Plus jamais « 14 exports, 3 rapports
 * contradictoires » : UNE fonction, UN rapport de propreté TYPÉ, des sceaux
 * d'auteur BLOQUANTS.
 *
 * NIVEAUX DE PROPRETÉ (contrainte ChatGPT — séparer verrouillage et qualité) :
 *   SYNTAX_CLEAN   — terminateurs/structure (couture résidu 0)
 *   SEAM_CLEAN     — frontières (scaffold + couture + faux-départs)
 *   SEMANTIC_CLEAN — guillemets/stems/fin de livre (gate sémantique résidu 0)
 *   NARRATIVE_CLEAN— tics/redites de fonction/incipits — JAMAIS déclaré propre
 *                    tant que les saturations persistent (HONNÊTETÉ d'abord)
 *   AUTHOR_LOCKS_INTACT — toutes les ancres scellées présentes ; ancre cassée
 *                    = UNRESOLVED_LOCK = BUILD FAIL (le sceau est une gate).
 */

import { sha256 } from '@omega/canon-kernel';

import { err, ok } from '../identity/identity-types.js';
import type { Result } from '../identity/identity-types.js';
import { runDoctor } from '../doctor/doctor-orchestrator.js';
import { dedupAdjacentDuplicateSentences, isTailTruncated } from '../doctor/repair-executor.js';
import { importManuscript } from '../doctor/manuscript-import.js';
import { stripScaffold } from '../doctor/scaffold-guard.js';
import { seamSweep } from '../doctor/seam-sweep.js';
import { semanticGate, buildBookVocabulary, isBookEndComplete } from '../doctor/semantic-gate.js';
import { scanSemanticResidue } from '../doctor/semantic-residue.js';
import { AuthorDecisionLedger } from '../identity/author-seal.js';
import { enforceAuthorRules } from './author-rule-gate.js';

/** Types dérivés du contrat RÉEL de runDoctor (zéro duplication de type). */
type DoctorArgs = NonNullable<Parameters<typeof runDoctor>[1]>;
type DoctorOverrides = DoctorArgs extends { overrides?: infer O } ? O : never;

export interface CleanlinessReport {
  readonly SYNTAX_CLEAN: boolean;
  readonly SEAM_CLEAN: boolean;
  readonly SEMANTIC_CLEAN: boolean;
  readonly NARRATIVE_CLEAN: boolean;
  readonly AUTHOR_LOCKS_INTACT: boolean;
  readonly detail: {
    readonly seamResidual: number;
    readonly scaffoldResidual: number;
    readonly semanticResidual: number;
    readonly quoteDelta: number;
    readonly bookEndComplete: boolean;
    readonly brokenComparisons: number;
    readonly functionalRedundancies: number;
    readonly incipitClones: number;
    readonly maxTicPer1000w: number;
    /** Le notaire ne compte pas pommes/couteaux/dettes dans le même panier : */
    readonly activeLocksTotal: number;
    readonly spanLocksIntact: number;
    readonly decisionLocksPendingExecution: number;
    readonly unresolvedLocks: number;
    /** NCR-PX2-001 (M3) : résidus sémantiques couverts par une ancre d'auteur
     *  scellée (KEEP/MARK_AS_STYLE) — silencés, l'autorité ne se re-questionne pas. */
    readonly lockSilencedResiduals: number;
  };
}

export interface BuildCanonicalOptions {
  readonly overrides?: DoctorOverrides;
  readonly seeds?: readonly string[];
  readonly knownNames?: readonly string[];
  /** Registre des sceaux — verifyAnchors BLOQUANT (mandat 2/2). */
  readonly authorLocks?: AuthorDecisionLedger;
  /** Oppose les RÈGLES d'auteur (DECISION_LOCK ruleText) au manuscrit : une règle
   *  ENFORCEABLE violée = BUILD FAIL (GO Francky 2026-06-09). OPT-IN (défaut OFF :
   *  zéro régression). Le chemin production V3-certif/V4 l'active. */
  readonly enforceAuthorRules?: boolean;
  /** Tics surveillés pour NARRATIVE_CLEAN (mesure honnête, cap par 1000 mots). */
  readonly ticWatch?: readonly string[];
  readonly maxTicPer1000w?: number;
}

export interface BuildCanonicalResult {
  readonly text: string;
  readonly finalHash: string;
  readonly words: number;
  readonly cleanliness: CleanlinessReport;
  readonly csv: { readonly seam: string; readonly scaffold: string; readonly semantic: string };
}

export type BuildError =
  | { readonly code: 'IMPORT_FAIL' | 'PIPELINE_FAIL'; readonly detail: string }
  | { readonly code: 'UNRESOLVED_LOCK'; readonly detail: string; readonly broken: readonly string[] }
  | { readonly code: 'AUTHOR_RULE_VIOLATION'; readonly detail: string; readonly violations: readonly string[] };

const DEFAULT_TICS = ['le gardien', 'le silence', 'il y a', 'la pluie', 'le village'] as const;

function toCsv(rows: readonly (readonly (string | number)[])[], header: string): string {
  return [header, ...rows.map((r) => r.map((x) => typeof x === 'string' ? `"${x.replace(/"/gu, "''").replace(/\s+/gu, ' ')}"` : String(x)).join(';'))].join('\n');
}

/** LE pipeline canonique. Déterministe (zéro LLM ; runDoctor async par contrat
 *  de port mais n'attend jamais le réseau en allowSurgical:false). Testable E2E. */
export async function buildCanonical(v0: string, opts: BuildCanonicalOptions = {}): Promise<Result<BuildCanonicalResult, BuildError>> {
  const knownNames = opts.knownNames ?? ['Léna', 'Garcia', 'Gaspard', 'Yvon', 'Henri', 'Squarcioni', 'Marchetti', 'Ker-Morvan', 'Thomas'];

  const doctorArgs: DoctorArgs = { executor: { allowSurgical: false } };
  if (opts.overrides !== undefined) (doctorArgs as { overrides?: DoctorOverrides }).overrides = opts.overrides;
  if (opts.seeds !== undefined) (doctorArgs as { seeds?: readonly string[] }).seeds = opts.seeds;
  const doc = await runDoctor(v0, doctorArgs);
  if (!doc.ok) return err({ code: 'PIPELINE_FAIL', detail: `doctor: ${JSON.stringify(doc.error)}` });
  let text = doc.value.repairedProse;

  /* 2. Scaffold guard (AVANT couture — leçon cascade). */
  const imp1 = importManuscript(text);
  if (!imp1.ok) return err({ code: 'IMPORT_FAIL', detail: 'scaffold import' });
  const scaffold = stripScaffold(imp1.value.chapters.map((c) => ({ chapter: c.chapter, prose: c.prose })));
  if (!scaffold.ok) return err({ code: 'PIPELINE_FAIL', detail: 'scaffold' });
  text = scaffold.value.cleaned.map((c) => `## Chapitre ${c.chapter}\n\n${c.prose}`).join('\n\n');

  /* 3. Dédup + tail déterministe. */
  text = dedupAdjacentDuplicateSentences(text).text;
  const trimmed = text.trimEnd();
  if (isTailTruncated(trimmed)) {
    const lastStop = Math.max(trimmed.lastIndexOf('. '), trimmed.lastIndexOf('? '), trimmed.lastIndexOf('! '), trimmed.lastIndexOf('» '));
    text = `${trimmed.slice(0, lastStop + 1)}\n`;
  }

  /* 4. Couture (vocab corpus) puis 5. gate sémantique. */
  const imp2 = importManuscript(text);
  if (!imp2.ok) return err({ code: 'IMPORT_FAIL', detail: 'seam import' });
  const vocab = buildBookVocabulary(text);
  const sweep = seamSweep(imp2.value.chapters.map((c) => ({ chapter: c.chapter, prose: c.prose })), 0.6, knownNames, vocab);
  if (!sweep.ok) return err({ code: 'PIPELINE_FAIL', detail: 'seam' });
  text = sweep.value.repairedText;

  const imp3 = importManuscript(text);
  if (!imp3.ok) return err({ code: 'IMPORT_FAIL', detail: 'semantic import' });
  const sem = semanticGate(imp3.value.chapters.map((c) => ({ chapter: c.chapter, prose: c.prose })), text);
  if (!sem.ok) return err({ code: 'PIPELINE_FAIL', detail: 'semantic' });
  text = sem.value.repairedText;

  /* NCR-P0B-001 : le hash et les métriques regardent le MÊME cadavre — toute
   * mesure de propreté est calculée sur le RÉ-IMPORT du texte FINAL. */
  const finalImp = importManuscript(text);
  if (!finalImp.ok) return err({ code: 'IMPORT_FAIL', detail: 'final import' });
  const finalChapters = finalImp.value.chapters.map((c) => ({ chapter: c.chapter, prose: c.prose }));

  /* 6. SCEAUX D'AUTEUR — gate BLOQUANTE (mandat 2/2). Paniers SÉPARÉS :
   *    span ancrés / décisions en attente d'exécution / cassés. */
  let activeLocksTotal = 0;
  let spanLocksIntact = 0;
  let decisionLocksPendingExecution = 0;
  let locksBrokenList: readonly string[] = [];
  if (opts.authorLocks !== undefined) {
    const active = opts.authorLocks.activeLocks();
    activeLocksTotal = active.length;
    decisionLocksPendingExecution = active.filter((d) => d.anchorExcerpt === null).length;
    const v = opts.authorLocks.verifyAnchors(text);
    spanLocksIntact = v.intact.length;
    locksBrokenList = v.broken.map((d) => `${d.decisionId}:${(d.anchorExcerpt ?? '').slice(0, 50)}`);
    if (v.broken.length > 0) {
      return err({ code: 'UNRESOLVED_LOCK', detail: `${v.broken.length} ancre(s) scellée(s) introuvable(s) — BUILD FAIL (le sceau est une gate).`, broken: locksBrokenList });
    }
  }

  /* 6-bis. RÈGLES D'AUTEUR OPPOSABLES (GO Francky 2026-06-09) — opt-in. Une règle
   *  ENFORCEABLE violée (identité dérivante / chapitre mort) = BUILD FAIL. Les
   *  ADVISORY/PROCESS/CONFIRMATION ne bloquent jamais (INV-ARG-002). */
  if (opts.enforceAuthorRules === true && opts.authorLocks !== undefined) {
    const ruleReport = enforceAuthorRules(opts.authorLocks.activeLocks(), finalChapters);
    if (!ruleReport.passed) {
      return err({ code: 'AUTHOR_RULE_VIOLATION', detail: `${ruleReport.violations.length} règle(s) d'auteur ENFORCEABLE violée(s) — BUILD FAIL (le sceau est opposable, pas décoratif).`, violations: ruleReport.violations.map((v) => `${v.decisionId}/${v.checker}: ${v.detail}`) });
    }
  }

  /* 7. Mesures NARRATIVE (honnêteté : on MESURE, on ne maquille pas) — toutes
   *    sur finalChapters (NCR-P0B-001). */
  const residue = scanSemanticResidue(finalChapters);
  const brokenComparisons = residue.ok ? residue.value.brokenComparisons : -1;
  const functionalRedundancies = residue.ok ? residue.value.functionalRedundancies : -1;
  const words = text.split(/\s+/u).filter((w) => w.length > 0).length;
  const ticWatch = opts.ticWatch ?? DEFAULT_TICS;
  const maxTicPer1000w = Math.max(...ticWatch.map((t) => ((text.toLowerCase().match(new RegExp(t.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'gu')) ?? []).length * 1000) / Math.max(1, words)));
  const incipitHeads = finalChapters.map((c) => c.prose.trim().split(/\s+/u).slice(0, 4).join(' ').toLowerCase());
  const headCounts = new Map<string, number>();
  for (const h of incipitHeads) headCounts.set(h, (headCounts.get(h) ?? 0) + 1);
  const incipitClones = [...headCounts.values()].filter((n) => n >= 3).reduce((a, b) => a + b, 0);

  const lastCh = finalChapters[finalChapters.length - 1];
  const lastBlocks = (lastCh?.prose ?? '').split(/\r?\n\s*\r?\n/u).filter((b) => b.trim().length > 0);
  const bookEnd = lastBlocks.length > 0 && isBookEndComplete(lastBlocks[lastBlocks.length - 1] ?? '');
  const quoteDelta = (text.match(/«/gu) ?? []).length - (text.match(/»/gu) ?? []).length;

  const seamResidual = sweep.value.residualFindings.length;
  /* NCR-PX2-001 (M3) — AUTORITÉ D'AUTEUR : un résidu sémantique dont l'extrait
   * recouvre une ancre SPAN/STYLE scellée KEEP/MARK_AS_STYLE est SILENCÉ. La
   * machine a posé la question UNE fois ; le sceau est la réponse — définitive. */
  const normSeal = (s: string): string => s.normalize('NFC').replace(/\s+/gu, ' ').trim();
  const sealedSpans = (opts.authorLocks?.activeLocks() ?? [])
    .filter((d) => d.anchorExcerpt !== null && (d.verdict === 'KEEP' || d.verdict === 'MARK_AS_STYLE'))
    .map((d) => normSeal(d.anchorExcerpt ?? ''));
  const lockSilencedResiduals = sem.value.residualFindings.filter((f) => {
    const e = normSeal(f.excerpt);
    return sealedSpans.some((a) => a.length > 0 && (e.includes(a) || a.includes(e)));
  }).length;
  const semanticResidual = sem.value.residualFindings.length - lockSilencedResiduals;
  const cleanliness: CleanlinessReport = {
    SYNTAX_CLEAN: seamResidual === 0,
    SEAM_CLEAN: seamResidual === 0 && scaffold.value.residual === 0,
    SEMANTIC_CLEAN: semanticResidual === 0 && quoteDelta === 0 && bookEnd,
    // INTERDICTION (ChatGPT) de déclarer propre tant que la saturation persiste :
    NARRATIVE_CLEAN: functionalRedundancies === 0 && brokenComparisons === 0 && incipitClones === 0 && maxTicPer1000w <= (opts.maxTicPer1000w ?? 1.5),
    AUTHOR_LOCKS_INTACT: locksBrokenList.length === 0,
    detail: {
      seamResidual, scaffoldResidual: scaffold.value.residual, semanticResidual,
      quoteDelta, bookEndComplete: bookEnd, brokenComparisons, functionalRedundancies,
      incipitClones, maxTicPer1000w: Number(maxTicPer1000w.toFixed(2)),
      activeLocksTotal, spanLocksIntact, decisionLocksPendingExecution,
      unresolvedLocks: locksBrokenList.length,
      lockSilencedResiduals,
    },
  };

  return ok({
    text,
    finalHash: String(sha256(text.normalize('NFC'))),
    words,
    cleanliness,
    csv: {
      seam: toCsv(sweep.value.repairs.map((x) => [x.finding.chapter, x.finding.kind, x.action, x.before, x.after]), 'chapter;kind;action;before;after'),
      scaffold: toCsv(scaffold.value.removed.map((x) => [x.chapter, x.reason, x.text]), 'chapter;reason;text'),
      semantic: toCsv(sem.value.repairs.map((x) => [x.finding.chapter, x.finding.kind, x.action, x.before, x.after]), 'chapter;kind;action;before;after'),
    },
  });
}
