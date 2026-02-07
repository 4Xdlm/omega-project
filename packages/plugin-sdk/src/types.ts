/**
 * OMEGA Plugin SDK — Types v1.0
 * Self-contained. Zero `any`. Every field typed.
 */

// ═══════════════ GATEWAY-COMPATIBLE TYPES (mirror) ═══════════════

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

export type PluginPayload = TextPayload | JSONPayload | BinaryRefPayload | DatasetSlicePayload;

export interface PluginIODescriptor {
  readonly kind: PluginPayload['kind'];
  readonly schema_ref: string;
  readonly limits: { readonly max_bytes: number };
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
  readonly capabilities: readonly string[];
  readonly io: {
    readonly inputs: readonly PluginIODescriptor[];
    readonly outputs: readonly PluginIODescriptor[];
  };
  readonly limits: PluginLimits;
  readonly determinism: PluginDeterminism;
  readonly evidence: PluginEvidence;
  readonly entrypoint: PluginEntrypoint;
}

export interface RequestPolicy {
  readonly deterministic_only: boolean;
  readonly timeout_ms: number;
  readonly max_retries: number;
}

export interface PluginRequest {
  readonly request_id: string;
  readonly run_id: string;
  readonly timestamp: string;
  readonly payload: PluginPayload;
  readonly context: Record<string, string>;
  readonly policy: RequestPolicy;
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

// ═══════════════ SDK-SPECIFIC TYPES ═══════════════

export type PluginHandler = (request: PluginRequest) => PluginResponse | Promise<PluginResponse>;

export interface ComplianceCheckResult {
  readonly id: string;
  readonly name: string;
  readonly law: string;
  readonly passed: boolean;
  readonly detail: string;
  readonly duration_ms: number;
}

export interface ComplianceReport {
  readonly plugin_id: string;
  readonly timestamp: string;
  readonly passed: boolean;
  readonly checks: readonly ComplianceCheckResult[];
  readonly summary: {
    readonly total: 10;
    readonly passed_count: number;
    readonly failed_count: number;
  };
}

export interface ComplianceGateInput {
  readonly manifest: PluginManifest;
  readonly handler: PluginHandler;
  readonly testPayloads: readonly PluginPayload[];
}
