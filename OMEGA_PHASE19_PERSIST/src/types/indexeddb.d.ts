/**
 * IndexedDB Type Declarations for Node.js
 * These types allow TypeScript compilation in Node.js environment
 * Actual implementation requires browser or fake-indexeddb
 */

declare global {
  interface IDBDatabase {
    readonly name: string;
    readonly version: number;
    readonly objectStoreNames: DOMStringList;
    close(): void;
    createObjectStore(name: string, options?: IDBObjectStoreParameters): IDBObjectStore;
    deleteObjectStore(name: string): void;
    transaction(storeNames: string | string[], mode?: IDBTransactionMode): IDBTransaction;
  }

  interface IDBObjectStoreParameters {
    keyPath?: string | string[] | null;
    autoIncrement?: boolean;
  }

  interface IDBTransaction {
    readonly db: IDBDatabase;
    readonly mode: IDBTransactionMode;
    readonly objectStoreNames: DOMStringList;
    objectStore(name: string): IDBObjectStore;
    abort(): void;
    onerror: ((this: IDBTransaction, ev: Event) => unknown) | null;
    oncomplete: ((this: IDBTransaction, ev: Event) => unknown) | null;
  }

  interface IDBObjectStore {
    readonly name: string;
    readonly keyPath: string | string[];
    readonly indexNames: DOMStringList;
    readonly autoIncrement: boolean;
    add(value: unknown, key?: IDBValidKey): IDBRequest;
    put(value: unknown, key?: IDBValidKey): IDBRequest;
    delete(key: IDBValidKey | IDBKeyRange): IDBRequest;
    get(key: IDBValidKey | IDBKeyRange): IDBRequest;
    getKey(key: IDBValidKey | IDBKeyRange): IDBRequest;
    getAll(query?: IDBValidKey | IDBKeyRange | null, count?: number): IDBRequest;
    getAllKeys(query?: IDBValidKey | IDBKeyRange | null, count?: number): IDBRequest;
    createIndex(name: string, keyPath: string | string[], options?: IDBIndexParameters): IDBIndex;
    deleteIndex(name: string): void;
    index(name: string): IDBIndex;
    clear(): IDBRequest;
    count(key?: IDBValidKey | IDBKeyRange): IDBRequest;
  }

  interface IDBIndexParameters {
    unique?: boolean;
    multiEntry?: boolean;
  }

  interface IDBIndex {
    readonly name: string;
    readonly keyPath: string | string[];
    readonly multiEntry: boolean;
    readonly unique: boolean;
    get(key: IDBValidKey | IDBKeyRange): IDBRequest;
    getKey(key: IDBValidKey | IDBKeyRange): IDBRequest;
    getAll(query?: IDBValidKey | IDBKeyRange | null, count?: number): IDBRequest;
    getAllKeys(query?: IDBValidKey | IDBKeyRange | null, count?: number): IDBRequest;
    count(key?: IDBValidKey | IDBKeyRange): IDBRequest;
  }

  interface IDBRequest<T = unknown> {
    readonly result: T;
    readonly error: DOMException | null;
    readonly source: IDBObjectStore | IDBIndex | IDBCursor | null;
    readonly transaction: IDBTransaction | null;
    readonly readyState: IDBRequestReadyState;
    onsuccess: ((this: IDBRequest<T>, ev: Event) => unknown) | null;
    onerror: ((this: IDBRequest<T>, ev: Event) => unknown) | null;
  }

  interface IDBOpenDBRequest extends IDBRequest<IDBDatabase> {
    onupgradeneeded: ((this: IDBOpenDBRequest, ev: IDBVersionChangeEvent) => unknown) | null;
    onblocked: ((this: IDBOpenDBRequest, ev: Event) => unknown) | null;
  }

  interface IDBVersionChangeEvent extends Event {
    readonly oldVersion: number;
    readonly newVersion: number | null;
  }

  interface IDBCursor {
    readonly source: IDBObjectStore | IDBIndex;
    readonly direction: IDBCursorDirection;
    readonly key: IDBValidKey;
    readonly primaryKey: IDBValidKey;
    advance(count: number): void;
    continue(key?: IDBValidKey): void;
    delete(): IDBRequest;
    update(value: unknown): IDBRequest;
  }

  interface IDBKeyRange {
    readonly lower: unknown;
    readonly upper: unknown;
    readonly lowerOpen: boolean;
    readonly upperOpen: boolean;
    includes(key: unknown): boolean;
  }

  interface IDBFactory {
    open(name: string, version?: number): IDBOpenDBRequest;
    deleteDatabase(name: string): IDBOpenDBRequest;
    cmp(first: unknown, second: unknown): number;
  }

  interface DOMStringList {
    readonly length: number;
    contains(string: string): boolean;
    item(index: number): string | null;
    [index: number]: string;
  }

  type IDBValidKey = number | string | Date | BufferSource | IDBValidKey[];
  type IDBTransactionMode = 'readonly' | 'readwrite' | 'versionchange';
  type IDBRequestReadyState = 'pending' | 'done';
  type IDBCursorDirection = 'next' | 'nextunique' | 'prev' | 'prevunique';

  const indexedDB: IDBFactory | undefined;
}

export {};
