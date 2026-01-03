// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA NEXUS — MODULE INDEX
// Version: 1.0.0 FROZEN
// Date: 01 janvier 2026
// Standard: NASA-STD-8719.13C / DO-178C Level A
// ═══════════════════════════════════════════════════════════════════════════════
//
// NEXUS est le système nerveux central d'OMEGA.
// Tout passe par ici. Rien n'échappe au gardien.
//
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// DEP — Deterministic Envelope Protocol
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Types
  DepEnvelope,
  DepVerifyResult,
  DepError,
  
  // Factory
  createEnvelope,
  
  // Hashing (Pure functions)
  computePayloadHash,
  computeEnvelopeId,
  computeSchemaHash,
  
  // Verification
  verifyEnvelope,
  verifyChain,
  
  // Serialization
  serializeEnvelope,
  deserializeEnvelope,
  
  // Namespace
  DEP
} from './dep';

// ═══════════════════════════════════════════════════════════════════════════════
// PROTOCOL — Commands & Events
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Command Types
  OmegaCommand,
  GenesisCommand,
  ScribeCommand,
  CanonCommand,
  VoiceCommand,
  SystemCommand,
  
  // Request Types
  GenesisRequest,
  CanonFact,
  CanonFilters,
  ExportFormat,
  
  // Event Types
  OmegaEvent,
  GenesisEvent,
  ScribeEvent,
  CanonEvent,
  VoiceEvent,
  SystemEvent,
  
  // Response Types
  GenesisPlan,
  Act,
  Scene,
  VoiceProfile,
  SystemStatus,
  ModuleStatus,
  
  // Schema Versions
  SCHEMA_VERSIONS,
  
  // Type Guards
  isOmegaCommand,
  isOmegaEvent,
  
  // Namespace
  Protocol
} from './protocol';

// ═══════════════════════════════════════════════════════════════════════════════
// GATEWAY — Router + Policy + Recorder
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Gateway Class
  NexusGateway,
  
  // Factory
  createGateway,
  createGatewayWithConfig,
  
  // Policy
  checkPolicy,
  DEFAULT_POLICY,
  
  // Types
  GatewayConfig,
  GatewayMode,
  GatewayPolicy,
  RecorderEntry,
  DispatchResult,
  GatewayError,
  ModuleHandler,
  
  // Namespace
  Gateway
} from './gateway';

// ═══════════════════════════════════════════════════════════════════════════════
// NEXUS UNIFIED NAMESPACE
// ═══════════════════════════════════════════════════════════════════════════════

import { DEP } from './dep';
import { Protocol } from './protocol';
import { Gateway } from './gateway';

/**
 * NEXUS — Point d'entrée unifié pour le système de câblage OMEGA.
 * 
 * Usage:
 * ```typescript
 * import { NEXUS } from './nexus';
 * 
 * // Créer un gateway
 * const gateway = NEXUS.Gateway.createGateway('my_seed', 'PRODUCTION');
 * 
 * // Créer une enveloppe
 * const envelope = NEXUS.DEP.createEnvelope(payload, seed, schema, version);
 * 
 * // Vérifier une enveloppe
 * const result = NEXUS.DEP.verifyEnvelope(envelope);
 * ```
 */
export const NEXUS = {
  DEP,
  Protocol,
  Gateway,
  
  /** Version du module NEXUS */
  VERSION: '1.0.0' as const,
  
  /** Date de gel */
  FROZEN_DATE: '2026-01-01' as const,
  
  /** Standard de certification */
  STANDARD: 'NASA-STD-8719.13C / DO-178C Level A' as const
} as const;

export default NEXUS;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE EXPORTS FOR EXTERNAL USE
// ═══════════════════════════════════════════════════════════════════════════════

/** Re-export all types for TypeScript consumers */
export type {
  DepEnvelope,
  DepVerifyResult,
  DepError
} from './dep';

export type {
  OmegaCommand,
  OmegaEvent,
  GenesisRequest,
  GenesisPlan,
  CanonFact,
  VoiceProfile
} from './protocol';

export type {
  GatewayConfig,
  GatewayPolicy,
  RecorderEntry,
  DispatchResult,
  GatewayError,
  ModuleHandler
} from './gateway';
