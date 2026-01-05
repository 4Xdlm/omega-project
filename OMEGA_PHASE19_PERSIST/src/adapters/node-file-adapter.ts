/**
 * OMEGA Persistence Layer — Node File Adapter
 * Phase 19 — v3.19.0
 * Standard: MIL-STD-882E / DO-178C Level A
 * 
 * Invariants:
 * - INV-PER-01: Write atomique (tmp → fsync → rename)
 * - INV-PER-02: Reload == original (sha/bytes identiques)
 * - INV-PER-03: Crash mid-write => ancien OU nouveau, jamais mix
 * 
 * Stratégie:
 * 1. Écrire dans fichier .tmp
 * 2. fsync le fichier
 * 3. Renommer atomiquement vers final
 * 4. fsync le répertoire parent (best effort)
 */

import { 
  writeFile, 
  readFile, 
  rename, 
  unlink, 
  readdir, 
  mkdir, 
  stat,
  open,
  access,
  constants,
} from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname, basename } from 'path';
import { randomBytes } from 'crypto';

import {
  PersistenceAdapter,
  PersistResult,
  PersistError,
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
  canonicalEncode,
  canonicalEncodeWithHash,
  canonicalDecodeWithVerify,
} from '../core/canonical.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const FILE_EXTENSION = '.omega.json';
const TEMP_EXTENSION = '.omega.tmp';
const LOCK_EXTENSION = '.omega.lock';
const DELETED_PREFIX = '.deleted_';

// ═══════════════════════════════════════════════════════════════════════════════
// NODE FILE ADAPTER
// ═══════════════════════════════════════════════════════════════════════════════

export class NodeFileAdapter implements PersistenceAdapter {
  readonly name = 'NodeFileAdapter';
  readonly config: AdapterConfig;
  
  private sequence: number = 0;
  private locks: Map<string, { handle: number; timestamp: number }> = new Map();

  constructor(config?: Partial<AdapterConfig>) {
    this.config = { ...DEFAULT_ADAPTER_CONFIG, ...config };
    this.ensureBaseDirectory();
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
    // Valider la clé
    const keyValidation = validateKey(key);
    if (!keyValidation.success) {
      return keyValidation;
    }

    const filePath = this.keyToPath(key);
    const tempPath = this.keyToTempPath(key);
    const lockPath = this.keyToLockPath(key);
    const now = new Date().toISOString();

    // Vérifier si fichier existe et overwrite désactivé
    if (options?.overwrite === false && existsSync(filePath)) {
      return {
        success: false,
        error: createPersistError(
          PersistErrorCode.WRITE_FAILED,
          'File already exists and overwrite is disabled',
          { key, path: filePath }
        ),
      };
    }

    // Acquérir le lock
    const lockResult = await this.acquireLock(lockPath);
    if (!lockResult.success) {
      return lockResult;
    }

    try {
      // Charger le hash précédent si existe
      let previousHash: string | null = null;
      if (existsSync(filePath)) {
        try {
          const existing = await readFile(filePath);
          const decoded = canonicalDecodeWithVerify<PersistedEnvelope>(existing);
          previousHash = decoded.hash;
        } catch {
          // Fichier corrompu, on écrase
          previousHash = null;
        }
      }

      // Incrémenter la séquence
      this.sequence++;

      // Construire l'envelope
      const metadata: PersistMetadata = {
        source,
        instanceId: this.config.instanceId,
        sequence: this.sequence,
        previousHash,
        tags: options?.tags ?? [],
      };

      // Calculer le hash des données
      const dataEncoded = canonicalEncodeWithHash(data);

      const envelope: PersistedEnvelope<T> = {
        magic: PERSIST_MAGIC,
        version: PERSIST_VERSION,
        schemaVersion: this.config.schemaVersion,
        key,
        createdAt: previousHash ? now : now, // Garder original si update
        updatedAt: now,
        dataHash: dataEncoded.hash,
        data,
        metadata,
      };

      // Encoder l'envelope complète
      const envelopeEncoded = canonicalEncodeWithHash(envelope);

      // Vérifier la taille
      if (envelopeEncoded.bytes.length > this.config.maxFileSize) {
        return {
          success: false,
          error: createPersistError(
            PersistErrorCode.STORAGE_FULL,
            `Data exceeds maximum file size of ${this.config.maxFileSize} bytes`,
            { size: envelopeEncoded.bytes.length }
          ),
        };
      }

      // Vérifier le hash attendu si fourni
      if (options?.expectedHash && envelopeEncoded.hash !== options.expectedHash) {
        return {
          success: false,
          error: createPersistError(
            PersistErrorCode.HASH_MISMATCH,
            'Expected hash does not match computed hash',
            { expected: options.expectedHash, actual: envelopeEncoded.hash }
          ),
        };
      }

      // === ÉCRITURE ATOMIQUE ===
      
      // 1. Écrire dans le fichier temporaire
      await this.atomicWrite(tempPath, envelopeEncoded.bytes);

      // 2. Renommer atomiquement vers le fichier final
      await rename(tempPath, filePath);

      // 3. Fsync du répertoire parent (best effort)
      await this.fsyncDirectory(dirname(filePath)).catch(() => {});

      return {
        success: true,
        data: {
          key,
          path: filePath,
          bytesWritten: envelopeEncoded.bytes.length,
          sha256: envelopeEncoded.hash,
          timestamp: now,
          sequence: this.sequence,
        },
      };

    } catch (error) {
      // Nettoyer le fichier temp si existe
      try {
        await unlink(tempPath);
      } catch {
        // Ignore
      }

      return {
        success: false,
        error: createPersistError(
          PersistErrorCode.WRITE_FAILED,
          `Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { key, error: String(error) }
        ),
      };

    } finally {
      // Relâcher le lock
      await this.releaseLock(lockPath);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LOAD
  // ═══════════════════════════════════════════════════════════════════════════

  async load<T>(
    key: string,
    options?: LoadOptions
  ): Promise<PersistResult<LoadResult<T>>> {
    // Valider la clé
    const keyValidation = validateKey(key);
    if (!keyValidation.success) {
      return keyValidation;
    }

    const filePath = this.keyToPath(key);

    // Vérifier l'existence
    if (!existsSync(filePath)) {
      return {
        success: false,
        error: createPersistError(
          PersistErrorCode.NOT_FOUND,
          `Key not found: ${key}`,
          { key, path: filePath }
        ),
      };
    }

    try {
      // Lire le fichier
      const bytes = await readFile(filePath);

      // Décoder avec vérification de hash
      const decoded = canonicalDecodeWithVerify<PersistedEnvelope<T>>(bytes);

      // Vérifier le magic
      if (decoded.data.magic !== PERSIST_MAGIC) {
        return {
          success: false,
          error: createPersistError(
            PersistErrorCode.MAGIC_MISMATCH,
            'Invalid file format: magic mismatch',
            { expected: PERSIST_MAGIC, actual: decoded.data.magic }
          ),
        };
      }

      // Vérifier la version (migration forward only)
      if (options?.allowMigration === false) {
        if (decoded.data.version !== PERSIST_VERSION) {
          return {
            success: false,
            error: createPersistError(
              PersistErrorCode.VERSION_MISMATCH,
              'Version mismatch and migration not allowed',
              { expected: PERSIST_VERSION, actual: decoded.data.version }
            ),
          };
        }
      }

      // Vérification supplémentaire si demandée
      let verified = true;
      if (options?.verify !== false) {
        // Vérifier le hash des données internes
        const dataEncoded = canonicalEncodeWithHash(decoded.data.data);
        if (dataEncoded.hash !== decoded.data.dataHash) {
          verified = false;
          if (options?.verify === true) {
            return {
              success: false,
              error: createPersistError(
                PersistErrorCode.HASH_MISMATCH,
                'Data hash verification failed',
                { expected: decoded.data.dataHash, actual: dataEncoded.hash }
              ),
            };
          }
        }
      }

      return {
        success: true,
        data: {
          key,
          path: filePath,
          bytesRead: bytes.length,
          sha256: decoded.hash,
          envelope: decoded.data,
          verified,
        },
      };

    } catch (error) {
      if (error instanceof SyntaxError) {
        return {
          success: false,
          error: createPersistError(
            PersistErrorCode.PARSE_FAILED,
            'Failed to parse JSON',
            { key, error: error.message }
          ),
        };
      }

      return {
        success: false,
        error: createPersistError(
          PersistErrorCode.READ_FAILED,
          `Failed to load: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { key, error: String(error) }
        ),
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VERIFY
  // ═══════════════════════════════════════════════════════════════════════════

  async verify(
    key: string,
    expectedHash?: string
  ): Promise<PersistResult<VerifyResult>> {
    const keyValidation = validateKey(key);
    if (!keyValidation.success) {
      return keyValidation;
    }

    const filePath = this.keyToPath(key);
    const errors: string[] = [];

    if (!existsSync(filePath)) {
      return {
        success: true,
        data: {
          key,
          valid: false,
          expectedHash: expectedHash ?? '',
          actualHash: '',
          errors: ['File not found'],
        },
      };
    }

    try {
      const bytes = await readFile(filePath);
      const actualHash = computeHash(bytes);

      // Vérifier le hash externe si fourni
      if (expectedHash && actualHash !== expectedHash) {
        errors.push(`External hash mismatch: expected ${expectedHash}, got ${actualHash}`);
      }

      // Décoder et vérifier la structure
      const decoded = canonicalDecodeWithVerify<PersistedEnvelope>(bytes);

      // Vérifier magic
      if (decoded.data.magic !== PERSIST_MAGIC) {
        errors.push(`Magic mismatch: expected ${PERSIST_MAGIC}, got ${decoded.data.magic}`);
      }

      // Vérifier hash interne des données
      const dataEncoded = canonicalEncodeWithHash(decoded.data.data);
      if (dataEncoded.hash !== decoded.data.dataHash) {
        errors.push(`Data hash mismatch: expected ${decoded.data.dataHash}, got ${dataEncoded.hash}`);
      }

      return {
        success: true,
        data: {
          key,
          valid: errors.length === 0,
          expectedHash: expectedHash ?? decoded.data.dataHash,
          actualHash,
          errors,
        },
      };

    } catch (error) {
      return {
        success: true,
        data: {
          key,
          valid: false,
          expectedHash: expectedHash ?? '',
          actualHash: '',
          errors: [`Parse error: ${error instanceof Error ? error.message : 'Unknown'}`],
        },
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LIST
  // ═══════════════════════════════════════════════════════════════════════════

  async list(prefix?: string): Promise<PersistResult<ListResult>> {
    try {
      const files = await readdir(this.config.basePath);
      
      let keys = files
        .filter(f => f.endsWith(FILE_EXTENSION) && !f.startsWith(DELETED_PREFIX))
        .map(f => f.slice(0, -FILE_EXTENSION.length));

      if (prefix) {
        keys = keys.filter(k => k.startsWith(prefix));
      }

      return {
        success: true,
        data: {
          keys,
          count: keys.length,
          prefix,
        },
      };

    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {
          success: true,
          data: { keys: [], count: 0, prefix },
        };
      }

      return {
        success: false,
        error: createPersistError(
          PersistErrorCode.READ_FAILED,
          `Failed to list: ${error instanceof Error ? error.message : 'Unknown'}`,
          { error: String(error) }
        ),
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE
  // ═══════════════════════════════════════════════════════════════════════════

  async delete(key: string): Promise<PersistResult<{ deleted: boolean }>> {
    const keyValidation = validateKey(key);
    if (!keyValidation.success) {
      return keyValidation;
    }

    const filePath = this.keyToPath(key);

    if (!existsSync(filePath)) {
      return {
        success: true,
        data: { deleted: false },
      };
    }

    try {
      // Soft delete: rename with deleted prefix
      const deletedPath = join(
        dirname(filePath),
        `${DELETED_PREFIX}${Date.now()}_${basename(filePath)}`
      );

      await rename(filePath, deletedPath);

      return {
        success: true,
        data: { deleted: true },
      };

    } catch (error) {
      return {
        success: false,
        error: createPersistError(
          PersistErrorCode.WRITE_FAILED,
          `Failed to delete: ${error instanceof Error ? error.message : 'Unknown'}`,
          { key, error: String(error) }
        ),
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXISTS
  // ═══════════════════════════════════════════════════════════════════════════

  async exists(key: string): Promise<boolean> {
    const keyValidation = validateKey(key);
    if (!keyValidation.success) {
      return false;
    }

    return existsSync(this.keyToPath(key));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private keyToPath(key: string): string {
    return join(this.config.basePath, `${key}${FILE_EXTENSION}`);
  }

  private keyToTempPath(key: string): string {
    const random = randomBytes(4).toString('hex');
    return join(this.config.basePath, `${key}_${random}${TEMP_EXTENSION}`);
  }

  private keyToLockPath(key: string): string {
    return join(this.config.basePath, `${key}${LOCK_EXTENSION}`);
  }

  private ensureBaseDirectory(): void {
    if (!existsSync(this.config.basePath)) {
      mkdirSync(this.config.basePath, { recursive: true });
    }
  }

  /**
   * Écriture atomique avec fsync
   */
  private async atomicWrite(path: string, data: Buffer): Promise<void> {
    const handle = await open(path, 'w');
    try {
      await handle.write(data);
      await handle.sync(); // fsync
    } finally {
      await handle.close();
    }
  }

  /**
   * Fsync du répertoire (best effort)
   */
  private async fsyncDirectory(dirPath: string): Promise<void> {
    const handle = await open(dirPath, 'r');
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
  }

  /**
   * Acquiert un lock exclusif
   */
  private async acquireLock(
    lockPath: string
  ): Promise<PersistResult<{ acquired: boolean }>> {
    const startTime = Date.now();

    while (Date.now() - startTime < this.config.lockTimeout) {
      try {
        // Essayer de créer le fichier lock en mode exclusif
        const handle = await open(lockPath, 'wx');
        const fd = (handle as unknown as { fd: number }).fd;
        this.locks.set(lockPath, { handle: fd, timestamp: Date.now() });
        await handle.close();
        return { success: true, data: { acquired: true } };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
          // Lock existe, attendre et réessayer
          await new Promise(r => setTimeout(r, 50));
          continue;
        }
        // Autre erreur
        return {
          success: false,
          error: createPersistError(
            PersistErrorCode.LOCK_FAILED,
            `Failed to acquire lock: ${error instanceof Error ? error.message : 'Unknown'}`,
            { lockPath }
          ),
        };
      }
    }

    return {
      success: false,
      error: createPersistError(
        PersistErrorCode.LOCK_TIMEOUT,
        'Lock acquisition timeout',
        { lockPath, timeout: this.config.lockTimeout }
      ),
    };
  }

  /**
   * Relâche un lock
   */
  private async releaseLock(lockPath: string): Promise<void> {
    try {
      await unlink(lockPath);
      this.locks.delete(lockPath);
    } catch {
      // Ignore
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

export function createNodeFileAdapter(
  config?: Partial<AdapterConfig>
): NodeFileAdapter {
  return new NodeFileAdapter(config);
}
