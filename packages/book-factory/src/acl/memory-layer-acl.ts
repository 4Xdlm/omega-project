/**
 * OMEGA Book-Factory — C3 MEMORYLAYERACL (BF-08, D1) — lecture seule PAR CONSTRUCTION.
 * Voir acl-types.ts pour la découverte d'ère et l'épinglage des signatures gateway.
 *
 * MÉCANISME : l'ACL s'attache à un WorldModelReadPort (fournisseur injecté — adaptateur
 * gateway quand le build ESM existera [C3-W1], adaptateur de référence in-memory
 * d'ici là, sémantiques MIROIR des sous-modules scellés). Toutes les lectures sont
 * triées canoniquement (compareStrings — cross-machine) et hachées (canonicalize+sha256,
 * mêmes primitives que les 67 tests canon-kernel). Le digest COLD est borné par budget
 * de mots, déterministe, sources tracées.
 * LIMITES : le digest V1 = concaténation triée tronquée AU MOT près (résumé extractif,
 * pas abstractive — un résumé LLM serait un instrument EMP-19) ; la classification de
 * tiers du fournisseur de référence = par clé (politique simple injectée), la politique
 * temporelle complète vit dans le gateway (computeTieringActions, CNC-054) et sera
 * empruntée telle quelle au câblage C3-W1.
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';

import type { Sha256Hex } from '../identity/identity-types.js';
import { compareStrings, err, ok } from '../identity/identity-types.js';
import type {
  AclResult,
  DigestSlice,
  EntityKey,
  GatewayShapePin,
  MemTier,
  QuerySlice,
  SnapshotRef,
  WorldEntry,
  WorldModelReadPort,
} from './acl-types.js';

export class MemoryLayerACL {
  private constructor(private readonly port: WorldModelReadPort) {}

  /** INV-MEM-ACL-003 : era-pin — la forme du fournisseur est VÉRIFIÉE, jamais supposée. */
  static attach(provider: WorldModelReadPort, pin: GatewayShapePin): AclResult<MemoryLayerACL> {
    const missing = pin.expectedFns.filter((fn) => typeof provider[fn] !== 'function');
    if (missing.length > 0) {
      return err({ code: 'ERA_DRIFT', missing: missing.map(String), eraTag: pin.eraTag });
    }
    return ok(new MemoryLayerACL(provider));
  }

  private slice(key: EntityKey, tiers: readonly MemTier[]): AclResult<QuerySlice> {
    const all = this.port.allKeys();
    if (!all.includes(key)) return err({ code: 'UNKNOWN_KEY', key });
    const tier = this.port.tierOf(key);
    const entries = tiers.includes(tier)
      ? [...this.port.entriesOf(key)].sort(
          (a, b) => compareStrings(a.entry_id, b.entry_id) || a.version - b.version,
        )
      : [];
    const resultHash = sha256(
      canonicalize({ v: 1, key: String(key), tiers, ids: entries.map((e) => `${e.entry_id}@${e.version}`) }),
    ) as Sha256Hex;
    return ok({ entries, resultHash });
  }

  queryHot(key: EntityKey): AclResult<QuerySlice> {
    return this.slice(key, ['HOT']);
  }

  queryWarm(key: EntityKey): AclResult<QuerySlice> {
    return this.slice(key, ['HOT', 'WARM']); // warm inclut hot (vue court-terme, miroir splitHybridView)
  }

  /** Digest COLD borné — déterministe, sources tracées (jamais de perte silencieuse : compte exact). */
  queryColdDigest(key: EntityKey, budgetWords: number): AclResult<DigestSlice> {
    const all = this.port.allKeys();
    if (!all.includes(key)) return err({ code: 'UNKNOWN_KEY', key });
    const entries = [...this.port.entriesOf(key)].sort(
      (a, b) => compareStrings(a.entry_id, b.entry_id) || a.version - b.version,
    );
    const joined = entries
      .map((e) => (typeof e.payload === 'string' ? e.payload : JSON.stringify(e.payload)))
      .join(' · ');
    const words = joined.split(/\s+/u).filter((w) => w.length > 0);
    const kept = words.slice(0, Math.max(0, budgetWords));
    const truncated = kept.length < words.length;
    const summary = `${kept.join(' ')}${truncated ? ` … [+${words.length - kept.length} mots élidés]` : ''}`;
    const resultHash = sha256(
      canonicalize({ v: 1, key: String(key), budgetWords, summary }),
    ) as Sha256Hex;
    return ok({ summary, sourceEntryIds: entries.map((e) => e.entry_id), resultHash });
  }

  /** Photographie lisible de l'état accessible — pour evidence et replay (INV-MEM-ACL-005). */
  snapshot(): SnapshotRef {
    const keys = [...this.port.allKeys()].sort((a, b) => compareStrings(String(a), String(b)));
    const body = keys.map((k) => ({
      key: String(k),
      tier: this.port.tierOf(k),
      ids: this.port.entriesOf(k).map((e) => `${e.entry_id}@${e.version}:${e.payload_hash}`).sort(compareStrings),
    }));
    const stateHash = sha256(canonicalize({ v: 1, body })) as Sha256Hex;
    return {
      snapshotId: `wmsnap_${stateHash.slice(0, 16)}`,
      entryCount: body.reduce((n, b) => n + b.ids.length, 0),
      stateHash,
    };
  }
}

/* ───────────── Adaptateur de RÉFÉRENCE (sémantiques miroir, V1 runtime) ──────────── */
/**
 * Fournisseur in-memory append-only. Le SEUL chemin d'écriture est la CONSTRUCTION
 * (l'instance exposée à l'ACL est le port read-only — INV-MEM-ACL-001 par absence).
 */
export function buildReferenceWorldModel(
  rows: readonly { readonly key: EntityKey; readonly tier: MemTier; readonly payloads: readonly unknown[] }[],
): WorldModelReadPort {
  const entries = new Map<EntityKey, readonly WorldEntry[]>();
  const tiers = new Map<EntityKey, MemTier>();
  for (const r of rows) {
    tiers.set(r.key, r.tier);
    entries.set(
      r.key,
      r.payloads.map((p, i): WorldEntry => {
        const payload_hash = sha256(canonicalize({ p }));
        return {
          entry_id: `we_${sha256(canonicalize({ k: String(r.key), i })).slice(0, 12)}`,
          canonical_key: r.key,
          version: i + 1,
          payload: p,
          payload_hash,
        };
      }),
    );
  }
  return {
    tierOf: (k) => tiers.get(k) ?? 'COLD',
    entriesOf: (k) => entries.get(k) ?? [],
    allKeys: () => [...entries.keys()],
  };
}

/** Pin standard du fournisseur V1 (forme complète du port). */
export const REFERENCE_PIN: GatewayShapePin = {
  expectedFns: ['tierOf', 'entriesOf', 'allKeys'],
  eraTag: 'memory_layer_nasa@phase8-10D-preESM/reference-mirror-v1',
};
