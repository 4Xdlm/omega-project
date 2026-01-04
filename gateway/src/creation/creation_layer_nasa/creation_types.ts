/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA PROJECT — CREATION_LAYER
 * creation_types.ts — Définitions Formelles NASA-Grade
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * VERSION     : 1.0.0-NASA
 * PHASE       : 9A
 * STANDARD    : DO-178C Level A / MIL-STD-882E
 * 
 * DÉFINITIONS FORMELLES :
 *   DEF-01 : ARTIFACT
 *   DEF-02 : TEMPLATE
 *   DEF-03 : CREATION REQUEST
 *   DEF-04 : CONFIDENCE REPORT
 * 
 * NCR OUVERTES :
 *   NCR-CRE-01 : Template Purity non prouvable sans sandbox réelle (→ 9C)
 *   NCR-CRE-02 : Timeout non garanti sans worker/coop (→ 9C)
 *   NCR-CRE-03 : Cache = optimisation, jamais invariant
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configuration CREATION_LAYER avec valeurs par défaut sûres
 */
export interface CreationConfig {
  /** Timeout max pour exécution template (ms) — NCR-CRE-02 : soft limit only */
  readonly defaultTimeoutMs: number;
  /** Taille max artifact en bytes */
  readonly maxArtifactBytes: number;
  /** Nombre max sources par artifact */
  readonly maxSourceRefs: number;
  /** Nombre max assumptions par artifact */
  readonly maxAssumptions: number;
  /** Longueur max content string */
  readonly maxContentLength: number;
}

export const DEFAULT_CREATION_CONFIG: Readonly<CreationConfig> = Object.freeze({
  defaultTimeoutMs: 30_000,
  maxArtifactBytes: 10 * 1024 * 1024, // 10MB
  maxSourceRefs: 1000,
  maxAssumptions: 100,
  maxContentLength: 5 * 1024 * 1024, // 5MB text
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — DEF-01 : ARTIFACT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Types d'artifacts supportés
 * 
 * RÈGLE : Enum fermé. Ajouter un type = nouvelle version schema.
 */
export const ARTIFACT_TYPES = Object.freeze([
  "SCENE_OUTLINE",      // Plan de scène narratif
  "CHARACTER_SHEET",    // Fiche personnage complète
  "TIMELINE_VIEW",      // Vue chronologique événements
  "EMOTION_REPORT",     // Rapport analyse émotionnelle
  "CONSISTENCY_AUDIT",  // Audit cohérence narrative
  "DIFF_REPORT",        // Comparaison entre versions
  "QUERY_ANSWER",       // Réponse à question utilisateur
  "RELATIONSHIP_MAP",   // Carte relations personnages
  "LOCATION_INDEX",     // Index des lieux
  "PLOT_SUMMARY",       // Résumé intrigue
] as const);

export type ArtifactType = typeof ARTIFACT_TYPES[number];

/**
 * Référence vers une source dans le snapshot
 */
export interface SourceRef {
  /** Clé canonique de l'entrée */
  readonly key: string;
  /** Version exacte utilisée */
  readonly version: number;
  /** Hash de l'entrée au moment de la lecture */
  readonly entry_hash: string;
  /** Champs spécifiques utilisés (optionnel, pour traçabilité fine) */
  readonly fields_used?: readonly string[];
}

/**
 * Type guard pour SourceRef
 */
export function isSourceRef(v: unknown): v is SourceRef {
  if (v === null || typeof v !== "object") return false;
  const obj = v as Record<string, unknown>;
  return (
    typeof obj.key === "string" &&
    obj.key.length > 0 &&
    typeof obj.version === "number" &&
    Number.isInteger(obj.version) &&
    obj.version >= 1 &&
    typeof obj.entry_hash === "string" &&
    obj.entry_hash.length === 64 && // SHA256 hex
    (obj.fields_used === undefined || 
      (Array.isArray(obj.fields_used) && 
       obj.fields_used.every(f => typeof f === "string")))
  );
}

/**
 * DEF-01 : ARTIFACT
 * 
 * PROPRIÉTÉS FONDAMENTALES :
 * - Dérivé exclusivement d'un snapshot MEMORY
 * - Hash déterministe (même input → même hash)
 * - Provenance complète (toutes sources traçables)
 * - Aucune autorité (ne déclare pas la vérité, propose seulement)
 * 
 * IMMUTABILITÉ : Toutes les propriétés sont readonly
 */
export interface Artifact {
  // ─────────────────────────────────────────────────────────────────────────────
  // IDENTITÉ
  // ─────────────────────────────────────────────────────────────────────────────
  
  /** 
   * ID unique de l'artifact
   * DÉRIVATION DÉTERMINISTE : artifact_id = SHA256(artifact_hash).slice(0, 32)
   * Ceci garantit que même artifact = même id
   */
  readonly artifact_id: string;
  
  /** Type d'artifact (enum strict) */
  readonly artifact_type: ArtifactType;
  
  /** Version du schema artifact */
  readonly schema_version: "1.0.0";
  
  // ─────────────────────────────────────────────────────────────────────────────
  // PROVENANCE (CRITIQUE — INV-CRE-03)
  // ─────────────────────────────────────────────────────────────────────────────
  
  /** ID du snapshot source (OBLIGATOIRE) */
  readonly snapshot_id: string;
  
  /** Hash racine du snapshot au moment de la création */
  readonly snapshot_root_hash: string;
  
  /** Toutes les sources utilisées pour dériver cet artifact */
  readonly source_refs: readonly SourceRef[];
  
  /** ID du template qui a produit cet artifact */
  readonly template_id: string;
  
  /** Version exacte du template */
  readonly template_version: string;
  
  // ─────────────────────────────────────────────────────────────────────────────
  // CONTENU
  // ─────────────────────────────────────────────────────────────────────────────
  
  /** 
   * Payload de l'artifact
   * Type dépend de artifact_type, validé par output_schema du template
   */
  readonly content: unknown;
  
  /** 
   * Hash du contenu seul
   * content_hash = SHA256(CANONICAL_ENCODE(content))
   */
  readonly content_hash: string;
  
  // ─────────────────────────────────────────────────────────────────────────────
  // MÉTADONNÉES
  // ─────────────────────────────────────────────────────────────────────────────
  
  /** Timestamp création (ISO 8601 UTC) */
  readonly created_at_utc: string;
  
  /** Rapport de confiance (DEF-04) */
  readonly confidence: ConfidenceReport;
  
  // ─────────────────────────────────────────────────────────────────────────────
  // INTÉGRITÉ
  // ─────────────────────────────────────────────────────────────────────────────
  
  /** 
   * Hash de l'artifact complet
   * artifact_hash = SHA256(CANONICAL_ENCODE(artifact sans artifact_hash ni artifact_id))
   * 
   * INVARIANT INV-CRE-10 (IDEMPOTENCY) :
   * même (snapshot_root_hash + request_hash + template_id@version) ⇒ même artifact_hash
   */
  readonly artifact_hash: string;
}

/**
 * Type guard pour Artifact
 */
export function isArtifact(v: unknown): v is Artifact {
  if (v === null || typeof v !== "object") return false;
  const obj = v as Record<string, unknown>;
  
  // Vérifications de base
  if (typeof obj.artifact_id !== "string" || obj.artifact_id.length !== 32) return false;
  if (!isArtifactType(obj.artifact_type)) return false;
  if (obj.schema_version !== "1.0.0") return false;
  
  // Provenance
  if (typeof obj.snapshot_id !== "string" || obj.snapshot_id.length === 0) return false;
  if (typeof obj.snapshot_root_hash !== "string" || obj.snapshot_root_hash.length !== 64) return false;
  if (!Array.isArray(obj.source_refs) || !obj.source_refs.every(isSourceRef)) return false;
  if (typeof obj.template_id !== "string" || obj.template_id.length === 0) return false;
  if (typeof obj.template_version !== "string" || obj.template_version.length === 0) return false;
  
  // Contenu
  if (typeof obj.content_hash !== "string" || obj.content_hash.length !== 64) return false;
  
  // Métadonnées
  if (typeof obj.created_at_utc !== "string") return false;
  if (!isConfidenceReport(obj.confidence)) return false;
  
  // Intégrité
  if (typeof obj.artifact_hash !== "string" || obj.artifact_hash.length !== 64) return false;
  
  return true;
}

/**
 * Type guard pour ArtifactType
 */
export function isArtifactType(v: unknown): v is ArtifactType {
  return typeof v === "string" && ARTIFACT_TYPES.includes(v as ArtifactType);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — DEF-02 : TEMPLATE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schema JSON pour validation (simplifié pour Phase 9A)
 */
export interface JSONSchema {
  readonly type: "object" | "array" | "string" | "number" | "boolean" | "null";
  readonly properties?: Readonly<Record<string, JSONSchema>>;
  readonly required?: readonly string[];
  readonly items?: JSONSchema;
  readonly enum?: readonly unknown[];
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly minimum?: number;
  readonly maximum?: number;
}

/**
 * Contexte lecture seule passé aux templates
 * 
 * NCR-CRE-01 : Ce contexte devrait être sandboxé pour empêcher
 * les appels à fetch/fs/Date.now()/Math.random() mais ce n'est
 * pas techniquement garanti sans VM/Worker (→ 9C)
 */
export interface ReadOnlySnapshotContext {
  /** ID du snapshot actif */
  readonly snapshotId: string;
  
  /** Hash racine du snapshot */
  readonly snapshotRootHash: string;
  
  /**
   * Récupère une entrée par version exacte
   * @returns L'entrée gelée (Object.freeze) ou null si non trouvée
   */
  getByVersion(key: string, version: number): Readonly<SnapshotEntry> | null;
  
  /**
   * Récupère la dernière version d'une entrée
   * @returns L'entrée gelée ou null si non trouvée
   */
  getLatest(key: string): Readonly<SnapshotEntry> | null;
  
  /**
   * Récupère l'historique complet d'une clé
   * @returns Array gelé des versions
   */
  getHistory(key: string): readonly Readonly<SnapshotEntry>[];
  
  /**
   * Liste toutes les clés disponibles dans le snapshot
   * @returns Array gelé des clés
   */
  listKeys(): readonly string[];
  
  /**
   * Vérifie l'existence d'une clé
   */
  hasKey(key: string): boolean;
}

/**
 * Entrée de snapshot (vue lecture seule)
 */
export interface SnapshotEntry {
  readonly key: string;
  readonly version: number;
  readonly payload: unknown;
  readonly hash: string;
  readonly created_at_utc: string;
}

/**
 * DEF-02 : TEMPLATE
 * 
 * CONTRAINTES ABSOLUES :
 * - PURE : Pas de side effects (NCR-CRE-01 : non prouvable sans sandbox)
 * - DÉTERMINISTE : Même input → même output
 * - ISOLÉ : Pas d'accès externe (NCR-CRE-01/02)
 * - BORNÉ : Timeout (NCR-CRE-02 : soft limit only)
 */
export interface Template {
  /** Identifiant unique du template (ex: "SCENE_OUTLINE_V1") */
  readonly id: string;
  
  /** Version SemVer du template */
  readonly version: string;
  
  /** Type d'artifact produit */
  readonly artifact_type: ArtifactType;
  
  /** Description lisible */
  readonly description: string;
  
  /** Schema de validation des paramètres d'entrée */
  readonly input_schema: JSONSchema;
  
  /** Schema de validation du contenu produit */
  readonly output_schema: JSONSchema;
  
  /**
   * Fonction d'exécution
   * 
   * CONTRAT :
   * - Reçoit un contexte lecture seule (gelé)
   * - Reçoit des paramètres validés par input_schema
   * - Retourne un contenu validé par output_schema
   * - Throws TemplateExecutionError si échec
   * 
   * NCR-CRE-01 : La pureté n'est pas techniquement garantie
   * NCR-CRE-02 : Le timeout n'est pas hard-enforceable
   * 
   * @param ctx Contexte snapshot read-only
   * @param params Paramètres validés
   * @returns Contenu de l'artifact
   */
  execute(ctx: ReadOnlySnapshotContext, params: unknown): unknown;
}

/**
 * Template enregistré avec métadonnées
 */
export interface RegisteredTemplate {
  readonly template: Template;
  readonly registered_at_utc: string;
  readonly registered_by: string;
}

/**
 * Type guard pour Template
 */
export function isTemplate(v: unknown): v is Template {
  if (v === null || typeof v !== "object") return false;
  const obj = v as Record<string, unknown>;
  
  return (
    typeof obj.id === "string" &&
    obj.id.length > 0 &&
    typeof obj.version === "string" &&
    /^\d+\.\d+\.\d+$/.test(obj.version) &&
    isArtifactType(obj.artifact_type) &&
    typeof obj.description === "string" &&
    typeof obj.input_schema === "object" &&
    obj.input_schema !== null &&
    typeof obj.output_schema === "object" &&
    obj.output_schema !== null &&
    typeof obj.execute === "function"
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — DEF-03 : CREATION REQUEST
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * DEF-03 : CREATION REQUEST
 * 
 * Demande de création d'artifact
 * 
 * VALIDATION : Avant tout traitement (INV-CRE-07)
 */
export interface CreationRequest {
  /** UUID de la requête (fourni par le client) */
  readonly request_id: string;
  
  /** ID du snapshot cible (OBLIGATOIRE) */
  readonly snapshot_id: string;
  
  /** ID du template à utiliser */
  readonly template_id: string;
  
  /** Paramètres pour le template (validés vs input_schema) */
  readonly params: unknown;
  
  /** 
   * Timeout en ms (optionnel, default = config.defaultTimeoutMs)
   * NCR-CRE-02 : soft limit only
   */
  readonly timeout_ms?: number;
  
  /**
   * Hash de la requête pour idempotency
   * request_hash = SHA256(CANONICAL_ENCODE(request sans request_hash))
   */
  readonly request_hash: string;
}

/**
 * Type guard pour CreationRequest
 */
export function isCreationRequest(v: unknown): v is CreationRequest {
  if (v === null || typeof v !== "object") return false;
  const obj = v as Record<string, unknown>;
  
  // UUID format (relaxed : any non-empty string)
  if (typeof obj.request_id !== "string" || obj.request_id.length === 0) return false;
  
  // Snapshot obligatoire
  if (typeof obj.snapshot_id !== "string" || obj.snapshot_id.length === 0) return false;
  
  // Template obligatoire
  if (typeof obj.template_id !== "string" || obj.template_id.length === 0) return false;
  
  // Timeout optionnel mais si présent, doit être valide
  if (obj.timeout_ms !== undefined) {
    if (typeof obj.timeout_ms !== "number" || 
        !Number.isInteger(obj.timeout_ms) ||
        obj.timeout_ms < 100 ||
        obj.timeout_ms > 300_000) {
      return false;
    }
  }
  
  // Hash obligatoire
  if (typeof obj.request_hash !== "string" || obj.request_hash.length !== 64) return false;
  
  return true;
}

/**
 * Résultat d'une création
 */
export type CreationResult = 
  | { readonly ok: true; readonly artifact: Artifact }
  | { readonly ok: false; readonly error: CreationErrorInfo };

/**
 * Informations d'erreur
 */
export interface CreationErrorInfo {
  readonly code: CreationErrorCode;
  readonly message: string;
  readonly details?: unknown;
  readonly request_id?: string;
}

/**
 * Codes d'erreur (voir creation_errors.ts pour détails)
 */
export type CreationErrorCode =
  | "INVALID_REQUEST"
  | "SNAPSHOT_NOT_FOUND"
  | "SNAPSHOT_INVALID"
  | "TEMPLATE_NOT_FOUND"
  | "TEMPLATE_VERSION_MISMATCH"
  | "PARAMS_VALIDATION_FAILED"
  | "SOURCE_NOT_FOUND"
  | "SOURCE_HASH_MISMATCH"
  | "EXECUTION_FAILED"
  | "EXECUTION_TIMEOUT"
  | "OUTPUT_VALIDATION_FAILED"
  | "ARTIFACT_TOO_LARGE"
  | "INTERNAL_ERROR";

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — DEF-04 : CONFIDENCE REPORT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hypothèse faite lors de la création
 * 
 * RÈGLE INV-CRE-05 : Si une info n'est pas dérivable des sources,
 * elle DOIT être marquée comme assumption
 */
export interface Assumption {
  /** Champ concerné dans le contenu */
  readonly field: string;
  
  /** Valeur supposée */
  readonly assumed_value: unknown;
  
  /** Raison de l'hypothèse */
  readonly reason: AssumptionReason;
  
  /** Description lisible */
  readonly description: string;
}

/**
 * Raisons valides pour une hypothèse
 */
export const ASSUMPTION_REASONS = Object.freeze([
  "SOURCE_MISSING",      // Source attendue non trouvée
  "FIELD_MISSING",       // Champ absent dans la source
  "VALUE_AMBIGUOUS",     // Valeur ambiguë, choix fait
  "INFERENCE_REQUIRED",  // Inférence logique nécessaire
  "DEFAULT_APPLIED",     // Valeur par défaut utilisée
] as const);

export type AssumptionReason = typeof ASSUMPTION_REASONS[number];

/**
 * Type guard pour Assumption
 */
export function isAssumption(v: unknown): v is Assumption {
  if (v === null || typeof v !== "object") return false;
  const obj = v as Record<string, unknown>;
  
  return (
    typeof obj.field === "string" &&
    obj.field.length > 0 &&
    typeof obj.reason === "string" &&
    ASSUMPTION_REASONS.includes(obj.reason as AssumptionReason) &&
    typeof obj.description === "string"
  );
}

/**
 * DEF-04 : CONFIDENCE REPORT
 * 
 * Rapport de traçabilité — PAS un score arbitraire
 * 
 * RÈGLE : Ce rapport documente factuellement la dérivation,
 * il ne "note" pas la qualité subjectivement.
 */
export interface ConfidenceReport {
  // ─────────────────────────────────────────────────────────────────────────────
  // COMPLÉTUDE DES SOURCES
  // ─────────────────────────────────────────────────────────────────────────────
  
  /** Nombre de sources demandées par le template */
  readonly sources_requested: number;
  
  /** Nombre de sources effectivement trouvées */
  readonly sources_found: number;
  
  /** IDs des sources manquantes */
  readonly sources_missing: readonly string[];
  
  // ─────────────────────────────────────────────────────────────────────────────
  // FRAÎCHEUR
  // ─────────────────────────────────────────────────────────────────────────────
  
  /** Âge de la source la plus ancienne (jours) */
  readonly oldest_source_age_days: number;
  
  /** Âge de la source la plus récente (jours) */
  readonly newest_source_age_days: number;
  
  // ─────────────────────────────────────────────────────────────────────────────
  // HYPOTHÈSES (INV-CRE-05)
  // ─────────────────────────────────────────────────────────────────────────────
  
  /** Liste explicite des hypothèses faites */
  readonly assumptions: readonly Assumption[];
  
  // ─────────────────────────────────────────────────────────────────────────────
  // VERDICT
  // ─────────────────────────────────────────────────────────────────────────────
  
  /**
   * Dérivation complète ?
   * true = tout le contenu dérivé des sources
   * false = au moins une assumption
   */
  readonly derivation_complete: boolean;
}

/**
 * Type guard pour ConfidenceReport
 */
export function isConfidenceReport(v: unknown): v is ConfidenceReport {
  if (v === null || typeof v !== "object") return false;
  const obj = v as Record<string, unknown>;
  
  // Sources
  if (typeof obj.sources_requested !== "number" || 
      !Number.isInteger(obj.sources_requested) ||
      obj.sources_requested < 0) return false;
      
  if (typeof obj.sources_found !== "number" ||
      !Number.isInteger(obj.sources_found) ||
      obj.sources_found < 0 ||
      obj.sources_found > (obj.sources_requested as number)) return false;
      
  if (!Array.isArray(obj.sources_missing) ||
      !obj.sources_missing.every(s => typeof s === "string")) return false;
  
  // Fraîcheur
  if (typeof obj.oldest_source_age_days !== "number" ||
      obj.oldest_source_age_days < 0) return false;
      
  if (typeof obj.newest_source_age_days !== "number" ||
      obj.newest_source_age_days < 0) return false;
  
  // Assumptions
  if (!Array.isArray(obj.assumptions) ||
      !obj.assumptions.every(isAssumption)) return false;
  
  // Verdict
  if (typeof obj.derivation_complete !== "boolean") return false;
  
  // Cohérence : derivation_complete = true implique assumptions vide
  if (obj.derivation_complete && (obj.assumptions as Assumption[]).length > 0) return false;
  
  // Cohérence : sources_missing.length = sources_requested - sources_found
  const expectedMissing = (obj.sources_requested as number) - (obj.sources_found as number);
  if ((obj.sources_missing as string[]).length !== expectedMissing) return false;
  
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6 — BUILDERS & HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Builder pour ConfidenceReport
 */
export class ConfidenceReportBuilder {
  private sourcesRequested = 0;
  private sourcesFound = 0;
  private sourcesMissing: string[] = [];
  private oldestAge = 0;
  private newestAge = 0;
  private assumptions: Assumption[] = [];
  
  requestSource(key: string, found: boolean, ageDays?: number): this {
    this.sourcesRequested++;
    if (found) {
      this.sourcesFound++;
      if (ageDays !== undefined) {
        if (this.sourcesFound === 1) {
          this.oldestAge = ageDays;
          this.newestAge = ageDays;
        } else {
          this.oldestAge = Math.max(this.oldestAge, ageDays);
          this.newestAge = Math.min(this.newestAge, ageDays);
        }
      }
    } else {
      this.sourcesMissing.push(key);
    }
    return this;
  }
  
  addAssumption(assumption: Assumption): this {
    this.assumptions.push(assumption);
    return this;
  }
  
  build(): ConfidenceReport {
    return Object.freeze({
      sources_requested: this.sourcesRequested,
      sources_found: this.sourcesFound,
      sources_missing: Object.freeze([...this.sourcesMissing]),
      oldest_source_age_days: this.oldestAge,
      newest_source_age_days: this.newestAge,
      assumptions: Object.freeze([...this.assumptions]),
      derivation_complete: this.assumptions.length === 0,
    });
  }
}

/**
 * Crée une Assumption
 */
export function createAssumption(
  field: string,
  assumed_value: unknown,
  reason: AssumptionReason,
  description: string
): Assumption {
  return Object.freeze({
    field,
    assumed_value,
    reason,
    description,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7 — EXPORTS CONSOLIDÉS
// ═══════════════════════════════════════════════════════════════════════════════

export const SCHEMA_VERSION = "1.0.0" as const;

/**
 * Validation complète d'un artifact type
 */
export function validateArtifactType(type: string): type is ArtifactType {
  return isArtifactType(type);
}

/**
 * Validation complète d'une assumption reason
 */
export function validateAssumptionReason(reason: string): reason is AssumptionReason {
  return ASSUMPTION_REASONS.includes(reason as AssumptionReason);
}
