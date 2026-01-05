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
/**
 * Encode un objet en JSON canonique (déterministe)
 *
 * Règles:
 * 1. Clés triées alphabétiquement (récursif)
 * 2. Pas d'espaces
 * 3. Nombres: pas de -0, pas d'exposants inutiles
 * 4. Strings: échappées proprement
 */
export declare function canonicalEncode(value: unknown): string;
/**
 * Encode en bytes avec hash calculé
 */
export declare function canonicalEncodeWithHash(value: unknown): {
    bytes: Buffer;
    json: string;
    hash: string;
};
/**
 * Décode du JSON canonique
 */
export declare function canonicalDecode<T>(json: string): T;
/**
 * Décode des bytes avec vérification de hash
 */
export declare function canonicalDecodeWithVerify<T>(bytes: Buffer, expectedHash?: string): {
    data: T;
    hash: string;
    verified: boolean;
};
/**
 * Vérifie si une string est du JSON canonique valide
 */
export declare function isCanonicalJson(json: string): boolean;
/**
 * Vérifie le hash d'un JSON
 */
export declare function verifyJsonHash(json: string, expectedHash: string): boolean;
export declare const CanonicalJson: {
    readonly encode: typeof canonicalEncode;
    readonly encodeWithHash: typeof canonicalEncodeWithHash;
    readonly decode: typeof canonicalDecode;
    readonly decodeWithVerify: typeof canonicalDecodeWithVerify;
    readonly isCanonical: typeof isCanonicalJson;
    readonly verifyHash: typeof verifyJsonHash;
};
//# sourceMappingURL=canonical.d.ts.map