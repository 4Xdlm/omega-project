/**
 * OMEGA Book-Factory — C3 MEMORYLAYERACL — TYPES & PORT (BF-08, D1 signé)
 *
 * DÉCOUVERTE D'ÈRE (documentée, evidence C3) : `gateway/` importe SANS extensions
 * (`from "./memory_store"`, memory_hybrid.ts:25) = résolution pré-ESM ; un paquet
 * `type:module/nodenext` NE PEUT PAS compiler ses sources directement. C'est
 * l'explication MÉCANIQUE du « zéro importeur » constaté au forensic (V1 ✓✓).
 * CONSÉQUENCE (conforme ADR §17 R6 era-drift + BF-05 zéro mutation) : l'ACL est un
 * PORT STRUCTUREL épinglé sur les signatures RÉELLES du gateway (citations
 * file:line ci-dessous), + un adaptateur de référence in-memory aux sémantiques
 * MIROIR (hot/warm/cold, digest borné, snapshot, hash de résultat). La conformité
 * comportementale du gateway est prouvée par SA PROPRE suite scellée (~273 tests),
 * exécutée comme évidence d'intégration. Le câblage runtime direct exigerait un
 * build ESM du gateway = décision Architecte (gateway FROZEN), tracée C3-W1.
 *
 * Signatures épinglées (era-pin, vérifiées 2026-06-06) :
 *  - MemoryStore.getLatest/getByVersion/getHistory/listKeys/verifyChain
 *    (gateway/src/memory/memory_layer_nasa/memory_store.ts:246,256,267,290,391)
 *  - splitHybridView(entries, metaEvents) → {shortTerm, longTerm} (memory_hybrid.ts:113-129)
 *  - QueryEngine/computeResultHash/canonicalStringCompare (memory_query.ts:209,189,161)
 *
 * INVARIANTS : INV-MEM-ACL-001 read-only PAR ABSENCE (le port n'expose AUCUNE écriture)
 *  002 zéro mutation gateway (aucun import gateway dans src — par construction d'ère)
 *  003 era-pin : attach() vérifie la FORME du fournisseur, dérive ⇒ échec typé
 *  004 même requête ⇒ même result_hash   005 hashes propagés vers RecallPack.
 */

import type { Brand, Result, Sha256Hex } from '../identity/identity-types.js';

export type EntityKey = Brand<string, 'EntityKey'>; // clé canonique world-model (ex: char.<id>)
export type MemTier = 'HOT' | 'WARM' | 'COLD';

/** Entrée mémoire — MIROIR structurel de MemoryEntry gateway (champs consommés en lecture). */
export interface WorldEntry {
  readonly entry_id: string;
  readonly canonical_key: EntityKey;
  readonly version: number;
  readonly payload: unknown;
  readonly payload_hash: string;
}

export interface QuerySlice {
  readonly entries: readonly WorldEntry[];
  readonly resultHash: Sha256Hex; // INV-MEM-ACL-004
}

export interface DigestSlice {
  readonly summary: string; // résumé déterministe borné (mots ≤ budget)
  readonly sourceEntryIds: readonly string[];
  readonly resultHash: Sha256Hex;
}

export interface SnapshotRef {
  readonly snapshotId: string;
  readonly entryCount: number;
  readonly stateHash: Sha256Hex;
}

/** PORT read-only — l'écriture N'EXISTE PAS sur ce type (INV-MEM-ACL-001). */
export interface WorldModelReadPort {
  readonly tierOf: (key: EntityKey) => MemTier;
  readonly entriesOf: (key: EntityKey) => readonly WorldEntry[];
  readonly allKeys: () => readonly EntityKey[];
}

/** Era-pin : forme attendue du fournisseur (vérifiée à l'attach, jamais supposée). */
export interface GatewayShapePin {
  readonly expectedFns: readonly (keyof WorldModelReadPort)[];
  readonly eraTag: string; // ex: 'memory_layer_nasa@phase8-10D-preESM'
}

export type AclError =
  | { readonly code: 'ERA_DRIFT'; readonly missing: readonly string[]; readonly eraTag: string }
  | { readonly code: 'UNKNOWN_KEY'; readonly key: EntityKey };

export type AclResult<T> = Result<T, AclError>;
