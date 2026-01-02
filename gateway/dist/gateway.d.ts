import { GatewayResponse, PolicyDecision, PolicyCheckRequest, PipelineSpec } from './types';
export declare const GATEWAY_REASON_CODES: {
    readonly GW_REQ_NULL: "Request is null";
    readonly GW_NO_REQUEST_ID: "Missing request_id";
    readonly GW_BAD_TIMESTAMP: "Invalid or missing timestamp";
    readonly GW_BAD_CALLER: "Invalid caller (missing id or invalid type)";
    readonly GW_NO_INTENT: "Missing or empty intent";
    readonly GW_NO_PAYLOAD: "Missing payload";
    readonly GW_PAYLOAD_TOO_LARGE: "Payload exceeds maximum size";
    readonly GW_SCHEMA_INVALID: "Payload does not match input schema";
    readonly GW_POLICY_DENY: "Request denied by policy";
    readonly GW_INTENT_UNKNOWN: "Unknown intent - no pipeline found";
    readonly GW_CALLER_NOT_ALLOWED: "Caller type not allowed for this pipeline";
    readonly GW_TRACE_REQUIRED: "Trace required but not enabled";
    readonly GW_RATE_LIMITED: "Rate limit exceeded";
};
export type GatewayReasonCode = keyof typeof GATEWAY_REASON_CODES;
export interface AuditAppender {
    append(event: AuditEvent): void;
}
export interface AuditEvent {
    event_type: string;
    timestamp: string;
    request_id?: string;
    execution_token?: string;
    payload: Record<string, unknown>;
}
export interface PolicyEngine {
    check(req: PolicyCheckRequest): PolicyDecision;
}
export interface PipelineRegistry {
    resolve(intent: string): PipelineSpec | null;
    get(pipeline_id: string): PipelineSpec | null;
}
export interface SchemaValidator {
    validate(schema_id: string, payload: unknown): {
        ok: boolean;
        errors?: string[];
    };
}
export interface GatewayConfig {
    build_id: string;
    policy_version: string;
    max_payload_bytes?: number;
    rate_limit_rps?: number;
}
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
export declare class UniversalGateway {
    private readonly config;
    private readonly audit;
    private readonly policy;
    private readonly registry;
    private readonly schemaValidator;
    constructor(config: GatewayConfig, audit: AuditAppender, policy: PolicyEngine, registry: PipelineRegistry, schemaValidator: SchemaValidator);
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
    handle(request: unknown): GatewayResponse;
    private reject;
    private extractRequestId;
    private measurePayloadSize;
    private mergeConstraintsStrict;
    private auditAppend;
}
export declare function createUniversalGateway(config: GatewayConfig, audit: AuditAppender, policy: PolicyEngine, registry: PipelineRegistry, schemaValidator: SchemaValidator): UniversalGateway;
/** Audit in-memory pour tests */
export declare class InMemoryAudit implements AuditAppender {
    readonly events: AuditEvent[];
    append(event: AuditEvent): void;
    clear(): void;
    findByType(type: string): AuditEvent[];
}
/** Policy ALLOW ALL pour tests */
export declare class AllowAllPolicy implements PolicyEngine {
    private readonly version;
    constructor(version?: string);
    check(req: PolicyCheckRequest): PolicyDecision;
}
/** Policy DENY ALL pour tests */
export declare class DenyAllPolicy implements PolicyEngine {
    private readonly version;
    constructor(version?: string);
    check(req: PolicyCheckRequest): PolicyDecision;
}
/** Schema validator PASS ALL pour tests */
export declare class PassAllSchemaValidator implements SchemaValidator {
    validate(schema_id: string, payload: unknown): {
        ok: boolean;
        errors?: string[];
    };
}
/** Schema validator FAIL ALL pour tests */
export declare class FailAllSchemaValidator implements SchemaValidator {
    validate(schema_id: string, payload: unknown): {
        ok: boolean;
        errors?: string[];
    };
}
//# sourceMappingURL=gateway.d.ts.map