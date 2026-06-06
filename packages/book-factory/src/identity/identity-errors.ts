/**
 * OMEGA Book-Factory — C1 CharacterRegistry — ERREURS TYPÉES (BF-08)
 * L'échec est une VALEUR exhaustivement énumérée — jamais un throw de flux, jamais un silence.
 * Chaque code correspond à ≥1 test. assertNever ferme l'union (un code ajouté sans
 * traitement = erreur de COMPILATION).
 */

import type { AliasId, AliasSurface, CharacterId, ChapterRef, MintNonce } from './identity-types.js';
import { assertNever } from './identity-types.js';

export type IdentityError =
  | { readonly code: 'DUPLICATE_NONCE'; readonly nonce: MintNonce }
  | { readonly code: 'EMPTY_DISPLAY_NAME'; readonly nonce: MintNonce }
  | { readonly code: 'UNKNOWN_CHARACTER'; readonly id: CharacterId; readonly inEvent: string }
  | { readonly code: 'DUPLICATE_ALIAS_ID'; readonly aliasId: AliasId }
  | { readonly code: 'MISSING_EVIDENCE'; readonly aliasId: AliasId } // INV-CHAR-009
  | { readonly code: 'INVALID_VALIDITY'; readonly aliasId: AliasId; readonly from: ChapterRef; readonly to: ChapterRef }
  | { readonly code: 'ALREADY_REVEALED'; readonly outerId: CharacterId }
  | { readonly code: 'SELF_REVEAL'; readonly id: CharacterId }
  | {
      readonly code: 'TITLE_TRANSFER_MISMATCH'; // pas d'alias-titre ACTIF de fromId sur cette surface
      readonly surface: AliasSurface;
      readonly fromId: CharacterId;
      readonly at: ChapterRef;
    }
  | { readonly code: 'EMPTY_SURFACE'; readonly raw: string }
  | { readonly code: 'INVALID_CONFIDENCE'; readonly raw: number };

/** Rendu déterministe pour logs/evidence (zéro interpolation hasardeuse en aval). */
export function formatIdentityError(e: IdentityError): string {
  switch (e.code) {
    case 'DUPLICATE_NONCE':
      return `DUPLICATE_NONCE: nonce déjà frappé « ${String(e.nonce)} »`;
    case 'EMPTY_DISPLAY_NAME':
      return `EMPTY_DISPLAY_NAME: nonce « ${String(e.nonce)} »`;
    case 'UNKNOWN_CHARACTER':
      return `UNKNOWN_CHARACTER: ${String(e.id)} (événement ${e.inEvent})`;
    case 'DUPLICATE_ALIAS_ID':
      return `DUPLICATE_ALIAS_ID: ${String(e.aliasId)}`;
    case 'MISSING_EVIDENCE':
      return `MISSING_EVIDENCE: alias ${String(e.aliasId)} sans evidenceRefs (INV-CHAR-009)`;
    case 'INVALID_VALIDITY':
      return `INVALID_VALIDITY: alias ${String(e.aliasId)} [${String(e.from)}, ${String(e.to)})`;
    case 'ALREADY_REVEALED':
      return `ALREADY_REVEALED: ${String(e.outerId)}`;
    case 'SELF_REVEAL':
      return `SELF_REVEAL: ${String(e.id)}`;
    case 'TITLE_TRANSFER_MISMATCH':
      return `TITLE_TRANSFER_MISMATCH: « ${String(e.surface)} » n'est pas un titre actif de ${String(e.fromId)} au chap. ${String(e.at)}`;
    case 'EMPTY_SURFACE':
      return `EMPTY_SURFACE: « ${e.raw} »`;
    case 'INVALID_CONFIDENCE':
      return `INVALID_CONFIDENCE: ${e.raw}`;
    default:
      return assertNever(e);
  }
}
