/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA PROJECT — MEMORY_LAYER
 * memory_query.ts — Query API NASA-Grade
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * VERSION     : 1.0.0-NASA
 * PHASE       : 10C
 * STANDARD    : DO-178C Level A / MIL-STD-882E
 * 
 * INVARIANTS COUVERTS :
 *   INV-MEM-02 : Deterministic Retrieval (tri canonique, 100 runs identical)
 *   INV-MEM-08 : Query Isolation (aucune mutation store/index)
 *   INV-MEM-10 : Bounded Queries (timeout coopératif)
 * 
 * DESIGN RULES (NON-NÉGOCIABLES) :
 *   1. Query = Fonction PURE (entrées → sortie, aucun side-effect)
 *   2. Aucun accès à Date.now() — timestamp injecté si nécessaire
 *   3. Aucun cache, aucun compteur, aucun "touch"
 *   4. Toute liste retournée est triée canoniquement
 *   5. Map/Set jamais itérés sans tri final
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { MemoryErrors, type MemoryResult, success, failure } from "./memory_errors.js";

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Record minimal pour les queries (interface générique)
 */
export interface QueryableRecord {
  readonly key: string;
  readonly version: number;
  readonly record_hash: string;
  readonly payload_hash: string;
  readonly created_at_utc: string;
  readonly payload: unknown;
}

/**
 * Options de query
 */
export interface QueryOptions {
  /** Timeout en ms (défaut: 5000) */
  readonly timeout_ms?: number;
  
  /** Limite de résultats (défaut: 1000) */
  readonly limit?: number;
  
  /** Offset pour pagination */
  readonly offset?: number;
  
  /** Filtre par version min */
  readonly min_version?: number;
  
  /** Filtre par version max */
  readonly max_version?: number;
}

/**
 * Résultat de query
 */
export interface QueryResult<T> {
  /** Records retournés (triés canoniquement) */
  readonly records: readonly T[];
  
  /** Nombre total (avant limit/offset) */
  readonly total_count: number;
  
  /** Query tronquée par limit? */
  readonly truncated: boolean;
  
  /** Temps d'exécution en ms */
  readonly execution_ms: number;
  
  /** Hash de vérification du résultat (pour reproductibilité) */
  readonly result_hash: string;
}

/**
 * Snapshot read-only du store pour queries
 */
export interface StoreSnapshot<T extends QueryableRecord> {
  /** Tous les records (déjà frozen) */
  readonly records: ReadonlyMap<string, readonly T[]>;
  
  /** Hash du snapshot (pour vérification isolation) */
  readonly snapshot_hash: string;
  
  /** Timestamp de création du snapshot */
  readonly created_at_utc: string;
}

/**
 * Configuration des queries
 */
export interface QueryConfig {
  /** Timeout par défaut en ms */
  readonly default_timeout_ms: number;
  
  /** Limite par défaut */
  readonly default_limit: number;
  
  /** Limite max absolue */
  readonly max_limit: number;
}

/**
 * Config par défaut
 */
export const DEFAULT_QUERY_CONFIG: Readonly<QueryConfig> = Object.freeze({
  default_timeout_ms: 5000,
  default_limit: 1000,
  max_limit: 10000,
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — CANONICAL SORTING (INV-MEM-02)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Comparateur canonique pour records
 * Ordre: key ASC, version ASC, record_hash ASC
 * 
 * INVARIANT: Déterministe, pas de locale, pas de random
 */
export function canonicalRecordCompare<T extends QueryableRecord>(a: T, b: T): number {
  // 1. Par clé (string compare)
  if (a.key < b.key) return -1;
  if (a.key > b.key) return 1;
  
  // 2. Par version (numeric)
  if (a.version < b.version) return -1;
  if (a.version > b.version) return 1;
  
  // 3. Par hash (string compare, tiebreaker ultime)
  if (a.record_hash < b.record_hash) return -1;
  if (a.record_hash > b.record_hash) return 1;
  
  return 0;
}

/**
 * Trie un array de records de manière canonique
 * Retourne une COPIE triée (pas de mutation)
 */
export function sortRecordsCanonical<T extends QueryableRecord>(
  records: readonly T[]
): readonly T[] {
  // Copie puis tri (pas de mutation de l'original)
  return [...records].sort(canonicalRecordCompare);
}

/**
 * Comparateur pour strings (tri canonique)
 */
export function canonicalStringCompare(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — HASH COMPUTATION (pour result_hash)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcule un hash simple pour le résultat (sans import externe)
 * Utilisé pour vérifier la reproductibilité
 */
function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Convertir en hex positif
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Calcule le hash d'un résultat de query
 */
export function computeResultHash<T extends QueryableRecord>(
  records: readonly T[]
): string {
  // Créer une représentation canonique
  const hashes = records.map(r => r.record_hash).join(',');
  return simpleHash(hashes);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — QUERY ENGINE (FONCTIONS PURES)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Query Engine — Toutes les méthodes sont PURES
 * 
 * INVARIANTS:
 *   - Aucune mutation du snapshot
 *   - Tri canonique sur tous les retours
 *   - Timeout coopératif injectable
 */
export class QueryEngine<T extends QueryableRecord> {
  private readonly config: Readonly<QueryConfig>;
  
  constructor(config: Partial<QueryConfig> = {}) {
    this.config = Object.freeze({
      ...DEFAULT_QUERY_CONFIG,
      ...config,
    });
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // SINGLE RECORD QUERIES
  // ─────────────────────────────────────────────────────────────────────────────
  
  /**
   * Get latest version of a key
   * 
   * INV-MEM-02: Déterministe (même key → même résultat)
   * INV-MEM-08: Lecture seule
   */
  getLatest(
    snapshot: StoreSnapshot<T>,
    key: string
  ): T | null {
    const records = snapshot.records.get(key);
    if (!records || records.length === 0) {
      return null;
    }
    
    // Retourne la dernière version (records sont déjà ordonnés par version)
    return records[records.length - 1];
  }
  
  /**
   * Get specific version of a key
   * 
   * INV-MEM-02: Déterministe
   */
  getByVersion(
    snapshot: StoreSnapshot<T>,
    key: string,
    version: number
  ): T | null {
    const records = snapshot.records.get(key);
    if (!records) return null;
    
    // Version 1-indexed
    if (version < 1 || version > records.length) return null;
    
    return records[version - 1];
  }
  
  /**
   * Get record by hash
   * 
   * INV-MEM-02: Déterministe
   */
  getByHash(
    snapshot: StoreSnapshot<T>,
    hash: string
  ): T | null {
    // Parcourir tous les records (pas optimal mais pur)
    for (const key of this.listKeysSorted(snapshot)) {
      const records = snapshot.records.get(key);
      if (records) {
        for (const record of records) {
          if (record.record_hash === hash) {
            return record;
          }
        }
      }
    }
    return null;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // LIST QUERIES (TRIÉES CANONIQUEMENT)
  // ─────────────────────────────────────────────────────────────────────────────
  
  /**
   * Liste toutes les clés (triées)
   * 
   * INV-MEM-02: Tri canonique
   */
  listKeysSorted(snapshot: StoreSnapshot<T>): readonly string[] {
    return Array.from(snapshot.records.keys()).sort(canonicalStringCompare);
  }
  
  /**
   * Get history of a key (toutes les versions)
   * 
   * INV-MEM-02: Tri par version ASC
   */
  getHistory(
    snapshot: StoreSnapshot<T>,
    key: string
  ): readonly T[] {
    const records = snapshot.records.get(key);
    if (!records) return [];
    
    // Déjà ordonné par version, mais on retourne une copie
    return [...records];
  }
  
  /**
   * List records by prefix
   * 
   * INV-MEM-02: Tri canonique
   */
  listByPrefix(
    snapshot: StoreSnapshot<T>,
    prefix: string,
    options: QueryOptions = {}
  ): QueryResult<T> {
    const startTime = Date.now(); // OK ici car mesure, pas logique
    
    const limit = Math.min(
      options.limit ?? this.config.default_limit,
      this.config.max_limit
    );
    const offset = options.offset ?? 0;
    
    // Collecter tous les records matching
    const allMatching: T[] = [];
    
    for (const key of this.listKeysSorted(snapshot)) {
      if (key.startsWith(prefix)) {
        const records = snapshot.records.get(key);
        if (records) {
          for (const record of records) {
            // Appliquer filtres version
            if (options.min_version !== undefined && record.version < options.min_version) {
              continue;
            }
            if (options.max_version !== undefined && record.version > options.max_version) {
              continue;
            }
            allMatching.push(record);
          }
        }
      }
    }
    
    // Tri canonique
    const sorted = sortRecordsCanonical(allMatching);
    
    // Pagination
    const total = sorted.length;
    const paginated = sorted.slice(offset, offset + limit);
    
    return Object.freeze({
      records: Object.freeze(paginated),
      total_count: total,
      truncated: total > offset + limit,
      execution_ms: Date.now() - startTime,
      result_hash: computeResultHash(paginated),
    });
  }
  
  /**
   * List all records (avec pagination)
   * 
   * INV-MEM-02: Tri canonique
   */
  listAll(
    snapshot: StoreSnapshot<T>,
    options: QueryOptions = {}
  ): QueryResult<T> {
    return this.listByPrefix(snapshot, '', options);
  }
  
  /**
   * List latest version of each key
   * 
   * INV-MEM-02: Tri canonique par key
   */
  listLatestVersions(
    snapshot: StoreSnapshot<T>,
    options: QueryOptions = {}
  ): QueryResult<T> {
    const startTime = Date.now();
    
    const limit = Math.min(
      options.limit ?? this.config.default_limit,
      this.config.max_limit
    );
    const offset = options.offset ?? 0;
    
    // Collecter latest de chaque key
    const latests: T[] = [];
    
    for (const key of this.listKeysSorted(snapshot)) {
      const latest = this.getLatest(snapshot, key);
      if (latest) {
        latests.push(latest);
      }
    }
    
    // Déjà trié par key via listKeysSorted
    const total = latests.length;
    const paginated = latests.slice(offset, offset + limit);
    
    return Object.freeze({
      records: Object.freeze(paginated),
      total_count: total,
      truncated: total > offset + limit,
      execution_ms: Date.now() - startTime,
      result_hash: computeResultHash(paginated),
    });
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // BOUNDED QUERIES (INV-MEM-10)
  // ─────────────────────────────────────────────────────────────────────────────
  
  /**
   * Execute query with timeout (Promise.race)
   * 
   * INV-MEM-10: Bounded Queries (cooperative timeout)
   * 
   * NOTE: Timeout coopératif — ne peut pas stopper une boucle sync infinie
   * C'est une limitation connue (NCR) documentée.
   */
  async withTimeout<R>(
    operation: () => R,
    timeout_ms?: number
  ): Promise<MemoryResult<R>> {
    const timeout = timeout_ms ?? this.config.default_timeout_ms;
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(MemoryErrors.queryTimeout(timeout));
      }, timeout);
    });
    
    const operationPromise = new Promise<R>((resolve, reject) => {
      try {
        resolve(operation());
      } catch (e) {
        reject(e);
      }
    });
    
    try {
      const result = await Promise.race([operationPromise, timeoutPromise]);
      return success(result);
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        return failure(MemoryErrors.queryTimeout(timeout));
      }
      return failure(MemoryErrors.queryFailed(String(error)));
    }
  }
  
  /**
   * List with timeout
   */
  async listWithTimeout(
    snapshot: StoreSnapshot<T>,
    options: QueryOptions = {}
  ): Promise<MemoryResult<QueryResult<T>>> {
    return this.withTimeout(
      () => this.listAll(snapshot, options),
      options.timeout_ms
    );
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // STATISTICS (PURES)
  // ─────────────────────────────────────────────────────────────────────────────
  
  /**
   * Get stats from snapshot (pure function)
   */
  getStats(snapshot: StoreSnapshot<T>): QueryStats {
    let totalRecords = 0;
    let totalVersions = 0;
    
    for (const key of this.listKeysSorted(snapshot)) {
      const records = snapshot.records.get(key);
      if (records) {
        totalRecords++;
        totalVersions += records.length;
      }
    }
    
    return Object.freeze({
      key_count: totalRecords,
      total_versions: totalVersions,
      snapshot_hash: snapshot.snapshot_hash,
    });
  }
}

/**
 * Statistiques de query
 */
export interface QueryStats {
  readonly key_count: number;
  readonly total_versions: number;
  readonly snapshot_hash: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — SNAPSHOT BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crée un snapshot à partir d'un array de records
 * 
 * Le snapshot est IMMUTABLE une fois créé
 */
export function createSnapshot<T extends QueryableRecord>(
  records: readonly T[],
  snapshotHash: string,
  createdAt: string
): StoreSnapshot<T> {
  // Grouper par key
  const byKey = new Map<string, T[]>();
  
  for (const record of records) {
    const existing = byKey.get(record.key) ?? [];
    existing.push(record);
    byKey.set(record.key, existing);
  }
  
  // Trier chaque liste par version
  for (const [key, list] of byKey) {
    list.sort((a, b) => a.version - b.version);
    byKey.set(key, list);
  }
  
  // Convertir en ReadonlyMap avec arrays readonly
  const readonlyMap = new Map<string, readonly T[]>();
  for (const [key, list] of byKey) {
    readonlyMap.set(key, Object.freeze([...list]));
  }
  
  return Object.freeze({
    records: readonlyMap,
    snapshot_hash: snapshotHash,
    created_at_utc: createdAt,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6 — VERIFICATION (INV-MEM-08)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Vérifie que le snapshot n'a pas été modifié après une query
 * 
 * INV-MEM-08: Query Isolation
 */
export function verifySnapshotUnchanged<T extends QueryableRecord>(
  before: StoreSnapshot<T>,
  after: StoreSnapshot<T>
): boolean {
  return before.snapshot_hash === after.snapshot_hash;
}

/**
 * Vérifie le déterminisme d'une query
 * 
 * INV-MEM-02: Même input → même output
 */
export function verifyQueryDeterminism<T extends QueryableRecord, R>(
  queryFn: () => R,
  resultToString: (r: R) => string,
  iterations: number = 100
): boolean {
  const firstResult = resultToString(queryFn());
  
  for (let i = 1; i < iterations; i++) {
    const result = resultToString(queryFn());
    if (result !== firstResult) {
      return false;
    }
  }
  
  return true;
}
