/**
 * OMEGA CLI_RUNNER — Module Contract
 * Phase 16.0 — NASA-Grade
 * 
 * Defines the I/O contracts and routing policy for all CLI commands.
 * 
 * ROUTING POLICY:
 * - DIRECT: Pure compute, no persistent I/O, no side effects
 * - NEXUS: Storage, audit trail, decisions, traces required
 */

import { ROUTING, type RoutingType } from './constants.js';

// ============================================================================
// MODULE CONTRACT INTERFACE
// ============================================================================

export interface InputSchema {
  type: 'file' | 'directory' | 'project' | 'none';
  extensions?: readonly string[];
  required: boolean;
  multiple: boolean;
  maxSize?: number;
}

export interface OutputSchema {
  type: 'json' | 'text' | 'file' | 'report';
  formats: readonly string[];
  deterministic: boolean;
}

export interface ModuleContract {
  name: string;
  version: string;
  description: string;
  input: InputSchema;
  output: OutputSchema;
  routing: RoutingType;
  requiresAudit: boolean;
  sideEffects: boolean;
  timeout?: number;
}

// ============================================================================
// ROUTING POLICY DOCUMENTATION
// ============================================================================

export const ROUTING_POLICY = {
  [ROUTING.DIRECT]: {
    description: 'Pure compute local, pas d\'effets persistants, pas d\'IO',
    useCase: 'Diagnostic système, exports, calculs purs',
    audit: false,
    examples: ['health', 'version', 'info', 'export (read-only)'],
  },
  [ROUTING.NEXUS]: {
    description: 'Stockage, audit, décisions, traces requises',
    useCase: 'Analyse, comparaison, batch processing',
    audit: true,
    examples: ['analyze', 'compare', 'batch'],
  },
} as const;

// ============================================================================
// COMMAND CONTRACTS
// ============================================================================

export const CONTRACTS: Record<string, ModuleContract> = {
  analyze: {
    name: 'analyze',
    version: '1.0.0',
    description: 'Analyse émotionnelle d\'un fichier texte',
    input: {
      type: 'file',
      extensions: ['.txt', '.md', '.text'],
      required: true,
      multiple: false,
      maxSize: 10_485_760, // 10 MB
    },
    output: {
      type: 'json',
      formats: ['json', 'md', 'docx'],
      deterministic: true,
    },
    routing: ROUTING.NEXUS,
    requiresAudit: true,
    sideEffects: false,
    timeout: 30_000,
  },

  compare: {
    name: 'compare',
    version: '1.0.0',
    description: 'Compare deux fichiers texte',
    input: {
      type: 'file',
      extensions: ['.txt', '.md', '.text'],
      required: true,
      multiple: true,
      maxSize: 10_485_760,
    },
    output: {
      type: 'json',
      formats: ['json', 'md'],
      deterministic: true,
    },
    routing: ROUTING.NEXUS,
    requiresAudit: true,
    sideEffects: false,
    timeout: 60_000,
  },

  export: {
    name: 'export',
    version: '1.0.0',
    description: 'Exporte un projet OMEGA',
    input: {
      type: 'project',
      extensions: ['.omega'],
      required: true,
      multiple: false,
    },
    output: {
      type: 'file',
      formats: ['json', 'md', 'docx'],
      deterministic: true,
    },
    routing: ROUTING.DIRECT,
    requiresAudit: false,
    sideEffects: true, // Creates output file
    timeout: 120_000,
  },

  batch: {
    name: 'batch',
    version: '1.0.0',
    description: 'Traitement batch de plusieurs fichiers',
    input: {
      type: 'directory',
      extensions: ['.txt', '.md', '.text'],
      required: true,
      multiple: true,
    },
    output: {
      type: 'report',
      formats: ['json', 'md'],
      deterministic: true,
    },
    routing: ROUTING.NEXUS,
    requiresAudit: true,
    sideEffects: true,
    timeout: 300_000, // 5 minutes
  },

  health: {
    name: 'health',
    version: '1.0.0',
    description: 'Diagnostic système',
    input: {
      type: 'none',
      required: false,
      multiple: false,
    },
    output: {
      type: 'report',
      formats: ['json', 'text'],
      deterministic: false, // Timing can vary
    },
    routing: ROUTING.DIRECT,
    requiresAudit: false,
    sideEffects: false,
    timeout: 10_000,
  },

  version: {
    name: 'version',
    version: '1.0.0',
    description: 'Affiche la version',
    input: {
      type: 'none',
      required: false,
      multiple: false,
    },
    output: {
      type: 'text',
      formats: ['text'],
      deterministic: true,
    },
    routing: ROUTING.DIRECT,
    requiresAudit: false,
    sideEffects: false,
  },

  info: {
    name: 'info',
    version: '1.0.0',
    description: 'Informations système',
    input: {
      type: 'none',
      required: false,
      multiple: false,
    },
    output: {
      type: 'json',
      formats: ['json', 'text'],
      deterministic: false, // System info varies
    },
    routing: ROUTING.DIRECT,
    requiresAudit: false,
    sideEffects: false,
  },
};

// ============================================================================
// CONTRACT VALIDATION
// ============================================================================

export function getContract(commandName: string): ModuleContract | undefined {
  return CONTRACTS[commandName];
}

export function validateRouting(commandName: string, routing: RoutingType): boolean {
  const contract = CONTRACTS[commandName];
  if (!contract) return false;
  return contract.routing === routing;
}

export function requiresNexus(commandName: string): boolean {
  const contract = CONTRACTS[commandName];
  return contract?.routing === ROUTING.NEXUS;
}

export function requiresAudit(commandName: string): boolean {
  const contract = CONTRACTS[commandName];
  return contract?.requiresAudit ?? false;
}

// ============================================================================
// CONTRACT INVARIANTS
// ============================================================================

/**
 * INV-CLI-05: Contract Enforced
 * Validates that a command adheres to its routing policy
 */
export function enforceContract(
  commandName: string,
  actualRouting: RoutingType
): { valid: boolean; error?: string } {
  const contract = CONTRACTS[commandName];
  
  if (!contract) {
    return { valid: false, error: `Unknown command: ${commandName}` };
  }
  
  if (contract.routing !== actualRouting) {
    return {
      valid: false,
      error: `Routing violation: ${commandName} requires ${contract.routing}, got ${actualRouting}`,
    };
  }
  
  return { valid: true };
}
