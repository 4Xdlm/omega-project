/**
 * OMEGA Plugin SDK — Public API v1.0
 */

export type {
  PluginPayload, TextPayload, JSONPayload, BinaryRefPayload, DatasetSlicePayload,
  PluginIODescriptor, PluginLimits, PluginDeterminism, PluginEvidence, PluginEntrypoint,
  PluginManifest, PluginRequest, PluginResponse, PluginResponseStatus, RequestPolicy,
  PluginHandler, ComplianceReport, ComplianceCheckResult, ComplianceGateInput,
} from './types.js';

export {
  OMEGA_PLUGIN_API_VERSION, PluginCapability, ForbiddenCapability, FORBIDDEN_CAPABILITY_SET,
  MAX_TIMEOUT_MS, DEFAULT_COMPLIANCE_TIMEOUT_MS, MAX_PAYLOAD_BYTES, DEFAULT_MAX_CONCURRENCY,
  DETERMINISM_CHECK_ITERATIONS, PLUGIN_ID_PATTERN, CAPABILITY_PATTERN, SEMVER_PATTERN,
} from './constants.js';

export { ManifestBuilder } from './manifest-builder.js';
export { AdapterBase } from './adapter-base.js';
export { hashPayload, hashData, computeEvidenceHashes, generateRequestId } from './evidence.js';
export { runComplianceGate } from './compliance/index.js';
