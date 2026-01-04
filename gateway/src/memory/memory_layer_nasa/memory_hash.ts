/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA PROJECT — MEMORY_LAYER
 * memory_hash.ts — Cryptographic Hashing NASA-Grade
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * VERSION     : 1.0.0-NASA
 * PHASE       : 10A
 * STANDARD    : DO-178C Level A / MIL-STD-882E
 * 
 * INVARIANTS COUVERTS :
 *   INV-MEM-06 : Hash Integrity (tout record a un hash vérifiable)
 *   INV-MEM-02 : Deterministic Retrieval (même input → même hash)
 * 
 * ALGORITHME :
 *   SHA-256 pour tous les hashes.
 *   Encodage canonique JSON pour garantir le déterminisme.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { createHash } from "crypto";

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — CANONICAL ENCODING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Encode une valeur en JSON canonique (déterministe)
 * 
 * RÈGLES :
 * - Clés d'objets triées alphabétiquement
 * - Pas d'espaces
 * - Pas de trailing commas
 * - null, boolean, number : standard JSON
 * - string : échappé
 * - undefined : exclu
 * 
 * INV-MEM-02 : Garantit que même input → même output
 */
export function canonicalEncode(value: unknown): string {
  return JSON.stringify(value, (_, v) => {
    if (v === undefined) {
      return undefined;
    }
    
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      // Trier les clés alphabétiquement
      const sorted: Record<string, unknown> = {};
      const keys = Object.keys(v).sort();
      for (const key of keys) {
        const val = (v as Record<string, unknown>)[key];
        if (val !== undefined) {
          sorted[key] = val;
        }
      }
      return sorted;
    }
    
    return v;
  });
}

/**
 * Vérifie si deux valeurs ont le même encodage canonique
 */
export function canonicalEqual(a: unknown, b: unknown): boolean {
  return canonicalEncode(a) === canonicalEncode(b);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — SHA-256 HASHING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcule le hash SHA-256 d'une string
 * 
 * @returns Hash hexadécimal en minuscules (64 caractères)
 */
export function sha256(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

/**
 * Calcule le hash SHA-256 d'un buffer
 */
export function sha256Buffer(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Calcule le hash SHA-256 d'une valeur quelconque
 * (via encodage canonique)
 */
export function sha256Value(value: unknown): string {
  return sha256(canonicalEncode(value));
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — RECORD HASHING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Input pour calculer le hash d'un payload
 */
export interface PayloadHashInput {
  readonly payload: unknown;
}

/**
 * Calcule le hash d'un payload
 * 
 * INV-MEM-06 : Hash intégrité du contenu
 */
export function computePayloadHash(input: PayloadHashInput): string {
  return sha256Value(input.payload);
}

/**
 * Input pour calculer le hash d'un record complet
 */
export interface RecordHashInput {
  readonly key: string;
  readonly version: number;
  readonly payload_hash: string;
  readonly created_at_utc: string;
  readonly provenance: unknown;
  readonly previous_hash?: string;
}

/**
 * Calcule le hash d'un record complet
 * 
 * INV-MEM-06 : Hash intégrité du record
 * 
 * ORDRE DES CHAMPS (déterministe) :
 * 1. key
 * 2. version
 * 3. payload_hash
 * 4. created_at_utc
 * 5. provenance (canonique)
 * 6. previous_hash (si présent)
 */
export function computeRecordHash(input: RecordHashInput): string {
  const hashInput: Record<string, unknown> = {
    key: input.key,
    version: input.version,
    payload_hash: input.payload_hash,
    created_at_utc: input.created_at_utc,
    provenance: input.provenance,
  };
  
  if (input.previous_hash !== undefined) {
    hashInput.previous_hash = input.previous_hash;
  }
  
  return sha256Value(hashInput);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — HASH CHAIN (MERKLE-LIKE)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Combine deux hashes en un seul (pour arbres Merkle)
 */
export function combineHashes(left: string, right: string): string {
  // Toujours dans l'ordre lexicographique pour déterminisme
  const [first, second] = left < right ? [left, right] : [right, left];
  return sha256(`${first}${second}`);
}

/**
 * Calcule la racine Merkle d'une liste de hashes
 * 
 * @param hashes Liste de hashes (doit être non vide)
 * @returns Hash racine
 */
export function computeMerkleRoot(hashes: readonly string[]): string {
  if (hashes.length === 0) {
    // Hash d'un store vide
    return sha256("EMPTY_STORE");
  }
  
  if (hashes.length === 1) {
    return hashes[0]!;
  }
  
  // Construire l'arbre niveau par niveau
  let level = [...hashes];
  
  while (level.length > 1) {
    const nextLevel: string[] = [];
    
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 < level.length) {
        nextLevel.push(combineHashes(level[i]!, level[i + 1]!));
      } else {
        // Nombre impair : dupliquer le dernier
        nextLevel.push(combineHashes(level[i]!, level[i]!));
      }
    }
    
    level = nextLevel;
  }
  
  return level[0]!;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — HASH VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Résultat de vérification de hash
 */
export interface HashVerificationResult {
  readonly valid: boolean;
  readonly computed_hash: string;
  readonly expected_hash: string;
  readonly field: "payload" | "record";
}

/**
 * Vérifie le hash d'un payload
 */
export function verifyPayloadHash(
  payload: unknown,
  expectedHash: string
): HashVerificationResult {
  const computed = computePayloadHash({ payload });
  return {
    valid: computed === expectedHash,
    computed_hash: computed,
    expected_hash: expectedHash,
    field: "payload",
  };
}

/**
 * Vérifie le hash d'un record complet
 */
export function verifyRecordHash(
  input: RecordHashInput,
  expectedHash: string
): HashVerificationResult {
  const computed = computeRecordHash(input);
  return {
    valid: computed === expectedHash,
    computed_hash: computed,
    expected_hash: expectedHash,
    field: "record",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6 — HASH CHAIN VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Résultat de vérification de chaîne
 */
export interface ChainVerificationResult {
  readonly valid: boolean;
  readonly verified_count: number;
  readonly first_invalid_index?: number;
  readonly error?: string;
}

/**
 * Vérifie une chaîne de hashes (versions successives)
 * 
 * @param hashes Liste de hashes dans l'ordre chronologique
 * @param previousHashes Liste des previous_hash correspondants
 */
export function verifyHashChain(
  hashes: readonly string[],
  previousHashes: readonly (string | undefined)[]
): ChainVerificationResult {
  if (hashes.length !== previousHashes.length) {
    return {
      valid: false,
      verified_count: 0,
      error: "hashes and previousHashes arrays must have same length",
    };
  }
  
  if (hashes.length === 0) {
    return { valid: true, verified_count: 0 };
  }
  
  // Premier élément ne doit pas avoir de previous_hash
  if (previousHashes[0] !== undefined) {
    return {
      valid: false,
      verified_count: 0,
      first_invalid_index: 0,
      error: "First record should not have previous_hash",
    };
  }
  
  // Vérifier la chaîne
  for (let i = 1; i < hashes.length; i++) {
    if (previousHashes[i] !== hashes[i - 1]) {
      return {
        valid: false,
        verified_count: i,
        first_invalid_index: i,
        error: `Chain broken at index ${i}: previous_hash does not match`,
      };
    }
  }
  
  return { valid: true, verified_count: hashes.length };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7 — HASH ID GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Génère un ID court à partir d'un hash
 * 
 * @param hash Hash complet (64 caractères)
 * @param length Longueur de l'ID (défaut: 16)
 * @returns Préfixe du hash
 */
export function hashToId(hash: string, length: number = 16): string {
  if (hash.length < length) {
    throw new Error(`Hash too short: expected at least ${length} chars`);
  }
  return hash.substring(0, length);
}

/**
 * Génère un ID unique basé sur le contenu
 */
export function generateContentId(content: unknown): string {
  const hash = sha256Value(content);
  return hashToId(hash, 32);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8 — HASH UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Vérifie si une string est un hash SHA-256 valide
 */
export function isValidHash(hash: unknown): hash is string {
  return (
    typeof hash === "string" &&
    hash.length === 64 &&
    /^[a-f0-9]{64}$/.test(hash)
  );
}

/**
 * Hash constant pour "null" / "empty"
 */
export const NULL_HASH = sha256("NULL");
export const EMPTY_HASH = sha256("");

/**
 * Compare deux hashes de façon sécurisée (timing-safe)
 * 
 * Note: Pour une vraie implémentation timing-safe, utiliser crypto.timingSafeEqual
 */
export function hashesEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9 — DETERMINISM TESTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Vérifie le déterminisme du hashing
 * 
 * @param value Valeur à tester
 * @param iterations Nombre d'itérations (défaut: 100)
 * @returns true si tous les hashes sont identiques
 */
export function verifyDeterminism(value: unknown, iterations: number = 100): boolean {
  const firstHash = sha256Value(value);
  
  for (let i = 1; i < iterations; i++) {
    const hash = sha256Value(value);
    if (hash !== firstHash) {
      return false;
    }
  }
  
  return true;
}
