/// <reference path="../types/indexeddb.d.ts" />
/**
 * OMEGA Persistence Layer — IndexedDB Adapter
 * Phase 19 — v3.19.0
 * Standard: MIL-STD-882E / DO-178C Level A
 * 
 * Invariants:
 * - INV-IDB-01: Same state => same bytes
 * - INV-IDB-02: Migration monotone (jamais perte silencieuse)
 * 
 * Note: Cette implémentation est pour environnement browser.
 * En Node.js, utiliser fake-indexeddb pour les tests.
 */

import {
  PersistenceAdapter,
  PersistResult,
  PersistErrorCode,
  SaveResult,
  LoadResult,
  VerifyResult,
  ListResult,
  SaveOptions,
  LoadOptions,
  AdapterConfig,
  PersistedEnvelope,
  PersistMetadata,
  PersistSource,
  PERSIST_MAGIC,
  PERSIST_VERSION,
  DEFAULT_ADAPTER_CONFIG,
  computeHash,
  validateKey,
  createPersistError,
} from '../core/types.js';

import {
  canonicalEncodeWithHash,
  canonicalDecodeWithVerify,
} from '../core/canonical.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const DB_NAME = 'omega_persist';
const STORE_NAME = 'data';

// ═══════════════════════════════════════════════════════════════════════════════
// INDEXEDDB ADAPTER
// ═══════════════════════════════════════════════════════════════════════════════

export class IndexedDBAdapter implements PersistenceAdapter {
  readonly name = 'IndexedDBAdapter';
  readonly config: AdapterConfig;
  
  private db: IDBDatabase | null = null;
  private sequence: number = 0;
  private initPromise: Promise<void> | null = null;

  constructor(config?: Partial<AdapterConfig>) {
    this.config = { ...DEFAULT_ADAPTER_CONFIG, ...config };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  private async ensureInitialized(): Promise<void> {
    if (this.db) return;
    
    if (this.initPromise) {
      await this.initPromise;
      return;
    }

    this.initPromise = this.initialize();
    await this.initPromise;
  }

  private async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if IndexedDB is available
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB is not available in this environment'));
        return;
      }

      const request = indexedDB.open(DB_NAME, this.config.schemaVersion);

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as unknown as IDBOpenDBRequest).result;
        
        // Créer le store si n'existe pas
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          store.createIndex('sequence', 'sequence', { unique: false });
          store.createIndex('source', 'source', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SAVE
  // ═══════════════════════════════════════════════════════════════════════════

  async save<T>(
    key: string,
    data: T,
    source: PersistSource,
    options?: SaveOptions
  ): Promise<PersistResult<SaveResult>> {
    const keyValidation = validateKey(key);
    if (!keyValidation.success) {
      return keyValidation;
    }

    try {
      await this.ensureInitialized();
    } catch (error) {
      return {
        success: false,
        error: createPersistError(
          PersistErrorCode.ADAPTER_ERROR,
          `IndexedDB initialization failed: ${error instanceof Error ? error.message : 'Unknown'}`,
        ),
      };
    }

    const now = new Date().toISOString();

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // Vérifier si existe
      const getRequest = store.get(key);

      getRequest.onsuccess = () => {
        const existing = getRequest.result as { hash: string } | undefined;
        const previousHash = existing?.hash ?? null;

        if (options?.overwrite === false && existing) {
          resolve({
            success: false,
            error: createPersistError(
              PersistErrorCode.WRITE_FAILED,
              'Key already exists and overwrite is disabled',
              { key }
            ),
          });
          return;
        }

        this.sequence++;

        const metadata: PersistMetadata = {
          source,
          instanceId: this.config.instanceId,
          sequence: this.sequence,
          previousHash,
          tags: options?.tags ?? [],
        };

        const dataEncoded = canonicalEncodeWithHash(data);

        const envelope: PersistedEnvelope<T> = {
          magic: PERSIST_MAGIC,
          version: PERSIST_VERSION,
          schemaVersion: this.config.schemaVersion,
          key,
          createdAt: now,
          updatedAt: now,
          dataHash: dataEncoded.hash,
          data,
          metadata,
        };

        const envelopeEncoded = canonicalEncodeWithHash(envelope);

        // Stocker l'envelope avec le hash comme propriété pour indexation
        const record = {
          key,
          hash: envelopeEncoded.hash,
          bytes: envelopeEncoded.json,
          sequence: this.sequence,
          source,
          updatedAt: now,
        };

        const putRequest = store.put(record);

        putRequest.onsuccess = () => {
          resolve({
            success: true,
            data: {
              key,
              path: `indexeddb://${DB_NAME}/${STORE_NAME}/${key}`,
              bytesWritten: envelopeEncoded.bytes.length,
              sha256: envelopeEncoded.hash,
              timestamp: now,
              sequence: this.sequence,
            },
          });
        };

        putRequest.onerror = () => {
          resolve({
            success: false,
            error: createPersistError(
              PersistErrorCode.WRITE_FAILED,
              `IndexedDB put failed: ${putRequest.error?.message}`,
              { key }
            ),
          });
        };
      };

      getRequest.onerror = () => {
        resolve({
          success: false,
          error: createPersistError(
            PersistErrorCode.READ_FAILED,
            `IndexedDB get failed: ${getRequest.error?.message}`,
            { key }
          ),
        });
      };
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LOAD
  // ═══════════════════════════════════════════════════════════════════════════

  async load<T>(
    key: string,
    options?: LoadOptions
  ): Promise<PersistResult<LoadResult<T>>> {
    const keyValidation = validateKey(key);
    if (!keyValidation.success) {
      return keyValidation;
    }

    try {
      await this.ensureInitialized();
    } catch (error) {
      return {
        success: false,
        error: createPersistError(
          PersistErrorCode.ADAPTER_ERROR,
          `IndexedDB initialization failed: ${error instanceof Error ? error.message : 'Unknown'}`,
        ),
      };
    }

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const record = request.result as { key: string; hash: string; bytes: string } | undefined;

        if (!record) {
          resolve({
            success: false,
            error: createPersistError(
              PersistErrorCode.NOT_FOUND,
              `Key not found: ${key}`,
              { key }
            ),
          });
          return;
        }

        try {
          const bytes = Buffer.from(record.bytes, 'utf8');
          const decoded = canonicalDecodeWithVerify<PersistedEnvelope<T>>(bytes);

          if (decoded.data.magic !== PERSIST_MAGIC) {
            resolve({
              success: false,
              error: createPersistError(
                PersistErrorCode.MAGIC_MISMATCH,
                'Invalid magic',
              ),
            });
            return;
          }

          let verified = true;
          if (options?.verify !== false) {
            const dataEncoded = canonicalEncodeWithHash(decoded.data.data);
            verified = dataEncoded.hash === decoded.data.dataHash;
          }

          resolve({
            success: true,
            data: {
              key,
              path: `indexeddb://${DB_NAME}/${STORE_NAME}/${key}`,
              bytesRead: bytes.length,
              sha256: decoded.hash,
              envelope: decoded.data,
              verified,
            },
          });
        } catch (error) {
          resolve({
            success: false,
            error: createPersistError(
              PersistErrorCode.PARSE_FAILED,
              `Parse failed: ${error instanceof Error ? error.message : 'Unknown'}`,
            ),
          });
        }
      };

      request.onerror = () => {
        resolve({
          success: false,
          error: createPersistError(
            PersistErrorCode.READ_FAILED,
            `IndexedDB get failed: ${request.error?.message}`,
          ),
        });
      };
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VERIFY
  // ═══════════════════════════════════════════════════════════════════════════

  async verify(
    key: string,
    expectedHash?: string
  ): Promise<PersistResult<VerifyResult>> {
    const loadResult = await this.load(key);
    
    if (!loadResult.success) {
      if (loadResult.error.code === PersistErrorCode.NOT_FOUND) {
        return {
          success: true,
          data: {
            key,
            valid: false,
            expectedHash: expectedHash ?? '',
            actualHash: '',
            errors: ['Key not found'],
          },
        };
      }
      return loadResult;
    }

    const errors: string[] = [];
    const actualHash = loadResult.data.sha256;

    if (expectedHash && actualHash !== expectedHash) {
      errors.push(`Hash mismatch: expected ${expectedHash}, got ${actualHash}`);
    }

    if (!loadResult.data.verified) {
      errors.push('Data hash verification failed');
    }

    return {
      success: true,
      data: {
        key,
        valid: errors.length === 0,
        expectedHash: expectedHash ?? '',
        actualHash,
        errors,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LIST
  // ═══════════════════════════════════════════════════════════════════════════

  async list(prefix?: string): Promise<PersistResult<ListResult>> {
    try {
      await this.ensureInitialized();
    } catch (error) {
      return {
        success: false,
        error: createPersistError(
          PersistErrorCode.ADAPTER_ERROR,
          `IndexedDB initialization failed: ${error instanceof Error ? error.message : 'Unknown'}`,
        ),
      };
    }

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAllKeys();

      request.onsuccess = () => {
        let keys = (request.result as string[]);

        if (prefix) {
          keys = keys.filter(k => k.startsWith(prefix));
        }

        resolve({
          success: true,
          data: {
            keys,
            count: keys.length,
            prefix,
          },
        });
      };

      request.onerror = () => {
        resolve({
          success: false,
          error: createPersistError(
            PersistErrorCode.READ_FAILED,
            `IndexedDB getAllKeys failed: ${request.error?.message}`,
          ),
        });
      };
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE
  // ═══════════════════════════════════════════════════════════════════════════

  async delete(key: string): Promise<PersistResult<{ deleted: boolean }>> {
    const keyValidation = validateKey(key);
    if (!keyValidation.success) {
      return keyValidation;
    }

    try {
      await this.ensureInitialized();
    } catch (error) {
      return {
        success: false,
        error: createPersistError(
          PersistErrorCode.ADAPTER_ERROR,
          `IndexedDB initialization failed: ${error instanceof Error ? error.message : 'Unknown'}`,
        ),
      };
    }

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // Vérifier si existe d'abord
      const getRequest = store.get(key);

      getRequest.onsuccess = () => {
        if (!getRequest.result) {
          resolve({ success: true, data: { deleted: false } });
          return;
        }

        const deleteRequest = store.delete(key);

        deleteRequest.onsuccess = () => {
          resolve({ success: true, data: { deleted: true } });
        };

        deleteRequest.onerror = () => {
          resolve({
            success: false,
            error: createPersistError(
              PersistErrorCode.WRITE_FAILED,
              `IndexedDB delete failed: ${deleteRequest.error?.message}`,
            ),
          });
        };
      };

      getRequest.onerror = () => {
        resolve({
          success: false,
          error: createPersistError(
            PersistErrorCode.READ_FAILED,
            `IndexedDB get failed: ${getRequest.error?.message}`,
          ),
        });
      };
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXISTS
  // ═══════════════════════════════════════════════════════════════════════════

  async exists(key: string): Promise<boolean> {
    const keyValidation = validateKey(key);
    if (!keyValidation.success) {
      return false;
    }

    try {
      await this.ensureInitialized();
    } catch {
      return false;
    }

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getKey(key);

      request.onsuccess = () => {
        resolve(request.result !== undefined);
      };

      request.onerror = () => {
        resolve(false);
      };
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CLOSE
  // ═══════════════════════════════════════════════════════════════════════════

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

export function createIndexedDBAdapter(
  config?: Partial<AdapterConfig>
): IndexedDBAdapter {
  return new IndexedDBAdapter(config);
}
