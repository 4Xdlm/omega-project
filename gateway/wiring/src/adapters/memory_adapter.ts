// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — MEMORY ADAPTER
// Version: 1.0.0
// Date: 06 janvier 2026
// Standard: NASA-Grade L4 / DO-178C / MIL-STD
// ═══════════════════════════════════════════════════════════════════════════════
//
// INVARIANTS:
// @invariant INV-ADP-01: Memory Write Forwards Hash
// @invariant INV-ADP-02: Memory Read Deterministic
// @invariant INV-WIRE-03: Version Pinning (mismatch = reject)
// @invariant INV-ADP-05: Error No Leak
//
// ═══════════════════════════════════════════════════════════════════════════════

import type { NexusEnvelope, NexusHandler, NexusResult } from '../types.js';
import { ok, fail } from '../types.js';
import { adapterError, AdapterErrorCodes, safeError } from '../errors.js';

const MODULE = 'memory_adapter';

// ═══════════════════════════════════════════════════════════════════════════════
// MEMORY STACK INTERFACE (Contrat avec Memory Stack existant)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Interface minimale du Memory Stack
 * Adapte aux vrais noms de ton implémentation
 */
export interface MemoryStack {
  /**
   * Écrit une valeur avec clé
   * @param input - { key, value, expected_previous_hash? }
   * @returns { hash } - Hash de l'entrée créée
   */
  write(input: {
    key: string;
    value: unknown;
    expected_previous_hash?: string | null;
  }): Promise<{ hash: string }>;

  /**
   * Lit la dernière valeur pour une clé
   * @param input - { key }
   * @returns { value, hash }
   */
  readLatest(input: { key: string }): Promise<{ value: unknown; hash: string }>;

  /**
   * Lit une valeur spécifique par hash
   * @param input - { hash }
   * @returns { key, value } ou null si non trouvé
   */
  readByHash?(input: { hash: string }): Promise<{ key: string; value: unknown } | null>;

  /**
   * Liste les clés existantes
   * @param input - { prefix? } - Filtre optionnel par préfixe
   * @returns { keys }
   */
  listKeys?(input: { prefix?: string }): Promise<{ keys: string[] }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAYLOAD TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Payload pour memory.write */
export interface MemoryWritePayload {
  key: string;
  value: unknown;
}

/** Payload pour memory.readLatest */
export interface MemoryReadLatestPayload {
  key: string;
}

/** Payload pour memory.readByHash */
export interface MemoryReadByHashPayload {
  hash: string;
}

/** Payload pour memory.listKeys */
export interface MemoryListKeysPayload {
  prefix?: string;
}

/** Réponse pour memory.write */
export interface MemoryWriteResponse {
  hash: string;
}

/** Réponse pour memory.readLatest */
export interface MemoryReadLatestResponse {
  value: unknown;
  hash: string;
}

/** Réponse pour memory.readByHash */
export interface MemoryReadByHashResponse {
  key: string;
  value: unknown;
}

/** Réponse pour memory.listKeys */
export interface MemoryListKeysResponse {
  keys: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMAS SUPPORTÉS
// ═══════════════════════════════════════════════════════════════════════════════

export const MEMORY_SCHEMAS = {
  WRITE: 'memory.write',
  READ_LATEST: 'memory.readLatest',
  READ_BY_HASH: 'memory.readByHash',
  LIST_KEYS: 'memory.listKeys',
} as const;

export type MemorySchema = typeof MEMORY_SCHEMAS[keyof typeof MEMORY_SCHEMAS];

// ═══════════════════════════════════════════════════════════════════════════════
// MEMORY ADAPTER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Adapter Memory Stack → NEXUS
 * 
 * Traduit les NexusEnvelope en appels Memory Stack et vice-versa.
 * 
 * @invariant INV-ADP-01: expected_previous_hash est transmis correctement
 * @invariant INV-ADP-02: Mêmes paramètres = même résultat
 * @invariant INV-WIRE-03: module_version doit matcher
 * @invariant INV-ADP-05: Erreurs codées, pas de fuite
 */
export class MemoryAdapter implements NexusHandler {
  constructor(
    private readonly memory: MemoryStack,
    private readonly moduleVersion: string // ex: "memory@3.21.0"
  ) {
    if (!moduleVersion || !moduleVersion.includes('@')) {
      throw new Error('moduleVersion must be in format "module@version"');
    }
  }

  /**
   * Vérifie si cet adapter peut traiter l'envelope
   */
  canHandle(env: NexusEnvelope): boolean {
    return env.target_module === 'memory';
  }

  /**
   * Traite l'envelope et retourne le résultat
   */
  async handle(env: NexusEnvelope): Promise<NexusResult<unknown>> {
    // INV-WIRE-03: Version Pinning
    if (env.module_version !== this.moduleVersion) {
      return fail(
        adapterError(
          MODULE,
          AdapterErrorCodes.MEMORY_WRITE_FAILED,
          `Version mismatch: expected ${this.moduleVersion}, got ${env.module_version}`,
          false
        )
      );
    }

    try {
      switch (env.payload_schema) {
        case MEMORY_SCHEMAS.WRITE:
          return await this.handleWrite(env);

        case MEMORY_SCHEMAS.READ_LATEST:
          return await this.handleReadLatest(env);

        case MEMORY_SCHEMAS.READ_BY_HASH:
          return await this.handleReadByHash(env);

        case MEMORY_SCHEMAS.LIST_KEYS:
          return await this.handleListKeys(env);

        default:
          return fail(
            adapterError(
              MODULE,
              AdapterErrorCodes.UNSUPPORTED_SCHEMA,
              `Unsupported schema: ${env.payload_schema}`,
              false
            )
          );
      }
    } catch (caught) {
      // INV-ADP-05: Error No Leak
      return fail(safeError(caught, MODULE, AdapterErrorCodes.MEMORY_WRITE_FAILED, true));
    }
  }

  /**
   * Traite memory.write
   * @invariant INV-ADP-01: expected_previous_hash forwarded
   */
  private async handleWrite(env: NexusEnvelope): Promise<NexusResult<MemoryWriteResponse>> {
    const payload = env.payload as MemoryWritePayload;

    // Validation payload
    if (!payload || typeof payload.key !== 'string' || payload.key.length === 0) {
      return fail(
        adapterError(
          MODULE,
          AdapterErrorCodes.MEMORY_BAD_PAYLOAD,
          'memory.write requires key: string (non-empty)',
          false
        )
      );
    }

    // INV-ADP-01: Forward expected_previous_hash
    const result = await this.memory.write({
      key: payload.key,
      value: payload.value,
      expected_previous_hash: env.expected_previous_hash ?? null,
    });

    return ok({ hash: result.hash });
  }

  /**
   * Traite memory.readLatest
   * @invariant INV-ADP-02: Deterministic read
   */
  private async handleReadLatest(env: NexusEnvelope): Promise<NexusResult<MemoryReadLatestResponse>> {
    const payload = env.payload as MemoryReadLatestPayload;

    // Validation payload
    if (!payload || typeof payload.key !== 'string' || payload.key.length === 0) {
      return fail(
        adapterError(
          MODULE,
          AdapterErrorCodes.MEMORY_BAD_PAYLOAD,
          'memory.readLatest requires key: string (non-empty)',
          false
        )
      );
    }

    const result = await this.memory.readLatest({ key: payload.key });
    return ok({ value: result.value, hash: result.hash });
  }

  /**
   * Traite memory.readByHash
   */
  private async handleReadByHash(env: NexusEnvelope): Promise<NexusResult<MemoryReadByHashResponse | null>> {
    if (!this.memory.readByHash) {
      return fail(
        adapterError(
          MODULE,
          AdapterErrorCodes.UNSUPPORTED_SCHEMA,
          'memory.readByHash is not supported by this Memory Stack',
          false
        )
      );
    }

    const payload = env.payload as MemoryReadByHashPayload;

    // Validation payload
    if (!payload || typeof payload.hash !== 'string' || payload.hash.length === 0) {
      return fail(
        adapterError(
          MODULE,
          AdapterErrorCodes.MEMORY_BAD_PAYLOAD,
          'memory.readByHash requires hash: string (non-empty)',
          false
        )
      );
    }

    const result = await this.memory.readByHash({ hash: payload.hash });
    if (result === null) {
      return ok(null);
    }
    return ok({ key: result.key, value: result.value });
  }

  /**
   * Traite memory.listKeys
   */
  private async handleListKeys(env: NexusEnvelope): Promise<NexusResult<MemoryListKeysResponse>> {
    if (!this.memory.listKeys) {
      return fail(
        adapterError(
          MODULE,
          AdapterErrorCodes.UNSUPPORTED_SCHEMA,
          'memory.listKeys is not supported by this Memory Stack',
          false
        )
      );
    }

    const payload = env.payload as MemoryListKeysPayload;
    const prefix = payload?.prefix;

    const result = await this.memory.listKeys({ prefix });
    return ok({ keys: result.keys });
  }

  /**
   * Retourne la version du module
   */
  getModuleVersion(): string {
    return this.moduleVersion;
  }

  /**
   * Retourne les schemas supportés
   */
  getSupportedSchemas(): string[] {
    const schemas = [MEMORY_SCHEMAS.WRITE, MEMORY_SCHEMAS.READ_LATEST];
    if (this.memory.readByHash) schemas.push(MEMORY_SCHEMAS.READ_BY_HASH);
    if (this.memory.listKeys) schemas.push(MEMORY_SCHEMAS.LIST_KEYS);
    return schemas;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crée un MemoryAdapter
 */
export function createMemoryAdapter(
  memory: MemoryStack,
  moduleVersion: string
): MemoryAdapter {
  return new MemoryAdapter(memory, moduleVersion);
}
