/**
 * OMEGA CANON_CORE — Hash Utilities
 * Phase 18 — Memory Foundation
 * Standard: MIL-STD-882E / DO-178C Level A
 *
 * INV-MEM-05: Persistence intègre (hash chain verification)
 */
import type { Fact, CreateFactInput, AuditEntry } from './types.js';
/**
 * Calcule le hash SHA-256 d'une chaîne
 * @param data - Données à hasher
 * @returns Hash hexadécimal (64 caractères)
 */
export declare function sha256(data: string): string;
/**
 * Encode canoniquement un objet pour hashing déterministe
 * Ordre des clés garanti, pas de whitespace superflu
 * @param obj - Objet à encoder
 * @returns Chaîne JSON canonique
 */
export declare function canonicalEncode(obj: Record<string, unknown>): string;
/**
 * Calcule le hash d'un fait
 * Le hash inclut: type, subject, predicate, value, source, version, previousHash
 * @param fact - Fait à hasher (sans le hash lui-même)
 * @returns Hash SHA-256
 */
export declare function hashFact(fact: Omit<Fact, 'hash'>): string;
/**
 * Vérifie l'intégrité d'un fait
 * @param fact - Fait à vérifier
 * @returns true si le hash est valide
 */
export declare function verifyFactHash(fact: Fact): boolean;
/**
 * Vérifie la chaîne de hash entre deux facts consécutifs
 * @param current - Fait actuel
 * @param previous - Fait précédent (ou null si premier)
 * @returns true si la chaîne est intègre
 */
export declare function verifyChain(current: Fact, previous: Fact | null): boolean;
/**
 * Calcule le hash Merkle root d'un ensemble de facts
 * @param hashes - Liste de hashes de facts
 * @returns Merkle root hash
 */
export declare function computeMerkleRoot(hashes: readonly string[]): string;
/**
 * Calcule le hash d'une entrée d'audit
 * @param entry - Entrée d'audit (sans le hash)
 * @param previousHash - Hash de l'entrée précédente
 * @returns Hash SHA-256
 */
export declare function hashAuditEntry(entry: Omit<AuditEntry, 'hash'>, previousHash: string): string;
/**
 * Calcule le hash d'un export complet
 * @param facts - Liste des facts
 * @param auditTrail - Historique d'audit
 * @param snapshot - Snapshot
 * @returns Hash de l'export
 */
export declare function hashExport(facts: readonly Fact[], auditTrail: readonly AuditEntry[], snapshotHash: string): string;
/**
 * Génère un ID unique déterministe pour un fait
 * Format: fact_<timestamp>_<hash8>
 * @param input - Input de création
 * @param timestamp - Timestamp ISO
 * @returns ID unique
 */
export declare function generateFactId(input: CreateFactInput, timestamp: string): string;
/**
 * Reset counter (for testing only)
 */
export declare function resetFactIdCounter(): void;
/**
 * Génère un ID unique pour un snapshot
 * Format: snap_<timestamp>_<hash8>
 * @param rootHash - Hash racine
 * @param timestamp - Timestamp ISO
 * @returns ID unique
 */
export declare function generateSnapshotId(rootHash: string, timestamp: string): string;
/**
 * Génère un ID unique pour une entrée d'audit
 * Format: audit_<timestamp>_<hash8>
 * @param action - Action effectuée
 * @param factId - ID du fait concerné
 * @param timestamp - Timestamp ISO
 * @returns ID unique
 */
export declare function generateAuditId(action: string, factId: string, timestamp: string): string;
/**
 * Génère un ID unique pour un conflit
 * Format: conflict_<timestamp>_<hash8>
 * @param existingId - ID du fait existant
 * @param subject - Subject du fait entrant
 * @param timestamp - Timestamp ISO
 * @returns ID unique
 */
export declare function generateConflictId(existingId: string, subject: string, timestamp: string): string;
//# sourceMappingURL=hash.d.ts.map