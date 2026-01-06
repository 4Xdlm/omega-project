// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — GATEWAY ADAPTER
// Version: 1.0.0
// Date: 06 janvier 2026
// Standard: NASA-Grade L4 / DO-178C / MIL-STD
// ═══════════════════════════════════════════════════════════════════════════════
//
// INNOVATION: Phantom Types pour états garantis
//
// Le GatewayAdapter est un TRADUCTEUR PUR:
// - Il NE FAIT QUE convertir un input en NexusEnvelope
// - Il N'APPELLE AUCUN module métier
// - Il N'EXÉCUTE AUCUNE logique
//
// Les Phantom Types garantissent qu'une envelope ne peut être créée
// que par ce module et qu'elle est immutable une fois scellée.
//
// INVARIANTS:
// @invariant INV-GW-01: Zero Direct Call - aucun import de module métier
// @invariant INV-GW-02: Schema Determinism - même input → même schema
// @invariant INV-GW-03: No Hidden Mutation - payload === input
// @invariant INV-GW-04: Version Pinning - module_version explicite
// @invariant INV-GW-05: Rejection Strict - input inconnu → erreur
//
// ═══════════════════════════════════════════════════════════════════════════════

import type { Clock, IdFactory, NexusEnvelope, NexusResult, NexusAuthContext } from '../types.js';
import { ok, fail } from '../types.js';
import { buildEnvelope } from '../envelope.js';
import { canonicalStringify } from '../canonical_json.js';
import { adapterError } from '../errors.js';
import {
  type GatewayInput,
  type GatewayInputKind,
  type EnvelopeSpec,
  type ValidationResult,
  mapToEnvelopeSpec,
  validateGatewayInput,
  GatewayValidationCodes,
} from './gateway_schemas.js';

const MODULE = 'gateway_adapter';

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR CODES
// ═══════════════════════════════════════════════════════════════════════════════

export const GatewayErrorCodes = {
  INVALID_INPUT: 'GW_INVALID_INPUT',
  MISSING_VERSION: 'GW_MISSING_VERSION',
  BUILD_FAILED: 'GW_BUILD_FAILED',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configuration du GatewayAdapter
 */
export interface GatewayAdapterConfig {
  /** Clock injectable */
  readonly clock: Clock;
  /** IdFactory injectable */
  readonly ids: IdFactory;
  /** Map module → version (ex: { memory: "memory@3.21.0" }) */
  readonly moduleVersions: Readonly<Record<string, string>>;
  /** Module source (défaut: "gateway") */
  readonly sourceModule?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REQUEST CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Contexte de requête Gateway
 * Fourni par l'appelant (HTTP handler, CLI, IPC, etc.)
 */
export interface GatewayRequestContext {
  /** Trace ID pour corrélation (généré par l'appelant ou le gateway) */
  readonly trace_id: string;
  /** Contexte d'authentification optionnel */
  readonly auth_context?: NexusAuthContext;
  /** Parent span pour tracing distribué */
  readonly parent_span_id?: string;
  /** Hash précédent attendu (pour chaînage ledger) */
  readonly expected_previous_hash?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUILD RESULT — Résultat de la construction
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Résultat de construction d'envelope
 */
export interface EnvelopeBuildResult {
  /** L'envelope construite */
  readonly envelope: NexusEnvelope;
  /** Spec utilisée (pour debug/audit) */
  readonly spec: EnvelopeSpec;
  /** Input original validé */
  readonly validatedInput: GatewayInput;
  /** Fingerprint déterministe de l'input */
  readonly inputFingerprint: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GATEWAY ADAPTER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GatewayAdapter — Traducteur pur input → NexusEnvelope
 * 
 * RESPONSABILITÉS (EXHAUSTIVES):
 * ✅ Valider l'input
 * ✅ Mapper vers EnvelopeSpec
 * ✅ Construire NexusEnvelope
 * ✅ Injecter trace_id, message_id, timestamp, auth_context
 * 
 * INTERDICTIONS (ABSOLUES):
 * ❌ Appeler Memory/Query/Oracle/Muse
 * ❌ Faire de la logique métier
 * ❌ Muter le payload après construction
 * ❌ Deviner un schema
 * 
 * @invariant INV-GW-01: Zero Direct Call
 * @invariant INV-GW-02: Schema Determinism
 * @invariant INV-GW-03: No Hidden Mutation
 * @invariant INV-GW-04: Version Pinning
 * @invariant INV-GW-05: Rejection Strict
 */
export class GatewayAdapter {
  private readonly config: Required<GatewayAdapterConfig>;

  constructor(config: GatewayAdapterConfig) {
    this.config = {
      clock: config.clock,
      ids: config.ids,
      moduleVersions: config.moduleVersions,
      sourceModule: config.sourceModule ?? 'gateway',
    };

    // Validation: toutes les versions doivent être au format module@version
    for (const [module, version] of Object.entries(this.config.moduleVersions)) {
      if (!version.includes('@')) {
        throw new Error(`Invalid version format for ${module}: ${version} (expected module@version)`);
      }
    }
  }

  /**
   * Construit une NexusEnvelope à partir d'un input brut
   * 
   * @param rawInput - Input brut (unknown) à transformer
   * @param context - Contexte de la requête
   * @returns NexusResult avec EnvelopeBuildResult ou erreur
   * 
   * @invariant INV-GW-05: Input invalide → erreur, jamais fallback
   */
  build(rawInput: unknown, context: GatewayRequestContext): NexusResult<EnvelopeBuildResult> {
    // 1. Validate input (INV-GW-05: Rejection Strict)
    const validation = validateGatewayInput(rawInput);
    if (!validation.valid) {
      return fail(
        adapterError(MODULE, GatewayErrorCodes.INVALID_INPUT, validation.error, false)
      );
    }

    const validatedInput = validation.value;

    // 2. Map to spec (INV-GW-02: Schema Determinism)
    const spec = mapToEnvelopeSpec(validatedInput);

    // 3. Get module version (INV-GW-04: Version Pinning)
    const moduleVersion = this.config.moduleVersions[spec.target_module];
    if (!moduleVersion) {
      return fail(
        adapterError(
          MODULE,
          GatewayErrorCodes.MISSING_VERSION,
          `No version configured for module: ${spec.target_module}`,
          false
        )
      );
    }

    // 4. Build envelope (INV-GW-03: No Hidden Mutation)
    // Le payload est directement celui du spec, aucune mutation
    const envelope = buildEnvelope({
      clock: this.config.clock,
      ids: this.config.ids,
      trace_id: context.trace_id,
      parent_span_id: context.parent_span_id,
      source_module: this.config.sourceModule,
      target_module: spec.target_module,
      kind: spec.nexus_kind,
      payload_schema: spec.payload_schema,
      payload_version: spec.payload_version,
      module_version: moduleVersion,
      auth_context: context.auth_context,
      expected_previous_hash: context.expected_previous_hash,
      payload: spec.payload,
    });

    // 5. Compute input fingerprint (pour déduplication/audit)
    const inputFingerprint = this.computeFingerprint(validatedInput);

    return ok({
      envelope,
      spec,
      validatedInput,
      inputFingerprint,
    });
  }

  /**
   * Construit une NexusEnvelope à partir d'un GatewayInput déjà validé
   * 
   * Version "fast path" pour quand l'input est déjà typé
   * 
   * @param input - GatewayInput typé
   * @param context - Contexte de la requête
   */
  buildFromValidated(input: GatewayInput, context: GatewayRequestContext): NexusResult<EnvelopeBuildResult> {
    const spec = mapToEnvelopeSpec(input);

    const moduleVersion = this.config.moduleVersions[spec.target_module];
    if (!moduleVersion) {
      return fail(
        adapterError(
          MODULE,
          GatewayErrorCodes.MISSING_VERSION,
          `No version configured for module: ${spec.target_module}`,
          false
        )
      );
    }

    const envelope = buildEnvelope({
      clock: this.config.clock,
      ids: this.config.ids,
      trace_id: context.trace_id,
      parent_span_id: context.parent_span_id,
      source_module: this.config.sourceModule,
      target_module: spec.target_module,
      kind: spec.nexus_kind,
      payload_schema: spec.payload_schema,
      payload_version: spec.payload_version,
      module_version: moduleVersion,
      auth_context: context.auth_context,
      expected_previous_hash: context.expected_previous_hash,
      payload: spec.payload,
    });

    return ok({
      envelope,
      spec,
      validatedInput: input,
      inputFingerprint: this.computeFingerprint(input),
    });
  }

  /**
   * Valide un input sans construire l'envelope
   * Utile pour validation précoce
   */
  validate(rawInput: unknown): ValidationResult<GatewayInput> {
    return validateGatewayInput(rawInput);
  }

  /**
   * Retourne les kinds supportés
   */
  getSupportedKinds(): readonly GatewayInputKind[] {
    // Filtre par les modules dont on a la version
    const configuredModules = new Set(Object.keys(this.config.moduleVersions));
    const allKinds: GatewayInputKind[] = [
      'memory.write', 'memory.readLatest', 'memory.readByHash', 'memory.listKeys',
      'query.search', 'query.find', 'query.aggregate', 'query.analyze',
      'gateway.ping', 'gateway.status',
    ];

    return allKinds.filter(kind => {
      const module = kind.split('.')[0];
      return configuredModules.has(module);
    });
  }

  /**
   * Vérifie si un kind est supporté (version configurée)
   */
  isKindSupported(kind: GatewayInputKind): boolean {
    const module = kind.split('.')[0];
    return module in this.config.moduleVersions;
  }

  /**
   * Retourne la configuration (lecture seule)
   */
  getConfig(): Readonly<Required<GatewayAdapterConfig>> {
    return this.config;
  }

  /**
   * Calcule un fingerprint déterministe de l'input
   * Utilisé pour déduplication et audit
   */
  private computeFingerprint(input: GatewayInput): string {
    // Filtrer les undefined récursivement pour canonicalStringify
    const cleaned = this.removeUndefined(input);
    const canonical = canonicalStringify(cleaned);
    return Buffer.from(canonical).toString('base64url').substring(0, 32);
  }

  /**
   * Supprime récursivement les propriétés undefined
   */
  private removeUndefined(obj: unknown): unknown {
    if (obj === null || obj === undefined) return null;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => this.removeUndefined(item));
    
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (value !== undefined) {
        result[key] = this.removeUndefined(value);
      }
    }
    return result;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crée un GatewayAdapter
 */
export function createGatewayAdapter(config: GatewayAdapterConfig): GatewayAdapter {
  return new GatewayAdapter(config);
}

/**
 * Crée un GatewayAdapter avec versions OMEGA standard
 */
export function createOmegaGatewayAdapter(
  clock: Clock,
  ids: IdFactory,
  versions?: Partial<Record<string, string>>
): GatewayAdapter {
  const defaultVersions: Record<string, string> = {
    memory: 'memory@3.21.0',
    query: 'query@3.21.0',
    gateway: 'gateway@3.21.0',
    ...versions,
  };

  return new GatewayAdapter({
    clock,
    ids,
    moduleVersions: defaultVersions,
  });
}
