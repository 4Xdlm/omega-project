/**
 * OMEGA Plugin SDK — Manifest Builder v1.0
 * Builder pattern. Validates at build() — fail-closed.
 */

import { OMEGA_PLUGIN_API_VERSION, PLUGIN_ID_PATTERN, SEMVER_PATTERN } from './constants.js';
import type {
  PluginManifest, PluginIODescriptor, PluginLimits,
  PluginDeterminism, PluginEvidence, PluginEntrypoint,
} from './types.js';

export class ManifestBuilder {
  private _pluginId = '';
  private _name = '';
  private _vendor = '';
  private _description = '';
  private _version = '';
  private _capabilities: string[] = [];
  private _inputs: PluginIODescriptor[] = [];
  private _outputs: PluginIODescriptor[] = [];
  private _limits: PluginLimits = { max_bytes: 1_048_576, max_ms: 10_000, max_concurrency: 1 };
  private _determinism: PluginDeterminism = { mode: 'deterministic', notes: '' };
  private _evidence: PluginEvidence = { log_level: 'full', redactions: [] };
  private _entrypoint: PluginEntrypoint = { type: 'worker', file: 'src/index.ts', export: 'handleRequest' };

  pluginId(id: string): this { this._pluginId = id; return this; }
  name(n: string): this { this._name = n; return this; }
  vendor(v: string): this { this._vendor = v; return this; }
  description(d: string): this { this._description = d; return this; }
  version(v: string): this { this._version = v; return this; }

  addCapability(cap: string): this {
    if (!this._capabilities.includes(cap)) this._capabilities.push(cap);
    return this;
  }

  addInput(input: PluginIODescriptor): this { this._inputs.push(input); return this; }
  addOutput(output: PluginIODescriptor): this { this._outputs.push(output); return this; }
  limits(l: PluginLimits): this { this._limits = l; return this; }
  determinism(d: PluginDeterminism): this { this._determinism = d; return this; }
  evidence(e: PluginEvidence): this { this._evidence = e; return this; }
  entrypoint(e: PluginEntrypoint): this { this._entrypoint = e; return this; }

  build(): PluginManifest {
    const errors: string[] = [];
    if (!PLUGIN_ID_PATTERN.test(this._pluginId)) errors.push(`Invalid plugin_id "${this._pluginId}"`);
    if (this._name.length === 0) errors.push('name required');
    if (this._vendor.length === 0) errors.push('vendor required');
    if (!SEMVER_PATTERN.test(this._version)) errors.push(`Invalid version "${this._version}"`);
    if (this._capabilities.length === 0) errors.push('At least one capability required');
    if (this._inputs.length === 0) errors.push('At least one input required');
    if (this._outputs.length === 0) errors.push('At least one output required');
    if (this._entrypoint.type !== 'worker') errors.push('entrypoint.type must be "worker"');
    if (errors.length > 0) throw new Error(`ManifestBuilder: ${errors.join('; ')}`);

    return {
      plugin_id: this._pluginId,
      name: this._name,
      vendor: this._vendor,
      description: this._description,
      version: this._version,
      api_version: OMEGA_PLUGIN_API_VERSION,
      supported_omega_api_versions: `>=${OMEGA_PLUGIN_API_VERSION}`,
      capabilities: [...this._capabilities],
      io: { inputs: [...this._inputs], outputs: [...this._outputs] },
      limits: { ...this._limits },
      determinism: { ...this._determinism },
      evidence: { ...this._evidence },
      entrypoint: { ...this._entrypoint },
    };
  }
}
