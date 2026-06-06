/**
 * OMEGA Book-Factory — C8.1 N2 RETRY (BF-08) — correction factuelle nommée, RATIFIÉE.
 * Source : N2_RATIFICATION_DOSSIER_3IA.md (Architecte 2026-06-06) + ADR §12.6.
 *
 * LOIS DURES (toutes testées) :
 *  - Éligibilité : UNIQUEMENT violations DURES G2/G3 (+G4 matière) dont le fait est
 *    adossé au rail truth OU à un verrou du ChapterSpec (mitigation rail-truth-only :
 *    « Léna est déterminée » n'est PAS un fait — rejeté).
 *  - GABARIT FIGÉ (hashé, archivé à chaque usage) : [FAIT CANONIQUE] … [OBSERVÉ] …
 *    [ORDRE] Corrige cette violation. N'altère rien d'autre. — AUCUN autre texte.
 *  - max 2 retries par candidat ; au-delà → candidat rejeté (N1 reste possible amont).
 *  - Audit lexical AUTOMATIQUE du prompt émis (FORBID-006) : coaching détecté ⇒
 *    le retry est ANNULÉ et la tentative marquée VIOLATION (jamais émise).
 * MÉCANISME : N2 transmet un FAIT et sa violation — canal vérité, pas canal goût
 * (compatible ADR-003 : aucun score, aucune directive esthétique ne transite).
 * LIMITES : la qualité de la désignation dépend du diff (haute-conf only) ; un fait
 * absent du rail/du verrou est inéligible PAR CONSTRUCTION.
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';

import type { Sha256Hex } from '../identity/identity-types.js';
import type { DiffItem } from '../diff/bible-diff.js';
import type { DriftRule } from '../recall/recall-types.js';
import { auditNoCoaching } from './r6-core.js';

/** Gabarit FIGÉ — toute modification = nouveau couple instrument (EMP-19). */
export const N2_TEMPLATE =
  '[FAIT CANONIQUE] {fact}\n[OBSERVÉ] {observed}\n[ORDRE] Corrige cette violation. N’altère rien d’autre.';
export const N2_TEMPLATE_SHA256: Sha256Hex = sha256(canonicalize({ t: N2_TEMPLATE })) as Sha256Hex;
export const N2_MAX_RETRIES = 2; // ratifié

export type N2Eligibility =
  | { readonly eligible: true; readonly fact: string; readonly observed: string; readonly basis: 'SPEC_LOCK' | 'TRUTH_RAIL' }
  | { readonly eligible: false; readonly reason: 'NOT_HARD_FACTUAL' | 'NO_TRUTH_BASIS' | 'LOW_CONFIDENCE' };

/**
 * Un item de diff est N2-éligible ssi : violation DURE (gateEligible), de nature
 * factuelle (MUTATED/EXTRA/TEMPORAL/EPISTEMIC), ET adossée à une base de vérité :
 * verrou du spec (locks) ou rail truth (truthFacts : énoncés canoniques fournis).
 */
export function n2Eligibility(
  item: DiffItem,
  locks: ReadonlyMap<string, readonly DriftRule[]>,
  truthFacts: ReadonlyMap<string, string>, // subject → énoncé canonique (rail truth)
): N2Eligibility {
  if (!item.gateEligible) return { eligible: false, reason: 'LOW_CONFIDENCE' };
  if (item.kind === 'MISSING') return { eligible: false, reason: 'NOT_HARD_FACTUAL' }; // l'absence se corrige par plan, pas par N2
  const lock = (locks.get(item.subject) ?? []).find((r) => r.field === item.field);
  if (lock !== undefined) {
    return {
      eligible: true,
      basis: 'SPEC_LOCK',
      fact: `${item.subject}.${item.field} = « ${lock.expected} » (verrou du chapitre)`,
      observed: item.observed ?? item.detail,
    };
  }
  const truth = truthFacts.get(`${item.subject}.${item.field}`) ?? truthFacts.get(item.subject);
  if (truth !== undefined) {
    return { eligible: true, basis: 'TRUTH_RAIL', fact: truth, observed: item.observed ?? item.detail };
  }
  return { eligible: false, reason: 'NO_TRUTH_BASIS' };
}

export interface N2Attempt {
  readonly attempt: number; // 1..N2_MAX_RETRIES
  readonly prompt: string;
  readonly promptSha256: Sha256Hex;
  readonly templateSha256: Sha256Hex;
  readonly basis: 'SPEC_LOCK' | 'TRUTH_RAIL';
  readonly coachingAudit: readonly string[]; // NON-VIDE ⇒ tentative INVALIDE (jamais émise)
}

/** Construit la tentative N2 n°`attempt` — refuse au-delà du plafond ratifié. */
export function buildN2Attempt(
  elig: Extract<N2Eligibility, { eligible: true }>,
  attempt: number,
): N2Attempt | { readonly refused: 'MAX_RETRIES_EXCEEDED' } {
  if (attempt < 1 || attempt > N2_MAX_RETRIES) return { refused: 'MAX_RETRIES_EXCEEDED' };
  const prompt = N2_TEMPLATE.replace('{fact}', elig.fact).replace('{observed}', elig.observed);
  return {
    attempt,
    prompt,
    promptSha256: sha256(canonicalize({ p: prompt })) as Sha256Hex,
    templateSha256: N2_TEMPLATE_SHA256,
    basis: elig.basis,
    coachingAudit: auditNoCoaching(prompt), // FORBID-006 : audité À LA CONSTRUCTION
  };
}
