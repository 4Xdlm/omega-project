/**
 * OMEGA Plugin Gateway — Core Types v1.0
 *
 * Réponse produite sous contrainte OMEGA — NASA-grade — aucune approximation tolérée.
 *
 * INV-PNP-04: Zero `any`. All payloads typed + runtime validated.
 * INV-PNP-03: Determinism surface — canonical JSON + sorted keys.
 * INV-PNP-09: Version contract via OMEGA_PLUGIN_API_VERSION.
 */

// ═══════════════════════════════════════════════════════════════════
// VERSION CONTRACT
// ═══════════════════════════════════════════════════════════════════

/** Current gateway API version. Plugins must declare compatible range. */
export const OMEGA_PLUGIN_API_VERSION = '1.0.0' as const;

// ═══════════════════════════════════════════════════════════════════
// CAPABILITIES (strict enum — INV-PNP-06)
// ═══════════════════════════════════════════════════════════════════

/** Permitted capabilities v1.0 */
export const PluginCapability = {
  READ_TEXT: 'read_text',
  READ_JSON: 'read_json',
  READ_BINARY_REF: 'read_binary_ref',
  READ_DATASET_SLICE: 'read_dataset_slice',
  WRITE_SUGGESTION: 'write_suggestion',
  WRITE_REPORT: 'write_report',
} as const;

export type PluginCapability = (typeof PluginCapability)[keyof typeof PluginCapability];

/** Forbidden capabilities v1.0 — listed for explicit rejection */
export const ForbiddenCapability = {
  FILESYSTEM_ACCESS: 'filesystem_access',
  NETWORK_ACCESS: 'network_access',
  PROCESS_SPAWN: 'process_spawn',
  ENV_ACCESS: 'env_access',
} as const;

export type ForbiddenCapability = (typeof ForbiddenCapability)[keyof typeof ForbiddenCapability];

// ═══════════════════════════════════════════════════════════════════
// PAYLOADS (INV-PNP-04 — typed union)
// ═══════════════════════════════════════════════════════════════════

export interface TextPayload {
  readonly kind: 'text';
  readonly content: string;
  readonly encoding: 'utf-8';
  readonly metadata: Record<string, string>;
}

export interface JSONPayload {
  readonly kind: 'json';
  readonly data: Record<string, unknown>;
  readonly schema_ref: string;
}

export interface BinaryRefPayload {
  readonly kind: 'binary_ref';
  readonly artifact_id: string;
  readonly artifact_hash: string;
  readonly mime_type: string;
}

export interface DatasetSlicePayload {
  readonly kind: 'dataset_slice';
  readonly slice_ids: readonly string[];
  readonly source: string;
  readonly filters: Record<string, string>;
}

export type PluginPayload =
  | TextPayload
  | JSONPayload
  | BinaryRefPayload
  | DatasetSlicePayload;

// ═══════════════════════════════════════════════════════════════════
// PLUGIN MANIFEST (aligned with CONTRACT §2)
// ═══════════════════════════════════════════════════════════════════

export interface PluginIODescriptor {
  readonly kind: PluginPayload['kind'];
  readonly schema_ref: string;
  readonly limits: {
    readonly max_bytes: number;
  };
}

export interface PluginLimits {
  readonly max_bytes: number;
  readonly max_ms: number;
  readonly max_concurrency: number;
}

export interface PluginDeterminism {
  readonly mode: 'deterministic' | 'probabilistic';
  readonly notes: string;
}

export interface PluginEvidence {
  readonly log_level: 'full' | 'summary' | 'minimal';
  readonly redactions: readonly string[];
}

export interface PluginEntrypoint {
  readonly type: 'worker';
  readonly file: string;
  readonly export: string;
}

export interface PluginManifest {
  readonly plugin_id: string;
  readonly name: string;
  readonly vendor: string;
  readonly description: string;
  readonly version: string;
  readonly api_version: string;
  readonly supported_omega_api_versions: string;
  readonly capabilities: readonly PluginCapability[];
  readonly io: {
    readonly inputs: readonly PluginIODescriptor[];
    readonly outputs: readonly PluginIODescriptor[];
  };
  readonly limits: PluginLimits;
  readonly determinism: PluginDeterminism;
  readonly evidence: PluginEvidence;
  readonly entrypoint: PluginEntrypoint;
}

// ═══════════════════════════════════════════════════════════════════
// REQUEST / RESPONSE (aligned with CONTRACT §4)
// ═══════════════════════════════════════════════════════════════════

export interface PluginRequest {
  readonly request_id: string;
  readonly run_id: string;
  readonly timestamp: string;
  readonly payload: PluginPayload;
  readonly context: Record<string, string>;
  readonly policy: RequestPolicy;
}

export interface RequestPolicy {
  readonly deterministic_only: boolean;
  readonly timeout_ms: number;
  readonly max_retries: number;
}

export type PluginResponseStatus = 'ok' | 'rejected' | 'error' | 'timeout';

export interface PluginResponse {
  readonly request_id: string;
  readonly plugin_id: string;
  readonly status: PluginResponseStatus;
  readonly result: PluginPayload | null;
  readonly evidence_hashes: {
    readonly input_hash: string;
    readonly output_hash: string;
  };
  readonly duration_ms: number;
  readonly notes: string;
}

// ═══════════════════════════════════════════════════════════════════
// PLUGIN INFO & STATUS
// ═══════════════════════════════════════════════════════════════════

export type PluginStatus = 'registered' | 'enabled' | 'disabled' | 'rejected';

export interface PluginInfo {
  readonly plugin_id: string;
  readonly name: string;
  readonly version: string;
  readonly status: PluginStatus;
  readonly capabilities: readonly PluginCapability[];
  readonly registered_at: string;
  readonly signature_valid: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  readonly field: string;
  readonly message: string;
  readonly severity: ValidationSeverity;
}

export interface ValidationReport {
  readonly valid: boolean;
  readonly issues: readonly ValidationIssue[];
  readonly manifest_hash: string;
  readonly checked_at: string;
}

// ═══════════════════════════════════════════════════════════════════
// PIPELINE
// ═══════════════════════════════════════════════════════════════════

export type PipelineStrategy = 'sequential' | 'fan_out';

export interface PipelinePolicy {
  readonly strategy: PipelineStrategy;
  readonly plugin_ids: readonly string[];
  readonly timeout_ms: number;
  readonly stop_on_failure: boolean;
}

export interface PipelineStepResult {
  readonly plugin_id: string;
  readonly response: PluginResponse;
  readonly step_index: number;
}

export interface PipelineResponse {
  readonly run_id: string;
  readonly strategy: PipelineStrategy;
  readonly steps: readonly PipelineStepResult[];
  readonly overall_status: PluginResponseStatus;
  readonly total_duration_ms: number;
}

// ═══════════════════════════════════════════════════════════════════
// LEDGER EVENTS (aligned with EVIDENCE_FORMAT §2)
// ═══════════════════════════════════════════════════════════════════

export const GatewayEventKind = {
  REGISTER: 'REGISTER',
  ENABLE: 'ENABLE',
  DISABLE: 'DISABLE',
  INVOKE: 'INVOKE',
  RESULT: 'RESULT',
  REJECT: 'REJECT',
  ERROR: 'ERROR',
  PROOF_EXPORT: 'PROOF_EXPORT',
} as const;

export type GatewayEventKind = (typeof GatewayEventKind)[keyof typeof GatewayEventKind];

export interface GatewayEvent {
  readonly event_id: string;
  readonly run_id: string;
  readonly ts: string;
  readonly kind: GatewayEventKind;
  readonly plugin_id: string;
  readonly request_id: string;
  readonly input_hash: string;
  readonly output_hash: string;
  readonly prev_hash: string;
  readonly event_hash: string;
  readonly meta: Record<string, string>;
}

// ═══════════════════════════════════════════════════════════════════
// PROOF BUNDLE (aligned with EVIDENCE_FORMAT §4)
// ═══════════════════════════════════════════════════════════════════

export interface ProofBundle {
  readonly proof_id: string;
  readonly run_id: string;
  readonly created_at: string;
  readonly head_event_hash: string;
  readonly events: readonly GatewayEvent[];
  readonly plugin_manifest_digests: readonly {
    readonly plugin_id: string;
    readonly manifest_hash: string;
  }[];
  readonly validation_reports: readonly ValidationReport[];
}

// ═══════════════════════════════════════════════════════════════════
// GATEWAY PUBLIC API (aligned with CONTRACT §6)
// ═══════════════════════════════════════════════════════════════════

export interface PluginGatewayAPI {
  validateManifest(manifest: PluginManifest): ValidationReport;
  registerPlugin(manifest: PluginManifest, signature: string): PluginInfo;
  enablePlugin(pluginId: string): void;
  disablePlugin(pluginId: string): void;
  listPlugins(): readonly PluginInfo[];
  invoke(pluginId: string, request: PluginRequest): Promise<PluginResponse>;
  invokePipeline(policy: PipelinePolicy, request: PluginRequest): Promise<PipelineResponse>;
  exportProof(runId: string): ProofBundle;
}
