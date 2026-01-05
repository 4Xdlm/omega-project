/**
 * OMEGA Memory Hook — Memory Service Types
 * Phase 20.1 — v3.20.1
 * 
 * Interfaces for integrating with Phase 20 MemoryService.
 * These types allow the hook to work with any compatible memory service.
 */

import { createHash } from 'crypto';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type MemoryResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface SaveSnapshotResult {
  readonly key: string;
  readonly rootHash: string;
  readonly factCount: number;
  readonly bytesWritten: number;
  readonly path: string;
}

export interface LoadSnapshotResult {
  readonly key: string;
  readonly rootHash: string;
  readonly factCount: number;
  readonly verified: boolean;
}

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
  readonly metadata: {
    readonly factCount: number;
    readonly sources: readonly string[];
    readonly lastModified: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEMORY SERVICE INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Interface for memory service (compatible with Phase 20 MemoryService).
 * This allows the hook to work with the real service or a mock.
 */
export interface IMemoryService {
  saveSnapshot(key: string): Promise<MemoryResult<SaveSnapshotResult>>;
  loadSnapshot(key: string): Promise<MemoryResult<LoadSnapshotResult>>;
  listSnapshots(prefix?: string): Promise<MemoryResult<string[]>>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<MemoryResult<boolean>>;
  getCanon(): ICanonStore;
}

export interface ICanonStore {
  size: number;
  addFact(
    subject: string,
    predicate: string,
    value: string,
    source: string,
    confidence?: number
  ): CanonFact;
  getFact(id: string): CanonFact | undefined;
  getAllFacts(): readonly CanonFact[];
  removeFact(id: string): boolean;
  clear(): void;
  snapshot(): CanonSnapshot;
  restore(snapshot: CanonSnapshot): { success: boolean; error?: string };
  getRootHash(): string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK IMPLEMENTATION (for standalone testing)
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

export class MockCanonStore implements ICanonStore {
  private facts: Map<string, CanonFact> = new Map();
  private idCounter = 0;

  get size(): number {
    return this.facts.size;
  }

  addFact(
    subject: string,
    predicate: string,
    value: string,
    source: string,
    confidence = 1.0
  ): CanonFact {
    this.idCounter++;
    const id = `fact_${this.idCounter}`;
    const createdAt = new Date().toISOString();
    const factWithoutHash = { id, subject, predicate, value, confidence, source, createdAt };
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

  removeFact(id: string): boolean {
    return this.facts.delete(id);
  }

  clear(): void {
    this.facts.clear();
    this.idCounter = 0;
  }

  snapshot(): CanonSnapshot {
    const facts = this.getAllFacts();
    const sources = [...new Set(facts.map(f => f.source))];
    const lastModified = facts.length > 0
      ? facts.reduce((latest, f) => f.createdAt > latest ? f.createdAt : latest, facts[0]!.createdAt)
      : new Date().toISOString();

    return {
      version: '3.20.1',
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

  restore(snapshot: CanonSnapshot): { success: boolean; error?: string } {
    const computedHash = computeRootHash(snapshot.facts);
    if (computedHash !== snapshot.rootHash) {
      return { success: false, error: `Root hash mismatch` };
    }
    this.clear();
    for (const fact of snapshot.facts) {
      this.facts.set(fact.id, fact);
      const idNum = parseInt(fact.id.replace('fact_', ''), 10);
      if (!isNaN(idNum) && idNum >= this.idCounter) {
        this.idCounter = idNum;
      }
    }
    return { success: true };
  }

  getRootHash(): string {
    return computeRootHash(this.getAllFacts());
  }
}

// Simple in-memory mock for testing
export class MockMemoryService implements IMemoryService {
  private canon = new MockCanonStore();
  private snapshots: Map<string, CanonSnapshot> = new Map();

  getCanon(): ICanonStore {
    return this.canon;
  }

  async saveSnapshot(key: string): Promise<MemoryResult<SaveSnapshotResult>> {
    const snapshot = this.canon.snapshot();
    this.snapshots.set(key, snapshot);
    return {
      success: true,
      data: {
        key,
        rootHash: snapshot.rootHash,
        factCount: snapshot.metadata.factCount,
        bytesWritten: JSON.stringify(snapshot).length,
        path: `/mock/${key}`,
      },
    };
  }

  async loadSnapshot(key: string): Promise<MemoryResult<LoadSnapshotResult>> {
    const snapshot = this.snapshots.get(key);
    if (!snapshot) {
      return { success: false, error: `Snapshot not found: ${key}` };
    }
    const result = this.canon.restore(snapshot);
    if (!result.success) {
      return { success: false, error: result.error ?? 'Restore failed' };
    }
    return {
      success: true,
      data: {
        key,
        rootHash: snapshot.rootHash,
        factCount: snapshot.metadata.factCount,
        verified: true,
      },
    };
  }

  async listSnapshots(prefix?: string): Promise<MemoryResult<string[]>> {
    let keys = Array.from(this.snapshots.keys());
    if (prefix) {
      keys = keys.filter(k => k.startsWith(prefix));
    }
    return { success: true, data: keys };
  }

  async exists(key: string): Promise<boolean> {
    return this.snapshots.has(key);
  }

  async delete(key: string): Promise<MemoryResult<boolean>> {
    const deleted = this.snapshots.delete(key);
    return { success: true, data: deleted };
  }
}
