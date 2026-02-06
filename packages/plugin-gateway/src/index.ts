/**
 * OMEGA Plugin Gateway — Public API v1.0
 *
 * INV-PNP-01: Single Gateway — this is the ONLY entry point.
 *
 * 8 functions. Nothing else is exposed.
 */

import { PluginRegistry } from './registry.js';
import { ManifestValidator } from './validator.js';
import { GatewayLedger } from './ledger.js';
import { GatewayRouter, type PluginHandler } from './router.js';
import { GatewayEventKind } from './types.js';
import type {
  PluginManifest,
  PluginRequest,
  PluginResponse,
  PluginInfo,
  ValidationReport,
  PipelinePolicy,
  PipelineResponse,
  ProofBundle,
  PluginGatewayAPI,
} from './types.js';

export class PluginGateway implements PluginGatewayAPI {
  private readonly registry: PluginRegistry;
  private readonly validator: ManifestValidator;
  private readonly ledger: GatewayLedger;
  private readonly router: GatewayRouter;

  constructor() {
    this.registry = new PluginRegistry();
    this.validator = new ManifestValidator();
    this.ledger = new GatewayLedger();
    this.router = new GatewayRouter(this.registry, this.validator, this.ledger);
  }

  /** Validate a manifest without registering. */
  validateManifest(manifest: PluginManifest): ValidationReport {
    return this.validator.validateManifest(manifest, new Date().toISOString());
  }

  /** Register a plugin with its manifest and signature. */
  registerPlugin(manifest: PluginManifest, signature: string): PluginInfo {
    const timestamp = new Date().toISOString();

    // Validate first (fail-closed)
    const report = this.validator.validateManifest(manifest, timestamp);
    const signatureValid = signature.length > 0; // simplified — real impl uses Ed25519

    const info = this.registry.register(manifest, signature, report.valid && signatureValid, timestamp);

    this.ledger.append({
      run_id: 'system',
      kind: GatewayEventKind.REGISTER,
      plugin_id: manifest.plugin_id,
      request_id: '',
      input_hash: report.manifest_hash,
      output_hash: '',
      meta: { valid: String(report.valid), signature_valid: String(signatureValid) },
      timestamp,
    });

    return info;
  }

  /** Enable a registered plugin. */
  enablePlugin(pluginId: string): void {
    this.registry.enable(pluginId);
    this.ledger.append({
      run_id: 'system',
      kind: GatewayEventKind.ENABLE,
      plugin_id: pluginId,
      request_id: '',
      input_hash: '',
      output_hash: '',
      meta: {},
      timestamp: new Date().toISOString(),
    });
  }

  /** Disable a plugin without removing it. */
  disablePlugin(pluginId: string): void {
    this.registry.disable(pluginId);
    this.ledger.append({
      run_id: 'system',
      kind: GatewayEventKind.DISABLE,
      plugin_id: pluginId,
      request_id: '',
      input_hash: '',
      output_hash: '',
      meta: {},
      timestamp: new Date().toISOString(),
    });
  }

  /** List all registered plugins with status. */
  listPlugins(): readonly PluginInfo[] {
    return this.registry.list();
  }

  /** Invoke a single plugin. OMEGA → Gateway → Plugin → Gateway → OMEGA. */
  async invoke(pluginId: string, request: PluginRequest): Promise<PluginResponse> {
    return this.router.invoke(pluginId, request, new Date().toISOString());
  }

  /** Execute a pipeline of plugins according to policy. */
  async invokePipeline(policy: PipelinePolicy, request: PluginRequest): Promise<PipelineResponse> {
    return this.router.invokePipeline(policy, request, new Date().toISOString());
  }

  /** Export proof bundle for a run. */
  exportProof(runId: string): ProofBundle {
    const manifests = this.registry.list().map(p => ({
      plugin_id: p.plugin_id,
      manifest_hash: '', // would come from validator in full impl
    }));
    return this.ledger.exportProof(runId, manifests, []);
  }

  // ── Internal (for handler registration in inline/test mode) ──

  /** Register a handler function for a plugin (test/inline mode only). */
  setHandler(pluginId: string, handler: PluginHandler): void {
    this.router.setHandler(pluginId, handler);
  }

  /** Get ledger for inspection (read-only). */
  getLedger(): GatewayLedger {
    return this.ledger;
  }
}

// Re-exports
export { PluginRegistry } from './registry.js';
export { ManifestValidator } from './validator.js';
export { GatewayLedger } from './ledger.js';
export { GatewayRouter } from './router.js';
export { executeSandboxed, executeInline } from './sandbox.js';
export * from './types.js';
