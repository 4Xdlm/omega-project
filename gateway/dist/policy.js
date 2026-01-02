// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA POLICY ENGINE
// Version: 1.0.0 — NASA/SpaceX-Grade
// Invariants: POL-01 à POL-05
// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
// REASON CODES
// ═══════════════════════════════════════════════════════════════════════════════
export const POLICY_REASON_CODES = {
    POL_ALLOW: 'Request allowed',
    POL_NO_VERSION: 'Missing policy_version',
    POL_POLICY_NOT_FOUND: 'Policy version not found',
    POL_CALLER_BLACKLISTED: 'Caller is blacklisted',
    POL_INTENT_FORBIDDEN: 'Intent not allowed',
    POL_MODE_RESTRICTED: 'Operation not allowed in this mode',
    POL_COMPLIANCE_FAIL: 'Compliance requirement not met',
    POL_DEFAULT_DENY: 'No matching rule - default deny',
};
// ═══════════════════════════════════════════════════════════════════════════════
// POLICY ENGINE
// ═══════════════════════════════════════════════════════════════════════════════
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
export class PolicyEngine {
    version;
    rules;
    constructor(version, rules = []) {
        this.version = version;
        // Sort by priority DESC (highest first)
        this.rules = [...rules].sort((a, b) => b.priority - a.priority);
    }
    /**
     * Évalue une requête contre les règles de policy
     *
     * ALGORITHM:
     * 1. Évaluer les règles par priorité DESC
     * 2. Première règle qui match = verdict final
     * 3. Si aucune ne match → DEFAULT DENY
     */
    check(req) {
        const timestamp = new Date().toISOString();
        // Parcourir les règles par priorité
        for (const rule of this.rules) {
            try {
                if (rule.when(req)) {
                    return {
                        verdict: rule.then.verdict,
                        reason_code: rule.then.reason_code,
                        message: POLICY_REASON_CODES[rule.then.reason_code] || rule.then.reason_code,
                        policy_version: this.version,
                        timestamp,
                        matched_rule: rule.id,
                        constraints: rule.then.constraints,
                    };
                }
            }
            catch {
                // Rule evaluation error - continue to next rule
                continue;
            }
        }
        // DEFAULT DENY (sécurité)
        return {
            verdict: 'DENY',
            reason_code: 'POL_DEFAULT_DENY',
            message: POLICY_REASON_CODES.POL_DEFAULT_DENY,
            policy_version: this.version,
            timestamp,
        };
    }
    /**
     * Retourne la version de la policy
     */
    getVersion() {
        return this.version;
    }
    /**
     * Retourne le nombre de règles
     */
    getRuleCount() {
        return this.rules.length;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// POLICY BUILDER
// ═══════════════════════════════════════════════════════════════════════════════
export class PolicyBuilder {
    version = '1.0.0';
    rules = [];
    nextPriority = 1000;
    setVersion(version) {
        this.version = version;
        return this;
    }
    /**
     * Ajoute une règle ALLOW
     */
    allow(id, description, predicate, constraints, priority) {
        this.rules.push({
            id,
            description,
            priority: priority ?? this.nextPriority--,
            when: predicate,
            then: {
                verdict: 'ALLOW',
                reason_code: 'POL_ALLOW',
                constraints,
            },
        });
        return this;
    }
    /**
     * Ajoute une règle ALLOW_WITH_CONSTRAINTS
     */
    allowWithConstraints(id, description, predicate, constraints, priority) {
        this.rules.push({
            id,
            description,
            priority: priority ?? this.nextPriority--,
            when: predicate,
            then: {
                verdict: 'ALLOW_WITH_CONSTRAINTS',
                reason_code: 'POL_ALLOW',
                constraints,
            },
        });
        return this;
    }
    /**
     * Ajoute une règle DENY
     */
    deny(id, description, predicate, reason_code = 'POL_DEFAULT_DENY', priority) {
        this.rules.push({
            id,
            description,
            priority: priority ?? this.nextPriority--,
            when: predicate,
            then: {
                verdict: 'DENY',
                reason_code,
            },
        });
        return this;
    }
    /**
     * Blacklist un caller
     */
    blacklistCaller(caller_id, priority = 9999) {
        return this.deny(`blacklist_${caller_id}`, `Blacklist caller ${caller_id}`, (req) => req.request.caller.id === caller_id, 'POL_CALLER_BLACKLISTED', priority);
    }
    /**
     * Interdit un intent
     */
    forbidIntent(intent, priority = 9998) {
        return this.deny(`forbid_${intent}`, `Forbid intent ${intent}`, (req) => req.request.intent === intent, 'POL_INTENT_FORBIDDEN', priority);
    }
    /**
     * Restreint un mode
     */
    restrictMode(mode, priority = 9997) {
        return this.deny(`restrict_${mode}`, `Restrict mode ${mode}`, (req) => req.environment.mode === mode, 'POL_MODE_RESTRICTED', priority);
    }
    /**
     * Autorise un caller type
     */
    allowCallerType(type, priority) {
        return this.allow(`allow_caller_${type}`, `Allow caller type ${type}`, (req) => req.request.caller.type === type, undefined, priority);
    }
    /**
     * Construit le PolicyEngine
     */
    build() {
        return new PolicyEngine(this.version, this.rules);
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY & PRESETS
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Crée une policy par défaut (ALLOW SYSTEM, deny others)
 */
export function createDefaultPolicy(version = '1.0.0') {
    return new PolicyBuilder()
        .setVersion(version)
        .allow('allow_system', 'Allow all SYSTEM callers', (req) => req.request.caller.type === 'SYSTEM', undefined, 1000)
        .allow('allow_user_prod', 'Allow USER callers in PROD', (req) => req.request.caller.type === 'USER' && req.environment.mode === 'PROD', { trace_required: true }, 900)
        .allow('allow_pipeline', 'Allow PIPELINE callers', (req) => req.request.caller.type === 'PIPELINE', undefined, 800)
        .build();
}
/**
 * Crée une policy ALLOW ALL (pour tests)
 */
export function createAllowAllPolicy(version = '1.0.0') {
    return new PolicyBuilder()
        .setVersion(version)
        .allow('allow_all', 'Allow everything', () => true, undefined, 10000)
        .build();
}
/**
 * Crée une policy DENY ALL (pour tests)
 */
export function createDenyAllPolicy(version = '1.0.0') {
    return new PolicyBuilder()
        .setVersion(version)
        .deny('deny_all', 'Deny everything', () => true, 'POL_DEFAULT_DENY', 10000)
        .build();
}
/**
 * Crée une policy stricte pour PROD
 */
export function createStrictPolicy(version = '1.0.0') {
    return new PolicyBuilder()
        .setVersion(version)
        // Blacklist patterns dangereux
        .deny('deny_dangerous_intent', 'Deny dangerous intents', (req) => req.request.intent.includes('__') || req.request.intent.includes('..'), 'POL_INTENT_FORBIDDEN', 10000)
        // SYSTEM toujours autorisé
        .allow('allow_system', 'Allow SYSTEM', (req) => req.request.caller.type === 'SYSTEM', undefined, 9000)
        // USER avec contraintes
        .allowWithConstraints('allow_user', 'Allow USER with constraints', (req) => req.request.caller.type === 'USER', {
        max_runtime_ms: 30000,
        max_payload_bytes: 1048576, // 1MB
        trace_required: true,
    }, 8000)
        // PIPELINE avec contraintes
        .allowWithConstraints('allow_pipeline', 'Allow PIPELINE with constraints', (req) => req.request.caller.type === 'PIPELINE', {
        max_runtime_ms: 60000,
        trace_required: true,
    }, 7000)
        .build();
}
//# sourceMappingURL=policy.js.map