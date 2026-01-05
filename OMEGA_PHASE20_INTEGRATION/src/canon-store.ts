/**
 * OMEGA Integration Layer — Canon Store
 * Phase 20 — v3.20.0
 * 
 * Simplified Canon storage for integration.
 * Based on Phase 18 CANON_CORE concepts.
 */

import { createHash } from 'crypto';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface CanonFact {
  readonly id: string;
  readonly subject: string;
  readonly predicate: string;
  readonly value: string;
  readonly confidence: number;
  readonly source: string;
  readonly createdAt: string;
  readonly hash: string;
}

export interface CanonSnapshot {
  readonly version: string;
  readonly timestamp: string;
  readonly facts: readonly CanonFact[];
  readonly rootHash: string;
  readonly metadata: CanonMetadata;
}

export interface CanonMetadata {
  readonly factCount: number;
  readonly sources: readonly string[];
  readonly lastModified: string;
}

export interface CanonStoreConfig {
  readonly version?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

function computeHash(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

function computeFactHash(fact: Omit<CanonFact, 'hash'>): string {
  const payload = `${fact.id}|${fact.subject}|${fact.predicate}|${fact.value}|${fact.confidence}|${fact.source}|${fact.createdAt}`;
  return computeHash(payload);
}

function computeRootHash(facts: readonly CanonFact[]): string {
  if (facts.length === 0) return computeHash('EMPTY_CANON');
  
  const sortedHashes = [...facts]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(f => f.hash)
    .join('|');
  
  return computeHash(sortedHashes);
}

function canonicalStringify(obj: unknown): string {
  return JSON.stringify(obj, Object.keys(obj as object).sort());
}

// ═══════════════════════════════════════════════════════════════════════════════
// CANON STORE
// ═══════════════════════════════════════════════════════════════════════════════

export class CanonStore {
  private facts: Map<string, CanonFact> = new Map();
  private idCounter: number = 0;
  private readonly version: string;

  constructor(config?: CanonStoreConfig) {
    this.version = config?.version ?? '3.20.0';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FACT OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  addFact(
    subject: string,
    predicate: string,
    value: string,
    source: string,
    confidence: number = 1.0
  ): CanonFact {
    this.idCounter++;
    const id = `fact_${this.idCounter}`;
    const createdAt = new Date().toISOString();

    const factWithoutHash = {
      id,
      subject,
      predicate,
      value,
      confidence,
      source,
      createdAt,
    };

    const hash = computeFactHash(factWithoutHash);
    const fact: CanonFact = { ...factWithoutHash, hash };

    this.facts.set(id, fact);
    return fact;
  }

  getFact(id: string): CanonFact | undefined {
    return this.facts.get(id);
  }

  getAllFacts(): readonly CanonFact[] {
    return Array.from(this.facts.values());
  }

  getFactsBySubject(subject: string): readonly CanonFact[] {
    return this.getAllFacts().filter(f => f.subject === subject);
  }

  getFactsByPredicate(predicate: string): readonly CanonFact[] {
    return this.getAllFacts().filter(f => f.predicate === predicate);
  }

  removeFact(id: string): boolean {
    return this.facts.delete(id);
  }

  clear(): void {
    this.facts.clear();
    this.idCounter = 0;
  }

  get size(): number {
    return this.facts.size;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SNAPSHOT
  // ═══════════════════════════════════════════════════════════════════════════

  snapshot(): CanonSnapshot {
    const facts = this.getAllFacts();
    const sources = [...new Set(facts.map(f => f.source))];
    const lastModified = facts.length > 0
      ? facts.reduce((latest, f) => f.createdAt > latest ? f.createdAt : latest, facts[0]!.createdAt)
      : new Date().toISOString();

    return {
      version: this.version,
      timestamp: new Date().toISOString(),
      facts,
      rootHash: computeRootHash(facts),
      metadata: {
        factCount: facts.length,
        sources,
        lastModified,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RESTORE
  // ═══════════════════════════════════════════════════════════════════════════

  restore(snapshot: CanonSnapshot): { success: boolean; error?: string } {
    // Verify root hash
    const computedHash = computeRootHash(snapshot.facts);
    if (computedHash !== snapshot.rootHash) {
      return {
        success: false,
        error: `Root hash mismatch: expected ${snapshot.rootHash}, got ${computedHash}`,
      };
    }

    // Verify each fact hash
    for (const fact of snapshot.facts) {
      const { hash, ...factWithoutHash } = fact;
      const expectedHash = computeFactHash(factWithoutHash);
      if (expectedHash !== hash) {
        return {
          success: false,
          error: `Fact hash mismatch for ${fact.id}: expected ${hash}, got ${expectedHash}`,
        };
      }
    }

    // Clear and restore
    this.clear();

    for (const fact of snapshot.facts) {
      this.facts.set(fact.id, fact);
      // Update counter to be higher than any restored ID
      const idNum = parseInt(fact.id.replace('fact_', ''), 10);
      if (!isNaN(idNum) && idNum >= this.idCounter) {
        this.idCounter = idNum;
      }
    }

    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPARISON
  // ═══════════════════════════════════════════════════════════════════════════

  getRootHash(): string {
    return computeRootHash(this.getAllFacts());
  }

  equals(other: CanonStore): boolean {
    return this.getRootHash() === other.getRootHash();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

export function createCanonStore(config?: CanonStoreConfig): CanonStore {
  return new CanonStore(config);
}
