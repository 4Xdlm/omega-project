/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA PROJECT — CREATION_LAYER
 * template_registry.ts — Template Registry & Execution NASA-Grade
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * VERSION     : 1.0.0-NASA
 * PHASE       : 9C
 * STANDARD    : DO-178C Level A / MIL-STD-882E
 * 
 * INVARIANTS COUVERTS :
 *   INV-CRE-04 : Deterministic Output (même input → même output)
 *   INV-CRE-08 : Bounded Execution (timeout — NCR-CRE-02: soft limit)
 * 
 * NCR OUVERTES :
 *   NCR-CRE-01 : Template Purity non prouvable sans sandbox réelle
 *   NCR-CRE-02 : Timeout non garanti sans worker/coop (soft limit only)
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type {
  Template,
  RegisteredTemplate,
  ArtifactType,
  ReadOnlySnapshotContext,
  JSONSchema,
} from "./creation_types.js";
import { CreationError, CreationErrors } from "./creation_errors.js";
import { deepFreeze } from "./snapshot_context.js";

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — TEMPLATE REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Registry central des templates
 * 
 * Thread-safe (Map est atomique en JS single-thread)
 * Immutable après enregistrement (templates gelés)
 */
export class TemplateRegistry {
  private readonly templates: Map<string, RegisteredTemplate> = new Map();
  private readonly byArtifactType: Map<ArtifactType, Set<string>> = new Map();
  
  /**
   * Enregistre un template
   * 
   * @param template Le template à enregistrer
   * @param registeredBy Identifiant de l'enregistrant
   * @throws CreationError si template invalide ou déjà enregistré
   */
  register(template: Template, registeredBy: string = "system"): void {
    // Validation
    this.validateTemplate(template);
    
    // Vérifier doublon
    const key = this.makeKey(template.id, template.version);
    if (this.templates.has(key)) {
      throw CreationErrors.invalidRequest(
        `Template already registered: ${key}`,
        { template_id: template.id, version: template.version }
      );
    }
    
    // Enregistrer (frozen)
    const registered: RegisteredTemplate = deepFreeze({
      template: deepFreeze({ ...template }),
      registered_at_utc: new Date().toISOString(),
      registered_by: registeredBy,
    });
    
    this.templates.set(key, registered);
    
    // Index par artifact type
    let typeSet = this.byArtifactType.get(template.artifact_type);
    if (!typeSet) {
      typeSet = new Set();
      this.byArtifactType.set(template.artifact_type, typeSet);
    }
    typeSet.add(key);
  }
  
  /**
   * Récupère un template par ID et version
   * 
   * @param templateId ID du template
   * @param version Version exacte (optionnel: latest si omis)
   * @returns Template enregistré ou null
   */
  get(templateId: string, version?: string): RegisteredTemplate | null {
    if (version) {
      const key = this.makeKey(templateId, version);
      return this.templates.get(key) ?? null;
    }
    
    // Chercher la dernière version
    return this.getLatest(templateId);
  }
  
  /**
   * Récupère la dernière version d'un template
   */
  getLatest(templateId: string): RegisteredTemplate | null {
    let latest: RegisteredTemplate | null = null;
    let latestVersion: number[] = [];
    
    for (const [key, registered] of this.templates) {
      if (key.startsWith(`${templateId}@`)) {
        const version = this.parseVersion(registered.template.version);
        if (this.compareVersions(version, latestVersion) > 0) {
          latestVersion = version;
          latest = registered;
        }
      }
    }
    
    return latest;
  }
  
  /**
   * Vérifie si un template existe
   */
  has(templateId: string, version?: string): boolean {
    return this.get(templateId, version) !== null;
  }
  
  /**
   * Liste tous les templates enregistrés
   */
  list(): RegisteredTemplate[] {
    return Array.from(this.templates.values());
  }
  
  /**
   * Liste les templates par type d'artifact
   */
  listByType(artifactType: ArtifactType): RegisteredTemplate[] {
    const keys = this.byArtifactType.get(artifactType);
    if (!keys) return [];
    
    const result: RegisteredTemplate[] = [];
    for (const key of keys) {
      const reg = this.templates.get(key);
      if (reg) result.push(reg);
    }
    return result;
  }
  
  /**
   * Nombre de templates enregistrés
   */
  get size(): number {
    return this.templates.size;
  }
  
  /**
   * Supprime tous les templates (pour tests)
   */
  clear(): void {
    this.templates.clear();
    this.byArtifactType.clear();
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────────────────
  
  private makeKey(id: string, version: string): string {
    return `${id}@${version}`;
  }
  
  private parseVersion(version: string): number[] {
    return version.split(".").map(n => parseInt(n, 10));
  }
  
  private compareVersions(a: number[], b: number[]): number {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const av = a[i] ?? 0;
      const bv = b[i] ?? 0;
      if (av > bv) return 1;
      if (av < bv) return -1;
    }
    return 0;
  }
  
  private validateTemplate(template: Template): void {
    if (!template.id || typeof template.id !== "string") {
      throw CreationErrors.invalidRequest("Template id required");
    }
    if (!/^[A-Z][A-Z0-9_]{0,63}$/.test(template.id)) {
      throw CreationErrors.invalidRequest(
        "Template id must be UPPER_SNAKE_CASE"
      );
    }
    if (!template.version || !/^\d+\.\d+\.\d+$/.test(template.version)) {
      throw CreationErrors.invalidRequest(
        "Template version must be SemVer (x.y.z)"
      );
    }
    if (typeof template.execute !== "function") {
      throw CreationErrors.invalidRequest(
        "Template must have execute function"
      );
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — TEMPLATE EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Options d'exécution
 */
export interface ExecutionOptions {
  /** Timeout en ms (NCR-CRE-02: soft limit only) */
  readonly timeoutMs?: number;
  /** Callback de progression (optionnel) */
  readonly onProgress?: (progress: number) => void;
}

/**
 * Résultat d'exécution
 */
export interface ExecutionResult {
  readonly success: boolean;
  readonly output?: unknown;
  readonly error?: CreationError;
  readonly durationMs: number;
  readonly timedOut: boolean;
}

/**
 * Exécute un template avec timeout (soft limit)
 * 
 * INVARIANT INV-CRE-08 : Bounded Execution
 * NCR-CRE-02 : Le timeout est un soft limit, une boucle sync infinie
 *              ne sera pas interrompue sans Worker/VM
 * 
 * @param template Le template à exécuter
 * @param ctx Contexte read-only du snapshot
 * @param params Paramètres validés
 * @param options Options d'exécution
 * @returns Résultat de l'exécution
 */
export async function executeTemplate(
  template: Template,
  ctx: ReadOnlySnapshotContext,
  params: unknown,
  options: ExecutionOptions = {}
): Promise<ExecutionResult> {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const startTime = Date.now();
  
  // Créer une promesse avec timeout
  const timeoutPromise = new Promise<ExecutionResult>((resolve) => {
    setTimeout(() => {
      resolve({
        success: false,
        error: CreationErrors.executionTimeout(timeoutMs),
        durationMs: Date.now() - startTime,
        timedOut: true,
      });
    }, timeoutMs);
  });
  
  // Créer la promesse d'exécution
  const executionPromise = new Promise<ExecutionResult>((resolve) => {
    try {
      // NCR-CRE-02: Ceci est synchrone, le timeout ne peut pas l'interrompre
      // si c'est une boucle infinie. C'est documenté comme limitation.
      const output = template.execute(ctx, params);
      
      resolve({
        success: true,
        output,
        durationMs: Date.now() - startTime,
        timedOut: false,
      });
    } catch (e) {
      resolve({
        success: false,
        error: e instanceof CreationError 
          ? e 
          : CreationErrors.executionFailed(
              e instanceof Error ? e.message : String(e),
              e instanceof Error ? e : undefined
            ),
        durationMs: Date.now() - startTime,
        timedOut: false,
      });
    }
  });
  
  // Race entre exécution et timeout
  return Promise.race([executionPromise, timeoutPromise]);
}

/**
 * Exécute un template de façon synchrone (sans timeout)
 * 
 * ATTENTION: Pas de protection timeout
 * Utiliser uniquement pour templates connus et courts
 */
export function executeTemplateSync(
  template: Template,
  ctx: ReadOnlySnapshotContext,
  params: unknown
): unknown {
  try {
    return template.execute(ctx, params);
  } catch (e) {
    if (e instanceof CreationError) throw e;
    throw CreationErrors.executionFailed(
      e instanceof Error ? e.message : String(e),
      e instanceof Error ? e : undefined
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — PARAMS VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Valide des paramètres contre un JSON Schema (simplifié)
 * 
 * Note: Validation basique, pas une implémentation JSON Schema complète
 * Pour production, utiliser ajv ou similar
 * 
 * @param params Paramètres à valider
 * @param schema Schema de validation
 * @returns true si valide
 * @throws CreationError si invalide
 */
export function validateParams(params: unknown, schema: JSONSchema): boolean {
  const errors = validateValue(params, schema, "params");
  
  if (errors.length > 0) {
    throw CreationErrors.paramsValidationFailed(
      errors.join("; "),
      { errors }
    );
  }
  
  return true;
}

function validateValue(
  value: unknown,
  schema: JSONSchema,
  path: string
): string[] {
  const errors: string[] = [];
  
  // Type check
  const actualType = getJsonType(value);
  if (schema.type && actualType !== schema.type) {
    // null is allowed for any type if not explicitly forbidden
    if (actualType !== "null") {
      errors.push(`${path}: expected ${schema.type}, got ${actualType}`);
      return errors; // Stop validation on type mismatch
    }
  }
  
  // String validations
  if (schema.type === "string" && typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${path}: string too short (min ${schema.minLength})`);
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push(`${path}: string too long (max ${schema.maxLength})`);
    }
  }
  
  // Number validations
  if (schema.type === "number" && typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${path}: number too small (min ${schema.minimum})`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`${path}: number too large (max ${schema.maximum})`);
    }
  }
  
  // Enum validation
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path}: value not in enum [${schema.enum.join(", ")}]`);
  }
  
  // Object validations
  if (schema.type === "object" && typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    
    // Required properties
    if (schema.required) {
      for (const req of schema.required) {
        if (!(req in obj)) {
          errors.push(`${path}: missing required property "${req}"`);
        }
      }
    }
    
    // Property validations
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in obj) {
          errors.push(...validateValue(obj[key], propSchema, `${path}.${key}`));
        }
      }
    }
  }
  
  // Array validations
  if (schema.type === "array" && Array.isArray(value)) {
    if (schema.items) {
      for (let i = 0; i < value.length; i++) {
        errors.push(...validateValue(value[i], schema.items, `${path}[${i}]`));
      }
    }
  }
  
  return errors;
}

function getJsonType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — OUTPUT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Valide la sortie d'un template contre son output_schema
 * 
 * @param output Sortie du template
 * @param schema Schema de validation
 * @returns true si valide
 * @throws CreationError si invalide
 */
export function validateOutput(output: unknown, schema: JSONSchema): boolean {
  const errors = validateValue(output, schema, "output");
  
  if (errors.length > 0) {
    throw CreationErrors.outputValidationFailed(
      errors.join("; "),
      { errors }
    );
  }
  
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — GLOBAL REGISTRY INSTANCE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Instance globale du registry
 * 
 * Usage: import { globalRegistry } from "./template_registry.js"
 */
export const globalRegistry = new TemplateRegistry();

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6 — TEMPLATE BUILDER HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Helper pour créer un template avec validation
 */
export function createTemplate(config: {
  id: string;
  version: string;
  artifactType: ArtifactType;
  description: string;
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
  execute: (ctx: ReadOnlySnapshotContext, params: unknown) => unknown;
}): Template {
  return deepFreeze({
    id: config.id,
    version: config.version,
    artifact_type: config.artifactType,
    description: config.description,
    input_schema: config.inputSchema,
    output_schema: config.outputSchema,
    execute: config.execute,
  });
}
