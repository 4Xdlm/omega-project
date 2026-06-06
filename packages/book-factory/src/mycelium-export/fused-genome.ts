/**
 * OMEGA Book-Factory — FUSION GÉNOME (BF-08, BF-13) — composition de l'ADN
 * NARRATIF (C12, book-factory) et de l'ADN ÉMOTIONNEL (packages/genome SEALED,
 * Emotion14 sanctuarisé INV-GEN-12).
 *
 * DOCTRINE ANTI-DOUBLON : ce module ne recalcule RIEN d'émotionnel — le genome
 * SEALED est l'AUTORITÉ Emotion14 (le dupliquer ici serait une violation).
 * La fusion = COMPOSITION DE HASHES sous schéma versionné :
 *   fusedHash = sha256(canonicalize({schema, narrativeHash, emotionalHash}))
 * Si l'empreinte émotionnelle n'est pas disponible (backend genome non invoqué
 * dans ce contexte), le statut est PENDING_EMOTIONAL et fusedHash est ABSENT —
 * jamais un hash partiel déguisé en complet (honnêteté structurelle).
 */

import { sha256, canonicalize } from '@omega/canon-kernel';

import { err, ok } from '../identity/identity-types.js';
import type { Result } from '../identity/identity-types.js';

export const FUSED_GENOME_SCHEMA = 'FUSED_GENOME_V1' as const;

export type FusedGenome =
  | {
      readonly schema: typeof FUSED_GENOME_SCHEMA;
      readonly status: 'COMPLETE';
      readonly narrativeHash: string;
      readonly emotionalHash: string;
      readonly fusedHash: string;
    }
  | {
      readonly schema: typeof FUSED_GENOME_SCHEMA;
      readonly status: 'PENDING_EMOTIONAL';
      readonly narrativeHash: string;
      readonly emotionalHash: null;
      readonly fusedHash: null;
    };

export type FuseError = { readonly code: 'INVALID_HASH'; readonly detail: string };

const SHA256_RE = /^[0-9a-f]{64}$/u;

/** Compose les deux ADN. Pur, déterministe (BF-13). */
export function fuseGenomes(narrativeHash: string, emotionalHash?: string): Result<FusedGenome, FuseError> {
  if (!SHA256_RE.test(narrativeHash)) {
    return err({ code: 'INVALID_HASH', detail: `narrativeHash invalide : « ${narrativeHash.slice(0, 20)}… »` });
  }
  if (emotionalHash === undefined) {
    return ok({ schema: FUSED_GENOME_SCHEMA, status: 'PENDING_EMOTIONAL', narrativeHash, emotionalHash: null, fusedHash: null });
  }
  if (!SHA256_RE.test(emotionalHash)) {
    return err({ code: 'INVALID_HASH', detail: `emotionalHash invalide : « ${emotionalHash.slice(0, 20)}… »` });
  }
  const fusedHash = String(sha256(canonicalize({ schema: FUSED_GENOME_SCHEMA, narrativeHash, emotionalHash })));
  return ok({ schema: FUSED_GENOME_SCHEMA, status: 'COMPLETE', narrativeHash, emotionalHash, fusedHash });
}
