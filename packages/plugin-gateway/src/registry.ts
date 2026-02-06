/**
 * OMEGA Plugin Gateway — Registry v1.0
 *
 * INV-PNP-01: Single Gateway — all plugins registered here.
 * INV-PNP-02: Non-actuating — registry never modifies BUILD.
 * INV-PNP-06: Capability-based — stores declared capabilities.
 * INV-PNP-10: Fail-closed — rejects on any doubt.
 */

import type {
  PluginManifest,
  PluginInfo,
  PluginStatus,
} from './types.js';

export interface RegistryEntry {
  readonly manifest: PluginManifest;
  readonly signature: string;
  readonly status: PluginStatus;
  readonly registered_at: string;
  readonly signature_valid: boolean;
}

export class PluginRegistry {
  private readonly entries: Map<string, RegistryEntry> = new Map();

  register(manifest: PluginManifest, signature: string, signatureValid: boolean, timestamp: string): PluginInfo {
    if (this.entries.has(manifest.plugin_id)) {
      throw new Error(`Plugin already registered: ${manifest.plugin_id}`);
    }

    if (!signatureValid) {
      const entry: RegistryEntry = {
        manifest,
        signature,
        status: 'rejected',
        registered_at: timestamp,
        signature_valid: false,
      };
      this.entries.set(manifest.plugin_id, entry);
      return this.toInfo(entry);
    }

    const entry: RegistryEntry = {
      manifest,
      signature,
      status: 'registered',
      registered_at: timestamp,
      signature_valid: true,
    };
    this.entries.set(manifest.plugin_id, entry);
    return this.toInfo(entry);
  }

  enable(pluginId: string): void {
    const entry = this.getEntry(pluginId);
    if (entry.status === 'rejected') {
      throw new Error(`Cannot enable rejected plugin: ${pluginId}`);
    }
    if (entry.status === 'enabled') {
      return; // idempotent
    }
    this.entries.set(pluginId, { ...entry, status: 'enabled' });
  }

  disable(pluginId: string): void {
    const entry = this.getEntry(pluginId);
    if (entry.status === 'rejected') {
      throw new Error(`Cannot disable rejected plugin: ${pluginId}`);
    }
    if (entry.status === 'disabled' || entry.status === 'registered') {
      return; // idempotent
    }
    this.entries.set(pluginId, { ...entry, status: 'disabled' });
  }

  get(pluginId: string): RegistryEntry {
    return this.getEntry(pluginId);
  }

  has(pluginId: string): boolean {
    return this.entries.has(pluginId);
  }

  isEnabled(pluginId: string): boolean {
    const entry = this.entries.get(pluginId);
    return entry !== undefined && entry.status === 'enabled';
  }

  list(): readonly PluginInfo[] {
    return [...this.entries.values()].map(e => this.toInfo(e));
  }

  count(): number {
    return this.entries.size;
  }

  private getEntry(pluginId: string): RegistryEntry {
    const entry = this.entries.get(pluginId);
    if (!entry) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }
    return entry;
  }

  private toInfo(entry: RegistryEntry): PluginInfo {
    return {
      plugin_id: entry.manifest.plugin_id,
      name: entry.manifest.name,
      version: entry.manifest.version,
      status: entry.status,
      capabilities: entry.manifest.capabilities,
      registered_at: entry.registered_at,
      signature_valid: entry.signature_valid,
    };
  }
}
