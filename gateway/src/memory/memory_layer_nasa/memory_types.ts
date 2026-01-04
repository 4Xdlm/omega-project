/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA PROJECT — MEMORY_LAYER
 * memory_types.ts — Types & Interfaces NASA-Grade
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * VERSION     : 1.0.0-NASA
 * PHASE       : 10A
 * STANDARD    : DO-178C Level A / MIL-STD-882E
 * 
 * INVARIANTS COUVERTS :
 *   INV-MEM-04 : Versioned Records (version + timestamp obligatoires)
 *   INV-MEM-11 : Schema Validation (types stricts)
 * 
 * PRINCIPE :
 *   Tous les types sont IMMUTABLES par design (readonly partout).
 *   Aucune mutation possible après création.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — RECORD KEY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Clé de record — identifiant stable et prévisible
 * 
 * Format: namespace:identifier
 * Exemples: "char:alice", "scene:opening", "emotion:joy"
 */
export interface RecordKey {
  /** Namespace (catégorie) — ex: "char", "scene", "emotion" */
  readonly namespace: string;
  
  /** Identifiant unique dans le namespace */
  readonly identifier: string;
}

/**
 * Crée une RecordKey à partir d'une string "namespace:identifier"
 */
export function parseRecordKey(key: string): RecordKey {
  const colonIndex = key.indexOf(":");
  if (colonIndex === -1) {
    throw new Error(`Invalid key format: "${key}" — expected "namespace:identifier"`);
  }
  
  const namespace = key.slice(0, colonIndex);
  const identifier = key.slice(colonIndex + 1);
  
  if (!namespace || !identifier) {
    throw new Error(`Invalid key format: "${key}" — namespace and identifier cannot be empty`);
  }
  
  return Object.freeze({ namespace, identifier });
}

/**
 * Convertit une RecordKey en string
 */
export function formatRecordKey(key: RecordKey): string {
  return `${key.namespace}:${key.identifier}`;
}

/**
 * Vérifie si une string est une clé valide
 */
export function isValidKeyFormat(key: string): boolean {
  const colonIndex = key.indexOf(":");
  if (colonIndex === -1) return false;
  
  const namespace = key.slice(0, colonIndex);
  const identifier = key.slice(colonIndex + 1);
  
  return namespace.length > 0 && identifier.length > 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — PROVENANCE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Source d'une opération — qui a initié l'action
 */
export type ProvenanceSource = 
  | { readonly type: "USER"; readonly user_id: string }
  | { readonly type: "SYSTEM"; readonly component: string }
  | { readonly type: "IMPORT"; readonly source_file: string }
  | { readonly type: "MIGRATION"; readonly from_version: string };

/**
 * Raison d'une opération — pourquoi cette action
 */
export type ProvenanceReason =
  | "CREATION"           // Nouveau record
  | "UPDATE"             // Mise à jour (nouvelle version)
  | "CORRECTION"         // Correction d'erreur
  | "ENRICHMENT"         // Ajout d'informations
  | "IMPORT"             // Import externe
  | "MIGRATION"          // Migration de données
  | "DERIVATION";        // Dérivé d'autres records

/**
 * Provenance complète — INV-MEM-07
 * 
 * Répond aux questions: Who? When? Why? From?
 */
export interface Provenance {
  /** Qui a initié l'opération */
  readonly source: ProvenanceSource;
  
  /** Pourquoi cette opération */
  readonly reason: ProvenanceReason;
  
  /** Timestamp UTC ISO 8601 */
  readonly timestamp_utc: string;
  
  /** Description optionnelle */
  readonly description?: string;
  
  /** Records sources (si dérivation) */
  readonly derived_from?: readonly string[];
}

/**
 * Crée une provenance utilisateur
 */
export function createUserProvenance(
  userId: string,
  reason: ProvenanceReason,
  description?: string
): Provenance {
  return Object.freeze({
    source: Object.freeze({ type: "USER" as const, user_id: userId }),
    reason,
    timestamp_utc: new Date().toISOString(),
    description,
  });
}

/**
 * Crée une provenance système
 */
export function createSystemProvenance(
  component: string,
  reason: ProvenanceReason,
  description?: string
): Provenance {
  return Object.freeze({
    source: Object.freeze({ type: "SYSTEM" as const, component }),
    reason,
    timestamp_utc: new Date().toISOString(),
    description,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — MEMORY RECORD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Record de mémoire — unité fondamentale de stockage
 * 
 * INVARIANTS :
 *   INV-MEM-04 : Version + timestamp obligatoires
 *   INV-MEM-06 : Hash obligatoire
 *   INV-MEM-07 : Provenance obligatoire
 */
export interface MemoryRecord<T = unknown> {
  /** Clé du record (format "namespace:identifier") */
  readonly key: string;
  
  /** Version du record (1, 2, 3...) — INV-MEM-04 */
  readonly version: number;
  
  /** Payload (contenu) */
  readonly payload: T;
  
  /** Hash SHA256 du payload — INV-MEM-06 */
  readonly payload_hash: string;
  
  /** Hash SHA256 du record complet — INV-MEM-06 */
  readonly record_hash: string;
  
  /** Provenance — INV-MEM-07 */
  readonly provenance: Provenance;
  
  /** Timestamp de création UTC ISO 8601 — INV-MEM-04 */
  readonly created_at_utc: string;
  
  /** Hash du record précédent (si version > 1) */
  readonly previous_hash?: string;
}

/**
 * Type guard pour MemoryRecord
 */
export function isMemoryRecord(value: unknown): value is MemoryRecord {
  if (!value || typeof value !== "object") return false;
  
  const record = value as Record<string, unknown>;
  
  return (
    typeof record.key === "string" &&
    typeof record.version === "number" &&
    record.version >= 1 &&
    "payload" in record &&
    typeof record.payload_hash === "string" &&
    record.payload_hash.length === 64 &&
    typeof record.record_hash === "string" &&
    record.record_hash.length === 64 &&
    isProvenance(record.provenance) &&
    typeof record.created_at_utc === "string"
  );
}

/**
 * Type guard pour Provenance
 */
export function isProvenance(value: unknown): value is Provenance {
  if (!value || typeof value !== "object") return false;
  
  const prov = value as Record<string, unknown>;
  
  return (
    isProvenanceSource(prov.source) &&
    typeof prov.reason === "string" &&
    typeof prov.timestamp_utc === "string"
  );
}

/**
 * Type guard pour ProvenanceSource
 */
export function isProvenanceSource(value: unknown): value is ProvenanceSource {
  if (!value || typeof value !== "object") return false;
  
  const source = value as Record<string, unknown>;
  
  switch (source.type) {
    case "USER":
      return typeof source.user_id === "string";
    case "SYSTEM":
      return typeof source.component === "string";
    case "IMPORT":
      return typeof source.source_file === "string";
    case "MIGRATION":
      return typeof source.from_version === "string";
    default:
      return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — RECORD METADATA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Métadonnées d'un record (sans le payload)
 */
export interface RecordMetadata {
  readonly key: string;
  readonly version: number;
  readonly payload_hash: string;
  readonly record_hash: string;
  readonly created_at_utc: string;
  readonly provenance: Provenance;
  readonly previous_hash?: string;
}

/**
 * Extrait les métadonnées d'un record
 */
export function extractMetadata(record: MemoryRecord): RecordMetadata {
  return Object.freeze({
    key: record.key,
    version: record.version,
    payload_hash: record.payload_hash,
    record_hash: record.record_hash,
    created_at_utc: record.created_at_utc,
    provenance: record.provenance,
    previous_hash: record.previous_hash,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — RECORD REFERENCE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Référence légère vers un record (pour liens)
 */
export interface RecordRef {
  /** Clé du record */
  readonly key: string;
  
  /** Version spécifique (optionnel — sinon "latest") */
  readonly version?: number;
  
  /** Hash du record (pour vérification) */
  readonly record_hash: string;
}

/**
 * Crée une référence vers un record
 */
export function createRecordRef(record: MemoryRecord): RecordRef {
  return Object.freeze({
    key: record.key,
    version: record.version,
    record_hash: record.record_hash,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6 — WRITE REQUEST
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Requête d'écriture (append)
 * 
 * Note: L'écriture est toujours une PROPOSITION.
 * Le store peut la rejeter si invalide.
 */
export interface WriteRequest<T = unknown> {
  /** Clé du record */
  readonly key: string;
  
  /** Payload à écrire */
  readonly payload: T;
  
  /** Provenance */
  readonly provenance: Provenance;
  
  /** Version attendue (optionnel — pour optimistic locking) */
  readonly expected_version?: number;
}

/**
 * Type guard pour WriteRequest
 */
export function isWriteRequest(value: unknown): value is WriteRequest {
  if (!value || typeof value !== "object") return false;
  
  const req = value as Record<string, unknown>;
  
  return (
    typeof req.key === "string" &&
    isValidKeyFormat(req.key) &&
    "payload" in req &&
    isProvenance(req.provenance)
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7 — QUERY TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Filtre de query
 */
export interface QueryFilter {
  /** Filtrer par namespace */
  readonly namespace?: string;
  
  /** Filtrer par clé exacte */
  readonly key?: string;
  
  /** Filtrer par version */
  readonly version?: number;
  
  /** Filtrer par plage de dates */
  readonly created_after?: string;
  readonly created_before?: string;
  
  /** Filtrer par source type */
  readonly source_type?: ProvenanceSource["type"];
}

/**
 * Options de query
 */
export interface QueryOptions {
  /** Limite de résultats */
  readonly limit?: number;
  
  /** Offset pour pagination */
  readonly offset?: number;
  
  /** Tri */
  readonly sort_by?: "created_at" | "key" | "version";
  readonly sort_order?: "asc" | "desc";
  
  /** Inclure le payload (sinon métadonnées seulement) */
  readonly include_payload?: boolean;
  
  /** Timeout en ms */
  readonly timeout_ms?: number;
}

/**
 * Résultat de query
 */
export interface QueryResult<T = unknown> {
  /** Records trouvés */
  readonly records: readonly MemoryRecord<T>[];
  
  /** Nombre total (avant limit) */
  readonly total_count: number;
  
  /** Métadonnées de query */
  readonly query_metadata: {
    readonly executed_at_utc: string;
    readonly duration_ms: number;
    readonly filter_applied: QueryFilter;
    readonly options_applied: QueryOptions;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8 — HISTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Historique d'une clé (toutes les versions)
 */
export interface RecordHistory<T = unknown> {
  /** Clé concernée */
  readonly key: string;
  
  /** Toutes les versions (de la plus ancienne à la plus récente) */
  readonly versions: readonly MemoryRecord<T>[];
  
  /** Version actuelle (dernière) */
  readonly current_version: number;
  
  /** Première version */
  readonly first_version: number;
  
  /** Chaîne de hashes valide */
  readonly chain_valid: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9 — STORE STATE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * État du store (snapshot)
 */
export interface StoreState {
  /** Nombre total de records */
  readonly total_records: number;
  
  /** Nombre de clés uniques */
  readonly unique_keys: number;
  
  /** Hash racine (Merkle root) */
  readonly root_hash: string;
  
  /** Timestamp du dernier write */
  readonly last_write_at_utc: string | null;
  
  /** Version du store */
  readonly store_version: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 10 — CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configuration du MEMORY_LAYER
 */
export interface MemoryConfig {
  /** Timeout par défaut pour les queries (ms) */
  readonly defaultQueryTimeoutMs: number;
  
  /** Limite par défaut pour les queries */
  readonly defaultQueryLimit: number;
  
  /** Activer la validation stricte */
  readonly strictValidation: boolean;
  
  /** Activer le logging */
  readonly enableLogging: boolean;
}

/**
 * Configuration par défaut
 */
export const DEFAULT_MEMORY_CONFIG: MemoryConfig = Object.freeze({
  defaultQueryTimeoutMs: 5000,
  defaultQueryLimit: 100,
  strictValidation: true,
  enableLogging: false,
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 11 — VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Règles de validation pour les clés
 */
export const KEY_VALIDATION = Object.freeze({
  namespacePattern: /^[a-z][a-z0-9_]{0,31}$/,
  identifierPattern: /^[a-zA-Z0-9_-]{1,128}$/,
  maxKeyLength: 160,
});

/**
 * Valide une clé
 */
export function validateKey(key: string): { valid: boolean; error?: string } {
  if (key.length > KEY_VALIDATION.maxKeyLength) {
    return { valid: false, error: `Key exceeds max length of ${KEY_VALIDATION.maxKeyLength}` };
  }
  
  if (!isValidKeyFormat(key)) {
    return { valid: false, error: "Key must be in format 'namespace:identifier'" };
  }
  
  const parsed = parseRecordKey(key);
  
  if (!KEY_VALIDATION.namespacePattern.test(parsed.namespace)) {
    return { 
      valid: false, 
      error: `Namespace must match pattern: lowercase, start with letter, max 32 chars` 
    };
  }
  
  if (!KEY_VALIDATION.identifierPattern.test(parsed.identifier)) {
    return { 
      valid: false, 
      error: `Identifier must match pattern: alphanumeric with _ or -, 1-128 chars` 
    };
  }
  
  return { valid: true };
}

/**
 * Valide un payload (non-null, sérialisable)
 */
export function validatePayload(payload: unknown): { valid: boolean; error?: string } {
  if (payload === undefined) {
    return { valid: false, error: "Payload cannot be undefined" };
  }
  
  try {
    JSON.stringify(payload);
    return { valid: true };
  } catch {
    return { valid: false, error: "Payload must be JSON-serializable" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 12 — MODULE METADATA
// ═══════════════════════════════════════════════════════════════════════════════

export const MEMORY_LAYER_VERSION = "1.0.0-NASA" as const;
export const MEMORY_LAYER_PHASE = "10A" as const;

export const MEMORY_LAYER_INFO = Object.freeze({
  name: "@omega/memory-layer",
  version: MEMORY_LAYER_VERSION,
  phase: MEMORY_LAYER_PHASE,
  standard: "DO-178C Level A",
  
  invariants: {
    proven: [] as string[],
    pending: [
      "INV-MEM-01", // Append-Only
      "INV-MEM-02", // Deterministic Retrieval
      "INV-MEM-03", // Explicit Linking
      "INV-MEM-04", // Versioned Records
      "INV-MEM-05", // No Hidden Influence
      "INV-MEM-06", // Hash Integrity
      "INV-MEM-07", // Full Provenance
      "INV-MEM-08", // Query Isolation
      "INV-MEM-09", // Atomic Writes
      "INV-MEM-10", // Bounded Queries
      "INV-MEM-11", // Schema Validation
    ],
  },
});
