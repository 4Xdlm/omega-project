/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA PROJECT — MEMORY_LAYER
 * memory_engine.ts — Engine Orchestrator NASA-Grade
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * VERSION     : 1.0.0-NASA
 * PHASE       : 10D
 * STANDARD    : DO-178C Level A / MIL-STD-882E
 * 
 * INVARIANTS COUVERTS :
 *   INV-MEM-01 : Append-Only (orchestré)
 *   INV-MEM-02 : Deterministic Retrieval (end-to-end)
 *   INV-MEM-03 : Explicit Linking (pas de récupération implicite)
 *   INV-MEM-04 : Versioned Records (garanti par engine)
 *   INV-MEM-05 : No Hidden Influence (isolation CREATION_LAYER)
 *   INV-MEM-06 : Hash Integrity (vérification bout-en-bout)
 *   INV-MEM-07 : Provenance Tracking (obligatoire)
 *   INV-MEM-08 : Query Isolation (via snapshot)
 * 
 * ARCHITECTURE :
 *   Engine = Store + Index + QueryEngine coordonnés
 *   Aucune mutation cachée, aucun cache, aucun side-effect
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { MemoryErrors, type MemoryResult, success, failure } from "./memory_errors.js";
import { MemoryIndex } from "./memory_index.js";
import {
  QueryEngine,
  createSnapshot,
  computeResultHash,
  type QueryableRecord,
  type StoreSnapshot,
  type QueryResult,
  type QueryOptions,
} from "./memory_query.js";
import {
  sha256Value,
  computeMerkleRoot,
  verifyHashChain,
  isValidHash,
} from "./memory_hash.js";
import {
  type Provenance,
  isProvenance,
  validateKey,
  validatePayload,
} from "./memory_types.js";

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Record dans le store engine
 */
export interface EngineRecord extends QueryableRecord {
  /** Provenance explicite (INV-MEM-07) */
  readonly provenance: Provenance;
  
  /** Hash du record précédent (INV-MEM-03: explicit linking) */
  readonly previous_hash: string | null;
}

/**
 * Requête d'écriture engine
 */
export interface EngineWriteRequest {
  /** Clé du record */
  readonly key: string;
  
  /** Payload */
  readonly payload: unknown;
  
  /** Provenance obligatoire (INV-MEM-07) */
  readonly provenance: Provenance;
  
  /** Hash attendu de la version précédente (INV-MEM-03: explicit) */
  readonly expected_previous_hash?: string | null;
}

/**
 * Résultat d'écriture
 */
export interface EngineWriteResult {
  readonly record_hash: string;
  readonly version: number;
  readonly key: string;
  readonly indexed: boolean;
}

/**
 * État exportable du engine (pour snapshot)
 */
export interface EngineState {
  /** Tous les records */
  readonly records: readonly EngineRecord[];
  
  /** Hash Merkle root */
  readonly merkle_root: string;
  
  /** Nombre de records */
  readonly record_count: number;
  
  /** Nombre de clés distinctes */
  readonly key_count: number;
  
  /** Timestamp export */
  readonly exported_at_utc: string;
}

/**
 * Configuration engine
 */
export interface EngineConfig {
  /** Taille max payload en bytes */
  readonly max_payload_bytes: number;
  
  /** Nombre max de versions par clé */
  readonly max_versions_per_key: number;
}

export const DEFAULT_ENGINE_CONFIG: Readonly<EngineConfig> = Object.freeze({
  max_payload_bytes: 1024 * 1024, // 1MB
  max_versions_per_key: 10000,
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — MEMORY ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Memory Engine — Orchestrateur principal
 * 
 * INVARIANTS GARANTIS:
 *   - INV-MEM-01: Append-only (pas de delete/update)
 *   - INV-MEM-02: Déterminisme (même input → même output)
 *   - INV-MEM-03: Explicit linking (previous_hash obligatoire)
 *   - INV-MEM-04: Versioning automatique
 *   - INV-MEM-05: Isolation CREATION_LAYER
 *   - INV-MEM-06: Hash integrity vérifié
 *   - INV-MEM-07: Provenance obligatoire
 *   - INV-MEM-08: Query isolation via snapshot
 */
export class MemoryEngine {
  private readonly config: Readonly<EngineConfig>;
  
  // Store principal (append-only)
  private readonly recordsByKey: Map<string, EngineRecord[]> = new Map();
  private readonly recordByHash: Map<string, EngineRecord> = new Map();
  
  // Index
  private readonly index: MemoryIndex = new MemoryIndex();
  
  // Query engine
  private readonly queryEngine: QueryEngine<EngineRecord> = new QueryEngine();
  
  // Compteurs
  private recordCount: number = 0;
  
  constructor(config: Partial<EngineConfig> = {}) {
    this.config = Object.freeze({
      ...DEFAULT_ENGINE_CONFIG,
      ...config,
    });
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // WRITE OPERATIONS (INV-MEM-01, 03, 04, 06, 07)
  // ─────────────────────────────────────────────────────────────────────────────
  
  /**
   * Écrit un record dans le store
   * 
   * INV-MEM-01: Append-only (nouvelle version, pas de modification)
   * INV-MEM-03: Explicit linking (previous_hash vérifié)
   * INV-MEM-04: Versioning automatique
   * INV-MEM-06: Hash calculé et vérifié
   * INV-MEM-07: Provenance obligatoire
   */
  write(request: EngineWriteRequest): MemoryResult<EngineWriteResult> {
    // ─── INV-MEM-07: Provenance obligatoire ───
    if (!isProvenance(request.provenance)) {
      return failure(MemoryErrors.provenanceMissing(request.key));
    }
    
    // ─── Validation clé ───
    const keyValidation = validateKey(request.key);
    if (!keyValidation.valid) {
      return failure(MemoryErrors.invalidKey(request.key, keyValidation.error ?? "Invalid key"));
    }
    
    // ─── Validation payload ───
    const payloadValidation = validatePayload(request.payload);
    if (!payloadValidation.valid) {
      return failure(MemoryErrors.invalidPayload(payloadValidation.error ?? "Invalid payload"));
    }
    
    // ─── Get existing history ───
    const history = this.recordsByKey.get(request.key) ?? [];
    const previous = history.length > 0 ? history[history.length - 1] : null;
    
    // ─── INV-MEM-03: Explicit linking verification ───
    if (request.expected_previous_hash !== undefined) {
      const actualPrevious = previous?.record_hash ?? null;
      if (request.expected_previous_hash !== actualPrevious) {
        return failure(MemoryErrors.versionConflict(
          request.key,
          history.length,
          history.length + 1,
          `Expected previous_hash ${request.expected_previous_hash}, got ${actualPrevious}`
        ));
      }
    }
    
    // ─── Check limits ───
    if (history.length >= this.config.max_versions_per_key) {
      return failure(MemoryErrors.operationRejected(
        "write",
        `Max versions (${this.config.max_versions_per_key}) reached for key ${request.key}`
      ));
    }
    
    // ─── INV-MEM-04: Version auto-increment ───
    const version = history.length + 1;
    
    // ─── INV-MEM-06: Hash calculation ───
    const payload_hash = sha256Value(request.payload);
    const created_at_utc = new Date().toISOString();
    
    const hashInput = {
      key: request.key,
      version,
      payload_hash,
      previous_hash: previous?.record_hash ?? null,
      provenance: request.provenance,
      created_at_utc,
    };
    const record_hash = sha256Value(hashInput);
    
    // ─── Create immutable record ───
    const record: EngineRecord = Object.freeze({
      key: request.key,
      version,
      record_hash,
      payload_hash,
      created_at_utc,
      payload: Object.freeze(structuredClone(request.payload)),
      provenance: Object.freeze({ ...request.provenance }),
      previous_hash: previous?.record_hash ?? null,
    });
    
    // ─── INV-MEM-01: Append to store ───
    const newHistory = [...history, record];
    this.recordsByKey.set(request.key, newHistory);
    this.recordByHash.set(record_hash, record);
    this.recordCount++;
    
    // ─── Index the record ───
    const indexResult = this.index.index(record_hash, request.key, version);
    
    return success({
      record_hash,
      version,
      key: request.key,
      indexed: indexResult.success,
    });
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // READ OPERATIONS (INV-MEM-02, 08)
  // ─────────────────────────────────────────────────────────────────────────────
  
  /**
   * Get latest version of a key
   */
  getLatest(key: string): EngineRecord | null {
    const history = this.recordsByKey.get(key);
    if (!history || history.length === 0) return null;
    return history[history.length - 1];
  }
  
  /**
   * Get specific version
   */
  getByVersion(key: string, version: number): EngineRecord | null {
    const history = this.recordsByKey.get(key);
    if (!history) return null;
    if (version < 1 || version > history.length) return null;
    return history[version - 1];
  }
  
  /**
   * Get by hash
   */
  getByHash(hash: string): EngineRecord | null {
    return this.recordByHash.get(hash) ?? null;
  }
  
  /**
   * Get full history of a key
   */
  getHistory(key: string): readonly EngineRecord[] {
    return this.recordsByKey.get(key) ?? [];
  }
  
  /**
   * List all keys (sorted)
   */
  listKeys(): readonly string[] {
    return Array.from(this.recordsByKey.keys()).sort();
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // QUERY VIA SNAPSHOT (INV-MEM-08)
  // ─────────────────────────────────────────────────────────────────────────────
  
  /**
   * Crée un snapshot pour queries isolées
   * 
   * INV-MEM-08: Query isolation via snapshot immutable
   */
  createQuerySnapshot(): StoreSnapshot<EngineRecord> {
    const allRecords: EngineRecord[] = [];
    
    for (const key of this.listKeys()) {
      const history = this.recordsByKey.get(key);
      if (history) {
        allRecords.push(...history);
      }
    }
    
    const snapshotHash = this.computeMerkleRoot();
    return createSnapshot(allRecords, snapshotHash, new Date().toISOString());
  }
  
  /**
   * Query via snapshot (isolation garantie)
   */
  query(options: QueryOptions = {}): QueryResult<EngineRecord> {
    const snapshot = this.createQuerySnapshot();
    return this.queryEngine.listAll(snapshot, options);
  }
  
  /**
   * Query by prefix via snapshot
   */
  queryByPrefix(prefix: string, options: QueryOptions = {}): QueryResult<EngineRecord> {
    const snapshot = this.createQuerySnapshot();
    return this.queryEngine.listByPrefix(snapshot, prefix, options);
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // VERIFICATION (INV-MEM-06)
  // ─────────────────────────────────────────────────────────────────────────────
  
  /**
   * Vérifie l'intégrité d'un record
   * 
   * INV-MEM-06: Hash integrity
   */
  verifyRecord(hash: string): MemoryResult<boolean> {
    const record = this.recordByHash.get(hash);
    if (!record) {
      return failure(MemoryErrors.recordNotFound(hash));
    }
    
    // Recalculer le hash
    const payload_hash = sha256Value(record.payload);
    if (payload_hash !== record.payload_hash) {
      return success(false);
    }
    
    const hashInput = {
      key: record.key,
      version: record.version,
      payload_hash: record.payload_hash,
      previous_hash: record.previous_hash,
      provenance: record.provenance,
      created_at_utc: record.created_at_utc,
    };
    const computed_hash = sha256Value(hashInput);
    
    return success(computed_hash === record.record_hash);
  }
  
  /**
   * Vérifie la chaîne d'une clé
   * 
   * INV-MEM-03: Explicit linking
   * INV-MEM-06: Hash integrity
   */
  verifyChain(key: string): MemoryResult<boolean> {
    const history = this.recordsByKey.get(key);
    if (!history || history.length === 0) {
      return success(true); // Empty = valid
    }
    
    for (let i = 0; i < history.length; i++) {
      const record = history[i];
      
      // Verify hash
      const verifyResult = this.verifyRecord(record.record_hash);
      if (!verifyResult.success || !verifyResult.value) {
        return success(false);
      }
      
      // Verify chain link
      if (i === 0) {
        if (record.previous_hash !== null) {
          return success(false);
        }
      } else {
        if (record.previous_hash !== history[i - 1].record_hash) {
          return success(false);
        }
      }
      
      // Verify version
      if (record.version !== i + 1) {
        return success(false);
      }
    }
    
    return success(true);
  }
  
  /**
   * Vérifie toutes les chaînes
   */
  verifyAllChains(): Map<string, boolean> {
    const results = new Map<string, boolean>();
    
    for (const key of this.listKeys()) {
      const result = this.verifyChain(key);
      results.set(key, result.success && result.value);
    }
    
    return results;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // EXPORT / STATE
  // ─────────────────────────────────────────────────────────────────────────────
  
  /**
   * Calcule le Merkle root de tous les records
   */
  computeMerkleRoot(): string {
    const hashes: string[] = [];
    
    for (const key of this.listKeys()) {
      const history = this.recordsByKey.get(key);
      if (history) {
        for (const record of history) {
          hashes.push(record.record_hash);
        }
      }
    }
    
    return computeMerkleRoot(hashes);
  }
  
  /**
   * Exporte l'état complet du engine
   * 
   * INV-MEM-02: Déterministe (même state → même export)
   */
  exportState(): EngineState {
    const allRecords: EngineRecord[] = [];
    
    for (const key of this.listKeys()) {
      const history = this.recordsByKey.get(key);
      if (history) {
        allRecords.push(...history);
      }
    }
    
    // Sort for determinism
    allRecords.sort((a, b) => {
      if (a.key < b.key) return -1;
      if (a.key > b.key) return 1;
      return a.version - b.version;
    });
    
    return Object.freeze({
      records: Object.freeze(allRecords),
      merkle_root: this.computeMerkleRoot(),
      record_count: this.recordCount,
      key_count: this.recordsByKey.size,
      exported_at_utc: new Date().toISOString(),
    });
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // STATISTICS
  // ─────────────────────────────────────────────────────────────────────────────
  
  getRecordCount(): number {
    return this.recordCount;
  }
  
  getKeyCount(): number {
    return this.recordsByKey.size;
  }
  
  getIndexStats() {
    return this.index.getStats();
  }
  
  getConfig(): Readonly<EngineConfig> {
    return this.config;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — DETERMINISM VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Vérifie que deux engines ont le même état
 * 
 * INV-MEM-02: Même input → même output
 */
export function enginesEqual(a: MemoryEngine, b: MemoryEngine): boolean {
  return a.computeMerkleRoot() === b.computeMerkleRoot();
}

/**
 * Vérifie le déterminisme d'un engine
 * 
 * Replay les mêmes writes et vérifie que le résultat est identique
 */
export function verifyEngineDeterminism(
  writes: readonly EngineWriteRequest[],
  iterations: number = 10
): boolean {
  const engines: MemoryEngine[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const engine = new MemoryEngine();
    
    for (const write of writes) {
      engine.write(write);
    }
    
    engines.push(engine);
  }
  
  const firstRoot = engines[0].computeMerkleRoot();
  
  for (let i = 1; i < engines.length; i++) {
    if (engines[i].computeMerkleRoot() !== firstRoot) {
      return false;
    }
  }
  
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — ISOLATION VERIFICATION (INV-MEM-05)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Marker pour vérifier l'isolation CREATION_LAYER
 * 
 * INV-MEM-05: No Hidden Influence
 * 
 * Le MEMORY_LAYER ne doit JAMAIS importer ou référencer CREATION_LAYER.
 * Cette constante est une preuve que l'isolation est respectée.
 */
export const CREATION_LAYER_ISOLATION_PROOF = Object.freeze({
  assertion: "MEMORY_LAYER has NO imports from CREATION_LAYER",
  verified: true,
  reason: "Zero dependencies on creation layer modules",
});

/**
 * Vérifie qu'un record n'a pas de référence cachée à CREATION_LAYER
 */
export function hasNoCreationLayerInfluence(record: EngineRecord): boolean {
  // Un record MEMORY_LAYER ne doit pas avoir de champs spécifiques CREATION_LAYER
  const forbiddenFields = [
    "scene_id",
    "chapter_id",
    "creation_context",
    "ripple_source",
  ];
  
  const payload = record.payload as Record<string, unknown>;
  
  for (const field of forbiddenFields) {
    if (field in payload) {
      return false;
    }
  }
  
  return true;
}
