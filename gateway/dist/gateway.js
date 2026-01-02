// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA GATEWAY UNIVERSEL
// Version: 1.0.0 — NASA/SpaceX-Grade
// Intégration: NEXUS DEP v1.0.0-FROZEN
// Invariants: GW-01 à GW-06
// ═══════════════════════════════════════════════════════════════════════════════
import { randomUUID } from 'crypto';
import { CONSTANTS, GatewayRequestSchema, } from './types';
// ═══════════════════════════════════════════════════════════════════════════════
// REASON CODES (centralisés)
// ═══════════════════════════════════════════════════════════════════════════════
export const GATEWAY_REASON_CODES = {
    GW_REQ_NULL: 'Request is null',
    GW_NO_REQUEST_ID: 'Missing request_id',
    GW_BAD_TIMESTAMP: 'Invalid or missing timestamp',
    GW_BAD_CALLER: 'Invalid caller (missing id or invalid type)',
    GW_NO_INTENT: 'Missing or empty intent',
    GW_NO_PAYLOAD: 'Missing payload',
    GW_PAYLOAD_TOO_LARGE: 'Payload exceeds maximum size',
    GW_SCHEMA_INVALID: 'Payload does not match input schema',
    GW_POLICY_DENY: 'Request denied by policy',
    GW_INTENT_UNKNOWN: 'Unknown intent - no pipeline found',
    GW_CALLER_NOT_ALLOWED: 'Caller type not allowed for this pipeline',
    GW_TRACE_REQUIRED: 'Trace required but not enabled',
    GW_RATE_LIMITED: 'Rate limit exceeded',
};
// ═══════════════════════════════════════════════════════════════════════════════
// GATEWAY UNIVERSEL
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Gateway Universel OMEGA
 *
 * Invariants garantis:
 * - GW-01: Point d'entrée unique
 * - GW-02: Bypass impossible
 * - GW-03: Validation avant routage
 * - GW-04: Décision déterministe
 * - GW-05: Refus explicite
 * - GW-06: Aucun effet de bord (sauf audit)
 */
export class UniversalGateway {
    config;
    audit;
    policy;
    registry;
    schemaValidator;
    constructor(config, audit, policy, registry, schemaValidator) {
        this.config = {
            build_id: config.build_id,
            policy_version: config.policy_version,
            max_payload_bytes: config.max_payload_bytes ?? CONSTANTS.MAX_PAYLOAD_BYTES,
            rate_limit_rps: config.rate_limit_rps ?? CONSTANTS.DEFAULT_RATE_LIMIT_RPS,
        };
        this.audit = audit;
        this.policy = policy;
        this.registry = registry;
        this.schemaValidator = schemaValidator;
    }
    /**
     * Point d'entrée unique du système OMEGA
     *
     * FLOW SÉQUENTIEL STRICT:
     * [0] Pre-audit (réception)
     * [1] Validation structurelle
     * [2] Policy check
     * [3] Résolution pipeline
     * [4] Consistency checks
     * [5] Émission token
     * [6] Response
     */
    handle(request) {
        const now = new Date().toISOString();
        // ─────────────────────────────────────────
        // [0] PRE-AUDIT — réception brute
        // ─────────────────────────────────────────
        const request_id = this.extractRequestId(request);
        this.auditAppend('GATEWAY_RECEIVED', {
            request_id,
            raw_type: typeof request,
            timestamp: now,
        });
        // ─────────────────────────────────────────
        // [1] VALIDATION STRUCTURELLE (GW-03)
        // ─────────────────────────────────────────
        // 1.1 Request null
        if (request === null || request === undefined) {
            return this.reject('GW_REQ_NULL', request_id, now);
        }
        // 1.2 Validation Zod
        const parseResult = GatewayRequestSchema.safeParse(request);
        if (!parseResult.success) {
            const firstError = parseResult.error.errors[0];
            const path = firstError?.path?.join('.') || 'unknown';
            // Map des erreurs spécifiques
            if (path.includes('request_id')) {
                return this.reject('GW_NO_REQUEST_ID', request_id, now);
            }
            if (path.includes('timestamp')) {
                return this.reject('GW_BAD_TIMESTAMP', request_id, now);
            }
            if (path.includes('caller')) {
                return this.reject('GW_BAD_CALLER', request_id, now);
            }
            if (path.includes('intent')) {
                return this.reject('GW_NO_INTENT', request_id, now);
            }
            if (path === 'payload') {
                return this.reject('GW_NO_PAYLOAD', request_id, now);
            }
            // Erreur générique
            return this.reject('GW_SCHEMA_INVALID', request_id, now, {
                validation_error: firstError?.message,
                path,
            });
        }
        const validRequest = parseResult.data;
        // 1.3 Taille payload
        const payloadSize = this.measurePayloadSize(validRequest.payload);
        if (payloadSize > this.config.max_payload_bytes) {
            return this.reject('GW_PAYLOAD_TOO_LARGE', validRequest.request_id, now, {
                size: payloadSize,
                max: this.config.max_payload_bytes,
            });
        }
        // ─────────────────────────────────────────
        // [2] POLICY CHECK (POL-xx)
        // ─────────────────────────────────────────
        const policyReq = {
            request: validRequest,
            environment: {
                build: this.config.build_id,
                mode: validRequest.context.mode,
            },
            policy_version: this.config.policy_version,
        };
        const decision = this.policy.check(policyReq);
        this.auditAppend('POLICY_DECISION', {
            request_id: validRequest.request_id,
            verdict: decision.verdict,
            reason_code: decision.reason_code,
            policy_version: decision.policy_version,
        });
        if (decision.verdict === 'DENY') {
            return this.reject(`GW_POLICY_DENY`, validRequest.request_id, now, { policy_code: decision.reason_code, message: decision.message });
        }
        const policyConstraints = decision.constraints || {};
        // ─────────────────────────────────────────
        // [3] RESOLVE PIPELINE SPEC (REG-xx)
        // ─────────────────────────────────────────
        const spec = this.registry.resolve(validRequest.intent);
        if (!spec) {
            this.auditAppend('REGISTRY_NOT_FOUND', {
                request_id: validRequest.request_id,
                intent: validRequest.intent,
            });
            return this.reject('GW_INTENT_UNKNOWN', validRequest.request_id, now, {
                intent: validRequest.intent,
            });
        }
        this.auditAppend('PIPELINE_RESOLVED', {
            request_id: validRequest.request_id,
            pipeline_id: spec.pipeline_id,
            version: spec.version,
        });
        // ─────────────────────────────────────────
        // [4] CONSISTENCY CHECKS (GW-xx)
        // ─────────────────────────────────────────
        // 4.1 Caller authorization
        if (!spec.allowed_callers.includes(validRequest.caller.type)) {
            return this.reject('GW_CALLER_NOT_ALLOWED', validRequest.request_id, now, {
                caller_type: validRequest.caller.type,
                allowed: spec.allowed_callers,
            });
        }
        // 4.2 Merge constraints (most strict)
        const finalConstraints = this.mergeConstraintsStrict(spec.constraints, policyConstraints);
        // 4.3 Trace required
        if (finalConstraints.trace_required && !validRequest.context.trace) {
            return this.reject('GW_TRACE_REQUIRED', validRequest.request_id, now);
        }
        // 4.4 Schema validation
        const schemaResult = this.schemaValidator.validate(spec.input_schema_id, validRequest.payload);
        if (!schemaResult.ok) {
            return this.reject('GW_SCHEMA_INVALID', validRequest.request_id, now, {
                schema_id: spec.input_schema_id,
                errors: schemaResult.errors,
            });
        }
        // ─────────────────────────────────────────
        // [5] ISSUE EXECUTION TOKEN (GW-xx)
        // ─────────────────────────────────────────
        const execution_token = randomUUID();
        this.auditAppend('EXECUTION_TOKEN_ISSUED', {
            request_id: validRequest.request_id,
            execution_token,
            pipeline_id: spec.pipeline_id,
        });
        // ─────────────────────────────────────────
        // [6] RESPONSE ACCEPTED (GW-01..GW-06)
        // ─────────────────────────────────────────
        const response = {
            status: 'ACCEPTED',
            pipeline_id: spec.pipeline_id,
            execution_token,
            timestamp: now,
            constraints: finalConstraints,
        };
        this.auditAppend('GATEWAY_ACCEPTED', {
            request_id: validRequest.request_id,
            execution_token,
            pipeline_id: spec.pipeline_id,
        });
        return response;
    }
    // ═══════════════════════════════════════════════════════════════════════════════
    // PRIVATE METHODS
    // ═══════════════════════════════════════════════════════════════════════════════
    reject(code, request_id, timestamp, details) {
        const message = GATEWAY_REASON_CODES[code] || code;
        this.auditAppend('GATEWAY_REJECTED', {
            request_id,
            reason_code: code,
            message,
            details,
        });
        return {
            status: 'REJECTED',
            reason_code: code,
            message,
            timestamp,
            details,
        };
    }
    extractRequestId(request) {
        if (typeof request === 'object' && request !== null && 'request_id' in request) {
            const rid = request.request_id;
            if (typeof rid === 'string')
                return rid;
        }
        return undefined;
    }
    measurePayloadSize(payload) {
        try {
            return Buffer.byteLength(JSON.stringify(payload), 'utf-8');
        }
        catch {
            return Infinity; // Force rejection
        }
    }
    mergeConstraintsStrict(specConstraints, policyConstraints) {
        return {
            max_runtime_ms: Math.min(specConstraints.max_runtime_ms, policyConstraints.max_runtime_ms ?? Infinity),
            max_payload_bytes: Math.min(specConstraints.max_payload_bytes, policyConstraints.max_payload_bytes ?? Infinity),
            trace_required: specConstraints.trace_required || policyConstraints.trace_required || false,
            deterministic_required: specConstraints.deterministic_required || policyConstraints.deterministic_required || false,
        };
    }
    auditAppend(event_type, payload) {
        this.audit.append({
            event_type,
            timestamp: new Date().toISOString(),
            request_id: payload.request_id,
            execution_token: payload.execution_token,
            payload,
        });
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════
export function createUniversalGateway(config, audit, policy, registry, schemaValidator) {
    return new UniversalGateway(config, audit, policy, registry, schemaValidator);
}
// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT IMPLEMENTATIONS (pour tests)
// ═══════════════════════════════════════════════════════════════════════════════
/** Audit in-memory pour tests */
export class InMemoryAudit {
    events = [];
    append(event) {
        this.events.push(event);
    }
    clear() {
        this.events.length = 0;
    }
    findByType(type) {
        return this.events.filter(e => e.event_type === type);
    }
}
/** Policy ALLOW ALL pour tests */
export class AllowAllPolicy {
    version;
    constructor(version = '1.0.0') {
        this.version = version;
    }
    check(req) {
        return {
            verdict: 'ALLOW',
            reason_code: 'ALLOW',
            message: 'Allowed by test policy',
            policy_version: this.version,
            timestamp: new Date().toISOString(),
        };
    }
}
/** Policy DENY ALL pour tests */
export class DenyAllPolicy {
    version;
    constructor(version = '1.0.0') {
        this.version = version;
    }
    check(req) {
        return {
            verdict: 'DENY',
            reason_code: 'POL_DENY_ALL',
            message: 'Denied by test policy',
            policy_version: this.version,
            timestamp: new Date().toISOString(),
        };
    }
}
/** Schema validator PASS ALL pour tests */
export class PassAllSchemaValidator {
    validate(schema_id, payload) {
        return { ok: true };
    }
}
/** Schema validator FAIL ALL pour tests */
export class FailAllSchemaValidator {
    validate(schema_id, payload) {
        return { ok: false, errors: ['Schema validation always fails in test mode'] };
    }
}
//# sourceMappingURL=gateway.js.map