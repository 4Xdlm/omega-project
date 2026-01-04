/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA PROJECT — CREATION_LAYER
 * artifact_builder.ts — Artifact Construction NASA-Grade
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * VERSION     : 1.0.0-NASA
 * PHASE       : 9C
 * STANDARD    : DO-178C Level A / MIL-STD-882E
 * 
 * INVARIANTS COUVERTS :
 *   INV-CRE-03 : Full Provenance (toutes sources traçables)
 *   INV-CRE-05 : Derivation Honesty (assumptions explicites)
 *   INV-CRE-09 : Atomic Output (pas de partials)
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type {
  Artifact,
  ArtifactType,
  SourceRef,
  ConfidenceReport,
  Template,
  ReadOnlySnapshotContext,
  CreationConfig,
} from "./creation_types.js";
import {
  DEFAULT_CREATION_CONFIG,
  SCHEMA_VERSION,
  ConfidenceReportBuilder,
} from "./creation_types.js";
import { CreationError, CreationErrors } from "./creation_errors.js";
import { canonicalEncode, sha256Sync } from "./creation_request.js";
import { deepFreeze } from "./snapshot_context.js";

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — ARTIFACT BUILD CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Contexte de construction d'un artifact
 * 
 * Accumule les sources et assumptions pendant la construction
 */
export class ArtifactBuildContext {
  private readonly sourceRefs: SourceRef[] = [];
  private readonly confidenceBuilder: ConfidenceReportBuilder;
  private readonly snapshotId: string;
  private readonly snapshotRootHash: string;
  private readonly templateId: string;
  private readonly templateVersion: string;
  private readonly artifactType: ArtifactType;
  private readonly config: CreationConfig;
  
  private content: unknown = null;
  private built: boolean = false;
  
  constructor(
    ctx: ReadOnlySnapshotContext,
    template: Template,
    config: CreationConfig = DEFAULT_CREATION_CONFIG
  ) {
    this.snapshotId = ctx.snapshotId;
    this.snapshotRootHash = ctx.snapshotRootHash;
    this.templateId = template.id;
    this.templateVersion = template.version;
    this.artifactType = template.artifact_type;
    this.config = config;
    this.confidenceBuilder = new ConfidenceReportBuilder();
  }
  
  /**
   * Enregistre une source utilisée
   * 
   * INVARIANT INV-CRE-03 : Toute source doit être traçable
   */
  addSource(sourceRef: SourceRef, ageDays?: number): this {
    if (this.built) {
      throw CreationErrors.internal("Cannot add source after build");
    }
    
    if (this.sourceRefs.length >= this.config.maxSourceRefs) {
      throw CreationErrors.invalidRequest(
        `Too many sources (max ${this.config.maxSourceRefs})`
      );
    }
    
    this.sourceRefs.push(sourceRef);
    this.confidenceBuilder.requestSource(sourceRef.key, true, ageDays);
    return this;
  }
  
  /**
   * Enregistre une source demandée mais non trouvée
   * 
   * INVARIANT INV-CRE-05 : Les sources manquantes doivent être explicites
   */
  addMissingSource(key: string): this {
    if (this.built) {
      throw CreationErrors.internal("Cannot add missing source after build");
    }
    
    this.confidenceBuilder.requestSource(key, false);
    return this;
  }
  
  /**
   * Ajoute une assumption
   * 
   * INVARIANT INV-CRE-05 : Les hypothèses doivent être explicites
   */
  addAssumption(
    field: string,
    assumedValue: unknown,
    reason: "SOURCE_MISSING" | "FIELD_MISSING" | "VALUE_AMBIGUOUS" | "INFERENCE_REQUIRED" | "DEFAULT_APPLIED",
    description: string
  ): this {
    if (this.built) {
      throw CreationErrors.internal("Cannot add assumption after build");
    }
    
    this.confidenceBuilder.addAssumption({
      field,
      assumed_value: assumedValue,
      reason,
      description,
    });
    return this;
  }
  
  /**
   * Définit le contenu de l'artifact
   */
  setContent(content: unknown): this {
    if (this.built) {
      throw CreationErrors.internal("Cannot set content after build");
    }
    
    this.content = content;
    return this;
  }
  
  /**
   * Construit l'artifact final
   * 
   * INVARIANT INV-CRE-09 : Atomic Output — tout ou rien
   * 
   * @returns Artifact complet et gelé
   * @throws CreationError si construction impossible
   */
  build(): Artifact {
    if (this.built) {
      throw CreationErrors.internal("Artifact already built");
    }
    
    // Validation pré-build
    if (this.content === null) {
      throw CreationErrors.internal("Content not set");
    }
    
    // Construire le confidence report
    const confidence = this.confidenceBuilder.build();
    
    // Calculer content_hash
    const contentEncoded = canonicalEncode(this.content);
    const contentHash = sha256Sync(contentEncoded);
    
    // Vérifier taille
    const contentSize = new TextEncoder().encode(contentEncoded).length;
    if (contentSize > this.config.maxArtifactBytes) {
      throw CreationErrors.artifactTooLarge(contentSize, this.config.maxArtifactBytes);
    }
    
    // Construire l'artifact sans hash ni id
    const artifactData = {
      artifact_type: this.artifactType,
      schema_version: SCHEMA_VERSION,
      snapshot_id: this.snapshotId,
      snapshot_root_hash: this.snapshotRootHash,
      source_refs: deepFreeze([...this.sourceRefs]),
      template_id: this.templateId,
      template_version: this.templateVersion,
      content: deepFreeze(structuredClone(this.content)),
      content_hash: contentHash,
      created_at_utc: new Date().toISOString(),
      confidence,
    };
    
    // Calculer artifact_hash
    const artifactEncoded = canonicalEncode(artifactData);
    const artifactHash = sha256Sync(artifactEncoded);
    
    // Dériver artifact_id du hash (déterministe)
    const artifactId = artifactHash.slice(0, 32);
    
    // Construire l'artifact final
    const artifact: Artifact = deepFreeze({
      artifact_id: artifactId,
      ...artifactData,
      artifact_hash: artifactHash,
    });
    
    this.built = true;
    return artifact;
  }
  
  /**
   * Vérifie si l'artifact a été construit
   */
  isBuilt(): boolean {
    return this.built;
  }
  
  /**
   * Récupère le nombre de sources
   */
  getSourceCount(): number {
    return this.sourceRefs.length;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — ARTIFACT BUILDER FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crée un nouveau contexte de construction
 */
export function createBuildContext(
  ctx: ReadOnlySnapshotContext,
  template: Template,
  config?: CreationConfig
): ArtifactBuildContext {
  return new ArtifactBuildContext(ctx, template, config);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — QUICK BUILD HELPER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Options pour quick build
 */
export interface QuickBuildOptions {
  readonly sourceRefs?: SourceRef[];
  readonly assumptions?: Array<{
    field: string;
    value: unknown;
    reason: "SOURCE_MISSING" | "FIELD_MISSING" | "VALUE_AMBIGUOUS" | "INFERENCE_REQUIRED" | "DEFAULT_APPLIED";
    description: string;
  }>;
  readonly config?: CreationConfig;
}

/**
 * Construit un artifact en une seule opération
 * 
 * Helper pour les cas simples où le contenu est déjà prêt
 */
export function buildArtifact(
  ctx: ReadOnlySnapshotContext,
  template: Template,
  content: unknown,
  options: QuickBuildOptions = {}
): Artifact {
  const builder = createBuildContext(ctx, template, options.config);
  
  // Ajouter les sources
  if (options.sourceRefs) {
    for (const ref of options.sourceRefs) {
      builder.addSource(ref);
    }
  }
  
  // Ajouter les assumptions
  if (options.assumptions) {
    for (const a of options.assumptions) {
      builder.addAssumption(a.field, a.value, a.reason, a.description);
    }
  }
  
  // Définir le contenu et construire
  return builder.setContent(content).build();
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — ARTIFACT VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Résultat de vérification d'artifact
 */
export interface ArtifactVerificationResult {
  readonly valid: boolean;
  readonly errors: string[];
}

/**
 * Vérifie l'intégrité d'un artifact
 * 
 * Checks:
 * - content_hash matches content
 * - artifact_hash matches artifact data
 * - artifact_id derives from artifact_hash
 */
export function verifyArtifact(artifact: Artifact): ArtifactVerificationResult {
  const errors: string[] = [];
  
  // Vérifier content_hash
  const contentEncoded = canonicalEncode(artifact.content);
  const expectedContentHash = sha256Sync(contentEncoded);
  if (artifact.content_hash !== expectedContentHash) {
    errors.push(`content_hash mismatch: expected ${expectedContentHash.slice(0, 16)}...`);
  }
  
  // Reconstruire artifact data pour hash
  const artifactData = {
    artifact_type: artifact.artifact_type,
    schema_version: artifact.schema_version,
    snapshot_id: artifact.snapshot_id,
    snapshot_root_hash: artifact.snapshot_root_hash,
    source_refs: artifact.source_refs,
    template_id: artifact.template_id,
    template_version: artifact.template_version,
    content: artifact.content,
    content_hash: artifact.content_hash,
    created_at_utc: artifact.created_at_utc,
    confidence: artifact.confidence,
  };
  
  const artifactEncoded = canonicalEncode(artifactData);
  const expectedArtifactHash = sha256Sync(artifactEncoded);
  if (artifact.artifact_hash !== expectedArtifactHash) {
    errors.push(`artifact_hash mismatch: expected ${expectedArtifactHash.slice(0, 16)}...`);
  }
  
  // Vérifier artifact_id
  const expectedId = artifact.artifact_hash.slice(0, 32);
  if (artifact.artifact_id !== expectedId) {
    errors.push(`artifact_id mismatch: expected ${expectedId}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Vérifie qu'un artifact n'a pas été altéré
 * 
 * @throws CreationError si artifact invalide
 */
export function requireValidArtifact(artifact: Artifact): void {
  const result = verifyArtifact(artifact);
  if (!result.valid) {
    throw CreationErrors.internal(
      `Artifact integrity violation: ${result.errors.join(", ")}`
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — ARTIFACT COMPARISON
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compare deux artifacts
 */
export function artifactsEqual(a: Artifact, b: Artifact): boolean {
  return a.artifact_hash === b.artifact_hash;
}

/**
 * Vérifie si un artifact est dérivé du même snapshot
 */
export function sameSnapshotOrigin(a: Artifact, b: Artifact): boolean {
  return a.snapshot_id === b.snapshot_id && 
         a.snapshot_root_hash === b.snapshot_root_hash;
}

/**
 * Vérifie si un artifact a une dérivation complète (pas d'assumptions)
 */
export function hasCompleteDerivation(artifact: Artifact): boolean {
  return artifact.confidence.derivation_complete;
}
