/**
 * OMEGA — SCEAU D'AUTEUR / AUTHOR_DECISION_LEDGER (BF-08) — P0-A-bis.
 * CONCEPT-AUTHOR-SEAL-001 — Francky + tribunal 2/2 (2026-06-07).
 *
 * FOUND_EXISTING : mode SEMI-AUTONOME « OMEGA propose, humain valide »
 * (VISION_FINALE_SCELLEE.md:291, Checkpoints) + ESCALATE Surgeon + gold-set
 * humain hashé. NEW : le REGISTRE PERSISTANT qui rend la validation OPPOSABLE.
 *
 * LOIS (mots de l'Architecte) :
 *  - « un auteur a le droit de faire des erreurs VOLONTAIRES — on ne peut pas
 *    l'obliger à écrire au top » : un sceau MARK_AS_STYLE protège même ce que
 *    les instruments jugent fautif.
 *  - « si la machine a besoin de modifier un scellement pareil, on DEMANDE à
 *    l'utilisateur » : il n'existe AUCUNE API machine de modification — la
 *    seule issue est requestUnseal() qui produit une QUESTION, jamais un write.
 *  - Dé-scellement = SUPERSÈDE, jamais effacer (registre juridique append-only,
 *    revoked garde son histoire : supersededBy + raison).
 *
 * INV-AUTHOR-SEAL-001..007 : aucun outil ne modifie un span scellé · ancre
 * textuelle hashée · ancre cassée = UNRESOLVED_LOCK BLOQUANT · dé-scellement
 * append-only · consulté avant Doctor/Surgeon/Mycelium/Studio · questions
 * limitées à ESCALATE/divergence/ambiguïté haute · zéro spam sur les INFO.
 */

import { sha256 } from '@omega/canon-kernel';

import { err, ok, compareStrings } from './identity-types.js';
import type { Result } from './identity-types.js';

export type LockKind = 'SPAN_LOCK' | 'DECISION_LOCK' | 'ENTITY_LOCK' | 'STYLE_LOCK' | 'CANON_LOCK';
export type AuthorVerdict = 'KEEP' | 'REPAIR' | 'MARK_AS_STYLE' | 'MARK_AS_ERROR' | 'MARK_AS_CANON' | 'MARK_AS_UNCERTAIN';
/** Seules sources autorisées à déranger l'auteur (INV-006/007 : zéro spam INFO). */
export type QuestionSource = 'ESCALATE' | 'TRIBUNAL_DIVERGENCE' | 'HIGH_AMBIGUITY';

export interface AuthorDecision {
  readonly decisionId: string;
  readonly kind: LockKind;
  readonly verdict: AuthorVerdict;
  readonly question: string;
  readonly answer: string;
  readonly chapter: number | null;
  /** Ancre = sha256 du passage NORMALISÉ (SPAN/STYLE) — null pour les règles. */
  readonly anchorHash: string | null;
  readonly anchorExcerpt: string | null;
  readonly ruleText: string | null;
  readonly decidedBy: string;
  readonly decidedAt: string;
  readonly supersededBy: string | null;
  readonly supersedeReason: string | null;
  readonly sealHash: string;
}

export interface SealInput {
  readonly kind: LockKind;
  readonly verdict: AuthorVerdict;
  readonly question: string;
  readonly answer: string;
  readonly chapter?: number;
  readonly anchorExcerpt?: string;
  readonly ruleText?: string;
  readonly decidedBy?: string;
  readonly decidedAt?: string;
}

export type SealError =
  | { readonly code: 'MISSING_ANCHOR'; readonly detail: string }
  | { readonly code: 'UNKNOWN_DECISION'; readonly detail: string }
  | { readonly code: 'SOURCE_NOT_ALLOWED'; readonly detail: string };

const normSpan = (s: string): string => s.normalize('NFC').replace(/\s+/gu, ' ').trim();

export class AuthorDecisionLedger {
  private readonly entries: AuthorDecision[] = [];

  static fromJson(json: string): AuthorDecisionLedger {
    const l = new AuthorDecisionLedger();
    const parsed = JSON.parse(json) as { decisions?: AuthorDecision[] };
    for (const d of parsed.decisions ?? []) l.entries.push(d);
    return l;
  }

  toJson(): string {
    return JSON.stringify({ ledger: 'AUTHOR_DECISIONS', concept: 'CONCEPT-AUTHOR-SEAL-001', decisions: this.entries }, null, 2);
  }

  /** Scelle une décision d'AUTEUR. La machine n'appelle ceci qu'avec une réponse humaine. */
  seal(input: SealInput): Result<AuthorDecision, SealError> {
    const spanKind = input.kind === 'SPAN_LOCK' || input.kind === 'STYLE_LOCK';
    if (spanKind && (input.anchorExcerpt === undefined || normSpan(input.anchorExcerpt).length === 0)) {
      return err({ code: 'MISSING_ANCHOR', detail: 'SPAN/STYLE_LOCK exige une ancre textuelle (INV-002).' });
    }
    const anchorExcerpt = spanKind ? normSpan(input.anchorExcerpt ?? '') : null;
    const anchorHash = anchorExcerpt !== null ? String(sha256(anchorExcerpt)) : null;
    const decidedAt = input.decidedAt ?? '2026-06-07';
    const body = `${input.kind}|${input.verdict}|${anchorHash ?? input.ruleText ?? ''}|${input.answer}|${decidedAt}`;
    const decision: AuthorDecision = {
      decisionId: `auth_${String(sha256(body)).slice(0, 12)}`,
      kind: input.kind,
      verdict: input.verdict,
      question: input.question,
      answer: input.answer,
      chapter: input.chapter ?? null,
      anchorHash,
      anchorExcerpt,
      ruleText: input.ruleText ?? null,
      decidedBy: input.decidedBy ?? 'Francky',
      decidedAt,
      supersededBy: null,
      supersedeReason: null,
      sealHash: String(sha256(body)),
    };
    this.entries.push(decision);
    return ok(decision);
  }

  /** Dé-scellement = SUPERSÈDE append-only (INV-004). Réservé à l'AUTEUR. */
  supersede(decisionId: string, replacement: SealInput, reason: string): Result<AuthorDecision, SealError> {
    const idx = this.entries.findIndex((d) => d.decisionId === decisionId && d.supersededBy === null);
    if (idx < 0) return err({ code: 'UNKNOWN_DECISION', detail: `décision active ${decisionId} introuvable` });
    const sealed = this.seal({ ...replacement, decidedBy: replacement.decidedBy ?? 'Francky' });
    if (!sealed.ok) return sealed;
    const old = this.entries[idx];
    if (old !== undefined) {
      this.entries[idx] = { ...old, supersededBy: sealed.value.decisionId, supersedeReason: reason };
    }
    return sealed;
  }

  all(): readonly AuthorDecision[] { return [...this.entries]; }
  activeLocks(): readonly AuthorDecision[] {
    return this.entries.filter((d) => d.supersededBy === null).sort((a, b) => compareStrings(a.decisionId, b.decisionId));
  }

  /** Le texte fourni contient-il un passage SCELLÉ ? (consultation avant action). */
  findSpanLock(text: string): AuthorDecision | null {
    const t = normSpan(text);
    for (const d of this.activeLocks()) {
      if (d.anchorExcerpt !== null && d.anchorExcerpt.length > 0 && t.includes(d.anchorExcerpt)) return d;
    }
    return null;
  }

  /** INV-003 : toute ancre active introuvable dans le manuscrit = UNRESOLVED_LOCK (BLOQUANT). */
  verifyAnchors(fullText: string): { readonly intact: readonly string[]; readonly broken: readonly AuthorDecision[] } {
    const t = normSpan(fullText);
    const intact: string[] = [];
    const broken: AuthorDecision[] = [];
    for (const d of this.activeLocks()) {
      if (d.anchorExcerpt === null) continue;
      if (t.includes(d.anchorExcerpt)) intact.push(d.decisionId);
      else broken.push(d);
    }
    return { intact, broken };
  }
}

export interface AuthorQuestion {
  readonly source: QuestionSource;
  readonly question: string;
  readonly chapter?: number;
  readonly anchorExcerpt?: string;
}

/** La SEULE issue quand la machine veut toucher un sceau ou trancher un doute :
 *  produire une QUESTION pour l'auteur. Jamais un write. Sources INFO = refusées. */
export function requestAuthorReview(q: AuthorQuestion): Result<AuthorQuestion & { readonly status: 'AUTHOR_REVIEW_REQUIRED' }, SealError> {
  const allowed: readonly QuestionSource[] = ['ESCALATE', 'TRIBUNAL_DIVERGENCE', 'HIGH_AMBIGUITY'];
  if (!allowed.includes(q.source)) {
    return err({ code: 'SOURCE_NOT_ALLOWED', detail: 'seuls ESCALATE / divergence / ambiguïté haute peuvent déranger l’auteur (INV-006/007).' });
  }
  return ok({ ...q, status: 'AUTHOR_REVIEW_REQUIRED' });
}
