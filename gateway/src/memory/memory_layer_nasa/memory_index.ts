/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA PROJECT — MEMORY_LAYER
 * memory_index.ts — Hash Index NASA-Grade
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * VERSION     : 1.0.0-NASA
 * PHASE       : 10B
 * STANDARD    : DO-178C Level A / MIL-STD-882E
 * 
 * INVARIANTS COUVERTS :
 *   INV-MEM-02 : Deterministic Retrieval (même hash → même record)
 *   INV-MEM-06 : Hash Integrity (index par hash vérifié)
 *   INV-MEM-08 : Query Isolation (lecture seule)
 * 
 * ARCHITECTURE :
 *   Index read-only qui pointe vers les records du store.
 *   Aucune mutation possible après indexation.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { MemoryErrors, type MemoryResult, success, failure } from "./memory_errors.js";
import { isValidHash, hashToId } from "./memory_hash.js";

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — INDEX ENTRY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Entrée d'index — référence vers un record
 */
export interface IndexEntry {
  /** Hash du record (clé primaire) */
  readonly record_hash: string;
  
  /** Clé du record */
  readonly key: string;
  
  /** Version du record */
  readonly version: number;
  
  /** Timestamp d'indexation */
  readonly indexed_at_utc: string;
}

/**
 * Type guard pour IndexEntry
 */
export function isIndexEntry(value: unknown): value is IndexEntry {
  if (!value || typeof value !== "object") return false;
  
  const entry = value as Record<string, unknown>;
  
  return (
    typeof entry.record_hash === "string" &&
    entry.record_hash.length === 64 &&
    typeof entry.key === "string" &&
    typeof entry.version === "number" &&
    entry.version >= 1 &&
    typeof entry.indexed_at_utc === "string"
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — MEMORY INDEX CLASS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Index de mémoire — accès O(1) par hash
 * 
 * INVARIANTS :
 *   - Append-only (pas de delete, pas d'update)
 *   - Lookup déterministe (même hash → même résultat)
 *   - Read-only après indexation (Query Isolation)
 */
export class MemoryIndex {
  /** Index principal : hash → IndexEntry */
  private readonly byHash: Map<string, IndexEntry> = new Map();
  
  /** Index secondaire : key → hash[] (pour lookup par clé) */
  private readonly byKey: Map<string, string[]> = new Map();
  
  /** Index tertiaire : key:version → hash (pour lookup précis) */
  private readonly byKeyVersion: Map<string, string> = new Map();
  
  /** Compteur d'entrées */
  private entryCount: number = 0;
  
  // ─────────────────────────────────────────────────────────────────────────────
  // INDEXATION (APPEND-ONLY)
  // ─────────────────────────────────────────────────────────────────────────────
  
  /**
   * Indexe un record
   * 
   * INV-MEM-01 : Append-only (nouveau record uniquement)
   * 
   * @returns Success avec l'entrée indexée, ou Failure si déjà indexé
   */
  index(
    recordHash: string,
    key: string,
    version: number
  ): MemoryResult<IndexEntry> {
    // Validation du hash
    if (!isValidHash(recordHash)) {
      return failure(MemoryErrors.invalidKey(recordHash, "Invalid hash format"));
    }
    
    // Validation de la clé
    if (!key || key.length === 0) {
      return failure(MemoryErrors.invalidKey(key, "Key cannot be empty"));
    }
    
    // Validation de la version
    if (version < 1 || !Number.isInteger(version)) {
      return failure(MemoryErrors.schemaViolation("version", "positive integer", String(version)));
    }
    
    // INV-MEM-01 : Vérifier que le hash n'existe pas déjà
    if (this.byHash.has(recordHash)) {
      // Pas d'erreur, c'est idempotent — retourne l'existant
      const existing = this.byHash.get(recordHash)!;
      return success(existing);
    }
    
    // Créer l'entrée d'index
    const entry: IndexEntry = Object.freeze({
      record_hash: recordHash,
      key,
      version,
      indexed_at_utc: new Date().toISOString(),
    });
    
    // Indexer par hash (index primaire)
    this.byHash.set(recordHash, entry);
    
    // Indexer par clé (index secondaire)
    const existingHashes = this.byKey.get(key) ?? [];
    this.byKey.set(key, [...existingHashes, recordHash]);
    
    // Indexer par key:version (index tertiaire)
    const keyVersionKey = `${key}:${version}`;
    this.byKeyVersion.set(keyVersionKey, recordHash);
    
    this.entryCount++;
    
    return success(entry);
  }
  
  /**
   * Indexe plusieurs records en batch
   * 
   * @returns Nombre de records indexés (nouveaux)
   */
  indexBatch(
    records: ReadonlyArray<{ hash: string; key: string; version: number }>
  ): number {
    let indexed = 0;
    
    for (const record of records) {
      const result = this.index(record.hash, record.key, record.version);
      if (result.success && !this.byHash.has(record.hash)) {
        indexed++;
      }
    }
    
    return indexed;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // LOOKUP (READ-ONLY) — INV-MEM-08
  // ─────────────────────────────────────────────────────────────────────────────
  
  /**
   * Lookup par hash
   * 
   * INV-MEM-02 : Déterministe (même hash → même résultat)
   */
  lookupByHash(hash: string): IndexEntry | null {
    return this.byHash.get(hash) ?? null;
  }
  
  /**
   * Lookup par clé (retourne tous les hashes pour cette clé)
   * 
   * INV-MEM-02 : Déterministe
   */
  lookupByKey(key: string): readonly string[] {
    return this.byKey.get(key) ?? [];
  }
  
  /**
   * Lookup par clé et version (retourne le hash exact)
   * 
   * INV-MEM-02 : Déterministe
   */
  lookupByKeyVersion(key: string, version: number): string | null {
    const keyVersionKey = `${key}:${version}`;
    return this.byKeyVersion.get(keyVersionKey) ?? null;
  }
  
  /**
   * Vérifie si un hash existe dans l'index
   */
  has(hash: string): boolean {
    return this.byHash.has(hash);
  }
  
  /**
   * Vérifie si une clé existe dans l'index
   */
  hasKey(key: string): boolean {
    return this.byKey.has(key);
  }
  
  /**
   * Retourne le nombre de versions pour une clé
   */
  getVersionCount(key: string): number {
    return this.byKey.get(key)?.length ?? 0;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // LIST OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────────
  
  /**
   * Liste tous les hashes (triés pour déterminisme)
   */
  listHashes(): readonly string[] {
    return Array.from(this.byHash.keys()).sort();
  }
  
  /**
   * Liste toutes les clés (triées pour déterminisme)
   */
  listKeys(): readonly string[] {
    return Array.from(this.byKey.keys()).sort();
  }
  
  /**
   * Liste les entrées d'index (triées par hash pour déterminisme)
   */
  listEntries(): readonly IndexEntry[] {
    const entries: IndexEntry[] = [];
    
    for (const hash of this.listHashes()) {
      const entry = this.byHash.get(hash);
      if (entry) {
        entries.push(entry);
      }
    }
    
    return entries;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // STATISTICS
  // ─────────────────────────────────────────────────────────────────────────────
  
  /**
   * Retourne le nombre d'entrées dans l'index
   */
  getEntryCount(): number {
    return this.entryCount;
  }
  
  /**
   * Retourne le nombre de clés distinctes
   */
  getKeyCount(): number {
    return this.byKey.size;
  }
  
  /**
   * Retourne des statistiques sur l'index
   */
  getStats(): IndexStats {
    return Object.freeze({
      entry_count: this.entryCount,
      key_count: this.byKey.size,
      computed_at_utc: new Date().toISOString(),
    });
  }
}

/**
 * Statistiques de l'index
 */
export interface IndexStats {
  readonly entry_count: number;
  readonly key_count: number;
  readonly computed_at_utc: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — INDEX BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Input pour construire un index
 */
export interface IndexBuildInput<T> {
  /** Records à indexer */
  readonly records: ReadonlyArray<T>;
  
  /** Extracteur de hash */
  readonly getHash: (record: T) => string;
  
  /** Extracteur de clé */
  readonly getKey: (record: T) => string;
  
  /** Extracteur de version */
  readonly getVersion: (record: T) => number;
}

/**
 * Construit un index à partir de records
 */
export function buildIndex<T>(input: IndexBuildInput<T>): MemoryIndex {
  const index = new MemoryIndex();
  
  for (const record of input.records) {
    const hash = input.getHash(record);
    const key = input.getKey(record);
    const version = input.getVersion(record);
    
    index.index(hash, key, version);
  }
  
  return index;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — INDEX VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Résultat de vérification d'index
 */
export interface IndexVerificationResult {
  readonly valid: boolean;
  readonly entry_count: number;
  readonly errors: readonly string[];
}

/**
 * Vérifie l'intégrité de l'index
 */
export function verifyIndex(index: MemoryIndex): IndexVerificationResult {
  const errors: string[] = [];
  let entryCount = 0;
  
  // Vérifier chaque entrée
  for (const entry of index.listEntries()) {
    entryCount++;
    
    // Vérifier que le hash est valide
    if (!isValidHash(entry.record_hash)) {
      errors.push(`Invalid hash format: ${hashToId(entry.record_hash, 8)}...`);
    }
    
    // Vérifier que le lookup par hash retourne l'entrée
    const lookedUp = index.lookupByHash(entry.record_hash);
    if (!lookedUp || lookedUp.key !== entry.key) {
      errors.push(`Hash lookup mismatch for ${entry.key}`);
    }
    
    // Vérifier que le lookup par key:version retourne le bon hash
    const hashByKeyVersion = index.lookupByKeyVersion(entry.key, entry.version);
    if (hashByKeyVersion !== entry.record_hash) {
      errors.push(`Key:version lookup mismatch for ${entry.key}:${entry.version}`);
    }
  }
  
  return Object.freeze({
    valid: errors.length === 0,
    entry_count: entryCount,
    errors: Object.freeze([...errors]),
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — DETERMINISM VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Vérifie le déterminisme des lookups
 * 
 * INV-MEM-02 : Même input → même output
 * 
 * @param index Index à vérifier
 * @param iterations Nombre d'itérations
 * @returns true si tous les lookups sont déterministes
 */
export function verifyIndexDeterminism(
  index: MemoryIndex,
  iterations: number = 100
): boolean {
  const hashes = index.listHashes();
  const keys = index.listKeys();
  
  // Vérifier chaque hash
  for (const hash of hashes) {
    const firstResult = index.lookupByHash(hash);
    
    for (let i = 1; i < iterations; i++) {
      const result = index.lookupByHash(hash);
      
      if (result?.record_hash !== firstResult?.record_hash) {
        return false;
      }
    }
  }
  
  // Vérifier chaque clé
  for (const key of keys) {
    const firstResult = JSON.stringify(index.lookupByKey(key));
    
    for (let i = 1; i < iterations; i++) {
      const result = JSON.stringify(index.lookupByKey(key));
      
      if (result !== firstResult) {
        return false;
      }
    }
  }
  
  return true;
}
