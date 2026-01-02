// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA GATEWAY UNIVERSEL — TYPES
// Version: 1.0.0 — NASA/SpaceX-Grade
// Intégration: NEXUS DEP v1.0.0-FROZEN
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES SYSTÈME (depuis OMEGA_CORE_CONTRACTS)
// ═══════════════════════════════════════════════════════════════════════════════

export const CONSTANTS = {
  MAX_PAYLOAD_BYTES: 2_097_152,      // 2MB
  MAX_ARTIFACT_BYTES: 5_242_880,     // 5MB
  DEFAULT_TIMEOUT_MS: 15_000,        // 15s
  MAX_TIMEOUT_MS: 300_000,           // 5min
  RETRY_MIN_BUDGET_MS: 1_000,        // 1s
  MAX_MODULE_CHAIN_LENGTH: 50,
  DETERMINISTIC_SEED: 42,
  GENESIS_PREV_HASH: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  INTERFACE_VERSION: 'OMEGA_MODULE_v1.0',
  SCHEMA_DRAFT: 'https://json-schema.org/draft/2020-12/schema',
  CONTRACT_VERSION: '1.0.0',
  DEFAULT_RATE_LIMIT_RPS: 100,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// PRIMITIVES ZOD
// ═══════════════════════════════════════════════════════════════════════════════

export const UUIDSchema = z.string().uuid();
export const ISO8601Schema = z.string().datetime();
export const SHA256Schema = z.string().regex(/^[a-f0-9]{64}$/);
export const SemVerSchema = z.string().regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/);

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

export const CallerType = z.enum(['SYSTEM', 'USER', 'PIPELINE']);
export type CallerType = z.infer<typeof CallerType>;

export const ExecutionMode = z.enum(['PROD', 'TEST', 'DRY_RUN']);
export type ExecutionMode = z.infer<typeof ExecutionMode>;

export const ResponseStatus = z.enum(['ACCEPTED', 'REJECTED']);
export type ResponseStatus = z.infer<typeof ResponseStatus>;

export const PolicyVerdict = z.enum(['ALLOW', 'DENY', 'ALLOW_WITH_CONSTRAINTS']);
export type PolicyVerdict = z.infer<typeof PolicyVerdict>;

export const ExecutionState = z.enum([
  'PENDING',
  'INITIALIZING',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'TIMED_OUT',
  'CANCELLED'
]);
export type ExecutionState = z.infer<typeof ExecutionState>;

export const TERMINAL_STATES: ExecutionState[] = ['COMPLETED', 'FAILED', 'TIMED_OUT', 'CANCELLED'];

export const ModuleErrorCategory = z.enum([
  'VALIDATION',
  'EXECUTION',
  'TIMEOUT',
  'DEPENDENCY',
  'INTERNAL'
]);
export type ModuleErrorCategory = z.infer<typeof ModuleErrorCategory>;

export const ArtifactKind = z.enum([
  'FINAL_OUTPUT',
  'STEP_OUTPUT',
  'REPORT',
  'SNAPSHOT_PAYLOAD',
  'DEBUG_TRACE'
]);
export type ArtifactKind = z.infer<typeof ArtifactKind>;

export const Severity = z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);
export type Severity = z.infer<typeof Severity>;

export const Criticality = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export type Criticality = z.infer<typeof Criticality>;

// ═══════════════════════════════════════════════════════════════════════════════
// GATEWAY REQUEST/RESPONSE
// ═══════════════════════════════════════════════════════════════════════════════

export const CallerSchema = z.object({
  id: z.string().min(1).max(256),
  type: CallerType,
});
export type Caller = z.infer<typeof CallerSchema>;

export const RequestContextSchema = z.object({
  mode: ExecutionMode.default('PROD'),
  trace: z.boolean().default(false),
  timeout_ms: z.number().int().min(1000).max(CONSTANTS.MAX_TIMEOUT_MS).optional(),
  correlation_id: UUIDSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type RequestContext = z.infer<typeof RequestContextSchema>;

export const GatewayRequestSchema = z.object({
  request_id: UUIDSchema,
  timestamp: ISO8601Schema,
  caller: CallerSchema,
  intent: z.string().min(1).max(256).regex(/^[a-zA-Z][a-zA-Z0-9_.-]*$/),
  payload: z.unknown(),
  context: RequestContextSchema,
});
export type GatewayRequest = z.infer<typeof GatewayRequestSchema>;

export const ExecutionConstraintsSchema = z.object({
  max_runtime_ms: z.number().int().min(1000).max(CONSTANTS.MAX_TIMEOUT_MS).optional(),
  max_payload_bytes: z.number().int().min(1).max(CONSTANTS.MAX_ARTIFACT_BYTES).optional(),
  trace_required: z.boolean().optional(),
  deterministic_required: z.boolean().optional(),
});
export type ExecutionConstraints = z.infer<typeof ExecutionConstraintsSchema>;

export const GatewayAcceptedSchema = z.object({
  status: z.literal('ACCEPTED'),
  pipeline_id: z.string().min(1),
  execution_token: UUIDSchema,
  timestamp: ISO8601Schema,
  constraints: ExecutionConstraintsSchema.optional(),
});
export type GatewayAccepted = z.infer<typeof GatewayAcceptedSchema>;

export const GatewayRejectedSchema = z.object({
  status: z.literal('REJECTED'),
  reason_code: z.string().regex(/^(GW|POL|REG)_[A-Z_]+$/),
  message: z.string(),
  timestamp: ISO8601Schema,
  details: z.record(z.unknown()).optional(),
});
export type GatewayRejected = z.infer<typeof GatewayRejectedSchema>;

export const GatewayResponseSchema = z.discriminatedUnion('status', [
  GatewayAcceptedSchema,
  GatewayRejectedSchema,
]);
export type GatewayResponse = z.infer<typeof GatewayResponseSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// POLICY
// ═══════════════════════════════════════════════════════════════════════════════

export const PolicyConstraintsSchema = z.object({
  max_runtime_ms: z.number().int().min(1000).optional(),
  max_payload_bytes: z.number().int().min(1).optional(),
  allowed_pipelines: z.array(z.string()).optional(),
  trace_required: z.boolean().optional(),
});
export type PolicyConstraints = z.infer<typeof PolicyConstraintsSchema>;

export const PolicyDecisionSchema = z.object({
  verdict: PolicyVerdict,
  reason_code: z.string(),
  message: z.string(),
  policy_version: SemVerSchema,
  timestamp: ISO8601Schema,
  matched_rule: z.string().optional(),
  constraints: PolicyConstraintsSchema.optional(),
});
export type PolicyDecision = z.infer<typeof PolicyDecisionSchema>;

export const PolicyCheckRequestSchema = z.object({
  request: GatewayRequestSchema,
  environment: z.object({
    build: z.string(),
    mode: ExecutionMode,
  }),
  policy_version: SemVerSchema,
});
export type PolicyCheckRequest = z.infer<typeof PolicyCheckRequestSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE SPEC
// ═══════════════════════════════════════════════════════════════════════════════

export const PipelineConstraintsSchema = z.object({
  max_runtime_ms: z.number().int().min(1000).max(CONSTANTS.MAX_TIMEOUT_MS).default(CONSTANTS.DEFAULT_TIMEOUT_MS),
  max_payload_bytes: z.number().int().min(1).max(CONSTANTS.MAX_PAYLOAD_BYTES).default(CONSTANTS.MAX_PAYLOAD_BYTES),
  trace_required: z.boolean().default(false),
  deterministic_required: z.boolean().default(false),
});
export type PipelineConstraints = z.infer<typeof PipelineConstraintsSchema>;

export const PipelineSpecSchema = z.object({
  pipeline_id: z.string().min(1).max(128).regex(/^[a-z][a-z0-9_-]*$/),
  version: SemVerSchema,
  intent: z.string().min(1).max(256).regex(/^[a-zA-Z][a-zA-Z0-9_.-]*$/),
  description: z.string().min(1).max(1024),
  criticality: Criticality,
  input_schema_id: z.string().regex(/^[a-z][a-z0-9_.@-]*$/),
  output_schema_id: z.string().regex(/^[a-z][a-z0-9_.@-]*$/),
  constraints: PipelineConstraintsSchema,
  allowed_callers: z.array(CallerType).min(1),
  module_chain: z.array(z.string().regex(/^[a-z][a-z0-9_-]*@\d+\.\d+\.\d+$/)).min(1).max(CONSTANTS.MAX_MODULE_CHAIN_LENGTH),
  enabled: z.boolean().default(true),
  created_at: ISO8601Schema.optional(),
  updated_at: ISO8601Schema.optional(),
});
export type PipelineSpec = z.infer<typeof PipelineSpecSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE SPEC
// ═══════════════════════════════════════════════════════════════════════════════

export const ModuleLimitsSchema = z.object({
  max_runtime_ms: z.number().int().min(100).max(CONSTANTS.MAX_TIMEOUT_MS).optional(),
  max_input_bytes: z.number().int().min(1).max(CONSTANTS.MAX_ARTIFACT_BYTES).optional(),
  deterministic_safe: z.boolean(),
});
export type ModuleLimits = z.infer<typeof ModuleLimitsSchema>;

export const ModuleIOSchema = z.object({
  input_schema_id: z.string().regex(/^[a-z][a-z0-9_.@-]*$/),
  output_schema_id: z.string().regex(/^[a-z][a-z0-9_.@-]*$/),
});
export type ModuleIO = z.infer<typeof ModuleIOSchema>;

export const ModuleSpecSchema = z.object({
  module_id: z.string().min(1).max(128).regex(/^[a-z][a-z0-9_-]*$/),
  version: SemVerSchema,
  description: z.string().min(1).max(1024),
  criticality: Criticality,
  interface_version: z.literal(CONSTANTS.INTERFACE_VERSION),
  limits: ModuleLimitsSchema,
  io: ModuleIOSchema,
  capabilities: z.array(z.string()).default([]),
  enabled: z.boolean().default(true),
  created_at: ISO8601Schema.optional(),
});
export type ModuleSpec = z.infer<typeof ModuleSpecSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE ERROR & RESULT
// ═══════════════════════════════════════════════════════════════════════════════

export const ModuleErrorSchema = z.object({
  code: z.string().regex(/^MOD_[A-Z_]+$/),
  message: z.string(),
  details: z.string().optional(),
  retryable: z.boolean(),
  category: ModuleErrorCategory,
});
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

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTION CONTEXT (pour modules)
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// ARTIFACT REF
// ═══════════════════════════════════════════════════════════════════════════════

export const ArtifactRefSchema = z.object({
  kind: ArtifactKind,
  content_hash: SHA256Schema,
  size_bytes: z.number().int().min(0).max(CONSTANTS.MAX_ARTIFACT_BYTES),
  mime: z.string().default('application/json'),
  storage_ref: z.string(),
  created_at: ISO8601Schema,
  execution_token: UUIDSchema,
  pipeline_id: z.string(),
  step: z.string().optional(),
});
export type ArtifactRef = z.infer<typeof ArtifactRefSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// SNAPSHOT
// ═══════════════════════════════════════════════════════════════════════════════

export const SnapshotPayloadSchema = z.object({
  snapshot_id: UUIDSchema,
  execution_token: UUIDSchema,
  pipeline_id: z.string(),
  step: z.string(),
  timestamp: ISO8601Schema,
  input_hash: SHA256Schema,
  output_hash: SHA256Schema.optional(),
  state_digest: SHA256Schema,
  artifacts_refs: z.array(z.object({
    kind: z.string(),
    content_hash: SHA256Schema,
    storage_ref: z.string(),
  })).default([]),
});
export type SnapshotPayload = z.infer<typeof SnapshotPayloadSchema>;

export const SnapshotRefSchema = z.object({
  snapshot_id: UUIDSchema,
  snapshot_hash: SHA256Schema,
  storage_ref: z.string(),
});
export type SnapshotRef = z.infer<typeof SnapshotRefSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// LEDGER
// ═══════════════════════════════════════════════════════════════════════════════

export const LedgerEntrySchema = z.object({
  entry_id: UUIDSchema,
  timestamp: ISO8601Schema,
  stream_id: z.string().min(1).max(256),
  seq: z.number().int().min(0),
  event_type: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
  payload: z.record(z.unknown()),
  prev_hash: SHA256Schema,
  entry_hash: SHA256Schema,
});
export type LedgerEntry = z.infer<typeof LedgerEntrySchema>;

export const VerificationReportSchema = z.object({
  stream_id: z.string(),
  ok: z.boolean(),
  entries_checked: z.number().int().min(0),
  first_bad_seq: z.number().int().optional(),
  expected_prev_hash: SHA256Schema.optional(),
  got_prev_hash: SHA256Schema.optional(),
});
export type VerificationReport = z.infer<typeof VerificationReportSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTION REPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const ErrorTraceSchema = z.object({
  step: z.string(),
  code: z.string().regex(/^(ORCH|MOD)_[A-Z_]+$/),
  message: z.string(),
  details: z.string().optional(),
  retryable: z.boolean().optional(),
});
export type ErrorTrace = z.infer<typeof ErrorTraceSchema>;

export const ExecutionMetricsSchema = z.object({
  total_duration_ms: z.number().int().min(0).optional(),
  steps_duration_ms: z.record(z.number().int()).optional(),
  memory_peak_bytes: z.number().int().min(0).optional(),
});
export type ExecutionMetrics = z.infer<typeof ExecutionMetricsSchema>;

export const ExecutionReportSchema = z.object({
  execution_token: UUIDSchema,
  pipeline_id: z.string(),
  status: z.enum(['COMPLETED', 'FAILED', 'TIMED_OUT', 'CANCELLED']),
  start_time: ISO8601Schema,
  end_time: ISO8601Schema,
  duration_ms: z.number().int().min(0).optional(),
  steps_completed: z.number().int().min(0).optional(),
  steps_total: z.number().int().min(1).optional(),
  artifacts: z.array(ArtifactRefSchema).optional(),
  output_ref: ArtifactRefSchema.optional(),
  error_trace: ErrorTraceSchema.optional(),
  metrics: ExecutionMetricsSchema.optional(),
});
export type ExecutionReport = z.infer<typeof ExecutionReportSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE INTERFACE (contrat que tout module doit implémenter)
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR REQUEST
// ═══════════════════════════════════════════════════════════════════════════════

export const OrchestratorRequestSchema = z.object({
  execution_token: UUIDSchema,
  pipeline_spec: PipelineSpecSchema,
  payload: z.unknown(),
  context: z.object({
    mode: ExecutionMode,
    trace: z.boolean(),
    audit: z.any(), // AuditWriter
    artifacts: z.any(), // ArtifactStore
  }),
});
export type OrchestratorRequest = z.infer<typeof OrchestratorRequestSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export type UUID = string;
export type ISO8601 = string;
export type SHA256 = string;
