import { LedgerEntry, VerificationReport } from './types';
export declare class LedgerError extends Error {
    readonly code: string;
    readonly stream_id?: string | undefined;
    readonly seq?: number | undefined;
    constructor(code: string, message: string, stream_id?: string | undefined, seq?: number | undefined);
}
export interface LedgerStorage {
    append(entry: LedgerEntry): Promise<void>;
    getBySeq(stream_id: string, seq: number): Promise<LedgerEntry | null>;
    getLastEntry(stream_id: string): Promise<LedgerEntry | null>;
    getRange(stream_id: string, fromSeq: number, toSeq: number): Promise<LedgerEntry[]>;
    getAll(stream_id: string): Promise<LedgerEntry[]>;
}
export declare class Ledger {
    private readonly storage;
    constructor(storage: LedgerStorage);
    append(stream_id: string, event_type: string, payload: Record<string, unknown>): Promise<LedgerEntry>;
    verifyChain(stream_id: string): Promise<VerificationReport>;
    getEntry(stream_id: string, seq: number): Promise<LedgerEntry | null>;
    getLastEntry(stream_id: string): Promise<LedgerEntry | null>;
    getRange(stream_id: string, fromSeq: number, toSeq: number): Promise<LedgerEntry[]>;
    getAll(stream_id: string): Promise<LedgerEntry[]>;
    private computeHash;
    private computeEntryHash;
}
export declare class InMemoryLedgerStorage implements LedgerStorage {
    private readonly streams;
    append(entry: LedgerEntry): Promise<void>;
    getBySeq(stream_id: string, seq: number): Promise<LedgerEntry | null>;
    getLastEntry(stream_id: string): Promise<LedgerEntry | null>;
    getRange(stream_id: string, fromSeq: number, toSeq: number): Promise<LedgerEntry[]>;
    getAll(stream_id: string): Promise<LedgerEntry[]>;
    clear(): void;
    streamCount(): number;
    entryCount(stream_id: string): number;
}
export declare function createLedger(storage?: LedgerStorage): Ledger;
//# sourceMappingURL=ledger.d.ts.map