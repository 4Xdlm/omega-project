// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — MEMORY_LAYER — canonical_key.ts
// Phase 8 — NASA-Grade L4 / DO-178C Level A
// Version: 1.0.0-NASA
// 
// INV-MEM-04: Indexation Canonique
// Toute entrée est indexée par une clé canonique valide.
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────────
// RÈGLES DE VALIDATION (CNC-300 §6)
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Règles pour les clés canoniques:
 * 
 * 1. STRUCTURE: segments séparés par ":"
 * 2. SEGMENTS: minimum 3, maximum 8
 * 3. FORMAT SEGMENT: [a-z][a-z0-9_]* (commence par lettre minuscule)
 * 4. LONGUEUR SEGMENT: 1-64 caractères
 * 5. LONGUEUR TOTALE: 5-256 caractères
 * 6. INTERDITS: majuscules, tirets, espaces, segments vides
 * 
 * Exemples valides:
 * - character:marie:state
 * - character:marie:emotion:baseline
 * - location:rivierazur:building_a:floor_2
 * - timeline:main:chapter_12:scene_3
 * - promise:marie_to_vick:status
 * - relation:marie:vick:delta
 * - digest:context:chapter_01:scene_01
 * 
 * Exemples invalides:
 * - Character:marie:state (majuscule)
 * - character::state (segment vide)
 * - character:marie (pas assez de segments)
 * - character:marie:st-ate (tiret interdit)
 */

// ─────────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────────

/** Longueur minimale d'une clé */
export const MIN_KEY_LENGTH = 5;

/** Longueur maximale d'une clé */
export const MAX_KEY_LENGTH = 256;

/** Nombre minimum de segments */
export const MIN_SEGMENTS = 3;

/** Nombre maximum de segments */
export const MAX_SEGMENTS = 8;

/** Longueur maximale d'un segment */
export const MAX_SEGMENT_LENGTH = 64;

// ─────────────────────────────────────────────────────────────────────────────────
// REGEX
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Regex pour un segment individuel:
 * - Commence par une lettre minuscule [a-z]
 * - Suivi de lettres minuscules, chiffres ou underscores [a-z0-9_]*
 */
const SEGMENT_REGEX = /^[a-z][a-z0-9_]*$/;

/**
 * Regex complète pour validation rapide:
 * - 3 à 8 segments
 * - Chaque segment: [a-z][a-z0-9_]{0,63}
 */
export const CANONICAL_KEY_REGEX =
  /^[a-z][a-z0-9_]{0,63}:[a-z][a-z0-9_]{0,63}:[a-z][a-z0-9_]{0,63}(?::[a-z][a-z0-9_]{0,63}){0,5}$/;

// ─────────────────────────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Résultat de validation avec détails d'erreur.
 */
export interface KeyValidationResult {
  valid: boolean;
  error?: string;
  segments?: string[];
}

/**
 * Valide une clé canonique avec diagnostic détaillé.
 * 
 * @param key - Clé à valider
 * @returns Résultat avec détails
 */
export function validateCanonicalKey(key: unknown): KeyValidationResult {
  // Type check
  if (typeof key !== "string") {
    return { valid: false, error: "Key must be a string" };
  }

  // Length check
  if (key.length < MIN_KEY_LENGTH) {
    return { valid: false, error: `Key too short (min ${MIN_KEY_LENGTH})` };
  }
  if (key.length > MAX_KEY_LENGTH) {
    return { valid: false, error: `Key too long (max ${MAX_KEY_LENGTH})` };
  }

  // Empty segment check (::)
  if (key.includes("::")) {
    return { valid: false, error: "Empty segment detected (::)" };
  }

  // Leading/trailing colon
  if (key.startsWith(":") || key.endsWith(":")) {
    return { valid: false, error: "Key cannot start or end with colon" };
  }

  // Split and validate segments
  const segments = key.split(":");

  // Segment count check
  if (segments.length < MIN_SEGMENTS) {
    return {
      valid: false,
      error: `Too few segments (min ${MIN_SEGMENTS}, got ${segments.length})`,
    };
  }
  if (segments.length > MAX_SEGMENTS) {
    return {
      valid: false,
      error: `Too many segments (max ${MAX_SEGMENTS}, got ${segments.length})`,
    };
  }

  // Validate each segment
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];

    // Length check
    if (seg.length === 0) {
      return { valid: false, error: `Empty segment at position ${i}` };
    }
    if (seg.length > MAX_SEGMENT_LENGTH) {
      return {
        valid: false,
        error: `Segment ${i} too long (max ${MAX_SEGMENT_LENGTH}, got ${seg.length})`,
      };
    }

    // Format check
    if (!SEGMENT_REGEX.test(seg)) {
      return {
        valid: false,
        error: `Invalid segment format at position ${i}: "${seg}"`,
      };
    }
  }

  return { valid: true, segments };
}

/**
 * Valide une clé canonique (version simple boolean).
 * 
 * @param key - Clé à valider
 * @returns true si valide
 */
export function isValidCanonicalKey(key: unknown): key is string {
  // Fast path avec regex
  if (typeof key !== "string") return false;
  if (key.length < MIN_KEY_LENGTH || key.length > MAX_KEY_LENGTH) return false;
  
  return CANONICAL_KEY_REGEX.test(key);
}

// ─────────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Parse une clé canonique en segments.
 * 
 * @param key - Clé valide
 * @returns Array de segments
 * @throws Error si clé invalide
 */
export function parseCanonicalKey(key: string): string[] {
  const result = validateCanonicalKey(key);
  if (!result.valid) {
    throw new Error(`Invalid canonical key: ${result.error}`);
  }
  return result.segments!;
}

/**
 * Construit une clé canonique à partir de segments.
 * 
 * @param segments - Array de segments
 * @returns Clé canonique
 * @throws Error si segments invalides
 */
export function buildCanonicalKey(...segments: string[]): string {
  const key = segments.join(":");
  const result = validateCanonicalKey(key);
  if (!result.valid) {
    throw new Error(`Cannot build canonical key: ${result.error}`);
  }
  return key;
}

/**
 * Extrait le domaine (premier segment) d'une clé.
 */
export function getDomain(key: string): string {
  const segments = parseCanonicalKey(key);
  return segments[0];
}

/**
 * Extrait le type d'entité (deuxième segment) d'une clé.
 */
export function getEntityType(key: string): string {
  const segments = parseCanonicalKey(key);
  return segments[1];
}

/**
 * Vérifie si une clé est dans un domaine donné.
 */
export function isInDomain(key: string, domain: string): boolean {
  if (!isValidCanonicalKey(key)) return false;
  return key.startsWith(`${domain}:`);
}

/**
 * Vérifie si une clé est préfixée par une autre.
 */
export function hasPrefix(key: string, prefix: string): boolean {
  if (!isValidCanonicalKey(key)) return false;
  return key === prefix || key.startsWith(`${prefix}:`);
}
