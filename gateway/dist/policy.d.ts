import { PolicyDecision, PolicyCheckRequest, PolicyConstraints, PolicyVerdict, CallerType, ExecutionMode } from './types';
export declare const POLICY_REASON_CODES: {
    readonly POL_ALLOW: "Request allowed";
    readonly POL_NO_VERSION: "Missing policy_version";
    readonly POL_POLICY_NOT_FOUND: "Policy version not found";
    readonly POL_CALLER_BLACKLISTED: "Caller is blacklisted";
    readonly POL_INTENT_FORBIDDEN: "Intent not allowed";
    readonly POL_MODE_RESTRICTED: "Operation not allowed in this mode";
    readonly POL_COMPLIANCE_FAIL: "Compliance requirement not met";
    readonly POL_DEFAULT_DENY: "No matching rule - default deny";
};
export type PolicyReasonCode = keyof typeof POLICY_REASON_CODES;
export interface PolicyRule {
    id: string;
    description: string;
    priority: number;
    when: (req: PolicyCheckRequest) => boolean;
    then: {
        verdict: PolicyVerdict;
        reason_code: PolicyReasonCode;
        constraints?: PolicyConstraints;
    };
}
/**
 * Policy Engine OMEGA
 *
 * Invariants garantis:
 * - POL-01: Décision déterministe (même input → même verdict)
 * - POL-02: Policy versionnée (policy_version obligatoire)
 * - POL-03: Justification stable (reason_code non ambigu)
 * - POL-04: Pas de dépendance sur résultat d'exécution
 * - POL-05: Pas d'effets de bord
 */
export declare class PolicyEngine {
    private readonly version;
    private readonly rules;
    constructor(version: string, rules?: PolicyRule[]);
    /**
     * Évalue une requête contre les règles de policy
     *
     * ALGORITHM:
     * 1. Évaluer les règles par priorité DESC
     * 2. Première règle qui match = verdict final
     * 3. Si aucune ne match → DEFAULT DENY
     */
    check(req: PolicyCheckRequest): PolicyDecision;
    /**
     * Retourne la version de la policy
     */
    getVersion(): string;
    /**
     * Retourne le nombre de règles
     */
    getRuleCount(): number;
}
export declare class PolicyBuilder {
    private version;
    private rules;
    private nextPriority;
    setVersion(version: string): PolicyBuilder;
    /**
     * Ajoute une règle ALLOW
     */
    allow(id: string, description: string, predicate: (req: PolicyCheckRequest) => boolean, constraints?: PolicyConstraints, priority?: number): PolicyBuilder;
    /**
     * Ajoute une règle ALLOW_WITH_CONSTRAINTS
     */
    allowWithConstraints(id: string, description: string, predicate: (req: PolicyCheckRequest) => boolean, constraints: PolicyConstraints, priority?: number): PolicyBuilder;
    /**
     * Ajoute une règle DENY
     */
    deny(id: string, description: string, predicate: (req: PolicyCheckRequest) => boolean, reason_code?: PolicyReasonCode, priority?: number): PolicyBuilder;
    /**
     * Blacklist un caller
     */
    blacklistCaller(caller_id: string, priority?: number): PolicyBuilder;
    /**
     * Interdit un intent
     */
    forbidIntent(intent: string, priority?: number): PolicyBuilder;
    /**
     * Restreint un mode
     */
    restrictMode(mode: ExecutionMode, priority?: number): PolicyBuilder;
    /**
     * Autorise un caller type
     */
    allowCallerType(type: CallerType, priority?: number): PolicyBuilder;
    /**
     * Construit le PolicyEngine
     */
    build(): PolicyEngine;
}
/**
 * Crée une policy par défaut (ALLOW SYSTEM, deny others)
 */
export declare function createDefaultPolicy(version?: string): PolicyEngine;
/**
 * Crée une policy ALLOW ALL (pour tests)
 */
export declare function createAllowAllPolicy(version?: string): PolicyEngine;
/**
 * Crée une policy DENY ALL (pour tests)
 */
export declare function createDenyAllPolicy(version?: string): PolicyEngine;
/**
 * Crée une policy stricte pour PROD
 */
export declare function createStrictPolicy(version?: string): PolicyEngine;
//# sourceMappingURL=policy.d.ts.map