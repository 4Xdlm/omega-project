/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA PROJECT — CREATION_LAYER
 * creation_engine.ts — Creation Engine NASA-Grade
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * VERSION     : 1.0.0-NASA
 * PHASE       : 9D+9E
 * STANDARD    : DO-178C Level A / MIL-STD-882E
 * 
 * INVARIANTS COUVERTS :
 *   INV-CRE-02 : No Write Authority (création retourne proposal, pas d'écriture)
 *   INV-CRE-10 : Idempotency (même request → même artifact_hash)
 * 
 * ARCHITECTURE :
 *   Ce module est le point d'entrée principal pour créer des artifacts.
 *   Il orchestre :
 *   1. Validation de la request
 *   2. Résolution du template
 *   3. Création du contexte read-only
 *   4. Exécution du template
 *   5. Construction de l'artifact
 *   6. Retour d'une PROPOSAL (jamais d'écriture directe)
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type {
  CreationRequest,
  Artifact,
  Template,
  ReadOnlySnapshotContext,
  CreationConfig,
  SourceRef,
} from "./creation_types.js";
import { DEFAULT_CREATION_CONFIG } from "./creation_types.js";
import { CreationError, CreationErrors } from "./creation_errors.js";
import { validateRequest, computeRequestHashSync } from "./creation_request.js";
import { createReadOnlyContext, deepFreeze } from "./snapshot_context.js";
import type { SnapshotProvider } from "./snapshot_context.js";
import {
  TemplateRegistry,
  globalRegistry,
  executeTemplate,
  validateParams,
  validateOutput,
} from "./template_registry.js";
import {
  createBuildContext,
  verifyArtifact,
} from "./artifact_builder.js";

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — CREATION PROPOSAL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Proposal de création — INV-CRE-02
 * 
 * CREATION_LAYER ne peut PAS écrire dans MEMORY.
 * Il retourne une PROPOSAL que le caller peut accepter ou rejeter.
 */
export interface CreationProposal {
  /** La request originale */
  readonly request: CreationRequest;
  
  /** L'artifact proposé (frozen) */
  readonly artifact: Artifact;
  
  /** Résultat de validation */
  readonly validation: {
    readonly artifact_valid: boolean;
    readonly output_schema_valid: boolean;
    readonly provenance_complete: boolean;
  };
  
  /** Métriques d'exécution */
  readonly metrics: {
    readonly duration_ms: number;
    readonly template_id: string;
    readonly template_version: string;
  };
  
  /** Timestamp de création */
  readonly created_at_utc: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — CREATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Options du Creation Engine
 */
export interface CreationEngineOptions {
  /** Registry de templates (default: globalRegistry) */
  readonly registry?: TemplateRegistry;
  
  /** Configuration de création */
  readonly config?: CreationConfig;
  
  /** Callback de progression */
  readonly onProgress?: (stage: string, progress: number) => void;
}

/**
 * Creation Engine — Orchestrateur principal
 * 
 * INVARIANTS GARANTIS :
 * - INV-CRE-02 : No Write Authority (retourne proposal, pas d'écriture)
 * - INV-CRE-10 : Idempotency (même inputs → même outputs)
 */
export class CreationEngine {
  private readonly registry: TemplateRegistry;
  private readonly config: CreationConfig;
  private readonly onProgress?: (stage: string, progress: number) => void;
  
  constructor(options: CreationEngineOptions = {}) {
    this.registry = options.registry ?? globalRegistry;
    this.config = options.config ?? DEFAULT_CREATION_CONFIG;
    this.onProgress = options.onProgress;
  }
  
  /**
   * Exécute une request de création et retourne une PROPOSAL
   * 
   * INV-CRE-02 : Cette méthode ne peut PAS écrire dans MEMORY.
   *              Elle retourne une proposal que le caller décide d'appliquer.
   * 
   * @param request La request de création validée
   * @param provider Le fournisseur de snapshots (read-only)
   * @returns CreationProposal contenant l'artifact proposé
   * @throws CreationError en cas d'erreur
   */
  async execute(
    request: CreationRequest,
    provider: SnapshotProvider
  ): Promise<CreationProposal> {
    const startTime = Date.now();
    this.progress("validation", 0);
    
    // ─────────────────────────────────────────────────────────────────────────
    // ÉTAPE 1 : Validation de la request
    // ─────────────────────────────────────────────────────────────────────────
    
    const validation = validateRequest(request);
    if (!validation.valid) {
      throw validation.error;
    }
    
    // Vérifier le hash de la request
    const expectedHash = computeRequestHashSync(request);
    if (request.request_hash !== expectedHash) {
      throw CreationErrors.invalidRequest(
        "Request hash mismatch — request may have been tampered"
      );
    }
    
    this.progress("validation", 100);
    
    // ─────────────────────────────────────────────────────────────────────────
    // ÉTAPE 2 : Résolution du template
    // ─────────────────────────────────────────────────────────────────────────
    
    this.progress("template_resolution", 0);
    
    const [templateId, templateVersion] = this.parseTemplateId(request.template_id);
    const registered = this.registry.get(templateId, templateVersion);
    
    if (!registered) {
      throw CreationErrors.templateNotFound(request.template_id);
    }
    
    const template = registered.template;
    this.progress("template_resolution", 100);
    
    // ─────────────────────────────────────────────────────────────────────────
    // ÉTAPE 3 : Création du contexte read-only
    // ─────────────────────────────────────────────────────────────────────────
    
    this.progress("context_creation", 0);
    
    const ctx = createReadOnlyContext(provider, request.snapshot_id);
    
    this.progress("context_creation", 100);
    
    // ─────────────────────────────────────────────────────────────────────────
    // ÉTAPE 4 : Validation des paramètres
    // ─────────────────────────────────────────────────────────────────────────
    
    this.progress("params_validation", 0);
    
    if (template.input_schema) {
      validateParams(request.params, template.input_schema);
    }
    
    this.progress("params_validation", 100);
    
    // ─────────────────────────────────────────────────────────────────────────
    // ÉTAPE 5 : Exécution du template
    // ─────────────────────────────────────────────────────────────────────────
    
    this.progress("template_execution", 0);
    
    const timeoutMs = request.timeout_ms ?? this.config.defaultTimeoutMs;
    const result = await executeTemplate(template, ctx, request.params, {
      timeoutMs,
    });
    
    if (!result.success) {
      if (result.timedOut) {
        throw CreationErrors.executionTimeout(timeoutMs);
      }
      throw result.error ?? CreationErrors.executionFailed("Unknown error");
    }
    
    this.progress("template_execution", 100);
    
    // ─────────────────────────────────────────────────────────────────────────
    // ÉTAPE 6 : Validation de la sortie
    // ─────────────────────────────────────────────────────────────────────────
    
    this.progress("output_validation", 0);
    
    let outputSchemaValid = true;
    if (template.output_schema) {
      try {
        validateOutput(result.output, template.output_schema);
      } catch {
        outputSchemaValid = false;
      }
    }
    
    this.progress("output_validation", 100);
    
    // ─────────────────────────────────────────────────────────────────────────
    // ÉTAPE 7 : Construction de l'artifact
    // ─────────────────────────────────────────────────────────────────────────
    
    this.progress("artifact_build", 0);
    
    const builder = createBuildContext(ctx, template, this.config);
    
    // Extraire les sources du résultat si présentes
    const output = result.output as Record<string, unknown>;
    if (output && typeof output === "object") {
      // Si le template retourne des source_refs, les utiliser
      if (Array.isArray(output._source_refs)) {
        for (const ref of output._source_refs as SourceRef[]) {
          builder.addSource(ref);
        }
      }
      
      // Si le template retourne des assumptions, les utiliser
      if (Array.isArray(output._assumptions)) {
        for (const a of output._assumptions as Array<{
          field: string;
          value: unknown;
          reason: "SOURCE_MISSING" | "FIELD_MISSING" | "VALUE_AMBIGUOUS" | "INFERENCE_REQUIRED" | "DEFAULT_APPLIED";
          description: string;
        }>) {
          builder.addAssumption(a.field, a.value, a.reason, a.description);
        }
      }
      
      // Si le template retourne des missing sources, les utiliser
      if (Array.isArray(output._missing_sources)) {
        for (const key of output._missing_sources as string[]) {
          builder.addMissingSource(key);
        }
      }
    }
    
    // Définir le contenu (sans les métadonnées internes)
    const content = this.extractContent(output);
    builder.setContent(content);
    
    const artifact = builder.build();
    
    this.progress("artifact_build", 100);
    
    // ─────────────────────────────────────────────────────────────────────────
    // ÉTAPE 8 : Vérification finale
    // ─────────────────────────────────────────────────────────────────────────
    
    this.progress("final_verification", 0);
    
    const artifactVerification = verifyArtifact(artifact);
    
    this.progress("final_verification", 100);
    
    // ─────────────────────────────────────────────────────────────────────────
    // ÉTAPE 9 : Construction de la proposal
    // ─────────────────────────────────────────────────────────────────────────
    
    const proposal: CreationProposal = deepFreeze({
      request,
      artifact,
      validation: {
        artifact_valid: artifactVerification.valid,
        output_schema_valid: outputSchemaValid,
        provenance_complete: artifact.confidence.derivation_complete,
      },
      metrics: {
        duration_ms: Date.now() - startTime,
        template_id: template.id,
        template_version: template.version,
      },
      created_at_utc: new Date().toISOString(),
    });
    
    return proposal;
  }
  
  /**
   * Exécute de façon synchrone (sans timeout)
   * 
   * ATTENTION: Pas de protection timeout
   */
  executeSync(
    request: CreationRequest,
    provider: SnapshotProvider
  ): CreationProposal {
    const startTime = Date.now();
    
    // Validation
    const validation = validateRequest(request);
    if (!validation.valid) {
      throw validation.error;
    }
    
    // Vérifier le hash
    const expectedHash = computeRequestHashSync(request);
    if (request.request_hash !== expectedHash) {
      throw CreationErrors.invalidRequest("Request hash mismatch");
    }
    
    // Résolution template
    const [templateId, templateVersion] = this.parseTemplateId(request.template_id);
    const registered = this.registry.get(templateId, templateVersion);
    if (!registered) {
      throw CreationErrors.templateNotFound(request.template_id);
    }
    const template = registered.template;
    
    // Contexte
    const ctx = createReadOnlyContext(provider, request.snapshot_id);
    
    // Validation params
    if (template.input_schema) {
      validateParams(request.params, template.input_schema);
    }
    
    // Exécution synchrone
    const output = template.execute(ctx, request.params);
    
    // Validation output
    let outputSchemaValid = true;
    if (template.output_schema) {
      try {
        validateOutput(output, template.output_schema);
      } catch {
        outputSchemaValid = false;
      }
    }
    
    // Construction artifact
    const builder = createBuildContext(ctx, template, this.config);
    const outputObj = output as Record<string, unknown>;
    
    if (outputObj && typeof outputObj === "object") {
      if (Array.isArray(outputObj._source_refs)) {
        for (const ref of outputObj._source_refs as SourceRef[]) {
          builder.addSource(ref);
        }
      }
      if (Array.isArray(outputObj._assumptions)) {
        for (const a of outputObj._assumptions as Array<{
          field: string;
          value: unknown;
          reason: "SOURCE_MISSING" | "FIELD_MISSING" | "VALUE_AMBIGUOUS" | "INFERENCE_REQUIRED" | "DEFAULT_APPLIED";
          description: string;
        }>) {
          builder.addAssumption(a.field, a.value, a.reason, a.description);
        }
      }
      if (Array.isArray(outputObj._missing_sources)) {
        for (const key of outputObj._missing_sources as string[]) {
          builder.addMissingSource(key);
        }
      }
    }
    
    builder.setContent(this.extractContent(outputObj));
    const artifact = builder.build();
    
    // Vérification
    const artifactVerification = verifyArtifact(artifact);
    
    return deepFreeze({
      request,
      artifact,
      validation: {
        artifact_valid: artifactVerification.valid,
        output_schema_valid: outputSchemaValid,
        provenance_complete: artifact.confidence.derivation_complete,
      },
      metrics: {
        duration_ms: Date.now() - startTime,
        template_id: template.id,
        template_version: template.version,
      },
      created_at_utc: new Date().toISOString(),
    });
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────────────────
  
  private parseTemplateId(templateId: string): [string, string | undefined] {
    if (templateId.includes("@")) {
      const [id, version] = templateId.split("@");
      return [id!, version];
    }
    return [templateId, undefined];
  }
  
  private extractContent(output: unknown): unknown {
    if (!output || typeof output !== "object") {
      return output;
    }
    
    // Retirer les métadonnées internes
    const obj = output as Record<string, unknown>;
    const content: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (!key.startsWith("_")) {
        content[key] = value;
      }
    }
    
    return content;
  }
  
  private progress(stage: string, percent: number): void {
    if (this.onProgress) {
      this.onProgress(stage, percent);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — CONVENIENCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Instance globale du Creation Engine
 */
export const globalEngine = new CreationEngine();

/**
 * Exécute une request avec le global engine
 */
export async function createArtifact(
  request: CreationRequest,
  provider: SnapshotProvider
): Promise<CreationProposal> {
  return globalEngine.execute(request, provider);
}

/**
 * Exécute une request de façon synchrone
 */
export function createArtifactSync(
  request: CreationRequest,
  provider: SnapshotProvider
): CreationProposal {
  return globalEngine.executeSync(request, provider);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — PROPOSAL HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Vérifie si une proposal est valide et prête à être appliquée
 */
export function isProposalValid(proposal: CreationProposal): boolean {
  return (
    proposal.validation.artifact_valid &&
    proposal.validation.output_schema_valid
  );
}

/**
 * Vérifie si une proposal a une dérivation complète (sans assumptions)
 */
export function isProposalComplete(proposal: CreationProposal): boolean {
  return (
    isProposalValid(proposal) &&
    proposal.validation.provenance_complete
  );
}

/**
 * Extrait l'artifact d'une proposal valide
 * 
 * @throws CreationError si proposal invalide
 */
export function extractArtifact(proposal: CreationProposal): Artifact {
  if (!isProposalValid(proposal)) {
    throw CreationErrors.internal(
      "Cannot extract artifact from invalid proposal"
    );
  }
  return proposal.artifact;
}
