import { z } from 'zod';
export declare const CONSTANTS: {
    readonly MAX_PAYLOAD_BYTES: 2097152;
    readonly MAX_ARTIFACT_BYTES: 5242880;
    readonly DEFAULT_TIMEOUT_MS: 15000;
    readonly MAX_TIMEOUT_MS: 300000;
    readonly RETRY_MIN_BUDGET_MS: 1000;
    readonly MAX_MODULE_CHAIN_LENGTH: 50;
    readonly DETERMINISTIC_SEED: 42;
    readonly GENESIS_PREV_HASH: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    readonly INTERFACE_VERSION: "OMEGA_MODULE_v1.0";
    readonly SCHEMA_DRAFT: "https://json-schema.org/draft/2020-12/schema";
    readonly CONTRACT_VERSION: "1.0.0";
    readonly DEFAULT_RATE_LIMIT_RPS: 100;
};
export declare const UUIDSchema: z.ZodString;
export declare const ISO8601Schema: z.ZodString;
export declare const SHA256Schema: z.ZodString;
export declare const SemVerSchema: z.ZodString;
export declare const CallerType: z.ZodEnum<["SYSTEM", "USER", "PIPELINE"]>;
export type CallerType = z.infer<typeof CallerType>;
export declare const ExecutionMode: z.ZodEnum<["PROD", "TEST", "DRY_RUN"]>;
export type ExecutionMode = z.infer<typeof ExecutionMode>;
export declare const ResponseStatus: z.ZodEnum<["ACCEPTED", "REJECTED"]>;
export type ResponseStatus = z.infer<typeof ResponseStatus>;
export declare const PolicyVerdict: z.ZodEnum<["ALLOW", "DENY", "ALLOW_WITH_CONSTRAINTS"]>;
export type PolicyVerdict = z.infer<typeof PolicyVerdict>;
export declare const ExecutionState: z.ZodEnum<["PENDING", "INITIALIZING", "RUNNING", "COMPLETED", "FAILED", "TIMED_OUT", "CANCELLED"]>;
export type ExecutionState = z.infer<typeof ExecutionState>;
export declare const TERMINAL_STATES: ExecutionState[];
export declare const ModuleErrorCategory: z.ZodEnum<["VALIDATION", "EXECUTION", "TIMEOUT", "DEPENDENCY", "INTERNAL"]>;
export type ModuleErrorCategory = z.infer<typeof ModuleErrorCategory>;
export declare const ArtifactKind: z.ZodEnum<["FINAL_OUTPUT", "STEP_OUTPUT", "REPORT", "SNAPSHOT_PAYLOAD", "DEBUG_TRACE"]>;
export type ArtifactKind = z.infer<typeof ArtifactKind>;
export declare const Severity: z.ZodEnum<["CRITICAL", "HIGH", "MEDIUM", "LOW"]>;
export type Severity = z.infer<typeof Severity>;
export declare const Criticality: z.ZodEnum<["LOW", "MEDIUM", "HIGH", "CRITICAL"]>;
export type Criticality = z.infer<typeof Criticality>;
export declare const CallerSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["SYSTEM", "USER", "PIPELINE"]>;
}, "strip", z.ZodTypeAny, {
    type: "SYSTEM" | "USER" | "PIPELINE";
    id: string;
}, {
    type: "SYSTEM" | "USER" | "PIPELINE";
    id: string;
}>;
export type Caller = z.infer<typeof CallerSchema>;
export declare const RequestContextSchema: z.ZodObject<{
    mode: z.ZodDefault<z.ZodEnum<["PROD", "TEST", "DRY_RUN"]>>;
    trace: z.ZodDefault<z.ZodBoolean>;
    timeout_ms: z.ZodOptional<z.ZodNumber>;
    correlation_id: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    mode: "PROD" | "TEST" | "DRY_RUN";
    trace: boolean;
    timeout_ms?: number | undefined;
    correlation_id?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    mode?: "PROD" | "TEST" | "DRY_RUN" | undefined;
    trace?: boolean | undefined;
    timeout_ms?: number | undefined;
    correlation_id?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type RequestContext = z.infer<typeof RequestContextSchema>;
export declare const GatewayRequestSchema: z.ZodObject<{
    request_id: z.ZodString;
    timestamp: z.ZodString;
    caller: z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["SYSTEM", "USER", "PIPELINE"]>;
    }, "strip", z.ZodTypeAny, {
        type: "SYSTEM" | "USER" | "PIPELINE";
        id: string;
    }, {
        type: "SYSTEM" | "USER" | "PIPELINE";
        id: string;
    }>;
    intent: z.ZodString;
    payload: z.ZodUnknown;
    context: z.ZodObject<{
        mode: z.ZodDefault<z.ZodEnum<["PROD", "TEST", "DRY_RUN"]>>;
        trace: z.ZodDefault<z.ZodBoolean>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        correlation_id: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        mode: "PROD" | "TEST" | "DRY_RUN";
        trace: boolean;
        timeout_ms?: number | undefined;
        correlation_id?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
    }, {
        mode?: "PROD" | "TEST" | "DRY_RUN" | undefined;
        trace?: boolean | undefined;
        timeout_ms?: number | undefined;
        correlation_id?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    request_id: string;
    timestamp: string;
    caller: {
        type: "SYSTEM" | "USER" | "PIPELINE";
        id: string;
    };
    intent: string;
    context: {
        mode: "PROD" | "TEST" | "DRY_RUN";
        trace: boolean;
        timeout_ms?: number | undefined;
        correlation_id?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
    };
    payload?: unknown;
}, {
    request_id: string;
    timestamp: string;
    caller: {
        type: "SYSTEM" | "USER" | "PIPELINE";
        id: string;
    };
    intent: string;
    context: {
        mode?: "PROD" | "TEST" | "DRY_RUN" | undefined;
        trace?: boolean | undefined;
        timeout_ms?: number | undefined;
        correlation_id?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
    };
    payload?: unknown;
}>;
export type GatewayRequest = z.infer<typeof GatewayRequestSchema>;
export declare const ExecutionConstraintsSchema: z.ZodObject<{
    max_runtime_ms: z.ZodOptional<z.ZodNumber>;
    max_payload_bytes: z.ZodOptional<z.ZodNumber>;
    trace_required: z.ZodOptional<z.ZodBoolean>;
    deterministic_required: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    max_runtime_ms?: number | undefined;
    max_payload_bytes?: number | undefined;
    trace_required?: boolean | undefined;
    deterministic_required?: boolean | undefined;
}, {
    max_runtime_ms?: number | undefined;
    max_payload_bytes?: number | undefined;
    trace_required?: boolean | undefined;
    deterministic_required?: boolean | undefined;
}>;
export type ExecutionConstraints = z.infer<typeof ExecutionConstraintsSchema>;
export declare const GatewayAcceptedSchema: z.ZodObject<{
    status: z.ZodLiteral<"ACCEPTED">;
    pipeline_id: z.ZodString;
    execution_token: z.ZodString;
    timestamp: z.ZodString;
    constraints: z.ZodOptional<z.ZodObject<{
        max_runtime_ms: z.ZodOptional<z.ZodNumber>;
        max_payload_bytes: z.ZodOptional<z.ZodNumber>;
        trace_required: z.ZodOptional<z.ZodBoolean>;
        deterministic_required: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        max_runtime_ms?: number | undefined;
        max_payload_bytes?: number | undefined;
        trace_required?: boolean | undefined;
        deterministic_required?: boolean | undefined;
    }, {
        max_runtime_ms?: number | undefined;
        max_payload_bytes?: number | undefined;
        trace_required?: boolean | undefined;
        deterministic_required?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    status: "ACCEPTED";
    timestamp: string;
    pipeline_id: string;
    execution_token: string;
    constraints?: {
        max_runtime_ms?: number | undefined;
        max_payload_bytes?: number | undefined;
        trace_required?: boolean | undefined;
        deterministic_required?: boolean | undefined;
    } | undefined;
}, {
    status: "ACCEPTED";
    timestamp: string;
    pipeline_id: string;
    execution_token: string;
    constraints?: {
        max_runtime_ms?: number | undefined;
        max_payload_bytes?: number | undefined;
        trace_required?: boolean | undefined;
        deterministic_required?: boolean | undefined;
    } | undefined;
}>;
export type GatewayAccepted = z.infer<typeof GatewayAcceptedSchema>;
export declare const GatewayRejectedSchema: z.ZodObject<{
    status: z.ZodLiteral<"REJECTED">;
    reason_code: z.ZodString;
    message: z.ZodString;
    timestamp: z.ZodString;
    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    message: string;
    status: "REJECTED";
    timestamp: string;
    reason_code: string;
    details?: Record<string, unknown> | undefined;
}, {
    message: string;
    status: "REJECTED";
    timestamp: string;
    reason_code: string;
    details?: Record<string, unknown> | undefined;
}>;
export type GatewayRejected = z.infer<typeof GatewayRejectedSchema>;
export declare const GatewayResponseSchema: z.ZodDiscriminatedUnion<"status", [z.ZodObject<{
    status: z.ZodLiteral<"ACCEPTED">;
    pipeline_id: z.ZodString;
    execution_token: z.ZodString;
    timestamp: z.ZodString;
    constraints: z.ZodOptional<z.ZodObject<{
        max_runtime_ms: z.ZodOptional<z.ZodNumber>;
        max_payload_bytes: z.ZodOptional<z.ZodNumber>;
        trace_required: z.ZodOptional<z.ZodBoolean>;
        deterministic_required: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        max_runtime_ms?: number | undefined;
        max_payload_bytes?: number | undefined;
        trace_required?: boolean | undefined;
        deterministic_required?: boolean | undefined;
    }, {
        max_runtime_ms?: number | undefined;
        max_payload_bytes?: number | undefined;
        trace_required?: boolean | undefined;
        deterministic_required?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    status: "ACCEPTED";
    timestamp: string;
    pipeline_id: string;
    execution_token: string;
    constraints?: {
        max_runtime_ms?: number | undefined;
        max_payload_bytes?: number | undefined;
        trace_required?: boolean | undefined;
        deterministic_required?: boolean | undefined;
    } | undefined;
}, {
    status: "ACCEPTED";
    timestamp: string;
    pipeline_id: string;
    execution_token: string;
    constraints?: {
        max_runtime_ms?: number | undefined;
        max_payload_bytes?: number | undefined;
        trace_required?: boolean | undefined;
        deterministic_required?: boolean | undefined;
    } | undefined;
}>, z.ZodObject<{
    status: z.ZodLiteral<"REJECTED">;
    reason_code: z.ZodString;
    message: z.ZodString;
    timestamp: z.ZodString;
    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    message: string;
    status: "REJECTED";
    timestamp: string;
    reason_code: string;
    details?: Record<string, unknown> | undefined;
}, {
    message: string;
    status: "REJECTED";
    timestamp: string;
    reason_code: string;
    details?: Record<string, unknown> | undefined;
}>]>;
export type GatewayResponse = z.infer<typeof GatewayResponseSchema>;
export declare const PolicyConstraintsSchema: z.ZodObject<{
    max_runtime_ms: z.ZodOptional<z.ZodNumber>;
    max_payload_bytes: z.ZodOptional<z.ZodNumber>;
    allowed_pipelines: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    trace_required: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    max_runtime_ms?: number | undefined;
    max_payload_bytes?: number | undefined;
    trace_required?: boolean | undefined;
    allowed_pipelines?: string[] | undefined;
}, {
    max_runtime_ms?: number | undefined;
    max_payload_bytes?: number | undefined;
    trace_required?: boolean | undefined;
    allowed_pipelines?: string[] | undefined;
}>;
export type PolicyConstraints = z.infer<typeof PolicyConstraintsSchema>;
export declare const PolicyDecisionSchema: z.ZodObject<{
    verdict: z.ZodEnum<["ALLOW", "DENY", "ALLOW_WITH_CONSTRAINTS"]>;
    reason_code: z.ZodString;
    message: z.ZodString;
    policy_version: z.ZodString;
    timestamp: z.ZodString;
    matched_rule: z.ZodOptional<z.ZodString>;
    constraints: z.ZodOptional<z.ZodObject<{
        max_runtime_ms: z.ZodOptional<z.ZodNumber>;
        max_payload_bytes: z.ZodOptional<z.ZodNumber>;
        allowed_pipelines: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        trace_required: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        max_runtime_ms?: number | undefined;
        max_payload_bytes?: number | undefined;
        trace_required?: boolean | undefined;
        allowed_pipelines?: string[] | undefined;
    }, {
        max_runtime_ms?: number | undefined;
        max_payload_bytes?: number | undefined;
        trace_required?: boolean | undefined;
        allowed_pipelines?: string[] | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    message: string;
    timestamp: string;
    reason_code: string;
    verdict: "ALLOW" | "DENY" | "ALLOW_WITH_CONSTRAINTS";
    policy_version: string;
    constraints?: {
        max_runtime_ms?: number | undefined;
        max_payload_bytes?: number | undefined;
        trace_required?: boolean | undefined;
        allowed_pipelines?: string[] | undefined;
    } | undefined;
    matched_rule?: string | undefined;
}, {
    message: string;
    timestamp: string;
    reason_code: string;
    verdict: "ALLOW" | "DENY" | "ALLOW_WITH_CONSTRAINTS";
    policy_version: string;
    constraints?: {
        max_runtime_ms?: number | undefined;
        max_payload_bytes?: number | undefined;
        trace_required?: boolean | undefined;
        allowed_pipelines?: string[] | undefined;
    } | undefined;
    matched_rule?: string | undefined;
}>;
export type PolicyDecision = z.infer<typeof PolicyDecisionSchema>;
export declare const PolicyCheckRequestSchema: z.ZodObject<{
    request: z.ZodObject<{
        request_id: z.ZodString;
        timestamp: z.ZodString;
        caller: z.ZodObject<{
            id: z.ZodString;
            type: z.ZodEnum<["SYSTEM", "USER", "PIPELINE"]>;
        }, "strip", z.ZodTypeAny, {
            type: "SYSTEM" | "USER" | "PIPELINE";
            id: string;
        }, {
            type: "SYSTEM" | "USER" | "PIPELINE";
            id: string;
        }>;
        intent: z.ZodString;
        payload: z.ZodUnknown;
        context: z.ZodObject<{
            mode: z.ZodDefault<z.ZodEnum<["PROD", "TEST", "DRY_RUN"]>>;
            trace: z.ZodDefault<z.ZodBoolean>;
            timeout_ms: z.ZodOptional<z.ZodNumber>;
            correlation_id: z.ZodOptional<z.ZodString>;
            metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "strip", z.ZodTypeAny, {
            mode: "PROD" | "TEST" | "DRY_RUN";
            trace: boolean;
            timeout_ms?: number | undefined;
            correlation_id?: string | undefined;
            metadata?: Record<string, unknown> | undefined;
        }, {
            mode?: "PROD" | "TEST" | "DRY_RUN" | undefined;
            trace?: boolean | undefined;
            timeout_ms?: number | undefined;
            correlation_id?: string | undefined;
            metadata?: Record<string, unknown> | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        request_id: string;
        timestamp: string;
        caller: {
            type: "SYSTEM" | "USER" | "PIPELINE";
            id: string;
        };
        intent: string;
        context: {
            mode: "PROD" | "TEST" | "DRY_RUN";
            trace: boolean;
            timeout_ms?: number | undefined;
            correlation_id?: string | undefined;
            metadata?: Record<string, unknown> | undefined;
        };
        payload?: unknown;
    }, {
        request_id: string;
        timestamp: string;
        caller: {
            type: "SYSTEM" | "USER" | "PIPELINE";
            id: string;
        };
        intent: string;
        context: {
            mode?: "PROD" | "TEST" | "DRY_RUN" | undefined;
            trace?: boolean | undefined;
            timeout_ms?: number | undefined;
            correlation_id?: string | undefined;
            metadata?: Record<string, unknown> | undefined;
        };
        payload?: unknown;
    }>;
    environment: z.ZodObject<{
        build: z.ZodString;
        mode: z.ZodEnum<["PROD", "TEST", "DRY_RUN"]>;
    }, "strip", z.ZodTypeAny, {
        mode: "PROD" | "TEST" | "DRY_RUN";
        build: string;
    }, {
        mode: "PROD" | "TEST" | "DRY_RUN";
        build: string;
    }>;
    policy_version: z.ZodString;
}, "strip", z.ZodTypeAny, {
    policy_version: string;
    request: {
        request_id: string;
        timestamp: string;
        caller: {
            type: "SYSTEM" | "USER" | "PIPELINE";
            id: string;
        };
        intent: string;
        context: {
            mode: "PROD" | "TEST" | "DRY_RUN";
            trace: boolean;
            timeout_ms?: number | undefined;
            correlation_id?: string | undefined;
            metadata?: Record<string, unknown> | undefined;
        };
        payload?: unknown;
    };
    environment: {
        mode: "PROD" | "TEST" | "DRY_RUN";
        build: string;
    };
}, {
    policy_version: string;
    request: {
        request_id: string;
        timestamp: string;
        caller: {
            type: "SYSTEM" | "USER" | "PIPELINE";
            id: string;
        };
        intent: string;
        context: {
            mode?: "PROD" | "TEST" | "DRY_RUN" | undefined;
            trace?: boolean | undefined;
            timeout_ms?: number | undefined;
            correlation_id?: string | undefined;
            metadata?: Record<string, unknown> | undefined;
        };
        payload?: unknown;
    };
    environment: {
        mode: "PROD" | "TEST" | "DRY_RUN";
        build: string;
    };
}>;
export type PolicyCheckRequest = z.infer<typeof PolicyCheckRequestSchema>;
export declare const PipelineConstraintsSchema: z.ZodObject<{
    max_runtime_ms: z.ZodDefault<z.ZodNumber>;
    max_payload_bytes: z.ZodDefault<z.ZodNumber>;
    trace_required: z.ZodDefault<z.ZodBoolean>;
    deterministic_required: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    max_runtime_ms: number;
    max_payload_bytes: number;
    trace_required: boolean;
    deterministic_required: boolean;
}, {
    max_runtime_ms?: number | undefined;
    max_payload_bytes?: number | undefined;
    trace_required?: boolean | undefined;
    deterministic_required?: boolean | undefined;
}>;
export type PipelineConstraints = z.infer<typeof PipelineConstraintsSchema>;
export declare const PipelineSpecSchema: z.ZodObject<{
    pipeline_id: z.ZodString;
    version: z.ZodString;
    intent: z.ZodString;
    description: z.ZodString;
    criticality: z.ZodEnum<["LOW", "MEDIUM", "HIGH", "CRITICAL"]>;
    input_schema_id: z.ZodString;
    output_schema_id: z.ZodString;
    constraints: z.ZodObject<{
        max_runtime_ms: z.ZodDefault<z.ZodNumber>;
        max_payload_bytes: z.ZodDefault<z.ZodNumber>;
        trace_required: z.ZodDefault<z.ZodBoolean>;
        deterministic_required: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        max_runtime_ms: number;
        max_payload_bytes: number;
        trace_required: boolean;
        deterministic_required: boolean;
    }, {
        max_runtime_ms?: number | undefined;
        max_payload_bytes?: number | undefined;
        trace_required?: boolean | undefined;
        deterministic_required?: boolean | undefined;
    }>;
    allowed_callers: z.ZodArray<z.ZodEnum<["SYSTEM", "USER", "PIPELINE"]>, "many">;
    module_chain: z.ZodArray<z.ZodString, "many">;
    enabled: z.ZodDefault<z.ZodBoolean>;
    created_at: z.ZodOptional<z.ZodString>;
    updated_at: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    intent: string;
    pipeline_id: string;
    constraints: {
        max_runtime_ms: number;
        max_payload_bytes: number;
        trace_required: boolean;
        deterministic_required: boolean;
    };
    version: string;
    description: string;
    criticality: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    input_schema_id: string;
    output_schema_id: string;
    allowed_callers: ("SYSTEM" | "USER" | "PIPELINE")[];
    module_chain: string[];
    enabled: boolean;
    created_at?: string | undefined;
    updated_at?: string | undefined;
}, {
    intent: string;
    pipeline_id: string;
    constraints: {
        max_runtime_ms?: number | undefined;
        max_payload_bytes?: number | undefined;
        trace_required?: boolean | undefined;
        deterministic_required?: boolean | undefined;
    };
    version: string;
    description: string;
    criticality: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    input_schema_id: string;
    output_schema_id: string;
    allowed_callers: ("SYSTEM" | "USER" | "PIPELINE")[];
    module_chain: string[];
    enabled?: boolean | undefined;
    created_at?: string | undefined;
    updated_at?: string | undefined;
}>;
export type PipelineSpec = z.infer<typeof PipelineSpecSchema>;
export declare const ModuleLimitsSchema: z.ZodObject<{
    max_runtime_ms: z.ZodOptional<z.ZodNumber>;
    max_input_bytes: z.ZodOptional<z.ZodNumber>;
    deterministic_safe: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    deterministic_safe: boolean;
    max_runtime_ms?: number | undefined;
    max_input_bytes?: number | undefined;
}, {
    deterministic_safe: boolean;
    max_runtime_ms?: number | undefined;
    max_input_bytes?: number | undefined;
}>;
export type ModuleLimits = z.infer<typeof ModuleLimitsSchema>;
export declare const ModuleIOSchema: z.ZodObject<{
    input_schema_id: z.ZodString;
    output_schema_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    input_schema_id: string;
    output_schema_id: string;
}, {
    input_schema_id: string;
    output_schema_id: string;
}>;
export type ModuleIO = z.infer<typeof ModuleIOSchema>;
export declare const ModuleSpecSchema: z.ZodObject<{
    module_id: z.ZodString;
    version: z.ZodString;
    description: z.ZodString;
    criticality: z.ZodEnum<["LOW", "MEDIUM", "HIGH", "CRITICAL"]>;
    interface_version: z.ZodLiteral<"OMEGA_MODULE_v1.0">;
    limits: z.ZodObject<{
        max_runtime_ms: z.ZodOptional<z.ZodNumber>;
        max_input_bytes: z.ZodOptional<z.ZodNumber>;
        deterministic_safe: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        deterministic_safe: boolean;
        max_runtime_ms?: number | undefined;
        max_input_bytes?: number | undefined;
    }, {
        deterministic_safe: boolean;
        max_runtime_ms?: number | undefined;
        max_input_bytes?: number | undefined;
    }>;
    io: z.ZodObject<{
        input_schema_id: z.ZodString;
        output_schema_id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        input_schema_id: string;
        output_schema_id: string;
    }, {
        input_schema_id: string;
        output_schema_id: string;
    }>;
    capabilities: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    enabled: z.ZodDefault<z.ZodBoolean>;
    created_at: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    version: string;
    description: string;
    criticality: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    enabled: boolean;
    module_id: string;
    interface_version: "OMEGA_MODULE_v1.0";
    limits: {
        deterministic_safe: boolean;
        max_runtime_ms?: number | undefined;
        max_input_bytes?: number | undefined;
    };
    io: {
        input_schema_id: string;
        output_schema_id: string;
    };
    capabilities: string[];
    created_at?: string | undefined;
}, {
    version: string;
    description: string;
    criticality: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    module_id: string;
    interface_version: "OMEGA_MODULE_v1.0";
    limits: {
        deterministic_safe: boolean;
        max_runtime_ms?: number | undefined;
        max_input_bytes?: number | undefined;
    };
    io: {
        input_schema_id: string;
        output_schema_id: string;
    };
    enabled?: boolean | undefined;
    created_at?: string | undefined;
    capabilities?: string[] | undefined;
}>;
export type ModuleSpec = z.infer<typeof ModuleSpecSchema>;
export declare const ModuleErrorSchema: z.ZodObject<{
    code: z.ZodString;
    message: z.ZodString;
    details: z.ZodOptional<z.ZodString>;
    retryable: z.ZodBoolean;
    category: z.ZodEnum<["VALIDATION", "EXECUTION", "TIMEOUT", "DEPENDENCY", "INTERNAL"]>;
}, "strip", z.ZodTypeAny, {
    code: string;
    message: string;
    retryable: boolean;
    category: "VALIDATION" | "EXECUTION" | "TIMEOUT" | "DEPENDENCY" | "INTERNAL";
    details?: string | undefined;
}, {
    code: string;
    message: string;
    retryable: boolean;
    category: "VALIDATION" | "EXECUTION" | "TIMEOUT" | "DEPENDENCY" | "INTERNAL";
    details?: string | undefined;
}>;
export type ModuleError = z.infer<typeof ModuleErrorSchema>;
export interface ModuleResultOk<T> {
    ok: true;
    output: T;
    artifacts?: ArtifactRef[];
    metrics?: Record<string, number>;
}
export interface ModuleResultErr {
    ok: false;
    error: ModuleError;
    metrics?: Record<string, number>;
}
export type ModuleResult<T> = ModuleResultOk<T> | ModuleResultErr;
export interface AuditWriter {
    append(event_type: string, payload: Record<string, unknown>): void;
}
export interface ArtifactStore {
    put(kind: ArtifactKind, bytes: Uint8Array, mime: string): Promise<ArtifactRef>;
    get(ref: ArtifactRef): Promise<Uint8Array | null>;
    verify(ref: ArtifactRef): Promise<boolean>;
}
export interface DeterministicRNG {
    next(): number;
    nextInt(min: number, max: number): number;
    seed: number;
}
export interface ExecutionContext {
    execution_token: string;
    pipeline_id: string;
    mode: ExecutionMode;
    trace: boolean;
    deterministic_required: boolean;
    deadline_epoch_ms: number;
    audit: AuditWriter;
    artifacts: ArtifactStore;
    rng: DeterministicRNG;
}
export declare const ArtifactRefSchema: z.ZodObject<{
    kind: z.ZodEnum<["FINAL_OUTPUT", "STEP_OUTPUT", "REPORT", "SNAPSHOT_PAYLOAD", "DEBUG_TRACE"]>;
    content_hash: z.ZodString;
    size_bytes: z.ZodNumber;
    mime: z.ZodDefault<z.ZodString>;
    storage_ref: z.ZodString;
    created_at: z.ZodString;
    execution_token: z.ZodString;
    pipeline_id: z.ZodString;
    step: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    pipeline_id: string;
    execution_token: string;
    created_at: string;
    kind: "FINAL_OUTPUT" | "STEP_OUTPUT" | "REPORT" | "SNAPSHOT_PAYLOAD" | "DEBUG_TRACE";
    content_hash: string;
    size_bytes: number;
    mime: string;
    storage_ref: string;
    step?: string | undefined;
}, {
    pipeline_id: string;
    execution_token: string;
    created_at: string;
    kind: "FINAL_OUTPUT" | "STEP_OUTPUT" | "REPORT" | "SNAPSHOT_PAYLOAD" | "DEBUG_TRACE";
    content_hash: string;
    size_bytes: number;
    storage_ref: string;
    mime?: string | undefined;
    step?: string | undefined;
}>;
export type ArtifactRef = z.infer<typeof ArtifactRefSchema>;
export declare const SnapshotPayloadSchema: z.ZodObject<{
    snapshot_id: z.ZodString;
    execution_token: z.ZodString;
    pipeline_id: z.ZodString;
    step: z.ZodString;
    timestamp: z.ZodString;
    input_hash: z.ZodString;
    output_hash: z.ZodOptional<z.ZodString>;
    state_digest: z.ZodString;
    artifacts_refs: z.ZodDefault<z.ZodArray<z.ZodObject<{
        kind: z.ZodString;
        content_hash: z.ZodString;
        storage_ref: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        kind: string;
        content_hash: string;
        storage_ref: string;
    }, {
        kind: string;
        content_hash: string;
        storage_ref: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    pipeline_id: string;
    execution_token: string;
    step: string;
    snapshot_id: string;
    input_hash: string;
    state_digest: string;
    artifacts_refs: {
        kind: string;
        content_hash: string;
        storage_ref: string;
    }[];
    output_hash?: string | undefined;
}, {
    timestamp: string;
    pipeline_id: string;
    execution_token: string;
    step: string;
    snapshot_id: string;
    input_hash: string;
    state_digest: string;
    output_hash?: string | undefined;
    artifacts_refs?: {
        kind: string;
        content_hash: string;
        storage_ref: string;
    }[] | undefined;
}>;
export type SnapshotPayload = z.infer<typeof SnapshotPayloadSchema>;
export declare const SnapshotRefSchema: z.ZodObject<{
    snapshot_id: z.ZodString;
    snapshot_hash: z.ZodString;
    storage_ref: z.ZodString;
}, "strip", z.ZodTypeAny, {
    storage_ref: string;
    snapshot_id: string;
    snapshot_hash: string;
}, {
    storage_ref: string;
    snapshot_id: string;
    snapshot_hash: string;
}>;
export type SnapshotRef = z.infer<typeof SnapshotRefSchema>;
export declare const LedgerEntrySchema: z.ZodObject<{
    entry_id: z.ZodString;
    timestamp: z.ZodString;
    stream_id: z.ZodString;
    seq: z.ZodNumber;
    event_type: z.ZodString;
    payload: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    prev_hash: z.ZodString;
    entry_hash: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    payload: Record<string, unknown>;
    entry_id: string;
    stream_id: string;
    seq: number;
    event_type: string;
    prev_hash: string;
    entry_hash: string;
}, {
    timestamp: string;
    payload: Record<string, unknown>;
    entry_id: string;
    stream_id: string;
    seq: number;
    event_type: string;
    prev_hash: string;
    entry_hash: string;
}>;
export type LedgerEntry = z.infer<typeof LedgerEntrySchema>;
export declare const VerificationReportSchema: z.ZodObject<{
    stream_id: z.ZodString;
    ok: z.ZodBoolean;
    entries_checked: z.ZodNumber;
    first_bad_seq: z.ZodOptional<z.ZodNumber>;
    expected_prev_hash: z.ZodOptional<z.ZodString>;
    got_prev_hash: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    stream_id: string;
    ok: boolean;
    entries_checked: number;
    first_bad_seq?: number | undefined;
    expected_prev_hash?: string | undefined;
    got_prev_hash?: string | undefined;
}, {
    stream_id: string;
    ok: boolean;
    entries_checked: number;
    first_bad_seq?: number | undefined;
    expected_prev_hash?: string | undefined;
    got_prev_hash?: string | undefined;
}>;
export type VerificationReport = z.infer<typeof VerificationReportSchema>;
export declare const ErrorTraceSchema: z.ZodObject<{
    step: z.ZodString;
    code: z.ZodString;
    message: z.ZodString;
    details: z.ZodOptional<z.ZodString>;
    retryable: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    code: string;
    message: string;
    step: string;
    details?: string | undefined;
    retryable?: boolean | undefined;
}, {
    code: string;
    message: string;
    step: string;
    details?: string | undefined;
    retryable?: boolean | undefined;
}>;
export type ErrorTrace = z.infer<typeof ErrorTraceSchema>;
export declare const ExecutionMetricsSchema: z.ZodObject<{
    total_duration_ms: z.ZodOptional<z.ZodNumber>;
    steps_duration_ms: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    memory_peak_bytes: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    total_duration_ms?: number | undefined;
    steps_duration_ms?: Record<string, number> | undefined;
    memory_peak_bytes?: number | undefined;
}, {
    total_duration_ms?: number | undefined;
    steps_duration_ms?: Record<string, number> | undefined;
    memory_peak_bytes?: number | undefined;
}>;
export type ExecutionMetrics = z.infer<typeof ExecutionMetricsSchema>;
export declare const ExecutionReportSchema: z.ZodObject<{
    execution_token: z.ZodString;
    pipeline_id: z.ZodString;
    status: z.ZodEnum<["COMPLETED", "FAILED", "TIMED_OUT", "CANCELLED"]>;
    start_time: z.ZodString;
    end_time: z.ZodString;
    duration_ms: z.ZodOptional<z.ZodNumber>;
    steps_completed: z.ZodOptional<z.ZodNumber>;
    steps_total: z.ZodOptional<z.ZodNumber>;
    artifacts: z.ZodOptional<z.ZodArray<z.ZodObject<{
        kind: z.ZodEnum<["FINAL_OUTPUT", "STEP_OUTPUT", "REPORT", "SNAPSHOT_PAYLOAD", "DEBUG_TRACE"]>;
        content_hash: z.ZodString;
        size_bytes: z.ZodNumber;
        mime: z.ZodDefault<z.ZodString>;
        storage_ref: z.ZodString;
        created_at: z.ZodString;
        execution_token: z.ZodString;
        pipeline_id: z.ZodString;
        step: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        pipeline_id: string;
        execution_token: string;
        created_at: string;
        kind: "FINAL_OUTPUT" | "STEP_OUTPUT" | "REPORT" | "SNAPSHOT_PAYLOAD" | "DEBUG_TRACE";
        content_hash: string;
        size_bytes: number;
        mime: string;
        storage_ref: string;
        step?: string | undefined;
    }, {
        pipeline_id: string;
        execution_token: string;
        created_at: string;
        kind: "FINAL_OUTPUT" | "STEP_OUTPUT" | "REPORT" | "SNAPSHOT_PAYLOAD" | "DEBUG_TRACE";
        content_hash: string;
        size_bytes: number;
        storage_ref: string;
        mime?: string | undefined;
        step?: string | undefined;
    }>, "many">>;
    output_ref: z.ZodOptional<z.ZodObject<{
        kind: z.ZodEnum<["FINAL_OUTPUT", "STEP_OUTPUT", "REPORT", "SNAPSHOT_PAYLOAD", "DEBUG_TRACE"]>;
        content_hash: z.ZodString;
        size_bytes: z.ZodNumber;
        mime: z.ZodDefault<z.ZodString>;
        storage_ref: z.ZodString;
        created_at: z.ZodString;
        execution_token: z.ZodString;
        pipeline_id: z.ZodString;
        step: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        pipeline_id: string;
        execution_token: string;
        created_at: string;
        kind: "FINAL_OUTPUT" | "STEP_OUTPUT" | "REPORT" | "SNAPSHOT_PAYLOAD" | "DEBUG_TRACE";
        content_hash: string;
        size_bytes: number;
        mime: string;
        storage_ref: string;
        step?: string | undefined;
    }, {
        pipeline_id: string;
        execution_token: string;
        created_at: string;
        kind: "FINAL_OUTPUT" | "STEP_OUTPUT" | "REPORT" | "SNAPSHOT_PAYLOAD" | "DEBUG_TRACE";
        content_hash: string;
        size_bytes: number;
        storage_ref: string;
        mime?: string | undefined;
        step?: string | undefined;
    }>>;
    error_trace: z.ZodOptional<z.ZodObject<{
        step: z.ZodString;
        code: z.ZodString;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodString>;
        retryable: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        step: string;
        details?: string | undefined;
        retryable?: boolean | undefined;
    }, {
        code: string;
        message: string;
        step: string;
        details?: string | undefined;
        retryable?: boolean | undefined;
    }>>;
    metrics: z.ZodOptional<z.ZodObject<{
        total_duration_ms: z.ZodOptional<z.ZodNumber>;
        steps_duration_ms: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
        memory_peak_bytes: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        total_duration_ms?: number | undefined;
        steps_duration_ms?: Record<string, number> | undefined;
        memory_peak_bytes?: number | undefined;
    }, {
        total_duration_ms?: number | undefined;
        steps_duration_ms?: Record<string, number> | undefined;
        memory_peak_bytes?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    status: "COMPLETED" | "FAILED" | "TIMED_OUT" | "CANCELLED";
    pipeline_id: string;
    execution_token: string;
    start_time: string;
    end_time: string;
    duration_ms?: number | undefined;
    steps_completed?: number | undefined;
    steps_total?: number | undefined;
    artifacts?: {
        pipeline_id: string;
        execution_token: string;
        created_at: string;
        kind: "FINAL_OUTPUT" | "STEP_OUTPUT" | "REPORT" | "SNAPSHOT_PAYLOAD" | "DEBUG_TRACE";
        content_hash: string;
        size_bytes: number;
        mime: string;
        storage_ref: string;
        step?: string | undefined;
    }[] | undefined;
    output_ref?: {
        pipeline_id: string;
        execution_token: string;
        created_at: string;
        kind: "FINAL_OUTPUT" | "STEP_OUTPUT" | "REPORT" | "SNAPSHOT_PAYLOAD" | "DEBUG_TRACE";
        content_hash: string;
        size_bytes: number;
        mime: string;
        storage_ref: string;
        step?: string | undefined;
    } | undefined;
    error_trace?: {
        code: string;
        message: string;
        step: string;
        details?: string | undefined;
        retryable?: boolean | undefined;
    } | undefined;
    metrics?: {
        total_duration_ms?: number | undefined;
        steps_duration_ms?: Record<string, number> | undefined;
        memory_peak_bytes?: number | undefined;
    } | undefined;
}, {
    status: "COMPLETED" | "FAILED" | "TIMED_OUT" | "CANCELLED";
    pipeline_id: string;
    execution_token: string;
    start_time: string;
    end_time: string;
    duration_ms?: number | undefined;
    steps_completed?: number | undefined;
    steps_total?: number | undefined;
    artifacts?: {
        pipeline_id: string;
        execution_token: string;
        created_at: string;
        kind: "FINAL_OUTPUT" | "STEP_OUTPUT" | "REPORT" | "SNAPSHOT_PAYLOAD" | "DEBUG_TRACE";
        content_hash: string;
        size_bytes: number;
        storage_ref: string;
        mime?: string | undefined;
        step?: string | undefined;
    }[] | undefined;
    output_ref?: {
        pipeline_id: string;
        execution_token: string;
        created_at: string;
        kind: "FINAL_OUTPUT" | "STEP_OUTPUT" | "REPORT" | "SNAPSHOT_PAYLOAD" | "DEBUG_TRACE";
        content_hash: string;
        size_bytes: number;
        storage_ref: string;
        mime?: string | undefined;
        step?: string | undefined;
    } | undefined;
    error_trace?: {
        code: string;
        message: string;
        step: string;
        details?: string | undefined;
        retryable?: boolean | undefined;
    } | undefined;
    metrics?: {
        total_duration_ms?: number | undefined;
        steps_duration_ms?: Record<string, number> | undefined;
        memory_peak_bytes?: number | undefined;
    } | undefined;
}>;
export type ExecutionReport = z.infer<typeof ExecutionReportSchema>;
export interface ValidationResult {
    ok: boolean;
    error?: ModuleError;
}
export interface OmegaModule<In, Out> {
    id: string;
    version: string;
    limits: ModuleLimits;
    /** Validation locale (rapide, déterministe, pas d'effets de bord) */
    validate(input: In): ValidationResult;
    /** Exécution (peut utiliser ctx.audit, ctx.artifacts, ctx.rng) */
    run(ctx: ExecutionContext, input: In): Promise<ModuleResult<Out>>;
}
export declare const OrchestratorRequestSchema: z.ZodObject<{
    execution_token: z.ZodString;
    pipeline_spec: z.ZodObject<{
        pipeline_id: z.ZodString;
        version: z.ZodString;
        intent: z.ZodString;
        description: z.ZodString;
        criticality: z.ZodEnum<["LOW", "MEDIUM", "HIGH", "CRITICAL"]>;
        input_schema_id: z.ZodString;
        output_schema_id: z.ZodString;
        constraints: z.ZodObject<{
            max_runtime_ms: z.ZodDefault<z.ZodNumber>;
            max_payload_bytes: z.ZodDefault<z.ZodNumber>;
            trace_required: z.ZodDefault<z.ZodBoolean>;
            deterministic_required: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            max_runtime_ms: number;
            max_payload_bytes: number;
            trace_required: boolean;
            deterministic_required: boolean;
        }, {
            max_runtime_ms?: number | undefined;
            max_payload_bytes?: number | undefined;
            trace_required?: boolean | undefined;
            deterministic_required?: boolean | undefined;
        }>;
        allowed_callers: z.ZodArray<z.ZodEnum<["SYSTEM", "USER", "PIPELINE"]>, "many">;
        module_chain: z.ZodArray<z.ZodString, "many">;
        enabled: z.ZodDefault<z.ZodBoolean>;
        created_at: z.ZodOptional<z.ZodString>;
        updated_at: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        intent: string;
        pipeline_id: string;
        constraints: {
            max_runtime_ms: number;
            max_payload_bytes: number;
            trace_required: boolean;
            deterministic_required: boolean;
        };
        version: string;
        description: string;
        criticality: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
        input_schema_id: string;
        output_schema_id: string;
        allowed_callers: ("SYSTEM" | "USER" | "PIPELINE")[];
        module_chain: string[];
        enabled: boolean;
        created_at?: string | undefined;
        updated_at?: string | undefined;
    }, {
        intent: string;
        pipeline_id: string;
        constraints: {
            max_runtime_ms?: number | undefined;
            max_payload_bytes?: number | undefined;
            trace_required?: boolean | undefined;
            deterministic_required?: boolean | undefined;
        };
        version: string;
        description: string;
        criticality: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
        input_schema_id: string;
        output_schema_id: string;
        allowed_callers: ("SYSTEM" | "USER" | "PIPELINE")[];
        module_chain: string[];
        enabled?: boolean | undefined;
        created_at?: string | undefined;
        updated_at?: string | undefined;
    }>;
    payload: z.ZodUnknown;
    context: z.ZodObject<{
        mode: z.ZodEnum<["PROD", "TEST", "DRY_RUN"]>;
        trace: z.ZodBoolean;
        audit: z.ZodAny;
        artifacts: z.ZodAny;
    }, "strip", z.ZodTypeAny, {
        mode: "PROD" | "TEST" | "DRY_RUN";
        trace: boolean;
        artifacts?: any;
        audit?: any;
    }, {
        mode: "PROD" | "TEST" | "DRY_RUN";
        trace: boolean;
        artifacts?: any;
        audit?: any;
    }>;
}, "strip", z.ZodTypeAny, {
    context: {
        mode: "PROD" | "TEST" | "DRY_RUN";
        trace: boolean;
        artifacts?: any;
        audit?: any;
    };
    execution_token: string;
    pipeline_spec: {
        intent: string;
        pipeline_id: string;
        constraints: {
            max_runtime_ms: number;
            max_payload_bytes: number;
            trace_required: boolean;
            deterministic_required: boolean;
        };
        version: string;
        description: string;
        criticality: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
        input_schema_id: string;
        output_schema_id: string;
        allowed_callers: ("SYSTEM" | "USER" | "PIPELINE")[];
        module_chain: string[];
        enabled: boolean;
        created_at?: string | undefined;
        updated_at?: string | undefined;
    };
    payload?: unknown;
}, {
    context: {
        mode: "PROD" | "TEST" | "DRY_RUN";
        trace: boolean;
        artifacts?: any;
        audit?: any;
    };
    execution_token: string;
    pipeline_spec: {
        intent: string;
        pipeline_id: string;
        constraints: {
            max_runtime_ms?: number | undefined;
            max_payload_bytes?: number | undefined;
            trace_required?: boolean | undefined;
            deterministic_required?: boolean | undefined;
        };
        version: string;
        description: string;
        criticality: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
        input_schema_id: string;
        output_schema_id: string;
        allowed_callers: ("SYSTEM" | "USER" | "PIPELINE")[];
        module_chain: string[];
        enabled?: boolean | undefined;
        created_at?: string | undefined;
        updated_at?: string | undefined;
    };
    payload?: unknown;
}>;
export type OrchestratorRequest = z.infer<typeof OrchestratorRequestSchema>;
export type UUID = string;
export type ISO8601 = string;
export type SHA256 = string;
//# sourceMappingURL=types.d.ts.map