/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA PROJECT — CREATION_LAYER
 * creation_request.ts — Request Validation & Hashing NASA-Grade
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * VERSION     : 1.0.0-NASA
 * PHASE       : 9A
 * STANDARD    : DO-178C Level A
 * 
 * INVARIANTS COUVERTS :
 *   INV-CRE-07 : Request Validation (toute requête validée AVANT traitement)
 *   INV-CRE-10 : Idempotency (request_hash déterministe)
 * 
 * DÉPENDANCE CRITIQUE :
 *   Réutilise CANONICAL_ENCODE de MEMORY_LAYER pour garantir déterminisme
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { 
  CreationRequest, 
  CreationConfig,
} from "./creation_types.js";
import { DEFAULT_CREATION_CONFIG } from "./creation_types.js";
import { CreationError, CreationErrors } from "./creation_errors.js";

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — CANONICAL ENCODE (FROM MEMORY_LAYER)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * CANONICAL_ENCODE — Encodage déterministe pour hash
 * 
 * Règles strictes :
 * - Objets : clés triées lexicographiquement
 * - Arrays : ordre préservé
 * - Numbers : NaN/Infinity rejetés, -0 → 0
 * - Strings/booleans/null : JSON standard
 * - undefined : rejeté
 * - BigInt/Symbol/Function : rejeté
 * 
 * INVARIANT INV-MEM-10 appliqué ici aussi
 */
export function canonicalEncode(value: unknown): string {
  return JSON.stringify(canonicalizeValue(value));
}

function canonicalizeValue(value: unknown): unknown {
  // null
  if (value === null) return null;
  
  // undefined — REJETÉ
  if (value === undefined) {
    throw new CreationError(
      "INVALID_REQUEST",
      "Cannot encode undefined value"
    );
  }
  
  // Primitives
  const type = typeof value;
  
  if (type === "boolean") return value;
  
  if (type === "string") return value;
  
  if (type === "number") {
    const num = value as number;
    // NaN et Infinity rejetés (non déterministes cross-platform)
    if (!Number.isFinite(num)) {
      throw new CreationError(
        "INVALID_REQUEST",
        `Cannot encode non-finite number: ${num}`
      );
    }
    // -0 normalisé en 0
    if (Object.is(num, -0)) return 0;
    return num;
  }
  
  if (type === "bigint") {
    throw new CreationError(
      "INVALID_REQUEST",
      "Cannot encode BigInt (use string representation)"
    );
  }
  
  if (type === "symbol") {
    throw new CreationError(
      "INVALID_REQUEST",
      "Cannot encode Symbol"
    );
  }
  
  if (type === "function") {
    throw new CreationError(
      "INVALID_REQUEST",
      "Cannot encode Function"
    );
  }
  
  // Arrays
  if (Array.isArray(value)) {
    return value.map(canonicalizeValue);
  }
  
  // Objects
  if (type === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort(); // Tri lexicographique
    const result: Record<string, unknown> = {};
    
    for (const key of keys) {
      const v = obj[key];
      if (v !== undefined) { // Skip undefined properties
        result[key] = canonicalizeValue(v);
      }
    }
    
    return result;
  }
  
  throw new CreationError(
    "INVALID_REQUEST",
    `Cannot encode value of type: ${type}`
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — SHA256 HASH
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * SHA256 hash d'une string
 * Utilise SubtleCrypto si disponible, sinon fallback synchrone
 */
export async function sha256(data: string): Promise<string> {
  // Node.js / Deno
  if (typeof globalThis.crypto?.subtle?.digest === "function") {
    const encoder = new TextEncoder();
    const buffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }
  
  // Fallback : utilise createHash si disponible (Node.js)
  try {
    const { createHash } = await import("crypto");
    return createHash("sha256").update(data).digest("hex");
  } catch {
    throw new CreationError(
      "INTERNAL_ERROR",
      "No SHA256 implementation available"
    );
  }
}

/**
 * SHA256 synchrone (pour environnements sans async)
 */
export function sha256Sync(data: string): string {
  // Node.js only
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createHash } = require("crypto");
    return createHash("sha256").update(data).digest("hex");
  } catch {
    throw new CreationError(
      "INTERNAL_ERROR",
      "No synchronous SHA256 implementation available"
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — REQUEST VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Résultat de validation
 */
export type ValidationResult = 
  | { readonly valid: true }
  | { readonly valid: false; readonly error: CreationError };

/**
 * Règles de validation pour request_id
 */
const REQUEST_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

/**
 * Règles de validation pour snapshot_id
 */
const SNAPSHOT_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;

/**
 * Règles de validation pour template_id
 */
const TEMPLATE_ID_REGEX = /^[A-Z][A-Z0-9_]{0,63}$/;

/**
 * Valide une CreationRequest COMPLÈTE
 * 
 * INVARIANT INV-CRE-07 : Toute requête validée AVANT traitement
 * 
 * @param request La requête à valider
 * @param config Configuration optionnelle
 * @returns ValidationResult
 */
export function validateRequest(
  request: unknown,
  config: CreationConfig = DEFAULT_CREATION_CONFIG
): ValidationResult {
  
  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1 : Type de base
  // ─────────────────────────────────────────────────────────────────────────────
  
  if (request === null || typeof request !== "object") {
    return {
      valid: false,
      error: CreationErrors.invalidRequest("Request must be an object"),
    };
  }
  
  const req = request as Record<string, unknown>;
  
  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2 : request_id
  // ─────────────────────────────────────────────────────────────────────────────
  
  if (typeof req.request_id !== "string") {
    return {
      valid: false,
      error: CreationErrors.invalidRequest("request_id must be a string"),
    };
  }
  
  if (!REQUEST_ID_REGEX.test(req.request_id)) {
    return {
      valid: false,
      error: CreationErrors.invalidRequest(
        "request_id must match pattern: alphanumeric, underscore, hyphen, 1-64 chars",
        { pattern: REQUEST_ID_REGEX.source }
      ),
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3 : snapshot_id (OBLIGATOIRE — INV-CRE-01)
  // ─────────────────────────────────────────────────────────────────────────────
  
  if (typeof req.snapshot_id !== "string") {
    return {
      valid: false,
      error: CreationErrors.invalidRequest("snapshot_id must be a string"),
    };
  }
  
  if (req.snapshot_id.length === 0) {
    return {
      valid: false,
      error: CreationErrors.invalidRequest("snapshot_id cannot be empty"),
    };
  }
  
  if (!SNAPSHOT_ID_REGEX.test(req.snapshot_id)) {
    return {
      valid: false,
      error: CreationErrors.invalidRequest(
        "snapshot_id must match pattern: alphanumeric, underscore, hyphen, 1-128 chars",
        { pattern: SNAPSHOT_ID_REGEX.source }
      ),
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 4 : template_id
  // ─────────────────────────────────────────────────────────────────────────────
  
  if (typeof req.template_id !== "string") {
    return {
      valid: false,
      error: CreationErrors.invalidRequest("template_id must be a string"),
    };
  }
  
  if (!TEMPLATE_ID_REGEX.test(req.template_id)) {
    return {
      valid: false,
      error: CreationErrors.invalidRequest(
        "template_id must match pattern: UPPER_SNAKE_CASE, start with letter, 1-64 chars",
        { pattern: TEMPLATE_ID_REGEX.source }
      ),
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 5 : params (peut être anything, mais doit être encodable)
  // ─────────────────────────────────────────────────────────────────────────────
  
  if (!("params" in req)) {
    return {
      valid: false,
      error: CreationErrors.invalidRequest("params field is required"),
    };
  }
  
  try {
    canonicalEncode(req.params);
  } catch (e) {
    return {
      valid: false,
      error: CreationErrors.invalidRequest(
        "params must be JSON-encodable",
        { reason: e instanceof Error ? e.message : String(e) }
      ),
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 6 : timeout_ms (optionnel)
  // ─────────────────────────────────────────────────────────────────────────────
  
  if (req.timeout_ms !== undefined) {
    if (typeof req.timeout_ms !== "number") {
      return {
        valid: false,
        error: CreationErrors.invalidRequest("timeout_ms must be a number"),
      };
    }
    
    if (!Number.isInteger(req.timeout_ms)) {
      return {
        valid: false,
        error: CreationErrors.invalidRequest("timeout_ms must be an integer"),
      };
    }
    
    if (req.timeout_ms < 100) {
      return {
        valid: false,
        error: CreationErrors.invalidRequest("timeout_ms must be >= 100"),
      };
    }
    
    if (req.timeout_ms > 300_000) {
      return {
        valid: false,
        error: CreationErrors.invalidRequest("timeout_ms must be <= 300000 (5 minutes)"),
      };
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 7 : request_hash
  // ─────────────────────────────────────────────────────────────────────────────
  
  if (typeof req.request_hash !== "string") {
    return {
      valid: false,
      error: CreationErrors.invalidRequest("request_hash must be a string"),
    };
  }
  
  if (!/^[a-f0-9]{64}$/.test(req.request_hash)) {
    return {
      valid: false,
      error: CreationErrors.invalidRequest(
        "request_hash must be a 64-char lowercase hex string (SHA256)"
      ),
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 8 : Vérification du hash
  // ─────────────────────────────────────────────────────────────────────────────
  
  const expectedHash = computeRequestHashSync(req as unknown as CreationRequest);
  if (req.request_hash !== expectedHash) {
    return {
      valid: false,
      error: CreationErrors.invalidRequest(
        "request_hash does not match computed hash",
        { expected: expectedHash, provided: req.request_hash }
      ),
    };
  }
  
  return { valid: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — REQUEST HASH COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Données utilisées pour le hash (sans request_hash lui-même)
 */
interface RequestHashInput {
  readonly request_id: string;
  readonly snapshot_id: string;
  readonly template_id: string;
  readonly params: unknown;
  readonly timeout_ms?: number;
}

/**
 * Extrait les données hashables d'une request
 */
function extractHashInput(request: CreationRequest | Record<string, unknown>): RequestHashInput {
  return {
    request_id: request.request_id as string,
    snapshot_id: request.snapshot_id as string,
    template_id: request.template_id as string,
    params: request.params,
    timeout_ms: request.timeout_ms as number | undefined,
  };
}

/**
 * Calcule le hash d'une request (async)
 * 
 * INVARIANT INV-CRE-10 : même input → même hash
 */
export async function computeRequestHash(
  request: Omit<CreationRequest, "request_hash"> | CreationRequest
): Promise<string> {
  const input = extractHashInput(request as Record<string, unknown>);
  const encoded = canonicalEncode(input);
  return sha256(encoded);
}

/**
 * Calcule le hash d'une request (sync)
 */
export function computeRequestHashSync(
  request: Omit<CreationRequest, "request_hash"> | CreationRequest
): string {
  const input = extractHashInput(request as Record<string, unknown>);
  const encoded = canonicalEncode(input);
  return sha256Sync(encoded);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — REQUEST BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Input pour créer une request (sans hash)
 */
export interface CreateRequestInput {
  readonly request_id: string;
  readonly snapshot_id: string;
  readonly template_id: string;
  readonly params: unknown;
  readonly timeout_ms?: number;
}

/**
 * Crée une CreationRequest valide avec hash calculé
 * 
 * @param input Les données de la requête
 * @returns CreationRequest complète et valide
 * @throws CreationError si input invalide
 */
export async function createRequest(input: CreateRequestInput): Promise<CreationRequest> {
  // Validation préliminaire
  const preliminaryRequest = {
    ...input,
    request_hash: "0".repeat(64), // Placeholder
  };
  
  // Calculer le vrai hash
  const hash = await computeRequestHash(input);
  
  const request: CreationRequest = {
    request_id: input.request_id,
    snapshot_id: input.snapshot_id,
    template_id: input.template_id,
    params: input.params,
    timeout_ms: input.timeout_ms,
    request_hash: hash,
  };
  
  // Validation finale
  const validation = validateRequest(request);
  if (!validation.valid) {
    throw validation.error;
  }
  
  return Object.freeze(request);
}

/**
 * Version synchrone de createRequest
 */
export function createRequestSync(input: CreateRequestInput): CreationRequest {
  const hash = computeRequestHashSync(input);
  
  const request: CreationRequest = {
    request_id: input.request_id,
    snapshot_id: input.snapshot_id,
    template_id: input.template_id,
    params: input.params,
    timeout_ms: input.timeout_ms,
    request_hash: hash,
  };
  
  const validation = validateRequest(request);
  if (!validation.valid) {
    throw validation.error;
  }
  
  return Object.freeze(request);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6 — UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Vérifie si deux requests sont identiques (même hash)
 */
export function requestsEqual(a: CreationRequest, b: CreationRequest): boolean {
  return a.request_hash === b.request_hash;
}

/**
 * Clone une request (retourne nouvel objet gelé)
 */
export function cloneRequest(request: CreationRequest): CreationRequest {
  return Object.freeze({
    request_id: request.request_id,
    snapshot_id: request.snapshot_id,
    template_id: request.template_id,
    params: structuredClone(request.params),
    timeout_ms: request.timeout_ms,
    request_hash: request.request_hash,
  });
}

/**
 * Génère un request_id unique (basé sur timestamp + random)
 * Note: utilisé uniquement côté client, pas dans les calculs de hash
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `req_${timestamp}_${random}`;
}
