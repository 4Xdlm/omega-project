/**
 * OMEGA CANON_ENGINE — Source de Vérité Unique
 * Module: gateway/src/gates/canon_engine.ts
 * Phase: 7B — NASA-Grade L4
 * 
 * @description Le Canon est la LOI. Tout fait établi est immuable.
 *              Pas d'écrasement silencieux. Pas de rollback sans trace.
 * 
 * @invariant INV-CANON-01: Source unique (un seul canon actif)
 * @invariant INV-CANON-02: Pas d'écrasement silencieux (append-only)
 * @invariant INV-CANON-03: Historicité obligatoire (chaque version traçable)
 * @invariant INV-CANON-04: Hash Merkle stable (même faits = même hash)
 * @invariant INV-CANON-05: Conflit = exception explicite (jamais silencieux)
 */

import { CanonState, CanonFact, FactType } from "./types";

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const ENGINE_NAME = "CANON_ENGINE";
const ENGINE_VERSION = "1.0.0";

// ═══════════════════════════════════════════════════════════════════════
// ERROR TYPES
// ═══════════════════════════════════════════════════════════════════════

export class CanonError extends Error {
  constructor(
    message: string,
    public readonly code: CanonErrorCode,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "CanonError";
  }
}

export type CanonErrorCode =
  | "DUPLICATE_FACT"      // Fait déjà existant
  | "CONFLICT_DETECTED"   // Contradiction avec fait existant
  | "INVALID_FACT"        // Fait malformé
  | "VERSION_MISMATCH"    // Tentative de modifier ancienne version
  | "ROLLBACK_FORBIDDEN"  // Rollback sans autorisation
  | "CANON_LOCKED";       // Canon verrouillé

// ═══════════════════════════════════════════════════════════════════════
// HISTORY TRACKING
// ═══════════════════════════════════════════════════════════════════════

export interface CanonHistoryEntry {
  /** Version du canon */
  version: string;
  /** Hash à cette version */
  rootHash: string;
  /** Timestamp */
  timestamp: string;
  /** Action effectuée */
  action: "CREATE" | "ADD_FACT" | "ADD_FACTS" | "LOCK" | "FORK";
  /** Nombre de faits */
  factCount: number;
  /** ID des faits ajoutés (si applicable) */
  addedFactIds?: string[];
}

// ═══════════════════════════════════════════════════════════════════════
// CANON ENGINE INTERFACE
// ═══════════════════════════════════════════════════════════════════════

export interface CanonEngine {
  /** Nom du moteur */
  readonly name: string;
  /** Version du moteur */
  readonly version: string;
  
  /** Crée un nouveau canon vide */
  create(): CanonState;
  
  /** Ajoute un fait au canon (retourne nouveau canon) */
  addFact(canon: CanonState, fact: Omit<CanonFact, "id" | "proofHash" | "establishedTimestamp">): CanonState;
  
  /** Ajoute plusieurs faits (atomique) */
  addFacts(canon: CanonState, facts: Array<Omit<CanonFact, "id" | "proofHash" | "establishedTimestamp">>): CanonState;
  
  /** Vérifie si un fait existe */
  hasFact(canon: CanonState, subject: string, predicate: string): boolean;
  
  /** Recherche des faits par sujet */
  findBySubject(canon: CanonState, subject: string): CanonFact[];
  
  /** Recherche des faits par type */
  findByType(canon: CanonState, type: FactType): CanonFact[];
  
  /** Vérifie si un nouveau fait entre en conflit */
  checkConflict(canon: CanonState, subject: string, predicate: string): CanonFact | null;
  
  /** Calcule le hash Merkle du canon */
  computeHash(canon: CanonState): string;
  
  /** Vérifie l'intégrité du canon */
  verify(canon: CanonState): boolean;
  
  /** Obtient l'historique des versions */
  getHistory(): CanonHistoryEntry[];
  
  /** Verrouille le canon (plus de modifications) */
  lock(canon: CanonState): CanonState;
  
  /** Vérifie si le canon est verrouillé */
  isLocked(canon: CanonState): boolean;
}

// ═══════════════════════════════════════════════════════════════════════
// HASH UTILITIES
// ═══════════════════════════════════════════════════════════════════════

/**
 * Hash déterministe pour les faits
 * INV-CANON-04: Même contenu = même hash
 */
function computeFactHash(fact: Omit<CanonFact, "proofHash">): string {
  const canonical = JSON.stringify({
    type: fact.type,
    subject: fact.subject,
    predicate: fact.predicate,
    object: fact.object || null,
    establishedAt: fact.establishedAt
  });
  return simpleHash(canonical);
}

/**
 * Hash Merkle pour le canon complet
 */
function computeMerkleRoot(facts: CanonFact[]): string {
  if (facts.length === 0) return "0".repeat(64);
  
  // Tri déterministe par ID
  const sorted = [...facts].sort((a, b) => a.id.localeCompare(b.id));
  
  // Concaténation des hashes
  const hashes = sorted.map(f => f.proofHash);
  
  // Merkle tree simplifié (concaténation itérative)
  let current = hashes;
  while (current.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < current.length; i += 2) {
      const left = current[i];
      const right = current[i + 1] || left;
      next.push(simpleHash(left + right));
    }
    current = next;
  }
  
  return current[0];
}

/**
 * Hash simple (à remplacer par SHA256 en production)
 */
function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, "0");
}

/**
 * Génère un ID unique pour un fait
 */
function generateFactId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `FACT-${timestamp}-${random}`;
}

/**
 * Incrémente la version (semver patch)
 */
function incrementVersion(version: string): string {
  const parts = version.split(".").map(Number);
  parts[2] = (parts[2] || 0) + 1;
  return parts.join(".");
}

// ═══════════════════════════════════════════════════════════════════════
// CANON ENGINE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════

/**
 * Crée une instance de CanonEngine
 * 
 * @example
 * const engine = createCanonEngine();
 * let canon = engine.create();
 * canon = engine.addFact(canon, {
 *   type: "CHARACTER",
 *   subject: "Marie",
 *   predicate: "protagoniste",
 *   establishedAt: "chapter-1"
 * });
 */
export function createCanonEngine(): CanonEngine {
  // Historique interne (INV-CANON-03)
  const history: CanonHistoryEntry[] = [];
  
  // Set des canons verrouillés (par rootHash)
  const lockedCanons = new Set<string>();
  
  function recordHistory(
    canon: CanonState,
    action: CanonHistoryEntry["action"],
    addedFactIds?: string[]
  ): void {
    history.push({
      version: canon.version,
      rootHash: canon.rootHash,
      timestamp: canon.lastUpdated,
      action,
      factCount: canon.facts.length,
      addedFactIds
    });
  }
  
  return {
    name: ENGINE_NAME,
    version: ENGINE_VERSION,
    
    create(): CanonState {
      const canon: CanonState = {
        version: "1.0.0",
        facts: [],
        rootHash: "0".repeat(64),
        lastUpdated: new Date().toISOString()
      };
      
      recordHistory(canon, "CREATE");
      return canon;
    },
    
    addFact(
      canon: CanonState,
      fact: Omit<CanonFact, "id" | "proofHash" | "establishedTimestamp">
    ): CanonState {
      // INV-CANON-05: Vérifier si verrouillé
      if (lockedCanons.has(canon.rootHash)) {
        throw new CanonError(
          "Canon is locked, no modifications allowed",
          "CANON_LOCKED",
          { rootHash: canon.rootHash }
        );
      }
      
      // INV-CANON-02: Vérifier doublon
      const existingFact = canon.facts.find(
        f => f.subject === fact.subject && f.predicate === fact.predicate
      );
      
      if (existingFact) {
        throw new CanonError(
          `Fact already exists: ${fact.subject} ${fact.predicate}`,
          "DUPLICATE_FACT",
          { existingId: existingFact.id }
        );
      }
      
      // INV-CANON-05: Vérifier conflit
      const conflict = this.checkConflict(canon, fact.subject, fact.predicate);
      if (conflict) {
        throw new CanonError(
          `Conflict detected with existing fact: ${conflict.id}`,
          "CONFLICT_DETECTED",
          { conflictingFact: conflict }
        );
      }
      
      // Créer le fait complet
      const timestamp = new Date().toISOString();
      const newFact: CanonFact = {
        ...fact,
        id: generateFactId(),
        establishedTimestamp: timestamp,
        proofHash: computeFactHash({ ...fact, id: "", establishedTimestamp: timestamp })
      };
      
      // Créer nouveau canon (immutabilité)
      const newFacts = [...canon.facts, newFact];
      const newCanon: CanonState = {
        version: incrementVersion(canon.version),
        facts: newFacts,
        rootHash: computeMerkleRoot(newFacts),
        lastUpdated: timestamp
      };
      
      recordHistory(newCanon, "ADD_FACT", [newFact.id]);
      return newCanon;
    },
    
    addFacts(
      canon: CanonState,
      facts: Array<Omit<CanonFact, "id" | "proofHash" | "establishedTimestamp">>
    ): CanonState {
      // Ajout atomique
      let currentCanon = canon;
      const addedIds: string[] = [];
      
      for (const fact of facts) {
        try {
          currentCanon = this.addFact(currentCanon, fact);
          const lastFact = currentCanon.facts[currentCanon.facts.length - 1];
          addedIds.push(lastFact.id);
        } catch (error) {
          // Rollback implicite (on n'a pas modifié l'original)
          throw error;
        }
      }
      
      // Enregistrer comme opération batch
      recordHistory(currentCanon, "ADD_FACTS", addedIds);
      return currentCanon;
    },
    
    hasFact(canon: CanonState, subject: string, predicate: string): boolean {
      return canon.facts.some(
        f => f.subject.toLowerCase() === subject.toLowerCase() &&
             f.predicate.toLowerCase() === predicate.toLowerCase()
      );
    },
    
    findBySubject(canon: CanonState, subject: string): CanonFact[] {
      const subjectLower = subject.toLowerCase();
      return canon.facts.filter(
        f => f.subject.toLowerCase() === subjectLower
      );
    },
    
    findByType(canon: CanonState, type: FactType): CanonFact[] {
      return canon.facts.filter(f => f.type === type);
    },
    
    checkConflict(canon: CanonState, subject: string, predicate: string): CanonFact | null {
      // Rechercher des faits contradictoires sur le même sujet
      const subjectFacts = this.findBySubject(canon, subject);
      
      // Pattern de contradiction: états mutuellement exclusifs
      const stateConflicts: Record<string, string[]> = {
        "vivant": ["mort", "décédé", "dead"],
        "mort": ["vivant", "alive", "living"],
        "alive": ["dead", "mort", "décédé"],
        "dead": ["alive", "vivant"],
        "present": ["absent", "parti", "gone"],
        "absent": ["present", "là", "here"],
        "ami": ["ennemi", "enemy"],
        "ennemi": ["ami", "friend"],
      };
      
      const predicateLower = predicate.toLowerCase();
      const conflicts = stateConflicts[predicateLower] || [];
      
      for (const fact of subjectFacts) {
        const factPredicateLower = fact.predicate.toLowerCase();
        if (conflicts.includes(factPredicateLower)) {
          return fact;
        }
      }
      
      return null;
    },
    
    computeHash(canon: CanonState): string {
      return computeMerkleRoot(canon.facts);
    },
    
    verify(canon: CanonState): boolean {
      // Vérifier que le rootHash correspond aux faits
      const computed = computeMerkleRoot(canon.facts);
      return computed === canon.rootHash;
    },
    
    getHistory(): CanonHistoryEntry[] {
      return [...history];
    },
    
    lock(canon: CanonState): CanonState {
      lockedCanons.add(canon.rootHash);
      recordHistory(canon, "LOCK");
      return canon;
    },
    
    isLocked(canon: CanonState): boolean {
      return lockedCanons.has(canon.rootHash);
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════

export { ENGINE_NAME, ENGINE_VERSION };
export default createCanonEngine;
