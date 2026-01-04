/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA PROJECT — CREATION_LAYER
 * snapshot_context.ts — Read-Only Snapshot Access NASA-Grade
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * VERSION     : 1.0.0-NASA
 * PHASE       : 9B
 * STANDARD    : DO-178C Level A / MIL-STD-882E
 * 
 * INVARIANTS COUVERTS :
 *   INV-CRE-01 : Snapshot-Only (lecture seule depuis snapshot)
 *   INV-CRE-06 : Template Purity (données gelées, pas de mutation)
 *   INV-CRE-11 : Source Verification (existence dans snapshot)
 * 
 * ARCHITECTURE :
 *   Ce module fournit une vue READ-ONLY sur un snapshot MEMORY.
 *   Aucune écriture n'est possible.
 *   Toutes les données retournées sont deep-frozen.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { 
  ReadOnlySnapshotContext, 
  SnapshotEntry,
  SourceRef,
} from "./creation_types.js";
import { CreationErrors } from "./creation_errors.js";

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — DEEP FREEZE UTILITY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Deep freeze un objet récursivement
 * 
 * Garantit INV-CRE-06 : les données retournées ne peuvent pas être mutées
 * Tentative de mutation = TypeError en strict mode
 * 
 * @param obj Object à geler
 * @returns Le même objet, gelé profondément
 */
export function deepFreeze<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;
  
  // Déjà gelé ? Skip
  if (Object.isFrozen(obj)) return obj;
  
  // Geler l'objet
  Object.freeze(obj);
  
  // Geler récursivement
  if (Array.isArray(obj)) {
    for (const item of obj) {
      deepFreeze(item);
    }
  } else {
    for (const key of Object.keys(obj)) {
      deepFreeze((obj as Record<string, unknown>)[key]);
    }
  }
  
  return obj;
}

/**
 * Vérifie si un objet est deep-frozen
 */
export function isDeepFrozen(obj: unknown): boolean {
  if (obj === null || obj === undefined) return true;
  if (typeof obj !== "object") return true;
  
  if (!Object.isFrozen(obj)) return false;
  
  if (Array.isArray(obj)) {
    return obj.every(isDeepFrozen);
  }
  
  return Object.values(obj as Record<string, unknown>).every(isDeepFrozen);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — SNAPSHOT PROVIDER INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Interface abstraite pour accéder aux snapshots
 * 
 * Cette interface est implémentée par MEMORY_LAYER.
 * CREATION_LAYER ne connaît que cette abstraction.
 */
export interface SnapshotProvider {
  /**
   * Vérifie si un snapshot existe
   */
  hasSnapshot(snapshotId: string): boolean;
  
  /**
   * Récupère le hash racine d'un snapshot
   */
  getSnapshotRootHash(snapshotId: string): string | null;
  
  /**
   * Récupère une entrée par version exacte
   */
  getEntryByVersion(
    snapshotId: string, 
    key: string, 
    version: number
  ): SnapshotEntry | null;
  
  /**
   * Récupère la dernière version d'une entrée
   */
  getLatestEntry(
    snapshotId: string, 
    key: string
  ): SnapshotEntry | null;
  
  /**
   * Récupère l'historique complet d'une clé
   */
  getEntryHistory(
    snapshotId: string, 
    key: string
  ): SnapshotEntry[];
  
  /**
   * Liste toutes les clés du snapshot
   */
  listKeys(snapshotId: string): string[];
  
  /**
   * Vérifie si une clé existe dans le snapshot
   */
  hasKey(snapshotId: string, key: string): boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — READ-ONLY CONTEXT FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crée un contexte read-only pour un snapshot donné
 * 
 * INVARIANTS GARANTIS :
 * - INV-CRE-01 : Toutes les données viennent du snapshot
 * - INV-CRE-06 : Toutes les données retournées sont deep-frozen
 * 
 * @param provider Le fournisseur de snapshots (MEMORY_LAYER)
 * @param snapshotId ID du snapshot à utiliser
 * @returns Contexte read-only gelé
 * @throws CreationError si snapshot non trouvé ou invalide
 */
export function createReadOnlyContext(
  provider: SnapshotProvider,
  snapshotId: string
): ReadOnlySnapshotContext {
  
  // ─────────────────────────────────────────────────────────────────────────────
  // VALIDATION : Le snapshot doit exister
  // ─────────────────────────────────────────────────────────────────────────────
  
  if (!provider.hasSnapshot(snapshotId)) {
    throw CreationErrors.snapshotNotFound(snapshotId);
  }
  
  const rootHash = provider.getSnapshotRootHash(snapshotId);
  if (!rootHash) {
    throw CreationErrors.snapshotInvalid(snapshotId, "No root hash available");
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // CONSTRUCTION du contexte read-only
  // ─────────────────────────────────────────────────────────────────────────────
  
  const context: ReadOnlySnapshotContext = {
    snapshotId,
    snapshotRootHash: rootHash,
    
    getByVersion(key: string, version: number): Readonly<SnapshotEntry> | null {
      validateKey(key);
      validateVersion(version);
      
      const entry = provider.getEntryByVersion(snapshotId, key, version);
      if (!entry) return null;
      
      // Deep freeze pour INV-CRE-06
      return deepFreeze(cloneEntry(entry));
    },
    
    getLatest(key: string): Readonly<SnapshotEntry> | null {
      validateKey(key);
      
      const entry = provider.getLatestEntry(snapshotId, key);
      if (!entry) return null;
      
      return deepFreeze(cloneEntry(entry));
    },
    
    getHistory(key: string): readonly Readonly<SnapshotEntry>[] {
      validateKey(key);
      
      const entries = provider.getEntryHistory(snapshotId, key);
      return deepFreeze(entries.map(cloneEntry));
    },
    
    listKeys(): readonly string[] {
      const keys = provider.listKeys(snapshotId);
      return deepFreeze([...keys]);
    },
    
    hasKey(key: string): boolean {
      validateKey(key);
      return provider.hasKey(snapshotId, key);
    },
  };
  
  // Le contexte lui-même est gelé
  return Object.freeze(context);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Valide une clé
 */
function validateKey(key: string): void {
  if (typeof key !== "string") {
    throw CreationErrors.invalidRequest("Key must be a string");
  }
  if (key.length === 0) {
    throw CreationErrors.invalidRequest("Key cannot be empty");
  }
  if (key.length > 256) {
    throw CreationErrors.invalidRequest("Key too long (max 256 chars)");
  }
}

/**
 * Valide un numéro de version
 */
function validateVersion(version: number): void {
  if (typeof version !== "number") {
    throw CreationErrors.invalidRequest("Version must be a number");
  }
  if (!Number.isInteger(version)) {
    throw CreationErrors.invalidRequest("Version must be an integer");
  }
  if (version < 1) {
    throw CreationErrors.invalidRequest("Version must be >= 1");
  }
}

/**
 * Clone une entrée pour éviter les références partagées
 */
function cloneEntry(entry: SnapshotEntry): SnapshotEntry {
  return {
    key: entry.key,
    version: entry.version,
    payload: structuredClone(entry.payload),
    hash: entry.hash,
    created_at_utc: entry.created_at_utc,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — SOURCE VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Résultat de vérification d'une source
 */
export interface SourceVerificationResult {
  readonly valid: boolean;
  readonly error?: string;
  readonly entry?: Readonly<SnapshotEntry>;
}

/**
 * Vérifie qu'une source existe et correspond au hash attendu
 * 
 * INVARIANT INV-CRE-11 : Toute source doit exister dans le snapshot
 * 
 * @param ctx Contexte read-only
 * @param sourceRef Référence à vérifier
 * @returns Résultat de vérification
 */
export function verifySource(
  ctx: ReadOnlySnapshotContext,
  sourceRef: SourceRef
): SourceVerificationResult {
  
  // Récupérer l'entrée par version exacte
  const entry = ctx.getByVersion(sourceRef.key, sourceRef.version);
  
  if (!entry) {
    return {
      valid: false,
      error: `Source not found: ${sourceRef.key}@${sourceRef.version}`,
    };
  }
  
  // Vérifier le hash
  if (entry.hash !== sourceRef.entry_hash) {
    return {
      valid: false,
      error: `Hash mismatch for ${sourceRef.key}@${sourceRef.version}: ` +
             `expected ${sourceRef.entry_hash.slice(0, 16)}..., ` +
             `got ${entry.hash.slice(0, 16)}...`,
    };
  }
  
  return {
    valid: true,
    entry,
  };
}

/**
 * Vérifie plusieurs sources
 * 
 * @param ctx Contexte read-only
 * @param sourceRefs Sources à vérifier
 * @returns Liste des résultats
 */
export function verifySources(
  ctx: ReadOnlySnapshotContext,
  sourceRefs: readonly SourceRef[]
): SourceVerificationResult[] {
  return sourceRefs.map(ref => verifySource(ctx, ref));
}

/**
 * Vérifie que toutes les sources sont valides
 * 
 * @param ctx Contexte read-only
 * @param sourceRefs Sources à vérifier
 * @throws CreationError si une source invalide
 */
export function requireValidSources(
  ctx: ReadOnlySnapshotContext,
  sourceRefs: readonly SourceRef[]
): void {
  for (const ref of sourceRefs) {
    const result = verifySource(ctx, ref);
    if (!result.valid) {
      if (result.error?.includes("not found")) {
        throw CreationErrors.sourceNotFound(ref.key, ref.version);
      } else {
        throw CreationErrors.sourceHashMismatch(
          ref.key,
          ref.entry_hash,
          "unknown"
        );
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6 — SOURCE REF BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crée une SourceRef à partir d'une entrée
 * 
 * @param entry L'entrée snapshot
 * @param fieldsUsed Champs utilisés (optionnel)
 * @returns SourceRef valide
 */
export function createSourceRef(
  entry: SnapshotEntry,
  fieldsUsed?: string[]
): SourceRef {
  const ref: SourceRef = {
    key: entry.key,
    version: entry.version,
    entry_hash: entry.hash,
  };
  
  if (fieldsUsed && fieldsUsed.length > 0) {
    return Object.freeze({
      ...ref,
      fields_used: Object.freeze([...fieldsUsed]),
    });
  }
  
  return Object.freeze(ref);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7 — MOCK PROVIDER FOR TESTING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Mock provider pour les tests
 * 
 * USAGE : Tests uniquement, pas en production
 */
export class MockSnapshotProvider implements SnapshotProvider {
  private snapshots: Map<string, {
    rootHash: string;
    entries: Map<string, SnapshotEntry[]>;
  }> = new Map();
  
  /**
   * Ajoute un snapshot de test
   */
  addSnapshot(snapshotId: string, rootHash: string): this {
    this.snapshots.set(snapshotId, {
      rootHash,
      entries: new Map(),
    });
    return this;
  }
  
  /**
   * Ajoute une entrée à un snapshot
   */
  addEntry(snapshotId: string, entry: SnapshotEntry): this {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      throw new Error(`Snapshot not found: ${snapshotId}`);
    }
    
    const history = snapshot.entries.get(entry.key) || [];
    history.push(entry);
    snapshot.entries.set(entry.key, history);
    
    return this;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // SnapshotProvider implementation
  // ─────────────────────────────────────────────────────────────────────────────
  
  hasSnapshot(snapshotId: string): boolean {
    return this.snapshots.has(snapshotId);
  }
  
  getSnapshotRootHash(snapshotId: string): string | null {
    return this.snapshots.get(snapshotId)?.rootHash ?? null;
  }
  
  getEntryByVersion(
    snapshotId: string,
    key: string,
    version: number
  ): SnapshotEntry | null {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) return null;
    
    const history = snapshot.entries.get(key);
    if (!history) return null;
    
    return history.find(e => e.version === version) ?? null;
  }
  
  getLatestEntry(snapshotId: string, key: string): SnapshotEntry | null {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) return null;
    
    const history = snapshot.entries.get(key);
    if (!history || history.length === 0) return null;
    
    return history[history.length - 1] ?? null;
  }
  
  getEntryHistory(snapshotId: string, key: string): SnapshotEntry[] {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) return [];
    
    return snapshot.entries.get(key) ?? [];
  }
  
  listKeys(snapshotId: string): string[] {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) return [];
    
    return Array.from(snapshot.entries.keys());
  }
  
  hasKey(snapshotId: string, key: string): boolean {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) return false;
    
    return snapshot.entries.has(key);
  }
}
