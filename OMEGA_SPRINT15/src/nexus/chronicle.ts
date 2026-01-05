/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NEXUS DEP — CHRONICLE
 * Journal immuable avec hash chain
 * Sprint 15.0 — NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Chronicle responsibilities:
 * - Maintain immutable audit log with hash chain
 * - Verify integrity of the entire chain
 * - Support export in JSONL format
 * - Provide query capabilities
 */

import {
  AuditEntry,
  ChronicleEntry,
} from './types';
import { computeHashSync, freezeAuditEntry } from './audit';

// ═══════════════════════════════════════════════════════════════════════════════
// CHRONICLE CLASS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Chronicle - Immutable audit log with hash chain
 */
export class Chronicle {
  private entries: ChronicleEntry[] = [];
  private readonly maxEntries: number;
  
  constructor(options: { maxEntries?: number } = {}) {
    this.maxEntries = options.maxEntries ?? 10000;
  }
  
  /**
   * Append a new audit entry to the chronicle
   */
  append(entry: AuditEntry): ChronicleEntry {
    if (this.entries.length >= this.maxEntries) {
      throw new Error(`Chronicle maximum capacity reached (${this.maxEntries} entries)`);
    }
    
    const index = this.entries.length;
    const prev_hash = index === 0 ? '' : this.entries[index - 1].entry_hash;
    const frozen_entry = freezeAuditEntry(entry);
    
    const chronicleEntry: ChronicleEntry = {
      index,
      entry: frozen_entry,
      prev_hash,
      entry_hash: this.computeEntryHash(frozen_entry, prev_hash, index),
      chronicle_timestamp: new Date().toISOString(),
    };
    
    // Freeze the chronicle entry itself
    const frozenChronicleEntry = Object.freeze(chronicleEntry);
    this.entries.push(frozenChronicleEntry);
    
    return frozenChronicleEntry;
  }
  
  /**
   * Compute hash for a chronicle entry
   */
  private computeEntryHash(entry: AuditEntry, prev_hash: string, index: number): string {
    const data = {
      index,
      entry,
      prev_hash,
    };
    return computeHashSync(data);
  }
  
  /**
   * Verify integrity of the entire chain
   */
  verify(): { valid: boolean; error?: string; broken_at?: number } {
    if (this.entries.length === 0) {
      return { valid: true };
    }
    
    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      
      // Check index
      if (entry.index !== i) {
        return { valid: false, error: `Index mismatch at position ${i}`, broken_at: i };
      }
      
      // Check prev_hash
      if (i === 0) {
        if (entry.prev_hash !== '') {
          return { valid: false, error: 'First entry must have empty prev_hash', broken_at: 0 };
        }
      } else {
        if (entry.prev_hash !== this.entries[i - 1].entry_hash) {
          return { valid: false, error: `Chain broken at index ${i}`, broken_at: i };
        }
      }
      
      // Verify entry hash
      const computedHash = this.computeEntryHash(entry.entry, entry.prev_hash, entry.index);
      if (entry.entry_hash !== computedHash) {
        return { valid: false, error: `Hash mismatch at index ${i}`, broken_at: i };
      }
    }
    
    return { valid: true };
  }
  
  /**
   * Get entry by request ID
   */
  getEntry(requestId: string): ChronicleEntry | null {
    return this.entries.find(e => e.entry.request_id === requestId) ?? null;
  }
  
  /**
   * Get entry by index
   */
  getEntryByIndex(index: number): ChronicleEntry | null {
    return this.entries[index] ?? null;
  }
  
  /**
   * Get the full chain
   */
  getChain(): readonly ChronicleEntry[] {
    return this.entries;
  }
  
  /**
   * Get the last entry
   */
  getLastEntry(): ChronicleEntry | null {
    return this.entries.length > 0 ? this.entries[this.entries.length - 1] : null;
  }
  
  /**
   * Get chain length
   */
  get length(): number {
    return this.entries.length;
  }
  
  /**
   * Check if chronicle is empty
   */
  get isEmpty(): boolean {
    return this.entries.length === 0;
  }
  
  /**
   * Export chronicle as JSONL (one entry per line)
   */
  export(): string {
    return this.entries
      .map(entry => JSON.stringify(entry))
      .join('\n');
  }
  
  /**
   * Export chronicle as JSON array
   */
  exportJSON(): string {
    return JSON.stringify(this.entries, null, 2);
  }
  
  /**
   * Import chronicle from JSONL
   */
  static fromJSONL(jsonl: string): Chronicle {
    const chronicle = new Chronicle();
    const lines = jsonl.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      const entry = JSON.parse(line) as ChronicleEntry;
      // We need to manually push because append would recompute hashes
      chronicle.entries.push(Object.freeze(entry));
    }
    
    // Verify imported chain
    const verification = chronicle.verify();
    if (!verification.valid) {
      throw new Error(`Imported chronicle is invalid: ${verification.error}`);
    }
    
    return chronicle;
  }
  
  /**
   * Get entries by session ID
   */
  getEntriesBySession(sessionId: string): ChronicleEntry[] {
    return this.entries.filter(e => e.entry.session_id === sessionId);
  }
  
  /**
   * Get entries by route
   */
  getEntriesByRoute(route: string): ChronicleEntry[] {
    return this.entries.filter(e => e.entry.route === route);
  }
  
  /**
   * Get entries in time range
   */
  getEntriesInRange(start: Date, end: Date): ChronicleEntry[] {
    return this.entries.filter(e => {
      const timestamp = new Date(e.chronicle_timestamp);
      return timestamp >= start && timestamp <= end;
    });
  }
  
  /**
   * Get success rate
   */
  getSuccessRate(): number {
    if (this.entries.length === 0) return 1;
    const successes = this.entries.filter(e => e.entry.success).length;
    return successes / this.entries.length;
  }
  
  /**
   * Get average duration
   */
  getAverageDuration(): number {
    if (this.entries.length === 0) return 0;
    const total = this.entries.reduce((sum, e) => sum + e.entry.duration_ms, 0);
    return total / this.entries.length;
  }
  
  /**
   * Clear chronicle (for testing only)
   */
  clear(): void {
    this.entries = [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════════

let globalChronicle: Chronicle | null = null;

/**
 * Get the global chronicle instance
 */
export function getGlobalChronicle(): Chronicle {
  if (!globalChronicle) {
    globalChronicle = new Chronicle();
  }
  return globalChronicle;
}

/**
 * Reset global chronicle (for testing)
 */
export function resetGlobalChronicle(): void {
  globalChronicle = null;
}
