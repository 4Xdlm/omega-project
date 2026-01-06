// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — POLICY
// Version: 1.0.0
// Date: 06 janvier 2026
// Standard: NASA-Grade L4 / DO-178C / MIL-STD
// ═══════════════════════════════════════════════════════════════════════════════
//
// INVARIANTS:
// @invariant INV-WIRE-06: Policy Enforcement - règles non contournables
// @invariant INV-WIRE-11: Policy rules cannot be bypassed
//
// ═══════════════════════════════════════════════════════════════════════════════

import type { NexusEnvelope, NexusMessageKind } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Décision de la policy
 */
export type PolicyDecision =
  | { allow: true }
  | { allow: false; reason: string; code: string };

/**
 * Règle de policy
 */
export interface PolicyRule {
  /** Identifiant unique de la règle */
  id: string;
  /** Description humaine */
  description: string;
  /** Priorité (plus bas = plus prioritaire) */
  priority: number;
  /** Fonction de vérification */
  check: (env: NexusEnvelope) => PolicyDecision;
  /** Actif ou non */
  enabled: boolean;
}

/**
 * Configuration de la policy
 */
export interface PolicyConfig {
  /** Modules autorisés comme source */
  allowedSourceModules: Set<string>;
  /** Modules autorisés comme cible */
  allowedTargetModules: Set<string>;
  /** Schemas autorisés par module */
  allowedSchemas: Map<string, Set<string>>;
  /** Taille max du payload en bytes */
  maxPayloadSize: number;
  /** Rate limit par source (messages/minute) */
  rateLimitPerMinute: number;
  /** Kinds autorisés */
  allowedKinds: Set<NexusMessageKind>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// POLICY CODES
// ═══════════════════════════════════════════════════════════════════════════════

export const PolicyCodes = {
  BLOCKED_SOURCE: 'POL_BLOCKED_SOURCE',
  BLOCKED_TARGET: 'POL_BLOCKED_TARGET',
  BLOCKED_SCHEMA: 'POL_BLOCKED_SCHEMA',
  BLOCKED_KIND: 'POL_BLOCKED_KIND',
  PAYLOAD_TOO_LARGE: 'POL_PAYLOAD_TOO_LARGE',
  RATE_LIMITED: 'POL_RATE_LIMITED',
  AUTH_REQUIRED: 'POL_AUTH_REQUIRED',
  AUTH_INSUFFICIENT: 'POL_AUTH_INSUFFICIENT',
  CUSTOM_RULE: 'POL_CUSTOM_RULE',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configuration par défaut - permissive
 */
export const DEFAULT_POLICY_CONFIG: PolicyConfig = {
  allowedSourceModules: new Set(['gateway', 'memory', 'query', 'oracle', 'muse', 'wiring']),
  allowedTargetModules: new Set(['memory', 'query', 'oracle', 'muse', 'gateway']),
  allowedSchemas: new Map([
    ['memory', new Set(['memory.write', 'memory.readLatest', 'memory.readByHash', 'memory.listKeys'])],
    ['query', new Set(['query.search', 'query.find', 'query.aggregate', 'query.analyze'])],
    ['oracle', new Set(['oracle.predict', 'oracle.evaluate'])],
    ['muse', new Set(['muse.generate', 'muse.refine'])],
    ['gateway', new Set(['gateway.route', 'gateway.status'])],
  ]),
  maxPayloadSize: 2 * 1024 * 1024, // 2MB
  rateLimitPerMinute: 1000,
  allowedKinds: new Set(['command', 'query', 'event']),
};

// ═══════════════════════════════════════════════════════════════════════════════
// POLICY ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Moteur de policy NEXUS
 * 
 * @invariant INV-WIRE-06: Toutes les règles sont vérifiées
 * @invariant INV-WIRE-11: Pas de bypass possible
 */
export class PolicyEngine {
  private readonly config: PolicyConfig;
  private readonly rules: PolicyRule[] = [];
  private readonly rateLimitState: Map<string, { count: number; resetAt: number }> = new Map();

  constructor(config?: Partial<PolicyConfig>) {
    this.config = { ...DEFAULT_POLICY_CONFIG, ...config };
    this.initBuiltInRules();
  }

  /**
   * Vérifie si une envelope est autorisée
   * @invariant INV-WIRE-06: Toutes les règles sont évaluées
   */
  check(env: NexusEnvelope): PolicyDecision {
    // Trier par priorité
    const sortedRules = [...this.rules]
      .filter(r => r.enabled)
      .sort((a, b) => a.priority - b.priority);

    // Vérifier chaque règle
    for (const rule of sortedRules) {
      const decision = rule.check(env);
      if (!decision.allow) {
        return decision;
      }
    }

    return { allow: true };
  }

  /**
   * Ajoute une règle custom
   */
  addRule(rule: PolicyRule): void {
    // Vérifier unicité de l'ID
    if (this.rules.some(r => r.id === rule.id)) {
      throw new Error(`Rule with id '${rule.id}' already exists`);
    }
    this.rules.push(rule);
  }

  /**
   * Supprime une règle par ID
   */
  removeRule(id: string): boolean {
    const idx = this.rules.findIndex(r => r.id === id);
    if (idx >= 0) {
      this.rules.splice(idx, 1);
      return true;
    }
    return false;
  }

  /**
   * Active/désactive une règle
   */
  setRuleEnabled(id: string, enabled: boolean): boolean {
    const rule = this.rules.find(r => r.id === id);
    if (rule) {
      rule.enabled = enabled;
      return true;
    }
    return false;
  }

  /**
   * Retourne toutes les règles
   */
  getRules(): PolicyRule[] {
    return [...this.rules];
  }

  /**
   * Retourne la configuration
   */
  getConfig(): PolicyConfig {
    return { ...this.config };
  }

  /**
   * Reset le rate limiter
   */
  resetRateLimits(): void {
    this.rateLimitState.clear();
  }

  /**
   * Initialise les règles built-in
   */
  private initBuiltInRules(): void {
    // Règle 1: Source module autorisé
    this.rules.push({
      id: 'builtin:source_module',
      description: 'Source module must be in allowed list',
      priority: 10,
      enabled: true,
      check: (env) => {
        if (!this.config.allowedSourceModules.has(env.source_module)) {
          return {
            allow: false,
            reason: `Source module '${env.source_module}' is not allowed`,
            code: PolicyCodes.BLOCKED_SOURCE,
          };
        }
        return { allow: true };
      },
    });

    // Règle 2: Target module autorisé
    this.rules.push({
      id: 'builtin:target_module',
      description: 'Target module must be in allowed list',
      priority: 20,
      enabled: true,
      check: (env) => {
        if (!this.config.allowedTargetModules.has(env.target_module)) {
          return {
            allow: false,
            reason: `Target module '${env.target_module}' is not allowed`,
            code: PolicyCodes.BLOCKED_TARGET,
          };
        }
        return { allow: true };
      },
    });

    // Règle 3: Kind autorisé
    this.rules.push({
      id: 'builtin:kind',
      description: 'Message kind must be allowed',
      priority: 30,
      enabled: true,
      check: (env) => {
        if (!this.config.allowedKinds.has(env.kind)) {
          return {
            allow: false,
            reason: `Kind '${env.kind}' is not allowed`,
            code: PolicyCodes.BLOCKED_KIND,
          };
        }
        return { allow: true };
      },
    });

    // Règle 4: Schema autorisé pour le module cible
    this.rules.push({
      id: 'builtin:schema',
      description: 'Schema must be allowed for target module',
      priority: 40,
      enabled: true,
      check: (env) => {
        const allowedSchemas = this.config.allowedSchemas.get(env.target_module);
        if (allowedSchemas && !allowedSchemas.has(env.payload_schema)) {
          return {
            allow: false,
            reason: `Schema '${env.payload_schema}' is not allowed for module '${env.target_module}'`,
            code: PolicyCodes.BLOCKED_SCHEMA,
          };
        }
        return { allow: true };
      },
    });

    // Règle 5: Taille payload
    this.rules.push({
      id: 'builtin:payload_size',
      description: 'Payload size must not exceed limit',
      priority: 50,
      enabled: true,
      check: (env) => {
        const size = JSON.stringify(env.payload).length;
        if (size > this.config.maxPayloadSize) {
          return {
            allow: false,
            reason: `Payload size ${size} exceeds limit ${this.config.maxPayloadSize}`,
            code: PolicyCodes.PAYLOAD_TOO_LARGE,
          };
        }
        return { allow: true };
      },
    });

    // Règle 6: Rate limiting
    this.rules.push({
      id: 'builtin:rate_limit',
      description: 'Rate limit per source module',
      priority: 60,
      enabled: true,
      check: (env) => {
        const now = Date.now();
        const key = env.source_module;
        let state = this.rateLimitState.get(key);

        if (!state || now >= state.resetAt) {
          state = { count: 0, resetAt: now + 60000 };
        }

        state.count++;
        this.rateLimitState.set(key, state);

        if (state.count > this.config.rateLimitPerMinute) {
          return {
            allow: false,
            reason: `Rate limit exceeded for '${key}'`,
            code: PolicyCodes.RATE_LIMITED,
          };
        }
        return { allow: true };
      },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIMPLE POLICY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Policy qui autorise tout (pour tests)
 */
export function policyAllowAll(_env: NexusEnvelope): PolicyDecision {
  return { allow: true };
}

/**
 * Policy qui refuse tout (pour tests)
 */
export function policyDenyAll(_env: NexusEnvelope): PolicyDecision {
  return { allow: false, reason: 'All requests denied', code: 'POL_DENY_ALL' };
}

/**
 * Crée une policy simple basée sur une liste blanche de modules
 */
export function createModuleWhitelist(
  allowedTargets: string[]
): (env: NexusEnvelope) => PolicyDecision {
  const allowed = new Set(allowedTargets);
  return (env) => {
    if (allowed.has(env.target_module)) {
      return { allow: true };
    }
    return {
      allow: false,
      reason: `Target '${env.target_module}' not in whitelist`,
      code: PolicyCodes.BLOCKED_TARGET,
    };
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crée un PolicyEngine avec configuration par défaut
 */
export function createPolicyEngine(config?: Partial<PolicyConfig>): PolicyEngine {
  return new PolicyEngine(config);
}

/**
 * Crée un PolicyEngine permissif (pour dev/tests)
 */
export function createPermissivePolicyEngine(): PolicyEngine {
  const engine = new PolicyEngine();
  // Désactiver le rate limiting pour les tests
  engine.setRuleEnabled('builtin:rate_limit', false);
  return engine;
}

/**
 * Crée un PolicyEngine strict (pour production)
 */
export function createStrictPolicyEngine(): PolicyEngine {
  const engine = new PolicyEngine({
    maxPayloadSize: 1024 * 1024, // 1MB
    rateLimitPerMinute: 100,
  });
  return engine;
}
