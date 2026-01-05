/**
 * OMEGA CANON_CORE — Hash Utilities
 * Phase 18 — Memory Foundation
 * Standard: MIL-STD-882E / DO-178C Level A
 * 
 * INV-MEM-05: Persistence intègre (hash chain verification)
 */

import { createHash } from 'crypto';
import { HASH_CONFIG } from './constants.js';
import type { Fact, CreateFactInput, AuditEntry } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CORE HASH FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcule le hash SHA-256 d'une chaîne
 * @param data - Données à hasher
 * @returns Hash hexadécimal (64 caractères)
 */
export function sha256(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Encode canoniquement un objet pour hashing déterministe
 * Ordre des clés garanti, pas de whitespace superflu
 * @param obj - Objet à encoder
 * @returns Chaîne JSON canonique
 */
export function canonicalEncode(obj: Record<string, unknown>): string {
  const sortedKeys = Object.keys(obj).sort();
  const parts: string[] = [];
  
  for (const key of sortedKeys) {
    const value = obj[key];
    if (value === undefined) continue;
    
    let encodedValue: string;
    if (value === null) {
      encodedValue = 'null';
    } else if (typeof value === 'object') {
      if (Array.isArray(value)) {
        encodedValue = '[' + value.map(v => 
          typeof v === 'object' && v !== null 
            ? canonicalEncode(v as Record<string, unknown>)
            : JSON.stringify(v)
        ).join(',') + ']';
      } else {
        encodedValue = canonicalEncode(value as Record<string, unknown>);
      }
    } else {
      encodedValue = JSON.stringify(value);
    }
    
    parts.push(`"${key}":${encodedValue}`);
  }
  
  return '{' + parts.join(',') + '}';
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACT HASHING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcule le hash d'un fait
 * Le hash inclut: type, subject, predicate, value, source, version, previousHash
 * @param fact - Fait à hasher (sans le hash lui-même)
 * @returns Hash SHA-256
 */
export function hashFact(fact: Omit<Fact, 'hash'>): string {
  const hashable = {
    type: fact.type,
    subject: fact.subject,
    predicate: fact.predicate,
    value: fact.value,
    source: fact.source,
    version: fact.version,
    previousHash: fact.previousHash,
    createdAt: fact.metadata.createdAt,
  };
  
  return sha256(canonicalEncode(hashable));
}

/**
 * Vérifie l'intégrité d'un fait
 * @param fact - Fait à vérifier
 * @returns true si le hash est valide
 */
export function verifyFactHash(fact: Fact): boolean {
  const computed = hashFact(fact);
  return computed === fact.hash;
}

/**
 * Vérifie la chaîne de hash entre deux facts consécutifs
 * @param current - Fait actuel
 * @param previous - Fait précédent (ou null si premier)
 * @returns true si la chaîne est intègre
 */
export function verifyChain(current: Fact, previous: Fact | null): boolean {
  if (previous === null) {
    return current.previousHash === HASH_CONFIG.GENESIS_HASH;
  }
  return current.previousHash === previous.hash;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MERKLE ROOT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcule le hash Merkle root d'un ensemble de facts
 * @param hashes - Liste de hashes de facts
 * @returns Merkle root hash
 */
export function computeMerkleRoot(hashes: readonly string[]): string {
  if (hashes.length === 0) {
    return HASH_CONFIG.GENESIS_HASH;
  }
  
  if (hashes.length === 1) {
    return hashes[0]!;
  }
  
  // Construire l'arbre de Merkle
  let level = [...hashes];
  
  while (level.length > 1) {
    const nextLevel: string[] = [];
    
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i]!;
      const right = level[i + 1] ?? left; // Duplicate last if odd
      nextLevel.push(sha256(left + right));
    }
    
    level = nextLevel;
  }
  
  return level[0]!;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT HASHING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcule le hash d'une entrée d'audit
 * @param entry - Entrée d'audit (sans le hash)
 * @param previousHash - Hash de l'entrée précédente
 * @returns Hash SHA-256
 */
export function hashAuditEntry(
  entry: Omit<AuditEntry, 'hash'>,
  previousHash: string
): string {
  const hashable = {
    id: entry.id,
    timestamp: entry.timestamp,
    action: entry.action,
    factId: entry.factId,
    actor: entry.actor,
    details: entry.details ?? {},
    previousHash,
  };
  
  return sha256(canonicalEncode(hashable));
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT HASHING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcule le hash d'un export complet
 * @param facts - Liste des facts
 * @param auditTrail - Historique d'audit
 * @param snapshot - Snapshot
 * @returns Hash de l'export
 */
export function hashExport(
  facts: readonly Fact[],
  auditTrail: readonly AuditEntry[],
  snapshotHash: string
): string {
  const factHashes = facts.map(f => f.hash);
  const auditHashes = auditTrail.map(a => a.hash);
  
  const combined = {
    factsMerkle: computeMerkleRoot(factHashes),
    auditMerkle: computeMerkleRoot(auditHashes),
    snapshot: snapshotHash,
  };
  
  return sha256(canonicalEncode(combined));
}

// ═══════════════════════════════════════════════════════════════════════════════
// ID GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

// Counter for unique IDs within session
let factIdCounter = 0;

/**
 * Génère un ID unique déterministe pour un fait
 * Format: fact_<timestamp>_<hash8>
 * @param input - Input de création
 * @param timestamp - Timestamp ISO
 * @returns ID unique
 */
export function generateFactId(input: CreateFactInput, timestamp: string): string {
  // Include value, source, and counter in hash to ensure uniqueness
  const counter = factIdCounter++;
  const hashInput = `${input.type}:${input.subject}:${input.predicate}:${input.value}:${input.source}:${timestamp}:${counter}`;
  const shortHash = sha256(hashInput).substring(0, 8);
  const ts = timestamp.replace(/[-:TZ.]/g, '').substring(0, 14);
  return `fact_${ts}_${shortHash}`;
}

/**
 * Reset counter (for testing only)
 */
export function resetFactIdCounter(): void {
  factIdCounter = 0;
}

/**
 * Génère un ID unique pour un snapshot
 * Format: snap_<timestamp>_<hash8>
 * @param rootHash - Hash racine
 * @param timestamp - Timestamp ISO
 * @returns ID unique
 */
export function generateSnapshotId(rootHash: string, timestamp: string): string {
  const shortHash = rootHash.substring(0, 8);
  const ts = timestamp.replace(/[-:TZ.]/g, '').substring(0, 14);
  return `snap_${ts}_${shortHash}`;
}

/**
 * Génère un ID unique pour une entrée d'audit
 * Format: audit_<timestamp>_<hash8>
 * @param action - Action effectuée
 * @param factId - ID du fait concerné
 * @param timestamp - Timestamp ISO
 * @returns ID unique
 */
export function generateAuditId(
  action: string,
  factId: string,
  timestamp: string
): string {
  const hashInput = `${action}:${factId}:${timestamp}`;
  const shortHash = sha256(hashInput).substring(0, 8);
  const ts = timestamp.replace(/[-:TZ.]/g, '').substring(0, 14);
  return `audit_${ts}_${shortHash}`;
}

/**
 * Génère un ID unique pour un conflit
 * Format: conflict_<timestamp>_<hash8>
 * @param existingId - ID du fait existant
 * @param subject - Subject du fait entrant
 * @param timestamp - Timestamp ISO
 * @returns ID unique
 */
export function generateConflictId(
  existingId: string,
  subject: string,
  timestamp: string
): string {
  const hashInput = `${existingId}:${subject}:${timestamp}`;
  const shortHash = sha256(hashInput).substring(0, 8);
  const ts = timestamp.replace(/[-:TZ.]/g, '').substring(0, 14);
  return `conflict_${ts}_${shortHash}`;
}
