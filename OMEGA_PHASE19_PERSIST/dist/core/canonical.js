/**
 * OMEGA Persistence Layer — Canonical JSON Encoder
 * Phase 19 — v3.19.0
 * Standard: MIL-STD-882E / DO-178C Level A
 *
 * INV-PER-04: Format JSON déterministe
 *
 * Garanties:
 * - Ordre des clés alphabétique
 * - Pas de whitespace inutile
 * - Nombres normalisés (pas de -0, pas de trailing zeros)
 * - UTF-8 strict
 * - Même input => même bytes => même hash
 */
import { computeHash } from './types.js';
// ═══════════════════════════════════════════════════════════════════════════════
// CANONICAL ENCODER
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Encode un objet en JSON canonique (déterministe)
 *
 * Règles:
 * 1. Clés triées alphabétiquement (récursif)
 * 2. Pas d'espaces
 * 3. Nombres: pas de -0, pas d'exposants inutiles
 * 4. Strings: échappées proprement
 */
export function canonicalEncode(value) {
    return JSON.stringify(sortDeep(value), replacer);
}
/**
 * Encode en bytes avec hash calculé
 */
export function canonicalEncodeWithHash(value) {
    const json = canonicalEncode(value);
    const bytes = Buffer.from(json, 'utf8');
    const hash = computeHash(bytes);
    return { bytes, json, hash };
}
/**
 * Décode du JSON canonique
 */
export function canonicalDecode(json) {
    return JSON.parse(json);
}
/**
 * Décode des bytes avec vérification de hash
 */
export function canonicalDecodeWithVerify(bytes, expectedHash) {
    const actualHash = computeHash(bytes);
    const json = bytes.toString('utf8');
    const data = canonicalDecode(json);
    const verified = expectedHash === undefined || actualHash === expectedHash;
    return { data, hash: actualHash, verified };
}
// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Trie les clés d'objets récursivement
 */
function sortDeep(value) {
    if (value === null || value === undefined) {
        return value;
    }
    if (Array.isArray(value)) {
        return value.map(sortDeep);
    }
    if (typeof value === 'object') {
        const sorted = {};
        const keys = Object.keys(value).sort();
        for (const key of keys) {
            sorted[key] = sortDeep(value[key]);
        }
        return sorted;
    }
    return value;
}
/**
 * Replacer pour normaliser les nombres
 */
function replacer(_key, value) {
    // Normaliser -0 en 0
    if (typeof value === 'number') {
        if (Object.is(value, -0)) {
            return 0;
        }
        // NaN et Infinity ne sont pas valides en JSON standard
        if (!Number.isFinite(value)) {
            return null;
        }
    }
    return value;
}
// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Vérifie si une string est du JSON canonique valide
 */
export function isCanonicalJson(json) {
    try {
        const parsed = JSON.parse(json);
        const reencoded = canonicalEncode(parsed);
        return json === reencoded;
    }
    catch {
        return false;
    }
}
/**
 * Vérifie le hash d'un JSON
 */
export function verifyJsonHash(json, expectedHash) {
    const bytes = Buffer.from(json, 'utf8');
    const actualHash = computeHash(bytes);
    return actualHash === expectedHash;
}
// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════
export const CanonicalJson = {
    encode: canonicalEncode,
    encodeWithHash: canonicalEncodeWithHash,
    decode: canonicalDecode,
    decodeWithVerify: canonicalDecodeWithVerify,
    isCanonical: isCanonicalJson,
    verifyHash: verifyJsonHash,
};
//# sourceMappingURL=canonical.js.map