/**
 * OMEGA Plugin SDK — Constants v1.0
 * All numeric constants justified. No magic numbers.
 */

/** Must match OMEGA_PLUGIN_API_VERSION in @omega/plugin-gateway. Breaking change = major bump. */
export const OMEGA_PLUGIN_API_VERSION = '1.0.0' as const;

export const PluginCapability = {
  READ_TEXT: 'read_text',
  READ_JSON: 'read_json',
  READ_BINARY_REF: 'read_binary_ref',
  READ_DATASET_SLICE: 'read_dataset_slice',
  WRITE_SUGGESTION: 'write_suggestion',
  WRITE_REPORT: 'write_report',
} as const;

export type PluginCapabilityValue = (typeof PluginCapability)[keyof typeof PluginCapability];

export const ForbiddenCapability = {
  FILESYSTEM_ACCESS: 'filesystem_access',
  NETWORK_ACCESS: 'network_access',
  PROCESS_SPAWN: 'process_spawn',
  ENV_ACCESS: 'env_access',
} as const;

export type ForbiddenCapabilityValue = (typeof ForbiddenCapability)[keyof typeof ForbiddenCapability];

export const FORBIDDEN_CAPABILITY_SET: ReadonlySet<string> = new Set(Object.values(ForbiddenCapability));

/** 60s — gateway hard limit. Beyond = infrastructure concern. */
export const MAX_TIMEOUT_MS = 60_000;

/** 5s — generous for a compliant plugin processing test data. */
export const DEFAULT_COMPLIANCE_TIMEOUT_MS = 5_000;

/** 1 MiB — covers largest expected text/JSON payload. */
export const MAX_PAYLOAD_BYTES = 1_048_576;

/** 1 = serialized. Prevents resource contention. */
export const DEFAULT_MAX_CONCURRENCY = 1;

/** 2 identical runs suffice to prove f(x)=f(x). */
export const DETERMINISM_CHECK_ITERATIONS = 2;

export const PLUGIN_ID_PATTERN = /^p\.[a-z][a-z0-9_-]*\.[a-z][a-z0-9_-]*$/;
export const CAPABILITY_PATTERN = /^cap\.[a-z][a-z0-9_-]*\.[a-z][a-z0-9_-]*$/;
export const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;
