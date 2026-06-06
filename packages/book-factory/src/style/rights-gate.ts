/**
 * OMEGA Book-Factory — C15 RIGHTS GATE (BF-08, BF-14 RATIFIÉE) — machine-level.
 *
 * FOUND_EXISTING : CONCEPT-STYLE-CONTINUATION-001 — VISION §8 CLAUSE LÉGALE
 * GRAVÉE : « La génération est autorisée UNIQUEMENT si l'utilisateur dispose
 * des droits juridiques nécessaires. En absence de licence : analyse autorisée,
 * génération BLOQUÉE par le système (machine-level). »
 *
 * MÉCANISME : enum fermé + table capacités → toute opération de style passe
 * par assertRights (refus TYPÉ, jamais silencieux). « Machine-level » signifie :
 * la fonction de génération EXIGE un RightsTicket non falsifiable dans le type
 * système (brand) — pas un booléen qu'on peut bricoler.
 */

import { err, ok } from '../identity/identity-types.js';
import type { Brand, Result } from '../identity/identity-types.js';

export type RightsMode =
  | 'OWN_WORK' // œuvre de l'utilisateur
  | 'PUBLIC_DOMAIN'
  | 'LICENSED' // droits/licence détenus
  | 'GENERIC_STYLE' // style non attribué à un auteur protégé
  | 'ANALYSIS_ONLY' // analyse autorisée, génération interdite
  | 'BLOCKED'; // imitation directe protégée — rien

export type StyleOperation = 'ANALYZE_STYLE' | 'GENERATE_IN_STYLE' | 'CONTINUE_WORK';

/** Ticket de droits — brand : ne peut être construit QUE par assertRights. */
export type RightsTicket = Brand<{ readonly mode: RightsMode; readonly operation: StyleOperation }, 'RightsTicket'>;

const CAPABILITIES: Readonly<Record<RightsMode, readonly StyleOperation[]>> = {
  OWN_WORK: ['ANALYZE_STYLE', 'GENERATE_IN_STYLE', 'CONTINUE_WORK'],
  PUBLIC_DOMAIN: ['ANALYZE_STYLE', 'GENERATE_IN_STYLE', 'CONTINUE_WORK'],
  LICENSED: ['ANALYZE_STYLE', 'GENERATE_IN_STYLE', 'CONTINUE_WORK'],
  GENERIC_STYLE: ['ANALYZE_STYLE', 'GENERATE_IN_STYLE'], // pas de continuation d'œuvre précise
  ANALYSIS_ONLY: ['ANALYZE_STYLE'],
  BLOCKED: [],
};

export type RightsErrorCode = 'GENERATION_BLOCKED_BY_RIGHTS' | 'OPERATION_BLOCKED_BY_RIGHTS';
export interface RightsError { readonly code: RightsErrorCode; readonly mode: RightsMode; readonly operation: StyleOperation; readonly detail: string; }

/** L'UNIQUE fabrique de RightsTicket (VISION:311 incarnée). */
export function assertRights(mode: RightsMode, operation: StyleOperation): Result<RightsTicket, RightsError> {
  if (!CAPABILITIES[mode].includes(operation)) {
    return err({
      code: operation === 'ANALYZE_STYLE' ? 'OPERATION_BLOCKED_BY_RIGHTS' : 'GENERATION_BLOCKED_BY_RIGHTS',
      mode, operation,
      detail: `RIGHTS_MODE=${mode} n'autorise pas ${operation} — clause légale gravée (VISION §8, machine-level)`,
    });
  }
  return ok({ mode, operation } as RightsTicket);
}
