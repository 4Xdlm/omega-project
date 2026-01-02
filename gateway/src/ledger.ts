// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// OMEGA LEDGER â€” AUDIT CHAIN
// Version: 1.0.0 â€” NASA/SpaceX-Grade
// Invariants: LED-01 Ã  LED-05
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

import { createHash, randomUUID } from 'crypto';
import stringify from 'fast-json-stable-stringify';
import { LedgerEntry, LedgerEntrySchema, VerificationReport, SHA256, CONSTANTS } from './types';

export class LedgerError extends Error {
  constructor(public readonly code: string, message: string, public readonly stream_id?: string, public readonly seq?: number) {
    super(message);
    this.name = 'LedgerError';
  }
}

export interface LedgerStorage {
  append(entry: LedgerEntry): Promise<void>;
  getBySeq(stream_id: string, seq: number): Promise<LedgerEntry | null>;
  getLastEntry(stream_id: string): Promise<LedgerEntry | null>;
  getRange(stream_id: string, fromSeq: number, toSeq: number): Promise<LedgerEntry[]>;
  getAll(stream_id: string): Promise<LedgerEntry[]>;
}

export class Ledger {
  constructor(private readonly storage: LedgerStorage) {}

  async append(stream_id: string, event_type: string, payload: Record<string, unknown>): Promise<LedgerEntry> {
    const timestamp = new Date().toISOString();
    const entry_id = randomUUID();
    const lastEntry = await this.storage.getLastEntry(stream_id);
    
    const seq = lastEntry ? lastEntry.seq + 1 : 0;
    const prev_hash = lastEntry ? lastEntry.entry_hash : CONSTANTS.GENESIS_PREV_HASH;

    const entryContent = { entry_id, timestamp, stream_id, seq, event_type, payload, prev_hash };
    const entry_hash = this.computeHash(entryContent);
    const entry: LedgerEntry = { ...entryContent, entry_hash };

    const result = LedgerEntrySchema.safeParse(entry);
    if (!result.success) throw new LedgerError('LED_APPEND_FAILED', 'Invalid entry', stream_id, seq);

    await this.storage.append(entry);
    return entry;
  }

  async verifyChain(stream_id: string): Promise<VerificationReport> {
    const entries = await this.storage.getAll(stream_id);
    if (entries.length === 0) return { stream_id, ok: true, entries_checked: 0 };

    entries.sort((a, b) => a.seq - b.seq);
    let expectedPrevHash: string = CONSTANTS.GENESIS_PREV_HASH;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (entry.seq !== i) return { stream_id, ok: false, entries_checked: i, first_bad_seq: entry.seq };
      if (entry.prev_hash !== expectedPrevHash) {
        return { stream_id, ok: false, entries_checked: i, first_bad_seq: entry.seq, expected_prev_hash: expectedPrevHash, got_prev_hash: entry.prev_hash };
      }
      const computedHash = this.computeEntryHash(entry);
      if (computedHash !== entry.entry_hash) return { stream_id, ok: false, entries_checked: i, first_bad_seq: entry.seq };
      expectedPrevHash = entry.entry_hash;
    }
    return { stream_id, ok: true, entries_checked: entries.length };
  }

  async getEntry(stream_id: string, seq: number): Promise<LedgerEntry | null> { return this.storage.getBySeq(stream_id, seq); }
  async getLastEntry(stream_id: string): Promise<LedgerEntry | null> { return this.storage.getLastEntry(stream_id); }
  async getRange(stream_id: string, fromSeq: number, toSeq: number): Promise<LedgerEntry[]> { return this.storage.getRange(stream_id, fromSeq, toSeq); }
  async getAll(stream_id: string): Promise<LedgerEntry[]> { return this.storage.getAll(stream_id); }

  private computeHash(data: Record<string, unknown>): SHA256 {
    return createHash('sha256').update(stringify(data), 'utf-8').digest('hex');
  }

  private computeEntryHash(entry: LedgerEntry): SHA256 {
    const { entry_hash, ...rest } = entry;
    return this.computeHash(rest);
  }
}

export class InMemoryLedgerStorage implements LedgerStorage {
  private readonly streams: Map<string, LedgerEntry[]> = new Map();

  async append(entry: LedgerEntry): Promise<void> {
    let stream = this.streams.get(entry.stream_id);
    if (!stream) { stream = []; this.streams.set(entry.stream_id, stream); }
    const existing = stream.find(e => e.seq === entry.seq);
    if (existing) throw new LedgerError('LED_APPEND_FAILED', 'Entry exists', entry.stream_id, entry.seq);
    const lastSeq = stream.length > 0 ? stream[stream.length - 1].seq : -1;
    if (entry.seq !== lastSeq + 1) throw new LedgerError('LED_SEQ_GAP', `Expected ${lastSeq + 1}`, entry.stream_id, entry.seq);
    stream.push(entry);
  }

  async getBySeq(stream_id: string, seq: number): Promise<LedgerEntry | null> {
    return this.streams.get(stream_id)?.find(e => e.seq === seq) || null;
  }
  async getLastEntry(stream_id: string): Promise<LedgerEntry | null> {
    const stream = this.streams.get(stream_id);
    return stream && stream.length > 0 ? stream[stream.length - 1] : null;
  }
  async getRange(stream_id: string, fromSeq: number, toSeq: number): Promise<LedgerEntry[]> {
    return (this.streams.get(stream_id) || []).filter(e => e.seq >= fromSeq && e.seq <= toSeq);
  }
  async getAll(stream_id: string): Promise<LedgerEntry[]> { return this.streams.get(stream_id) || []; }
  clear(): void { this.streams.clear(); }
  streamCount(): number { return this.streams.size; }
  entryCount(stream_id: string): number { return this.streams.get(stream_id)?.length || 0; }
}

export function createLedger(storage?: LedgerStorage): Ledger {
  return new Ledger(storage || new InMemoryLedgerStorage());
}
