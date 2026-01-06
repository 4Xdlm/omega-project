// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — HANDLER REGISTRY
// Version: 1.0.0
// Date: 06 janvier 2026
// Standard: NASA-Grade L4 / DO-178C / MIL-STD
// ═══════════════════════════════════════════════════════════════════════════════
//
// INNOVATION: Capability-Based Registry avec Version Pinning Strict
//
// Le Registry ne fait pas que mapper module → handler.
// Il vérifie les CAPABILITIES déclarées et garantit le version pinning.
//
// @invariant INV-ORCH-05: Version Pinned Registry
// @invariant INV-REG-01: No Handler Without Version
// @invariant INV-REG-02: Capability Match Required
//
// ═══════════════════════════════════════════════════════════════════════════════

import type { NexusEnvelope, NexusResult, NexusHandler } from '../types.js';
import { ok, fail } from '../types.js';
import { adapterError } from '../errors.js';

const MODULE = 'registry';

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR CODES
// ═══════════════════════════════════════════════════════════════════════════════

export const RegistryErrorCodes = {
  NO_HANDLER: 'REG_NO_HANDLER',
  HANDLER_REJECT: 'REG_HANDLER_REJECT',
  DUPLICATE_REGISTRATION: 'REG_DUPLICATE',
  INVALID_REGISTRATION: 'REG_INVALID',
  CAPABILITY_MISMATCH: 'REG_CAPABILITY_MISMATCH',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Clé de handler: target_module@version
 */
type HandlerKey = `${string}@${string}`;

/**
 * Capabilities déclarées par un handler
 */
export interface HandlerCapabilities {
  /** Schemas supportés */
  readonly schemas: readonly string[];
  /** Kinds supportés */
  readonly kinds: readonly string[];
  /** Timeout max supporté (ms) */
  readonly maxTimeoutMs?: number;
  /** Supporte les opérations idempotentes */
  readonly idempotent?: boolean;
  /** Métadonnées custom */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Enregistrement complet d'un handler
 */
export interface HandlerRegistration {
  /** Module cible */
  readonly targetModule: string;
  /** Version du module */
  readonly moduleVersion: string;
  /** Handler */
  readonly handler: NexusHandler;
  /** Capabilities */
  readonly capabilities: HandlerCapabilities;
  /** Timestamp d'enregistrement */
  readonly registeredAt: number;
}

/**
 * Résultat de résolution
 */
export interface ResolveResult {
  /** Handler résolu */
  readonly handler: NexusHandler;
  /** Registration complète */
  readonly registration: HandlerRegistration;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HANDLER REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Registry de handlers avec version pinning et capabilities
 * 
 * @invariant INV-ORCH-05: Chaque handler est identifié par target_module@version
 * @invariant INV-REG-01: Pas de handler sans version explicite
 * @invariant INV-REG-02: Le handler doit supporter le schema demandé
 */
export class HandlerRegistry {
  private readonly handlers = new Map<HandlerKey, HandlerRegistration>();
  private readonly byModule = new Map<string, Set<HandlerKey>>();

  /**
   * Enregistre un handler
   * 
   * @throws Si duplicate ou invalid
   */
  register(
    targetModule: string,
    moduleVersion: string,
    handler: NexusHandler,
    capabilities: HandlerCapabilities
  ): void {
    // Validation
    if (!targetModule || !moduleVersion) {
      throw new Error('targetModule and moduleVersion are required');
    }
    if (!moduleVersion.includes('@')) {
      throw new Error(`moduleVersion must be in format "module@version", got: ${moduleVersion}`);
    }
    if (capabilities.schemas.length === 0) {
      throw new Error('Handler must declare at least one supported schema');
    }

    const key = this.makeKey(targetModule, moduleVersion);

    // Check duplicate
    if (this.handlers.has(key)) {
      throw new Error(`Duplicate handler registration for ${key}`);
    }

    // Register
    const registration: HandlerRegistration = {
      targetModule,
      moduleVersion,
      handler,
      capabilities,
      registeredAt: Date.now(),
    };

    this.handlers.set(key, registration);

    // Index by module
    let moduleKeys = this.byModule.get(targetModule);
    if (!moduleKeys) {
      moduleKeys = new Set();
      this.byModule.set(targetModule, moduleKeys);
    }
    moduleKeys.add(key);
  }

  /**
   * Résout un handler pour une envelope
   * 
   * @invariant INV-ORCH-05: Version pinning strict
   * @invariant INV-REG-02: Capability match
   */
  resolve(env: NexusEnvelope): NexusResult<ResolveResult> {
    const key = this.makeKey(env.target_module, env.module_version);

    // 1. Lookup by exact key
    const registration = this.handlers.get(key);
    if (!registration) {
      return fail(
        adapterError(
          MODULE,
          RegistryErrorCodes.NO_HANDLER,
          `No handler registered for ${key}`,
          false
        )
      );
    }

    // 2. Check capabilities - schema must be supported
    if (!registration.capabilities.schemas.includes(env.payload_schema)) {
      return fail(
        adapterError(
          MODULE,
          RegistryErrorCodes.CAPABILITY_MISMATCH,
          `Handler ${key} does not support schema ${env.payload_schema}`,
          false
        )
      );
    }

    // 3. Check capabilities - kind must be supported
    if (!registration.capabilities.kinds.includes(env.kind)) {
      return fail(
        adapterError(
          MODULE,
          RegistryErrorCodes.CAPABILITY_MISMATCH,
          `Handler ${key} does not support kind ${env.kind}`,
          false
        )
      );
    }

    // 4. Check canHandle (handler-specific logic)
    if (!registration.handler.canHandle(env)) {
      return fail(
        adapterError(
          MODULE,
          RegistryErrorCodes.HANDLER_REJECT,
          `Handler ${key} rejected envelope`,
          false
        )
      );
    }

    return ok({
      handler: registration.handler,
      registration,
    });
  }

  /**
   * Désenregistre un handler
   */
  unregister(targetModule: string, moduleVersion: string): boolean {
    const key = this.makeKey(targetModule, moduleVersion);
    
    const deleted = this.handlers.delete(key);
    if (deleted) {
      const moduleKeys = this.byModule.get(targetModule);
      if (moduleKeys) {
        moduleKeys.delete(key);
        if (moduleKeys.size === 0) {
          this.byModule.delete(targetModule);
        }
      }
    }
    
    return deleted;
  }

  /**
   * Vérifie si un handler est enregistré
   */
  has(targetModule: string, moduleVersion: string): boolean {
    return this.handlers.has(this.makeKey(targetModule, moduleVersion));
  }

  /**
   * Retourne toutes les versions enregistrées pour un module
   */
  getVersionsForModule(targetModule: string): string[] {
    const keys = this.byModule.get(targetModule);
    if (!keys) return [];
    
    return Array.from(keys).map(key => {
      const reg = this.handlers.get(key);
      return reg ? reg.moduleVersion : '';
    }).filter(v => v !== '');
  }

  /**
   * Retourne tous les handlers enregistrés
   */
  getAllRegistrations(): HandlerRegistration[] {
    return Array.from(this.handlers.values());
  }

  /**
   * Nombre de handlers enregistrés
   */
  get size(): number {
    return this.handlers.size;
  }

  /**
   * Vide le registry
   */
  clear(): void {
    this.handlers.clear();
    this.byModule.clear();
  }

  /**
   * Construit la clé de lookup
   */
  private makeKey(targetModule: string, moduleVersion: string): HandlerKey {
    return `${targetModule}@${moduleVersion}` as HandlerKey;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crée un registry vide
 */
export function createHandlerRegistry(): HandlerRegistry {
  return new HandlerRegistry();
}
